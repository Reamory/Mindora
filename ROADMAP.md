# Mindora Roadmap

> A 12-month product plan for [Mindora](https://github.com/Reamory/Mindora), the focused local-first workspace for the [pi coding agent](https://github.com/badlogic/pi-mono).

**Status**: Draft for community review. Branch: `roadmap/v0.2.0`.
**Last updated**: 2026-07-09.
**License**: MIT — contributions welcome.

---

## TL;DR

Mindora today is a **thin browser shell** over `@earendil-works/pi-coding-agent`. v0.1.1 ships the brand, i18n, README, and 3-language UI. Everything beyond this is **product work that needs planning**, not just code.

The four bets for the next 12 months:

1. **Trust & safety** — the user must be able to safely run an agent on their own laptop. Today Mindora inherits the upstream `trust-manager.js` but does not surface it; we need a *project trust dialog*, a *per-tool approval flow*, and an *audit trail*.
2. **Personal knowledge layer** — a session history is already a knowledge graph in disguise. We will add a *session search*, a *project memory*, and an opt-in *local RAG* over the user's own notes / sessions / git history.
3. **Multi-agent on the user's machine** — the pi coding agent already supports subagents via extension points. Mindora will offer a *worktree-aware task queue* and a *team-of-agents* panel, so the user can run a "code-review agent" alongside the "implementing agent".
4. **Plugin marketplace** — a `mindora` plugin format (TypeScript file + `mindora.plugin.json` manifest) that can register tools, skills, slash commands, themes, and UI panels. Distribution via npm under the `mindora-plugin-*` scope.

We ship on a 6-week cadence. Each release has one **bet**, a few **polish items**, and one **infrastructure** task. Below: the next 8 releases, what they ship, why, and what they defer.

---

## Table of Contents

1. [Context — what we have, where we sit](#1-context)
2. [Principles — what we will and will not do](#2-principles)
3. [Releases — 8 versions over 12 months](#3-releases)
4. [Each release — scope, deferrals, KPIs](#4-each-release-in-detail)
5. [Cross-cutting work — i18n, docs, perf, security](#5-cross-cutting)
6. [Community & growth](#6-community--growth)
7. [Out of scope for 2026-2027](#7-out-of-scope)
8. [Open questions](#8-open-questions)
9. [How to influence this roadmap](#9-how-to-influence-this-roadmap)

---

## 1. Context

### What Mindora already is (v0.1.1)

- A Next.js 16 + React 19 web UI.
- Talks to `@earendil-works/pi-coding-agent` (the same agent that runs in the pi CLI) via a custom RPC layer (`lib/rpc-manager.ts`).
- Sessions live in `~/.pi/agent/sessions/` as `.jsonl` files.
- Themes: light, dark, system.
- Languages: zh-CN, en-US, ja-JP.
- Brand: Mindora (Aurora violet color, custom logo, custom favicon).

### What is upstream, and what is not

| Capability | pi-coding-agent upstream | Mindora (today) | Notes |
|---|---|---|---|
| Single-session chat | ✅ | ✅ | Already works |
| Session branch / fork | ✅ (jsonl entries have parent_id) | ✅ | Already works |
| Tool whitelist presets (none / default / full) | ✅ (BUILTIN_TOOL_NAMES) | ✅ | UI ships the picker |
| `getProjectTrustOptions(cwd)` | ✅ (trust-manager.js) | ❌ | **Surface it** in v0.2.0 |
| Extension runner / skills / slash commands | ✅ | ✅ | Already integrated |
| Multi-agent / subagents | ⚠️ partial (extension APIs exist, no UI) | ❌ | Big v0.4.0 bet |
| MCP (Model Context Protocol) servers | ⚠️ partial | ❌ | Big v0.5.0 bet |
| Voice input / multimodal output | ❌ | ❌ | Maybe v0.7.0 |
| Mobile app | ❌ | ❌ | Out of scope |

### Why this roadmap

The user's local machine is the most under-priced surface in the AI-coding market. Cursor, Windsurf, Trae, Claude Code, Codex CLI all run **on the user's computer**, but their data, sessions, and tool calls are mostly opaque to the user — and they all push toward the cloud for "smarter" features. Mindora's wedge is: **a local-first, transparent, fully auditable UI on top of a real open-source agent**. The roadmap makes that wedge concrete.

---

## 2. Principles

These are non-negotiable. Every release must satisfy all of them.

1. **Local-first.** No feature may require sending data to a server we control. Optional cloud integrations (sync, sharing) must be opt-in, end-to-end-encrypted, and disabled by default.
2. **No telemetry by default.** If we add telemetry later, it is opt-in, anonymized, and disclosed in the README.
3. **No auto-run dangerous tools.** The agent must never run `bash`, `edit`, `write`, `curl`, or any tool marked dangerous without an explicit user approval — unless the user has set the project trust to "Trust". Trust is per-directory, persistent, and reversible.
4. **Stay MIT.** All new code in this repo stays MIT. Plugin authors can pick their own license; we recommend MIT.
5. **i18n from day one.** Any user-facing string added in a release must exist in zh-CN, en-US, ja-JP at the same time. No "English-only first" exceptions.
6. **Backward compatible sessions.** v0.x must read v0.y sessions for any y ≤ x. v1.0 will set the long-term format.
7. **Open by default.** Public roadmap, public RFCs, public design docs. Decisions on GitHub, not in DMs.
8. **One bet per release.** Trying to ship two bets at once kills both. Polish and infra are fine to stack on top.

---

## 3. Releases

| Version | Tag date | Bet | Headline feature |
|---|---|---|---|
| **v0.2.0** | 2026-08 | **Trust & safety** | Project trust dialog + per-tool approval + audit log |
| **v0.3.0** | 2026-09 | **Knowledge layer I** | Session search + project memory |
| **v0.4.0** | 2026-10 | **Multi-agent** | Subagent UI + worktree task queue |
| **v0.5.0** | 2026-11 | **Plugins I** | `mindora` plugin format + marketplace scaffold |
| **v0.6.0** | 2026-12 | **Knowledge layer II** | Local RAG over user notes / git / sessions |
| **v0.7.0** | 2027-01 | **Workflow** | Spec-driven mode + background task queue |
| **v0.8.0** | 2027-02 | **Mobile & PWA** | Installable PWA + phone-friendly sidebar |
| **v1.0.0** | 2027-03 | **Stable session format** | Frozen session schema + migration tool |

Six-week cadence = 8 releases in ~12 months. Each is ~5 weeks of build + 1 week of bug bash + release.

---

## 4. Each release in detail

### v0.2.0 — Trust & safety (2026-08)

**Why this first.** Without trust, no one will run Mindora on a real project. The upstream `trust-manager.js` exists but Mindora never calls it. AI edits a file in `C:\Users\chiqu\Desktop` today and the user has no idea until they check `git status`.

**Scope (must ship)**:
- Wire `getProjectTrustOptions(cwd)` into the project picker.
- New modal: "Mindora wants to work in `<cwd>`. Trust this folder?" with four options (mirrors upstream: Trust / Trust parent / Trust session only / Do not trust).
- Per-tool approval drawer. When the agent is about to call `bash` / `edit` / `write` / `curl`, show a card with the proposed tool call + a diff preview for file edits. Buttons: `Approve` / `Edit & approve` / `Reject`.
- Audit log panel. Every approved/rejected tool call is recorded. Viewable, searchable, exportable as JSON.
- Settings → Safety: per-project trust list ("`~/Desktop` — trusted", "`~/Documents/secrets` — denied").

**Defer**:
- Per-session trust without persisting (upstream offers it; we skip for now).
- Risk classification of bash commands (`rm -rf` red flag, etc.) — v0.7.0.

**KPIs**:
- 100% of `bash` / `edit` / `write` calls go through the approval UI when trust is "Do not trust" or unset.
- Audit log entries are exportable and survive session reload.

**Risks**:
- Approval UX feels heavy. Mitigate by allowing a "Trust this project fully" toggle that, once flipped, never prompts again until the user changes project.

---

### v0.3.0 — Knowledge layer I (2026-09)

**Why second.** Sessions are the user's most valuable artifact. Once they trust Mindora to run, they'll generate dozens of sessions a week. They need to find them.

**Scope**:
- Cmd-K palette (or `Ctrl+K`) over sessions, branches, files, and slash commands.
- Session search filters: by date range, by model, by file touched, by project.
- Project memory file (`~/.pi/agent/projects/<project>/MEMORY.md`) — a curated long-form notes file the agent can read but only the user can edit. Editable from the UI.
- "Recent sessions" widget on the home view, grouped by project.
- Star / pin sessions. Starred sessions surface in a sidebar section.

**Defer**:
- Full-text search across session messages (need an index — v0.6.0).
- Session diff (compare two sessions side by side — v0.4.0).

**KPIs**:
- Cmd-K opens in <50 ms.
- "Find the session where I asked about X" returns the right session in ≤ 3 keystrokes after typing.

---

### v0.4.0 — Multi-agent (2026-10)

**Why third.** Once a user is comfortable with one agent on one project, the natural next step is "can I have two agents work in parallel, one writing tests and one writing code?" The upstream `pi-coding-agent` already exposes extension points for subagents; the missing piece is UI.

**Scope**:
- New "Agents" panel in the top bar: lists running subagents with status (running / waiting / done).
- Each subagent runs in its own git worktree (auto-created), so file conflicts are physical.
- "Spawn agent" button: pick a role ("code-reviewer", "test-writer", "refactor") + a goal message.
- Agents can message each other via a shared "team chat" — visible to the user.
- Worktree switcher in the sidebar: jump between worktrees (one per active subagent).

**Defer**:
- Cross-agent conflict resolution (auto-merge / rebase — needs more upstream work).
- Cost budget per agent (cap token spend).

**KPIs**:
- Spawning a subagent is a single click after typing a goal.
- Users can run 3+ agents concurrently without UI lag.

**Risks**:
- Pi-coding-agent upstream API for subagents is in flux. Mitigate by feature-flagging the entire multi-agent panel off a config flag until v0.4.x stabilizes.

---

### v0.5.0 — Plugins I (2026-11)

**Why fourth.** The agent ecosystem is plugin-driven (Claude Code, Codex CLI, all of them). Mindora needs a plugin format that doesn't fight upstream.

**Scope**:
- Plugin format: a single TypeScript file exporting a `MindoraPlugin` interface, plus a `mindora.plugin.json` manifest.
- Plugin lifecycle hooks: `onSessionStart`, `onToolCall`, `onSessionEnd`.
- Plugins can register: tools, slash commands, themes, UI panels (sidebar / status bar / modal).
- Discovery: scan `~/.mindora/plugins/` and `<project>/.mindora/plugins/` on startup.
- Marketplace scaffold: a static-site gallery of community plugins at `mindora.dev/plugins` (placeholder URL for now).
- CLI: `mindora plugin install <name>` (resolves from npm under `mindora-plugin-*` scope).

**Defer**:
- Plugin sandboxing (run plugins in a worker / WebAssembly — v1.x).
- Plugin ratings / reviews on the marketplace.
- Plugin payments.

**KPIs**:
- A third party can publish a plugin in <30 minutes by following `docs/plugins.md`.
- 5+ community plugins ship within 30 days of v0.5.0 release.

---

### v0.6.0 — Knowledge layer II (2026-12)

**Why fifth.** Users have notes in Obsidian, Logseq, plain Markdown folders, and within Mindora sessions. We can offer **local RAG** over all of it, without sending anything to a cloud embedding service.

**Scope**:
- Optional local embedding index (SQLite + sqlite-vss or hnswlib-node).
- User picks folders to index in Settings → Knowledge.
- New slash command `/recall <query>`: returns top-k matching snippets across indexed folders + sessions.
- A "Memories" sidebar panel that surfaces recent recalls.
- All embeddings stay local. We provide a "scrub" button to wipe the index.

**Defer**:
- Cloud embedding APIs (OpenAI text-embedding-3 etc.) — user can configure their own provider if they want.
- Vector DB migration tooling.

**KPIs**:
- Indexing 10k Markdown files takes <5 min on an M-series Mac.
- `/recall` answers in <500 ms.

**Risks**:
- SQLite + VSS may not be portable across Windows / macOS / Linux. Test on Windows from day one (Mindora's primary dev environment).

---

### v0.7.0 — Workflow (2027-01)

**Why sixth.** "Spec-driven" is the trending word in coding agents (GitHub Spec Kit, Amazon Kiro). Mindora should let a user write a spec file, and the agent plans + implements against it, with checkpoints.

**Scope**:
- `/spec <name>` slash command: starts a new session whose system prompt includes a spec template.
- Spec template: Goals / Out of scope / Acceptance criteria / Open questions. Stored as `<project>/.mindora/specs/<name>.md`.
- While in spec mode, the agent pauses after each major step and asks the user to approve / amend.
- A "background task" mode: `/run-async` queues a task that runs while the user does other things.
- The audit log (v0.2.0) becomes the canonical history for spec-mode sessions.

**Defer**:
- Auto-decomposition of a spec into sub-specs (graph of specs).
- Time-boxed runs ("give this 10 minutes then stop").

---

### v0.8.0 — Mobile & PWA (2027-02)

**Why seventh.** Users will sometimes be away from their dev machine. They should be able to check on a running agent, approve a pending tool call, or read a session, from their phone.

**Scope**:
- PWA manifest + service worker. Installable from Chrome / Safari.
- Mobile layout: collapsible sidebar becomes a bottom sheet; chat becomes full-screen.
- Read-only mode by default. Edit / send requires explicit "Connect" gesture (avoids fat-finger approvals).
- Push notifications when an agent needs approval (Web Push API).

**Defer**:
- Native iOS / Android apps.
- Voice input (good for mobile, but voice UX is its own design problem — defer to v0.9+).

---

### v1.0.0 — Stable session format (2027-03)

**Why last, but biggest.** After 8 releases of iteration, we lock down:
- Session `.jsonl` schema (forward-compatible: unknown fields ignored, not rejected).
- Plugin manifest schema (with semantic versioning).
- API surface (`lib/rpc-manager.ts` becomes `1.0`).
- Migration tool: `mindora migrate-sessions <from> <to>` for any breaking change between v0.x.

**Scope**:
- Schema freeze for `SessionEntry`, `SessionTreeNode`, `ToolEntry`, `PluginManifest`.
- Migration CLI.
- `LTS` branch created. Critical fixes backported for 6 months.
- Deprecation policy documented: deprecated APIs live for at least 2 minor versions before removal.

---

## 5. Cross-cutting work

Stuff that has to ship in **every** release:

| Concern | Owner | What we always do |
|---|---|---|
| **i18n** | TBD | Any new UI string must add to `lib/i18n/dictionary.ts` for all 3 languages. PRs without this are blocked. |
| **Accessibility** | TBD | Every new interactive element must be keyboard-navigable and have an `aria-label`. Color contrast ≥ 4.5:1 against `--bg`. |
| **Tests** | TBD | `lib/*.test.mjs` for logic; Playwright smoke for UI critical paths (send message, open session, switch project). |
| **Docs** | TBD | CHANGELOG.md updated. New features documented in README or `docs/`. |
| **Security** | TBD | New endpoints in `app/api/` get input validation + rate limit. |
| **Performance** | TBD | First-load JS budget ≤ 250 KB. SSE reconnect tested manually each release. |

---

## 6. Community & growth

Mindora is an open-source project. The roadmap is meaningless if no one uses it.

### Channels we will commit to

| Channel | Cadence | Owner |
|---|---|---|
| GitHub Discussions | daily check | Maintainer |
| GitHub Issues | daily triage | Maintainer |
| Discord (link TBD) | weekly office hour | Maintainer + community |
| Quarterly release notes (blog / `CHANGELOG.md`) | per release | Maintainer |

### Growth levers (in order)

1. **Quality of the README & docs** — the #1 reason people don't adopt an OSS tool is they can't figure out how to install it. We will keep `README.md` ruthlessly up to date.
2. **A demo GIF** in the README. Show the trust dialog appearing on first run, the user clicking Approve, the agent writing a file, the file appearing in the file viewer. 30 seconds. Worth 1000 words.
3. **Plugin authors as evangelists.** When someone publishes a `mindora-plugin-*` and it's good, we feature it on the marketplace.
4. **Show, don't tell.** Each release ships a working demo recording. Twitter / X / Bilibili / V2EX / Hacker News posts share the recording, not the marketing copy.
5. **Good first issues** — every release tags 3-5 issues with `good-first-issue` for newcomers.

### What we won't do

- Sponsored posts / paid acquisition. (We're a one-person show; the budget is hours.)
- Discord-exclusive announcements. (GitHub is the source of truth.)
- Sub-stacks / paid tiers inside Mindora itself.

---

## 7. Out of scope for 2026-2027

These are tempting. They are not in the roadmap. We may revisit after v1.0.0.

- **Cloud sync / "Mindora Cloud".** Conflicts with the local-first principle. If a user wants sync, they use `git`, `Syncthing`, or `iCloud`.
- **Voice input.** Useful, but voice UX is its own design field. Wait for v0.9+.
- **Native desktop app** (Tauri / Electron wrapper). PWA covers 90% of the use case at 10% of the cost.
- **A marketplace with payments.** Out of scope until plugin volume justifies the platform.
- **Code execution sandboxing** (running the agent in a Docker container). Defeats the local-first principle. The trust dialog is the answer.
- **A proprietary model layer.** Mindora ships only clients; the model choice is the user's, the inference is the user's.
- **Replacing the pi coding agent.** Mindora is a UI on top of `@earendil-works/pi-coding-agent`. If we ever diverge, that's a fork, not a roadmap item.

---

## 8. Open questions

These need answers before v0.4.0 ships. Tag issues with `roadmap-question`.

1. **Should "Trust" be per-project, per-folder, or both?** Upstream supports per-folder. We may want a project-level trust that overrides folder trust for the user's most-used projects.
2. **Plugin permission model.** When a plugin registers a tool, what permissions does it get? Same as built-in tools, or sandboxed? (We lean: same by default, sandboxed if user opts in via plugin manifest.)
3. **Multi-agent cost cap.** Should we hard-cap token spend per agent session? If yes, where does the cap live — agent config, user config, or per-spawn?
4. **Spec-driven mode UX.** Pause-and-approve is heavy. Is there a lighter "trust-but-check-in" mode?
5. **Migration story.** When v1.0 freezes the session schema, what happens to sessions written by a future v0.x that uses experimental fields? Should we ignore unknown fields (lenient) or reject the file (strict)?

---

## 9. How to influence this roadmap

1. **Open an issue** with the `roadmap` label. Reference the version you want to change.
2. **Open a PR against this file** if you have a concrete change.
3. **Comment on the open RFCs** under `docs/rfcs/`.
4. **Vote with stars** — the GitHub star count is the most honest signal we have. If a release is popular, we'll prioritize the next one's roadmap accordingly.

---

## Appendix A — File layout for the planning branch

```text
ROADMAP.md                      ← this file
docs/
  logo.svg
  plugins.md                    (written for v0.5.0)
  rfcs/
    0001-trust-dialog.md        (v0.2.0)
    0002-tool-approval.md       (v0.2.0)
    0003-subagent-ui.md         (v0.4.0)
    0004-plugin-format.md       (v0.5.0)
    0005-local-rag.md           (v0.6.0)
    0006-spec-driven.md         (v0.7.0)
```

## Appendix B — Inspiration & references

- [pi-mono](https://github.com/badlogic/pi-mono) — the agent that powers Mindora.
- [Claude Code](https://docs.claude.com/claude-code) — gold standard for slash-command + skills UX.
- [Cursor](https://www.cursor.com) — Composer / multi-file edit model.
- [Windsurf](https://codeium.com/windsurf) — "Flow" state concept.
- [GitHub Spec Kit](https://github.com/github/spec-kit) — spec-driven development.
- [Model Context Protocol](https://modelcontextprotocol.io) — the USB-C of agent tooling.
- [Obsidian](https://obsidian.md) and [Logseq](https://logseq.com) — local-first notes inspiration.
- [SQLite + VSS](https://github.com/asg017/sqlite-vss) — local vector search.
- [Contributor Covenant](https://www.contributor-covenant.org) — Code of Conduct template.

---

*Made with care by Remory and the Mindora community.*