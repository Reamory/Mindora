import { NextResponse } from "next/server";
import { mkdirSync } from "fs";
import { join } from "path";
import { allowFileRoot } from "@/lib/file-access";

// POST /api/default-cwd
// Creates a workspace directory under the project and returns the path.
// Uses project-local path to avoid home-directory permission issues on Windows.
export async function POST() {
  try {
    const dir = join(process.cwd(), "workspace");
    mkdirSync(dir, { recursive: true });
    allowFileRoot(dir);
    return NextResponse.json({ cwd: dir });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
