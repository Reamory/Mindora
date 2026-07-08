# RFC 0004 — Mindora Plugin Format

- **Status**: Draft
- **Target release**: v0.5.0
- **Author**: Mindora maintainers
- **Discussion**: https://github.com/Reamory/Mindora/discussions

## Summary

A plugin is a single TypeScript file that exports a `MindoraPlugin` object. Plugins can register tools, slash commands, themes, UI panels, and lifecycle hooks. They are distributed via npm under the `mindora-plugin-*` scope and discovered from `~/.mindora/plugins/` and `<project>/.mindora/plugins/`.

## Motivation

The pi-coding-agent has an extension API. Today, "extension" means "anything you can write in TypeScript that exports a function". That is too open — there's no convention for how to distribute, version, or name an extension. Mindora needs a **convention**, not just an API, so the community can publish and users can discover plugins.

## Plugin format

A plugin is an npm package whose entry point exports `MindoraPlugin`:

```ts
import type { MindoraPlugin } from "mindora";

export const plugin: MindoraPlugin = {
  manifest: {
    name: "git-worktrees",
    version: "0.1.0",
    description: "Show git worktrees in the sidebar.",
    author: "remory",
    license: "MIT",
  },

  // Lifecycle
  onLoad(ctx) { ctx.logger.info("loaded"); },
  onUnload() {},

  // Contributions
  tools: [
    {
      name: "git.worktree.list",
      description: "List git worktrees in the current repo.",
      parameters: { type: "object", properties: {}, required: [] },
      execute: async (args, ctx) => {
        const result = await ctx.shell.run("git worktree list");
        return { output: result.stdout };
      },
    },
  ],

  slashCommands: [
    {
      name: "wt",
      description: "Switch worktree",
      args: "<name>",
      run: async (args, ctx) => ctx.worktree.switch(args),
    },
  ],

  panels: [
    {
      slot: "sidebar.bottom",
      title: "Worktrees",
      component: () => <WorktreeList />,  // React component
    },
  ],

  themes: [
    {
      name: "aurora-dawn",
      css: `
        :root {
          --accent: #ff8eb3;
          --bg-panel: #fff5f8;
        }
      `,
    },
  ],
};
```

The manifest is duplicated in `mindora.plugin.json` for discoverability without running code:

```json
{
  "name": "git-worktrees",
  "version": "0.1.0",
  "description": "Show git worktrees in the sidebar.",
  "author": "remory",
  "license": "MIT",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "mindora": ">=0.5.0 <1.0.0",
  "category": "git",
  "tags": ["git", "worktree", "sidebar"]
}
```

## Discovery

On startup, Mindora scans:

1. `~/.mindora/plugins/*/package.json` (user-global).
2. `<project>/.mindora/plugins/*/package.json` (project-scoped, takes priority).
3. Any npm package in the project's `node_modules` whose name starts with `mindora-plugin-` (auto-discovered).

Plugins are loaded in alphabetical order. Conflicts (two plugins registering the same tool name) are reported in the audit log and the later-loaded plugin wins.

## Execution

Plugins run **in the same Node.js process** as Mindora. There is no sandbox in v0.5.0. v1.x may add a WebAssembly sandbox.

This is explicit. Plugin authors should treat their code as having the same authority as Mindora itself. The README will say so.

## Permissions

A plugin can declare permissions in its manifest:

```json
{
  "permissions": {
    "shell": ["git", "git-worktree"],
    "filesystem": ["./"],
    "network": ["api.github.com"]
  }
}
```

If the user has trust set to "Do not trust" (RFC 0001), plugin tool calls prompt anyway. If trust is "Trust", plugin tool calls run subject to the permission list above.

## CLI

```bash
mindora plugin install git-worktrees
mindora plugin list
mindora plugin remove git-worktrees
mindora plugin update
```

`install` resolves the npm package, copies it to `~/.mindora/plugins/`, and registers it in `~/.mindora/plugins/installed.json`.

## Marketplace

A static-site gallery at `mindora.dev/plugins/` (URL placeholder) lists community plugins. The gallery is generated from a `plugins/` repo with a `plugin.json` per submission. No accounts, no payments — pure file submission.

## Open questions

1. **Should plugins ship with their own dependencies?** Proposal: yes, via npm — plugins can depend on anything.
2. **Versioning.** Proposal: Mindora uses caret-range matching (`mindora: ">=0.5.0 <1.0.0"`).
3. **Deprecation.** Proposal: a plugin can be marked `deprecated: true` in its manifest; Mindora shows a banner on load.

## Alternatives considered

- **VS Code-style extension host.** Rejected. Web / Node.js extensions don't need an IPC layer for v0.5.0.
- **WASM-only plugins.** Rejected for now — too much friction for plugin authors.
- **Star/clone plugins from GitHub directly.** Rejected. npm is the right distribution channel.

## Rollout plan

- v0.5.0-alpha.1: plugin format spec published; reference plugin `mindora-plugin-git-worktrees` shipped.
- v0.5.0-alpha.2: discovery + load + tools + slash commands.
- v0.5.0-alpha.3: panels + themes.
- v0.5.0-alpha.4: CLI + marketplace scaffold.
- v0.5.0 GA.

## License

This RFC is part of the Mindora project, MIT licensed.