import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TrueForge, TrueForgeApi, isEventDelta, mergeEventDelta } from '@truefoundry/trueforge-sdk'
import { localAgentReply } from './localAgent.js'

type PendingResponse = {
  threadId: string
  toolCallId: string
}

type StudioPhase = 'orient' | 'learn' | 'predict' | 'practice' | 'prove' | 'complete'

type SandboxOutcome = 'none' | 'inconclusive' | 'partial' | 'passed'

type StudioMetadata = {
  phase: StudioPhase
  topic: string
  evidence: string[]
  sandboxed: boolean
  sandboxOutcome: SandboxOutcome
  proofPassed: boolean
}

type SessionState = {
  sessionId: string | null
  pendingResponses: PendingResponse[]
  lastUsed: number
  studio: StudioMetadata
  localOnly: boolean
}

const app = express()
const port = Number(process.env.PORT ?? 8787)
const baseUrl = process.env.TRUEFORGE_BASE_URL ?? 'http://localhost:8790'
const agentName = process.env.TRUEFORGE_AGENT_NAME ?? 'learnloop'
const studioResponseInstruction = 'This client renders GitHub-flavored Markdown inside a custom learning studio. Return learner-facing Markdown only. Do not emit openui or sandbox_artifacts fenced blocks.'
const sessions = new Map<string, SessionState>()
const clientQueues = new Map<string, Promise<unknown>>()

// --- Fix #4: Session eviction ---
const SESSION_TTL_MS = 30 * 60 * 1000
const MAX_SESSIONS = 200
setInterval(() => {
  const now = Date.now()
  for (const [id, state] of sessions) {
    if (now - state.lastUsed > SESSION_TTL_MS) sessions.delete(id)
  }
}, 5 * 60 * 1000)

function touchSession(id: string, state: SessionState) {
  state.lastUsed = Date.now()
  sessions.set(id, state)
  if (sessions.size > MAX_SESSIONS) {
    const oldest = [...sessions.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed)[0]
    if (oldest) sessions.delete(oldest[0])
  }
}

// --- Fix #6: Per-client serialization ---
// --- Fix #3 (rereview): Clean up queue entries after settling ---
function withClientLock<T>(clientId: string, fn: () => Promise<T>): Promise<T> {
  const previous = clientQueues.get(clientId) ?? Promise.resolve()
  const next = previous.then(fn, fn)
  const settled = next.catch(() => undefined)
  clientQueues.set(clientId, settled)
  // Delete the queue entry once settled, but only if no newer request replaced it
  settled.finally(() => {
    if (clientQueues.get(clientId) === settled) clientQueues.delete(clientId)
  })
  return next
}

function contentToText(content: unknown) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((item) => {
      if (!item || typeof item !== 'object' || !('text' in item)) return ''
      return typeof item.text === 'string' ? item.text : ''
    })
    .join('')
}

function topicFromMessage(message: string) {
  const clean = message.replace(/```[\s\S]*?```/g, '').replace(/\s+/g, ' ').trim()
  if (/\b(range|python|for loop|while loop)\b/i.test(clean)) return 'Python loops'
  if (/\b(video|youtube|article|resource|transcript)\b/i.test(clean)) return 'Source learning'
  const firstSentence = clean.split(/[.!?\n]/)[0]?.trim()
  return firstSentence ? firstSentence.slice(0, 52) : 'New learning goal'
}

// --- Fix #1 (Qodo PR#6): Reject negated failure statements as positive evidence ---
function stripNegatedMatches(text: string, positivePattern: RegExp, negationPattern: RegExp): boolean {
  const positives = text.match(positivePattern) ?? []
  const negations = text.match(negationPattern) ?? []
  // A positive match only counts if it is not immediately preceded by a negation
  return positives.some((positive) => {
    const positiveIndex = text.indexOf(positive)
    return !negations.some((negation) => {
      const negationIndex = text.indexOf(negation)
      return Math.abs(positiveIndex - negationIndex) < 40
    })
  })
}

