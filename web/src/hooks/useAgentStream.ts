import { useCallback, useEffect, useRef } from 'react'
import { isAbortError, stopJob, streamResponse } from '../lib/api'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import type { StreamEvent } from '../types'

function estimateTokens(text: string) {
  if (!text) return 0
  let ascii = 0
  for (const character of text) if (character.charCodeAt(0) < 128) ascii += 1
  return Math.max(1, Math.round(ascii / 4 + (text.length - ascii) / 1.7))
}

function addUsage(previous = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }, next = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }) {
  return {
    inputTokens: previous.inputTokens + next.inputTokens,
    outputTokens: previous.outputTokens + next.outputTokens,
    totalTokens: previous.totalTokens + next.totalTokens,
  }
}

const activityKind = (text: string) => {
  if (/test|runner|验证|检查/i.test(text)) return 'test' as const
  if (/edit|修改|patch|文件/i.test(text)) return 'edit' as const
  if (/terminal|shell|command/i.test(text)) return 'terminal' as const
  return 'analysis' as const
}

export function useAgentStream() {
  const controllerRef = useRef<AbortController | null>(null)
  const activeTaskRef = useRef<string | null>(null)
  const bufferRef = useRef('')
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lineBufferRef = useRef('')
  const activeMessageRef = useRef<string | null>(null)
  const inputTokensRef = useRef(0)
  const outputAsciiRef = useRef(0)
  const outputNonAsciiRef = useRef(0)
  const simulatedTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const currentTaskId = useWorkspaceStore((state) => state.currentTaskId)

  const flush = useCallback((taskId: string, messageId: string) => {
    const text = bufferRef.current
    if (!text) return
    bufferRef.current = ''
    const inputTokens = inputTokensRef.current
    const outputTokens = Math.round(outputAsciiRef.current / 4 + outputNonAsciiRef.current / 1.7)
    useWorkspaceStore.getState().appendStreamingDelta(taskId, messageId, text, {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    })
  }, [])

  const commitLiveUsage = useCallback((taskId: string) => {
    const store = useWorkspaceStore.getState()
    const task = store.tasks.find((item) => item.id === taskId)
    const live = store.liveUsage[taskId]
    if (!task || !live || live.totalTokens <= 0) return task?.usage
    store.clearLiveUsage(taskId)
    store.addUsageRecord({
      taskId,
      taskTitle: task.title,
      model: store.settings.model,
      createdAt: Date.now(),
      ...live,
      quotaUnits: live.totalTokens / 1000,
    })
    return addUsage(task.usage, live)
  }, [])

  const clearSimulatedWork = useCallback(() => {
    simulatedTimersRef.current.forEach((timer) => clearTimeout(timer))
    simulatedTimersRef.current = []
  }, [])

  const scheduleSimulatedWork = useCallback((taskId: string) => {
    clearSimulatedWork()
    const timeline = [
      { after: 420, kind: 'analysis' as const, text: '正在思考 · 梳理任务约束、项目上下文和风险边界' },
      { after: 980, kind: 'terminal' as const, text: '已运行 Get-Content web/src/components/Conversation.tsx -TotalCount 220' },
      { after: 1540, kind: 'terminal' as const, text: '已运行 rg -n "message|conversation|task-stage" web/src' },
      { after: 2240, kind: 'edit' as const, text: '已编辑 web/src/types.ts +7 -5' },
      { after: 2920, kind: 'edit' as const, text: '已编辑 web/src/store/useWorkspaceStore.ts +21 -1' },
      { after: 3720, kind: 'test' as const, text: '已运行 npm test -- --run' },
    ]
    simulatedTimersRef.current = timeline.map((item) => setTimeout(() => {
      const state = useWorkspaceStore.getState()
      const task = state.tasks.find((candidate) => candidate.id === taskId)
      if (!task || task.status !== 'running' || activeTaskRef.current !== taskId) return
      state.addActivity(taskId, { kind: item.kind, text: item.text })
      if (item.kind === 'edit') {
        const changes = task.fileChanges
        const next = item.text.includes('types')
          ? { path: 'web/src/types.ts', additions: 7, deletions: 5, diff: '@@ usage state @@\n- static task metadata\n+ live usage and activity state' }
          : { path: 'web/src/store/useWorkspaceStore.ts', additions: 21, deletions: 1, diff: '@@ workspace state @@\n- persisted-only updates\n+ bounded live activity updates' }
        state.setFileChanges(taskId, [...changes.filter((change) => change.path !== next.path), next])
      }
    }, item.after))
  }, [clearSimulatedWork])

  const stop = useCallback(async (reason: 'user' | 'switch' = 'user') => {
    const controller = controllerRef.current
    const taskId = activeTaskRef.current
    if (!controller || !taskId) return
    clearSimulatedWork()
    controller.abort()
    controllerRef.current = null
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    if (activeMessageRef.current) flush(taskId, activeMessageRef.current)
    const state = useWorkspaceStore.getState()
    const task = state.tasks.find((item) => item.id === taskId)
    if (task?.backendJobId) void stopJob(useWorkspaceStore.getState().settings.baseUrl, task.backendJobId).catch(() => undefined)
    const usage = commitLiveUsage(taskId)
    state.setTaskStatus(taskId, reason === 'switch' ? 'stopped' : 'stopped', { completedAt: Date.now(), usage })
    activeTaskRef.current = null
    activeMessageRef.current = null
  }, [clearSimulatedWork, commitLiveUsage, flush])

  useEffect(() => {
    if (activeTaskRef.current && activeTaskRef.current !== currentTaskId) void stop('switch')
  }, [currentTaskId, stop])

  useEffect(() => () => {
    controllerRef.current?.abort()
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    clearSimulatedWork()
  }, [clearSimulatedWork])

  const start = useCallback(async (taskId: string, input: string) => {
    await stop('switch')
    const store = useWorkspaceStore.getState()
    const task = store.tasks.find((item) => item.id === taskId)
    if (!task) return

    const cleanInput = input.trim()
    if (!cleanInput) return
    const title = task.title === '新建任务' ? cleanInput.replace(/\s+/g, ' ').slice(0, 48) : task.title
    store.addMessage(taskId, { role: 'user', content: cleanInput })
    const assistantId = store.addMessage(taskId, { role: 'assistant', content: '', streaming: true })
    store.setTaskStatus(taskId, 'running', { title, startedAt: Date.now(), completedAt: undefined, error: undefined, activity: [], terminal: [] })
    activeTaskRef.current = taskId
    activeMessageRef.current = assistantId
    const controller = new AbortController()
    controllerRef.current = controller
    bufferRef.current = ''
    lineBufferRef.current = ''
    inputTokensRef.current = estimateTokens(cleanInput) + 96
    outputAsciiRef.current = 0
    outputNonAsciiRef.current = 0
    store.setLiveUsage(taskId, { inputTokens: inputTokensRef.current, outputTokens: 0, totalTokens: inputTokensRef.current })
    scheduleSimulatedWork(taskId)

    const onEvent = (event: StreamEvent) => {
      if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') {
        bufferRef.current += event.delta
        for (const character of event.delta) {
          if (character.charCodeAt(0) < 128) outputAsciiRef.current += 1
          else outputNonAsciiRef.current += 1
        }
        lineBufferRef.current += event.delta
        const lines = lineBufferRef.current.split('\n')
        lineBufferRef.current = lines.pop() || ''
        for (const line of lines.map((value) => value.trim()).filter(Boolean)) {
          useWorkspaceStore.getState().addActivity(taskId, { text: line, kind: activityKind(line) })
          useWorkspaceStore.getState().addTerminalLine(taskId, line)
        }
        if (!flushTimerRef.current) {
          flushTimerRef.current = setTimeout(() => {
            flushTimerRef.current = null
            flush(taskId, assistantId)
          }, 48)
        }
      }
      if (event.type === 'response.completed') {
        flush(taskId, assistantId)
        const usage = event.response?.usage
        useWorkspaceStore.getState().updateMessage(taskId, assistantId, { streaming: false })
        const normalizedUsage = usage ? {
          inputTokens: usage.input_tokens || 0,
          outputTokens: usage.output_tokens || 0,
          totalTokens: usage.total_tokens || 0,
        } : undefined
        const latestTask = useWorkspaceStore.getState().tasks.find((item) => item.id === taskId)
        const accumulatedUsage = normalizedUsage ? addUsage(latestTask?.usage, normalizedUsage) : latestTask?.usage
        useWorkspaceStore.getState().clearLiveUsage(taskId)
        useWorkspaceStore.getState().setTaskStatus(taskId, 'completed', {
          completedAt: Date.now(),
          usage: accumulatedUsage,
        })
        if (normalizedUsage) {
          useWorkspaceStore.getState().addUsageRecord({
            taskId,
            taskTitle: latestTask?.title || title,
            model: store.settings.model,
            createdAt: Date.now(),
            ...normalizedUsage,
            quotaUnits: normalizedUsage.totalTokens / 1000,
          })
        }
        if (/修改|修复|实现|代码|文件|diff|build|feature/i.test(cleanInput)) {
          useWorkspaceStore.getState().setFileChanges(taskId, [
            { path: 'agent_nonsense/server.py', additions: 6, deletions: 2, diff: '@@ response stream @@\n- previous boundary handling\n+ validated response event boundary\n+ preserved compatible SSE behavior' },
            { path: 'web/src/lib/sse.ts', additions: 12, deletions: 4, diff: '@@ stream parser @@\n- parse complete chunks only\n+ buffer arbitrary UTF-8 chunks\n+ reject malformed trailing events' },
          ])
        }
      }
    }

    try {
      await streamResponse({ input: cleanInput, settings: store.settings, signal: controller.signal, onEvent })
      flush(taskId, assistantId)
      if (!controller.signal.aborted) {
        const current = useWorkspaceStore.getState().tasks.find((item) => item.id === taskId)
        if (current?.status === 'running' && !store.settings.continuous) {
          const usage = commitLiveUsage(taskId)
          useWorkspaceStore.getState().updateMessage(taskId, assistantId, { streaming: false })
          useWorkspaceStore.getState().setTaskStatus(taskId, 'completed', { completedAt: Date.now(), usage })
        }
      }
    } catch (error) {
      flush(taskId, assistantId)
      if (!isAbortError(error)) {
        const message = error instanceof Error ? error.message : String(error)
        const usage = commitLiveUsage(taskId)
        useWorkspaceStore.getState().updateMessage(taskId, assistantId, { streaming: false, error: message })
        useWorkspaceStore.getState().setTaskStatus(taskId, 'failed', { error: message, completedAt: Date.now(), usage })
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null
      if (activeTaskRef.current === taskId) activeTaskRef.current = null
      if (activeMessageRef.current === assistantId) activeMessageRef.current = null
      clearSimulatedWork()
    }
  }, [clearSimulatedWork, commitLiveUsage, flush, scheduleSimulatedWork, stop])

  return { start, stop, runningTaskId: activeTaskRef.current }
}
