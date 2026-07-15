import { Icon } from './Icon'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import type { TaskRecord } from '../types'

export function WorkspaceHeader({ task }: { task: TaskRecord | null }) {
  const store = useWorkspaceStore()
  const project = store.projects.find((item) => item.id === task?.projectId) || store.projects[0]
  return <header className="workspace-header">
    <div className="workspace-title">
      <button className="mobile-sidebar" aria-label="打开侧栏" onClick={() => store.setSidebarOpen(true)}><Icon name="sidebar"/></button>
      <Icon name="folder" size={19}/>
      <div><strong>{task?.messages.length ? task.title : project?.name || 'Project'}</strong>{task?.messages.length ? <span>{project?.name} · {task.branch}</span> : null}</div>
      <button className="header-more" aria-label="更多任务操作"><Icon name="more"/></button>
    </div>
    <div className="workspace-tools">
      {task?.status === 'running' && <span className="header-running"><i/>运行中</span>}
      <button className={store.reviewOpen ? 'active' : ''} aria-label="切换审阅面板" onClick={() => store.setReviewOpen(!store.reviewOpen)}><Icon name="panel"/></button>
      <button aria-label="收起侧栏" onClick={() => store.setSidebarOpen(!store.sidebarOpen)}><Icon name="sidebar"/></button>
    </div>
  </header>
}
