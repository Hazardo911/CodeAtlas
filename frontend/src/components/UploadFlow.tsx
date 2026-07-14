import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { analyzeRepository, type ProjectAnalysis } from '../api/codeAtlas'
import './UploadFlow.css'

type UploadFlowProps = {
  open: boolean
  onClose: () => void
  onComplete: (analysis: ProjectAnalysis) => void
}
type ScanState = 'idle' | 'scanning' | 'ready' | 'error'

const languageMap: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  py: 'Python',
  dart: 'Dart',
  java: 'Java',
  kt: 'Kotlin',
  rs: 'Rust',
  go: 'Go',
  css: 'CSS',
  scss: 'SCSS',
  html: 'HTML',
  vue: 'Vue',
  svelte: 'Svelte',
  cpp: 'C++',
  c: 'C',
  cs: 'C#',
  php: 'PHP',
  rb: 'Ruby',
}
const ignored = /(^|\/)(node_modules|\.git|dist|build|\.dart_tool|coverage)(\/|$)/i

export default function UploadFlow({ open, onClose, onComplete }: UploadFlowProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<ScanState>('idle')
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [repoName, setRepoName] = useState('')
  const [progress, setProgress] = useState(0)
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setState('idle')
      setFiles([])
      setProgress(0)
      setRepoName('')
      setAnalysis(null)
      setError('')
    }
  }, [open])

  const languages = useMemo(() => {
    const counts = new Map<string, number>()
    files.forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      const language = languageMap[ext]
      if (language) counts.set(language, (counts.get(language) ?? 0) + 1)
    })
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [files])
  const folders = useMemo(
    () =>
      new Set(
        files.flatMap((file) => {
          const parts = file.webkitRelativePath.split('/').slice(1, -1)
          return parts.map((_, i) => parts.slice(0, i + 1).join('/'))
        }),
      ).size,
    [files],
  )
  const currentFile = files[Math.min(files.length - 1, Math.floor((progress / 100) * files.length))]

  const scan = async (incoming: File[]) => {
    const usable = incoming.filter((file) => !ignored.test(file.webkitRelativePath || file.name))
    if (!usable.length) return
    const first = usable[0].webkitRelativePath.split('/')[0]
    setRepoName(first || 'Local repository')
    setFiles(usable)
    setProgress(8)
    setState('scanning')
    setError('')
    try {
      setProgress(24)
      const result = await analyzeRepository(usable, first || 'Local repository')
      setProgress(100)
      setAnalysis(result)
      setState('ready')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not analyze this repository.')
      setState('error')
    }
  }
  const selectFolder = () => {
    inputRef.current?.setAttribute('webkitdirectory', '')
    inputRef.current?.click()
  }
  const drop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    scan([...event.dataTransfer.files])
  }
  if (!open) return null

  return (
    <div
      className="upload-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="upload-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-title"
      >
        <button className="upload-close" onClick={onClose} aria-label="Close repository upload">
          ×
        </button>
        <div className="upload-brand">
          <span>✳</span>CodeAtlas Local
        </div>
        {state === 'idle' && (
          <>
            <header>
              <small>NEW ANALYSIS</small>
              <h2 id="upload-title">Open a repository</h2>
              <p>
                Select a project folder. Your source files stay entirely inside this browser
                session.
              </p>
            </header>
            <div
              className={`drop-zone ${dragging ? 'dragging' : ''}`}
              onDragEnter={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={drop}
            >
              <div className="drop-icon">↥</div>
              <b>Drop your repository here</b>
              <span>or choose a local project folder</span>
              <button onClick={selectFolder}>Choose repository</button>
              <small>Folders such as node_modules, .git and dist are ignored</small>
            </div>
          </>
        )}
        {state === 'scanning' && (
          <div className="scan-state">
            <div className="scan-orbit">
              <span>⌘</span>
            </div>
            <small>ANALYZING LOCALLY</small>
            <h2 id="upload-title">Mapping {repoName}</h2>
            <p>
              {currentFile?.webkitRelativePath || currentFile?.name || 'Reading project structure…'}
            </p>
            <div className="scan-progress">
              <i style={{ width: `${progress}%` }} />
            </div>
            <div className="scan-numbers">
              <span>{files.length.toLocaleString()} files</span>
              <b>{progress}%</b>
            </div>
            <div className="scan-steps">
              <span className="done">✓ Structure</span>
              <span className={progress > 42 ? 'done' : ''}>✓ Languages</span>
              <span className={progress > 76 ? 'done' : ''}>✓ Dependencies</span>
            </div>
          </div>
        )}
        {state === 'ready' && (
          <div className="ready-state">
            <div className="ready-check">✓</div>
            <small>ANALYSIS COMPLETE</small>
            <h2 id="upload-title">{repoName} is ready</h2>
            <p>The local backend and AI knowledge pipeline have mapped this workspace.</p>
            <div className="repo-stats">
              <article>
                <b>{files.length.toLocaleString()}</b>
                <span>Source files</span>
              </article>
              <article>
                <b>{folders}</b>
                <span>Folders</span>
              </article>
              <article>
                <b>{languages.length}</b>
                <span>Languages</span>
              </article>
            </div>
            <div className="language-list">
              {languages.map(([name, count]) => (
                <span key={name}>
                  {name}
                  <b>{count}</b>
                </span>
              ))}
            </div>
            <div className="ready-actions">
              <button className="secondary" onClick={() => setState('idle')}>
                Choose another
              </button>
              <button
                className="continue"
                onClick={() => {
                  if (!analysis) return
                  onComplete(analysis)
                  onClose()
                }}
              >
                Open project map →
              </button>
            </div>
          </div>
        )}
        {state === 'error' && (
          <div className="ready-state">
            <div className="ready-check">!</div>
            <small>LOCAL ENGINE UNAVAILABLE</small>
            <h2 id="upload-title">Analysis could not finish</h2>
            <p>{error}</p>
            <div className="ready-actions">
              <button className="secondary" onClick={onClose}>
                Close
              </button>
              <button className="continue" onClick={() => setState('idle')}>
                Try again
              </button>
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(event) => scan([...(event.target.files ?? [])])}
        />
      </section>
    </div>
  )
}