function studioFromReply(reply: string, message: string, previous?: StudioMetadata): StudioMetadata {
  const normalized = reply.toLowerCase()
  const hasSandboxResult = /practice lab result|sandbox result|actual output|ran successfully/.test(normalized)
  const needsRevision = /does not match|did not match|didn't match|mismatch|challenge target|partial result|try again|needs? (an|one)? ?adjustment/.test(normalized)
  const negationPattern = /\bnot\b|\bnever\b|\binsufficient\b|\bcannot\b|\bcan't\b|\bcouldn't\b|\bfailed\b|\bfails?\b|\bno evidence\b|\bnot yet\b/i
  const passedSandbox = hasSandboxResult && !needsRevision && stripNegatedMatches(normalized, /matched (the )?expected|matched expected exactly|all tests passed|expected behavior confirmed/, negationPattern)
  const proofKeywords = /proof check complete|mastery status[^\n]*(passed|mastered)|enough evidence to move|pattern demonstrated/
  const proofPassed = Boolean(previous?.proofPassed) || (proofKeywords.test(normalized) && !negationPattern.test(normalized))
  let sandboxOutcome: SandboxOutcome = previous?.sandboxOutcome ?? 'none'
  if (hasSandboxResult) sandboxOutcome = needsRevision ? 'partial' : passedSandbox ? 'passed' : 'inconclusive'

  let phase: StudioPhase = previous?.phase ?? 'orient'
  if (proofPassed) phase = 'complete'
  else if (/proof check/.test(normalized)) phase = 'prove'
  else if (hasSandboxResult) phase = needsRevision ? 'practice' : 'prove'
  else if (/tiny practice|code challenge|paste your (completed )?code|practice lab/.test(normalized)) phase = 'practice'
  else if (/prediction|predict|without running/.test(normalized)) phase = 'predict'
  else if (/growth edge|learner snapshot|one thing to learn next|today['’]s (mini )?loop/.test(normalized)) phase = 'learn'

  const evidence = new Set(previous?.evidence ?? [])
  if (!previous || previous.evidence.length === 0) evidence.add('Learning goal shared')
  if (/growth edge|learner snapshot/.test(normalized)) evidence.add('Growth Edge identified')
  if (hasSandboxResult) evidence.add('Sandbox result received')
  if (passedSandbox) evidence.add('Practice target passed')
  if (/proof check/.test(normalized)) evidence.add('Proof Check reached')
  if (proofPassed) evidence.add('Transfer evidence accepted')

  return {
    phase,
    topic: previous?.topic ?? topicFromMessage(message),
    evidence: [...evidence],
    sandboxed: Boolean(previous?.sandboxed || hasSandboxResult),
    sandboxOutcome,
    proofPassed,
  }
}

const client = new TrueForge({
  baseUrl,
  token: process.env.TRUEFORGE_TOKEN || undefined,
  timeoutInSeconds: 600,
})

// --- Fix #5: Restrict CORS to same-origin / localhost ---
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', `http://localhost:${port}`, `http://127.0.0.1:${port}`]
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true)
      else callback(null, false)
    },
  }),
)
app.use(express.json({ limit: '1mb' }))

// --- Fix #7: Cached health probe with TTL ---
let healthCache: { available: boolean; checkedAt: number } | null = null
const HEALTH_TTL_MS = 15_000

async function trueForgeAvailable() {
  if (healthCache && Date.now() - healthCache.checkedAt < HEALTH_TTL_MS) return healthCache.available
  try {
    const response = await fetch(`${baseUrl}/api/v1/agents`, {
      headers: process.env.TRUEFORGE_TOKEN ? { Authorization: `Bearer ${process.env.TRUEFORGE_TOKEN}` } : {},
      signal: AbortSignal.timeout(1800),
    })
    if (!response.ok) {
      healthCache = { available: false, checkedAt: Date.now() }
      return false
    }
    const body = (await response.json()) as { data?: Array<{ name?: string }> }
    const available = Boolean(body.data?.some((agent) => agent.name === agentName))
    healthCache = { available, checkedAt: Date.now() }
    return available
  } catch {
    healthCache = { available: false, checkedAt: Date.now() }
    return false
  }
}

app.get('/api/health', async (_request, response) => {
  const connected = await trueForgeAvailable()
  response.json({ ok: true, mode: connected ? 'trueforge' : 'local-demo', agent: agentName })
})

