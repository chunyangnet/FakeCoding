# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS web-builder
WORKDIR /src
COPY web/package.json web/package-lock.json ./web/
# Keep the build compatible with Docker installations that do not have
# BuildKit/buildx enabled. npm's own layer remains cached until lockfiles change.
RUN cd web && npm ci
COPY web ./web
RUN mkdir -p agent_nonsense && cd web && npm run build

FROM python:3.13-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    FAKECODING_PORT=8084
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app --home-dir /nonexistent --shell /usr/sbin/nologin app
COPY pyproject.toml README.md MANIFEST.in LICENSE NOTICE ./
COPY agent_nonsense ./agent_nonsense
COPY --from=web-builder /src/agent_nonsense/web ./agent_nonsense/web
RUN python -m pip install --no-cache-dir . && chown -R app:app /app
USER app
EXPOSE 8084
HEALTHCHECK --interval=20s --timeout=3s --start-period=8s --retries=3 \
  CMD python -c "import os, urllib.request; port=os.environ.get('FAKECODING_PORT', '8084'); urllib.request.urlopen(f'http://127.0.0.1:{port}/health', timeout=2).read()"
ENTRYPOINT ["fakecoding"]
CMD ["--web", "--no-browser", "--host", "0.0.0.0"]
