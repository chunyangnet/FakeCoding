# Contributing to FakeCoding

Thanks for helping improve FakeCoding. Keep changes focused, preserve the zero-side-effect and simulated-token disclosure in documentation and API metadata, and do not add network calls or unrestricted filesystem access.

## Development setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e .
python -m unittest discover -s tests -v
```

On Linux or macOS, activate the environment with `source .venv/bin/activate`.

## Pull requests

1. Explain the user-facing behavior and compatibility impact.
2. Add or update tests for protocol, streaming, tools, history, or presets.
3. Preserve the no-execution guarantee: no file, shell, network, browser, or declared-client tool actions.
4. Run the full test suite on your platform.
5. Update `CHANGELOG.md` for user-visible changes.

New runtime dependencies require a clear justification. The default implementation intentionally uses only the Python standard library.

## Presets

Preset files must remain valid UTF-8 JSON. Each preset needs a unique `id`, at least one keyword, a non-empty closing message, and steps using only known modules and simulated tools. Run `tests/test_presets.py` after editing presets.
