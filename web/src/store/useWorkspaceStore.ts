import { create } from 'zustand'
import { loadWorkspace, saveWorkspace } from '../lib/persistence'
import type {
  ActivityEvent,
  AppMode,
  BackendStatus,
  FileChange,
  Message,
  PersistedWorkspace,
  ProjectRecord,
  Settings,
  TaskRecord,
  TaskStatus,
  TokenUsage,
  UsageRecord,
} from '../types'

const now = () => Date.now()
const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`

export const defaultSettings: Settings = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || '',
  model: 'gpt-5.6sol',
  preset: null,
  characterDelay: 0.04,
  speedFactor: 1,
  continuous: false,
  theme: 'system',
  autoScroll: true,
  renderMarkdown: true,
  gfm: true,
  reasoning: 'high',
  approval: 'suggest',
  environment: '本地模式',
  quotaTokenLimit: 1_000_000,
}

const defaultProject: ProjectRecord = {
  id: 'project_default',
  name: 'Project',
  path: import.meta.env.VITE_DEFAULT_WORKSPACE || 'D:\\VS Code\\Project\\FakeToken',
  expanded: true,
  createdAt: now(),
}

interface WorkspaceState {
  hydrated: boolean
  projects: ProjectRecord[]
  tasks: TaskRecord[]
  settings: Settings
  currentTaskId: string | null
  mode: AppMode
  backend: BackendStatus
  models: string[]
  modules: Array<{ name: string; description: string }>
  usageHistory: UsageRecord[]
  liveUsage: Record<string, TokenUsage>
  searchOpen: boolean
  settingsOpen: boolean
  reviewOpen: boolean
  sidebarOpen: boolean
  composerFocusToken: number
  hydrate: () => Promise<void>
  persist: () => Promise<void>
  setMode: (mode: AppMode) => void
  setBackend: (backend: BackendStatus) => void
  setModels: (models: string[]) => void
  setModules: (modules: Array<{ name: string; description: string }>) => void
  updateSettings: (patch: Partial<Settings>) => void
  newTask: (projectId?: string, mode?: AppMode) => string
  selectTask: (id: string | null) => void
  deleteTask: (id: string) => void
  archiveTask: (id: string) => void
  renameTask: (id: string, title: string) => void
  togglePin: (id: string) => void
  toggleProject: (id: string) => void
  addMessage: (taskId: string, message: Omit<Message, 'id' | 'createdAt'> & Partial<Pick<Message, 'id' | 'createdAt'>>) => string
  appendMessage: (taskId: string, messageId: string, delta: string) => void
  appendStreamingDelta: (taskId: string, messageId: string, delta: string, usage: TokenUsage) => void
  updateMessage: (taskId: string, messageId: string, patch: Partial<Message>) => void
  setTaskStatus: (taskId: string, status: TaskStatus, patch?: Partial<TaskRecord>) => void
  addActivity: (taskId: string, event: Omit<ActivityEvent, 'id' | 'createdAt'> & Partial<Pick<ActivityEvent, 'id' | 'createdAt'>>) => void
  setFileChanges: (taskId: string, changes: FileChange[]) => void
  addTerminalLine: (taskId: string, line: string) => void
  addUsageRecord: (record: Omit<UsageRecord, 'id'> & Partial<Pick<UsageRecord, 'id'>>) => void
  setLiveUsage: (taskId: string, usage: TokenUsage) => void
  clearLiveUsage: (taskId?: string) => void
  clearUsageHistory: () => void
  setSearchOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setReviewOpen: (open: boolean) => void
  setSidebarOpen: (open: boolean) => void
  requestComposerFocus: () => void
}

function serializable(state: WorkspaceState): PersistedWorkspace {
  return {
    projects: state.projects,
    tasks: state.tasks.map((task) => ({ ...task, messages: task.messages.map((message) => ({ ...message, streaming: false })) })),
    settings: state.settings,
    currentTaskId: state.currentTaskId,
    mode: state.mode,
    usageHistory: state.usageHistory,
  }
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  hydrated: false,
  projects: [defaultProject],
  tasks: [],
  settings: defaultSettings,
  currentTaskId: null,
  mode: 'codex',
  backend: { state: 'checking' },
  models: ['agent-nonsense'],
  modules: [],
  usageHistory: [],
  liveUsage: {},
  searchOpen: false,
  settingsOpen: false,
  reviewOpen: false,
  sidebarOpen: true,
  composerFocusToken: 0,

  hydrate: async () => {
    const saved = await loadWorkspace().catch(() => undefined)
    if (saved) {
      set({
        projects: saved.projects?.length ? saved.projects : [defaultProject],
        tasks: saved.tasks || [],
        settings: { ...defaultSettings, ...saved.settings },
        currentTaskId: saved.currentTaskId || null,
        mode: saved.mode || 'codex',
        usageHistory: saved.usageHistory || [],
        hydrated: true,
      })
    } else {
      set({ hydrated: true })
    }
  },
  persist: async () => saveWorkspace(serializable(get())),
  setMode: (mode) => set({ mode }),
  setBackend: (backend) => set({ backend }),
  setModels: (models) => set({ models: models.length ? models : ['agent-nonsense'] }),
  setModules: (modules) => set({ modules }),
  updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
  newTask: (projectId = get().projects[0]?.id || defaultProject.id, mode = get().mode) => {
    const project = get().projects.find((item) => item.id === projectId) || defaultProject
    const id = uid('task')
    const task: TaskRecord = {
      id,
      projectId: project.id,
      title: '新建任务',
      cwd: project.path,
      branch: 'main',
      mode,
      status: 'idle',
      pinned: false,
      archived: false,
      createdAt: now(),
      updatedAt: now(),
      messages: [],
      activity: [],
      fileChanges: [],
      terminal: [],
    }
    set((state) => ({ tasks: [task, ...state.tasks], currentTaskId: id, mode, settingsOpen: false }))
    return id
  },
  selectTask: (id) => {
    const task = get().tasks.find((item) => item.id === id)
    set({ currentTaskId: id, ...(task ? { mode: task.mode } : {}) })
  },
  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter((task) => task.id !== id),
    currentTaskId: state.currentTaskId === id ? null : state.currentTaskId,
    liveUsage: Object.fromEntries(Object.entries(state.liveUsage).filter(([taskId]) => taskId !== id)),
  })),
  archiveTask: (id) => set((state) => ({
    tasks: state.tasks.map((task) => task.id === id ? { ...task, archived: true, updatedAt: now() } : task),
    currentTaskId: state.currentTaskId === id ? null : state.currentTaskId,
  })),
  renameTask: (id, title) => set((state) => ({
    tasks: state.tasks.map((task) => task.id === id ? { ...task, title: title.trim() || '未命名任务', updatedAt: now() } : task),
  })),
  togglePin: (id) => set((state) => ({
    tasks: state.tasks.map((task) => task.id === id ? { ...task, pinned: !task.pinned, updatedAt: now() } : task),
  })),
  toggleProject: (id) => set((state) => ({
    projects: state.projects.map((project) => project.id === id ? { ...project, expanded: !project.expanded } : project),
  })),
  addMessage: (taskId, message) => {
    const id = message.id || uid('message')
    set((state) => ({
      tasks: state.tasks.map((task) => task.id === taskId ? {
        ...task,
        updatedAt: now(),
        messages: [...task.messages, { ...message, id, createdAt: message.createdAt || now() } as Message],
      } : task),
    }))
    return id
  },
  appendMessage: (taskId, messageId, delta) => set((state) => ({
    tasks: state.tasks.map((task) => task.id === taskId ? {
      ...task,
      updatedAt: now(),
      messages: task.messages.map((message) => message.id === messageId ? { ...message, content: message.content + delta } : message),
    } : task),
  })),
  appendStreamingDelta: (taskId, messageId, delta, usage) => set((state) => ({
    tasks: state.tasks.map((task) => task.id === taskId ? {
      ...task,
      updatedAt: now(),
      messages: task.messages.map((message) => message.id === messageId ? { ...message, content: message.content + delta } : message),
    } : task),
    liveUsage: { ...state.liveUsage, [taskId]: usage },
  })),
  updateMessage: (taskId, messageId, patch) => set((state) => ({
    tasks: state.tasks.map((task) => task.id === taskId ? {
      ...task,
      messages: task.messages.map((message) => message.id === messageId ? { ...message, ...patch } : message),
    } : task),
  })),
  setTaskStatus: (taskId, status, patch = {}) => set((state) => ({
    tasks: state.tasks.map((task) => task.id === taskId ? { ...task, ...patch, status, updatedAt: now() } : task),
  })),
  addActivity: (taskId, event) => set((state) => ({
    tasks: state.tasks.map((task) => task.id === taskId ? {
      ...task,
      activity: [...task.activity, { ...event, id: event.id || uid('activity'), createdAt: event.createdAt || now() } as ActivityEvent].slice(-300),
    } : task),
  })),
  setFileChanges: (taskId, changes) => set((state) => ({ tasks: state.tasks.map((task) => task.id === taskId ? { ...task, fileChanges: changes } : task) })),
  addTerminalLine: (taskId, line) => set((state) => ({
    tasks: state.tasks.map((task) => task.id === taskId ? { ...task, terminal: [...task.terminal, line].slice(-500) } : task),
  })),
  addUsageRecord: (record) => set((state) => ({
    usageHistory: [{ ...record, id: record.id || uid('usage') } as UsageRecord, ...state.usageHistory].slice(0, 1000),
  })),
  setLiveUsage: (taskId, usage) => set((state) => ({ liveUsage: { ...state.liveUsage, [taskId]: usage } })),
  clearLiveUsage: (taskId) => set((state) => {
    if (!taskId) return { liveUsage: {} }
    const next = { ...state.liveUsage }
    delete next[taskId]
    return { liveUsage: next }
  }),
  clearUsageHistory: () => set({ usageHistory: [], liveUsage: {} }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setReviewOpen: (reviewOpen) => set({ reviewOpen }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  requestComposerFocus: () => set((state) => ({ composerFocusToken: state.composerFocusToken + 1 })),
}))

let persistTimer: ReturnType<typeof setTimeout> | undefined
useWorkspaceStore.subscribe((state, previous) => {
  if (!state.hydrated || state === previous) return
  const persistentStateChanged = state.projects !== previous.projects
    || state.tasks !== previous.tasks
    || state.settings !== previous.settings
    || state.currentTaskId !== previous.currentTaskId
    || state.mode !== previous.mode
    || state.usageHistory !== previous.usageHistory
  if (!persistentStateChanged) return
  clearTimeout(persistTimer)
  persistTimer = setTimeout(() => void state.persist(), 120)
})
