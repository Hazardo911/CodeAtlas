const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

export type ProjectMetadata = {
  project_id: string
  project_name: string
  status: string
  source: string
}

export type ScanResult = {
  project_id: string
  scan: {
    total_files: number
    total_directories: number
    languages: Record<string, number>
    files: Array<{ path: string; name: string; language: string; size: number }>
  }
  health: {
    summary: {
      total_files: number
      total_directories: number
      total_size: number
    }
    health: {
      largest_file: null | { path: string; name: string; language: string; size: number }
      empty_files: string[]
      average_file_size: number
    }
    languages: Record<string, number>
  }
}

export type ArchitectureDetail = {
  detected: boolean
  confidence: 'High' | 'Medium' | 'Low' | 'None'
  score: number
  matched_signals: string[]
}

export type ArchitectureResult = {
  backend: boolean
  frontend: boolean
  mobile: boolean
  database: boolean
  api: boolean
  ai: boolean
  testing: boolean
  docker: boolean
  github_actions: boolean
  frameworks: string[]
  details: Record<string, ArchitectureDetail>
}

export type AiStatus = {
  available: boolean
  model_available: boolean
  models: string[]
  model: string
  provider: string
}

export type ProjectAnalysis = {
  metadata: ProjectMetadata
  scan: ScanResult
  architecture: ArchitectureResult
  aiStatus: AiStatus
}

export type AnalysisStage = 'uploading' | 'scanning' | 'architecture' | 'ready'

export type ChatSource = {
  file: string | null
  score: number | null
  line_start: number | null
  line_end: number | null
}
export type ChatResponse = { answer: string; sources: ChatSource[] }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init)
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.detail || `Local API request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

async function finishAnalysis(
  metadata: ProjectMetadata,
  onStage?: (stage: AnalysisStage, progress: number) => void,
): Promise<ProjectAnalysis> {
  onStage?.('scanning', 48)
  const scan = await request<ScanResult>(`/projects/${metadata.project_id}/scan`, {
    method: 'POST',
  })
  onStage?.('architecture', 78)
  const architecture = await request<ArchitectureResult>(
    `/projects/${metadata.project_id}/architecture`,
    { method: 'POST' },
  )
  const aiStatus = await getAiStatus().catch(() => ({
    available: false,
    model_available: false,
    models: [],
    model: 'phi3:latest',
    provider: 'Ollama',
  }))
  onStage?.('ready', 100)
  return { metadata, scan, architecture, aiStatus }
}

export async function analyzeRepository(
  files: File[],
  projectName: string,
  onStage?: (stage: AnalysisStage, progress: number) => void,
): Promise<ProjectAnalysis> {
  const form = new FormData()
  form.append('project_name', projectName)
  files.forEach((file) => {
    form.append('files', file, file.name)
    form.append('relative_paths', file.webkitRelativePath || file.name)
  })

  onStage?.('uploading', 12)
  const metadata = await request<ProjectMetadata>('/projects/upload-files', {
    method: 'POST',
    body: form,
  })
  return finishAnalysis(metadata, onStage)
}

export async function analyzeGithubRepository(
  repoUrl: string,
  onStage?: (stage: AnalysisStage, progress: number) => void,
): Promise<ProjectAnalysis> {
  onStage?.('uploading', 12)
  const metadata = await request<ProjectMetadata>('/projects/upload-github', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_url: repoUrl.trim() }),
  })
  return finishAnalysis(metadata, onStage)
}

export function getAiStatus(): Promise<AiStatus> {
  return request<AiStatus>('/ai/status')
}

export async function askProject(projectId: string, query: string): Promise<ChatResponse> {
  return request<ChatResponse>(`/projects/${projectId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
}
