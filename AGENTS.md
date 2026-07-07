# Pi Agent Web - Development Notes

## Quick Start

```bash
npm run dev:workspace   # port 30141, uses ./.pi/agent as agent dir (see "Sandbox" below)
npm run dev             # legacy: uses ~/.pi/agent — only works outside sandboxed IDEs
```

Typecheck: `node_modules/.bin/tsc --noEmit`
Lint: `npm run lint`
**Never run `next build` during dev** — pollutes `.next/` and breaks `npm run dev`.

---

## Critical Sandbox Traps (TRAE / similar sandboxed IDEs)

### Dev server cannot write to `~/.pi/agent/`
When the dev server (`next dev`) is started by a sandboxed IDE (e.g. TRAE),
the spawned Node process is **only allowed to write inside the project
workspace**. Any `writeFileSync` / `openSync('w')` to `C:\Users\<you>\.pi\agent\*`
fails with `EPERM: operation not permitted, open '...'` even though:

- the file ACLs grant the current user `F` (Full Control)
- `icacls` shows `KKshot\CodexSandboxUsers:(I)(RX)` inherited from the
  user-profile parent (not the actual restriction — sandbox is on the process)
- the **same user shell** (PowerShell) running standalone *can* write the file

**This is not an ACL/permission issue, it's a process-level sandbox.**
Same Node binary, same token, different process tree = different write access.

**Always reproduce this first** if "the API returned 200 but the file is empty":

```ts
// app/api/_debug-write/route.ts (temporary — delete before commit)
import { writeFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
export async function GET() {
  const paths = [
    join(getAgentDir(), "auth.json"),
    join(process.cwd(), ".sandbox-probe.txt"),
  ];
  return Response.json(paths.map((p) => {
    try { writeFileSync(p, "x", "utf-8"); try { unlinkSync(p); } catch {} return { p, ok: true }; }
    catch (e) { return { p, ok: false, code: (e as NodeJS.ErrnoException).code }; }
  }));
}
```

### Workaround: redirect `PI_CODING_AGENT_DIR` to the workspace
Set `PI_CODING_AGENT_DIR` to a workspace-relative path before `next dev` —
`@earendil-works/pi-coding-agent`'s `getAgentDir()` honors this env var.
The wrapper script `scripts/dev-with-agent.mjs` does this:

```js
process.env.PI_CODING_AGENT_DIR = resolve(root, ".pi", "agent");
if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });
spawn("npx", ["next", "dev", "-p", port], { stdio: "inherit", env: process.env, shell: true });
```

`.gitignore` excludes `/.pi/agent/` so per-developer data stays local.

### `AuthStorage` silently no-ops writes under sandbox
This is the **easy-to-miss second-order bug**. When the sandbox blocks
`~/.pi/agent/auth.json` writes, `AuthStorage.reload()` throws inside
`lockfile.lock()`, sets `this.loadError = error`, and from then on
`persistProviderChange()` short-circuits:

```js
// from @earendil-works/pi-coding-agent AuthStorage
persistProviderChange(provider, credential) {
    if (this.loadError) {       // ← all writes silently dropped after first failure
        return;
    }
    ...
}
```

Symptoms:
- `POST /api/auth/api-key/[provider]` returns 200 OK
- `auth.json` on disk stays `{}` forever
- `GET /api/auth/all-providers` returns `configured: false` for everything
- UI sees "Save" succeed, "configured" badge never turns green, **user thinks
  nothing saved**

**Fix**: in `app/api/auth/api-key/[provider]/route.ts`, do not call
`authStorage.set()` — read/write `auth.json` directly with a 3-strategy
write fallback (direct write → temp+rename → low-level open/write/close).
For `GET` and `all-providers`, also override `configured` with what you read
from `auth.json` directly, because `registry.getProviderAuthStatus()` uses
the same broken `AuthStorage.data` cache.

Same fix for `app/api/models-config/route.ts` if `models.json` is in the
blocked path.

---

## Architecture

