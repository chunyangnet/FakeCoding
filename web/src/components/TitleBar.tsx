import { useState } from 'react'
import { Icon } from './Icon'
import { useWorkspaceStore } from '../store/useWorkspaceStore'

const menus = {
  文件: ['新建任务', '搜索任务', '设置'],
  编辑: ['聚焦输入框', '停止当前任务'],
  视图: ['切换侧栏', '切换审阅面板', '切换主题'],
  帮助: ['键盘快捷键', '关于 FakeCoding'],
}

export function TitleBar({ onStop }: { onStop: () => void }) {
  const [active, setActive] = useState<keyof typeof menus | null>(null)
  const store = useWorkspaceStore()

  const run = (action: string) => {
    setActive(null)
    if (action === '新建任务') { store.newTask(); store.requestComposerFocus() }
    if (action === '搜索任务') store.setSearchOpen(true)
    if (action === '设置') store.setSettingsOpen(true)
    if (action === '聚焦输入框') store.requestComposerFocus()
    if (action === '停止当前任务') onStop()
    if (action === '切换侧栏') store.setSidebarOpen(!store.sidebarOpen)
    if (action === '切换审阅面板') store.setReviewOpen(!store.reviewOpen)
    if (action === '切换主题') store.updateSettings({ theme: store.settings.theme === 'dark' ? 'light' : 'dark' })
    if (action === '关于 FakeCoding') window.open('https://github.com/chunyangnet/FakeCoding', '_blank', 'noopener,noreferrer')
  }

  return <header className="titlebar" onDoubleClick={() => undefined}>
    <div className="titlebar-left">
      <button className="titlebar-icon" aria-label="切换侧栏" onClick={() => store.setSidebarOpen(!store.sidebarOpen)}><Icon name="app" size={17}/></button>
      <button className="titlebar-icon muted" aria-label="后退" onClick={() => history.back()}><Icon name="arrow-left"/></button>
      <button className="titlebar-icon muted" aria-label="前进" onClick={() => history.forward()}><Icon name="arrow-right"/></button>
      <nav className="desktop-menus" aria-label="应用菜单">
        {(Object.keys(menus) as Array<keyof typeof menus>).map((menu) => <div className="desktop-menu" key={menu}>
          <button className={active === menu ? 'active' : ''} onClick={() => setActive(active === menu ? null : menu)}>{menu}</button>
          {active === menu && <div className="menu-popover top-menu-popover">
            {menus[menu].map((action) => <button key={action} onClick={() => run(action)}>{action}</button>)}
          </div>}
        </div>)}
      </nav>
    </div>
    <div className="titlebar-center" aria-hidden="true" />
    <div className="window-controls" aria-label="窗口控件">
      <button aria-label="最小化"><Icon name="minus" size={16}/></button>
      <button aria-label="最大化"><Icon name="square" size={14}/></button>
      <button aria-label="关闭"><Icon name="close" size={16}/></button>
    </div>
  </header>
}
