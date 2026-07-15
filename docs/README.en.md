# FakeCoding

FakeCoding is a Codex-like desktop workspace for **fake token usage, simulated coding activity, and local API demonstrations**. It looks like a long-running engineering session, but it never calls a real model, spends real tokens, executes commands, or edits project files.

[中文 README](../README.md) · [日本語](README.ja.md)

## What it provides

- React, TypeScript, Vite and PWA desktop-style workspace.
- Codex and ChatGPT modes, projects, recent/pinned tasks, search, archive, rename and delete.
- OpenAI Responses, Chat Completions, Anthropic Messages and Agent Jobs compatible endpoints.
- Robust UTF-8 SSE parsing across arbitrary chunks, character streaming, `AbortController` cancellation and reconnect/error states.
- Ten long-form engineering scenarios. Each preset is expanded to at least 12,000 characters with staged context, status blocks, checklists, validation notes and next-step transitions.
- Markdown/GFM, code blocks, copy buttons, simulated terminal output, tests and Diff review.
- Model and reasoning control in the lower-right composer: Light, Medium, High, Extra High and Maximum.
- Dragging, keyboard control and enhanced sweep, particles, rings and rebound effects for Extra High and Maximum.
- Local quota dashboard with total/input/output tokens, request count, consumed units, remaining units and recent records.
- Browser-only IndexedDB persistence for tasks, settings and usage. Default conversion: `1 unit = 1,000 simulated tokens`.

## Zero-side-effect guarantee

FakeCoding is a visual and protocol simulator, not an execution sandbox:

- No OpenAI, Anthropic or other upstream calls.
- Attachment content is never uploaded; only a filename may be shown.
- Diff, terminal, test and file-change panels are browser simulations.
- The Python service never creates, edits or deletes workspace files.
- Jobs live only in process memory and disappear on restart.
- Quota statistics stay in the browser's IndexedDB.
- The legacy `/tools/call` route is disabled by default. Compatibility mode uses a bounded in-memory virtual buffer and never resolves `--sandbox` on disk.

## Quick start on Windows PowerShell

Requirements: Python 3.10+, Node.js 20+ for frontend development.

```powershell
cd "D:\VS Code\Project\FakeToken"
python -m pip install -e .

# terminal 1
python -m agent_nonsense --quiet

# terminal 2
cd web
npm install
npm run dev
```

For a one-command development launch:

```powershell
cd "D:\VS Code\Project\FakeToken"
./scripts/dev-web.ps1
```

For production:

```powershell
cd web
npm install
npm run build
cd ..
python -m agent_nonsense --web --no-browser
```

Open `http://127.0.0.1:8084/`. The default is `8084`; set `FAKECODING_PORT` to use another port (`AGENT_NONSENSE_PORT` remains a legacy alias).

The `fakecoding` and legacy `agent-nonsense` commands are both available after installation:

```powershell
fakecoding --web
agent-nonsense --web
```

## Responses API example

```powershell
$body = @{
  model = "agent-nonsense"
  input = "Continue the distributed orchestration project with a detailed verification log"
  stream = $true
  continuous = $false
  reasoning = "ultra"
  character_delay = 0.04
  speed_factor = 1
} | ConvertTo-Json

Invoke-WebRequest http://127.0.0.1:8084/v1/responses `
  -Method Post -ContentType "application/json" -Body $body
```

The stream emits `response.created`, `response.output_text.delta`, `response.output_text.done` and `response.completed`. Finite and continuous modes are supported.

Health, model and module discovery:

```powershell
Invoke-RestMethod http://127.0.0.1:8084/health
Invoke-RestMethod http://127.0.0.1:8084/v1/models
Invoke-RestMethod http://127.0.0.1:8084/v1/agent/modules
```

See [`API.md`](API.md) for all compatibility endpoints.

## Long fake engineering conversations

Presets live in `agent_nonsense/presets.json`. They cover file-boundary analysis, API timeouts, frontend state, database migrations, dependency upgrades, flaky CI, memory growth, concurrency races, authentication and release packaging.

`agent_nonsense/longform.py` expands each ten-step outline into a deliberately long project log. The output progresses through context gathering, dependency mapping, minimal-change planning, validation, regression review and release risk. The text is prewritten and randomized; it does not claim that a real repository was inspected.

To make a demonstration even longer, add more `steps` or increase the compiler's `minimum_chars` value. The browser still throttles stream updates to avoid excessive rendering.

## Motion system

- Character-level streaming cursor and throttled message flushes.
- Pulsing running/connection indicators and animated review-panel entry.
- 120–220 ms popovers, menus and settings transitions.
- Extra High and Maximum reasoning effects: track shine, shell wave, particles, ring expansion and pill ambient glow.
- Reduced-motion support through `prefers-reduced-motion`.

## Tests

```powershell
python -m unittest -q
cd web
npm run lint
npm test -- --run
npm run build
npm run test:e2e
```

## Docker

```powershell
cd "D:\VS Code\Project\FakeToken"
docker compose build
docker compose up -d
Invoke-RestMethod http://127.0.0.1:8084/health
```

For a custom Compose port, copy `.env.example` to `.env`, set
`FAKECODING_PORT=9080`, then run `docker compose up -d --build`.

The image uses a Node multi-stage build, Python slim runtime, non-root execution, read-only root filesystem, no host volume, dropped Linux capabilities, and CPU/memory limits. See [`DOCKER.md`](DOCKER.md) for port changes, Nginx SSE proxying, updates and rollback.

## License

Apache License 2.0. See [`../LICENSE`](../LICENSE).

Copyright 2026 FakeCoding contributors.