```
Browser                Next.js Server              AgentSession (in-process)
  │                        │                               │
  ├─ GET /api/sessions ────▶ reads ~/.pi/agent/sessions/   │
  ├─ GET /api/sessions/[id] reads .jsonl file directly     │
  ├─ GET /api/agent/running/events ───▶ running id SSE     │
  │                        │                               │
  ├─ send message ─────────▶ POST /api/agent/[id]          │
  │                        │   startRpcSession() ─────────▶│ createAgentSession()
  │                        │   session.send(cmd) ─────────▶│ session.prompt()
  │                        │                               │
  ├─ SSE connect ──────────▶ GET /api/agent/[id]/events    │
  │                        │   session.onEvent() ◀─────────│ session.subscribe()
  │◀── data: {...} ─────────│                               │
```

**Session browsing** (read-only): reads `.jsonl` files through SDK `SessionManager` helpers and `lib/session-reader.ts` — no AgentSession created.  
**Sending a message**: `startRpcSession()` in `lib/rpc-manager.ts` creates an AgentSession in-process.

---

## File Map

```
app/api/
  sessions/route.ts               GET  list all sessions
  sessions/[id]/route.ts          GET/PATCH/DELETE session
  sessions/[id]/context/route.ts  GET ?leafId= — context for a specific leaf
  sessions/[id]/export/route.ts   GET exported HTML for a session
  agent/new/route.ts              POST { cwd, message, toolNames?, provider?, modelId? }
  agent/[id]/route.ts             GET state | POST any command
  agent/[id]/events/route.ts      GET SSE stream
  agent/running/events/route.ts   GET SSE stream of currently-running session ids
  auth/all-providers/route.ts     GET API-key provider list
  auth/api-key/[provider]/route.ts GET/POST/DELETE provider API key status/storage
  auth/login/[provider]/route.ts  GET OAuth/device-code SSE | POST manual code
  auth/logout/[provider]/route.ts POST OAuth logout
  auth/providers/route.ts         GET OAuth provider list
  cwd/validate/route.ts           POST validate/select a cwd
  default-cwd/route.ts            POST create ~/pi-cwd-YYYYMMDD
  files/[...path]/route.ts        GET file contents for viewer
  home/route.ts                   GET user home directory
  models/route.ts                 GET { models, modelList, defaultModel }
  models-config/route.ts          GET/PUT — read/write agent-dir/models.json (3-strategy write fallback)
  models-config/test/route.ts     POST test a configured model/provider
  plugins/route.ts                GET/POST package plugin management
  skills/route.ts                 GET/PATCH loaded skills and disable-model-invocation
  skills/install/route.ts         POST install skills through npx skills add
  skills/search/route.ts          GET/POST skills.sh search
  worktrees/route.ts              GET/POST/DELETE git worktrees

lib/
  agent-client.ts      typed fetch helper for /api/agent commands
  draft-store.ts       local draft persistence helpers
  file-access.ts       allowed file roots for /api/files and worktrees
  file-paths.ts        client/server path encoding helpers
  markdown.ts          shared markdown helpers
  npx.ts               npx runner used by skill install
  pi-types.ts          local structural types for pi SDK objects
  rpc-manager.ts      AgentSessionWrapper + registry + startRpcSession
  session-reader.ts   SessionManager wrappers + path cache + buildSessionContext adapter
  tool-presets.ts     PRESET_NONE/DEFAULT/FULL + getPresetFromTools()
  types.ts            shared TypeScript types
  normalize.ts        normalizeToolCalls() — field name mismatch between file format and our types
  worktree.ts         project/worktree resolution and git worktree operations

components/
  AppShell.tsx        layout + URL state + tab management
  SessionSidebar.tsx  session tree + FileExplorer
  ChatWindow.tsx      chat composition + completion sound wrapper
  ChatInput.tsx       input bar + model/thinking/tools/compact controls
  MessageView.tsx     renders one message (user/assistant/toolCall/toolResult)
  BranchNavigator.tsx in-session branch switcher
  ChatMinimap.tsx     scroll minimap alongside the message list
  MarkdownBody.tsx    markdown renderer
  ModelsConfig.tsx    modal for editing models.json (opened from sidebar bottom)
  PluginsConfig.tsx   modal for installed package plugins
  SkillsConfig.tsx    modal for loaded/search/installable skills
  FileExplorer.tsx    file tree inside sidebar
  FileIcons.tsx       file icon helpers
  FileViewer.tsx      file content in a tab
  TabBar.tsx          tab bar (Chat + open file tabs)

hooks/
  useAgentSession.ts  messages + streaming + SSE + fork/navigate/reconciliation logic
  useAudio.ts         completion sound + browser AudioContext unlock
  useDragDrop.ts      shared drag/drop state
  useIsMobile.ts      responsive breakpoint hook
  useLocale.tsx       i18n provider + `t()` / `locale` / `setLocale`
  useTheme.ts         theme state

lib/i18n/
  dictionary.ts       all translated strings (en + zh-CN), keyed by dot-paths

scripts/
  dev-with-agent.mjs  `npm run dev:workspace` — sets PI_CODING_AGENT_DIR
                      to ./.pi/agent so dev server can write under sandbox
```

