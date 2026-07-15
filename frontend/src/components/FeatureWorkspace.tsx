import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { askProject, getAiStatus, type ChatSource, type ProjectAnalysis } from '../api/codeAtlas'
import './FeatureWorkspace.css'
import './Integration.css'
import WhatIfSimulator from './WhatIfSimulator'

const ProjectGalaxy = lazy(() => import('./ProjectGalaxy'))

export type WorkspaceView =
  'architecture' | 'galaxy' | 'simulator' | 'onboarding' | 'health' | 'chat'

const views: Array<{
  id: WorkspaceView
  label: string
  eyebrow: string
  capability: 'live' | 'derived' | 'preview'
}> = [
  { id: 'architecture', label: 'Architecture', eyebrow: 'DETECTION', capability: 'live' },
  { id: 'galaxy', label: 'Galaxy', eyebrow: 'STRUCTURE MAP', capability: 'derived' },
  { id: 'simulator', label: 'What-If', eyebrow: 'CONCEPT', capability: 'preview' },
  { id: 'onboarding', label: 'Onboarding', eyebrow: 'SCAN GUIDE', capability: 'derived' },
  { id: 'health', label: 'Repository', eyebrow: 'REAL METRICS', capability: 'live' },
  { id: 'chat', label: 'AI Chat', eyebrow: 'LOCAL RAG', capability: 'live' },
]

