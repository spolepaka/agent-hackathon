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
}

const app = express()
const port = Number(process.env.PORT ?? 8787)
const baseUrl = process.env.TRUEFORGE_BASE_URL ?? 'http://localhost:8790'
const agentName = process.env.TRUEFORGE_AGENT_NAME ?? 'learnloop'
const sessions = new Map<string, SessionState>()

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

app.use(cors())
app.use(express.json({ limit: '1mb' }))

async function trueForgeAvailable() {
  try {
    const response = await fetch(`${baseUrl}/api/v1/agents`, {
      headers: process.env.TRUEFORGE_TOKEN ? { Authorization: `Bearer ${process.env.TRUEFORGE_TOKEN}` } : {},
      signal: AbortSignal.timeout(1800),
    })
    if (!response.ok) return false
    const body = (await response.json()) as { data?: Array<{ name?: string }> }
    return Boolean(body.data?.some((agent) => agent.name === agentName))
  } catch {
    return false
  }
}

app.get('/api/health', async (_request, response) => {
  const connected = await trueForgeAvailable()
  response.json({
    ok: true,
    mode: connected ? 'trueforge' : 'local-demo',
    agent: agentName,
  })
})

app.post('/api/chat', async (request, response) => {
  const { clientId, message } = request.body as { clientId?: string; message?: string }
  if (!clientId || !message?.trim()) {
    response.status(400).json({ error: 'A clientId and message are required.' })
    return
  }

  if (!(await trueForgeAvailable())) {
    response.json({ ...localAgentReply(clientId, message), mode: 'local-demo' })
    return
  }

  try {
    let sessionState = sessions.get(clientId)
    if (!sessionState) {
      const { data: session } = await client.sessions.create({ agent: { name: agentName } })
      sessionState = { sessionId: session.id, pendingResponses: [] }
      sessions.set(clientId, sessionState)
    }

    const input: TrueForgeApi.TurnInputItem[] = sessionState.pendingResponses.length
      ? sessionState.pendingResponses.map((pending) => ({
          type: 'user.tool_response',
          threadId: pending.threadId,
          toolCallId: pending.toolCallId,
          content: message,
        }))
      : [{ type: 'user.message', content: message }]
    sessionState.pendingResponses = []

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
        sessionState.pendingResponses.push({ threadId: pending.threadId, toolCallId: reference.id })
      }
    }

    const answer = [reply.trim(), ...questionText].filter(Boolean).join('\n\n') || finalOutput
    response.json({
      reply: answer || 'I need one more detail before I can continue. What happened at the moment you got stuck?',
      suggestions: [...new Set(suggestions)],
      mode: 'trueforge',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown TrueForge error'
    response.status(502).json({ error: `TrueForge could not complete the turn: ${message}` })
  }
})

const directory = path.dirname(fileURLToPath(import.meta.url))
const dist = path.resolve(directory, '../dist')
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(dist))
  app.use((_request, response) => response.sendFile(path.join(dist, 'index.html')))
}

app.listen(port, () => {
  console.log(`LearnLoop server running at http://localhost:${port}`)
})
