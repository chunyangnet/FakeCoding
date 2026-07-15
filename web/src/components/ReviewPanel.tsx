import { useState } from 'react'
import clsx from 'clsx'
import { Icon } from './Icon'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import type { TaskRecord } from '../types'

type Tab = 'activity' | 'changes' | 'tests' | 'terminal' | 'info'
const tabs: Array<{ id: Tab; icon: Parameters<typeof Icon>[0]['name']; label: string }> = [
  { id: 'activity', icon: 'repeat', label: '活动' },
  { id: 'changes', icon: 'diff', label: '变更' },
  { id: 'tests', icon: 'test', label: '测试' },
  { id: 'terminal', icon: 'terminal', label: '终端' },
  { id: 'info', icon: 'info', label: '信息' },
]

export function ReviewPanel({ task }: { task: TaskRecord | null }) {
  const [tab, setTab] = useState<Tab>('activity')
  const reviewOpen = useWorkspaceStore((state) => state.reviewOpen)
  const setReviewOpen = useWorkspaceStore((state) => state.setReviewOpen)
  if (!reviewOpen) return null
  return <aside className="review-panel">
    <div className="review-head"><strong>任务详情</strong><button aria-label="关闭审阅面板" onClick={() => setReviewOpen(false)}><Icon name="close"/></button></div>
    <div className="review-tabs">{tabs.map((item) => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)} title={item.label}><Icon name={item.icon}/><span>{item.label}</span></button>)}</div>
    <div className="review-content">
      {!task && <div className="panel-empty"><Icon name="panel" size={30}/><p>选择任务后查看活动、变更和运行信息。</p></div>}
      {task && tab === 'activity' && <div className="activity-list">
        {task.activity.length === 0 ? <div className="panel-empty"><Icon name="repeat"/><p>任务开始后，活动步骤会显示在这里。</p></div> : task.activity.map((event, index) => <div className="activity-item" key={event.id}><span className={clsx('activity-node', event.kind)}>{index + 1}</span><div><p>{event.text}</p><time>{new Date(event.createdAt).toLocaleTimeString()}</time></div></div>)}
      </div>}
      {task && tab === 'changes' && <div className="changes-panel">
        {task.fileChanges.length === 0 ? <div className="panel-empty"><Icon name="diff"/><p>当前任务还没有映射到文件变更。</p></div> : task.fileChanges.map((change) => <details open key={change.path}><summary><span>{change.path}</span><i>+{change.additions}</i><b>-{change.deletions}</b></summary><pre>{change.diff}</pre></details>)}
      </div>}
      {task && tab === 'tests' && <div className="tests-panel">
        <div className="test-row passed"><Icon name="check"/><span>响应流格式</span><strong>通过</strong></div>
        <div className={clsx('test-row', task.status === 'failed' ? 'failed' : 'passed')}><Icon name={task.status === 'failed' ? 'close' : 'check'}/><span>任务完成状态</span><strong>{task.status === 'failed' ? '失败' : '通过'}</strong></div>
        <div className="test-row"><Icon name="timer"/><span>运行耗时</span><strong>{task.startedAt ? `${Math.max(0, Math.round(((task.completedAt || Date.now()) - task.startedAt) / 1000))}s` : '—'}</strong></div>
      </div>}
      {task && tab === 'terminal' && <pre className="terminal-output">{task.terminal.length ? task.terminal.map((line) => `$ ${line}`).join('\n') : '$ 等待任务输出…'}</pre>}
      {task && tab === 'info' && <dl className="metadata-list">
        <div><dt>状态</dt><dd>{task.status}</dd></div><div><dt>模型</dt><dd>{useWorkspaceStore.getState().settings.model}</dd></div><div><dt>工作目录</dt><dd>{task.cwd}</dd></div><div><dt>分支</dt><dd>{task.branch}</dd></div><div><dt>输入 tokens</dt><dd>{task.usage?.inputTokens ?? '—'}</dd></div><div><dt>输出 tokens</dt><dd>{task.usage?.outputTokens ?? '—'}</dd></div><div><dt>Job ID</dt><dd>{task.backendJobId || 'Responses SSE'}</dd></div>
      </dl>}
    </div>
  </aside>
}