const previewAnswers: Record<string, string> = {
  'Give me a project overview':
    'Upload a repository to generate a grounded overview from its scanned files and detected architecture.',
  'Which frameworks are detected?':
    'Framework detection becomes available after the local backend analyzes project manifests and imports.',
  'Where should I start reading?':
    'Upload a repository and CodeAtlas will surface manifests, README files, entry points, and large files.',
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function EmptyProject({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="workspace-empty">
      <span>CA</span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  )
}

export default function FeatureWorkspace({
  initialView = 'architecture',
  project,
}: {
  initialView?: WorkspaceView
  project?: ProjectAnalysis | null
}) {
  const [view, setView] = useState<WorkspaceView>(initialView)
  const [completed, setCompleted] = useState<boolean[]>([])
  const [question, setQuestion] = useState('Give me a project overview')
  const [answer, setAnswer] = useState(
    project
      ? 'Ask a question to search the local project index.'
      : previewAnswers['Give me a project overview'],
  )
  const [sources, setSources] = useState<ChatSource[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatSeconds, setChatSeconds] = useState(0)
  const [answerMode, setAnswerMode] = useState<'scan' | 'ai' | 'preview'>('preview')
  const [aiStatus, setAiStatus] = useState(project?.aiStatus)

  const projectName = project?.metadata.project_name || 'No repository loaded'
  const scan = project?.scan.scan
  const metrics = project?.scan.health
  const architecture = project?.architecture
  const files = useMemo(() => scan?.files || [], [scan])
  const languages = Object.entries(scan?.languages || {}).sort((a, b) => b[1] - a[1])
  const architectureSignals = Object.entries(architecture?.details || {})
  const detectedLayers = architectureSignals.filter(([, detail]) => detail.detected)
  const aiReady = Boolean(aiStatus?.available && aiStatus.model_available)

  useEffect(() => {
    if (!chatLoading) {
      setChatSeconds(0)
      return
    }
    const started = Date.now()
    const timer = window.setInterval(
      () => setChatSeconds(Math.floor((Date.now() - started) / 1000)),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [chatLoading])

  const learningFiles = useMemo(() => {
    const priority = [
      files.find((file) => /^readme/i.test(file.name)),
      files.find((file) =>
        /^(package\.json|pyproject\.toml|requirements\.txt|pom\.xml)$/i.test(file.name),
      ),
      files.find((file) =>
        /(^|\/)(main|index|app)\.(py|tsx?|jsx?|java|go|rs)$/i.test(file.path.replace(/\\/g, '/')),
      ),
      [...files].sort((a, b) => b.size - a.size)[0],
    ].filter(Boolean)
    return priority.filter(
      (file, index) => priority.findIndex((item) => item?.path === file?.path) === index,
    )
  }, [files])

  const ask = async (nextQuestion: string) => {
    setQuestion(nextQuestion)
    setSources([])
    if (!project) {
      setAnswer(previewAnswers[nextQuestion] || 'Upload a repository to ask a custom question.')
      return
    }
    if (!aiReady) {
      setAnswer(
        aiStatus?.available
          ? `${aiStatus.provider} is running, but ${aiStatus.model} is not installed. Run "ollama pull ${aiStatus.model}" to enable answers.`
          : `The repository is analyzed, but ${aiStatus?.provider || 'Ollama'} is offline. Install it and pull ${aiStatus?.model || 'phi3:latest'} to enable local AI answers.`,
      )
      return
    }
    setChatLoading(true)
    try {
      const response = await askProject(project.metadata.project_id, nextQuestion)
      setAnswer(response.answer)
      setSources(response.sources || [])
      setAnswerMode(response.mode === 'scan' ? 'scan' : 'ai')
    } catch (reason) {
      setAnswer(reason instanceof Error ? reason.message : 'The local AI could not answer.')
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="feature-workspace reveal">
      <aside className="workspace-nav">
        <div className="workspace-project">
          <span>CA</span>
          <div>
            <small>ACTIVE PROJECT</small>
            <b>{projectName}</b>
          </div>
        </div>
        <nav>
          {views.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? 'active' : ''}
              onClick={() => setView(item.id)}
            >
              <i>{item.label.slice(0, 2)}</i>
              <span>
                <small>{item.eyebrow}</small>
                <b>{item.label}</b>
              </span>
              <em>{item.capability === 'preview' ? 'Preview' : '→'}</em>
            </button>
          ))}
        </nav>
        <div className="workspace-local">
          <i />
          <span>
            <b>{project ? 'Local analysis loaded' : 'Demo workspace'}</b>
            <small>
              {project
                ? `${scan?.total_files || 0} files · ${languages.length} languages`
                : 'Upload a repository for live data'}
            </small>
          </span>
        </div>
      </aside>

      <section className="workspace-canvas">
        {view === 'architecture' &&
          (project && architecture ? (
            <div className="architecture-view live-architecture">
              <header>
                <div>
                  <small>BACKEND ARCHITECTURE DETECTOR</small>
                  <h3>{projectName} architecture signals</h3>
                  <p>
                    Evidence comes from repository paths, manifests, imports, and known file
                    patterns.
                  </p>
                </div>
                <span>{detectedLayers.length} detected areas</span>
              </header>
              <div className="detection-grid">
                {architectureSignals.map(([name, detail]) => (
                  <article className={detail.detected ? 'detected' : ''} key={name}>
                    <div>
                      <small>{detail.detected ? 'DETECTED' : 'NOT DETECTED'}</small>
                      <b>{name.replace('_', ' ')}</b>
                    </div>
                    <span className={`confidence-${detail.confidence.toLowerCase()}`}>
                      {detail.confidence} confidence
                    </span>
                    <p>
                      {detail.matched_signals.slice(0, 3).join(' · ') ||
                        'No matching evidence found'}
                    </p>
                  </article>
                ))}
              </div>
              <div className="framework-strip">
                <small>DETECTED FRAMEWORKS</small>
                <div>
                  {architecture.frameworks.length ? (
                    architecture.frameworks.map((framework) => (
                      <span key={framework}>{framework}</span>
                    ))
                  ) : (
                    <p>No registered framework was detected.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <EmptyProject
              title="Upload a repository to detect its architecture"
              copy="The live detector checks manifests, imports, paths, and framework signals."
            />
          ))}

        {view === 'galaxy' && (
          <div className="workspace-full-view">
            <header>
              <div>
                <small>{project ? 'LIVE 3D REPOSITORY MAP' : 'INTERACTIVE CONCEPT'}</small>
                <h3>
                  {project ? 'Explore your codebase in 3D' : 'Explore the Galaxy interaction'}
                </h3>
                <p>
                  {project
                    ? 'Planets are generated from scanned folders and files. Current links show containment; code dependency links arrive with graph extraction.'
                    : 'This demo illustrates the planned dependency experience.'}
                </p>
              </div>
              <span>{project ? 'Interactive · Scan-derived' : 'Demo data'}</span>
            </header>
            <Suspense fallback={<div className="workspace-loading">Initializing 3D galaxy…</div>}>
              <ProjectGalaxy project={project || undefined} />
            </Suspense>
          </div>
        )}

        {view === 'simulator' && (
          <div className="workspace-full-view simulator-workspace">
            <header>
              <div>
                <small>WHAT-IF SIMULATOR</small>
                <h3>Impact analysis is not implemented in the backend yet</h3>
                <p>
                  The current backend graph endpoint returns no dependency edges, so live
                  blast-radius results would be misleading.
                </p>
              </div>
              <span>Concept preview</span>
            </header>
            <WhatIfSimulator />
          </div>
        )}

        {view === 'onboarding' &&
          (project ? (
            <div className="onboarding-view">
              <header>
                <div>
                  <small>SCAN-DERIVED READING GUIDE</small>
                  <h3>Start with the files the backend can verify</h3>
                  <p>
                    This guide uses filenames and sizes only; it does not pretend to be AI-generated
                    onboarding.
                  </p>
                </div>
                <span>
                  {completed.filter(Boolean).length}/{learningFiles.length} reviewed
                </span>
              </header>
              <div className="onboarding-grid">
                <div className="learning-path">
                  {learningFiles.map(
                    (file, index) =>
                      file && (
                        <button
                          className={completed[index] ? 'done' : ''}
                          onClick={() =>
                            setCompleted((items) =>
                              learningFiles.map((_, itemIndex) =>
                                itemIndex === index ? !items[itemIndex] : Boolean(items[itemIndex]),
                              ),
                            )
                          }
                          key={file.path}
                        >
                          <i>{completed[index] ? '✓' : index + 1}</i>
                          <span>
                            <b>{file.name}</b>
                            <p>{file.path}</p>
                            <em>{file.language}</em>
                          </span>
                          <small>{formatBytes(file.size)}</small>
                        </button>
                      ),
                  )}
                </div>
                <aside className="onboarding-summary">
                  <small>VERIFIED PROJECT BRIEF</small>
                  <h4>{projectName}</h4>
                  <p>
                    {scan?.total_files} files across {scan?.total_directories} directories.
                  </p>
                  <dl>
                    <dt>Primary language</dt>
                    <dd>{languages[0]?.[0] || 'Unknown'}</dd>
                    <dt>Frameworks</dt>
                    <dd>{architecture?.frameworks.join(', ') || 'None detected'}</dd>
                    <dt>Largest file</dt>
                    <dd>{metrics?.health.largest_file?.path || 'None'}</dd>
                    <dt>Symbols</dt>
                    <dd>Python extraction only</dd>
                  </dl>
                </aside>
              </div>
            </div>
          ) : (
            <EmptyProject
              title="No onboarding data yet"
              copy="Upload a repository to generate a verified reading guide from its scan."
            />
          ))}

        {view === 'health' &&
          (project && metrics ? (
            <div className="health-view live-health">
              <header>
                <div>
                  <small>BACKEND REPOSITORY METRICS</small>
                  <h3>Measured inventory, without invented scores</h3>
                  <p>
                    The backend currently measures file counts and sizes; it does not calculate
                    coverage, complexity, or maintainability.
                  </p>
                </div>
                <span className="metric-badge">
                  {metrics.summary.total_files}
                  <small> files</small>
                </span>
              </header>
              <div className="health-metrics">
                <article>
                  <small>Directories</small>
                  <b>{metrics.summary.total_directories}</b>
                  <span>
                    <i />
                    Scanned
                  </span>
                </article>
                <article>
                  <small>Total size</small>
                  <b>{formatBytes(metrics.summary.total_size)}</b>
                  <span>
                    <i />
                    Measured
                  </span>
                </article>
                <article>
                  <small>Average file</small>
                  <b>{formatBytes(metrics.health.average_file_size)}</b>
                  <span>
                    <i />
                    Measured
                  </span>
                </article>
                <article>
                  <small>Empty files</small>
                  <b>{metrics.health.empty_files.length}</b>
                  <span className={metrics.health.empty_files.length ? 'watch' : ''}>
                    <i />
                    {metrics.health.empty_files.length ? 'Review' : 'None'}
                  </span>
                </article>
              </div>
              <div className="repository-breakdown">
                <section>
                  <small>LANGUAGE DISTRIBUTION</small>
                  {languages.map(([language, count]) => (
                    <div key={language}>
                      <b>{language}</b>
                      <span>{count} files</span>
                      <i
                        style={{
                          width: `${Math.max(8, (count / (languages[0]?.[1] || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  ))}
                </section>
                <section>
                  <small>LARGEST SCANNED FILES</small>
                  {[...files]
                    .sort((a, b) => b.size - a.size)
                    .slice(0, 6)
                    .map((file) => (
                      <div key={file.path}>
                        <b>{file.path}</b>
                        <span>{formatBytes(file.size)}</span>
                      </div>
                    ))}
                </section>
              </div>
            </div>
          ) : (
            <EmptyProject
              title="No repository metrics yet"
              copy="Upload a repository to see measured file, directory, size, and language data."
            />
          ))}

        {view === 'chat' && (
          <div className="chat-view">
            <header>
              <div>
                <small>PROJECT-GROUNDED RAG</small>
                <h3>Ask the uploaded codebase</h3>
                <p>
                  Retrieval uses the backend knowledge index; generation requires the configured
                  local Ollama model.
                </p>
              </div>
              <span className={aiReady ? '' : 'offline'}>
                <i />
                {project
                  ? aiReady
                    ? `${aiStatus?.model || 'Local model'} ready`
                    : aiStatus?.available
                      ? `${aiStatus?.model || 'Configured model'} missing`
                      : 'Ollama offline'
                  : 'Demo mode'}
              </span>
            </header>
            <div className="chat-layout">
              <aside>
                <small>SUGGESTED QUESTIONS</small>
                {Object.keys(previewAnswers).map((item) => (
                  <button
                    className={question === item ? 'active' : ''}
                    onClick={() => ask(item)}
                    key={item}
                  >
                    {item}
                    <span>→</span>
                  </button>
                ))}
              </aside>
              <div className="conversation">
                <div className="chat-question">
                  <span>YOU</span>
                  <p>{question}</p>
                </div>
                <div className="chat-answer">
                  <span>CA</span>
                  <div>
                    <small>
                      CODEATLAS ·{' '}
                      {project
                        ? answerMode === 'scan'
                          ? 'VERIFIED SCAN ANSWER'
                          : 'LOCAL AI ANSWER'
                        : 'PREVIEW'}
                    </small>
                    <p>
                      {chatLoading
                        ? `Running local retrieval and Phi-3… ${chatSeconds}s elapsed. CPU inference can take 30–120 seconds.`
                        : answer}
                    </p>
                    {sources.length > 0 && (
                      <div className="chat-sources">
                        <b>Sources</b>
                        {sources
                          .filter((source) => source.file)
                          .map((source, index) => (
                            <span key={`${source.file}-${index}`}>
                              {source.file}
                              {source.line_start && source.line_end
                                ? `:${source.line_start}-${source.line_end}`
                                : ''}
                              {typeof source.score === 'number'
                                ? ` · ${source.score.toFixed(2)}`
                                : ''}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
                <form
                  className="chat-input"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const data = new FormData(event.currentTarget)
                    const next = String(data.get('question') || '').trim()
                    if (next) ask(next)
                  }}
                >
                  <input
                    name="question"
                    placeholder={
                      aiReady ? 'Ask about this repository…' : 'Ollama is required for live answers'
                    }
                    disabled={Boolean(project && !aiReady)}
                  />
                  <button type="submit" disabled={chatLoading || Boolean(project && !aiReady)}>
                    ↑
                  </button>
                </form>
                {project && !aiReady && (
                  <button
                    className="ai-recheck"
                    type="button"
                    onClick={async () => {
                      try {
                        setAiStatus(await getAiStatus())
                      } catch {
                        setAnswer('The local backend is not reachable.')
                      }
                    }}
                  >
                    Recheck local AI status
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
