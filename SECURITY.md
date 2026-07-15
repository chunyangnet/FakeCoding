# Security

FakeCoding is a no-execution protocol simulator. It does not call upstream models and does not execute file, shell, network, browser, or client-declared tools.

## Supported boundary

- Bind to `127.0.0.1` unless access is controlled by a trusted local proxy.
- Request bodies are bounded by `--max-request-bytes`.
- Malformed JSON, invalid UTF-8, invalid timing values, and disconnect handling are security-sensitive areas.
- `tools` and `tool_choice` fields are accepted only for API compatibility and are ignored.

Report vulnerabilities through the repository security advisory workflow.
