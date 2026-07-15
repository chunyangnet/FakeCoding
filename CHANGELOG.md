# Changelog

## Unreleased

- Rebrand the desktop simulator as FakeCoding and add Chinese, English and
  Japanese project documentation under Apache License 2.0.
- Expand compiled fake engineering conversations to at least 12,000 characters
  per preset while keeping all activity read-only and simulated.
- Add the `fakecoding` CLI alias while preserving `agent-nonsense` compatibility.
- Validate JSON object bodies, UTF-8 encoding, finite timing values, and activity limits.
- Add bounded request sizes to prevent unbounded memory use.
- Keep Chat Completions stream IDs stable and make Responses completion text match all emitted deltas.
- Mark background jobs as failed when their worker exits unexpectedly.

All notable changes to FakeCoding are documented here. The project follows Semantic Versioning.

## [Unreleased]

### Changed

- Slowed the default stream cadence to a 2.0 second base delay with up to 0.32 seconds of random jitter.
- Randomized task selection for every new message while preserving explicit `preset` overrides.
- Added AI-style Markdown headings, quotes, checklists, emphasis, and fenced tool/status blocks.
- Added `AGENT_NONSENSE_PORT` as a startup port configuration option.
- Removed simulation labels from visible chat while retaining transparent upstream-usage metadata.
- Added character-by-character streaming with configurable `character_delay` and `--character-delay` options.

## [0.1.0] - 2026-07-13

### Added

- OpenAI Responses and Chat Completions compatible endpoints.
- Anthropic Messages compatible endpoint.
- Finite and continuous SSE streaming with disconnect handling.
- API-only distribution with finite and continuous status streams.
- Background activity jobs with start, inspect, and stop endpoints.
- Standard-library test suite, packaging metadata, and GitHub Actions CI.

### Security

- Write size is limited and API responses report zero upstream token usage.
