# MousaiNote Claude MCP

**English** | [한국어](./README.ko.md)

An **MCP (Model Context Protocol) server** that connects [MousaiNote](https://mousai.mousai.workers.dev) with Claude Desktop. Save, search, and browse memos, manage folders, and attach files — all from inside Claude conversations.

## ✨ Features

| Tool | Description |
|------|-------------|
| `create_mousai_memo` | Create a memo (optional folder + file attachments) |
| `update_mousai_memo` | Overwrite an existing memo's content |
| `delete_mousai_memo` | Move a memo to trash (soft delete, recoverable in-app) |
| `move_mousai_memo` | Move a memo to another folder (or to root) |
| `get_mousai_memos` | List recent memos (folder scoping supported) |
| `search_mousai_memos` | Keyword search (folder scoping supported) |
| `get_mousai_folders` | List user folders |
| `create_mousai_folder` | Create a new folder |
| `delete_mousai_folder` | Delete a folder (its memos move to root, not deleted) |
| `upload_mousai_file` | Save a file and get metadata for attaching to a note |

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
- *"Fix the typo in that memo"* → `update_mousai_memo` with the memo `id`
- *"Delete that memo"* → `delete_mousai_memo` (goes to trash, recoverable)
- *"Make a new folder called Research"* → `create_mousai_folder`
- *"Move this memo into the Research folder"* → `move_mousai_memo` with `folderId`
- *"Delete the Research folder"* → `delete_mousai_folder` (memos inside move to root)

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

### `update_mousai_memo`

- `id` (required) — target memo id (find it via `get_mousai_memos` / `search_mousai_memos`)
- `content` (required) — new markdown body; fully replaces the previous content
- PIN-locked memos cannot be edited.

### `delete_mousai_memo`

- `id` (required) — moved to trash (soft delete), recoverable in the app.

### `move_mousai_memo`

- `id` (required) — memo to move
- `folderId` (optional) — destination folder; omit to move to root (uncategorized)

### `create_mousai_folder`

- `name` (required) — returns the new folder `id` for use with `create_mousai_memo` / `move_mousai_memo`

### `delete_mousai_folder`

- `id` (required) — deletes the folder; memos inside are moved to root, not deleted.

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
