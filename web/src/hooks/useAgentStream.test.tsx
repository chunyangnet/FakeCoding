import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAgentStream } from './useAgentStream'
import { defaultSettings, useWorkspaceStore } from '../store/useWorkspaceStore'

const streamMock = vi.fn()
vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api')
  return { ...actual, streamResponse: (...args: unknown[]) => streamMock(...args), stopJob: vi.fn(), isAbortError: actual.isAbortError }
})

describe('useAgentStream', () => {
  beforeEach(() => {
    streamMock.mockReset()
    useWorkspaceStore.setState({ hydrated: true, tasks: [], currentTaskId: null, settings: defaultSettings, mode: 'codex', usageHistory: [], liveUsage: {} })
  })

  it('aborts the old stream when switching tasks', async () => {
    let capturedSignal: AbortSignal | undefined
    streamMock.mockImplementation(({ signal }: { signal: AbortSignal }) => new Promise((_, reject) => {
      capturedSignal = signal
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const first = useWorkspaceStore.getState().newTask()
    const second = useWorkspaceStore.getState().newTask()
    useWorkspaceStore.getState().selectTask(first)
    const { result } = renderHook(() => useAgentStream())
    act(() => { void result.current.start(first, '开始流式任务') })
    await waitFor(() => expect(capturedSignal).toBeDefined())
    act(() => useWorkspaceStore.getState().selectTask(second))
    await waitFor(() => expect(capturedSignal?.aborted).toBe(true))
    expect(useWorkspaceStore.getState().tasks.find((item) => item.id === first)?.status).toBe('stopped')
  })

  it('publishes estimated token usage while output is streaming', async () => {
    streamMock.mockImplementation(({ signal, onEvent }: { signal: AbortSignal; onEvent: (event: unknown) => void }) => new Promise((_, reject) => {
      onEvent({ type: 'response.output_text.delta', delta: '正在持续分析一个大型项目的状态边界。' })
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const taskId = useWorkspaceStore.getState().newTask()
    const { result } = renderHook(() => useAgentStream())
    act(() => { void result.current.start(taskId, '检查实时额度') })
    await waitFor(() => expect(useWorkspaceStore.getState().liveUsage[taskId]?.outputTokens).toBeGreaterThan(0))
    act(() => { void result.current.stop() })
    await waitFor(() => expect(useWorkspaceStore.getState().liveUsage[taskId]).toBeUndefined())
    expect(useWorkspaceStore.getState().usageHistory).toHaveLength(1)
  })
})
