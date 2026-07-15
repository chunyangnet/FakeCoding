import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Icon } from './Icon'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import type { TaskRecord, ReasoningLevel } from '../types'

const reasoningLabels: Record<ReasoningLevel, string> = {
  low: '轻度', medium: '中', high: '高', 'extra-high': '极高', ultra: '最高',
}
const reasoningLevels: ReasoningLevel[] = ['low', 'medium', 'high', 'extra-high', 'ultra']

function displayModelName(model: string) {
  if (model.toLowerCase() === 'gpt-5.6sol') return '5.6 Sol'
  if (model.toLowerCase() === 'gpt-6max') return '6 Max'
  if (model.toLowerCase() === 'agent-nonsense') return 'FakeCoding'
  return model
}

export function Composer({ task, onSend, onStop, externalDraft, onDraftConsumed }: {
  task: TaskRecord | null
  onSend: (value: string) => void
  onStop: () => void
  externalDraft?: string
  onDraftConsumed?: () => void
}) {
  const store = useWorkspaceStore()
  const [value, setValue] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [modelOpen, setModelOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [ultraBurst, setUltraBurst] = useState(false)
  const [reasoningDragging, setReasoningDragging] = useState(false)
  const reasoningDraggingRef = useRef(false)
  const [contextOpen, setContextOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const running = task?.status === 'running'
  const enhancedReasoning = store.settings.reasoning === 'extra-high' || store.settings.reasoning === 'ultra'

  useEffect(() => { textareaRef.current?.focus() }, [store.composerFocusToken])
  useEffect(() => {
    if (externalDraft) {
      setValue(externalDraft)
      requestAnimationFrame(() => textareaRef.current?.focus())
      onDraftConsumed?.()
    }
  }, [externalDraft, onDraftConsumed])
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.min(190, Math.max(28, el.scrollHeight))}px`
  }, [value])

  const submit = () => {
    const text = value.trim()
    if (!text || running) return
    const attachmentNote = attachments.length ? `\n\n附件：${attachments.map((file) => file.name).join('、')}` : ''
    onSend(text + attachmentNote)
    setValue('')
    setAttachments([])
  }

  const approvalLabel = store.settings.approval === 'suggest' ? '替我审批' : store.settings.approval === 'auto' ? '自动审批' : '完全访问'
  const cycleApproval = () => store.updateSettings({ approval: store.settings.approval === 'suggest' ? 'auto' : store.settings.approval === 'auto' ? 'full' : 'suggest' })
  const selectReasoning = (level: ReasoningLevel) => {
    const changed = store.settings.reasoning !== level
    store.updateSettings({ reasoning: level })
    if ((level === 'extra-high' || level === 'ultra') && changed) {
      setUltraBurst(false)
      requestAnimationFrame(() => setUltraBurst(true))
      setTimeout(() => setUltraBurst(false), 920)
    }
  }
  const selectReasoningAtPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    selectReasoning(reasoningLevels[Math.round(ratio * (reasoningLevels.length - 1))])
  }

  return <div className={clsx('composer-wrap', running && 'is-running')}>
    {store.mode === 'chatgpt' && <div className="composer-context-strip">
      <button onClick={() => setContextOpen(!contextOpen)}><Icon name="folder"/><span>{store.projects[0]?.name || 'Project'}</span></button>
      <span className="plugin-dots"><i className="doc">D</i><i className="pdf">P</i><i className="sheet">S</i></span>
      <button onClick={() => store.setReviewOpen(true)}>插件</button>
    </div>}
    {contextOpen && <div className="menu-popover context-menu">
      <button onClick={() => setContextOpen(false)}><Icon name="folder"/><span><b>{task?.cwd || store.projects[0]?.path}</b><small>当前工作目录</small></span></button>
      <button onClick={() => { store.updateSettings({ environment: store.settings.environment === '本地模式' ? '工作区写入' : '本地模式' }); setContextOpen(false) }}><Icon name="terminal"/><span><b>{store.settings.environment}</b><small>点击切换执行环境</small></span></button>
    </div>}
    {attachments.length > 0 && <div className="attachment-row">{attachments.map((file) => <span key={`${file.name}-${file.size}`}><Icon name="file"/>{file.name}<button onClick={() => setAttachments((items) => items.filter((item) => item !== file))}><Icon name="close" size={12}/></button></span>)}</div>}
    <div className="composer" data-testid="composer">
      <textarea
        ref={textareaRef}
        value={value}
        rows={1}
        aria-label="任务输入"
        placeholder={task?.messages.length ? '要求后续变更' : '随心输入'}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit() }
          if (event.key === 'Escape' && running) { event.preventDefault(); onStop() }
        }}
      />
      <div className="composer-bottom">
        <div className="composer-actions-left">
          <label className="composer-icon-button" title="添加附件"><input type="file" multiple hidden onChange={(event) => setAttachments(Array.from(event.target.files || []))}/><Icon name="plus" size={21}/></label>
          <button className={clsx('approval-button', store.settings.approval === 'full' && 'warning')} onClick={cycleApproval}><Icon name="shield" size={17}/>{approvalLabel}</button>
          {store.mode === 'codex' && <button className="context-compact" onClick={() => setContextOpen(!contextOpen)}><Icon name="folder" size={16}/>{store.projects[0]?.name || 'Project'}<Icon name="chevron-down" size={13}/></button>}
          <span className={clsx('continuous-badge', store.settings.continuous && 'on')} title={store.settings.continuous ? '连续模式已开启' : '有限流模式'}>{store.settings.continuous ? '连续' : '有限'}</span>
        </div>
        <div className="composer-actions-right">
          {running && <span className="composer-running-spinner" aria-label="任务运行中"/>}
          <div className="model-control">
            <button className={clsx('model-pill', enhancedReasoning && 'ultra', ultraBurst && 'burst')} aria-expanded={modelOpen} onClick={() => { setModelOpen(!modelOpen); setAdvancedOpen(false) }}>
              <span>{displayModelName(store.settings.model)}</span><em>{reasoningLabels[store.settings.reasoning]}</em>{enhancedReasoning && <Icon name="spark" size={12}/>}<Icon name="chevron-down" size={14}/>
            </button>
            {modelOpen && <div className={clsx('model-popover', advancedOpen && 'advanced-open', enhancedReasoning && 'ultra', ultraBurst && 'burst')}>
              <button className="advanced-trigger" onClick={() => setAdvancedOpen(!advancedOpen)}><span>高级</span><Icon name="chevron-right" size={16}/></button>
              {advancedOpen && <div className="advanced-model-panel">
                <div className="advanced-label">模型</div>
                <div className="model-list">
                  {store.models.map((model) => <button className={store.settings.model === model ? 'selected' : ''} key={model} onClick={() => store.updateSettings({ model })}><span><b>{displayModelName(model)}</b><small>{model}</small></span>{store.settings.model === model && <Icon name="check"/>}</button>)}
                </div>
              </div>}
              <div className="reasoning-box">
                <div className="reasoning-head sr-only"><span>推理强度</span><strong>{reasoningLabels[store.settings.reasoning]}</strong></div>
                <div className="reasoning-slider-shell">
                  <div
                    className={clsx('reasoning-slider', reasoningDragging && 'dragging')}
                    style={{ '--reasoning-index': reasoningLevels.indexOf(store.settings.reasoning) } as React.CSSProperties}
                    role="slider"
                    tabIndex={0}
                    aria-label="推理强度"
                    aria-valuemin={0}
                    aria-valuemax={reasoningLevels.length - 1}
                    aria-valuenow={reasoningLevels.indexOf(store.settings.reasoning)}
                    aria-valuetext={reasoningLabels[store.settings.reasoning]}
                    onKeyDown={(event) => {
                      const current = reasoningLevels.indexOf(store.settings.reasoning)
                      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); selectReasoning(reasoningLevels[Math.max(0, current - 1)]) }
                      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); selectReasoning(reasoningLevels[Math.min(reasoningLevels.length - 1, current + 1)]) }
                      if (event.key === 'Home') { event.preventDefault(); selectReasoning(reasoningLevels[0]) }
                      if (event.key === 'End') { event.preventDefault(); selectReasoning(reasoningLevels.at(-1)!) }
                    }}
                    onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); reasoningDraggingRef.current = true; setReasoningDragging(true); selectReasoningAtPointer(event) }}
                    onPointerMove={(event) => { if (reasoningDraggingRef.current) selectReasoningAtPointer(event) }}
                    onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); reasoningDraggingRef.current = false; setReasoningDragging(false) }}
                    onPointerCancel={() => { reasoningDraggingRef.current = false; setReasoningDragging(false) }}
                  >
                    <span className="slider-track"/><span className="slider-fill"/><span className="slider-shine"/>
                    <span className="slider-thumb"><i className="thumb-core"/><i className="thumb-ring"/><span className="ultra-particles"><i/><i/><i/><i/></span></span>
                    {reasoningLevels.map((level) => <button aria-label={`推理强度${reasoningLabels[level]}`} title={reasoningLabels[level]} key={level} className={store.settings.reasoning === level ? 'active' : ''} onClick={() => selectReasoning(level)}><i/></button>)}
                  </div>
                </div>
              </div>
            </div>}
          </div>
          <button className={clsx('send-button', running ? 'stop' : 'send')} aria-label={running ? '停止任务' : '发送任务'} disabled={!running && !value.trim()} onClick={running ? onStop : submit}><Icon name={running ? 'stop' : 'send'} size={19}/></button>
        </div>
      </div>
    </div>
    <div className="composer-hint">Enter 发送 · Shift+Enter 换行 · Esc 停止</div>
  </div>
}
