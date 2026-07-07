import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync, openSync, writeSync, closeSync, renameSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ provider: string }> };

// Bypass AuthStorage: in some sandboxes AuthStorage.persistProviderChange() is
// short-circuited by loadError and silently does nothing, so we read/write
// auth.json directly. File format is identical: { [provider]: { type, key, ... } }
function getAuthPath(): string {
  return join(getAgentDir(), "auth.json");
}

function ensureAuthDir(): void {
  const dir = dirname(getAuthPath());
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
}

function readAuth(): Record<string, unknown> {
  const path = getAuthPath();
  if (!existsSync(path)) return {};
  try { return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>; }
  catch { return {}; }
}

function writeAuthRaw(content: string): void {
  const path = getAuthPath();
  ensureAuthDir();
  const errors: unknown[] = [];
  try { writeFileSync(path, content, { encoding: "utf-8", mode: 0o600 }); chmodSync(path, 0o600); return; } catch (e) { errors.push(e); }
  const tmp = path + ".tmp-" + process.pid;
  try {
    writeFileSync(tmp, content, { encoding: "utf-8", mode: 0o600 });
    try { unlinkSync(path); } catch {}
    renameSync(tmp, path); chmodSync(path, 0o600); return;
  } catch (e) { errors.push(e); }
  try {
    const fd = openSync(path, "w");
    try { writeSync(fd, content); } finally { closeSync(fd); }
    chmodSync(path, 0o600); return;
  } catch (e) { errors.push(e); }
  throw errors.find((e) => e instanceof Error) ?? new Error("Failed to write auth.json");
}

function writeAuth(data: Record<string, unknown>): void {
  writeAuthRaw(JSON.stringify(data, null, 2) + "\n");
}

// GET /api/auth/api-key/[provider] — returns auth status (never returns the actual key)
export async function GET(_req: Request, { params }: Params) {
  const { provider } = await params;
  try {
    const data = readAuth();
    const cred = data[provider] as { type?: string; key?: string } | undefined;
    const configured = Boolean(cred && cred.type === "api_key" && cred.key);
    return NextResponse.json({ provider, configured, source: configured ? "stored" : undefined });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/auth/api-key/[provider]  body: { apiKey: string }
export async function POST(req: Request, { params }: Params) {
  const { provider } = await params;
  try {
    const { apiKey } = await req.json() as { apiKey?: string };
    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
    }
    const data = readAuth();
    data[provider] = { type: "api_key", key: apiKey.trim() };
    writeAuth(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE /api/auth/api-key/[provider] — removes stored API key
export async function DELETE(_req: Request, { params }: Params) {
  const { provider } = await params;
  try {
    const data = readAuth();
    delete data[provider];
    writeAuth(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