app.post('/api/chat', async (request, response) => {
  const { clientId, message } = request.body as { clientId?: string; message?: string }
  if (!clientId || !message?.trim()) {
    response.status(400).json({ error: 'A clientId and message are required.' })
    return
  }

  try {
    const result = await withClientLock(clientId, () => handleChat(clientId, message))
    response.json(result)
  } catch (error) {
    // --- Fix #3: Fall back to local demo on TrueForge errors ---
    // --- Fix #2 (rereview): Clear stale pendingResponses so the next
    //     message isn't misrouted as a tool answer to a failed turn ---
    const existingState = sessions.get(clientId)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Chat error for ${clientId}: ${errorMessage}`)
    const fallback = localAgentReply(clientId, message)
    const studio = studioFromReply(fallback.reply, message, existingState?.studio)
    const sessionState: SessionState = existingState ?? {
      sessionId: null,
      pendingResponses: [],
      lastUsed: Date.now(),
      studio,
      localOnly: true,
    }
    sessionState.pendingResponses = []
    sessionState.studio = studio
    sessionState.localOnly = true
    touchSession(clientId, sessionState)
    response.json({ ...fallback, mode: 'local-demo', studio })
  }
})

async function handleChat(clientId: string, message: string) {
  let sessionState = sessions.get(clientId)
  // --- Fix #5 (Qodo PR#6): Always recheck TrueForge availability (cached 15s)
  //     so a transient outage doesn't permanently trap the client in local-demo ---
  if (!(await trueForgeAvailable())) {
    const fallback = localAgentReply(clientId, message)
    const studio = studioFromReply(fallback.reply, message, sessionState?.studio)
    sessionState = sessionState ?? {
      sessionId: null,
      pendingResponses: [],
      lastUsed: Date.now(),
      studio,
      localOnly: true,
    }
    sessionState.studio = studio
    sessionState.localOnly = true
    touchSession(clientId, sessionState)
    return { ...fallback, mode: 'local-demo' as const, studio }
  }

  const isNewSession = !sessionState?.sessionId
  if (!sessionState?.sessionId) {
    const { data: session } = await client.sessions.create({ agent: { name: agentName } })
    // --- Fix #5 (Qodo PR#6): Preserve studio metadata from local-demo
    //     so recovery doesn't erase progress gathered during the outage ---
    const previousStudio = sessionState?.studio
    sessionState = {
      sessionId: session.id,
      pendingResponses: [],
      lastUsed: Date.now(),
      studio: previousStudio ?? {
        phase: 'orient',
        topic: topicFromMessage(message),
        evidence: [],
        sandboxed: false,
        sandboxOutcome: 'none',
        proofPassed: false,
      },
      localOnly: false,
    }
  } else if (sessionState.localOnly) {
    // TrueForge recovered — clear the local-only flag so future turns use the agent
    sessionState.localOnly = false
  }
  touchSession(clientId, sessionState)

  const pendingResponse = sessionState.pendingResponses[0]
  const input: TrueForgeApi.TurnInputItem[] = pendingResponse
    ? [{
        type: 'user.tool_response',
        threadId: pendingResponse.threadId,
        toolCallId: pendingResponse.toolCallId,
        content: message,
      }]
    : [{ type: 'user.message', content: isNewSession ? `${studioResponseInstruction}\n\nLearner message:\n${message}` : message }]

  const sessionId = sessionState.sessionId
  if (!sessionId) throw new Error('TrueForge session was not created.')
  const stream = await client.sessions.createTurnStream(sessionId, { input })
  const events = new Map<string, TrueForgeApi.TurnStreamingEvent>()
  const pendingQuestions: TrueForgeApi.ToolResponseRequiredEvent[] = []
  let reply = ''
  let finalOutput = ''

  for await (const { data: event } of stream.withMetadata()) {
    if (isEventDelta(event)) {
      const base = events.get(event.id)
      if (base) mergeEventDelta(base, event)
    } else {
      events.set(event.id, event)
    }
    if (event.type === 'model.message.delta' && event.threadId === 'main' && event.content) reply += event.content
    if (event.type === 'tool.response_required') pendingQuestions.push(event)
    if (event.type === 'turn.done' && event.state.status === 'done') finalOutput = contentToText(event.state.output?.content)
  }

  // --- Fix #2: Only clear pendingResponses after the turn succeeds ---
  const newPending: PendingResponse[] = []
  const suggestions: string[] = []
  const questionText: string[] = []
  pendingQuestionLoop:
  for (const pending of pendingQuestions) {
    for (const reference of pending.toolCalls) {
      const source = events.get(reference.sourceEventId)
      if (source?.type !== 'model.message') continue
      const call = source.toolCalls?.find((toolCall) => toolCall.id === reference.id)
      if (call?.toolInfo.type !== 'truefoundry-system' || call.toolInfo.name !== 'ask_user_question') continue
      const args = JSON.parse(call.function.arguments || '{}') as { question?: string; options?: string[] }
      if (args.question) questionText.push(args.question)
      if (args.options) suggestions.push(...args.options)
      newPending.push({ threadId: pending.threadId, toolCallId: reference.id })
      break pendingQuestionLoop
    }
  }
  sessionState.pendingResponses = newPending
  const answer = [reply.trim(), ...questionText].filter(Boolean).join('\n\n') || finalOutput
  const finalAnswer = answer || 'I need one more detail before I can continue. What happened at the moment you got stuck?'
  sessionState.studio = studioFromReply(finalAnswer, message, sessionState.studio)
  touchSession(clientId, sessionState)

  return {
    reply: finalAnswer,
    suggestions: [...new Set(suggestions)],
    mode: 'trueforge' as const,
    studio: sessionState.studio,
  }
}

const directory = path.dirname(fileURLToPath(import.meta.url))
const dist = path.resolve(directory, '../dist')
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(dist))
  app.use((_request, response) => response.sendFile(path.join(dist, 'index.html')))
}

app.listen(port, () => {
  console.log(`LearnLoop server running at http://localhost:${port}`)
})
