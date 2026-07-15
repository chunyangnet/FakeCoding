import { beforeEach, describe, expect, it } from 'vitest'
import { loadWorkspace, saveWorkspace } from './persistence'
import { defaultSettings } from '../store/useWorkspaceStore'

describe('IndexedDB persistence', () => {
  beforeEach(async () => {
    indexedDB.deleteDatabase('agent-nonsense-codex')
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  it('persists local task history and settings', async () => {
    await saveWorkspace({
      projects: [{ id: 'p', name: 'Project', path: 'D:\\Project', expanded: true, createdAt: 1 }],
      tasks: [{ id: 't', projectId: 'p', title: '持久化任务', cwd: 'D:\\Project', branch: 'main', mode: 'codex', status: 'completed', pinned: true, archived: false, createdAt: 1, updatedAt: 2, messages: [], activity: [], fileChanges: [], terminal: [] }],
      settings: { ...defaultSettings, model: 'gpt-6max', theme: 'light' },
      currentTaskId: 't',
      mode: 'codex',
      usageHistory: [{ id: 'u', taskId: 't', taskTitle: '持久化任务', model: 'gpt-6max', createdAt: 2, inputTokens: 100, outputTokens: 50, totalTokens: 150, quotaUnits: 0.15 }],
    })
    const saved = await loadWorkspace()
    expect(saved?.tasks[0].title).toBe('持久化任务')
    expect(saved?.settings.model).toBe('gpt-6max')
    expect(saved?.settings.theme).toBe('light')
    expect(saved?.usageHistory?.[0].totalTokens).toBe(150)
  })
})
