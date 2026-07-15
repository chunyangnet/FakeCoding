#!/usr/bin/env python3
import argparse
import json
import math
import mimetypes
import os
import random
import threading
import time
import uuid
import webbrowser
from copy import deepcopy
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from .longform import compile_preset


DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8084
DEFAULT_MAX_REQUEST_BYTES = 1_000_000
MODEL_ALIASES = ["agent-nonsense", "mock-agent", "gpt-5.6sol", "fable5", "gpt-6max"]

PHASES = [
    "Parsing the request and establishing constraints",
    "Mapping dependencies and ranking hypotheses",
    "Validating the leading path against edge cases",
    "Consolidating findings and preparing the response",
]

ACTIVITY_MODULES = {
    "research": {
        "description": "Simulated web/codebase research activity",
        "lines": [
            "agent: expanding query terms from user prompt",
            "agent: checking local notes and cached references",
            "agent: scoring sources by relevance and freshness",
            "agent: extracting candidate facts into scratchpad",
            "agent: reconciling conflicting signals",
        ],
    },
    "code_edit": {
        "description": "Simulated code editing activity",
        "lines": [
            "agent: locating implementation boundary",
            "agent: reading adjacent tests and helpers",
            "agent: preparing minimal patch",
            "agent: applying edit set to workspace",
            "agent: formatting touched files",
        ],
    },
    "test_run": {
        "description": "Simulated test/build activity",
        "lines": [
            "runner: collecting tests",
            "runner: building dependency graph",
            "runner: executing focused test selection",
            "runner: replaying failed-case seed",
            "runner: summarizing verification result",
        ],
    },
    "context_scan": {
        "description": "Passive context and dependency analysis",
        "lines": [
            "indexer: mapping entry points and dependency edges",
            "indexer: correlating symbols with adjacent contracts",
            "indexer: ranking high-signal implementation regions",
            "indexer: checking configuration and runtime assumptions",
            "agent: context map stabilized for the current hypothesis",
        ],
    },
    # Legacy module name retained for protocol compatibility.  Its events are
    # descriptive only and never perform file operations.
    "file_ops": {
        "description": "Virtual file context activity (no filesystem access)",
        "lines": [
            "virtual: listing an in-memory workspace projection",
            "virtual: reading simulated context buffer",
            "virtual: preparing a non-persistent edit preview",
            "virtual: validating the preview without touching disk",
            "virtual: file operation summary ready",
        ],
    },
    "debug_trace": {
        "description": "Simulated debugging activity",
        "lines": [
            "debug: capturing failing input shape",
            "debug: tracing caller chain",
            "debug: checking state transition invariants",
            "debug: comparing expected and actual output",
            "debug: narrowing likely root cause",
        ],
    },
}

COMPONENT_SCOPES = [
    "request lifecycle",
    "state transition boundary",
    "compatibility adapter",
    "validation layer",
    "streaming protocol surface",
]

FINAL_TEMPLATES = [
    "我先把任务拆成上下文、修改和验证三个部分。目前更适合从相关文件和调用链开始确认，再决定是否需要改动。",
    "我已经把这次请求的工作范围整理出来了。接下来会先核对边界条件，再做一个尽量小的修改，并用针对性测试复核。",
    "目前没有必要扩大修改范围。我会继续沿着现有实现检查关键路径，确认结果稳定后再整理结论。",
]

CONVERSATION_LINES = {
    "research": [
        "我先看一下现有上下文，确认这个问题具体落在哪一层。",
        "我把相关信息整理一下，先区分现象、影响范围和可能的触发条件。",
        "这里我先不急着修改，先确认当前实现和预期行为是不是一致。",
        "结合目前看到的线索，问题更像是局部边界条件，我继续往调用链下游看。",
    ],
    "context_scan": [
        "我正在建立入口、状态转换和兼容层之间的关系图，先锁定最可能影响结果的边界。",
        "上下文已经收敛到几个高信号区域，我继续核对输入契约、返回语义和异常传播是否一致。",
        "当前主路径基本清楚，接下来重点检查配置假设、并发顺序和协议边界。",
        "我正在交叉验证相邻调用关系，避免只解释表面现象而遗漏共享状态带来的影响。",
    ],
    "file_ops": [
        "我先查看虚拟工作区投影，确认这一阶段需要哪些上下文。",
        "我读取模拟上下文缓冲区，不会访问本机文件。",
        "我准备一个不落盘的变更预览，先核对输入和输出。",
        "预览已经完成，我继续验证边界条件和回滚路径。",
    ],
    "code_edit": [
        "我准备先做一个最小范围的修改，尽量不影响旁边已经工作的逻辑。",
        "修改边界已经比较清楚了，我先把变更点收窄到这个函数和它的直接调用方。",
        "我正在对照现有代码整理补丁，先保留原来的接口和错误处理方式。",
        "这一步先不引入新的抽象，直接修正当前路径里的行为，再看测试反馈。",
    ],
    "test_run": [
        "我先跑一组针对性的测试，确认问题是否能稳定复现。",
        "测试正在跑，我会先看失败位置和输入形状，再决定要不要补边界用例。",
        "这一轮主要验证正常路径、空输入和异常分支，避免只看一个 happy path。",
        "测试结果出来后我再复核一次，确认没有因为修改一个地方而影响其它路径。",
    ],
    "debug_trace": [
        "我沿着调用链往回看，先确认状态是在什么时候发生变化的。",
        "这里有两个可能的分支，我分别核对一下实际输入和预期状态。",
        "我继续缩小范围，目前更值得关注的是边界条件而不是主流程。",
        "这个方向基本明确了，我再检查一次异常分支，避免过早下结论。",
    ],
}


