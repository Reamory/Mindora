# Mindora

<img src="docs/logo.svg" alt="Mindora" width="240" />

> 一个专注、本地优先的 [pi 编程智能体](https://github.com/badlogic/pi-mono) 工作空间。

Mindora 会读取你本机的 pi 会话文件，在浏览器里为你提供清晰的会话管理、实时对话、模型配置、技能管理，以及项目文件预览 —— 数据始终留在你的机器上。

[English](./README.md) · [更新日志](./CHANGELOG.md) · [行为准则](./CODE_OF_CONDUCT.md) · [贡献指南](./CONTRIBUTING.md)

---

## 为什么是 Mindora

你和编程智能体一起工作的时间越来越长。CLI 速度很快，但你仍需要：

- **找到上周的某次对话** —— 不用再 `grep ~/.pi/agent/sessions`。
- **边改边看 diff** —— AI 编辑文件时实时看到改动，而不是事后翻 git。
- **切换模型、改 API key、装 skills** —— 不用开三个终端。
- **审计长会话的 token 和花费** —— 一眼看到，不再黑箱。

Mindora 就是让你**愿意在里面待几个小时**的本地网页界面。

## 亮点

- **🗂 会话可以浏览，不是文件堆** —— 按项目分组，带分支上下文、fork 路径和会话内 minimap。
- **🪄 安全试不同方向** —— 从任意历史消息继续，或 fork 出独立分支；原文不被改动。
- **🌿 跨 Git worktree 工作** —— 侧边栏切换 checkout，新会话和文件浏览器自动跟随。
- **📂 边聊边看项目** —— 左侧文件树，右侧源码 / diff / 图片 / 音频 / PDF / DOCX 实时预览，AI 改动时自动刷新。
- **🧠 会话状态一目了然** —— 上下文占用、花费、压缩状态、系统提示，顶部一点就到。
- **⚙️ 少进终端** —— 模型、OAuth/API key、模型测试、技能开关全部在网页里。
- **🌗 明暗主题随你** —— 浅色 / 深色 / 跟随系统；切换时带圆形擦除动画。
- **🌏 内置 3 种语言** —— English、简体中文、日本語。
- **🛡 数据不离开你的机器** —— 无遥测、无云账号、无上传；默认只监听 localhost。

## 快速开始

**无需安装，直接运行：**

```bash
npx mindora
```

**或全局安装：**

```bash
npm install -g mindora
mindora
```

启动后打开 <http://localhost:30141>。服务就绪后 CLI 会自动尝试打开浏览器。

**可选参数：**

```bash
mindora --port 8080              # 自定义端口
mindora --hostname 127.0.0.1     # 仅本机访问
mindora -p 8080 -H 127.0.0.1     # 组合使用

PORT=8080 mindora                # 也支持环境变量
```

## 第一次对话前的 3 步

1. 在侧边栏**选择一个工作目录**（或让 Mindora 用你的系统 home）。
2. 到 *设置 → 模型* **接入一个模型服务商**（Claude、OpenAI，或任何 OpenAI/Anthropic 兼容端点）。
3. *可选：* 到 *设置 → 技能* **装几个 skills**，教会智能体你的项目惯例。
4. 点侧边栏的 **+ 新建**，开始打字。

## 配置

| 项 | 默认 | 改哪里 |
|---|---|---|
| Agent 数据目录 | `~/.pi/agent` | 环境变量 `PI_CODING_AGENT_DIR` |
| 默认端口 | `30141` | `--port` / `PORT` 环境变量 |
| 绑定地址 | `0.0.0.0` | `--hostname` / `HOSTNAME` 环境变量 |
| 界面语言 | 跟随浏览器 | 设置 → 通用 → 语言 |
| 主题 | 跟随系统 | 设置 → 通用 → 主题 |

## 开发

```bash
npm install
npm run dev
```

本地开发端口为 <http://localhost:30141>。

常用检查：

```bash
node_modules/.bin/tsc --noEmit
npm run lint
```

开发时不要运行 `next build` / `npm run build`，它会写入 `.next/`，容易影响正在运行的 dev server。发布流程再执行构建。

## 项目结构

```text
app/
  api/
    agent/          # 创建/驱动 AgentSession，提供 SSE 事件流
    auth/           # OAuth 和 API key 管理
    cwd/validate/   # 自定义工作目录校验
    default-cwd/    # 获取 pi 默认工作目录
    files/          # 文件列表、读取、预览、watch
    home/           # 当前用户 home 目录
    models/         # 可用模型、默认模型、thinking levels
    models-config/  # 读写 models.json、测试模型
    sessions/       # 会话读取、重命名、删除、上下文、HTML 导出
    skills/         # skills 列表、搜索、安装、启停
components/
  AppShell.tsx        # 主布局、URL 状态、顶部面板、文件标签
  SessionSidebar.tsx  # 项目选择、会话树、Explorer
  ChatWindow.tsx      # 消息区、SSE、拖拽图片、minimap
  ChatInput.tsx       # 输入栏、模型/工具/thinking/compact/slash controls
  MessageView.tsx     # 消息、thinking、tool call/result 渲染
  ModelsConfig.tsx    # 模型和认证配置面板
  SkillsConfig.tsx    # 技能管理面板
  FileExplorer.tsx    # 文件树
  FileViewer.tsx      # 源码、diff、图片、音频、PDF、DOCX 预览
lib/
  rpc-manager.ts      # AgentSessionWrapper 生命周期和全局 registry
  session-reader.ts   # 解析 .jsonl 会话文件和分支上下文
  tool-presets.ts     # 内置工具白名单预设
  i18n/dictionary.ts  # 所有界面字符串，按命名空间组织
hooks/
  useAgentSession.ts  # 会话加载、发送命令、SSE 状态机
  useTheme.ts         # 主题 + 圆形擦除动画
  useLocale.tsx       # 语言 + i18n 字典查找
bin/
  mindora.js          # npm CLI 入口
```

## 贡献

欢迎 issue 和 PR —— 流程见 [CONTRIBUTING.md](./CONTRIBUTING.md)。参与即表示同意遵守 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)。

## 致谢

Mindora 是 [`@agegr/pi-web`](https://github.com/agegr/pi-web) 的**品牌化再发行与持续维护版本**，原作者 **agegr**，MIT 协议发布。原始代码、架构和上游 agent 集成均出自原作者；Mindora 在其之上增加了 Mindora 品牌、色彩系统和持续的产品工作。

- **pi 编程智能体** — 由 Mario Zechner ([@badlogic](https://github.com/badlogic)) 和 [pi-mono](https://github.com/badlogic/pi-mono) 项目开发。
- **pi-web（原始版本）** — 由 [agegr](https://github.com/agegr) 开发。Mindora 基于这份代码。

## 协议

MIT —— 详见 [LICENSE](./LICENSE)。

```
MIT License
Copyright (c) 2026 agegr
Copyright (c) 2026 Remory (Mindora 品牌化与持续工作)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

完整文本见 [LICENSE](./LICENSE)。
