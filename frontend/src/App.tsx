import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import './App.css'
import './wide.css'
import './components/FeatureCards.css'
import ShinyText from './components/ShinyText'
import Lightfall from './components/Lightfall'
import UploadFlow from './components/UploadFlow'
import WhatIfSimulator from './components/WhatIfSimulator'
import FeatureWorkspace, { type WorkspaceView } from './components/FeatureWorkspace'
import type { ProjectAnalysis } from './api/codeAtlas'
const ProjectGalaxy = lazy(() => import('./components/ProjectGalaxy'))

const lightfallColors = ['#B7FF2A', '#FFB84D', '#FF6B6B', '#2DD4BF']
const architectureSignals = [
  { from: 'frontend', to: 'api', kind: 'dependency', tone: 'green', position: 'signal-a' },
  { from: 'api', to: 'database', kind: 'data flow', tone: 'amber', position: 'signal-b' },
  { from: 'auth', to: 'gateway', kind: 'security', tone: 'coral', position: 'signal-c' },
  { from: 'core', to: 'utils', kind: 'import', tone: 'teal', position: 'signal-d' },
  { from: 'worker', to: 'events', kind: 'async', tone: 'green', position: 'signal-e' },
]

type IconName =
  | 'ai'
  | 'arrow'
  | 'branch'
  | 'chat'
  | 'code'
  | 'folder'
  | 'github'
  | 'graph'
  | 'health'
  | 'lock'
  | 'play'
  | 'shield'
  | 'spark'

const paths: Record<IconName, ReactNode> = {
  ai: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M9 9h6v6H9zM9 1v3m6-3v3M9 20v3m6-3v3M1 9h3m16 0h3M1 15h3m16 0h3" />
    </>
  ),
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  branch: (
    <>
      <circle cx="6" cy="5" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M8 5h3a5 5 0 0 1 5 5v6M8 5v13h8" />
    </>
  ),
  chat: <path d="M5 5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 3v-4a2 2 0 0 1-1-2V7a2 2 0 0 1 2-2Z" />,
  code: <path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-11-2 14" />,
  folder: <path d="M3 6h7l2 2h9v11H3z" />,
  github: (
    <path d="M12 2a10 10 0 0 0-3 19.5c.5.1.7-.2.7-.5v-2c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.7-1.4-2.3-.3-4.7-1.1-4.7-5A4 4 0 0 1 7 8.5c-.1-.3-.5-1.3.1-2.7 0 0 .9-.3 2.8 1.1a10 10 0 0 1 5.1 0c2-1.4 2.8-1.1 2.8-1.1.6 1.4.2 2.4.1 2.7a4 4 0 0 1 1.1 2.7c0 3.9-2.4 4.7-4.7 5 .4.3.7 1 .7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" />
  ),
  graph: (
    <>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="5" r="2" />
      <circle cx="19" cy="9" r="2" />
      <circle cx="15" cy="19" r="2" />
      <path d="m7 11 3.5-4.5m3.5-.8 3 2M18 11l-2 6m-2.5.5-7-4" />
    </>
  ),
  health: <path d="M3 12h4l2-5 4 10 2-5h6M5 4h14v16H5z" />,
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
    </>
  ),
  play: <path d="m9 7 8 5-8 5z" />,
  shield: <path d="M12 3 4 6v6c0 5 3.4 8 8 10 4.6-2 8-5 8-10V6z" />,
  spark: <path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7z" />,
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
function Brand() {
  return (
    <a className="brand" href="#top">
      <span>✳</span>CodeAtlas
    </a>
  )
}
function Heading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="heading reveal">
      <small>{eyebrow}</small>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </header>
  )
}

const steps = [
  ['folder', 'Upload', 'Copy a selected repository into the local backend workspace.'],
  ['branch', 'Analyze', 'Scan files, languages, Python symbols, and architecture signals.'],
  ['graph', 'Explore', 'Review detected architecture, repository areas, and measured metrics.'],
  ['chat', 'Ask', 'Query the project index with an optional local Ollama model.'],
] as const
const features = [
  [
    'graph',
    'Architecture Map',
    'Detect backend, frontend, API, database, testing, AI, and deployment signals.',
  ],
  ['spark', 'Project Galaxy', 'Explore a scan-derived map of top-level repository areas.'],
  [
    'health',
    'What-if Preview',
    'Explore the planned impact workflow; the backend engine is not implemented yet.',
  ],
  [
    'ai',
    'Reading Guide',
    'Start with verified manifests, entry points, README files, and large files.',
  ],
  [
    'shield',
    'Repository Metrics',
    'Inspect real file, folder, size, empty-file, and language measurements.',
  ],
  ['chat', 'AI Chat', 'Ask grounded questions when the local Ollama runtime is available.'],
] as const
const featureViews: Record<string, WorkspaceView> = {
  'Architecture Map': 'architecture',
  'Project Galaxy': 'galaxy',
  'What-if Preview': 'simulator',
  'Reading Guide': 'onboarding',
  'Repository Metrics': 'health',
  'AI Chat': 'chat',
}