def now_unix() -> int:
    return int(time.time())


def json_bytes(payload) -> bytes:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def estimate_tokens(text: str) -> int:
    """Return a stable, plausible token estimate without calling a tokenizer."""
    if not text:
        return 1
    ascii_chars = sum(ord(char) < 128 for char in text)
    non_ascii_chars = len(text) - ascii_chars
    return max(1, round(ascii_chars / 4 + non_ascii_chars / 1.7))


def simulated_usage(prompt: str, output: str) -> dict:
    input_tokens = estimate_tokens(prompt) + 96
    output_tokens = estimate_tokens(output)
    cached_tokens = min(input_tokens // 3, 64) if input_tokens > 160 else 0
    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
        "input_tokens_details": {"cached_tokens": cached_tokens},
        "output_tokens_details": {"reasoning_tokens": max(8, output_tokens // 5)},
    }


def split_stream_text_event(event):
    target = None
    text = ""
    if event.get("type") == "response.output_text.delta":
        target = "responses"
        text = str(event.get("delta", ""))
    elif event.get("object") == "chat.completion.chunk":
        choices = event.get("choices") or []
        if choices:
            target = "chat"
            text = str((choices[0].get("delta") or {}).get("content", ""))
    elif event.get("type") == "content_block_delta" and (event.get("delta") or {}).get("type") == "text_delta":
        target = "claude"
        text = str((event.get("delta") or {}).get("text", ""))
    elif str(event.get("type", "")).startswith("agent.") and isinstance(event.get("text"), str):
        target = "agent"
        text = event["text"]

    if not target or not text:
        yield event, False, True
        return

    last_index = len(text) - 1
    for index, character in enumerate(text):
        chunk = deepcopy(event)
        if target == "responses":
            chunk["delta"] = character
        elif target == "chat":
            chunk["choices"][0]["delta"]["content"] = character
        elif target == "claude":
            chunk["delta"]["text"] = character
        else:
            chunk["text"] = character
        yield chunk, True, index == last_index


def load_presets(path=None):
    preset_path = Path(path) if path else Path(__file__).with_name("presets.json")
    try:
        payload = json.loads(preset_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    presets = payload.get("presets", []) if isinstance(payload, dict) else []
    return [compile_preset(preset) for preset in presets if isinstance(preset, dict) and preset.get("steps")]


def extract_openai_prompt(body: dict) -> str:
    messages = body.get("messages") or []
    if not messages:
        return ""
    parts = []
    for message in messages:
        role = message.get("role", "user")
        content = message.get("content", "")
        if isinstance(content, list):
            text = " ".join(str(item.get("text", "")) for item in content if isinstance(item, dict))
        else:
            text = str(content)
        parts.append(f"{role}: {text}")
    return "\n".join(parts)


def extract_claude_prompt(body: dict) -> str:
    messages = body.get("messages") or []
    parts = []
    for message in messages:
        role = message.get("role", "user")
        content = message.get("content", "")
        if isinstance(content, list):
            text = " ".join(str(item.get("text", "")) for item in content if isinstance(item, dict))
        else:
            text = str(content)
        parts.append(f"{role}: {text}")
    return "\n".join(parts)


def extract_responses_prompt(body: dict) -> str:
    value = body.get("input", "")
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        value = [value]
    if not isinstance(value, list):
        return str(value)
    parts = []
    for item in value:
        if isinstance(item, str):
            parts.append(item)
            continue
        if not isinstance(item, dict):
            continue
        role = item.get("role", "user")
        content = item.get("content", item.get("text", ""))
        if isinstance(content, list):
            text = " ".join(
                str(part.get("text", part.get("value", "")))
                for part in content
                if isinstance(part, dict)
            )
        else:
            text = str(content)
        if text:
            parts.append(f"{role}: {text}")
    return "\n".join(parts)


def build_mock_text(prompt: str, closing: str = "") -> str:
    hint = prompt.strip().splitlines()[-1][:240] if prompt.strip() else "empty prompt"
    final = closing or random.choice(FINAL_TEMPLATES)
    return (
        "## 当前工作状态\n\n"
        f"> {final}\n\n"
        "### Execution summary\n\n"
        f"- **任务**：{hint}\n"
        "- **分析状态**：`validated`\n"
        "- **兼容模式**：`codex / claude`\n"
        "- **实际副作用**：`none`\n"
        "- **状态**：`ready`"
    )


def parse_modules(value):
    if isinstance(value, str):
        requested = [item.strip() for item in value.split(",") if item.strip()]
    elif isinstance(value, list):
        requested = [str(item) for item in value]
    else:
        requested = []
    return [item for item in requested if item in ACTIVITY_MODULES] or list(ACTIVITY_MODULES.keys())


def render_activity_line(module: str, line: str, prompt: str) -> str:
    scope = random.choice(COMPONENT_SCOPES)
    rendered = line.format(
        scope=scope,
        prompt=prompt.strip()[:80],
    )
    elapsed = f"{random.uniform(0.08, 4.5):0.2f}s"
    status = random.choice(["ok", "pending", "cached", "retry=0", "score=0.82"])
    return f"[{elapsed}] [{module}] {rendered} ({status})"


def generate_activity_events(prompt: str, modules, max_events: int):
    count = 0
    while max_events is None or count < max_events:
        module = random.choice(modules)
        script = ACTIVITY_MODULES[module]["lines"]
        for line in script:
            if max_events is not None and count >= max_events:
                break
            count += 1
            yield {
                "id": f"evt_{uuid.uuid4().hex[:12]}",
                "type": "agent.activity",
                "module": module,
                "created": now_unix(),
                "text": render_activity_line(module, line, prompt),
            }


def generate_conversation_events(prompt: str, modules, max_events: int):
    count = 0
    while max_events is None or count < max_events:
        module = random.choice(modules)
        line = random.choice(CONVERSATION_LINES[module])
        hint = prompt.strip().splitlines()[-1][:80] if prompt.strip() else "当前任务"
        if count == 0:
            line = f"关于“{hint}”，{line}"
        count += 1
        yield {
            "id": f"evt_{uuid.uuid4().hex[:12]}",
            "type": "agent.conversation",
            "module": module,
            "created": now_unix(),
            "text": line,
        }


def generate_preset_events(preset, max_events):
    steps = preset.get("steps", [])
    count = 0
    index = 0
    while steps and (max_events is None or count < max_events):
        step = steps[index % len(steps)]
        count += 1
        index += 1
        yield {
            "id": f"evt_{uuid.uuid4().hex[:12]}",
            "type": "agent.preset",
            "module": step.get("module", "research"),
            "created": now_unix(),
            "text": str(step.get("text", "我继续检查当前任务的上下文。")),
        }


class ActivityJob:
    def __init__(self, server, prompt, modules, max_events, duration_seconds, speed_factor):
        self.server = server
        self.id = f"job_{uuid.uuid4().hex[:12]}"
        self.prompt = prompt
        self.modules = modules
        self.max_events = max_events
        self.duration_seconds = duration_seconds
        self.speed_factor = speed_factor
        self.status = "queued"
        self.started_at = None
        self.finished_at = None
        self.event_count = 0
        self.events = []
        self.lock = threading.Lock()
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self.run, name=self.id, daemon=True)

    def start(self):
        self.thread.start()

    def stop(self):
        self.stop_event.set()

    def append_event(self, event):
        with self.lock:
            self.event_count += 1
            self.events.append(event)
            del self.events[:-200]

    def snapshot(self):
        with self.lock:
            return {
                "id": self.id,
                "status": self.status,
                "prompt": self.prompt,
                "modules": self.modules,
                "max_events": self.max_events,
                "duration_seconds": self.duration_seconds,
                "speed_factor": self.speed_factor,
                "started_at": self.started_at,
                "finished_at": self.finished_at,
                "event_count": self.event_count,
                "events": list(self.events),
            }

    def run(self):
        with self.lock:
            self.status = "running"
            self.started_at = now_unix()
        started = time.monotonic()
        try:
            for event in generate_activity_events(self.prompt, self.modules, self.max_events or None):
                if self.stop_event.is_set():
                    break
                if self.duration_seconds and time.monotonic() - started >= self.duration_seconds:
                    break
                self.append_event(event)
                interval = (self.server.delay + random.uniform(0, self.server.jitter)) / self.speed_factor
                if self.stop_event.wait(interval):
                    break
            with self.lock:
                self.status = "stopped" if self.stop_event.is_set() else "completed"
        except Exception:
            with self.lock:
                self.status = "failed"
        finally:
            with self.lock:
                self.finished_at = now_unix()



class MockAgentServer(BaseHTTPRequestHandler):
    server_version = "FakeCoding/0.1.0"

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            with self.server.jobs_lock:
                active_jobs = sum(job.status in {"queued", "running"} for job in self.server.jobs.values())
            self.send_json(
                {
                    "ok": True,
                    "product": "FakeCoding",
                    "service": "agent-nonsense",
                    "mode": "local-zero-token-simulator",
                    "upstream_calls": 0,
                    "token_usage": 0,
                    "active_jobs": active_jobs,
                }
            )
            return
        if parsed.path == "/v1/models":
            self.send_json(
                {
                    "object": "list",
                    "data": [
                        {"id": model_id, "object": "model", "created": now_unix(), "owned_by": "local-simulator"}
                        for model_id in MODEL_ALIASES
                    ],
                }
            )
            return
        if parsed.path == "/v1/agent/modules":
            self.send_json(
                {
                    "modules": [
                        {"name": name, "description": meta["description"]}
                        for name, meta in sorted(ACTIVITY_MODULES.items())
                    ]
                }
            )
            return
        if parsed.path == "/v1/agent/jobs":
            with self.server.jobs_lock:
                jobs = [job.snapshot() for job in self.server.jobs.values()]
            self.send_json({"jobs": jobs})
            return
        job_parts = parsed.path.strip("/").split("/")
        if len(job_parts) == 4 and job_parts[:3] == ["v1", "agent", "jobs"]:
            with self.server.jobs_lock:
                job = self.server.jobs.get(job_parts[3])
            if job is None:
                self.send_json({"error": "job not found"}, status=404)
                return
            self.send_json({"job": job.snapshot()})
            return
        if self.server.web_enabled and self.serve_web_asset(parsed.path):
            return
        self.send_json({"error": {"message": "Not found", "type": "not_found_error"}}, status=404)

    def serve_web_asset(self, request_path):
        web_root = self.server.web_root
        if not web_root or not web_root.is_dir():
            return False
        relative = request_path.lstrip("/") or "index.html"
        candidate = (web_root / relative).resolve()
        try:
            candidate.relative_to(web_root)
        except ValueError:
            return False
        if not candidate.is_file():
            if "." in Path(relative).name:
                return False
            candidate = web_root / "index.html"
        try:
            data = candidate.read_bytes()
        except OSError:
            return False
        content_type = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
        if content_type.startswith("text/") or content_type in {"application/javascript", "application/json", "image/svg+xml"}:
            content_type += "; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        if candidate.name == "index.html" or candidate.name in {"manifest.webmanifest", "sw.js"}:
            self.send_header("Cache-Control", "no-cache")
        elif candidate.parent.name == "assets":
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
            self.send_header("Cache-Control", "public, max-age=3600")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)
        return True

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        try:
            body = self.read_json()
        except ValueError as exc:
            self.send_json({"error": str(exc)}, status=400)
            return

        if parsed.path == "/v1/agent/jobs":
            self.handle_agent_job_start(body)
            return
        job_parts = parsed.path.strip("/").split("/")
        if len(job_parts) == 5 and job_parts[:3] == ["v1", "agent", "jobs"] and job_parts[4] == "stop":
            self.handle_agent_job_stop(job_parts[3])
            return
        if parsed.path == "/v1/chat/completions":
            self.handle_openai_chat(body)
            return
        if parsed.path == "/v1/responses":
            self.handle_openai_responses(body)
            return
        if parsed.path == "/v1/messages":
            self.handle_claude_messages(body)
            return
        # Kept for upstream compatibility.  The implementation below is a
        # bounded in-memory simulator and never touches the host filesystem.
        if parsed.path == "/tools/call" and (self.server.simulate_tools or self.server.native_tools):
            self.handle_tool_call(body)
            return
        if parsed.path == "/v1/agent/activity":
            self.handle_agent_activity(body)
            return

        self.send_json({"error": {"message": "Not found", "type": "not_found_error"}}, status=404)

    def read_json(self) -> dict:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except (TypeError, ValueError) as exc:
            raise ValueError("Content-Length must be an integer") from exc
        if length < 0:
            raise ValueError("Content-Length must be zero or greater")
        if length > self.server.max_request_bytes:
            raise ValueError(f"request body exceeds max_request_bytes={self.server.max_request_bytes}")
        raw = self.rfile.read(length)
        if not raw:
            return {}
        try:
            body = json.loads(raw.decode("utf-8"))
        except UnicodeDecodeError as exc:
            raise ValueError("request body must be valid UTF-8") from exc
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON: {exc}") from exc
        if not isinstance(body, dict):
            raise ValueError("JSON request body must be an object")
        return body

    def send_json(self, payload, status=200, headers=None):
        data = json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("X-Mock-Agent", "true")
        self.send_header("X-Upstream-Token-Usage", "0")
        self.send_header("X-Simulated-Usage", "true")
        self.send_header("X-Request-ID", f"req_{uuid.uuid4().hex[:24]}")
        if headers:
            for key, value in headers.items():
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(data)

    def send_sse(self, events, delay=None, character_delay=None, done_marker=True):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "close")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("X-Mock-Agent", "true")
        self.send_header("X-Upstream-Token-Usage", "0")
        self.send_header("X-Simulated-Usage", "true")
        self.send_header("X-Request-ID", f"req_{uuid.uuid4().hex[:24]}")
        self.end_headers()
        delay = self.server.delay if delay is None else max(0, delay)
        character_delay = self.server.character_delay if character_delay is None else max(0, character_delay)
        jitter_scale = delay / self.server.delay if self.server.delay else 0
        jitter = self.server.jitter * jitter_scale
        try:
            sequence_number = 0
            for event in events:
                for payload, is_text, is_last_character in split_stream_text_event(event):
                    event_type = str(payload.get("type", ""))
                    if event_type.startswith("response."):
                        payload = {**payload, "sequence_number": sequence_number}
                        sequence_number += 1
                    prefix = ""
                    if event_type in {
                        "message_start",
                        "content_block_start",
                        "content_block_delta",
                        "content_block_stop",
                        "message_delta",
                        "message_stop",
                    }:
                        prefix = f"event: {event_type}\n"
                    self.wfile.write(
                        f"{prefix}data: {json.dumps(payload, ensure_ascii=False)}\n\n".encode("utf-8")
                    )
                    self.wfile.flush()
                    if not is_text:
                        continue
                    if is_last_character:
                        if delay or jitter:
                            time.sleep(delay + random.uniform(0, jitter))
                    elif character_delay:
                        time.sleep(character_delay)
            if done_marker:
                self.wfile.write(b"data: [DONE]\n\n")
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            return
        finally:
            self.close_connection = True

    def stream_delays(self, body):
        try:
            speed_factor = float(body.get("speed_factor", self.server.default_speed_factor))
            character_delay = float(body.get("character_delay", self.server.character_delay))
        except (TypeError, ValueError) as exc:
            raise ValueError("speed_factor and character_delay must be numbers") from exc
        if not math.isfinite(speed_factor) or speed_factor <= 0:
            raise ValueError("speed_factor must be a positive number")
        if not math.isfinite(character_delay) or character_delay < 0:
            raise ValueError("character_delay must be zero or greater")
        return self.server.delay / speed_factor, character_delay / speed_factor

    def activity_delay(self, body):
        return self.stream_delays(body)[0]

    def handle_agent_job_start(self, body):
        try:
            max_events = int(body.get("max_events", 0))
            duration_seconds = max(0, float(body.get("duration_seconds", 0)))
            speed_factor = float(body.get("speed_factor", self.server.default_speed_factor))
            if max_events < 0 or max_events > 100000:
                raise ValueError("max_events must be between 0 and 100000")
            if duration_seconds > 86400:
                raise ValueError("duration_seconds must be at most 86400")
            if not math.isfinite(duration_seconds):
                raise ValueError("duration_seconds must be a finite number")
            if not math.isfinite(speed_factor) or speed_factor <= 0:
                raise ValueError("speed_factor must be a positive number")
        except (TypeError, ValueError) as exc:
            self.send_json({"error": str(exc)}, status=400)
            return

        job = ActivityJob(
            self.server,
            str(body.get("prompt", "")),
            parse_modules(body.get("modules")),
            max_events,
            duration_seconds,
            speed_factor,
        )
        with self.server.jobs_lock:
            self.server.jobs[job.id] = job
        job.start()
        self.send_json({"job": job.snapshot()})

    def handle_agent_job_stop(self, job_id):
        with self.server.jobs_lock:
            job = self.server.jobs.get(job_id)
        if job is None:
            self.send_json({"error": "job not found"}, status=404)
            return
        job.stop()
        job.thread.join(timeout=1)
        self.send_json({"job": job.snapshot()})

    def _virtual_path(self, value):
        """Normalize a virtual tool path without resolving it on disk."""
        raw = str(value or "").replace("\\", "/")
        path = Path(raw)
        if not raw or path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
            raise PermissionError("path must stay inside the virtual sandbox")
        normalized = "/".join(path.parts)
        if len(normalized) > 240:
            raise ValueError("path is too long")
        return normalized

    def handle_tool_call(self, body):
        """Serve the legacy /tools/call contract using virtual data only.

        This preserves clients that still send list/read/write tool calls while
        guaranteeing that no project file, temporary file, or server-side
        workspace is created.  Content is kept only in a small per-process map
        and disappears with the request server.
        """
        name = str(body.get("name", "")).strip()
        args = body.get("arguments") if isinstance(body.get("arguments"), dict) else {}
        try:
            if name == "list_files":
                result = {"files": sorted(self.server.virtual_files)}
            elif name == "read_file":
                path = self._virtual_path(args.get("path"))
                if path not in self.server.virtual_files:
                    raise FileNotFoundError(path)
                result = {"path": path, "content": self.server.virtual_files[path], "simulated": True}
            elif name == "write_file":
                path = self._virtual_path(args.get("path"))
                content = str(args.get("content", ""))
                if len(content.encode("utf-8")) > 64 * 1024:
                    raise ValueError("virtual file content exceeds 64 KiB")
                if len(self.server.virtual_files) >= 128 and path not in self.server.virtual_files:
                    raise ValueError("virtual sandbox file limit reached")
                self.server.virtual_files[path] = content
                result = {"path": path, "bytes": len(content.encode("utf-8")), "simulated": True, "persisted": False}
            else:
                self.send_json({"ok": False, "error": f"Unknown tool: {name}"}, status=400)
                return
            self.send_json({"ok": True, "result": result, "simulated": True})
        except PermissionError as exc:
            self.send_json({"ok": False, "error": str(exc)}, status=403)
        except FileNotFoundError as exc:
            self.send_json({"ok": False, "error": f"file not found: {exc}"}, status=404)
        except ValueError as exc:
            self.send_json({"ok": False, "error": str(exc)}, status=400)

    def select_preset(self, body, prompt):
        presets = getattr(self.server, "presets", [])
        if not presets or body.get("use_presets") is False:
            return None
        selected_id = body.get("_selected_preset")
        if selected_id:
            selected = next((preset for preset in presets if preset.get("id") == selected_id), None)
            if selected:
                return selected
        requested = str(body.get("preset", "")).strip().lower()
        if requested:
            matches = [preset for preset in presets if str(preset.get("id", "")).lower() == requested]
            if matches:
                body["_selected_preset"] = matches[0].get("id")
                return matches[0]
        selected = random.choice(presets)
        body["_selected_preset"] = selected.get("id")
        return selected

    def response_text(self, body, prompt):
        preset = self.select_preset(body, prompt)
        closing = preset.get("closing", "") if preset else ""
        return build_mock_text(prompt, closing)

    def conversation_events(self, body, prompt, modules, max_events, continuous):
        event_limit = None if continuous else max_events
        preset = self.select_preset(body, prompt)
        source = generate_preset_events(preset, None) if preset else generate_conversation_events(prompt, modules, None)
        count = 0
        while event_limit is None or count < event_limit:
            count += 1
            yield next(source)

    def openai_stream_events(self, body, prompt, modules, max_events, continuous):
        model = body.get("model", "agent-nonsense")
        completion_id = f"chatcmpl_{uuid.uuid4().hex[:16]}"
        created = now_unix()
        emitted = []
        for event in self.conversation_events(body, prompt, modules, max_events, continuous):
            emitted.append(event["text"] + "\n")
            yield {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": created,
                "model": model,
                "choices": [{"index": 0, "delta": {"content": event["text"] + "\n"}, "finish_reason": None}],
            }
        if continuous:
            return
        answer = self.response_text(body, prompt)
        emitted.append(answer)
        yield {
            "id": completion_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model,
            "choices": [{"index": 0, "delta": {"content": answer}, "finish_reason": None}],
        }
        yield {
            "id": completion_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model,
            "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
            "usage": {
                "prompt_tokens": simulated_usage(prompt, "".join(emitted))["input_tokens"],
                "completion_tokens": simulated_usage(prompt, "".join(emitted))["output_tokens"],
                "total_tokens": simulated_usage(prompt, "".join(emitted))["total_tokens"],
            },
        }

    def activity_event_limit(self, body, field="max_activity_events"):
        try:
            value = int(body.get(field, self.server.default_max_activity_events))
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{field} must be a positive integer") from exc
        if value <= 0:
            return self.server.default_max_activity_events
        if value > 100000:
            raise ValueError(f"{field} must be at most 100000")
        return value

    def handle_openai_chat(self, body: dict):
        prompt = extract_openai_prompt(body)
        try:
            delay, character_delay = self.stream_delays(body)
            max_events = self.activity_event_limit(body)
        except ValueError as exc:
            self.send_json({"error": str(exc)}, status=400)
            return
        if body.get("stream"):
            modules = parse_modules(body.get("modules"))
            continuous = bool(body.get("continuous", self.server.continuous_stream))
            self.send_sse(
                self.openai_stream_events(body, prompt, modules, max_events, continuous),
                delay=delay,
                character_delay=character_delay,
                done_marker=not continuous,
            )
            return

        message = {"role": "assistant", "content": self.response_text(body, prompt)}
        usage = simulated_usage(prompt, message["content"])
        finish_reason = "stop"
        self.send_json(
            {
                "id": f"chatcmpl_{uuid.uuid4().hex[:16]}",
                "object": "chat.completion",
                "created": now_unix(),
                "model": body.get("model", "agent-nonsense"),
                "choices": [{"index": 0, "message": message, "finish_reason": finish_reason}],
                "usage": {
                    "prompt_tokens": usage["input_tokens"],
                    "completion_tokens": usage["output_tokens"],
                    "total_tokens": usage["total_tokens"],
                },
            }
        )

    def responses_stream_events(self, body, prompt, modules, max_events, continuous):
        response_id = f"resp_{uuid.uuid4().hex[:24]}"
        item_id = f"msg_{uuid.uuid4().hex[:24]}"
        model = body.get("model", "agent-nonsense")
        assistant_item = {
            "id": item_id,
            "type": "message",
            "status": "in_progress",
            "role": "assistant",
            "content": [],
        }
        output_items = [assistant_item]
        response = {
            "id": response_id,
            "object": "response",
            "created_at": now_unix(),
            "status": "in_progress",
            "model": model,
            "output": [],
            "usage": None,
        }
        yield {"type": "response.created", "response": response}
        yield {
            "type": "response.output_item.added",
            "output_index": 0,
            "item": assistant_item,
        }
        yield {
            "type": "response.content_part.added",
            "item_id": item_id,
            "output_index": 0,
            "content_index": 0,
            "part": {"type": "output_text", "text": "", "annotations": []},
        }
        text_parts = []
        for event in self.conversation_events(body, prompt, modules, max_events, continuous):
            delta = event["text"] + "\n"
            text_parts.append(delta)
            yield {
                "type": "response.output_text.delta",
                "item_id": item_id,
                "output_index": 0,
                "content_index": 0,
                "delta": delta,
            }
        if continuous:
            return
        answer = self.response_text(body, prompt)
        text_parts.append(answer)
        full_text = "".join(text_parts)
        usage = simulated_usage(prompt, full_text)
        yield {
            "type": "response.output_text.delta",
            "item_id": item_id,
            "output_index": 0,
            "content_index": 0,
            "delta": answer,
        }
        yield {"type": "response.output_text.done", "item_id": item_id, "output_index": 0, "content_index": 0, "text": full_text}
        yield {"type": "response.content_part.done", "item_id": item_id, "output_index": 0, "content_index": 0}
        yield {
            "type": "response.output_item.done",
            "output_index": 0,
            "item": {**assistant_item, "status": "completed", "content": [{"type": "output_text", "text": full_text, "annotations": []}]},
        }
        output_items[0] = {**assistant_item, "status": "completed", "content": [{"type": "output_text", "text": full_text, "annotations": []}]}
        yield {
            "type": "response.completed",
            "response": {
                **response,
                "status": "completed",
                "output": output_items,
                "usage": usage,
            },
        }

    def handle_openai_responses(self, body: dict):
        prompt = extract_responses_prompt(body)
        modules = parse_modules(body.get("modules"))
        try:
            delay, character_delay = self.stream_delays(body)
            max_events = self.activity_event_limit(body)
        except ValueError as exc:
            self.send_json({"error": str(exc)}, status=400)
            return
        if body.get("stream"):
            continuous = bool(body.get("continuous", self.server.continuous_stream))
            self.send_sse(
                self.responses_stream_events(body, prompt, modules, max_events, continuous),
                delay=delay,
                character_delay=character_delay,
                done_marker=False,
            )
            return
        answer = self.response_text(body, prompt)
        usage = simulated_usage(prompt, answer)
        response_id = f"resp_{uuid.uuid4().hex[:24]}"
        self.send_json(
            {
                "id": response_id,
                "object": "response",
                "created_at": now_unix(),
                "status": "completed",
                "model": body.get("model", "agent-nonsense"),
                "output": [
                    {
                        "id": f"msg_{uuid.uuid4().hex[:24]}",
                        "type": "message",
                        "status": "completed",
                        "role": "assistant",
                        "content": [{"type": "output_text", "text": answer, "annotations": []}],
                    }
                ],
                "output_text": answer,
                "usage": usage,
            }
        )

    def claude_stream_events(self, body, prompt, modules, max_events, continuous):
        message_id = f"msg_{uuid.uuid4().hex[:24]}"
        input_tokens = simulated_usage(prompt, "")["input_tokens"]
        emitted = []
        yield {
            "type": "message_start",
            "message": {
                "id": message_id,
                "type": "message",
                "role": "assistant",
                "model": body.get("model", "agent-nonsense"),
                "content": [],
                "stop_reason": None,
                "stop_sequence": None,
                "usage": {"input_tokens": input_tokens, "output_tokens": 0},
            },
        }
        yield {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}}
        for event in self.conversation_events(body, prompt, modules, max_events, continuous):
            emitted.append(event["text"] + "\n")
            yield {
                "type": "content_block_delta",
                "index": 0,
                "delta": {"type": "text_delta", "text": event["text"] + "\n"},
            }
        if continuous:
            return
        answer = self.response_text(body, prompt) + "\n"
        emitted.append(answer)
        yield {
            "type": "content_block_delta",
            "index": 0,
            "delta": {"type": "text_delta", "text": answer},
        }
        yield {"type": "content_block_stop", "index": 0}
        yield {
            "type": "message_delta",
            "delta": {"stop_reason": "end_turn", "stop_sequence": None},
            "usage": {"output_tokens": simulated_usage(prompt, "".join(emitted))["output_tokens"]},
        }
        yield {"type": "message_stop"}

    def handle_claude_messages(self, body: dict):
        prompt = extract_claude_prompt(body)
        modules = parse_modules(body.get("modules"))
        try:
            delay, character_delay = self.stream_delays(body)
            max_events = self.activity_event_limit(body)
        except ValueError as exc:
            self.send_json({"error": str(exc)}, status=400)
            return
        if body.get("stream"):
            continuous = bool(body.get("continuous", self.server.continuous_stream))
            self.send_sse(
                self.claude_stream_events(body, prompt, modules, max_events, continuous),
                delay=delay,
                character_delay=character_delay,
                done_marker=False,
            )
            return
        activity = [event["text"] for event in self.conversation_events(body, prompt, modules, max_events, False)]
        text = "\n".join(activity + ["", self.response_text(body, prompt)])
        usage = simulated_usage(prompt, text)
        self.send_json(
            {
                "id": f"msg_{uuid.uuid4().hex[:24]}",
                "type": "message",
                "role": "assistant",
                "model": body.get("model", "agent-nonsense"),
                "content": [{"type": "text", "text": text}],
                "stop_reason": "end_turn",
                "stop_sequence": None,
                "usage": {"input_tokens": usage["input_tokens"], "output_tokens": usage["output_tokens"]},
            }
        )

    def handle_agent_activity(self, body: dict):
        prompt = str(body.get("prompt", ""))
        modules = parse_modules(body.get("modules"))
        try:
            max_events = int(body.get("max_events", 12))
        except (TypeError, ValueError):
            self.send_json({"error": "max_events must be an integer"}, status=400)
            return
        if max_events < 0 or max_events > 100000:
            self.send_json({"error": "max_events must be between 0 and 100000"}, status=400)
            return
        if body.get("stream", True):
            try:
                delay, character_delay = self.stream_delays(body)
            except ValueError as exc:
                self.send_json({"error": str(exc)}, status=400)
                return
            self.send_sse(generate_activity_events(prompt, modules, max_events), delay=delay, character_delay=character_delay)
            return
        self.send_json({"events": list(generate_activity_events(prompt, modules, max_events))})

    def log_message(self, fmt, *args):
        if self.server.quiet:
            return
        super().log_message(fmt, *args)


