import { FormEvent, Fragment, ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bot,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleDot,
  Code2,
  Compass,
  LockKeyhole,
  Menu,
  MessageCircle,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  X,
  Zap,
} from 'lucide-react'

type Artifact = {
  type: 'growth-edge' | 'loop' | 'proof'
  title: string
  eyebrow: string
  items: string[]
}

type Message = {
  id: number
  role: 'assistant' | 'user'
  content: string
  artifact?: Artifact
}

type ConnectionMode = 'checking' | 'trueforge' | 'local-demo'

const prompts = [
  'I’m stuck on Python loops',
  'Help me understand a concept',
  'Learn from a video',
  'What should I learn next?',
]

const features = [
  {
    icon: BrainCircuit,
    label: 'Mastery Map',
    title: 'See what you know—and what matters next.',
    text: 'A living map of concepts, prerequisites, Learning Signals, and Proof Checks. It moves only when the evidence does.',
    tone: 'violet',
  },
  {
    icon: Zap,
    label: 'Today’s Loop',
    title: 'A complete learning session in 8–15 minutes.',
    text: 'One focused goal. See → Predict → Practice → Prove → Advance. No sprawling curriculum required.',
    tone: 'yellow',
  },
  {
    icon: Code2,
    label: 'Practice Lab',
    title: 'Learn by doing, not copying.',
    text: 'Run code safely, compare actual and expected behavior, and understand the concept behind the result.',
    tone: 'coral',
  },
  {
    icon: ShieldCheck,
    label: 'Learning Memory',
    title: 'Starts where you left off—with permission.',
    text: 'Remember goals, proven skills, and what helped. See exactly what is saved and remove it whenever you want.',
    tone: 'mint',
  },
  {
    icon: Compass,
    label: 'Source Intelligence',
    title: 'Use content because it fits.',
    text: 'Connect current resources to the exact concept you need, with source limits clearly shown.',
    tone: 'blue',
  },
  {
    icon: Sparkles,
    label: 'Visual Learning Studio',
    title: 'Make the invisible visible.',
    text: 'Trace tables, concept cards, comparisons, and interactive maps turn abstract ideas into something usable.',
    tone: 'pink',
  },
]

const steps = [
  ['01', 'Tell us where it broke', 'Paste code, name the confusing moment, or share a learning source.'],
  ['02', 'Find your Growth Edge', 'One useful question at a time reveals the smallest concept blocking progress.'],
  ['03', 'Learn it your way', 'A visual trace, first principles, a worked example, or guided questions—chosen for now.'],
  ['04', 'Practice in the loop', 'Take one small action instead of consuming another long lesson.'],
  ['05', 'Prove it', 'Your explanation, answer, or code is checked before progress is marked.'],
  ['06', 'Know what comes next', 'The Mastery Map updates from evidence and points to one Next Best Step.'],
]

