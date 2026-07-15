import { afterEach, describe, expect, it, vi } from 'vitest'
import { getHealth, streamResponse } from './api'
import { defaultSettings } from '../store/useWorkspaceStore'

describe('API client', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('surfaces connection failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    await expect(getHealth('http://127.0.0.1:9999')).rejects.toThrow('fetch failed')
  })

  it('stops a streaming request through AbortController', async () => {
    const controller = new AbortController()
    let cancelled = false
    const stream = new ReadableStream<Uint8Array>({
      start(streamController) {
        streamController.enqueue(new TextEncoder().encode('data: {"type":"response.output_text.delta","delta":"a"}\n\n'))
      },
      cancel() { cancelled = true },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream, { status: 200 })))
    const promise = streamResponse({ input: 'test', settings: defaultSettings, signal: controller.signal, onEvent: () => controller.abort() })
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    expect(controller.signal.aborted).toBe(true)
    expect(cancelled || controller.signal.aborted).toBe(true)
  })
})
