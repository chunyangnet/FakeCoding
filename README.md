# FakeCoding

> 一个仿 Codex 桌面客户端的伪装 Token 消耗与虚假编程工作区。

[English](docs/README.en.md) · [日本語](docs/README.ja.md)

FakeCoding 是一个本地运行的 UI、SSE 和 API 模拟项目：它让你看到像真实大型工程一样持续推进的编码对话、任务时间线、Diff、终端、测试、模型选择、推理强度动画和额度面板，但**不会调用真实模型、不会消耗真实 Token、不会读写项目文件，也不会执行命令**。

项目的 Python 包名 `agent_nonsense` 和旧版 `agent-nonsense` 命令保留，用于兼容 FakeToken 上游；对外产品名称、Web 客户端名称和文档名称统一为 **FakeCoding**。

## 核心特性

- 仿 Codex / ChatGPT 工作区的桌面级 React + TypeScript + Vite UI。
- Codex 模式与 ChatGPT 模式切换、Projects、Recent tasks、Pinned tasks、搜索、归档、重命名和删除。
- 真实 SSE 分片解析：支持跨 chunk UTF-8、`response.output_text.delta`、`response.completed`、AbortController 和断线恢复提示。
- 长篇虚假编程对话：十组大型工程剧本，每个剧本编译为至少 12,000 字的阶段记录，覆盖 API 超时、前端状态、数据库迁移、依赖升级、并发竞态、内存增长、权限和发布流程。
- 每个阶段包含任务目标、当前动作、上下文地图、验证清单、状态块和下一步计划，适合长时间演示。
- Markdown、GFM 表格、Checklist、引用、代码块、复制按钮和模拟 Diff。
- 右下角模型/推理强度组件：轻度、中、高、极高、最高；支持拖动、键盘控制，以及极高和最高挡的扫光、粒子、扩散环和回弹动画。
- 设置中的本地额度统计：总 Token、输入 Token、输出 Token、请求次数、消耗额度、剩余额度和最近记录。
- 额度统计仅保存在浏览器 IndexedDB；默认 `1 额度 = 1,000 模拟 tokens`。
- PWA、浅色/深色主题、自定义细滚动条和 reduced-motion 支持。
- 后端提供 OpenAI Responses、Chat Completions、Anthropic Messages 和 Agent Jobs 兼容接口。
- 无第三方模型调用、无真实文件工具、无 Shell 执行、无宿主机卷挂载。

## 明确的零副作用边界

FakeCoding 的“编程”是演示画面，不是执行环境：

1. 不连接 OpenAI、Anthropic 或其它上游模型。
2. 请求中的附件只读取浏览器提供的文件名，不上传文件内容。
3. Diff、终端、测试结果和文件变更来自浏览器模拟映射。
4. Python 服务不会创建、修改或删除项目文件。
5. 额度和任务历史保存在当前浏览器 IndexedDB，不写入服务器数据库。
6. 后端 Job 只存在于当前进程内存，进程退出后消失。
7. 旧版 `/tools/call` 默认关闭；使用兼容开关时也只使用有上限的内存虚拟缓冲，不访问 `--sandbox`。

## 快速开始

要求：Python 3.10+、Node.js 20+（仅前端开发需要）。

### Windows PowerShell：开发模式

```powershell
cd "D:\VS Code\Project\FakeToken"
python -m pip install -e .

# 终端一：启动兼容 API
python -m agent_nonsense --quiet

# 终端二：启动 Vite Web 客户端
cd web
npm install
npm run dev
```

打开 Vite 显示的地址，通常是 `http://127.0.0.1:5173/`。

也可以使用一条 PowerShell 命令同时启动：

```powershell
cd "D:\VS Code\Project\FakeToken"
./scripts/dev-web.ps1
```

### 生产模式

```powershell
cd "D:\VS Code\Project\FakeToken\web"
npm install
npm run build

cd ..
python -m agent_nonsense --web --no-browser
```

访问 `http://127.0.0.1:8084/`。默认端口为 `8084`，可通过 `FAKECODING_PORT` 修改；`AGENT_NONSENSE_PORT` 仍作为旧版兼容变量。

安装后的兼容命令仍然可用：

```powershell
fakecoding --web
agent-nonsense --web
```

## API 示例

### Responses SSE