---

## Key Design Decisions & Traps

### AgentSession lifecycle (`lib/rpc-manager.ts`)
- One `AgentSessionWrapper` per session id, keyed in `globalThis.__piSessions`
- `globalThis` survives Next.js hot-reload; plain module-level Map does not
- Idle timeout: 10 minutes. Concurrent `startRpcSession()` calls share a single start Promise (`globalThis.__piStartLocks`)

### Fork must destroy the wrapper immediately
`AgentSession.fork()` **mutates the wrapper's inner state in-place** — after fork, `inner.sessionId` is the *new* session's id. If the wrapper stays alive in the registry under the old id, the next request gets the already-forked state and subsequent forks produce a corrupt `parentSession` chain.

**Fix**: `send("fork")` captures `newSessionId`, then calls `this.destroy()` before returning. The next request for the original session reloads a clean AgentSession from the original file.

### Two kinds of branching — don't confuse them
- **Fork** (Fork button on user message): creates a new independent `.jsonl` file. Shown as a child in the sidebar tree via `parentSession` header field.
- **In-session branch** (Continue button / BranchNavigator): calls `navigate_tree` within the same file. Multiple entries share the same `parentId`. Switching between them calls `/api/sessions/[id]/context?leafId=`.

### Session files can be fully rewritten
`parentSession` in the header is **display metadata only** — has zero effect on chat content. Safe to `writeFileSync` the entire file (pi does this itself during migrations). Used when cascade-reparenting children on delete.

### ToolCall field normalization
Pi stores toolCall blocks as `{type:"toolCall", id, name, arguments}` but `ToolCallContent` uses `{toolCallId, toolName, input}`. `normalizeToolCalls()` in `lib/normalize.ts` handles this — called in both `session-reader.ts` (file load) and `ChatWindow.handleAgentEvent()` (streaming).

### New session tool preset
Tool names are passed at session creation (`POST /api/agent/new` → `toolNames[]`). For existing sessions, the active preset is inferred on mount via `get_tools` → `getPresetFromTools()`. When tools are fully disabled (`toolNames = []`), `rpc-manager.ts` passes an empty tool allow-list and forces `agent.state.systemPrompt = ""` after startup/reload/resource discovery.

### Model defaults for new sessions
`GET /api/models` returns `defaultModel` read from `~/.pi/agent/settings.json`. `ChatWindow` pre-selects this on mount for new sessions.

### SSE reconnect on page refresh mid-stream
On `ChatWindow` mount, `GET /api/agent/[id]` is called. If `state.isStreaming === true`, SSE is reconnected automatically. `thinkingLevel` and `isCompacting` are also synced from this response.

### Compaction SSE events
Newer pi emits `compaction_start` / `compaction_end`; older versions emitted `auto_compaction_start` / `auto_compaction_end`. `handleAgentEvent` accepts both sets to keep `isCompacting` in sync. Manual compact is a blocking POST — the button stays disabled until the response returns.

### Running state SSE + reconciliation
- The sidebar listens to `/api/agent/running/events`, backed by `subscribeRunningSessions()` in `lib/rpc-manager.ts`, so running badges update without polling.
- `useAgentSession` still treats per-session SSE as primary for chat events, but while a run is active it periodically calls `GET /api/agent/[id]` and also reconciles on `visibilitychange`/`online`. This fixes missed `agent_end` events from background tabs or half-open connections.
- Prompt runs use a monotonic run id; late SSE or slow reconciliation responses from an old run must be ignored so they cannot resurrect stale streaming bubbles.