function App() {
  const [repoName, setRepoName] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [dashboardView, setDashboardView] = useState<WorkspaceView>('architecture')
  const [project, setProject] = useState<ProjectAnalysis | null>(null)

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('motion-ready')
    const revealObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            revealObserver.unobserve(entry.target)
          }
        }),
      { threshold: 0.1, rootMargin: '0px 0px -28px' },
    )
    const observed = new WeakSet<Element>()
    let revealIndex = 0
    const observeReveals = () =>
      document.querySelectorAll<HTMLElement>('.reveal').forEach((element) => {
        if (observed.has(element)) return
        observed.add(element)
        element.style.setProperty('--delay', `${Math.min(revealIndex++ % 4, 3) * 65}ms`)
        revealObserver.observe(element)
      })
    observeReveals()
    const revealMutationObserver = new MutationObserver(observeReveals)
    revealMutationObserver.observe(document.body, { childList: true, subtree: true })

    const sections = [...document.querySelectorAll<HTMLElement>('section[id]')]
    const links = [...document.querySelectorAll<HTMLAnchorElement>('.navlinks a')]
    const sectionObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting)
            links.forEach((link) =>
              link.classList.toggle('active', link.hash === `#${entry.target.id}`),
            )
        }),
      { rootMargin: '-35% 0px -55%' },
    )
    sections.forEach((section) => sectionObserver.observe(section))

    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      root.style.setProperty('--scroll-progress', `${max > 0 ? (window.scrollY / max) * 100 : 0}%`)
    }
    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    return () => {
      revealObserver.disconnect()
      revealMutationObserver.disconnect()
      sectionObserver.disconnect()
      window.removeEventListener('scroll', updateProgress)
      root.classList.remove('motion-ready')
    }
  }, [])

  const chooseRepository = () => setUploadOpen(true)
  const openDashboard = (view: WorkspaceView = 'architecture') => {
    setDashboardView(view)
    setDashboardOpen(true)
    window.scrollTo(0, 0)
  }

  if (dashboardOpen)
    return (
      <main className="product-dashboard">
        <header className="dashboard-topbar">
          <button
            className="dashboard-home"
            onClick={() => setDashboardOpen(false)}
            aria-label="Back to CodeAtlas home"
          >
            <span>✳</span>
            <b>CodeAtlas</b>
          </button>
          <div className="dashboard-context">
            <span>
              <i />
              {project ? 'LOCAL ANALYSIS' : 'DEMO WORKSPACE'}
            </span>
            <b>{project?.metadata.project_name || 'Feature preview'}</b>
          </div>
          <button className="dashboard-exit" onClick={() => setDashboardOpen(false)}>
            ← Back to home
          </button>
        </header>
        <section className="dashboard-stage">
          <FeatureWorkspace key={dashboardView} initialView={dashboardView} project={project} />
        </section>
      </main>
    )

  return (
    <main id="top">
      <div className="scroll-progress" />
      <nav className="topnav">
        <Brand />
        <div className="navlinks">
          <button onClick={() => openDashboard('architecture')}>Dashboard</button>
          <a href="#features">Features</a>
          <a href="#how">How it Works</a>
          <a href="#showcase">Showcase</a>
          <a href="#security">Security</a>
        </div>
        <a
          className="github"
          href="https://github.com/Hazardo911/CodeAtlas"
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="github" size={15} />
          Star on GitHub
        </a>
      </nav>
      <UploadFlow
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onComplete={(analysis) => {
          setProject(analysis)
          setRepoName(analysis.metadata.project_name)
          openDashboard('architecture')
        }}
      />
      <div className="hero-shell">
        <Lightfall
          className="hero-lightfall"
          colors={lightfallColors}
          backgroundColor="#050505"
          speed={0.58}
          streakCount={3}
          streakWidth={0.72}
          streakLength={1.25}
          glow={0.42}
          density={0.68}
          twinkle={0.18}
          zoom={2}
          backgroundGlow={0.12}
          opacity={0.68}
          mouseInteraction
          mouseStrength={0.1}
          mouseRadius={0.7}
        />
        <section className="hero hero-centered">
          <div className="architecture-signals" aria-hidden="true">
            {architectureSignals.map((signal) => (
              <div
                className={`signal-chip ${signal.tone} ${signal.position}`}
                key={`${signal.from}-${signal.to}`}
              >
                <i />
                <span>
                  <small>{signal.kind}</small>
                  <b>{signal.from}</b>
                  <em>→</em>
                  <b>{signal.to}</b>
                </span>
              </div>
            ))}
          </div>
          <div className="hero-copy reveal visible">
            <span className="pill">● &nbsp; 100% On-Device AI</span>
            <h1 className="shiny-title">
              <ShinyText
                text="Understand Any Codebase."
                speed={1.65}
                delay={0.2}
                color="#c8cec3"
                shineColor="#ffffff"
                spread={105}
              />
              <ShinyText
                text="Visually."
                speed={1.65}
                delay={0.36}
                color="#c8cec3"
                shineColor="#ffffff"
                spread={105}
              />
              <ShinyText
                className="shiny-accent"
                text="Privately."
                color="#91d719"
                shineColor="#f2ffce"
                speed={1.65}
                delay={0.52}
                spread={105}
              />
            </h1>
            <p>
              CodeAtlas is your on-device AI software architect. Upload any repository and get an
              interactive digital twin of your codebase.
            </p>
            <div className="actions">
              <button className="primary" type="button" onClick={chooseRepository}>
                <Icon name="folder" />
                {repoName || 'Upload Repository'}
              </button>
              <button type="button" onClick={() => openDashboard('galaxy')}>
                <Icon name="play" />
                Open Dashboard
              </button>
            </div>
            <small className="safe">
              <Icon name="shield" size={13} />
              {repoName ? `${repoName} selected locally.` : 'Your code never leaves your machine.'}
            </small>
          </div>
        </section>
      </div>
      <section className="section galaxy-story" id="galaxy">
        <Heading
          eyebrow="PROJECT GALAXY · CONCEPT PREVIEW"
          title={
            <>
              See How Your Code
              <br />
              <em>Connects.</em>
            </>
          }
        >
          Try the 3D interaction here. Uploaded projects use a truthful folder topology until the
          backend dependency graph is implemented.
        </Heading>
        <div className="reveal">
          <Suspense
            fallback={
              <div className="galaxy-loading">
                <span>✳</span>
                <b>Initializing 3D galaxy…</b>
              </div>
            }
          >
            <ProjectGalaxy />
          </Suspense>
        </div>
      </section>
      <section className="section simulator-section" id="simulator">
        <Heading
          eyebrow="WHAT-IF SIMULATOR · CONCEPT PREVIEW"
          title={
            <>
              Know the impact
              <br />
              <em>Before the commit.</em>
            </>
          }
        >
          Preview the intended impact-analysis experience. Results below are demo scenarios, not
          backend analysis.
        </Heading>
        <div className="reveal">
          <WhatIfSimulator />
        </div>
      </section>
      <section className="outcome-strip reveal" aria-label="CodeAtlas outcomes">
        <header>
          <small>FROM UNKNOWN REPOSITORY TO CONFIDENT CHANGE</small>
          <h2>Context that compounds as you explore.</h2>
          <p>
            Every view shares the same project map, so insights from one feature become context for
            the next.
          </p>
        </header>
        <div>
          {[
            ['01', 'Map', 'See modules, boundaries, and data flow.'],
            ['02', 'Learn', 'Follow the shortest path to understanding.'],
            ['03', 'Evaluate', 'Find risk and simulate architectural impact.'],
            ['04', 'Act', 'Ask grounded questions and change with confidence.'],
          ].map(([number, title, copy]) => (
            <article key={title}>
              <span>{number}</span>
              <b>{title}</b>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section" id="how">
        <Heading eyebrow="HOW IT WORKS" title="From Code to Clarity in Seconds">
          We analyze your entire codebase locally and transform it into an interactive architecture
          you can explore.
        </Heading>
        <div className="steps">
          {steps.map(([i, t, d], n) => (
            <article className="reveal" key={t}>
              <span>
                <Icon name={i} />
              </span>
              <b>
                {n + 1}. {t}
              </b>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section" id="features">
        <Heading
          eyebrow="POWERFUL FEATURES"
          title={
            <>
              Everything You Need to
              <br />
              Understand Software
            </>
          }
        />
        <div className="feature-grid">
          {features.map(([i, t, d], n) => {
            const view = featureViews[t]
            const content = (
              <>
                <span>
                  <Icon name={i} />
                </span>
                <div>
                  <b>{t}</b>
                  <p>{d}</p>
                  <i>Open dashboard →</i>
                </div>
              </>
            )
            return (
              <a
                href="#dashboard"
                onClick={(event) => {
                  event.preventDefault()
                  openDashboard(view)
                }}
                className={`feature-card completed reveal c${n}`}
                key={t}
              >
                {content}
              </a>
            )
          })}
        </div>
      </section>
      <section className="section journeys-section" id="showcase">
        <Heading
          eyebrow="START WITH YOUR QUESTION"
          title={
            <>
              One Codebase.
              <br />
              <em>Three Ways Forward.</em>
            </>
          }
        >
          Choose the outcome you need and CodeAtlas takes you to the right project context.
        </Heading>
        <div className="journey-grid">
          {[
            {
              number: '01',
              tone: 'teal',
              icon: 'ai' as IconName,
              title: 'Join an unfamiliar codebase',
              copy: 'Skip the scavenger hunt. Get the project brief, key concepts, entry points, and a safe first-change path.',
              view: 'onboarding' as WorkspaceView,
              meta: ['Project brief', '30-minute path', 'Good first issue'],
            },
            {
              number: '02',
              tone: 'amber',
              icon: 'branch' as IconName,
              title: 'Preview impact planning',
              copy: 'Explore the planned What-if workflow while dependency analysis remains a backend roadmap item.',
              view: 'simulator' as WorkspaceView,
              meta: ['Concept UI', 'Demo scenario', 'Engine planned'],
            },
            {
              number: '03',
              tone: 'coral',
              icon: 'health' as IconName,
              title: 'Inspect repository measurements',
              copy: 'Review measured file counts, directory totals, sizes, empty files, and language distribution.',
              view: 'health' as WorkspaceView,
              meta: ['File inventory', 'Size signals', 'Language mix'],
            },
          ].map((item) => (
            <a
              href="#dashboard"
              className={`journey-card ${item.tone} reveal`}
              onClick={(event) => {
                event.preventDefault()
                openDashboard(item.view)
              }}
              key={item.number}
            >
              <header>
                <span>{item.number}</span>
                <i>
                  <Icon name={item.icon} />
                </i>
              </header>
              <div>
                <small>DEVELOPER JOURNEY</small>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </div>
              <ul>
                {item.meta.map((value) => (
                  <li key={value}>✓ {value}</li>
                ))}
              </ul>
              <footer>
                Open in dashboard <span>→</span>
              </footer>
            </a>
          ))}
        </div>
        <div className="journey-proof reveal">
          <div>
            <small>SHARED PROJECT INTELLIGENCE</small>
            <h3>Explore once. Build context everywhere.</h3>
            <p>
              Live views share one backend scan. Concept previews are clearly separated from
              measured project data.
            </p>
            <button onClick={() => openDashboard('architecture')}>
              Explore the full workspace <Icon name="arrow" size={14} />
            </button>
          </div>
          <dl>
            <div>
              <dt>9</dt>
              <dd>Architecture checks</dd>
            </div>
            <div>
              <dt>1</dt>
              <dd>Python symbol parser</dd>
            </div>
            <div>
              <dt>5+</dt>
              <dd>Measured scan signals</dd>
            </div>
            <div>
              <dt>100%</dt>
              <dd>Local workspace</dd>
            </div>
          </dl>
        </div>
      </section>
      <section className="section security" id="security">
        <Heading
          eyebrow="PRIVACY FIRST"
          title={
            <>
              Your Code. Your Machine. <em>Always.</em>
            </>
          }
        />
        <div className="privacy-row">
          {[
            ['shield', 'Offline First', 'Works completely offline. No cloud required.'],
            ['lock', 'No Data Collection', 'We don’t collect or track anything.'],
            ['code', 'Transparent', 'Open source and community driven.'],
            ['lock', 'You’re in Control', 'Run it offline, behind your firewall.'],
          ].map(([i, t, d]) => (
            <article className="reveal" key={t}>
              <Icon name={i as IconName} />
              <div>
                <b>{t}</b>
                <p>{d}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="cta reveal" id="docs">
        <div>
          <h2>Ready to Understand Your Codebase?</h2>
          <p>Join developers who are building better software with CodeAtlas.</p>
          <div className="actions">
            <button className="primary" type="button" onClick={chooseRepository}>
              Get Started Now <Icon name="arrow" />
            </button>
            <a href="#showcase">
              <Icon name="play" />
              Try Live Demo
            </a>
          </div>
        </div>
        <div className="mountain">✦</div>
      </section>
      <footer>
        <Brand />
        <span>© 2026 CodeAtlas. All rights reserved.</span>
        <nav>
          <a href="https://github.com">GitHub</a>
          <a href="#">Twitter</a>
          <a href="#docs">Docs</a>
          <a href="mailto:hello@codeatlas.dev">Contact</a>
        </nav>
      </footer>
    </main>
  )
}
export default App