```powershell
$body = @{
  model = "agent-nonsense"
  input = "请继续推进大型分布式任务编排项目，输出详细验证过程"
  stream = $true
  continuous = $false
  reasoning = "ultra"
  preset = $null
  character_delay = 0.04
  speed_factor = 1
} | ConvertTo-Json

Invoke-WebRequest http://127.0.0.1:8084/v1/responses `
  -Method Post -ContentType "application/json" -Body $body
```

支持：`response.created`、`response.output_text.delta`、`response.output_text.done`、`response.completed`、有限流、`continuous` 长连接、`character_delay`、`speed_factor`、`preset` 和 `reasoning`。

### 健康检查和模型

```powershell
Invoke-RestMethod http://127.0.0.1:8084/health
Invoke-RestMethod http://127.0.0.1:8084/v1/models
Invoke-RestMethod http://127.0.0.1:8084/v1/agent/modules
```

### 活动任务

```powershell
$job = Invoke-RestMethod http://127.0.0.1:8084/v1/agent/jobs `
  -Method Post -ContentType "application/json" `
  -Body (@{ prompt = "分析大型编排系统的并发问题"; max_events = 12; speed_factor = 1 } | ConvertTo-Json)

Invoke-RestMethod "http://127.0.0.1:8084/v1/agent/jobs/$($job.job.id)"
Invoke-RestMethod "http://127.0.0.1:8084/v1/agent/jobs/$($job.job.id)/stop" -Method Post
```

完整接口说明见 [`docs/API.md`](docs/API.md)。

## 虚假项目剧本

预置剧本位于 `agent_nonsense/presets.json`，目前包含：

```text
python-file-io
api-timeout
frontend-state
database-migration
dependency-upgrade
ci-flaky-tests
memory-growth
concurrency-race
auth-permissions
release-packaging
```

每个剧本会被 `agent_nonsense/longform.py` 扩写为长篇阶段流。输出会模拟一个真实大型项目的工作节奏：先收集上下文，再建立依赖地图，提出最小修改，执行多轮验证，检查边界条件，最后整理发布风险和回滚方案。所有内容都是预置文本和随机化状态，不代表真实执行结果。

如需增加更长的演示内容，直接编辑 `presets.json` 的 `steps`；编译器会自动补齐工作记录、验证清单、过渡段和完成标准。

## 动效设计

FakeCoding 重点复刻桌面客户端的节奏，而不是普通后台页面：

- 流式回复使用字符级光标和节流刷新。
- 运行状态点、连接状态和任务时间线有脉冲动画。
- 模型弹层使用 120–220ms 的弹出、缩放和阴影过渡。
- “极高”和“最高”显示轨道扫光、扩散环、粒子和胶囊环境光。
- 审阅面板、设置弹窗、搜索弹窗和上下文菜单有独立进入动画。
- `prefers-reduced-motion: reduce` 时自动降低动画。

## 测试和构建

```powershell
cd "D:\VS Code\Project\FakeToken"
python -m unittest -q

cd web
npm run lint
npm test -- --run
npm run build
npm run test:e2e
```

## Docker 部署

Docker 使用 Node 多阶段构建、Python slim 运行镜像、非 root 用户、只读根文件系统、无宿主机 volume、`cap_drop: ALL` 和内存/CPU 限制。

```powershell
cd "D:\VS Code\Project\FakeToken"
docker compose build
docker compose up -d
Invoke-RestMethod http://127.0.0.1:8084/health
```

访问 `http://127.0.0.1:8084/`，日志使用：

```powershell
docker compose logs -f --tail 200 fakecoding
```

自定义 Docker 端口：

```powershell
Copy-Item .env.example .env
# 修改 .env：FAKECODING_PORT=9080
docker compose up -d --build
```

完整教程、端口修改、Nginx SSE 反向代理、更新和回滚见 [`docs/DOCKER.md`](docs/DOCKER.md)。

## 项目结构

```text
FakeToken/
├─ agent_nonsense/       # Python 兼容 API 和长篇剧本
├─ web/                  # FakeCoding React/Vite 客户端
├─ agent_nonsense/web/   # wheel 和 Docker 使用的生产静态资源
├─ docs/                 # API、Docker 和多语言文档
├─ output/playwright/    # 视觉验收截图
├─ Dockerfile
└─ docker-compose.yml
```

## 开源协议

本项目使用 [Apache License 2.0](LICENSE)。

Copyright 2026 FakeCoding contributors.

## 社区支持
[LINUX DO](https://linux.do)