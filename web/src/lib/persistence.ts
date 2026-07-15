import { createStore, get, set } from 'idb-keyval'
import type { PersistedWorkspace } from '../types'

const db = createStore('agent-nonsense-codex', 'workspace')
const WORKSPACE_KEY = 'state-v1'

export async function loadWorkspace(): Promise<PersistedWorkspace | undefined> {
  return get<PersistedWorkspace>(WORKSPACE_KEY, db)
}

export async function saveWorkspace(value: PersistedWorkspace): Promise<void> {
  await set(WORKSPACE_KEY, value, db)
}
