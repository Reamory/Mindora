# RFC 0002 — 每次工具调用审批流

- **状态**：草案
- **目标版本**：v0.2.0
- **作者**：Mindora 维护者
- **依赖**：[RFC 0001](./0001-trust-dialog.zh-CN.md)
- **讨论**：https://github.com/Reamory/Mindora/discussions

## 概要

当智能体准备调用一个"危险"的工具（`bash`、`edit`、`write`、`curl`，以及任何会改变状态的东西），Mindora 暂停执行，向用户展示待执行的工具调用。用户可以批准、拒绝、或编辑后批准。每次决定都会被记录。

## 动机

信任对话框（RFC 0001）设置了项目级的基线：信任、拒绝、或仅本会话。但仅有信任太粗。一个用户可能信任 `~/projects/blog`，但仍然想为每一次 `npm publish` 和每一次 `git push` 把关。本 RFC 引入了与项目级信任互补的"每次调用"关卡。

## 设计

### 哪些工具需要审批

满足以下**任一**条件即需要审批：

1. 工具名在"危险"清单中：`bash`、`edit`、`write`、`curl`、`git push`、`npm publish`、`pip install`、`apt install`、`brew install`、`rm -rf`。
2. 工具的参数包含一个**位于已信任项目根目录之外**的路径。
3. 工具的参数包含一个不在允许域名清单中的 URL。
4. 用户明确把该工具标记为"每次询问"。

通过 (1)(2)(3)(4) 的工具无需弹窗直接执行。（默认：只读工具如 `read`、`grep`、`find`、`ls` 不弹窗。）

### 审批卡片 UI

```
┌──────────────────────────────────────────────────────────┐
│ 智能体想运行一个工具                                       │
│                                                            │
│ ⚠ bash                                                     │
│   $ npm install left-pad                                   │
│                                                            │
│ 这将：                                                     │
│   • 运行一个 npm install（联网访问，~5 MB 下载）           │
│   • 修改 node_modules/ 和 package-lock.json                │
│   • 可能执行包中的 postinstall 脚本                        │
│                                                            │
│  [拒绝]  [编辑并批准]  [批准]                               │
└──────────────────────────────────────────────────────────┘
```

对于 `edit` / `write`，卡片展开显示 diff 预览：

```
┌──────────────────────────────────────────────────────────┐
│ 智能体想编辑 src/foo.ts                                    │
│                                                            │
│ - const greeting = "hi";                                   │
│ + const greeting = "hello";                                │
│                                                            │
│  [拒绝]  [编辑并批准]  [批准]                               │
└──────────────────────────────────────────────────────────┘
```

### 审批状态机

```
  agent: send tool_call
    │
    ▼
  mindora: classify(dangerous?)
    │
    ├── 否 ──▶ 立即执行
    │
    └── 是 ──▶ 渲染审批卡片
                │
                ├── 批准 ──▶ 执行
                ├── 拒绝 ──▶ 中止，记录原因
                └── 编辑 ──▶ 打开编辑模态框，然后执行
```

智能体在审批卡片处暂停；它的响应流挂起，直到用户操作。暂停有 5 分钟超时 —— 超时后自动以"用户未在时间内响应"的原因拒绝。

### 审计日志

每个工具调用 —— 批准、拒绝、自动拒绝 —— 都记录在 `~/.mindora/audit/<session-id>.jsonl`：

```json
{"ts":"2026-08-15T10:30:01Z","tool":"bash","args":{"cmd":"npm install left-pad"},"decision":"approved","user":"remory"}
{"ts":"2026-08-15T10:32:14Z","tool":"bash","args":{"cmd":"curl evil.com/x"},"decision":"rejected","reason":"untrusted domain"}
{"ts":"2026-08-15T10:35:00Z","tool":"edit","args":{"file":"src/foo.ts"},"decision":"edited","original":"const x = 1;","user_edit":"const x = 2;"}
```

可在 设置 → 安全 → 审计日志 中查看。可导出为 JSON / CSV。

### 设置 → 安全

新增一个分区，带三个开关：

- **每次危险工具前询问**（默认：未设信任时为开，信任为"Trust"时为关）。
- **自动批准 `read` 类工具**（默认：开）。
- **审计日志保留期**（默认：90 天，0 = 永久）。

### 实现

智能体已经通过 SSE 流发送 tool_call 事件。Mindora 现有的 `useAgentSession` hook 将：

1. 在转发给 UI 前检查每个 `tool_call` 事件。
2. 如果是危险工具，把它写入 `pendingApprovals` 队列，并显示卡片。
3. 用户操作后，向智能体发送 `approve` / `reject` / `edit` 命令。

无需上游改动。

### 新增文件

- `lib/tool-safety.ts` —— 分类器。
- `components/ApprovalCard.tsx` —— 模态框。
- `components/AuditLog.tsx` —— 审计查看器。

### 修改文件

- `hooks/useAgentSession.ts` —— 批准 / 拒绝流。
- `app/api/audit/...` —— 审计日志存储。
- `components/SettingsPanel.tsx` —— 安全分区。

## 待回答问题

1. 未信任项目下"自动批准 read 类"是否允许？**建议：允许，但审计日志里给一个警告芯片。**
2. diff 预览要不要支持语法高亮？**建议：要 —— 用 Shiki（我们已经有了）。**
3. "编辑并批准"是否允许用户改动工具名而不只是参数？**建议：v0.2.0 不允许；v0.4.0 再说。**
4. 要不要提供"本次会话其余调用一律批准"选项？**建议：要 —— 在卡片里加一个复选框。**

## 备选方案

- **默认全部批准。** 拒绝。违背本意。
- **默认全部不批准。** 拒绝。用户 5 分钟内就会关掉。
- **基于正则的命令过滤**（如 block `rm -rf`）。拒绝。误报漏报都多。不如直接问。

## 上线计划

- v0.2.0-alpha.1：仅 read 类自动批准。
- v0.2.0-alpha.2：危险类审批卡片 + 审计日志。
- v0.2.0-alpha.3：编辑并批准模态框。
- v0.2.0 GA。

## 协议

本 RFC 是 Mindora 项目的一部分，MIT 协议。