# FakeCoding Web

React/TypeScript/Vite Codex-like desktop workspace for the compatible
`agent_nonsense` API. The UI is a zero-side-effect simulator: diffs,
terminal output, tests and quota are local presentation data.

```powershell
npm install
npm run dev       # http://127.0.0.1:5173, proxies API to :8084
npm test          # Vitest
npm run test:e2e # Playwright + bundled Python server
npm run build     # emits production assets to ../agent_nonsense/web
```

Local state is persisted in IndexedDB. Copy the repository `.env.example` to `web/.env.local` to override `VITE_API_BASE_URL` or the default workspace path.
