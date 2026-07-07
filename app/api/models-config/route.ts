import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync, openSync, writeSync, closeSync } from "fs";
import { join, dirname } from "path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";

export const dynamic = "force-dynamic";

function getModelsPath(): string {
  return join(getAgentDir(), "models.json");
}

function readModelsJson(): Record<string, unknown> {
  const path = getModelsPath();
  if (!existsSync(path)) return { providers: {} };
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch {
    return { providers: {} };
  }
}

function writeModelsJson(data: Record<string, unknown>): void {
  const path = getModelsPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const content = JSON.stringify(data, null, 2);
  // Try multiple write strategies because the dev server can run inside a sandbox
  // (e.g. Windows AppContainer) where direct file open is rejected with EPERM.
  const errors: unknown[] = [];
  // 1. Direct write
  try { writeFileSync(path, content, "utf8"); return; } catch (e) { errors.push(e); }
  // 2. Write to a sibling temp file then rename
  const tmp = path + ".tmp-" + process.pid;
  try {
    writeFileSync(tmp, content, "utf8");
    try { unlinkSync(path); } catch {}
    try { renameSync(tmp, path); return; } catch (e) { errors.push(e); }
  } catch (e) {
    errors.push(e);
  }
  // 3. Overwrite via low-level open/write/close
  try {
    const fd = openSync(path, "w");
    try { writeSync(fd, content); } finally { closeSync(fd); }
    return;
  } catch (e) { errors.push(e); }
  throw errors.find((e) => e instanceof Error) ?? new Error("Failed to write models.json");
}

export async function GET() {
  return NextResponse.json(readModelsJson());
}

export async function PUT(req: Request) {
  try {
    const body = await req.json() as Record<string, unknown>;
    writeModelsJson(body);
    // Model registry refreshes on each /api/models request (no local cache to invalidate)
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