def create_server(
    host=DEFAULT_HOST,
    port=DEFAULT_PORT,
    presets=None,
    delay=2.0,
    jitter=0.32,
    character_delay=0.06,
    speed_factor=1.0,
    default_max_activity_events=16,
    continuous_stream=False,
    max_request_bytes=DEFAULT_MAX_REQUEST_BYTES,
    web=False,
    web_root=None,
    quiet=False,
    # Legacy compatibility knobs.  Tool calls remain virtual and in-memory;
    # sandbox is intentionally ignored so this service cannot edit a project.
    sandbox=None,
    simulate_tools=False,
    native_tools=False,
):
    if not math.isfinite(float(delay)) or delay < 0:
        raise ValueError("delay must be zero or greater")
    if not math.isfinite(float(jitter)) or jitter < 0 or jitter > 0.9:
        raise ValueError("jitter must be between 0 and 0.9")
    if not math.isfinite(float(speed_factor)) or speed_factor <= 0:
        raise ValueError("speed_factor must be a positive number")
    if default_max_activity_events <= 0:
        raise ValueError("default_max_activity_events must be positive")
    server = ThreadingHTTPServer((host, port), MockAgentServer)
    server.delay = max(0, delay)
    server.jitter = jitter
    server.character_delay = max(0, character_delay)
    server.default_speed_factor = speed_factor
    server.default_max_activity_events = default_max_activity_events
    server.continuous_stream = continuous_stream
    server.max_request_bytes = max_request_bytes
    server.web_enabled = bool(web)
    server.web_root = (Path(web_root).resolve() if web_root else Path(__file__).with_name("web").resolve())
    server.quiet = quiet
    server.sandbox = None
    server.simulate_tools = bool(simulate_tools)
    server.native_tools = bool(native_tools)
    server.virtual_files = {
        "notes/demo.txt": "This is simulated workspace context.\n",
        "notes/agent-context.txt": "No host files are read by Agent Nonsense.\n",
    }
    server.presets = load_presets(presets)
    server.jobs = {}
    server.jobs_lock = threading.Lock()
    return server


