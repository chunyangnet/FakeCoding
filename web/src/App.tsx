import { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { getHealth, getJobs, getModels, getModules } from './lib/api'
import { useWorkspaceStore } from './store/useWorkspaceStore'
import { useAgentStream } from './hooks/useAgentStream'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { WorkspaceHeader } from './components/WorkspaceHeader'
import { EmptyState } from './components/EmptyState'
import { Conversation } from './components/Conversation'
import { Composer } from './components/Composer'
import { ReviewPanel } from './components/ReviewPanel'
import { SearchDialog } from './components/SearchDialog'
import { SettingsDialog } from './components/SettingsDialog'

function useResolvedTheme() {
  const theme = useWorkspaceStore((state) => state.settings.theme)
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}

export default function App() {
  const store = useWorkspaceStore()
  const { start, stop } = useAgentStream()
  const [draft, setDraft] = useState('')
  useResolvedTheme()

  const task = useMemo(() => store.tasks.find((item) => item.id === store.currentTaskId) || null, [store.tasks, store.currentTaskId])
  const project = store.projects.find((item) => item.id === task?.projectId) || store.projects[0]

  useEffect(() => { void store.hydrate() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const adapt = () => {
      if (window.innerWidth < 820 && useWorkspaceStore.getState().sidebarOpen) useWorkspaceStore.getState().setSidebarOpen(false)
    }
    adapt()
    addEventListener('resize', adapt)
    return () => removeEventListener('resize', adapt)
  }, [])

  useEffect(() => {
    if (!store.hydrated) return
    let disposed = false
    const controller = new AbortController()
    const refresh = async () => {
      try {
        const [health, models, modules, jobs] = await Promise.all([
          getHealth(store.settings.baseUrl, controller.signal),
          getModels(store.settings.baseUrl, controller.signal),
          getModules(store.settings.baseUrl, controller.signal),
          getJobs(store.settings.baseUrl, controller.signal),
        ])
        if (disposed) return
        store.setBackend({ state: 'connected', activeJobs: health.active_jobs ?? jobs.length, lastChecked: Date.now() })
        store.setModels(models)
        store.setModules(modules)
      } catch (error) {
        if (disposed || controller.signal.aborted) return
        store.setBackend({ state: 'disconnected', error: error instanceof Error ? error.message : String(error), lastChecked: Date.now() })
      }
    }
    void refresh()
    const timer = setInterval(refresh, 12_000)
    return () => { disposed = true; controller.abort(); clearInterval(timer) }
  }, [store.hydrated, store.settings.baseUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback((value: string) => {
    let id = store.currentTaskId
    if (!id) id = store.newTask(project?.id, store.mode)
    void start(id, value)
  }, [project?.id, start, store])

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey
      if (mod && event.key.toLowerCase() === 'n') { event.preventDefault(); store.newTask(); store.requestComposerFocus() }
      if (mod && event.key.toLowerCase() === 'g') { event.preventDefault(); store.setSearchOpen(true) }
      if (event.key === 'Escape') {
        if (store.searchOpen) store.setSearchOpen(false)
        else if (store.settingsOpen) store.setSettingsOpen(false)
        else if (task?.status === 'running') void stop('user')
      }
    }
    addEventListener('keydown', keydown)
    return () => removeEventListener('keydown', keydown)
  }, [stop, store, task?.status])

  if (!store.hydrated) return <div className="boot-screen"><span className="boot-glyph">›_</span><div className="boot-spinner"/></div>

  const isEmpty = !task || task.messages.length === 0
  return <div className={clsx('app-shell', !store.sidebarOpen && 'sidebar-hidden', store.reviewOpen && 'review-visible')}>
    <TitleBar onStop={() => void stop('user')}/>
    <div className="app-body">
      <Sidebar/>
      <main className="workspace">
        <WorkspaceHeader task={task}/>
        <div className="workspace-body">
          <section className="task-stage">
            {isEmpty ? <EmptyState mode={store.mode} projectName={project?.name || 'Project'} onSuggestion={(text) => setDraft(text)}/> : <Conversation task={task} settings={store.settings}/>} 
            <Composer task={task} onSend={send} onStop={() => void stop('user')} externalDraft={draft} onDraftConsumed={() => setDraft('')}/>
          </section>
          <ReviewPanel task={task}/>
        </div>
        {store.backend.state === 'disconnected' && <button className="connection-banner" onClick={() => store.setSettingsOpen(true)}><span/>后端未连接 · 点击检查 Base URL</button>}
      </main>
    </div>
    <SearchDialog/>
    <SettingsDialog/>
  </div>
}
