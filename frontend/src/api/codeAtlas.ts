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
  health: { summary?: Record<string, number> }
}

export type ArchitectureResult = {
  frameworks?: string[]
  architecture_type?: string
  [key: string]: unknown
}

export type ProjectAnalysis = {
  metadata: ProjectMetadata
  scan: ScanResult
  architecture: ArchitectureResult
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init)
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.detail || `Local API request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

export async function analyzeRepository(
  files: File[],
  projectName: string,
): Promise<ProjectAnalysis> {
  const form = new FormData()
  form.append('project_name', projectName)
  files.forEach((file) => {
    form.append('files', file, file.name)
    form.append('relative_paths', file.webkitRelativePath || file.name)
  })

  const metadata = await request<ProjectMetadata>('/projects/upload-files', {
    method: 'POST',
    body: form,
  })
  const scan = await request<ScanResult>(`/projects/${metadata.project_id}/scan`, {
    method: 'POST',
  })
  const architecture = await request<ArchitectureResult>(
    `/projects/${metadata.project_id}/architecture`,
    { method: 'POST' },
  )
  return { metadata, scan, architecture }
}

export async function askProject(projectId: string, query: string): Promise<string> {
  const result = await request<{ answer: string }>(`/projects/${projectId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  return result.answer
}
