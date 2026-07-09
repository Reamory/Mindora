# RFC 0004 — Mindora 插件格式

- **状态**：草案
- **目标版本**：v0.5.0
- **作者**：Mindora 维护者
- **讨论**：https://github.com/Reamory/Mindora/discussions

## 概要

插件是一个导出 `MindoraPlugin` 对象的 TypeScript 文件。插件可以注册工具、slash 命令、主题、UI 面板和生命周期钩子。它们通过 npm 上的 `mindora-plugin-*` scope 分发，并从 `~/.mindora/plugins/` 和 `<project>/.mindora/plugins/` 发现。

## 动机

pi-coding-agent 有一个扩展 API。今天，"扩展"的意思是"任何你能在 TypeScript 中写出来的、导出一个函数的东西"。这太开放 —— 没有关于如何分发、版本控制或命名的约定。Mindora 需要一个**约定**而不只是一个 API，这样社区才能发布插件，用户才能发现插件。

## 插件格式

插件是一个 npm 包，其入口导出 `MindoraPlugin`：

```ts
import type { MindoraPlugin } from "mindora";

export const plugin: MindoraPlugin = {
  manifest: {
    name: "git-worktrees",
    version: "0.1.0",
    description: "在侧边栏显示 git worktrees。",
    author: "remory",
    license: "MIT",
  },

  // 生命周期
  onLoad(ctx) { ctx.logger.info("loaded"); },
  onUnload() {},

  // 贡献点
  tools: [
    {
      name: "git.worktree.list",
      description: "列出当前仓库的 git worktrees。",
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
      description: "切换 worktree",
      args: "<name>",
      run: async (args, ctx) => ctx.worktree.switch(args),
    },
  ],

  panels: [
    {
      slot: "sidebar.bottom",
      title: "Worktrees",
      component: () => <WorktreeList />,  // React 组件
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

清单在 `mindora.plugin.json` 中冗余存放，便于在不运行代码的情况下发现：

```json
{
  "name": "git-worktrees",
  "version": "0.1.0",
  "description": "在侧边栏显示 git worktrees。",
  "author": "remory",
  "license": "MIT",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "mindora": ">=0.5.0 <1.0.0",
  "category": "git",
  "tags": ["git", "worktree", "sidebar"]
}
```

## 发现机制

启动时，Mindora 扫描：

1. `~/.mindora/plugins/*/package.json`（用户全局）。
2. `<project>/.mindora/plugins/*/package.json`（项目级，优先级更高）。
3. 项目 `node_modules` 中所有以 `mindora-plugin-` 开头的 npm 包（自动发现）。

插件按字母顺序加载。冲突（两个插件注册了同一个工具名）会在审计日志中报告，后加载的插件覆盖先加载的。

## 执行

插件**在 Mindora 同一个 Node.js 进程中**运行。v0.5.0 没有沙箱。v1.x 可能会增加 WebAssembly 沙箱。

这是明确的。插件作者应将自己的代码视为与 Mindora 本身有同等权限。README 会说明这一点。

## 权限

插件可以在其清单中声明权限：

```json
{
  "permissions": {
    "shell": ["git", "git-worktree"],
    "filesystem": ["./"],
    "network": ["api.github.com"]
  }
}
```

如果用户将信任设为"不信任"（RFC 0001），插件的工具调用无论如何都会弹审批。如果信任是"Trust"，插件的工具调用在上述权限清单的范围内运行。

## CLI

```bash
mindora plugin install git-worktrees
mindora plugin list
mindora plugin remove git-worktrees
mindora plugin update
```

`install` 解析 npm 包，把它复制到 `~/.mindora/plugins/`，并把它登记到 `~/.mindora/plugins/installed.json`。

## 市场

`mindora.dev/plugins/`（URL 占位）上的一个静态站点列出社区插件。该市场由一个 `plugins/` 仓库生成，每个提交一个 `plugin.json`。不要账号，不要付费 —— 纯文件提交。

## 待回答问题

1. **插件可以自带自己的依赖吗？** 建议：可以，通过 npm —— 插件可以依赖任何东西。
2. **版本控制。** 建议：Mindora 使用 caret 范围匹配（`mindora: ">=0.5.0 <1.0.0"`）。
3. **废弃。** 建议：插件可以在其清单中标记 `deprecated: true`；Mindora 在加载时显示一个横幅。

## 备选方案

- **VS Code 风格的扩展宿主。** 拒绝。Web / Node.js 扩展在 v0.5.0 不需要 IPC 层。
- **仅 WASM 插件。** 暂拒 —— 对插件作者摩擦太大。
- **直接从 GitHub star / clone 插件。** 拒绝。npm 才是正确的分发渠道。

## 上线计划

- v0.5.0-alpha.1：发布插件格式规范；提供参考插件 `mindora-plugin-git-worktrees`。
- v0.5.0-alpha.2：发现 + 加载 + 工具 + slash 命令。
- v0.5.0-alpha.3：面板 + 主题。
- v0.5.0-alpha.4：CLI + 市场脚手架。
- v0.5.0 GA。

## 协议

本 RFC 是 Mindora 项目的一部分，MIT 协议。