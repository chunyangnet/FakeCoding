import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import { useWorkspaceStore } from '../store/useWorkspaceStore'

export function SearchDialog() {
  const store = useWorkspaceStore()
  const [query, setQuery] = useState('')
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return store.tasks.filter((task) => !task.archived && (!q || task.title.toLowerCase().includes(q) || task.messages.some((message) => message.content.toLowerCase().includes(q))))
  }, [query, store.tasks])
  if (!store.searchOpen) return null
  return <div className="modal-backdrop" onMouseDown={() => store.setSearchOpen(false)}>
    <section className="search-dialog" role="dialog" aria-modal="true" aria-label="搜索任务" onMouseDown={(event) => event.stopPropagation()}>
      <div className="search-input"><Icon name="search"/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索任务、消息或项目"/><kbd>Esc</kbd></div>
      <div className="search-results">
        <div className="search-label">{query ? `找到 ${results.length} 个结果` : '最近任务'}</div>
        {results.map((task) => <button key={task.id} onClick={() => { store.selectTask(task.id); store.setSearchOpen(false) }}><span className={`task-status-dot ${task.status}`}/><div><strong>{task.title}</strong><small>{task.cwd} · {new Date(task.updatedAt).toLocaleString()}</small></div>{task.pinned && <Icon name="pin"/>}</button>)}
        {results.length === 0 && <div className="search-empty">没有匹配的任务</div>}
      </div>
    </section>
  </div>
}
