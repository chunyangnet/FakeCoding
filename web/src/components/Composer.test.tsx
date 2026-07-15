import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Composer } from './Composer'
import { defaultSettings, useWorkspaceStore } from '../store/useWorkspaceStore'
import type { TaskRecord } from '../types'

const task: TaskRecord = { id: 't', projectId: 'project_default', title: '新建任务', cwd: 'D:\\Project', branch: 'main', mode: 'codex', status: 'idle', pinned: false, archived: false, createdAt: 1, updatedAt: 1, messages: [], activity: [], fileChanges: [], terminal: [] }

describe('Composer', () => {
  beforeEach(() => useWorkspaceStore.setState({ hydrated: true, tasks: [task], currentTaskId: task.id, settings: defaultSettings, mode: 'codex', models: ['agent-nonsense'] }))

  it('sends with Enter and preserves Shift+Enter', async () => {
    const send = vi.fn()
    render(<Composer task={task} onSend={send} onStop={() => undefined}/>)
    const input = screen.getByLabelText('任务输入')
    await userEvent.type(input, '第一行{shift>}{enter}{/shift}第二行')
    expect(input).toHaveValue('第一行\n第二行')
    await userEvent.type(input, '{enter}')
    expect(send).toHaveBeenCalledWith('第一行\n第二行')
  })

  it('shows a working stop control while running', async () => {
    const stop = vi.fn()
    render(<Composer task={{ ...task, status: 'running' }} onSend={() => undefined} onStop={stop}/>)
    await userEvent.click(screen.getByRole('button', { name: '停止任务' }))
    expect(stop).toHaveBeenCalledOnce()
  })

  it('supports keyboard movement to the ultra reasoning level', async () => {
    render(<Composer task={task} onSend={() => undefined} onStop={() => undefined}/>)
    await userEvent.click(screen.getByRole('button', { name: /5.6 Sol/ }))
    const slider = screen.getByRole('slider', { name: '推理强度' })
    slider.focus()
    await userEvent.keyboard('{End}')
    expect(useWorkspaceStore.getState().settings.reasoning).toBe('ultra')
    expect(screen.getByRole('button', { name: /5\.6 Sol.*最高/ })).toHaveClass('ultra')
  })
})
