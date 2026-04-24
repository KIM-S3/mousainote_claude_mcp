# MousaiNote Claude MCP

[한국어](./README.md) | **English**

An **MCP (Model Context Protocol) server** that connects [MousaiNote](https://mousai.mousai.workers.dev) with Claude Desktop. Save, search, and browse memos, manage folders, and attach files — all from inside Claude conversations.

## ✨ Features

| Tool | Description |
|------|-------------|
| `create_mousai_memo` | Create a memo (optional folder + file attachments) |
| `get_mousai_memos` | List recent memos (folder scoping supported) |
| `search_mousai_memos` | Keyword search (folder scoping supported) |
| `get_mousai_folders` | List user folders |
| `upload_mousai_file` | Upload a file to R2 and get attachment metadata |

## 📋 Prerequisites

- **Node.js 18+** (required for native `fetch`)
- **Claude Desktop**
- **A MousaiNote personal API key** — generate one in the MousaiNote app settings.

## 🚀 Installation

### Option A — One-line install (recommended)

```bash
npx mousainote-claude-mcp mousainote-mcp-init
```

This interactive script will ask for your API key and automatically patch your Claude Desktop config. After it finishes, restart Claude Desktop.

### Option B — Manual install

1. Open your Claude Desktop config file:
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

2. Add the `mousai` entry under `mcpServers`:

```json
{
  "mcpServers": {
    "mousai": {
      "command": "npx",
      "args": ["-y", "mousainote-claude-mcp"],
      "env": {
        "MOUSAI_API_KEY": "mousai_sk_your_key_here"
      }
    }
  }
}
```

3. Fully quit Claude Desktop (including the system tray icon) and relaunch it.

### Option C — Clone from source

```bash
git clone https://github.com/KIM-S3/mousainote_claude_mcp.git
cd mousainote_claude_mcp
npm install
```

Then point your Claude Desktop config at the absolute path of `mousai-mcp.js`:

```json
{
  "mcpServers": {
    "mousai": {
      "command": "node",
      "args": ["/absolute/path/to/mousai-mcp.js"],
      "env": { "MOUSAI_API_KEY": "mousai_sk_..." }
    }
  }
}
```

## 💬 Usage Examples

Just ask Claude naturally:

- *"Save this to MousaiNote"* → `create_mousai_memo`
- *"Save it to the Claude folder"* → Claude resolves the folder id via `get_mousai_folders` and calls `create_mousai_memo` with `folderId`
- *"Search my MousaiNote for 'React'"* → `search_mousai_memos`
- *"Show me the 10 most recent memos"* → `get_mousai_memos`
- *"Attach this screenshot at `C:/.../shot.png` and save it"* → `create_mousai_memo` uses `files` to auto-upload and attach

## 🛠️ Tool Parameters

### `create_mousai_memo`

```json
{
  "content": "memo body (markdown)",
  "folderId": "folder_... (optional)",
  "files": [
    { "path": "/absolute/path/to/file.png" },
    { "base64Data": "...", "fileName": "doc.pdf", "mimeType": "application/pdf" }
  ],
  "imageIds": [
    {
      "id": "uuid",
      "name": "file.png",
      "size": 12345,
      "type": "image/png",
      "r2Key": "..."
    }
  ]
}
```

- Supply `files` to auto-upload and attach.
- Supply `imageIds` to attach files that were already uploaded via `upload_mousai_file`.
- Omit both to create a text-only memo.

### `get_mousai_memos` / `search_mousai_memos`

- `limit` (get only, default 20)
- `query` (search only, required)
- `folderId` (optional) — scope to a single folder

### `upload_mousai_file`

- Either `path` or `base64Data` is required
- `fileName`, `mimeType` are inferred from the extension when omitted

## 🔒 Security

- **Never** commit your API key to a public repository or embed it in client code. This project only reads `process.env.MOUSAI_API_KEY` — it never stores keys in any file.
- `claude_desktop_config.json` lives on your machine only — don't share it.
- If you suspect a key leak, regenerate your key in the MousaiNote app immediately.

## 🐞 Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| `MOUSAI_API_KEY 환경 변수가 필요합니다` | Missing/typo in the `env` block of your Claude Desktop config. |
| Tools don't appear in Claude | Fully quit Claude Desktop from the system tray, then relaunch. |
| `401 Unauthorized` | Key is wrong or expired — regenerate in the MousaiNote app. |
| `ENOENT: no such file or directory` | Wrong path in `args`. Use absolute paths (forward slashes on Windows). |

## 📄 License

MIT © KIM-S3

## 🙌 Contributing

Issues and pull requests welcome: https://github.com/KIM-S3/mousainote_claude_mcp
