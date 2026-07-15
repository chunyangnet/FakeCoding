import type { StreamEvent } from '../types'

export class SSEParser {
  private buffer = ''

  push(chunk: string): StreamEvent[] {
    this.buffer += chunk.replace(/\r\n/g, '\n')
    const events: StreamEvent[] = []
    let boundary = this.buffer.indexOf('\n\n')

    while (boundary !== -1) {
      const block = this.buffer.slice(0, boundary)
      this.buffer = this.buffer.slice(boundary + 2)
      const data = block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n')

      if (data && data !== '[DONE]') {
        try {
          events.push(JSON.parse(data) as StreamEvent)
        } catch (error) {
          throw new Error(`SSE 数据格式错误：${error instanceof Error ? error.message : String(error)}`)
        }
      }
      boundary = this.buffer.indexOf('\n\n')
    }
    return events
  }

  finish(): void {
    if (this.buffer.trim()) {
      throw new Error('SSE 连接在事件结束前断开')
    }
  }
}

export async function* parseSSEStream(stream: ReadableStream<Uint8Array>, signal?: AbortSignal) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const parser = new SSEParser()
  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const { done, value } = await reader.read()
      if (done) break
      for (const event of parser.push(decoder.decode(value, { stream: true }))) {
        yield event
      }
    }
    for (const event of parser.push(decoder.decode())) yield event
    parser.finish()
  } finally {
    reader.releaseLock()
  }
}
