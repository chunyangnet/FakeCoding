import { parseSSEStream } from './sse'
import type { Settings, StreamEvent } from '../types'

function apiUrl(baseUrl: string, path: string) {
  const clean = baseUrl.trim().replace(/\/$/, '')
  return clean ? `${clean}${path}` : path
}

async function jsonRequest<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(baseUrl, path), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message = payload?.error?.message || payload?.error || `${response.status} ${response.statusText}`
    throw new Error(String(message))
  }
  return response.json() as Promise<T>
}

export function getHealth(baseUrl: string, signal?: AbortSignal) {
  return jsonRequest<{ status: string; service?: string; active_jobs?: number }>(baseUrl, '/health', { signal })
}

export async function getModels(baseUrl: string, signal?: AbortSignal): Promise<string[]> {
  const payload = await jsonRequest<{ data?: Array<{ id: string }> }>(baseUrl, '/v1/models', { signal })
  return (payload.data || []).map((item) => item.id)
}

export async function getModules(baseUrl: string, signal?: AbortSignal) {
  const payload = await jsonRequest<{ modules?: Array<{ name: string; description: string }> }>(baseUrl, '/v1/agent/modules', { signal })
  return payload.modules || []
}

export async function getJobs(baseUrl: string, signal?: AbortSignal) {
  const payload = await jsonRequest<{ jobs?: unknown[] }>(baseUrl, '/v1/agent/jobs', { signal })
  return payload.jobs || []
}

export async function stopJob(baseUrl: string, id: string, signal?: AbortSignal) {
  return jsonRequest(baseUrl, `/v1/agent/jobs/${encodeURIComponent(id)}/stop`, {
    method: 'POST',
    body: '{}',
    signal,
  })
}

export interface ResponseStreamOptions {
  input: string
  settings: Settings
  signal: AbortSignal
  onEvent: (event: StreamEvent) => void
}

export async function streamResponse({ input, settings, signal, onEvent }: ResponseStreamOptions): Promise<void> {
  const response = await fetch(apiUrl(settings.baseUrl, '/v1/responses'), {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      model: settings.model,
      input,
      stream: true,
      continuous: settings.continuous,
      preset: settings.preset,
      reasoning: settings.reasoning,
      character_delay: settings.characterDelay,
      speed_factor: settings.speedFactor,
    }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `${response.status} ${response.statusText}`)
  }
  if (!response.body) throw new Error('后端没有返回可读取的流')
  for await (const event of parseSSEStream(response.body, signal)) onEvent(event)
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException ? error.name === 'AbortError' : error instanceof Error && error.name === 'AbortError'
}