def build_argument_parser():
    parser = argparse.ArgumentParser(description="FakeCoding zero-side-effect Codex-style API simulator")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument(
        "--port",
        type=int,
        default=os.environ.get("FAKECODING_PORT", os.environ.get("AGENT_NONSENSE_PORT", str(DEFAULT_PORT))),
        help="Listening port (FAKECODING_PORT; AGENT_NONSENSE_PORT is a legacy alias)",
    )
    parser.add_argument("--presets", default=str(Path(__file__).with_name("presets.json")), help="JSON file containing long scripted conversations")
    parser.add_argument("--delay", type=float, default=2.0, help="Delay between streaming progress chunks")
    parser.add_argument("--jitter", type=float, default=0.32, help="Maximum additional random delay in seconds (0 to 0.9)")
    parser.add_argument("--character-delay", type=float, default=0.06, help="Delay between streamed text characters")
    parser.add_argument("--speed-factor", type=float, default=1.0, help="Default activity speed; greater than 1 is faster")
    parser.add_argument("--default-max-activity-events", type=int, default=16)
    parser.add_argument("--continuous-stream", action="store_true", help="Keep compatible streaming requests open until the client disconnects")
    parser.add_argument("--max-request-bytes", type=int, default=DEFAULT_MAX_REQUEST_BYTES)
    parser.add_argument("--web", action="store_true", help="Serve the bundled Codex web client and open it in the default browser")
    parser.add_argument("--web-root", help="Override the bundled web asset directory")
    parser.add_argument("--no-browser", action="store_true", help="Do not open a browser when --web is used")
    parser.add_argument("--sandbox", help="Deprecated compatibility option; virtual tools never access this path")
    parser.add_argument("--simulate-tools", action="store_true", help="Enable legacy virtual tool events (no filesystem writes)")
    parser.add_argument("--native-tools", action="store_true", help="Accept legacy native-tool flag; calls remain virtual")
    parser.add_argument("--quiet", action="store_true")
    return parser


