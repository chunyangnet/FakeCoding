import { memo, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Icon } from './Icon'
import { MarkdownView } from './MarkdownView'
import type { Message, TaskRecord } from '../types'
import type { Settings } from '../types'

function formatDuration(task: TaskRecord) {
  if (!task.startedAt) return '0s'
  const end = task.completedAt || Date.now()
  const seconds = Math.max(0, Math.round((end - task.startedAt) / 1000))
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

function WorkTimeline({ task }: { task: TaskRecord }) {
  const visible = task.activity.filter((event) => /^(正在思考|已运行|已编辑)/.test(event.text)).slice(-7)
  if (task.status !== 'running' && visible.length === 0) return null
  const entries = visible.length ? visible : [{ id: 'thinking', kind: 'analysis' as const, text: '正在思考 · 梳理任务约束、项目上下文和风险边界', createdAt: Date.now() }]
  return <section className={clsx('work-timeline', task.status !== 'running' && 'settled')} aria-label="工作状态">
    <div className="work-timeline-head"><span className="work-timeline-orb"/><strong>{task.status === 'running' ? '正在思考' : '工作记录'}</strong><Icon name="chevron-down" size={14}/></div>
    <div className="work-timeline-list">
      {entries.map((event) => <div className={clsx('work-timeline-item', event.kind)} key={event.id}><span className="work-timeline-icon"><Icon name={event.kind === 'edit' ? 'edit' : event.kind === 'terminal' ? 'terminal' : event.kind === 'test' ? 'check' : 'spark'} size={13}/></span><span>{event.text}</span></div>)}
    </div>
  </section>
}

const MessageView = memo(function MessageView({ message, settings }: { message: Message; settings: Settings }) {
  if (message.role === 'user') return <article className="user-message"><div>{message.content}</div></article>
  return <article className={clsx('assistant-message', message.streaming && 'streaming')}>
    <MarkdownView enabled={settings.renderMarkdown} gfm={settings.gfm}>{message.content || (message.streaming ? ' ' : '')}</MarkdownView>
    {message.streaming && <span className="stream-cursor" aria-label="正在流式输出"/>}
    {message.error && <div className="inline-error"><Icon name="info"/>流式连接失败：{message.error}</div>}
    {message.content && <div className="message-actions"><button aria-label="复制回复" onClick={() => navigator.clipboard.writeText(message.content)}><Icon name="copy" size={15}/></button><button aria-label="在审阅面板打开"><Icon name="panel" size={15}/></button><span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>}
  </article>
})

export function Conversation({ task, settings }: { task: TaskRecord; settings: Settings }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const followOutputRef = useRef(true)
  const previousStatusRef = useRef(task.status)
  const [nearBottom, setNearBottom] = useState(true)
  const [, setTick] = useState(0)
  const duration = formatDuration(task)

  useEffect(() => {
    if (task.status !== 'running') return
    const timer = setInterval(() => setTick((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [task.status])

  useEffect(() => {
    const justCompleted = previousStatusRef.current === 'running' && task.status !== 'running'
    let frame = 0
    if (settings.autoScroll && (followOutputRef.current || justCompleted)) {
      frame = requestAnimationFrame(() => {
        const element = scrollRef.current
        if (!element) return
        element.scrollTo({ top: element.scrollHeight, behavior: justCompleted ? 'smooth' : 'auto' })
      })
    }
    previousStatusRef.current = task.status
    return () => cancelAnimationFrame(frame)
  }, [task.messages, task.status, settings.autoScroll, nearBottom])

  const scrollBottom = () => {
    followOutputRef.current = true
    setNearBottom(true)
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }
  return <div className={clsx('conversation-scroll', task.status === 'running' && 'is-streaming', !nearBottom && 'is-browsing')} ref={scrollRef} onScroll={(event) => {
    const el = event.currentTarget
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    followOutputRef.current = isNearBottom
    setNearBottom(isNearBottom)
  }}>
    <div className="conversation-content">
      <div className="conversation-heading">
        <div><span className={clsx('run-dot', task.status)}/>{task.status === 'running' ? '正在处理' : task.status === 'completed' ? '已处理' : task.status === 'stopped' ? '已停止' : task.status === 'failed' ? '运行失败' : '任务'}</div>
        <span>{duration}</span><Icon name="chevron-right" size={15}/>
      </div>
      {task.messages.map((message) => <MessageView key={message.id} message={message} settings={settings}/>)}
      <WorkTimeline task={task}/>
      {task.status === 'running' && task.fileChanges.length > 0 && <div className="running-change-chip"><Icon name="diff" size={15}/><span>{task.fileChanges.length} 个文件已更改</span><i>+{task.fileChanges.reduce((sum, item) => sum + item.additions, 0)}</i><b>-{task.fileChanges.reduce((sum, item) => sum + item.deletions, 0)}</b></div>}
      {task.status !== 'running' && task.fileChanges.length > 0 && <div className="change-summary">
        <div className="change-summary-head"><span className="change-icon"><Icon name="diff"/></span><div><strong>已编辑 {task.fileChanges.length} 个文件</strong><span><i>+{task.fileChanges.reduce((n, item) => n + item.additions, 0)}</i> <b>-{task.fileChanges.reduce((n, item) => n + item.deletions, 0)}</b></span></div><button>审校</button></div>
        {task.fileChanges.map((change) => <div className="change-file" key={change.path}><span>{change.path}</span><i>+{change.additions}</i><b>-{change.deletions}</b></div>)}
      </div>}
      <div className="conversation-spacer"/>
    </div>
    {!nearBottom && <button className="scroll-bottom" onClick={scrollBottom}><Icon name="arrow-down"/>回到底部</button>}
  </div>
}