### Worktrees and project grouping
- `lib/worktree.ts` resolves linked worktree top-levels back to the main repo `projectRoot`; `listAllSessions()` attaches that to each `SessionInfo` so all worktrees for one repo are grouped together in the sidebar.
- Worktree operations are served by `/api/worktrees` and guarded by the same allowed-root rules as `/api/files`.
- New worktrees are created under `<repoRoot>-worktrees/<sanitized-branch>`. Existing branches are reused; otherwise `git worktree add -b` creates the branch.
- Removing a dirty worktree returns `409` with `{ dirty: true }` so the UI can ask before retrying with `force`.
- Sessions whose cwd points at a removed worktree are inferred back into the main project instead of becoming a phantom project row.

### File access allow-list
- `/api/files` is intentionally not a general filesystem browser. Allowed roots come from session cwds, their resolved project roots, `~/pi-cwd-*`, and roots explicitly added with `allowFileRoot()`.
- `/api/cwd/validate`, `/api/default-cwd`, and `/api/worktrees` call `allowFileRoot()` when they make a new location browsable.

### Plugins and skills
- `/api/plugins` uses pi's `SettingsManager` + `DefaultPackageManager` for global/project package install, remove, update, enable, and disable. Disabling writes empty `extensions/skills/prompts/themes` arrays for that package entry.
- `/api/skills` uses `DefaultResourceLoader` so settings paths, package skills, and project `.agents/skills` are listed the same way the runtime sees them.
- Skill toggling edits only the `disable-model-invocation` frontmatter key on the target `SKILL.md`; keep that surgical so user formatting survives.
- `/api/skills/install` shells through `npx skills add ... --agent pi`; project installs run with the selected cwd.

### Auth and model config
- `ModelsConfig` combines models from `~/.pi/agent/models.json` with provider auth status from pi's `AuthStorage`/`ModelRegistry`.
- OAuth/device-code/manual-code flows are streamed by `GET /api/auth/login/[provider]`; manual code responses POST back with a short-lived token stored in `globalThis.__piLoginCallbacks`.
- API-key routes (`/api/auth/api-key/[provider]`) read/write `auth.json`
  directly instead of going through `AuthStorage.set()` — see the
  *Critical Sandbox Traps* section above. Status endpoints must never
  return the raw key.
- `/api/auth/all-providers` uses `AuthStorage.inMemory()` for the registry
  and overrides `configured` from a direct `auth.json` read, because
  `registry.getProviderAuthStatus()` reads the broken `AuthStorage.data` cache.
- The model test route is `app/api/models-config/test/route.ts`; `app/api/models/test/` is not a real route.

### Settings panel: closure traps and visual feedback
`components/SettingsPanel.tsx` and `components/ModelsConfig.tsx` show three
classic React traps that must be preserved when refactoring:

1. **Closure-trap on "add then select"** — do **not** read state through a
   setTimeout to discover what was just added. `setConfig` is async; the
   closure-captured `data.config` is the *old* value and the just-added
   provider/model will never be in `Object.keys(...)`.
   - **Bad**: `actions.addCustomProvider(); setTimeout(() => { const keys = Object.keys(data.config.providers ?? {}); setSelection({...last key...}); }, 0);`
   - **Good**: make the action return the new name/index, set selection
     synchronously: `const newName = actions.addCustomProvider(); setSelection({type:"provider", name: newName});`
   - Same pattern for `addModel` → return the new index.

2. **2-second "saved" feedback window is too short for users** — the
   `ApiKeyDetail` / `ProviderDetail` Save button briefly shows a green
   "Saved" checkmark then snaps back to a disabled "Save" with the input
   cleared. Users reasonably read this as "didn't save" because the input
   is empty. Always re-render dependent data (`onRefresh()`) and surface
   the persistent `configured` badge — that's the truth signal, not the
   button state.

3. **`<button onClick>` racing with parent re-render** — if the parent
   reloads state between the user typing and the click, the local input
   state can become stale even though the button looks enabled. Keep
   `key={p.id}` on the input container; never re-mount it on every render
   or the input's `useState` resets mid-typing.

### Completion sound
- `hooks/useAudio.ts` stores the toggle in `localStorage` as `pi-sound-enabled` and reuses one `AudioContext`.
- Browser autoplay policy means sound must be unlocked from a user gesture; `ChatInput` calls the unlock hook from interactive controls, and `ChatWindow` plays the tone from `onAgentEnd`.

### Exported session HTML
- `/api/sessions/[id]/export` delegates to pi's export helper, then patches recursive tree helpers in the generated HTML to iterative versions so very deep linear sessions do not overflow the browser call stack.

