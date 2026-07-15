import { describe, expect, it } from 'vitest'
import { SSEParser, parseSSEStream } from './sse'

describe('SSEParser', () => {
  it('parses character deltas split across arbitrary chunks', () => {
    const parser = new SSEParser()
    expect(parser.push('data: {"type":"response.output_')).toEqual([])
    expect(parser.push('text.delta","delta":"你"}\n\n')).toEqual([{ type: 'response.output_text.delta', delta: '你' }])
    expect(parser.push('data: {"type":"response.completed","response":{"status":"completed"}}\n\n')).toHaveLength(1)
    parser.finish()
  })

  it('supports JSON split across UTF-8 stream chunks without duplicate text', async () => {
    const bytes = new TextEncoder().encode('data: {"type":"response.output_text.delta","delta":"你好"}\n\ndata: [DONE]\n\n')
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 17))
        controller.enqueue(bytes.slice(17, 49))
        controller.enqueue(bytes.slice(49))
        controller.close()
      },
    })
    const events = []
    for await (const event of parseSSEStream(stream)) events.push(event)
    expect(events.map((event) => event.delta).join('')).toBe('你好')
  })

  it('reports malformed events', () => {
    const parser = new SSEParser()
    expect(() => parser.push('data: {bad json}\n\n')).toThrow(/SSE 数据格式错误/)
  })
})
