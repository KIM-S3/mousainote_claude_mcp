# MousaiNote Claude MCP

[MousaiNote](https://mousai.mousai.workers.dev)와 Claude Desktop을 연결하는 **MCP(Model Context Protocol) 서버**입니다. Claude와 대화하면서 메모를 저장·검색·조회하고, 폴더를 관리하고, 파일을 첨부할 수 있습니다.

## ✨ 주요 기능

| Tool | 설명 |
|------|------|
| `create_mousai_memo` | 메모 생성 (폴더 지정·파일 첨부 지원) |
| `get_mousai_memos` | 최근 메모 목록 조회 (폴더 필터링 지원) |
| `search_mousai_memos` | 키워드 검색 (폴더 필터링 지원) |
| `get_mousai_folders` | 폴더 목록 조회 |
| `upload_mousai_file` | 파일을 R2에 업로드하여 메모 첨부용 메타데이터 발급 |

## 📋 사전 요구사항

- **Node.js 18 이상** (네이티브 `fetch` 필요)
- **Claude Desktop**
- **MousaiNote 개인 API 키** — MousaiNote 앱 설정에서 발급받으세요.

## 🚀 설치 방법

### 1. 저장소 클론 & 의존성 설치

```bash
git clone https://github.com/KIM-S3/mousainote_claude_mcp.git
cd mousainote_claude_mcp
npm install
```

### 2. Claude Desktop 설정

Claude Desktop의 설정 파일을 엽니다:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

`mcpServers` 객체에 아래 항목을 추가하세요. **`args`의 경로는 방금 클론한 `mousai-mcp.js`의 절대 경로로 바꾸고**, `MOUSAI_API_KEY`에는 발급받은 본인의 API 키를 넣으세요.

```json
{
  "mcpServers": {
    "mousai": {
      "command": "node",
      "args": [
        "/absolute/path/to/mousainote_claude_mcp/mousai-mcp.js"
      ],
      "env": {
        "MOUSAI_API_KEY": "mousai_sk_여기에_본인_API_키"
      }
    }
  }
}
```

### 3. Claude Desktop 재시작

설정을 저장한 뒤 Claude Desktop을 **완전히 종료하고 다시 시작**하세요 (시스템 트레이 아이콘까지 닫기).

## 💬 사용 예시

Claude 대화창에 자연스럽게 요청하면 됩니다:

- "이 내용 MousaiNote에 저장해줘" → `create_mousai_memo`
- "Claude 폴더에 저장해줘" → `get_mousai_folders`로 폴더 id를 먼저 조회한 뒤 `create_mousai_memo` 호출
- "MousaiNote에서 'React' 검색해줘" → `search_mousai_memos`
- "최근 메모 10개 보여줘" → `get_mousai_memos`
- "이 스크린샷 `C:/Users/.../shot.png` 첨부해서 저장해줘" → `create_mousai_memo`의 `files` 파라미터로 자동 업로드 & 첨부

## 🛠️ 도구 파라미터

### `create_mousai_memo`

```json
{
  "content": "메모 본문 (마크다운)",
  "folderId": "folder_... (선택)",
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

- `files`를 주면 자동으로 업로드 후 첨부 메타데이터가 조립됩니다.
- `imageIds`는 `upload_mousai_file`로 이미 업로드한 파일을 바로 첨부할 때 사용합니다.
- 둘 다 생략하면 텍스트 전용 메모가 생성됩니다.

### `get_mousai_memos` / `search_mousai_memos`

- `limit` (get 전용, 기본 20)
- `query` (search 전용, 필수)
- `folderId` (선택) — 특정 폴더로 범위 제한

### `upload_mousai_file`

- `path` 또는 `base64Data` 중 하나 필수
- `fileName`, `mimeType` 생략 시 확장자 기반 추론

## 🔒 보안

- API 키는 **절대 공개 저장소나 클라이언트 코드에 넣지 마세요**. 이 프로젝트는 `process.env.MOUSAI_API_KEY`만 사용하며 키를 파일에 저장하지 않습니다.
- `claude_desktop_config.json`은 로컬에만 존재하며 절대 공유하지 마세요.
- 키가 유출된 것 같으면 즉시 MousaiNote 앱에서 키를 재발급하세요.

## 🐞 문제 해결

| 증상 | 원인/조치 |
|------|----------|
| `MOUSAI_API_KEY 환경 변수가 필요합니다` | Claude Desktop config의 `env` 블록에 키가 없거나 오타. |
| Claude에 툴이 보이지 않음 | Claude Desktop을 시스템 트레이에서 완전히 종료 후 재시작. |
| `401 Unauthorized` | API 키가 잘못되었거나 만료됨. MousaiNote 앱에서 재발급. |
| `ENOENT: no such file or directory` | `args`의 경로가 잘못됨. 절대경로 확인. Windows에선 슬래시 `/` 권장. |

## 📄 라이선스

MIT © KIM-S3

## 🙌 기여

이슈와 Pull Request 환영합니다: https://github.com/KIM-S3/mousainote_claude_mcp
