# RFC 0002 — Per-Tool Approval Flow

- **Status**: Draft
- **Target release**: v0.2.0
- **Author**: Mindora maintainers
- **Depends on**: [RFC 0001](./0001-trust-dialog.md)
- **Discussion**: https://github.com/Reamory/Mindora/discussions

## Summary

When the agent is about to invoke a "dangerous" tool (`bash`, `edit`, `write`, `curl`, anything that mutates state), Mindora pauses execution and shows the user the proposed tool call. The user can Approve, Reject, or Edit-and-Approve. Every decision is logged.

## Motivation

Trust dialog (RFC 0001) sets the project-level baseline: trusted, denied, or session-only. But trust alone is too coarse. A user may trust `~/projects/blog` but still want to gate every `npm publish` and every `git push`. This RFC introduces the per-call gate that complements the per-project trust.

## Design

### Which tools require approval

A tool requires approval if **any** of:

1. The tool name is in the "dangerous" list: `bash`, `edit`, `write`, `curl`, `git push`, `npm publish`, `pip install`, `apt install`, `brew install`, `rm -rf`.
2. The tool's args include a path **outside** the trusted project root.
3. The tool's args include a URL with a non-allow-listed domain.
4. The user has explicitly flagged the tool as "always ask".

A tool that passes (1)(2)(3)(4) runs without prompting. (Default: read-only tools like `read`, `grep`, `find`, `ls` do not prompt.)

### Approval card UI

```
┌──────────────────────────────────────────────────────────┐
│ Agent wants to run a tool                                  │
│                                                            │
│ ⚠ bash                                                     │
│   $ npm install left-pad                                   │
│                                                            │
│ This will:                                                 │
│   • Run an npm install (network access, ~5 MB download)   │
│   • Modify node_modules/ and package-lock.json            │
│   • Could execute any postinstall script in the package   │
│                                                            │
│  [Reject]  [Edit & approve]  [Approve]                     │
└──────────────────────────────────────────────────────────┘
```

For `edit` / `write`, the card expands to show a diff preview:

```
┌──────────────────────────────────────────────────────────┐
│ Agent wants to edit src/foo.ts                             │
│                                                            │
│ - const greeting = "hi";                                   │
│ + const greeting = "hello";                                │
│                                                            │
│  [Reject]  [Edit & approve]  [Approve]                     │
└──────────────────────────────────────────────────────────┘
```

### Approval state machine

```
  agent: send tool_call
    │
    ▼
  mindora: classify(dangerous?)
    │
    ├── no ──▶ execute immediately
    │
    └── yes ──▶ render approval card
                    │
                    ├── Approve ──▶ execute
                    ├── Reject ──▶ abort, log reason
                    └── Edit ──▶ open edit modal, then execute
```

The agent is paused at the approval card; its response stream is suspended until the user acts. The pause is bounded by a 5-minute timeout — after which the call is auto-rejected with reason "user did not respond in time".

### Audit log

Every tool call — approved, rejected, or auto-rejected — is recorded in `~/.mindora/audit/<session-id>.jsonl`:

```json
{"ts":"2026-08-15T10:30:01Z","tool":"bash","args":{"cmd":"npm install left-pad"},"decision":"approved","user":"remory"}
{"ts":"2026-08-15T10:32:14Z","tool":"bash","args":{"cmd":"curl evil.com/x"},"decision":"rejected","reason":"untrusted domain"}
{"ts":"2026-08-15T10:35:00Z","tool":"edit","args":{"file":"src/foo.ts"},"decision":"edited","original":"const x = 1;","user_edit":"const x = 2;"}
```

Viewable in Settings → Safety → Audit log. Exportable as JSON / CSV.

### Settings → Safety

New section with three toggles:

- **Ask before every dangerous tool** (default: ON if no project trust, OFF if trust = "Trust").
- **Auto-approve `read`-class tools** (default: ON).
- **Audit log retention** (default: 90 days, 0 = forever).

### Implementation

The agent already emits tool_call events over the SSE stream. Mindora's existing `useAgentSession` hook will:

1. Inspect each `tool_call` event before forwarding to UI.
2. If dangerous, write the call to a `pendingApprovals` queue and show the card.
3. On user action, send `approve` / `reject` / `edit` command to the agent.

No upstream changes needed.

### New files

- `lib/tool-safety.ts` — the classifier.
- `components/ApprovalCard.tsx` — the modal.
- `components/AuditLog.tsx` — the audit viewer.

### Modified files

- `hooks/useAgentSession.ts` — approve / reject flow.
- `app/api/audit/...` — audit log storage.
- `components/SettingsPanel.tsx` — Safety section.

## Open questions

1. Should "auto-approve read-class" be allowed for untrusted projects? **Proposal: yes, but with a warning chip in the audit log.**
2. Should the diff preview support syntax highlighting? **Proposal: yes — use Shiki (we already have it).**
3. Should "edit and approve" allow the user to change the tool name, not just args? **Proposal: no for v0.2.0; v0.4.0.**
4. Should there be a "approve for the rest of this session" option? **Proposal: yes — show a checkbox in the card.**

## Alternatives considered

- **Approve everything by default.** Rejected. Defeats the purpose.
- **Approve nothing by default.** Rejected. Users will disable it in 5 minutes.
- **Regex-based command filter** (e.g. block `rm -rf`). Rejected. False positives, false negatives. Better to ask.

## Rollout plan

- v0.2.0-alpha.1: read-class auto-approve only.
- v0.2.0-alpha.2: dangerous-class approval card + audit log.
- v0.2.0-alpha.3: edit-and-approve modal.
- v0.2.0 GA.

## License

This RFC is part of the Mindora project, MIT licensed.