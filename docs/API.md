# FakeCoding API

The default server listens on `127.0.0.1:8084`. All JSON responses use UTF-8, include `X-Mock-Agent: true` and `X-Token-Usage: 0`, and report zero usage.

Set a startup port with `--port 9901` or `FAKECODING_PORT=9901`.
`AGENT_NONSENSE_PORT` remains a legacy alias, and the command-line flag takes
precedence over environment variables.

## Compatibility endpoints

### `GET /v1/models`

Returns the compatible `agent-nonsense` model plus `mock-agent`, `gpt-5.6sol`,
`fable5` and `gpt-6max` aliases. The product name exposed by `/health` is
`FakeCoding`.

### `POST /v1/responses`

Accepts a string or Responses-style `input` list. Supported FakeCoding extensions:

- `continuous`: keep a streaming request open until disconnect.
- `max_activity_events`: number of scripted stages in finite mode.
- `modules`: activity module names.
- `preset`: force a preset ID.
- `use_presets`: set to `false` to use random conversation lines.
- `character_delay`: delay in seconds between individual streamed text characters.
- `speed_factor`: values above `1` stream faster.

```json
{
  "model": "agent-nonsense",
  "stream": true,
  "continuous": false,
  "max_activity_events": 4,
  "preset": "api-timeout",
  "input": "Investigate an API timeout"
}
```

Finite streams end with `response.completed`. Continuous streams end only when the client disconnects.

Loaded presets are compiled to at least 5,000 characters each. Every new request randomly selects one unless the explicit `preset` field is supplied. One streaming response keeps its selected task for the lifetime of that response. Visible text uses Markdown headings, blockquotes, checklists, emphasis, and fenced status blocks without describing the internal selection process.

### `POST /v1/chat/completions`

Accepts OpenAI-style `messages`. Streaming responses use Chat Completions chunks and end with `data: [DONE]` in finite mode.

### `POST /v1/messages`

Accepts Anthropic-style `messages`. Streaming responses use Messages events and end with `message_stop` in finite mode.

## Activity jobs

- `GET /v1/agent/modules`
- `GET /v1/agent/jobs`
- `POST /v1/agent/jobs`
- `GET /v1/agent/jobs/{id}`
- `POST /v1/agent/jobs/{id}/stop`
- `POST /v1/agent/activity`

`max_events: 0` and `duration_seconds: 0` create an unlimited job that runs until stopped.

## No-execution guarantee

The service never executes file, shell, network, or declared client tools. `tools` and `tool_choice` are accepted only for request compatibility and do not produce function calls. Usage fields contain plausible simulated counts; `X-Upstream-Token-Usage: 0` reports the real upstream cost.

For clients that still require the historical `POST /tools/call` endpoint,
start with `--simulate-tools` (or `--native-tools`). `list_files`, `read_file`
and `write_file` then operate on a bounded, per-process virtual buffer and
return `simulated: true`; the `--sandbox` path is ignored and no host file is
ever read or written. Without those compatibility flags the route returns 404.
