import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Code2,
  Compass,
  FileText,
  Home,
  Lightbulb,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Play,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Zap,
} from 'lucide-react'
import './studio.css'

type StudioView = 'loop' | 'map' | 'practice' | 'sources' | 'memory'
type StudioPhase = 'orient' | 'learn' | 'predict' | 'practice' | 'prove' | 'complete'
type ConnectionMode = 'checking' | 'trueforge' | 'local-demo'
type MessageContext = 'loop' | 'practice' | 'sources'

type SandboxOutcome = 'none' | 'inconclusive' | 'partial' | 'passed'

type StudioMetadata = {
  phase: StudioPhase
  topic: string
  evidence: string[]
  sandboxed: boolean
  sandboxOutcome: SandboxOutcome
  proofPassed: boolean
}

type StudioMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
  context: MessageContext
}

type ChatResponse = {
  reply?: string
  error?: string
  suggestions?: string[]
  mode?: ConnectionMode
  studio?: StudioMetadata
}

type StoredStudio = {
  messages: StudioMessage[]
  metadata: StudioMetadata
  practiceResult: string
  sourceResult: string
  code: string
  sessionMinutes: number
  startedAt: number
}

type StudioProps = {
  initialPrompt?: string
  initialView?: StudioView
  onExit: () => void
}

const SESSION_KEY = 'learnloop.studio.session'
const CLIENT_KEY = 'learnloop.studio.client'
const MEMORY_KEY = 'learnloop.approved-memory'

const defaultMetadata: StudioMetadata = {
  phase: 'orient',
  topic: 'New learning goal',
  evidence: [],
  sandboxed: false,
  sandboxOutcome: 'none',
  proofPassed: false,
}

const starterPrompts = [
  { icon: Code2, label: 'Debug a concept', prompt: 'I’m stuck on Python loops', detail: 'Use code, prediction, and proof' },
  { icon: BrainCircuit, label: 'Understand an idea', prompt: 'Help me understand a concept', detail: 'Start from the exact confusing part' },
  { icon: BookOpen, label: 'Learn from a source', prompt: 'Learn from a video', detail: 'Turn content into an active loop' },
  { icon: Compass, label: 'Choose what’s next', prompt: 'What should I learn next?', detail: 'Use evidence, not curriculum order' },
]

const loopSteps = [
  { id: 'learn', label: 'See', detail: 'Make the idea visible' },
  { id: 'predict', label: 'Predict', detail: 'Commit to an answer' },
  { id: 'practice', label: 'Practice', detail: 'Try it independently' },
  { id: 'prove', label: 'Prove', detail: 'Transfer the pattern' },
]

const navItems: Array<{ id: StudioView; label: string; icon: typeof Zap }> = [
  { id: 'loop', label: 'Today’s Loop', icon: Zap },
  { id: 'map', label: 'Mastery Map', icon: BrainCircuit },
  { id: 'practice', label: 'Practice Lab', icon: Code2 },
  { id: 'sources', label: 'Sources', icon: BookOpen },
  { id: 'memory', label: 'Learning Memory', icon: ShieldCheck },
]

const phaseIndex: Record<StudioPhase, number> = {
  orient: 0,
  learn: 0,
  predict: 1,
  practice: 2,
  prove: 3,
  complete: 4,
}

function readSession(): StoredStudio | undefined {
  try {
    const value = sessionStorage.getItem(SESSION_KEY)
    return value ? (JSON.parse(value) as StoredStudio) : undefined
  } catch {
    return undefined
  }
}

function readMemory() {
  try {
    return localStorage.getItem(MEMORY_KEY) ?? ''
  } catch {
    return ''
  }
}

