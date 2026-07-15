import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Icon } from './Icon'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import type { TaskRecord } from '../types'

function TaskItem({ task }: { task: TaskRecord }) {
  const currentTaskId = useWorkspaceStore((state) => state.currentTaskId)
  const selectTask = useWorkspaceStore((state) => state.selectTask)
  const renameTask = useWorkspaceStore((state) => state.renameTask)
  const archiveTask = useWorkspaceStore((state) => state.archiveTask)
  const deleteTask = useWorkspaceStore((state) => state.deleteTask)
  const togglePin = useWorkspaceStore((state) => state.togglePin)
  const [menu, setMenu] = useState(false)
  const rename = () => {
    const title = window.prompt('重命名任务', task.title)
    if (title !== null) renameTask(task.id, title)
    setMenu(false)
  }
  return <div className={clsx('task-row', currentTaskId === task.id && 'selected')}>
    <button className="task-select" onClick={() => selectTask(task.id)} title={task.title}>
      <span className={clsx('task-status-dot', task.status)} />
      <span>{task.title}</span>
      {task.status === 'running' && <span className="task-progress-spinner" aria-label="任务运行中"/>}
      {task.pinned && <Icon name="pin" size={13}/>}
    </button>
    <button className="task-more" aria-label={`${task.title} 菜单`} onClick={() => setMenu(!menu)}><Icon name="more" size={16}/></button>
    {menu && <div className="menu-popover task-menu">
      <button onClick={rename}><Icon name="edit"/>重命名</button>
      <button onClick={() => { togglePin(task.id); setMenu(false) }}><Icon name="pin"/>{task.pinned ? '取消置顶' : '置顶任务'}</button>
      <button onClick={() => { archiveTask(task.id); setMenu(false) }}><Icon name="archive"/>归档</button>
      <button className="danger" onClick={() => { deleteTask(task.id); setMenu(false) }}><Icon name="trash"/>删除</button>
    </div>}
  </div>
}

export function Sidebar() {
  const store = useWorkspaceStore()
  const [modeMenu, setModeMenu] = useState(false)
  const visibleTasks = useMemo(() => store.tasks.filter((task) => !task.archived), [store.tasks])
  const pinned = visibleTasks.filter((task) => task.pinned)
  const recent = visibleTasks.filter((task) => !task.pinned).sort((a, b) => b.updatedAt - a.updatedAt)
  const running = visibleTasks.some((task) => task.status === 'running')

  return <aside className={clsx('sidebar', !store.sidebarOpen && 'collapsed')}>
    <div className="sidebar-inner">
      <div className="sidebar-heading">
        <button className="mode-heading" onClick={() => setModeMenu(!modeMenu)}>
          <strong>{store.mode === 'codex' ? 'Codex' : 'ChatGPT 工作'}</strong>
          <Icon name="chevron-down" size={15}/>
        </button>
        <button className="icon-button" aria-label="搜索任务" onClick={() => store.setSearchOpen(true)}><Icon name="search"/></button>
        {modeMenu && <div className="menu-popover mode-menu">
          <button className={store.mode === 'codex' ? 'checked' : ''} onClick={() => { store.setMode('codex'); setModeMenu(false) }}><span className="mode-mark">›_</span><span><b>Codex</b><small>代码任务与审阅</small></span></button>
          <button className={store.mode === 'chatgpt' ? 'checked' : ''} onClick={() => { store.setMode('chatgpt'); setModeMenu(false) }}><span className="mode-mark chat">◎</span><span><b>ChatGPT 工作</b><small>通用任务与插件</small></span></button>
        </div>}
      </div>

      <nav className="primary-nav">
        <button onClick={() => { store.newTask(); store.requestComposerFocus() }}><Icon name="compose"/><span>新建任务</span><kbd>Ctrl N</kbd></button>
        <button onClick={() => store.setReviewOpen(true)}><Icon name="clock"/><span>已安排</span></button>
        <button onClick={() => store.setReviewOpen(true)}><Icon name="plugin"/><span>插件</span></button>
        {store.mode === 'codex' && <button onClick={() => store.setReviewOpen(true)}><Icon name="branch"/><span>拉取请求</span></button>}
      </nav>

      <div className="sidebar-scroll">
        <section className="sidebar-section projects-section">
          <div className="section-label">项目</div>
          {store.projects.map((project) => <div key={project.id}>
            <button className={clsx('project-row', running && 'is-running')} onClick={() => store.toggleProject(project.id)}>
              <Icon name="folder"/><span>{project.name}</span><Icon name={project.expanded ? 'chevron-down' : 'chevron-right'} size={15}/>{running && <span className="project-progress-spinner" aria-label="项目运行中"/>}
            </button>
            {project.expanded && <div className="project-tasks">
              {visibleTasks.filter((task) => task.projectId === project.id).slice(0, 7).map((task) => <TaskItem key={task.id} task={task}/>)}
              {visibleTasks.filter((task) => task.projectId === project.id).length > 7 && <button className="show-more" onClick={() => store.setSearchOpen(true)}>展开显示</button>}
              {!visibleTasks.some((task) => task.projectId === project.id) && <div className="empty-sidebar-row">暂无项目任务</div>}
            </div>}
          </div>)}
        </section>

        {pinned.length > 0 && <section className="sidebar-section">
          <div className="section-label">置顶任务</div>
          {pinned.map((task) => <TaskItem key={task.id} task={task}/>)}
        </section>}

        <section className="sidebar-section">
          <div className="section-label">最近任务</div>
          {recent.slice(0, 12).map((task) => <TaskItem key={task.id} task={task}/>)}
          {recent.length === 0 && <div className="empty-sidebar-row">无任务</div>}
        </section>
      </div>

      <footer className="sidebar-footer">
        <button className="settings-button" onClick={() => store.setSettingsOpen(true)}><Icon name="settings"/><span>设置</span></button>
        <button className={clsx('connection-indicator', store.backend.state, running && 'is-running')} title={running ? '任务运行中' : store.backend.state === 'connected' ? '后端已连接' : '后端未连接'} onClick={() => store.setSettingsOpen(true)}>
          <span className="connection-dot"/>
          {running ? <><span className="download-label">正在工作</span><Icon name="stop" size={13}/></> : <Icon name={store.backend.state === 'connected' ? 'download' : 'refresh'} size={15}/>}
        </button>
      </footer>
    </div>
  </aside>
}
