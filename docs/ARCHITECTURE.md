# AI 投研助手 - 项目架构文档

本文档描述项目结构、技术栈、数据流与关键模块，供开发与 AI 协作时查阅。

---

## 1. 项目概述

- **名称**：stock-ai-assistant（AI 投研助手）
- **定位**：基于本地 Ollama 的股票研究与舆情分析对话应用，单页聊天界面。
- **技术**：Next.js 16 App Router + React 19 + Vercel AI SDK + Shadcn UI + Tailwind v4。

---

## 2. 目录结构

```
stock-ai-assistant/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # 根布局：字体、metadata、globals.css
│   │   ├── page.tsx            # 首页：唯一页面，聊天 UI + 本地存储
│   │   ├── globals.css         # Tailwind + Shadcn 主题变量
│   │   └── api/
│   │       └── chat/
│   │           └── route.ts    # POST /api/chat：流式对话 API
│   ├── components/
│   │   └── ui/                 # Shadcn 组件（button, card, scroll-area, skeleton 等）
│   └── lib/
│       └── utils.ts            # cn() 等工具
├── docs/
│   ├── ARCHITECTURE.md         # 本文件：架构与数据流
│   ├── DESIGN.md               # 设计原则与编码规范
│   └── README.md               # 文档索引
├── memory-bank/
│   ├── OPERATIONS.md           # AI 操作日志（每次修改后追加）
│   └── README.md               # memory-bank 说明与约定
├── .cursor/
│   └── rules/                  # Cursor 规则：自动读 docs、修改后更新 memory-bank
├── components.json             # Shadcn 配置（new-york, @/components 等）
├── package.json
├── tsconfig.json               # paths: @/* -> ./src/*
└── next.config.ts
```

- **入口**：`src/app/page.tsx` 为唯一业务页面，无路由分支。
- **API**：仅有一个接口 `POST /api/chat`，由 `src/app/api/chat/route.ts` 实现。

---

## 3. 技术栈与依赖

| 类别     | 技术 / 包 |
|----------|-----------|
| 框架     | Next.js 16 (App Router), React 19 |
| AI 对话  | `ai`, `@ai-sdk/react`, `@ai-sdk/openai`（兼容 Ollama） |
| 流式协议 | 后端 `streamText().toTextStreamResponse()`，前端 `TextStreamChatTransport` |
| UI       | Shadcn (Radix), Tailwind v4, tw-animate-css, class-variance-authority |
| 样式     | globals.css 中 CSS 变量（:root / .dark），Shadcn 主题 |
| 工具     | clsx, tailwind-merge（cn）, react-markdown |

- **Ollama**：通过 `@ai-sdk/openai` 的 `createOpenAI({ baseURL })` 对接本地 Ollama，API Key 为占位。

---

## 4. 数据流

### 4.1 聊天消息流

1. **前端**（`page.tsx`）
   - `useChat({ transport: new TextStreamChatTransport({ api: "/api/chat" }) })` 管理 `messages`、`status`、`error`、`sendMessage`、`setMessages`。
   - 用户输入 / 预设按钮 → `sendMessage({ text })`，不直接读写的 `fetch`。
   - 后端返回**纯文本流**（非 JSON 流），由 `TextStreamChatTransport` 解析并更新 `messages`。

2. **后端**（`api/chat/route.ts`）
   - 接收 `POST` body：`{ messages: Array<{ role, content?, parts? }> }`。
   - 使用 `toModelMessages()` 将前端的 UI 消息（含 `parts`）转为 `{ role, content: string }`。
   - 加上固定 `system` 提示词后调用 `streamText()`，返回 `result.toTextStreamResponse()`。

3. **消息形态**
   - 前端展示：`message.parts`（type "text" 的 text 拼接）或兜底 `message.content`。
   - 持久化：`StoredMessage` 与上述结构兼容，含 `id`、`role`、`parts`/`content`。

### 4.2 本地存储流

- **键**：`localStorage` 键为 `"stock-ai-assistant-chat"`。
- **格式**：`{ messages: StoredMessage[], savedAt: number }`，仅保留**最近 20 条**消息。
- **恢复**：页面加载时在 `useEffect` 中执行一次 `loadMessagesFromStorage()` → `setMessages(stored)`，由 `hasRestoredRef` 保证只恢复一次。
- **持久化**：`messages` 变化后（且已恢复过）`saveMessagesToStorage(messages.slice(-20))`。
- **清空**：清空对话时 `setMessages([])` 并 `localStorage.removeItem(CHAT_STORAGE_KEY)`。

### 4.3 错误流

- **API 错误**：后端 catch 后按类型返回 400 / 500 / 503 和 `{ error: string }`。
- **前端**：`useChat` 的 `error` 对象，通过 `getErrorType(error.message)` 区分为「网络错误」「AI 服务错误」「客户端错误」等，并展示不同标题与提示（含无障碍与样式约定见 DESIGN.md）。

---

## 5. 环境变量

在项目根目录 `.env.local`（不提交）中配置：

| 变量              | 说明 |
|-------------------|------|
| `OLLAMA_BASE_URL` | Ollama 服务地址，如 `http://localhost:11434`，API 会自动补 `/v1`。 |
| `OLLAMA_MODEL`    | 模型名，如 `llama3.2`。 |

- 未配置时接口返回 500，提示缺少环境变量。

---

## 6. 关键文件职责

| 文件 | 职责 |
|------|------|
| `src/app/page.tsx` | 聊天 UI、useChat、本地存储恢复/持久化/清空、错误分类展示、预设问题、时间戳、自动滚动、Enter/Shift+Enter。 |
| `src/app/api/chat/route.ts` | 校验 body、读取环境变量、创建 Ollama 客户端、toModelMessages、streamText、错误分类返回 400/503/500。 |
| `src/app/layout.tsx` | 根布局、字体变量、metadata、引入 globals.css。 |
| `src/app/globals.css` | Tailwind 入口、Shadcn 主题变量、base 样式。 |
| `src/lib/utils.ts` | `cn()` 合并 class。 |
| `src/components/ui/*` | Shadcn 基础组件，保持与 components.json 一致，不在此项目内改 API。 |

---

## 7. 与 AI 协作时的注意点

- 修改聊天协议或消息结构时，需同时考虑：前端 `page.tsx` 的展示与存储类型、后端 `toModelMessages` 与 body 类型。
- 新增 API 或页面时，应在本文档中更新目录与数据流说明。
- 环境变量、localStorage 键、最大消息条数等常量集中在 `page.tsx` 与 `route.ts` 顶部，修改时注意前后端与存储一致性。
