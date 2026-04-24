#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { randomUUID } from "node:crypto";

const MCP_API_URL = "https://mousai.mousai.workers.dev/api/mcp";

const MOUSAI_API_KEY = process.env.MOUSAI_API_KEY;

if (!MOUSAI_API_KEY) {
  console.error("MOUSAI_API_KEY 환경 변수가 필요합니다.");
  process.exit(1);
}

// Cloudflare Worker mcp-api에 action/payload를 전송하는 공통 호출 함수
async function callMcpApi(action, payload) {
  const response = await fetch(MCP_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MOUSAI_API_KEY}`,
    },
    body: JSON.stringify({ action, payload }),
  });

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`API 응답 파싱 실패 (${response.status} ${response.statusText})`);
  }

  if (!response.ok || body?.success === false || body?.error) {
    const message = body?.error || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return body.data;
}

// 확장자 → MIME 타입 매핑 (주요 타입만 포함, 미매칭 시 octet-stream)
const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".heic": "image/heic",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
  ".csv": "text/csv",
  ".html": "text/html",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".zip": "application/zip",
};

function guessMime(fileName) {
  return MIME_BY_EXT[extname(fileName).toLowerCase()] || "application/octet-stream";
}

// 파일 하나를 업로드하고 { r2Key, name, size, type } 을 반환
async function uploadOne({ path, base64Data, fileName, mimeType }) {
  let b64 = base64Data;
  let name = fileName;
  let type = mimeType;

  if (path) {
    const buf = await readFile(path);
    b64 = buf.toString("base64");
    name = name || basename(path);
    type = type || guessMime(name);
  } else if (base64Data) {
    if (!name) throw new Error("base64Data로 업로드할 때는 fileName이 필요합니다.");
    type = type || guessMime(name);
  } else {
    throw new Error("path 또는 base64Data 중 하나는 반드시 제공해야 합니다.");
  }

  return callMcpApi("upload_file", {
    fileName: name,
    mimeType: type,
    base64Data: b64,
  });
}

// 업로드 응답을 메모 첨부 포맷의 imageIds 아이템으로 변환
function toAttachment(uploadData) {
  return {
    id: randomUUID(),
    name: uploadData.name,
    size: uploadData.size,
    type: uploadData.type,
    r2Key: uploadData.r2Key,
  };
}

const server = new Server(
  {
    name: "Mousai-MCP",
    version: "5.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_mousai_memo",
        description: "Mousai에 새로운 메모를 생성하고 저장합니다. 리서치, 아이디어 정리, 코드 스니펫 등을 사용자의 개인 지식창고에 저장할 때 반드시 사용하세요. 사용자가 특정 폴더를 지정하면, 먼저 get_mousai_folders로 폴더 목록을 조회한 뒤 해당 폴더의 id를 folderId로 전달하세요. 파일을 첨부하려면 files 배열에 파일 경로나 base64 데이터를 담으면 자동으로 업로드 후 메모에 연결됩니다. 이미 upload_mousai_file로 업로드한 파일이라면 imageIds에 직접 배열을 넣어도 됩니다.",
        inputSchema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "저장할 메모의 내용 (마크다운 포맷)",
            },
            folderId: {
              type: "string",
              description: "메모를 저장할 폴더의 ID (선택). 지정하지 않으면 루트에 저장됩니다. 폴더 ID를 모를 경우 먼저 get_mousai_folders를 호출해서 확인하세요.",
            },
            files: {
              type: "array",
              description: "메모에 첨부할 파일 목록 (선택). 각 항목은 자동으로 업로드된 뒤 imageIds로 조립됩니다. path 또는 base64Data 중 하나가 필요합니다.",
              items: {
                type: "object",
                properties: {
                  path: {
                    type: "string",
                    description: "로컬 파일의 절대 경로 (예: C:/Users/.../image.png)",
                  },
                  base64Data: {
                    type: "string",
                    description: "파일 내용을 Base64로 인코딩한 문자열 (path 대신 사용)",
                  },
                  fileName: {
                    type: "string",
                    description: "파일명. path 제공 시 생략 가능하며 자동으로 추출됩니다.",
                  },
                  mimeType: {
                    type: "string",
                    description: "MIME 타입 (예: image/png). 생략 시 확장자 기반으로 추론합니다.",
                  },
                },
              },
            },
            imageIds: {
              type: "array",
              description: "이미 upload_mousai_file로 업로드된 파일 메타데이터 배열 (선택). 각 항목 형식: { id, name, size, type, r2Key }. id는 랜덤 UUID여야 합니다.",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  size: { type: "number" },
                  type: { type: "string" },
                  r2Key: { type: "string" },
                },
                required: ["id", "name", "size", "type", "r2Key"],
              },
            },
          },
          required: ["content"],
        },
      },
      {
        name: "upload_mousai_file",
        description: "파일을 노트 저장소에 저장하고 메모 첨부에 필요한 메타데이터({ r2Key, name, size, type })를 반환합니다. 보통은 create_mousai_memo의 files 파라미터가 자동으로 처리하므로 이 도구를 직접 부를 필요는 적지만, 파일만 먼저 저장해두고 나중에 메모에 붙이고 싶을 때 사용하세요.",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "업로드할 로컬 파일의 절대 경로. base64Data와 둘 중 하나만 제공.",
            },
            base64Data: {
              type: "string",
              description: "파일 내용을 Base64로 인코딩한 문자열. path와 둘 중 하나만 제공.",
            },
            fileName: {
              type: "string",
              description: "파일명. path 제공 시 생략 가능 (자동 추출). base64Data 사용 시에는 필수.",
            },
            mimeType: {
              type: "string",
              description: "MIME 타입 (예: image/png). 생략 시 확장자 기반으로 추론합니다.",
            },
          },
        },
      },
      {
        name: "get_mousai_folders",
        description: "사용자의 Mousai 폴더 목록(id, name)을 조회합니다. create_mousai_memo로 메모를 특정 폴더에 저장하기 전에 이 도구를 먼저 호출해서 해당 폴더의 ID를 확인하세요.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "search_mousai_memos",
        description: "Mousai 지식창고에서 키워드로 메모를 검색합니다. 사용자가 저장했던 과거 내용을 찾거나 관련 메모를 참고할 때 사용하세요. folderId를 지정하면 해당 폴더 안에서만 검색합니다.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "검색할 키워드 또는 문구",
            },
            folderId: {
              type: "string",
              description: "검색 범위를 특정 폴더로 제한할 때 사용하는 폴더 ID (선택). 폴더 ID를 모르면 먼저 get_mousai_folders로 확인하세요.",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_mousai_memos",
        description: "Mousai 지식창고의 최근 메모 목록을 조회합니다. 최근에 저장한 메모를 훑어보거나 참고할 때 사용하세요. folderId를 지정하면 해당 폴더 안의 메모만 조회합니다.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "조회할 메모 개수",
              default: 20,
            },
            folderId: {
              type: "string",
              description: "조회 범위를 특정 폴더로 제한할 때 사용하는 폴더 ID (선택). 폴더 ID를 모르면 먼저 get_mousai_folders로 확인하세요.",
            },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    let data;
    let text;

    if (name === "create_mousai_memo") {
      const { content, folderId, files, imageIds: preBuilt } = args;

      // files가 주어지면 순차적으로 업로드하여 attachments 조립
      const attachments = [];
      if (Array.isArray(preBuilt) && preBuilt.length > 0) {
        attachments.push(...preBuilt);
      }
      if (Array.isArray(files) && files.length > 0) {
        for (const f of files) {
          const uploaded = await uploadOne(f);
          attachments.push(toAttachment(uploaded));
        }
      }

      const payload = {
        content,
        ...(folderId ? { folderId } : {}),
        ...(attachments.length > 0 ? { imageIds: attachments } : {}),
      };
      data = await callMcpApi("create_memo", payload);
      text = `메모를 성공적으로 저장했습니다${folderId ? ` (폴더: ${folderId})` : ""}${
        attachments.length > 0 ? ` / 첨부 ${attachments.length}개` : ""
      }.\n\n${JSON.stringify({ memo: data, attachments }, null, 2)}`;
    } else if (name === "upload_mousai_file") {
      data = await uploadOne(args);
      text = `파일 업로드 완료: ${data.name} (${data.size} bytes, ${data.type})\n\n${JSON.stringify(data, null, 2)}`;
    } else if (name === "get_mousai_folders") {
      data = await callMcpApi("get_folders", {});
      const count = Array.isArray(data) ? data.length : (data?.folders?.length ?? 0);
      text = `폴더 ${count}개\n\n${JSON.stringify(data, null, 2)}`;
    } else if (name === "search_mousai_memos") {
      const { query, folderId } = args;
      const payload = { query, ...(folderId ? { folderId } : {}) };
      data = await callMcpApi("search_memos", payload);
      const count = Array.isArray(data) ? data.length : (data?.results?.length ?? 0);
      text = `검색 결과 ${count}건${folderId ? ` (폴더: ${folderId})` : ""}\n\n${JSON.stringify(data, null, 2)}`;
    } else if (name === "get_mousai_memos") {
      const { limit = 20, folderId } = args;
      const payload = { limit, ...(folderId ? { folderId } : {}) };
      data = await callMcpApi("get_memos", payload);
      const count = Array.isArray(data) ? data.length : (data?.memos?.length ?? 0);
      text = `메모 ${count}건 조회 (limit=${limit}${folderId ? `, 폴더: ${folderId}` : ""})\n\n${JSON.stringify(data, null, 2)}`;
    } else {
      throw new Error(`알 수 없는 Tool: ${name}`);
    }

    return {
      content: [{ type: "text", text }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Mousai 요청 실패: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Mousai MCP Server is running...");
}

main().catch(console.error);
