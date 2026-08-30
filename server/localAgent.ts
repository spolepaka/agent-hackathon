export type ChatArtifact = {
  type: 'growth-edge' | 'loop' | 'proof'
  title: string
  eyebrow: string
  items: string[]
}

export type AgentReply = {
  reply: string
  suggestions: string[]
  artifact?: ChatArtifact
}

type LocalSession = {
  stage: number
  topic?: string
  lastUsed: number
}

const sessions = new Map<string, LocalSession>()

// --- Fix #4 (rereview): Bound local-demo sessions like TrueForge sessions ---
const LOCAL_SESSION_TTL_MS = 30 * 60 * 1000
const MAX_LOCAL_SESSIONS = 200
setInterval(() => {
  const now = Date.now()
  for (const [id, session] of sessions) {
    if (now - session.lastUsed > LOCAL_SESSION_TTL_MS) sessions.delete(id)
  }
}, 5 * 60 * 1000)

function touchLocalSession(id: string, session: LocalSession) {
  session.lastUsed = Date.now()
  sessions.set(id, session)
  if (sessions.size > MAX_LOCAL_SESSIONS) {
    const oldest = [...sessions.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed)[0]
    if (oldest) sessions.delete(oldest[0])
  }
}

const has = (value: string, words: string[]) => words.some((word) => value.includes(word))

export function localAgentReply(clientId: string, message: string): AgentReply {
  const normalized = message.toLowerCase()
  const session = sessions.get(clientId) ?? { stage: 0, lastUsed: Date.now() }
  touchLocalSession(clientId, session)

  if (has(normalized, ['range', 'loop', 'python', 'code'])) {
    session.topic = 'Python loops'
    if (session.stage === 0) {
      session.stage = 1
      touchLocalSession(clientId, session)
      return {
        reply: "Let’s make this smaller than “learn Python loops.”\n\n**Likely Growth Edge**\nYour loop syntax may be fine—the invisible part is often the values Python creates. One quick Learning Signal will tell us more.\n\n**Prediction**\nWhat values do you expect `range(2, 6)` to create?",
        suggestions: ['2, 3, 4, 5, 6', '2, 3, 4, 5', 'I’m not sure'],
        artifact: {
          type: 'growth-edge',
          eyebrow: 'Possible Growth Edge',
          title: 'Seeing what range() creates',
          items: ['Confidence: early hypothesis', 'Method: visual trace + first principles'],
        },
      }
    }
  }

  if (session.stage === 1) {
    session.stage = 2
    touchLocalSession(clientId, session)
    const correct = /2\s*,\s*3\s*,\s*4\s*,\s*5(?!\s*,\s*6)/.test(normalized)
    return {
      reply: correct
        ? "Exactly: `2, 3, 4, 5`. That is one useful signal—not mastery yet.\n\nHere’s the rule: **range starts at the first value and stops before the end value.** Think of 6 as a finish line, not a value you step on."
        : "Useful signal. The key idea is that the second number is a boundary, not the last value.\n\n`range(2, 6)` starts at 2 and stops before 6, so it creates `2, 3, 4, 5`.",
      suggestions: ['Start the practice', 'Show me another example'],
      artifact: {
        type: 'loop',
        eyebrow: 'Today’s Loop · 8 min',
        title: 'Understand how range() counts',
        items: ['See · make values visible', 'Predict · test your model', 'Practice · write one loop', 'Prove · explain the boundary'],
      },
    }
  }

  if (session.stage === 2 || has(normalized, ['practice', 'start'])) {
    session.stage = 3
    touchLocalSession(clientId, session)
    return {
      reply: "Here is a local-demo practice task: write a Python loop that prints the numbers **0 through 4**, one per line.\n\nYou can paste your code for a structural review. Actual execution and evidence-backed progression require the connected TrueForge sandbox.",
      suggestions: ['Give me one hint', 'Show the trace'],
      artifact: {
        type: 'proof',
        eyebrow: 'Practice Lab',
        title: 'Print 0 through 4',
        items: ['Expected: five lines', 'Boundary check: 5 must not print', 'Full solution stays hidden until you try'],
      },
    }
  }

  if (session.stage === 4) {
    return {
      reply: "Your explanation is a useful learning signal, but local demo mode cannot validate it as a passed Proof Check. **range() basics stays practicing** until the connected agent can inspect the explanation alongside a real execution result.\n\nReconnect TrueForge to complete the evidence check. Nothing from this session will be saved without your approval.",
      suggestions: ['Review the boundary rule', 'Start a new loop'],
      artifact: {
        type: 'proof',
        eyebrow: 'Verification required',
        title: 'Progress remains practicing',
        items: ['Structural attempt received', 'No execution evidence recorded', 'Connected Proof Check required'],
      },
    }
  }

  if (session.stage >= 3 && has(normalized, ['for ', 'range('])) {
    const passes = /range\(\s*5\s*\)/.test(normalized)
    session.stage = passes ? 4 : 3
    touchLocalSession(clientId, session)
    return passes
      ? {
          reply: "Your attempt contains the expected `range(5)` structure. Under standard Python semantics, that range represents `0, 1, 2, 3, 4`.\n\n**Local-demo limitation**\nThis was a structural check, not sandbox execution, so it does not prove the program’s actual behavior.\n\n**Practice question**\nExplain why 5 should not be printed. What should `range(2, 7)` create?",
          suggestions: ['It stops before 5', 'I need another trace'],
          artifact: {
            type: 'proof',
            eyebrow: 'Structural review only',
            title: 'Pattern found; execution unverified',
            items: ['range() basics · practicing', 'No execution evidence recorded', 'Connected Proof Check still required'],
          },
        }
      : {
          reply: "Your loop repeats, which is a solid start. The boundary still needs one adjustment.\n\nYour goal begins at **0**. Look at the first value your `range()` currently creates—does the loop ever receive 0?",
          suggestions: ['Give me one hint', 'Try again', 'Show the trace'],
          artifact: {
            type: 'growth-edge',
            eyebrow: 'Learning Signal',
            title: 'The loop begins too late',
            items: ['What worked: repetition', 'Growth Edge: start value', 'Next move: make 0 visible'],
          },
        }
  }

  if (has(normalized, ['video', 'resource'])) {
    return {
      reply: "Share the video or resource and tell me the moment it stopped making sense. I’ll help turn it into one active learning loop—not another summary.",
      suggestions: ['I have a YouTube link', 'I only know the topic'],
    }
  }

  return {
    reply: "I can help make this smaller. What is the last thing that confused you?\n\nPaste code, an error, an answer, a video link, or describe what you expected to happen.",
    suggestions: ['I’m stuck on Python loops', 'Learn from a video', 'Help me understand a concept'],
  }
}