function createClientId() {
  try {
    const existing = sessionStorage.getItem(CLIENT_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    sessionStorage.setItem(CLIENT_KEY, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

function topicFromPrompt(prompt: string) {
  if (/range|python|loop/i.test(prompt)) return 'Python loops'
  if (/video|source|article|youtube/i.test(prompt)) return 'Source learning'
  const topic = prompt.split(/[.!?\n]/)[0]?.trim()
  return topic ? topic.slice(0, 52) : 'New learning goal'
}

function Markdown({ children }: { children: string }) {
  return (
    <div className="studio-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}

function Brand({ onExit }: { onExit: () => void }) {
  return (
    <button type="button" className="studio-brand" onClick={onExit} aria-label="Return to LearnLoop home">
      <span className="logo-mark"><span /></span>
      <span>LearnLoop</span>
    </button>
  )
}

function LoopProgress({ phase }: { phase: StudioPhase }) {
  const current = phaseIndex[phase]
  return (
    <ol className="studio-progress" aria-label="Today’s Loop progress">
      {loopSteps.map((step, index) => {
        const complete = current > index
        const active = current === index
        return (
          <li className={`${complete ? 'complete' : ''} ${active ? 'active' : ''}`} key={step.id} aria-current={active ? 'step' : undefined}>
            <span>{complete ? <Check size={15} aria-hidden="true" /> : index + 1}</span>
            <div><strong>{step.label}</strong><small>{step.detail}</small></div>
          </li>
        )
      })}
    </ol>
  )
}

function Welcome({ onStart, loading, sessionMinutes, onMinutes }: { onStart: (prompt: string) => void; loading: boolean; sessionMinutes: number; onMinutes: (minutes: number) => void }) {
  const [goal, setGoal] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (goal.trim()) onStart(goal)
  }

  return (
    <section className="studio-welcome" aria-labelledby="studio-welcome-title">
      <div className="studio-welcome-copy">
        <span className="studio-kicker"><Sparkles size={14} aria-hidden="true" /> Start with the stuck moment</span>
        <h1 id="studio-welcome-title">What do you want to be able to <em>do?</em></h1>
        <p>Share the concept, failed attempt, or source. LearnLoop will find one useful Growth Edge and build a short loop around it.</p>
      </div>

      <form className="studio-goal-form" onSubmit={submit}>
        <label htmlFor="learning-goal">Your learning goal or stuck point</label>
        <div>
          <textarea id="learning-goal" value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="For example: I understand Python loops in videos, but I can’t write one myself…" rows={3} />
          <button type="submit" disabled={!goal.trim() || loading}>{loading ? <LoaderCircle className="spin" size={19} aria-hidden="true" /> : <ArrowRight size={19} aria-hidden="true" />}<span>Build my loop</span></button>
        </div>
      </form>

      <div className="studio-time-choice">
        <span><Clock3 size={15} aria-hidden="true" /> Time available</span>
        <div role="group" aria-label="Time available">
          {[8, 12, 15].map((minutes) => <button type="button" className={sessionMinutes === minutes ? 'selected' : ''} onClick={() => onMinutes(minutes)} key={minutes}>{minutes} min</button>)}
        </div>
      </div>

      <div className="studio-starters">
        {starterPrompts.map(({ icon: Icon, label, prompt, detail }) => (
          <button type="button" onClick={() => onStart(prompt)} disabled={loading} key={prompt}>
            <span><Icon size={18} aria-hidden="true" /></span>
            <div><strong>{label}</strong><small>{detail}</small></div>
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        ))}
      </div>

      <p className="studio-privacy"><ShieldCheck size={15} aria-hidden="true" /> This session stays temporary. LearnLoop saves a durable memory only after showing you the exact text and receiving approval.</p>
    </section>
  )
}

function LoopView({ metadata, messages, suggestions, loading, error, lastSubmission, onSend, onRetry, onOpenPractice }: {
  metadata: StudioMetadata
  messages: StudioMessage[]
  suggestions: string[]
  loading: boolean
  error: string
  lastSubmission: string
  onSend: (message: string) => void
  onRetry: () => void
  onOpenPractice: () => void
}) {
  const [answer, setAnswer] = useState('')
  const latestAssistant = [...messages].reverse().find((message) => message.role === 'assistant')
  const latestUser = [...messages].reverse().find((message) => message.role === 'user')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!answer.trim()) return
    onSend(answer)
    setAnswer('')
  }

  return (
    <section className="studio-view loop-view" aria-labelledby="loop-view-title">
      <div className="studio-view-heading">
        <div><span className="studio-kicker"><Target size={14} aria-hidden="true" /> Today’s Loop</span><h1 id="loop-view-title" tabIndex={-1}>{metadata.topic}</h1></div>
        <span className={`phase-pill ${metadata.phase}`}>{metadata.phase === 'complete' ? 'Evidence accepted' : `${metadata.phase === 'orient' ? 'Finding' : metadata.phase} phase`}</span>
      </div>

      <LoopProgress phase={metadata.phase} />

      <div className="activity-stage">
        <div className="activity-label"><span><Bot size={16} aria-hidden="true" /></span><div><strong>LearnLoop coach</strong><small>One useful move at a time</small></div></div>
        {latestAssistant ? <Markdown>{latestAssistant.content}</Markdown> : null}
        {loading && <div className="studio-thinking" role="status"><LoaderCircle className="spin" size={18} aria-hidden="true" /><span>Building the next useful step…</span></div>}
      </div>

      {latestUser && <div className="latest-signal"><span>Your latest signal</span><p>{latestUser.content}</p></div>}

      {metadata.phase === 'practice' && (
        <button type="button" className="practice-callout" onClick={onOpenPractice}>
          <span><Code2 size={21} aria-hidden="true" /></span><div><strong>Open the Practice Lab</strong><small>Write the attempt, run it in isolation, and compare real output.</small></div><ArrowRight size={18} aria-hidden="true" />
        </button>
      )}

      {metadata.phase !== 'complete' ? (
        <form className="studio-response" onSubmit={submit}>
          <label htmlFor="loop-response">Your response</label>
          {suggestions.length > 0 && <div className="studio-suggestions">{suggestions.map((suggestion) => <button type="button" onClick={() => onSend(suggestion)} disabled={loading} key={suggestion}>{suggestion}</button>)}</div>}
          <div>
            <textarea id="loop-response" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Explain your thinking, answer the Proof Check, or paste an attempt…" rows={3} disabled={loading} />
            <button type="submit" disabled={!answer.trim() || loading} aria-label="Send response"><Send size={18} aria-hidden="true" /></button>
          </div>
        </form>
      ) : (
        <div className="loop-complete"><CheckCircle2 size={24} aria-hidden="true" /><div><strong>This loop has enough evidence to advance.</strong><p>Review the Mastery Map to see what changed and why.</p></div></div>
      )}

      {error && <div className="studio-error" role="alert"><div><strong>The coach could not complete that turn.</strong><span>{error}</span></div><button type="button" onClick={onRetry} disabled={!lastSubmission || loading}><RefreshCw size={15} aria-hidden="true" /> Retry</button></div>}
    </section>
  )
}

type ConceptStatus = 'unknown' | 'demonstrated' | 'practicing' | 'growth-edge' | 'recommended' | 'locked'

type Concept = {
  id: string
  label: string
  status: ConceptStatus
  description: string
  proof: string
}

function MasteryMap({ metadata }: { metadata: StudioMetadata }) {
  const python = /python|loop|range/i.test(metadata.topic)
  const current = phaseIndex[metadata.phase]
  const rangeProof = metadata.proofPassed
    ? 'A passed transfer Proof Check supports this status.'
    : metadata.sandboxOutcome === 'passed'
      ? 'The practice target passed; a transfer Proof Check is still required.'
      : metadata.sandboxOutcome === 'partial'
        ? 'The sandbox result exposed a mismatch that still needs revision.'
        : metadata.sandboxed
          ? 'A sandbox result exists, but its learning outcome is inconclusive.'
          : 'Needs a prediction and independent code attempt.'
  const concepts: Concept[] = python
    ? [
        { id: 'variables', label: 'Variables', status: 'unknown', description: 'Names can hold values that change as code runs.', proof: 'No prerequisite performance evidence has been recorded in this session.' },
        { id: 'range', label: 'range()', status: metadata.proofPassed ? 'demonstrated' : current >= 1 || metadata.sandboxed ? 'practicing' : 'recommended', description: 'range(start, stop) creates values from the included start up to the excluded stop.', proof: rangeProof },
        { id: 'boundary', label: 'Loop boundaries', status: metadata.proofPassed ? 'demonstrated' : current >= 2 ? 'growth-edge' : 'locked', description: 'The stop value is a boundary and is not emitted by range().', proof: metadata.proofPassed ? 'A passed transfer Proof Check supported the boundary rule.' : 'Needs a Proof Check on an unfamiliar range.' },
        { id: 'loops', label: 'For loops', status: metadata.proofPassed ? 'recommended' : 'locked', description: 'A for loop receives each value emitted by an iterable.', proof: metadata.proofPassed ? 'Recommended as the next application.' : 'Unlocks after range() and boundaries have evidence.' },
      ]
    : [
        { id: 'foundation', label: 'Prior knowledge', status: 'unknown', description: 'What you can already explain or use.', proof: 'No prerequisite performance evidence has been recorded in this session.' },
        { id: 'target', label: metadata.topic, status: metadata.proofPassed ? 'demonstrated' : metadata.phase === 'orient' ? 'recommended' : 'practicing', description: 'The smallest current learning target.', proof: metadata.proofPassed ? 'A passed Proof Check supports this status.' : 'The loop is still gathering evidence.' },
        { id: 'transfer', label: 'Transfer', status: metadata.proofPassed ? 'recommended' : 'locked', description: 'Use the idea in a new situation.', proof: metadata.proofPassed ? 'Ready for a new context.' : 'Unlocks after the current Proof Check.' },
      ]
  const [selectedId, setSelectedId] = useState(concepts[1]?.id ?? concepts[0].id)
  const selected = concepts.find((concept) => concept.id === selectedId) ?? concepts[0]

  return (
    <section className="studio-view map-view" aria-labelledby="map-view-title">
      <div className="studio-view-heading"><div><span className="studio-kicker"><BrainCircuit size={14} aria-hidden="true" /> Evidence model</span><h1 id="map-view-title" tabIndex={-1}>Mastery Map</h1><p>Every state is tied to a learning signal—not confidence or praise.</p></div></div>
      <div className="mastery-layout">
        <div className={`mastery-canvas ${python ? 'python' : 'general'}`}>
          <svg viewBox="0 0 720 360" aria-hidden="true">
            <path d="M130 180 C250 180 240 92 355 92" />
            <path d="M130 180 C250 180 245 270 380 270" />
            <path d="M430 92 C530 92 525 180 625 180" />
            <path d="M455 270 C550 270 535 180 625 180" />
          </svg>
          {concepts.map((concept, index) => (
            <button type="button" className={`concept-node node-${index + 1} ${concept.status} ${selected.id === concept.id ? 'selected' : ''}`} onClick={() => setSelectedId(concept.id)} aria-pressed={selected.id === concept.id} key={concept.id}>
              <span>{concept.status === 'locked' ? <LockKeyhole size={14} aria-hidden="true" /> : concept.status === 'demonstrated' ? <Check size={14} aria-hidden="true" /> : <CircleDot size={14} aria-hidden="true" />}</span>
              <div><strong>{concept.label}</strong><small>{concept.status.replace('-', ' ')}</small></div>
            </button>
          ))}
        </div>
        <aside className="concept-detail" aria-live="polite">
          <span className={`concept-status ${selected.status}`}>{selected.status.replace('-', ' ')}</span>
          <h2>{selected.label}</h2>
          <p>{selected.description}</p>
          <div><strong>Evidence requirement</strong><p>{selected.proof}</p></div>
          <div><strong>Signals this session</strong>{metadata.evidence.length ? <ul>{metadata.evidence.map((item) => <li key={item}><Check size={13} aria-hidden="true" />{item}</li>)}</ul> : <p>No meaningful signal yet.</p>}</div>
        </aside>
      </div>
    </section>
  )
}

function PracticeLab({ metadata, mode, code, brief, result, loading, onCode, onRun, onContinue }: {
  metadata: StudioMetadata
  mode: ConnectionMode
  code: string
  brief: string
  result: string
  loading: boolean
  onCode: (code: string) => void
  onRun: () => void
  onContinue: () => void
}) {
  const python = /python|loop|range/i.test(metadata.topic)
  return (
    <section className="studio-view practice-view" aria-labelledby="practice-view-title">
      <div className="studio-view-heading"><div><span className="studio-kicker"><Code2 size={14} aria-hidden="true" /> Isolated execution</span><h1 id="practice-view-title" tabIndex={-1}>Practice Lab</h1><p>Run an independent attempt, compare actual behavior, and turn the result into evidence.</p></div><span className={`sandbox-status ${mode === 'trueforge' ? 'online' : ''}`} aria-live="polite"><i />{mode === 'checking' ? 'Checking sandbox' : mode === 'trueforge' ? 'Sandbox ready' : 'Sandbox unavailable'}</span></div>
      {!python ? (
        <div className="lab-unavailable"><Lightbulb size={24} aria-hidden="true" /><div><h2>The code lab is focused on the Python demo.</h2><p>Use Today’s Loop for this topic. LearnLoop will still create an active task and Proof Check without pretending it executed code.</p></div><button type="button" onClick={onContinue}>Return to loop</button></div>
      ) : (
        <div className="lab-layout">
          <div className="code-workbench">
            <div className="code-toolbar"><span><i /><i /><i /> Python · isolated</span><span>main.py</span></div>
            <label htmlFor="practice-code">Python attempt</label>
            <textarea id="practice-code" value={code} onChange={(event) => onCode(event.target.value)} spellCheck={false} aria-describedby="sandbox-note" />
            <div className="code-actions"><p id="sandbox-note"><ShieldCheck size={14} aria-hidden="true" /> Code is sent only to the configured TrueForge sandbox.</p><button type="button" onClick={onRun} disabled={mode !== 'trueforge' || loading || !code.trim()}>{loading ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <Play size={16} fill="currentColor" aria-hidden="true" />} Run &amp; check</button></div>
          </div>
          <div className="lab-brief">
            <span>Current mission</span>
            <h2>Use the task from your loop</h2>
            {brief ? <Markdown>{brief}</Markdown> : <p>Return to Today’s Loop to generate a code mission before running an attempt.</p>}
          </div>
        </div>
      )}
      {result && <div className="lab-result"><div className="lab-result-heading"><span><CircleDot size={19} aria-hidden="true" /></span><div><strong>Sandbox evidence</strong><small>Actual result from this session—not an automatic pass</small></div></div><Markdown>{result}</Markdown><button type="button" onClick={onContinue}>Continue in Today’s Loop <ArrowRight size={16} aria-hidden="true" /></button></div>}
    </section>
  )
}

function SourcesView({ mode, result, loading, onSubmit, onContinue }: { mode: ConnectionMode; result: string; loading: boolean; onSubmit: (source: string) => void; onContinue: () => void }) {
  const [source, setSource] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (source.trim()) onSubmit(source)
  }
  return (
    <section className="studio-view sources-view" aria-labelledby="sources-view-title">
      <div className="studio-view-heading"><div><span className="studio-kicker"><BookOpen size={14} aria-hidden="true" /> Source-to-mastery</span><h1 id="sources-view-title" tabIndex={-1}>Sources &amp; evidence</h1><p>Bring one useful source. LearnLoop will state what it could verify and turn only the relevant part into an active loop.</p></div></div>
      <form className="source-form" onSubmit={submit}>
        <div className="source-icon"><Link2 size={24} aria-hidden="true" /></div>
        <div><label htmlFor="learning-source">Video, article, transcript, or topic</label><input id="learning-source" value={source} onChange={(event) => setSource(event.target.value)} placeholder="Paste a URL or describe the source…" /></div>
        <button type="submit" disabled={!source.trim() || loading || mode !== 'trueforge'} aria-describedby={mode === 'local-demo' ? 'source-mode-notice' : undefined}>{loading ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <ArrowRight size={17} aria-hidden="true" />} Verify source</button>
      </form>
      {mode === 'local-demo' && <div className="source-notice" id="source-mode-notice" role="status"><ShieldCheck size={18} aria-hidden="true" /><div><strong>Verification is unavailable in local demo mode.</strong><p>LearnLoop will not invent source facts, timestamps, or transcript details.</p></div></div>}
      {result ? <div className="source-result"><div className="source-result-label"><FileText size={18} aria-hidden="true" /><span>Verified source response</span></div><Markdown>{result}</Markdown><button type="button" onClick={onContinue}>Use this in Today’s Loop <ArrowRight size={16} aria-hidden="true" /></button></div> : <div className="source-empty"><Compass size={28} aria-hidden="true" /><h2>No source attached yet</h2><p>A source should support the current Growth Edge—not become another playlist.</p><div><span>1</span> Verify what is available</div><div><span>2</span> Select the smallest useful segment</div><div><span>3</span> Add prediction, practice, and proof</div></div>}
    </section>
  )
}

function MemoryView({ metadata, sessionMinutes, savedMemory, onApprove, onClear }: { metadata: StudioMetadata; sessionMinutes: number; savedMemory: string; onApprove: (memory: string) => void; onClear: () => void }) {
  const candidate = metadata.evidence.length
    ? `Learning goal: ${metadata.topic}. Evidence this session: ${metadata.evidence.join(', ')}. Preferred loop length: ${sessionMinutes} minutes.`
    : ''
  return (
    <section className="studio-view memory-view" aria-labelledby="memory-view-title">
      <div className="studio-view-heading"><div><span className="studio-kicker"><ShieldCheck size={14} aria-hidden="true" /> You stay in control</span><h1 id="memory-view-title" tabIndex={-1}>Learning Memory</h1><p>Session state is temporary. A compact learning preference is saved on this device only after you approve the exact text.</p></div></div>
      <div className="memory-grid">
        <div className="memory-card candidate"><div className="memory-card-icon"><Sparkles size={20} aria-hidden="true" /></div><span>Proposed memory</span><h2>Review before saving</h2>{candidate ? <blockquote>{candidate}</blockquote> : <p>Complete at least one meaningful learning signal before LearnLoop proposes a memory.</p>}<button type="button" onClick={() => onApprove(candidate)} disabled={!candidate}><Save size={16} aria-hidden="true" /> Approve &amp; save on this device</button></div>
        <div className="memory-card saved"><div className="memory-card-icon"><ShieldCheck size={20} aria-hidden="true" /></div><span>Approved memory</span><h2>{savedMemory ? 'Saved on this device' : 'Nothing saved'}</h2>{savedMemory ? <blockquote>{savedMemory}</blockquote> : <p>LearnLoop has not stored a durable learning summary.</p>}{savedMemory && <button type="button" className="danger" onClick={onClear}><Trash2 size={16} aria-hidden="true" /> Remove saved memory</button>}</div>
      </div>
      <div className="memory-policy"><LockKeyhole size={20} aria-hidden="true" /><div><strong>What is never saved here</strong><p>Raw transcripts, full code submissions, secrets, and every source you open.</p></div></div>
    </section>
  )
}

function EvidenceRail({ metadata, messages, sessionMinutes, elapsedMinutes }: { metadata: StudioMetadata; messages: StudioMessage[]; sessionMinutes: number; elapsedMinutes: number }) {
  const turns = messages.filter((message) => message.role === 'user').length
  const edge = metadata.phase === 'complete' ? 'Ready for transfer' : metadata.phase === 'prove' ? 'Explain the boundary rule' : metadata.phase === 'practice' ? 'Use the idea independently' : 'Make the hidden model visible'
  return (
    <aside className="evidence-rail" aria-label="Session evidence">
      <div className="rail-heading"><span><CircleDot size={14} aria-hidden="true" /> Session lens</span><strong>Evidence, not activity</strong></div>
      <div className="growth-edge-card"><span>Current Growth Edge</span><h2>{edge}</h2><p>{metadata.phase === 'complete' ? 'The current target has enough evidence. Choose a transfer task next.' : 'This remains a working hypothesis until your next signal.'}</p></div>
      <div className="rail-section"><div><span>Learning signals</span><strong>{metadata.evidence.length}</strong></div>{metadata.evidence.length ? <ul>{metadata.evidence.map((item) => <li key={item}><Check size={13} aria-hidden="true" />{item}</li>)}</ul> : <p>Your answers, attempts, and Proof Checks will appear here.</p>}</div>
      <div className="rail-stats"><div><span>Turns</span><strong>{turns}</strong></div><div><span>Time</span><strong>{elapsedMinutes}<small>m</small></strong></div><div><span>Plan</span><strong>{sessionMinutes}<small>m</small></strong></div></div>
      <div className="rail-privacy"><ShieldCheck size={17} aria-hidden="true" /><p><strong>Session-only by default.</strong><br />Durable memory requires review and approval.</p></div>
    </aside>
  )
}

export default function Studio({ initialPrompt, initialView = 'loop', onExit }: StudioProps) {
  const restored = useMemo(() => readSession(), [])
  const [activeView, setActiveView] = useState<StudioView>(initialView)
  const [messages, setMessages] = useState<StudioMessage[]>(restored?.messages ?? [])
  const [metadata, setMetadata] = useState<StudioMetadata>({ ...defaultMetadata, ...restored?.metadata })
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [mode, setMode] = useState<ConnectionMode>('checking')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastSubmission, setLastSubmission] = useState('')
  const [lastContext, setLastContext] = useState<MessageContext>('loop')
  const [practiceResult, setPracticeResult] = useState(restored?.practiceResult ?? '')
  const [sourceResult, setSourceResult] = useState(restored?.sourceResult ?? '')
  const [code, setCode] = useState(restored?.code ?? '# Write your Python attempt here\n')
  const [sessionMinutes, setSessionMinutes] = useState(restored?.sessionMinutes ?? 12)
  const [startedAt, setStartedAt] = useState(restored?.startedAt ?? Date.now())
  const [elapsedMinutes, setElapsedMinutes] = useState(0)
  const [savedMemory, setSavedMemory] = useState(readMemory)
  const clientId = useRef(createClientId())
  const inFlight = useRef(false)
  const initialHandled = useRef(false)
  const started = messages.length > 0 || loading

  useEffect(() => {
    if (!started) return
    const frame = window.requestAnimationFrame(() => document.querySelector<HTMLElement>('.studio-view h1')?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [activeView, started])

  useEffect(() => {
    fetch('/api/health')
      .then((response) => response.json())
      .then((data: { mode: ConnectionMode }) => setMode(data.mode))
      .catch(() => setMode('local-demo'))
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setElapsedMinutes(Math.floor((Date.now() - startedAt) / 60_000)), 30_000)
    setElapsedMinutes(Math.floor((Date.now() - startedAt) / 60_000))
    return () => window.clearInterval(timer)
  }, [startedAt])

  useEffect(() => {
    const session: StoredStudio = { messages, metadata, practiceResult, sourceResult, code, sessionMinutes, startedAt }
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } catch {
      setError('This browser could not preserve the temporary session. You can continue, but a refresh may clear it.')
    }
  }, [code, messages, metadata, practiceResult, sessionMinutes, sourceResult, startedAt])

  const sendMessage = useCallback(async (content: string, context: MessageContext = 'loop', isRetry = false) => {
    const clean = content.trim()
    if (!clean || inFlight.current) return
    inFlight.current = true
    setLoading(true)
    setError('')
    setLastSubmission(clean)
    setLastContext(context)
    if (!isRetry) {
      setMetadata((current) => current.topic === defaultMetadata.topic ? { ...current, topic: topicFromPrompt(clean) } : current)
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', content: clean, context }])
    }
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientId.current, message: clean }),
      })
      const data = (await response.json()) as ChatResponse
      if (!response.ok) throw new Error(data.error ?? 'The learning agent could not respond.')
      const reply = data.reply?.trim() || 'I need one more detail before I can continue.'
      setMode(data.mode ?? 'local-demo')
      setMetadata((current) => data.studio ? {
        ...data.studio,
        topic: data.studio.topic,
        evidence: [...new Set([...current.evidence, ...data.studio.evidence])],
      } : current)
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', content: reply, context }])
      setSuggestions(data.suggestions ?? [])
      if (context === 'practice') setPracticeResult(reply)
      if (context === 'sources') setSourceResult(reply)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.')
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialPrompt || started || initialHandled.current) return
    initialHandled.current = true
    void sendMessage(initialPrompt)
  }, [initialPrompt, sendMessage, started])

  const resetLoop = () => {
    if (messages.length && !window.confirm('Start a new loop? The current temporary session will be cleared.')) return
    sessionStorage.removeItem(SESSION_KEY)
    const nextClient = crypto.randomUUID()
    sessionStorage.setItem(CLIENT_KEY, nextClient)
    clientId.current = nextClient
    setMessages([])
    setMetadata(defaultMetadata)
    setSuggestions([])
    setPracticeResult('')
    setSourceResult('')
    setCode('# Write your Python attempt here\n')
    setError('')
    setLastSubmission('')
    setLastContext('loop')
    setStartedAt(Date.now())
    setActiveView('loop')
    window.history.replaceState({}, '', '/studio')
  }

  const approveMemory = (memory: string) => {
    if (!memory) return
    try {
      localStorage.setItem(MEMORY_KEY, memory)
      setSavedMemory(memory)
    } catch {
      setError('This browser blocked local memory storage. Nothing was saved.')
    }
  }

  const clearMemory = () => {
    if (!window.confirm('Remove the approved learning memory from this device?')) return
    try {
      localStorage.removeItem(MEMORY_KEY)
      setSavedMemory('')
    } catch {
      setError('This browser could not remove the saved memory.')
    }
  }

  const retry = () => {
    if (lastSubmission) void sendMessage(lastSubmission, lastContext, true)
  }

  const runCode = () => void sendMessage(code, 'practice')
  const submitSource = (source: string) => void sendMessage(`Use this learning source: ${source}\n\nState only what you can verify, then turn the smallest relevant part into an active learning loop.`, 'sources')
  const practiceBrief = [...messages].reverse().find((message) => message.role === 'assistant' && message.context === 'loop' && /```python|code challenge|tiny practice|paste your .*code|practice lab/i.test(message.content))?.content ?? ''

  return (
    <div className="studio-app">
      <a className="skip-link" href="#studio-main">Skip to learning activity</a>
      <header className="studio-topbar">
        <Brand onExit={onExit} />
        <div className="studio-session-title"><span>Current focus</span><strong>{metadata.topic}</strong></div>
        <div className="studio-top-actions">
          <span className={`connection-pill ${mode}`} aria-live="polite"><i />{mode === 'checking' ? 'Connecting' : mode === 'trueforge' ? 'Agent online' : 'Local demo'}</span>
          <button type="button" className="new-loop-button" onClick={resetLoop} aria-label="Start a new loop"><RefreshCw size={15} aria-hidden="true" /><span>New loop</span></button>
          <button type="button" className="exit-studio-button" onClick={onExit} aria-label="Return to landing page"><Home size={18} aria-hidden="true" /></button>
        </div>
      </header>

      <div className="studio-shell">
        <aside className="studio-sidebar">
          <nav aria-label="Studio navigation">
            <span>Workspace</span>
            {navItems.map(({ id, label, icon: Icon }) => <button type="button" className={activeView === id ? 'active' : ''} aria-current={activeView === id ? 'page' : undefined} onClick={() => setActiveView(id)} disabled={!started} key={id}><Icon size={18} aria-hidden="true" /><span>{label}</span>{activeView === id && <i />}</button>)}
          </nav>
          <div className="sidebar-loop-card"><span><Clock3 size={14} aria-hidden="true" /> Today’s plan</span><strong>{sessionMinutes} minutes</strong><div><i style={{ width: `${Math.min(100, (elapsedMinutes / sessionMinutes) * 100)}%` }} /></div><small>{elapsedMinutes} min in session</small></div>
          <button type="button" className="sidebar-exit" onClick={onExit}><ArrowLeft size={16} aria-hidden="true" /> Back to website</button>
        </aside>

        <main className="studio-main" id="studio-main">
          {error && activeView !== 'loop' && <div className="studio-error global-error" role="alert"><div><strong>That action could not be completed.</strong><span>{error}</span></div><button type="button" onClick={retry} disabled={!lastSubmission || loading}><RefreshCw size={15} aria-hidden="true" /> Retry</button></div>}
          {!started ? <Welcome onStart={(prompt) => void sendMessage(prompt)} loading={loading} sessionMinutes={sessionMinutes} onMinutes={setSessionMinutes} /> : activeView === 'loop' ? (
            <LoopView metadata={metadata} messages={messages} suggestions={suggestions} loading={loading} error={error} lastSubmission={lastSubmission} onSend={(message) => void sendMessage(message)} onRetry={retry} onOpenPractice={() => setActiveView('practice')} />
          ) : activeView === 'map' ? <MasteryMap metadata={metadata} />
            : activeView === 'practice' ? <PracticeLab metadata={metadata} mode={mode} code={code} brief={practiceBrief} result={practiceResult} loading={loading} onCode={setCode} onRun={runCode} onContinue={() => setActiveView('loop')} />
              : activeView === 'sources' ? <SourcesView mode={mode} result={sourceResult} loading={loading} onSubmit={submitSource} onContinue={() => setActiveView('loop')} />
                : <MemoryView metadata={metadata} sessionMinutes={sessionMinutes} savedMemory={savedMemory} onApprove={approveMemory} onClear={clearMemory} />}
        </main>

        {started && <EvidenceRail metadata={metadata} messages={messages} sessionMinutes={sessionMinutes} elapsedMinutes={elapsedMinutes} />}
      </div>

      <nav className="studio-mobile-nav" aria-label="Studio sections">
        {navItems.map(({ id, label, icon: Icon }) => <button type="button" className={activeView === id ? 'active' : ''} aria-current={activeView === id ? 'page' : undefined} onClick={() => setActiveView(id)} disabled={!started} key={id}><Icon size={19} aria-hidden="true" /><span>{label.replace('Learning ', '')}</span></button>)}
      </nav>
    </div>
  )
}
