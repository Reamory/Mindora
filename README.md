# Mindora

<img src="docs/logo.svg" alt="Mindora" width="240" />

> A focused, local-first workspace for the [pi coding agent](https://github.com/badlogic/pi-mono).

Mindora reads your local pi session files and gives you a clean browser workspace for session browsing, real-time chat, model configuration, skill management, and project file preview — without giving up control of where your data lives.

[中文文档](./README.zh-CN.md) · [Changelog](./CHANGELOG.md) · [Code of Conduct](./CODE_OF_CONDUCT.md) · [Contributing](./CONTRIBUTING.md)

---

## Why Mindora

You spend hours inside a coding agent. The CLI is fast, but you still need to:

- **Find a conversation from last week** without grepping through `~/.pi/agent/sessions`.
- **See the diff** while the agent edits a file, not after.
- **Switch models, swap API keys, install skills** without opening three terminals.
- **Audit cost and token usage** for a long session, on the spot.

Mindora is the local web UI that makes the pi agent pleasant to drive for hours.

## Highlights

- **🗂 Sessions you can browse, not just files** — every pi conversation is grouped by project, with branch context, fork lines, and an in-session minimap.
- **🪄 Try different directions safely** — continue from any earlier message, or fork a session into an independent route. Originals stay untouched.
- **🌿 Work across Git worktrees** — the sidebar lets you swap worktrees; new sessions and the file explorer follow whichever checkout you choose.
- **📂 Chat beside the project** — file tree on the left, source / diff / image / audio / PDF / DOCX preview on the right, live-reloading while the agent works.
- **🧠 See the session state clearly** — context usage, cost, compaction state, and the system prompt are one click away from the top bar.
- **⚙️ Configure less from the terminal** — manage models, OAuth/API keys, model tests, and skill switches from the web UI.
- **🌗 Light & dark, your way** — light, dark, or follow system; switch with a circular wipe animation.
- **🌏 3 languages out of the box** — English, 简体中文, 日本語.
- **🛡 Stays on your machine** — no telemetry, no cloud account, no upload. The default port is `localhost` only.

## Quick Start

**No install, just run:**

```bash
npx mindora
```

**Or install globally:**

```bash
npm install -g mindora
mindora
```

Then open <http://localhost:30141>. The CLI tries to open the browser automatically once the server is ready.

**Options:**

```bash
mindora --port 8080              # custom port
mindora --hostname 127.0.0.1     # local access only
mindora -p 8080 -H 127.0.0.1     # combine options

PORT=8080 mindora                # environment variable is also supported
```

## What you need before your first chat

1. **Pick a working directory** in the sidebar (or let Mindora use your OS home).
2. **Connect a model provider** in *Settings → Models* (Claude, OpenAI, or any OpenAI/Anthropic-compatible endpoint).
3. *(Optional)* **Install skills** in *Settings → Skills* to teach the agent your conventions.
4. Hit **+ New** in the sidebar and start typing.

## Configuration

| Knob | Default | Where it lives |
|---|---|---|
| Agent data directory | `~/.pi/agent` | `PI_CODING_AGENT_DIR` env var |
| Default port | `30141` | `--port` / `PORT` env var |
| Bind address | `0.0.0.0` | `--hostname` / `HOSTNAME` env var |
| Language | follows browser | Settings → General → Language |
| Theme | follows system | Settings → General → Theme |

## Development

```bash
npm install
npm run dev
```

The local dev server runs at <http://localhost:30141>.

Common checks:

```bash
node_modules/.bin/tsc --noEmit
npm run lint
```

Avoid running `next build` / `npm run build` during local development. It writes to `.next/` and can interfere with the dev server; leave builds for release work.

## Project Structure

```text
app/
  api/
    agent/          # creates/drives AgentSession and exposes SSE events
    auth/           # OAuth and API key management
    cwd/validate/   # custom working directory validation
    default-cwd/    # pi default working directory lookup
    files/          # file listing, reading, preview, and watching
    home/           # current user home directory
    models/         # available models, default model, thinking levels
    models-config/  # read/write models.json and test models
    sessions/       # session reads, rename, delete, context, HTML export
    skills/         # skill listing, search, install, enable/disable
components/
  AppShell.tsx        # main layout, URL state, top panels, file tabs
  SessionSidebar.tsx  # project selector, session tree, Explorer
  ChatWindow.tsx      # messages, SSE, image drag/drop, minimap
  ChatInput.tsx       # input bar, model/tools/thinking/compact/slash controls
  MessageView.tsx     # message, thinking, tool call/result rendering
  ModelsConfig.tsx    # model and auth configuration panel
  SkillsConfig.tsx    # skill management panel
  FileExplorer.tsx    # file tree
  FileViewer.tsx      # source, diff, image, audio, PDF, DOCX preview
lib/
  rpc-manager.ts      # AgentSessionWrapper lifecycle and global registry
  session-reader.ts   # parses .jsonl session files and branch contexts
  tool-presets.ts     # built-in tool whitelist presets
  i18n/dictionary.ts  # all UI strings, keyed by namespace
hooks/
  useAgentSession.ts  # session loading, command sending, SSE state machine
  useTheme.ts         # theme + circular wipe animation
  useLocale.tsx       # language + i18n dictionary lookup
bin/
  mindora.js          # npm CLI entrypoint
```

## Contributing

We welcome issues and pull requests — see [CONTRIBUTING.md](./CONTRIBUTING.md) for the workflow. By participating, you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Credits

Mindora is a maintained rebrand and continuation of [`@agegr/pi-web`](https://github.com/agegr/pi-web) by **agegr**, released under the MIT License. The original work, the architecture, and the upstream agent integration are theirs; Mindora adds the Mindora brand, color system, and ongoing product work on top.

- **pi coding agent** — by Mario Zechner ([@badlogic](https://github.com/badlogic)) and the [pi-mono](https://github.com/badlogic/pi-mono) project.
- **pi-web (the original)** — by [agegr](https://github.com/agegr). The codebase that Mindora is built on.

## License

MIT — see [LICENSE](./LICENSE).

```
MIT License
Copyright (c) 2026 agegr
Copyright (c) 2026 Remory (Mindora rebrand and ongoing work)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

See [LICENSE](./LICENSE) for the full text.
