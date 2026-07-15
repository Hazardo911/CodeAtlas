import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  analyzeGithubRepository,
  analyzeRepository,
  type AnalysisStage,
  type ProjectAnalysis,
} from '../api/codeAtlas'
import './UploadFlow.css'

type UploadFlowProps = {
  open: boolean
  onClose: () => void
  onComplete: (analysis: ProjectAnalysis) => void
}
type ScanState = 'idle' | 'scanning' | 'ready' | 'error'
type ImportMode = 'github' | 'local'

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
  const [importMode, setImportMode] = useState<ImportMode>('github')
  const [githubUrl, setGithubUrl] = useState('')
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [repoName, setRepoName] = useState('')
  const [progress, setProgress] = useState(0)
  const [scanStage, setScanStage] = useState<AnalysisStage>('uploading')
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setState('idle')
      setFiles([])
      setProgress(0)
      setScanStage('uploading')
      setRepoName('')
      setGithubUrl('')
      setImportMode('github')
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
  const displayedLanguages = analysis
    ? Object.entries(analysis.scan.scan.languages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : languages
  const currentFile = files[Math.min(files.length - 1, Math.floor((progress / 100) * files.length))]

  const updateStage = (stage: AnalysisStage, nextProgress: number) => {
    setScanStage(stage)
    setProgress(nextProgress)
  }

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
      const result = await analyzeRepository(usable, first || 'Local repository', updateStage)
      setProgress(100)
      setAnalysis(result)
      setState('ready')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not analyze this repository.')
      setState('error')
    }
  }
  const importGithub = async () => {
    const url = githubUrl.trim()
    if (!/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+(?:\.git)?\/?$/i.test(url)) {
      setError('Enter a public GitHub repository URL, for example https://github.com/owner/repo')
      return
    }
    const name =
      url
        .replace(/\/$/, '')
        .replace(/\.git$/i, '')
        .split('/')
        .pop() || 'GitHub repository'
    setRepoName(name)
    setFiles([])
    setProgress(8)
    setScanStage('uploading')
    setState('scanning')
    setError('')
    try {
      const result = await analyzeGithubRepository(url, updateStage)
      setProgress(100)
      setAnalysis(result)
      setState('ready')
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Could not import this GitHub repository.',
      )
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
              <h2 id="upload-title">Import a repository</h2>
              <p>Import a public GitHub repository, or choose a folder already on this machine.</p>
            </header>
            <div className="import-tabs" role="tablist" aria-label="Repository source">
              <button
                className={importMode === 'github' ? 'active' : ''}
                onClick={() => setImportMode('github')}
              >
                GitHub repository
              </button>
              <button
                className={importMode === 'local' ? 'active' : ''}
                onClick={() => setImportMode('local')}
              >
                Local folder
              </button>
            </div>
            {importMode === 'github' ? (
              <div className="github-import">
                <div className="drop-icon">GH</div>
                <b>Import from GitHub</b>
                <span>Paste the URL of a public repository</span>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(event) => {
                    setGithubUrl(event.target.value)
                    setError('')
                  }}
                  onKeyDown={(event) => event.key === 'Enter' && importGithub()}
                  placeholder="https://github.com/owner/repository"
                  autoFocus
                />
                {error && <small className="import-error">{error}</small>}
                <button onClick={importGithub}>Import repository</button>
                <a href="https://github.com/?tab=repositories" target="_blank" rel="noreferrer">
                  Open your GitHub repositories ↗
                </a>
                <small>Cloned and analyzed only by your local CodeAtlas backend</small>
              </div>
            ) : (
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
                <button onClick={selectFolder}>Choose local folder</button>
                <small>Folders such as node_modules, .git and dist are ignored</small>
              </div>
            )}
          </>
        )}
        {state === 'scanning' && (
          <div className="scan-state">
            <div className="scan-orbit">
              <span>⌘</span>
            </div>
            <small>
              {scanStage === 'uploading'
                ? importMode === 'github'
                  ? 'CLONING FROM GITHUB'
                  : 'COPYING TO LOCAL WORKSPACE'
                : scanStage === 'scanning'
                  ? 'SCANNING FILES AND SYMBOLS'
                  : 'DETECTING ARCHITECTURE'}
            </small>
            <h2 id="upload-title">Mapping {repoName}</h2>
            <p>
              {currentFile?.webkitRelativePath ||
                currentFile?.name ||
                (importMode === 'github'
                  ? 'Fetching repository into the local workspace…'
                  : 'Reading project structure…')}
            </p>
            <div className="scan-progress">
              <i style={{ width: `${progress}%` }} />
            </div>
            <div className="scan-numbers">
              <span>
                {importMode === 'github'
                  ? 'GitHub import'
                  : `${files.length.toLocaleString()} files`}
              </span>
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
            <p>The local scanner and architecture detector have mapped this workspace.</p>
            <div className="repo-stats">
              <article>
                <b>{(analysis?.scan.scan.total_files ?? files.length).toLocaleString()}</b>
                <span>Source files</span>
              </article>
              <article>
                <b>{analysis?.scan.scan.total_directories ?? folders}</b>
                <span>Folders</span>
              </article>
              <article>
                <b>{Object.keys(analysis?.scan.scan.languages ?? {}).length || languages.length}</b>
                <span>Languages</span>
              </article>
            </div>
            <div className="language-list">
              {displayedLanguages.map(([name, count]) => (
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