function RichText({ children }: { children: string }) {
  const blocks = children.split('\n')
  return (
    <>
      {blocks.map((block, blockIndex) => (
        <Fragment key={`${block}-${blockIndex}`}>
          {block ? (
            <span>
              {block.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, index) => {
                if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>
                if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
                return <Fragment key={index}>{part}</Fragment>
              })}
            </span>
          ) : null}
          {blockIndex < blocks.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  )
}

function Logo() {
  return (
    <a className="logo" href="#top" aria-label="LearnLoop home">
      <span className="logo-mark"><span /></span>
      <span>LearnLoop</span>
    </a>
  )
}

function ChatPanel({ open, onClose, initialPrompt }: { open: boolean; onClose: () => void; initialPrompt?: string }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<ConnectionMode>('checking')
  const [suggestions, setSuggestions] = useState(prompts.slice(0, 3))
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content: 'What are you trying to learn—or where did you get stuck?\n\nPaste code, describe a confusing idea, or share a video or resource.',
    },
  ])
  const bottomRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLElement>(null)
  const clientId = useRef(crypto.randomUUID())
  const submittedInitial = useRef<string | undefined>(undefined)

  useEffect(() => {
    fetch('/api/health')
      .then((result) => result.json())
      .then((data: { mode: ConnectionMode }) => setMode(data.mode))
      .catch(() => setMode('local-demo'))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // --- Fix #8: Focus management for chat panel ---
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement
      const focusable = panelRef.current?.querySelector<HTMLElement>('textarea, button')
      focusable?.focus()
    } else {
      triggerRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const sendMessage = useCallback(async (content: string) => {
    const clean = content.trim()
    if (!clean || loading) return
    setInput('')
    setMessages((current) => [...current, { id: Date.now(), role: 'user', content: clean }])
    setSuggestions([])
    setLoading(true)
    try {
      const result = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientId.current, message: clean }),
      })
      const data = (await result.json()) as { reply?: string; error?: string; suggestions?: string[]; artifact?: Artifact; mode?: ConnectionMode }
      if (!result.ok) throw new Error(data.error ?? 'The agent could not respond.')
      setMode((current) => data.mode ?? current)
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: 'assistant', content: data.reply ?? 'No response received.', artifact: data.artifact },
      ])
      setSuggestions(data.suggestions ?? [])
    } catch (error) {
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: 'assistant', content: error instanceof Error ? error.message : 'Something went wrong.' },
      ])
    } finally {
      setLoading(false)
    }
  }, [loading])

  useEffect(() => {
    if (open && initialPrompt && submittedInitial.current !== initialPrompt) {
      submittedInitial.current = initialPrompt
      void sendMessage(initialPrompt)
    }
  }, [open, initialPrompt, sendMessage])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void sendMessage(input)
  }

  return (
    <>
      <button className={`chat-scrim ${open ? 'visible' : ''}`} aria-label="Close chat" onClick={onClose} tabIndex={open ? 0 : -1} />
      <aside ref={panelRef} className={`chat-panel ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="LearnLoop chat" inert={!open}>
        <header className="chat-header">
          <div className="agent-identity">
            <span className="agent-avatar"><Bot size={20} /></span>
            <div><strong>LearnLoop</strong><span><i className={mode === 'trueforge' ? 'live' : ''} />{mode === 'checking' ? 'Connecting…' : mode === 'trueforge' ? 'TrueForge connected' : 'Local demo mode'}</span></div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close chat"><X size={20} /></button>
        </header>

        <div className="chat-context">
          <span><CircleDot size={13} /> Learning signal</span>
          <span><ShieldCheck size={13} /> Memory requires consent</span>
        </div>

        <div className="messages" aria-live="polite">
          <div className="chat-date">Today’s Loop</div>
          {messages.map((message) => (
            <div className={`message-row ${message.role}`} key={message.id}>
              {message.role === 'assistant' && <span className="mini-avatar"><span /></span>}
              <div className={`message ${message.role}`}>
                <RichText>{message.content}</RichText>
                {message.artifact && (
                  <div className={`chat-artifact ${message.artifact.type}`}>
                    <span>{message.artifact.eyebrow}</span>
                    <strong>{message.artifact.title}</strong>
                    <ul>{message.artifact.items.map((item) => <li key={item}><Check size={13} />{item}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message-row assistant">
              <span className="mini-avatar"><span /></span>
              <div className="message assistant typing"><i /><i /><i /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="chat-bottom">
          {suggestions.length > 0 && (
            <div className="chat-suggestions">
              {suggestions.map((suggestion) => <button key={suggestion} onClick={() => void sendMessage(suggestion)}>{suggestion}</button>)}
            </div>
          )}
          <form className="chat-composer" onSubmit={submit}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  if (input.trim()) void sendMessage(input)
                }
              }}
              placeholder="Describe where you got stuck…"
              rows={1}
              aria-label="Message LearnLoop"
            />
            <button type="submit" disabled={!input.trim() || loading} aria-label="Send message"><Send size={18} /></button>
          </form>
          <p>Learning Memory is never saved without your approval.</p>
        </div>
      </aside>
    </>
  )
}

function ProductPreview({ onStart }: { onStart: () => void }) {
  return (
    <div className="product-preview">
      <div className="preview-topbar">
        <Logo />
        <div className="preview-user">MY</div>
      </div>
      <div className="preview-layout">
        <aside className="preview-sidebar">
          <span className="active"><MessageCircle size={16} /> Today’s Loop</span>
          <span><BrainCircuit size={16} /> Mastery Map</span>
          <span><Code2 size={16} /> Practice Lab</span>
          <span><BookOpen size={16} /> Sources</span>
        </aside>
        <div className="preview-content">
          <div className="snapshot-row">
            <div><span>LEARNER SNAPSHOT</span><h3>Python loops</h3><p>Visual trace + first principles</p></div>
            <div className="session-time"><span>TIME TODAY</span><strong>10</strong><small>min</small></div>
          </div>
          <div className="preview-grid">
            <div className="map-card">
              <div className="card-heading"><div><span>MASTERY MAP</span><h3>Your next concept</h3></div><button aria-label="Open mastery map"><ArrowUpRight size={17} /></button></div>
              <div className="map-visual">
                <svg viewBox="0 0 430 180" role="img" aria-label="Concept mastery map">
                  <path d="M67 87 C120 87 123 42 185 42" />
                  <path d="M67 87 C127 87 135 132 205 132" />
                  <path d="M230 42 C280 42 287 88 345 88" />
                  <path d="M250 132 C300 132 295 88 345 88" />
                </svg>
                <span className="node done n1"><Check size={13} />Variables</span>
                <span className="node next n2"><Sparkles size={13} />range()</span>
                <span className="node edge n3">Loop boundaries</span>
                <span className="node locked n4"><LockKeyhole size={12} />for loops</span>
              </div>
              <div className="map-legend"><span><i className="done" /> Demonstrated</span><span><i className="edge" /> Growth Edge</span><span><i className="next" /> Next Best Step</span></div>
            </div>
            <div className="loop-card">
              <div className="loop-meta"><span>TODAY’S LOOP</span><strong>8 min</strong></div>
              <h3>Understand how<br />range() counts</h3>
              <div className="loop-steps">
                {['See it', 'Predict', 'Practice', 'Prove it'].map((item, index) => (
                  <div className={index === 0 ? 'current' : ''} key={item}><span>{index + 1}</span><p>{item}<small>{['2 min', '30 sec', '3 min', '2 min'][index]}</small></p>{index === 0 && <Play size={12} fill="currentColor" />}</div>
                ))}
              </div>
              <button onClick={onStart}>Begin loop <ArrowRight size={15} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FadeIn({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const [chatOpen, setChatOpen] = useState(false)
  const [initialPrompt, setInitialPrompt] = useState<string>()
  const [mobileNav, setMobileNav] = useState(false)
  const reduceMotion = useReducedMotion()

  const startChat = (prompt?: string) => {
    setInitialPrompt(prompt)
    setChatOpen(true)
    setMobileNav(false)
  }

  return (
    <div id="top">
      <nav className="site-nav">
        <Logo />
        <div className={`nav-links ${mobileNav ? 'show' : ''}`}>
          <a href="#how" onClick={() => setMobileNav(false)}>How it works</a>
          <a href="#studio" onClick={() => setMobileNav(false)}>The studio</a>
          <a href="#principles" onClick={() => setMobileNav(false)}>Why LearnLoop</a>
          <button className="nav-cta" onClick={() => startChat()}>Start learning <ArrowUpRight size={15} /></button>
        </div>
        <button className="menu-button" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation">{mobileNav ? <X /> : <Menu />}</button>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          <FadeIn className="hero-copy">
            <div className="eyebrow"><span><Sparkles size={13} /></span> Your adaptive learning studio</div>
            <h1>From content<br />to <em>capability.</em></h1>
            <p>Stop watching lessons you cannot use. LearnLoop finds the one thing you’re missing, teaches it the right way, and helps you prove what you can do next.</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => startChat()}>Start today’s loop <ArrowRight size={18} /></button>
              <a className="text-button" href="#how">See how it works <ArrowDown size={17} /></a>
            </div>
            <div className="hero-note"><span className="people"><i>M</i><i>J</i><i>A</i></span><span><strong>Built for the moment</strong><br />after passive learning fails.</span></div>
          </FadeIn>
          <FadeIn className="hero-demo">
            <div className="demo-window">
              <div className="demo-chrome"><span className="chrome-dots"><i /><i /><i /></span><span className="demo-address"><ShieldCheck size={12} /> LearnLoop · Private session</span><span /></div>
              <div className="demo-body">
                <div className="demo-agent"><span className="agent-avatar"><Bot size={19} /></span><div><strong>LearnLoop</strong><small><i /> ready to learn</small></div></div>
                <div className="demo-question"><span>What are you trying to learn—or where did you get stuck?</span><p>Paste code, describe a confusing idea, or share a video.</p></div>
                <div className="prompt-grid">
                  {prompts.map((prompt, index) => <button key={prompt} onClick={() => startChat(prompt)}><span>{[<Code2 />, <BrainCircuit />, <Play />, <Target />][index]}</span>{prompt}<ChevronRight size={16} /></button>)}
                </div>
                <button className="demo-input" onClick={() => startChat()}><span>Describe where you got stuck…</span><i><ArrowRight size={16} /></i></button>
              </div>
            </div>
            <div className="floating-proof"><span><Check size={14} /></span><div><strong>Evidence, not empty praise</strong><small>Progress updates after you prove it.</small></div></div>
          </FadeIn>
        </section>

        <section className="statement" id="principles">
          <FadeIn>
            <p>NOT ANOTHER AI TUTOR THAT TALKS AT YOU</p>
            <h2>A learning agent that <em>adapts</em><br />when you get stuck.</h2>
            <div className="statement-rule"><span>Confusion</span><i /><span>Clarity</span><i /><span>Practice</span><i /><span>Proof</span></div>
          </FadeIn>
        </section>

        <section className="problem-section">
          <FadeIn className="section-intro">
            <span className="section-number">01 — THE PROBLEM</span>
            <h2>You don’t need more content.<br /><em>You need the right next step.</em></h2>
          </FadeIn>
          <div className="problem-grid">
            <FadeIn className="problem-story">
              <div className="story-line"><span>01</span><p>You watch a video.<br /><strong>It makes sense.</strong></p></div>
              <div className="story-line"><span>02</span><p>You try it yourself.<br /><strong>Everything falls apart.</strong></p></div>
              <div className="story-line active"><span>03</span><p>You get another explanation.<br /><strong>But not the missing insight.</strong></p></div>
            </FadeIn>
            <FadeIn className="problem-answer">
              <span className="squiggle">⌁</span>
              <p>LearnLoop turns <strong>“I’m confused”</strong> into a small, concrete path: understand the gap, see the idea, try it yourself, prove it, and move forward.</p>
              <button onClick={() => startChat()}>Find my next step <ArrowRight size={17} /></button>
            </FadeIn>
          </div>
        </section>

        <section className="how-section" id="how">
          <FadeIn className="section-intro light">
            <span className="section-number">02 — HOW IT WORKS</span>
            <h2>One thoughtful loop.<br /><em>Real forward motion.</em></h2>
            <p>LearnLoop does not ask what content to generate. It asks what you’re missing—and what evidence would prove you can do it.</p>
          </FadeIn>
          <div className="steps-list">
            {steps.map(([number, title, text], index) => (
              <motion.div
                className="step"
                key={number}
                initial={reduceMotion ? false : { opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={reduceMotion ? { duration: 0 } : { delay: index * 0.07 }}
              >
                <span>{number}</span><h3>{title}</h3><p>{text}</p><ArrowUpRight size={20} />
              </motion.div>
            ))}
          </div>
        </section>

        <section className="studio-section" id="studio">
          <FadeIn className="section-intro centered">
            <span className="section-number">03 — INSIDE THE STUDIO</span>
            <h2>Your learning, made <em>visible.</em></h2>
            <p>A calm workspace that turns every answer, attempt, and insight into a path you can understand.</p>
          </FadeIn>
          <FadeIn><ProductPreview onStart={() => startChat('I’m stuck on Python loops')} /></FadeIn>
        </section>

        <section className="features-section">
          <FadeIn className="features-heading"><span>Everything works together</span><h2>Not features for show.<br /><em>A system for growth.</em></h2></FadeIn>
          <div className="feature-grid">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.article className={`feature-card ${feature.tone}`} key={feature.label} initial={reduceMotion ? false : { opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={reduceMotion ? { duration: 0 } : { delay: (index % 3) * 0.08 }}>
                  <div className="feature-top"><span><Icon size={20} /></span><small>{String(index + 1).padStart(2, '0')}</small></div>
                  <p>{feature.label}</p><h3>{feature.title}</h3><div>{feature.text}</div>
                </motion.article>
              )
            })}
          </div>
        </section>

        <section className="proof-section">
          <FadeIn className="proof-copy">
            <span className="section-number">PROGRESS THAT MEANS SOMETHING</span>
            <h2>Encouragement feels good.<br /><em>Evidence moves you forward.</em></h2>
            <p>LearnLoop checks whether understanding transfers before updating your map. One lucky answer is a signal—not a mastery claim.</p>
          </FadeIn>
          <FadeIn className="proof-card">
            <div className="proof-status"><span><Check size={20} /></span><div><small>PROOF CHECK COMPLETE</small><strong>You proved this pattern.</strong></div></div>
            <div className="progress-item"><div><span>range() basics</span><small>Practicing → Demonstrated</small></div><strong>100%</strong></div>
            <div className="progress-bar"><i /></div>
            <div className="next-step"><span><Sparkles size={16} /></span><div><small>NEXT BEST STEP</small><p>Loop through a list, where the loop receives actual items.</p></div><ArrowRight size={18} /></div>
          </FadeIn>
        </section>

        <section className="final-cta">
          <div className="cta-loop loop-a" /><div className="cta-loop loop-b" />
          <FadeIn>
            <span className="eyebrow"><span><Sparkles size={13} /></span> Your next step is smaller than you think</span>
            <h2>Ready to turn<br /><em>confusion into capability?</em></h2>
            <p>Bring the code that failed, the concept that won’t click, or the video that left you stuck.</p>
            <button className="primary-button light-button" onClick={() => startChat()}>Start today’s loop <ArrowRight size={18} /></button>
          </FadeIn>
        </section>
      </main>

      <footer>
        <Logo />
        <p>From content to capability.</p>
        <div><a href="#how">How it works</a><a href="#studio">The studio</a><button onClick={() => startChat()}>Start learning</button></div>
        <small>Built with TrueForge · Learning Memory always requires consent.</small>
      </footer>

      <button className="floating-chat" onClick={() => startChat()} aria-label="Open LearnLoop chat"><MessageCircle size={21} /><span>Ask LearnLoop</span></button>
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} initialPrompt={initialPrompt} />
    </div>
  )
}
