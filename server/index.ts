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

type SessionState = {
  sessionId: string
  pendingResponses: PendingResponse[]
  lastUsed: number
}

const app = express()
const port = Number(process.env.PORT ?? 8787)
const baseUrl = process.env.TRUEFORGE_BASE_URL ?? 'http://localhost:8790'
const agentName = process.env.TRUEFORGE_AGENT_NAME ?? 'learnloop'
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

const client = new TrueForge({
  baseUrl,
  token: process.env.TRUEFORGE_TOKEN || undefined,
  timeoutInSeconds: 600,
})

// --- Fix #5: Restrict CORS to same-origin / localhost ---
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : [`http://localhost:5173`, `http://localhost:${port}`, `http://127.0.0.1:${port}`]
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
    const sessionState = sessions.get(clientId)
    if (sessionState) {
      sessionState.pendingResponses = []
      touchSession(clientId, sessionState)
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Chat error for ${clientId}: ${errorMessage}`)
    response.json({ ...localAgentReply(clientId, message), mode: 'local-demo' })
  }
})

async function handleChat(clientId: string, message: string) {
  if (!(await trueForgeAvailable())) {
    return { ...localAgentReply(clientId, message), mode: 'local-demo' as const }
  }

  let sessionState = sessions.get(clientId)
  if (!sessionState) {
    const { data: session } = await client.sessions.create({ agent: { name: agentName } })
    sessionState = { sessionId: session.id, pendingResponses: [], lastUsed: Date.now() }
  }
  touchSession(clientId, sessionState)

  const input: TrueForgeApi.TurnInputItem[] = sessionState.pendingResponses.length
    ? sessionState.pendingResponses.map((pending) => ({
        type: 'user.tool_response',
        threadId: pending.threadId,
        toolCallId: pending.toolCallId,
        content: message,
      }))
    : [{ type: 'user.message', content: message }]

  const stream = await client.sessions.createTurnStream(sessionState.sessionId, { input })
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
    }
  }
  sessionState.pendingResponses = newPending
  touchSession(clientId, sessionState)

  const answer = [reply.trim(), ...questionText].filter(Boolean).join('\n\n') || finalOutput
  return {
    reply: answer || 'I need one more detail before I can continue. What happened at the moment you got stuck?',
    suggestions: [...new Set(suggestions)],
    mode: 'trueforge' as const,
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
