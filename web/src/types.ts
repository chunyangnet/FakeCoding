export type AppMode = 'codex' | 'chatgpt'
export type TaskStatus = 'idle' | 'queued' | 'running' | 'completed' | 'stopped' | 'failed' | 'disconnected'
export type ThemeMode = 'system' | 'dark' | 'light'
export type ReasoningLevel = 'low' | 'medium' | 'high' | 'extra-high' | 'ultra'
export type ApprovalMode = 'suggest' | 'auto' | 'full'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  streaming?: boolean
  error?: string
}

export interface ActivityEvent {
  id: string
  text: string
  createdAt: number
  kind: 'analysis' | 'edit' | 'test' | 'terminal' | 'info'
}

export interface FileChange {
  path: string
  additions: number
  deletions: number
  diff: string
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export interface TaskRecord {
  id: string
  projectId: string
  title: string
  cwd: string
  branch: string
  mode: AppMode
  status: TaskStatus
  pinned: boolean
  archived: boolean
  createdAt: number
  updatedAt: number
  startedAt?: number
  completedAt?: number
  backendJobId?: string
  messages: Message[]
  activity: ActivityEvent[]
  fileChanges: FileChange[]
  terminal: string[]
  usage?: TokenUsage
  error?: string
}

export interface ProjectRecord {
  id: string
  name: string
  path: string
  expanded: boolean
  createdAt: number
}

export interface Settings {
  baseUrl: string
  model: string
  preset: string | null
  characterDelay: number
  speedFactor: number
  continuous: boolean
  theme: ThemeMode
  autoScroll: boolean
  renderMarkdown: boolean
  gfm: boolean
  reasoning: ReasoningLevel
  approval: ApprovalMode
  environment: string
  quotaTokenLimit: number
}

export interface UsageRecord {
  id: string
  taskId: string
  taskTitle: string
  model: string
  createdAt: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  quotaUnits: number
}

export interface PersistedWorkspace {
  projects: ProjectRecord[]
  tasks: TaskRecord[]
  settings: Settings
  currentTaskId: string | null
  mode: AppMode
  usageHistory?: UsageRecord[]
}

export interface BackendStatus {
  state: 'checking' | 'connected' | 'disconnected'
  version?: string
  activeJobs?: number
  lastChecked?: number
  error?: string
}

export interface StreamEvent {
  type?: string
  delta?: string
  response?: {
    status?: string
    usage?: {
      input_tokens?: number
      output_tokens?: number
      total_tokens?: number
    }
  }
  [key: string]: unknown
}
