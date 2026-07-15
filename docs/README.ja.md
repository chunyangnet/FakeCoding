# FakeCoding

FakeCoding は、Codex デスクトップクライアントを参考にした **偽の Token 使用量、疑似コーディング活動、ローカル API デモ** のためのワークスペースです。大規模プロジェクトを本当に開発しているような画面を表示しますが、実際のモデル呼び出し、実 Token 消費、コマンド実行、プロジェクトファイルの変更は行いません。

[中文 README](../README.md) · [English](README.en.md)

## 主な機能

- React、TypeScript、Vite、PWA によるデスクトップ風ワークスペース。
- Codex / ChatGPT モード、Projects、Recent tasks、Pinned tasks、検索、アーカイブ、名前変更、削除。
- OpenAI Responses、Chat Completions、Anthropic Messages、Agent Jobs 互換 API。
- 任意の UTF-8 chunk 境界に対応した SSE パーサー、文字単位ストリーミング、AbortController 停止、切断・エラー表示。
- 十種類の長編エンジニアリングシナリオ。各プリセットは 12,000 文字以上の段階的な作業記録に展開されます。
- Markdown/GFM、コードブロック、コピー、疑似ターミナル、テスト結果、Diff レビュー。
- 右下のモデル / 推論強度コンポーネント：軽度、中、高、極高、最高。
- ドラッグ操作とキーボード操作。極高・最高では光の走査、粒子、リング、リバウンド、環境光を表示。
- ローカル使用量画面：総 Token、入力/出力 Token、リクエスト数、消費量、残量、履歴。
- タスク、設定、使用量はブラウザ IndexedDB にだけ保存。`1 単位 = 1,000 simulated tokens`。

## 副作用ゼロの保証

FakeCoding は実行環境ではなく、画面とプロトコルのシミュレーターです。

- OpenAI、Anthropic、その他の上流サービスへ接続しません。
- 添付ファイルは名前だけを表示し、内容をアップロードしません。
- Diff、ターミナル、テスト、ファイル変更はブラウザ上の疑似表示です。
- Python サービスはワークスペースのファイルを作成・変更・削除しません。
- Job はプロセス内メモリだけに存在し、再起動で消えます。
- Token 使用量と quota はブラウザ IndexedDB に保存されます。
- 旧 `/tools/call` は既定で無効です。互換モードでも有限サイズのメモリ上仮想バッファのみを使用し、`--sandbox` の実ファイルにはアクセスしません。

## Windows PowerShell での起動

必要環境：Python 3.10 以上、フロントエンド開発には Node.js 20 以上。

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

一つの PowerShell コマンドで起動する場合：

```powershell
cd "D:\VS Code\Project\FakeToken"
./scripts/dev-web.ps1
```

本番ビルド：

```powershell
cd web
npm install
npm run build
cd ..
python -m agent_nonsense --web --no-browser
```

`http://127.0.0.1:8084/` を開いてください。既定値は `8084` です。
`FAKECODING_PORT` で変更でき、`AGENT_NONSENSE_PORT` は旧互換 alias です。

互換コマンドを含め、次の二つが利用できます。

```powershell
fakecoding --web
agent-nonsense --web
```

## Responses API の例

```powershell
$body = @{
  model = "agent-nonsense"
  input = "大規模な分散オーケストレーションプロジェクトを続け、詳細な検証ログを表示してください"
  stream = $true
  continuous = $false
  reasoning = "ultra"
  character_delay = 0.04
  speed_factor = 1
} | ConvertTo-Json

Invoke-WebRequest http://127.0.0.1:8084/v1/responses `
  -Method Post -ContentType "application/json" -Body $body
```

ストリームは `response.created`、`response.output_text.delta`、`response.output_text.done`、`response.completed` を送信します。有限ストリームと continuous 長時間ストリームの両方に対応します。

```powershell
Invoke-RestMethod http://127.0.0.1:8084/health
Invoke-RestMethod http://127.0.0.1:8084/v1/models
Invoke-RestMethod http://127.0.0.1:8084/v1/agent/modules
```

全 API は [`API.md`](API.md) を参照してください。

## 長い疑似プロジェクト会話

プリセットは `agent_nonsense/presets.json` にあります。ファイル境界、API timeout、フロントエンド状態、データベース移行、依存関係更新、CI の不安定性、メモリ増加、並行処理 race、認証権限、リリース手順を扱います。

`agent_nonsense/longform.py` は各シナリオを、コンテキスト収集、依存関係マップ、最小変更、検証、回帰確認、リリースリスクまで含む長い作業ログへ展開します。内容は事前に用意したテキストとランダム化された状態であり、実際のリポジトリを検査した結果ではありません。

さらに長くする場合は `steps` を追加するか、コンパイラの `minimum_chars` を増やしてください。ブラウザ側の更新はスロットリングされるため、表示が重くなりにくい構成です。

## アニメーション

- 文字単位のストリーミングカーソルとメッセージ更新のスロットリング。
- 実行中・接続状態の pulse、レビュー パネルの入場アニメーション。
- Popover、メニュー、設定ダイアログの 120–220ms トランジション。
- 極高・最高の track shine、shell wave、particle、ring、pill ambient glow。
- `prefers-reduced-motion` に対応。

## テスト

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

Compose のポートを変更する場合は `.env.example` を `.env` にコピーし、
`FAKECODING_PORT=9080` に変更して `docker compose up -d --build` を実行します。

Node の multi-stage build、Python slim runtime、非 root、read-only root filesystem、host volume なし、capability 削除、CPU/メモリ制限を使用します。ポート変更、Nginx の SSE proxy、更新と rollback は [`DOCKER.md`](DOCKER.md) を参照してください。

## ライセンス

Apache License 2.0 です。詳細は [`../LICENSE`](../LICENSE) を参照してください。

Copyright 2026 FakeCoding contributors.
