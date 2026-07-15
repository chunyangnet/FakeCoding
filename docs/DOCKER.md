# FakeCoding Docker 部署教程

该镜像使用 Node 多阶段构建 Web 客户端，最终运行镜像只包含 Python、`agent_nonsense` 和静态前端。运行阶段不包含 Node.js、npm 或前端源码依赖。

## 1. 前置条件

安装 Docker Desktop，并确认 PowerShell 中可以执行：

```powershell
docker --version
docker compose version
```

建议 Docker Desktop 至少分配 2 GB 内存。项目本身运行时限制为 512 MB。

## 2. 使用 Docker Compose 部署

默认端口为 `8084`。需要自定义端口时，在项目根目录创建 `.env`：

```powershell
Copy-Item .env.example .env
# 编辑 .env，将 FAKECODING_PORT 改为例如 9080
```

Compose 会同时修改宿主机端口和容器内服务端口。

```powershell
cd "D:\VS Code\Project\FakeToken"
docker compose build
docker compose up -d
```

该 Dockerfile 不依赖 BuildKit 或 buildx；旧版 Docker Engine 也可以使用
传统 builder 完成构建。若 Compose 仅提示 `buildx plugin` 警告，但构建继续
执行，可以忽略该警告。

打开：

```text
http://127.0.0.1:8084/
```

健康检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8084/health
docker compose ps
```

查看日志：

```powershell
docker compose logs -f --tail 200 fakecoding
```

停止或删除容器：

```powershell
docker compose stop
docker compose down
```

重新构建最新代码：

```powershell
docker compose down
docker compose build --no-cache
docker compose up -d
```

## 3. 直接使用 Docker CLI

构建镜像：

```powershell
docker build -t fakecoding:local .
```

安全限制模式启动：

```powershell
docker run -d `
  --name fakecoding `
  --restart unless-stopped `
  --read-only `
  --tmpfs /tmp:rw,noexec,nosuid,size=16m `
  --cap-drop ALL `
  --security-opt no-new-privileges `
  --pids-limit 128 `
  --memory 512m `
  --cpus 1 `
  -p 8084:8084 `
  fakecoding:local
```

查看状态：

```powershell
docker ps --filter name=fakecoding
docker logs -f fakecoding
```

删除：

```powershell
docker rm -f fakecoding
```

## 4. 修改端口

使用 Docker CLI 将服务端口改为 `9080`：

```powershell
docker run -d --name fakecoding -e FAKECODING_PORT=9080 -p 9080:9080 fakecoding:local
```

访问 `http://127.0.0.1:9080/`。

Compose 中修改：

```yaml
ports:
  - "${FAKECODING_PORT:-8084}:${FAKECODING_PORT:-8084}"
```

## 5. 反向代理

Nginx 示例：

```nginx
server {
    listen 80;
    server_name codex.example.com;

    location / {
        proxy_pass http://127.0.0.1:8084;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`proxy_buffering off` 对 SSE 字符流非常重要。启用 HTTPS 时可使用 Certbot 或现有证书配置。

## 6. 数据与资源行为

- 容器没有挂载项目目录或持久化卷。
- Compose 默认启用只读根文件系统、移除全部 Linux capabilities，并禁止权限提升。
- `/tmp` 是最大 16 MB 的临时内存文件系统，容器删除后自动消失。
- 服务不会读取、写入、修改或编译宿主机项目文件。
- 前端附件只读取浏览器提供的文件名，不上传或持久化文件内容。
- Diff、终端、测试和文件变更均为浏览器端模拟展示。
- 额度统计仅保存在用户浏览器 IndexedDB 中，不写入容器或服务器。
- 后端只保留当前进程内的模拟 Job 状态；容器重启后消失。

## 7. 更新与回滚

更新：

```powershell
git pull
docker compose build
docker compose up -d
```

保留旧镜像用于回滚：

```powershell
docker tag fakecoding:local fakecoding:backup
docker compose build
docker compose up -d
```

回滚：

```powershell
docker compose down
docker run -d --name fakecoding -p 8084:8084 fakecoding:backup
```

## 8. 常见问题

### 页面可以打开但流式响应不更新

检查反向代理是否禁用了响应缓冲，并增加读取超时。

### 端口被占用

```powershell
Get-NetTCPConnection -LocalPort 8084
```

修改宿主机映射端口，或者停止占用该端口的进程。

### Docker 健康检查失败

```powershell
docker inspect fakecoding --format '{{json .State.Health}}'
docker logs fakecoding
```

### 清空浏览器本地统计

进入“设置 → 额度统计 → 清除统计”。这不会影响任务或服务器。