### i18n / `useLocale`
- Single source of truth: `lib/i18n/dictionary.ts` exports a `Dictionary`
  keyed by full dot-paths (`models.detail.save`, `models.detail.saved`).
  Add a new key there first, then reference it with `const { t, locale } = useLocale()`.
- Hardcoded English string in a label, button, or error message is a
  **regression** — search for it and route through `t(...)`. The
  `ApiKeyDetail` "API Key" field label, error toasts, and the `emptyMessage`
  strings in `ModelsConfig` / `SettingsPanel` are easy to miss.
- `useLocale` re-renders all consumers on `setLocale(...)` — wrap any
  expensive per-render work (large list filtering, model selection) in
  `useMemo` keyed on `data` / `config`, not on `t`.

## Pi Session File Format

Location: `~/.pi/agent/sessions/<encoded-cwd>/<timestamp>_<uuid>.jsonl`

```jsonl
{"type":"session","version":3,"id":"<uuid>","timestamp":"...","cwd":"/path","parentSession":"/abs/path/to/parent.jsonl"}
{"type":"model_change","id":"<8hex>","parentId":null,"provider":"zenmux","modelId":"claude-sonnet-4-6","timestamp":"..."}
{"type":"message","id":"<8hex>","parentId":"<8hex>","message":{"role":"user","content":"..."}}
{"type":"message","id":"<8hex>","parentId":"<8hex>","message":{"role":"assistant","content":[...],...}}
{"type":"message","id":"<8hex>","parentId":"<8hex>","message":{"role":"toolResult","toolCallId":"...","content":[...]}}
{"type":"compaction","id":"<8hex>","parentId":"<8hex>","summary":"...","firstKeptEntryId":"<8hex>","tokensBefore":N}
{"type":"session_info","id":"...","parentId":"...","name":"user-defined name"}
```

`entryIds[]` in `SessionContext` is a parallel array to `messages[]` — maps each displayed message back to its `.jsonl` entry id, used for fork and navigate_tree calls.

---

## CSS Variables (`app/globals.css`)

```
--bg --bg-panel --bg-hover --bg-selected --border
--text --text-muted --text-dim
--accent --user-bg --tool-bg
--font-mono
```

---

## Stable Snapshots

This project is git-tracked starting at v0.7.8. Tags mark known-good
states. **Always check this section before starting work** — if the user
references a snapshot by name, recover from the tag before making changes.

### `v0.7.8-stable` — initial snapshot

**Tag**: `v0.7.8-stable` (annotated)
**Commit**: see `git log -1 v0.7.8-stable`
**Date**: 2026-07-07
**Why it's stable**: user confirmed this is a known-good version, treat
as the recovery target if future changes regress.

**Key changes vs. untracked baseline (everything before this repo existed):**
- i18n: full `en` + `zh-CN` translations via `useLocale()` and
  `lib/i18n/dictionary.ts`. See `### i18n / useLocale` above.
- Sandbox EPERM workaround: dev server can't write to `~/.pi/agent/` from
  inside TRAE/sandboxed IDE. See `## Critical Sandbox Traps` above.
  - `npm run dev:workspace` sets `PI_CODING_AGENT_DIR=./.pi/agent`
  - `scripts/dev-with-agent.mjs` is the wrapper
  - `/api/auth/api-key/[provider]` reads/writes `auth.json` directly
    (3-strategy write fallback) instead of using `AuthStorage.set()`,
    because AuthStorage silently no-ops writes after a loadError
  - `/api/auth/all-providers` uses `AuthStorage.inMemory()` and overrides
    `configured` from a direct `auth.json` read
  - `/api/models-config` has the same 3-strategy write fallback
- Settings panel closure bugs fixed: `addCustomProvider` and `addModel`
  now return the new name/index, callers select synchronously. See
  `### Settings panel: closure traps and visual feedback` above.
- Top-bar dark-mode toggle button removed from `AppShell.tsx`. Theme
  state is still readable in the Settings panel; no other UI surfaces
  change.

**Recover this version:**

```bash
cd "d:\AI PROJECT\Claudecode\x3\pi-web-main"
git checkout v0.7.8-stable    # detached HEAD
# To make it the live branch again:
git checkout main && git reset --hard v0.7.8-stable
```

**Inspect what's in it:**

```bash
git show v0.7.8-stable --stat
git diff v0.7.8-stable..HEAD  # see what has changed since
```