def main():
    parser = build_argument_parser()
    args = parser.parse_args()

    if args.speed_factor <= 0:
        parser.error("--speed-factor must be a positive number")
    if not 1 <= args.port <= 65535:
        parser.error("--port must be between 1 and 65535")
    if args.delay < 0:
        parser.error("--delay must be zero or greater")
    if args.character_delay < 0:
        parser.error("--character-delay must be zero or greater")
    if not 0 <= args.jitter <= 0.9:
        parser.error("--jitter must be between 0 and 0.9")
    if args.default_max_activity_events <= 0:
        parser.error("--default-max-activity-events must be positive")

    server = create_server(
        host=args.host,
        port=args.port,
        presets=args.presets,
        delay=args.delay,
        jitter=args.jitter,
        character_delay=args.character_delay,
        speed_factor=args.speed_factor,
        default_max_activity_events=args.default_max_activity_events,
        continuous_stream=args.continuous_stream,
        max_request_bytes=args.max_request_bytes,
        web=args.web,
        web_root=args.web_root,
        quiet=args.quiet,
        sandbox=args.sandbox,
        simulate_tools=args.simulate_tools,
        native_tools=args.native_tools,
    )

    print(f"FakeCoding listening on http://{args.host}:{args.port}")
    stream_mode = "continuous compatible streams" if server.continuous_stream else "finite compatible streams"
    print(f"mode: FakeCoding zero-side-effect simulator; upstream calls: 0; {stream_mode}; presets: {len(server.presets)}")
    if args.web:
        if not server.web_root.joinpath("index.html").is_file():
            parser.error(f"web build not found at {server.web_root}; run `cd web; npm run build`")
        print(f"web client: http://{args.host}:{args.port}/")
        if not args.no_browser:
            threading.Timer(0.35, lambda: webbrowser.open(f"http://{args.host}:{args.port}/")).start()
    server.serve_forever()


if __name__ == "__main__":
    main()
