#!/usr/bin/env node
// MousaiNote Claude MCP — onboarding script
// Prompts for API key and patches the Claude Desktop config file.

import { readFile, writeFile, mkdir, access, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir, platform } from "node:os";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const PACKAGE_NAME = "mousainote-claude-mcp";
const SERVER_KEY = "mousai";

function resolveConfigPath() {
  const p = platform();
  if (p === "win32") {
    const appdata = process.env.APPDATA || join(homedir(), "AppData", "Roaming");
    return join(appdata, "Claude", "claude_desktop_config.json");
  }
  if (p === "darwin") {
    return join(homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
  }
  // Linux / others — Claude Desktop is not officially supported, but fall back to XDG-ish default.
  return join(homedir(), ".config", "Claude", "claude_desktop_config.json");
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readConfigOrDefault(path) {
  if (!(await fileExists(path))) return { mcpServers: {} };
  const raw = await readFile(path, "utf8");
  if (!raw.trim()) return { mcpServers: {} };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.mcpServers || typeof parsed.mcpServers !== "object") {
      parsed.mcpServers = {};
    }
    return parsed;
  } catch (e) {
    throw new Error(`기존 ${path} 가 유효한 JSON이 아닙니다: ${e.message}`);
  }
}

async function backup(path) {
  if (!(await fileExists(path))) return null;
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${path}.backup-${ts}`;
  await copyFile(path, backupPath);
  return backupPath;
}

async function main() {
  console.log("");
  console.log("  MousaiNote Claude MCP — 온보딩 설치 도우미");
  console.log("  ─────────────────────────────────────────");
  console.log("");

  const rl = createInterface({ input, output });

  try {
    const apiKey = (await rl.question("MousaiNote API Key를 붙여넣어 주세요: ")).trim();
    if (!apiKey) {
      console.error("\n❌ API Key가 비어있습니다. 설치를 중단합니다.");
      process.exit(1);
    }
    if (!apiKey.startsWith("mousai_sk_")) {
      const proceed = (await rl.question("⚠️  'mousai_sk_'로 시작하지 않는데 계속 진행할까요? (y/N): ")).trim().toLowerCase();
      if (proceed !== "y" && proceed !== "yes") {
        console.log("설치를 중단합니다.");
        process.exit(0);
      }
    }

    const configPath = resolveConfigPath();
    console.log(`\n📁 설정 파일 위치: ${configPath}`);

    const config = await readConfigOrDefault(configPath);
    const existing = config.mcpServers[SERVER_KEY];
    if (existing) {
      console.log(`⚠️  '${SERVER_KEY}' 항목이 이미 존재합니다.`);
      const overwrite = (await rl.question("덮어쓸까요? (y/N): ")).trim().toLowerCase();
      if (overwrite !== "y" && overwrite !== "yes") {
        console.log("설치를 중단합니다.");
        process.exit(0);
      }
    }

    const backupPath = await backup(configPath);
    if (backupPath) console.log(`💾 백업 생성: ${backupPath}`);

    config.mcpServers[SERVER_KEY] = {
      command: "npx",
      args: ["-y", PACKAGE_NAME],
      env: {
        MOUSAI_API_KEY: apiKey,
      },
    };

    await mkdir(dirname(configPath), { recursive: true });
    await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");

    console.log("\n✅ 설치 완료!");
    console.log("\n다음 단계:");
    console.log("  1) Claude Desktop을 '완전히' 종료하세요 (시스템 트레이 아이콘까지).");
    console.log("  2) Claude Desktop을 다시 실행하면 Mousai MCP 도구가 활성화됩니다.");
    console.log("  3) 대화창에서 '이 내용 MousaiNote에 저장해줘'처럼 말해보세요.");
    console.log("");
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error(`\n❌ 오류: ${err.message}`);
  process.exit(1);
});
