import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { getAgentDir, ModelRegistry, AuthStorage } from "@earendil-works/pi-coding-agent";

export const dynamic = "force-dynamic";

// Providers that use OAuth — handled separately via /api/auth/providers
const OAUTH_PROVIDER_IDS = new Set(["anthropic", "github-copilot", "openai-codex"]);

function readAuthDirect(): Record<string, { type?: string; key?: string }> {
  try {
    const p = join(getAgentDir(), "auth.json");
    if (!existsSync(p)) return {};
    return JSON.parse(readFileSync(p, "utf-8")) as Record<string, { type?: string; key?: string }>;
  } catch { return {}; }
}

export async function GET() {
  // Use an in-memory AuthStorage to avoid the file-based one which silently
  // no-ops writes under sandbox conditions; we read auth.json directly below.
  const registry = ModelRegistry.create(AuthStorage.inMemory());
  const all = registry.getAll();
  const authData = readAuthDirect();

  // Deduplicate by provider, skip OAuth-only providers and custom providers (source=models_json_key)
  const seen = new Set<string>();
  const result: {
    id: string;
    displayName: string;
    configured: boolean;
    source?: string;
    modelCount: number;
  }[] = [];

  for (const m of all) {
    if (seen.has(m.provider)) continue;
    seen.add(m.provider);
    if (OAUTH_PROVIDER_IDS.has(m.provider)) continue;
    const status = registry.getProviderAuthStatus(m.provider);
    // Skip providers whose key comes from models.json (those are custom providers)
    if (status.source === "models_json_key") continue;
    const displayName = registry.getProviderDisplayName(m.provider);
    const modelCount = all.filter((x) => x.provider === m.provider).length;
    // Override configured status with what we wrote directly to auth.json,
    // because AuthStorage in the registry may have a stale loadError state.
    const stored = authData[m.provider];
    const directlyConfigured = Boolean(stored && stored.type === "api_key" && stored.key);
    const configured = directlyConfigured || status.configured;
    result.push({
      id: m.provider,
      displayName,
      configured,
      source: directlyConfigured ? "stored" : status.source,
      modelCount,
    });
  }

  return Response.json({ providers: result });
}
