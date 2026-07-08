# RFC 0001 — Project Trust Dialog

- **Status**: Draft
- **Target release**: v0.2.0
- **Author**: Mindora maintainers
- **Discussion**: https://github.com/Reamory/Mindora/discussions

## Summary

When the user picks a working directory in Mindora for the first time (or after a "Do not trust" denial), the app must show a dialog explaining what the agent will be able to do in that folder, and ask the user to choose a trust level. The choice persists on disk and is revisable in Settings → Safety.

## Motivation

Today, picking a project in Mindora silently grants the agent full access. There is no confirmation, no log, no way to revoke. The upstream `pi-coding-agent` already ships a `trust-manager.js` that supports per-folder trust decisions, but Mindora does not call it. This RFC proposes to wire it up.

## Design

### Trigger

The dialog appears when **any** of these happen:

1. The user picks a new project in the sidebar (different `cwd` from the previous one).
2. The user clicks "Trust this folder" on a "Trust required" warning banner.
3. The user opens Settings → Safety and clicks "Re-evaluate trust".

### Dialog content

```
┌──────────────────────────────────────────────────────────┐
│ Mindora wants to work in this folder                      │
│                                                            │
│ C:\Users\chiqu\Desktop                                     │
│                                                            │
│ Mindora will give the agent access to:                    │
│   • Read any file in this folder                          │
│   • Run shell commands (bash, git, npm, etc.)             │
│   • Edit and write files in this folder                   │
│   • Invoke any installed skills / plugins                 │
│                                                            │
│ The agent will not:                                       │
│   • Send your files to any server (no telemetry)          │
│   • Touch folders outside this one (unless you say so)    │
│   • Auto-run anything without an approval prompt          │
│                                                            │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Trust this folder                                     │   │
│ │ Trust the parent folder (C:\Users\chiqu)             │   │
│ │ Trust this folder (this session only)                 │   │
│ │ Do not trust                                          │   │
│ └────────────────────────────────────────────────────┘   │
│                                                            │
│                          [Cancel]   [Continue]            │
└──────────────────────────────────────────────────────────┘
```

The four options mirror the upstream `getProjectTrustOptions()` API and the `getProjectTrustParentPath()` helper. "Trust parent" is offered only if a parent exists.

### Persistence

The dialog's choice is passed to upstream via the agent's `setProjectTrust()` API. The agent writes a `trust.json` next to `~/.pi/agent/`. Mindora does not need its own storage — single source of truth.

### Where it lives in the UI

The dialog is a modal overlay (semi-transparent backdrop, centered card). It is **not dismissable by ESC** unless the user clicks Cancel — the agent cannot run until trust is decided.

If the user clicks Cancel, Mindora reverts the project picker to the previous folder.

### Edge cases

- **Sandboxed IDEs** (TRAE, VS Code Dev Containers): the dialog still shows, but the path shown is the in-sandbox path (e.g., `/workspace`), not the host path.
- **Network drives**: shown with a yellow warning, but trust still works.
- **Symlinks**: trust applies to the canonical path, not the symlink.
- **User denies then re-picks the same folder**: dialog appears again (no caching of "deny").

### Out of scope

- Per-tool permission toggles (handled by RFC 0002).
- Per-session-only trust: deferred to v0.7.0.

## Implementation

### New files

- `app/api/trust/route.ts` — GET/POST trust decisions.
- `components/TrustDialog.tsx` — the modal.
- `hooks/useProjectTrust.ts` — fetches and persists trust.

### Modified files

- `components/SessionSidebar.tsx` — trigger the dialog when `selectedCwd` changes.
- `app/api/agent/...` — call `setProjectTrust()` before allowing any tool execution.
- `lib/i18n/dictionary.ts` — add `trust.*` keys for all 3 languages.

### Sequence

```
User picks new folder
  → Sidebar calls useProjectTrust.fetch(cwd)
  → If no decision, open TrustDialog
  → On choice, POST to /api/trust
  → Server calls agent.setProjectTrust(cwd, decision)
  → Sidebar re-renders with new state
  → First message is allowed
```

## Open questions

1. Should "Do not trust" prevent message sending entirely, or just block tool execution? **Proposal: block tool execution; message sending stays open so the user can read past sessions.**
2. Should we surface trust status as a small icon in the sidebar? **Proposal: yes — a green check for trusted, red dot for denied, gray question for undecided.**

## Alternatives considered

- **Silent trust + audit log only.** Rejected. Audit logs are post-hoc; the user must consent up front.
- **First-run only.** Rejected. Users switch projects often; each switch needs its own consent.
- **OS-level permission prompts (macOS Accessibility, Windows UAC).** Rejected. Too heavy for a developer tool.

## Rollout plan

- v0.2.0-alpha.1: dialog ships behind a feature flag (`MINDORA_TRUST_DIALOG=true`).
- v0.2.0-alpha.2: dialog enabled by default; trust.json migration tested.
- v0.2.0 GA: full release.

## License

This RFC is part of the Mindora project, MIT licensed.