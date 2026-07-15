import { beforeEach, describe, expect, it } from 'vitest'
import { defaultSettings, useWorkspaceStore } from './useWorkspaceStore'

describe('workspace store', () => {
  beforeEach(() => useWorkspaceStore.setState({
    hydrated: true,
    tasks: [],
    currentTaskId: null,
    settings: defaultSettings,
    mode: 'codex',
    usageHistory: [],
    liveUsage: {},
  }))

  it('creates and selects a new task', () => {
    const id = useWorkspaceStore.getState().newTask()
    const state = useWorkspaceStore.getState()
    expect(state.currentTaskId).toBe(id)
    expect(state.tasks[0]).toMatchObject({ id, title: '新建任务', status: 'idle' })
  })

  it('switches tasks without losing messages', () => {
    const first = useWorkspaceStore.getState().newTask()
    useWorkspaceStore.getState().addMessage(first, { role: 'user', content: '第一条' })
    const second = useWorkspaceStore.getState().newTask()
    useWorkspaceStore.getState().selectTask(first)
    expect(useWorkspaceStore.getState().currentTaskId).toBe(first)
    expect(useWorkspaceStore.getState().tasks.find((task) => task.id === first)?.messages[0].content).toBe('第一条')
    expect(second).not.toBe(first)
  })

  it('tracks and clears local quota usage without server writes', () => {
    useWorkspaceStore.getState().addUsageRecord({ taskId: 't', taskTitle: '用量任务', model: 'gpt-5.6sol', createdAt: 1, inputTokens: 600, outputTokens: 400, totalTokens: 1000, quotaUnits: 1 })
    expect(useWorkspaceStore.getState().usageHistory).toHaveLength(1)
    expect(useWorkspaceStore.getState().usageHistory[0].quotaUnits).toBe(1)
    useWorkspaceStore.getState().clearUsageHistory()
    expect(useWorkspaceStore.getState().usageHistory).toEqual([])
  })

  it('updates live quota independently from persisted history', () => {
    useWorkspaceStore.getState().setLiveUsage('running-task', { inputTokens: 120, outputTokens: 30, totalTokens: 150 })
    expect(useWorkspaceStore.getState().liveUsage['running-task'].totalTokens).toBe(150)
    expect(useWorkspaceStore.getState().usageHistory).toEqual([])
    useWorkspaceStore.getState().clearLiveUsage('running-task')
    expect(useWorkspaceStore.getState().liveUsage).toEqual({})
  })
})
