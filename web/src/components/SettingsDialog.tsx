import { useState } from 'react'
import clsx from 'clsx'
import { getHealth, getModels } from '../lib/api'
import { Icon } from './Icon'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import type { ThemeMode } from '../types'

type SettingsTab = 'general' | 'model' | 'usage' | 'appearance' | 'markdown' | 'about'

function displayUsageModel(model: string) {
  if (model === 'gpt-5.6sol') return '5.6 Sol'
  if (model === 'gpt-6max') return '6 Max'
  return model.replace(/^gpt-/, '')
}

export function SettingsDialog() {
  const store = useWorkspaceStore()
  const [tab, setTab] = useState<SettingsTab>('general')
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState('')
  if (!store.settingsOpen) return null

  const committedUsage = store.usageHistory.reduce((summary, record) => ({
    inputTokens: summary.inputTokens + record.inputTokens,
    outputTokens: summary.outputTokens + record.outputTokens,
    totalTokens: summary.totalTokens + record.totalTokens,
    quotaUnits: summary.quotaUnits + record.quotaUnits,
  }), { inputTokens: 0, outputTokens: 0, totalTokens: 0, quotaUnits: 0 })
  const liveUsageEntries = Object.entries(store.liveUsage).map(([taskId, usage]) => ({
    taskId,
    usage,
    task: store.tasks.find((item) => item.id === taskId),
  }))
  const liveUsage = liveUsageEntries.reduce((summary, entry) => ({
    inputTokens: summary.inputTokens + entry.usage.inputTokens,
    outputTokens: summary.outputTokens + entry.usage.outputTokens,
    totalTokens: summary.totalTokens + entry.usage.totalTokens,
    quotaUnits: summary.quotaUnits + entry.usage.totalTokens / 1000,
  }), { inputTokens: 0, outputTokens: 0, totalTokens: 0, quotaUnits: 0 })
  const usage = {
    inputTokens: committedUsage.inputTokens + liveUsage.inputTokens,
    outputTokens: committedUsage.outputTokens + liveUsage.outputTokens,
    totalTokens: committedUsage.totalTokens + liveUsage.totalTokens,
    quotaUnits: committedUsage.quotaUnits + liveUsage.quotaUnits,
  }
  const usageIsLive = liveUsageEntries.length > 0
  const quotaLimitUnits = store.settings.quotaTokenLimit / 1000
  const remainingUnits = Math.max(0, quotaLimitUnits - usage.quotaUnits)
  const quotaPercentage = Math.min(100, quotaLimitUnits ? (usage.quotaUnits / quotaLimitUnits) * 100 : 0)
  const recentUsage = store.usageHistory.slice(0, 12)

  const check = async () => {
    setChecking(true); setMessage('')
    try {
      await getHealth(store.settings.baseUrl)
      const models = await getModels(store.settings.baseUrl)
      store.setModels(models)
      store.setBackend({ state: 'connected', lastChecked: Date.now() })
      setMessage('连接成功，模型列表已刷新。')
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error)
      store.setBackend({ state: 'disconnected', error: text, lastChecked: Date.now() })
      setMessage(`连接失败：${text}`)
    } finally { setChecking(false) }
  }
  return <div className="modal-backdrop settings-backdrop" onMouseDown={() => store.setSettingsOpen(false)}>
    <section className="settings-dialog" role="dialog" aria-modal="true" aria-label="设置" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><Icon name="settings"/><strong>设置</strong></div><button aria-label="关闭设置" onClick={() => store.setSettingsOpen(false)}><Icon name="close"/></button></header>
      <div className="settings-layout">
        <nav>
          {([['general', '通用', 'settings'], ['model', '模型与运行', 'spark'], ['usage', '额度统计', 'timer'], ['appearance', '外观', 'sun'], ['markdown', 'Markdown', 'code'], ['about', '关于', 'info']] as const).map(([id, label, icon]) => <button className={tab === id ? 'active' : ''} key={id} onClick={() => setTab(id)}><Icon name={icon}/>{label}</button>)}
        </nav>
        <div className="settings-content">
          {tab === 'general' && <>
            <div className="settings-title"><h2>通用</h2><p>配置 FakeCoding 后端连接和工作区行为。</p></div>
            <label className="field"><span>Base URL</span><input aria-label="Base URL" value={store.settings.baseUrl} onChange={(event) => store.updateSettings({ baseUrl: event.target.value })} placeholder="留空使用同源服务"/><small>开发环境留空时由 Vite 代理到 127.0.0.1:8084，也可以通过 VITE_API_PROXY_TARGET 修改。</small></label>
            <div className="settings-inline"><button className="secondary-button" onClick={check} disabled={checking}><Icon name={checking ? 'refresh' : 'check'} className={checking ? 'spin' : ''}/>{checking ? '正在检测' : '检测连接'}</button><span className={store.backend.state}>{message || (store.backend.state === 'connected' ? '后端已连接' : '等待检测')}</span></div>
            <label className="toggle-row"><span><b>自动滚动</b><small>流式输出时保持在内容底部</small></span><input type="checkbox" checked={store.settings.autoScroll} onChange={(event) => store.updateSettings({ autoScroll: event.target.checked })}/><i/></label>
            <label className="toggle-row"><span><b>连续模式</b><small>保持 SSE 长连接，直到手动停止</small></span><input type="checkbox" checked={store.settings.continuous} onChange={(event) => store.updateSettings({ continuous: event.target.checked })}/><i/></label>
            <div className="resource-guard"><Icon name="shield"/><span><b>资源隔离已启用</b><small>不上传附件内容、不写入工作区文件、不创建服务器持久化资源；Diff 与终端均为模拟展示。</small></span></div>
          </>}
          {tab === 'model' && <>
            <div className="settings-title"><h2>模型与运行</h2><p>控制 Responses API 的模型、预设和流式速度。</p></div>
            <label className="field"><span>Model</span><select value={store.settings.model} onChange={(event) => store.updateSettings({ model: event.target.value })}>{store.models.map((model) => <option key={model}>{model}</option>)}</select></label>
            <label className="field"><span>Preset</span><input value={store.settings.preset || ''} onChange={(event) => store.updateSettings({ preset: event.target.value || null })} placeholder="随机或留空"/></label>
            <div className="two-fields"><label className="field"><span>Character delay</span><input type="number" min="0" step="0.01" value={store.settings.characterDelay} onChange={(event) => store.updateSettings({ characterDelay: Number(event.target.value) })}/></label><label className="field"><span>Speed factor</span><input type="number" min="0.1" step="0.1" value={store.settings.speedFactor} onChange={(event) => store.updateSettings({ speedFactor: Number(event.target.value) })}/></label></div>
            <label className="field"><span>审批模式</span><select value={store.settings.approval} onChange={(event) => store.updateSettings({ approval: event.target.value as never })}><option value="suggest">替我审批</option><option value="auto">自动审批</option><option value="full">完全访问</option></select></label>
          </>}
          {tab === 'usage' && <div className="usage-page">
            <div className="settings-title"><h2>额度统计</h2><p>本地模拟用量统计，不会连接供应商计费，也不会产生真实额度消耗。</p></div>
            <div className="usage-hero">
              <div className="quota-ring" style={{ '--quota-percent': `${quotaPercentage}%` } as React.CSSProperties}><div><strong>{usage.quotaUnits.toFixed(2)}</strong><span>已消耗额度</span></div></div>
              <div className="usage-hero-copy"><strong>{remainingUnits.toFixed(2)} <small>额度剩余</small></strong><span>额度上限 {quotaLimitUnits.toLocaleString()} · 1 额度 = 1,000 模拟 tokens {usageIsLive && <i className="usage-live"><b/>实时估算中</i>}</span><div className="quota-progress"><i style={{ width: `${quotaPercentage}%` }}/></div></div>
            </div>
            <div className="usage-stat-grid">
              <div><span>总 Token</span><strong>{usage.totalTokens.toLocaleString()}</strong><small>输入 + 输出</small></div>
              <div><span>输入 Token</span><strong>{usage.inputTokens.toLocaleString()}</strong><small>请求上下文</small></div>
              <div><span>输出 Token</span><strong>{usage.outputTokens.toLocaleString()}</strong><small>模拟响应</small></div>
              <div><span>请求次数</span><strong>{(store.usageHistory.length + liveUsageEntries.length).toLocaleString()}</strong><small>{usageIsLive ? '包含运行中请求' : 'Responses API'}</small></div>
            </div>
            <div className="usage-controls"><label className="field"><span>本地额度上限（模拟 tokens）</span><input type="number" min="1000" step="1000" value={store.settings.quotaTokenLimit} onChange={(event) => store.updateSettings({ quotaTokenLimit: Math.max(1000, Number(event.target.value) || 1000) })}/></label><button className="secondary-button" onClick={() => { if (window.confirm('清除本地额度统计？任务记录不会被删除。')) store.clearUsageHistory() }}><Icon name="trash" size={15}/>清除统计</button></div>
            <div className="usage-history"><div className="usage-history-head"><strong>最近消耗</strong><span>{usageIsLive ? '运行中的额度会实时刷新' : '最多保留 1,000 条本地记录'}</span></div>{recentUsage.length === 0 && !usageIsLive ? <div className="usage-empty"><Icon name="timer" size={24}/><span>开始任务后，这里会实时显示额度变化。</span></div> : <div className="usage-table"><div className="usage-table-row usage-table-header"><span>任务</span><span>模型</span><span>Tokens</span><span>额度</span><span>时间</span></div>{liveUsageEntries.map((entry) => <div className="usage-table-row usage-table-live" key={`live-${entry.taskId}`}><span title={entry.task?.title}>{entry.task?.title || '运行中任务'}</span><span>{displayUsageModel(store.settings.model)}</span><span>{entry.usage.totalTokens.toLocaleString()}</span><span>{(entry.usage.totalTokens / 1000).toFixed(2)}</span><span><i/><b>实时</b></span></div>)}{recentUsage.map((record) => <div className="usage-table-row" key={record.id}><span title={record.taskTitle}>{record.taskTitle}</span><span>{displayUsageModel(record.model)}</span><span>{record.totalTokens.toLocaleString()}</span><span>{record.quotaUnits.toFixed(2)}</span><span>{new Date(record.createdAt).toLocaleString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>)}</div>}</div>
          </div>}
          {tab === 'appearance' && <>
            <div className="settings-title"><h2>外观</h2><p>匹配系统或固定使用浅色、深色主题。</p></div>
            <div className="theme-grid">{(['system', 'dark', 'light'] as ThemeMode[]).map((theme) => <button key={theme} className={clsx(store.settings.theme === theme && 'selected')} onClick={() => store.updateSettings({ theme })}><span className={`theme-preview ${theme}`}><i/><i/><i/></span><b>{theme === 'system' ? '跟随系统' : theme === 'dark' ? '深色' : '浅色'}</b>{store.settings.theme === theme && <Icon name="check"/>}</button>)}</div>
          </>}
          {tab === 'markdown' && <>
            <div className="settings-title"><h2>Markdown</h2><p>控制消息中的结构化内容与代码高亮。</p></div>
            <label className="toggle-row"><span><b>渲染 Markdown</b><small>关闭后显示原始文本</small></span><input type="checkbox" checked={store.settings.renderMarkdown} onChange={(event) => store.updateSettings({ renderMarkdown: event.target.checked })}/><i/></label>
            <label className="toggle-row"><span><b>GitHub Flavored Markdown</b><small>表格、删除线和任务列表</small></span><input type="checkbox" checked={store.settings.gfm} onChange={(event) => store.updateSettings({ gfm: event.target.checked })}/><i/></label>
          </>}
          {tab === 'about' && <div className="about-pane"><span className="about-icon">›_</span><h2>FakeCoding</h2><p>面向 FakeToken / agent_nonsense 上游的桌面级 Codex 仿真工作区。</p><a className="about-link" href="https://github.com/chunyangnet/FakeCoding" target="_blank" rel="noreferrer">GitHub · chunyangnet/FakeCoding <Icon name="arrow-right" size={14}/></a><dl><div><dt>Web UI</dt><dd>1.0.0</dd></div><div><dt>API</dt><dd>/v1/responses</dd></div><div><dt>持久化</dt><dd>IndexedDB</dd></div><div><dt>副作用</dt><dd>零</dd></div></dl></div>}
        </div>
      </div>
    </section>
  </div>
}
