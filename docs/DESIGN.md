# AI 投研助手 - 设计原则与规范

本文档约定本项目的设计原则与编码规范。**修改本项目前必须先阅读本文档与 [ARCHITECTURE.md](./ARCHITECTURE.md)**，并遵循以下约定，避免破坏一致性与可维护性。

---

## 1. 设计原则

### 1.1 单一职责与最小改动

- **单页应用**：目前仅一个业务页面（`page.tsx`），不做多路由复杂度，新增功能优先在现有页面上扩展。
- **单一 API**：对话只走 `POST /api/chat`；若新增能力（如工具调用），优先在同一 route 内扩展，或在此文档中说明新 API 的职责边界。
- **UI 组件**：`src/components/ui` 来自 Shadcn，不修改组件 API；只通过 props 与 className 使用，新 UI 优先用现有组件组合。

### 1.2 数据与展示约定

- **消息形态**：前端以 `useChat` 的 messages 为准，每条支持 `parts`（type "text"）或兜底 `content`；后端只消费 `role + content`，由 `toModelMessages` 做唯一转换。
- **本地存储**：仅保存「最近 20 条」消息，键与格式见 ARCHITECTURE；禁止在未更新文档的前提下改存储键或结构；清空对话必须同时清除 localStorage。
- **错误区分**：网络错误 / AI 服务错误 / 客户端错误在前端通过 `getErrorType(error.message)` 区分，展示不同标题与操作提示；后端错误信息不暴露内部细节，仅返回约定好的 `{ error: string }`。

### 1.3 用户体验约定

- **流式输出**：必须保持流式展示与自动滚动到底部；新消息或「正在输入」时滚动到底部。
- **输入**：Enter 发送，Shift+Enter 换行；预设按钮点击即发送，不经过输入框。
- **无障碍**：关键交互带 `aria-label`；错误区域考虑 `role="alert"` 或 `aria-live`（当前实现可在此基础上增强）。

---

## 2. 编码规范

### 2.1 语言与格式

- **注释与用户可见文案**：统一使用**简体中文**。
- **代码标识符**：变量、函数、类型、文件名使用英文；仅用户可见字符串（如按钮文案、错误提示、placeholder）使用中文。
- **文件**：TypeScript/TSX 使用双引号、分号与项目既有风格一致；新文件遵循现有缩进与换行。

### 2.2 TypeScript

- **类型**：禁止 `any`；捕获错误使用 `catch (error: unknown)`，再通过 `error instanceof Error` 或类型收窄使用。
- **API 与存储**：请求体、响应体、StoredMessage 等有明确类型或类型别名，修改时同步更新类型与文档。

### 2.3 React 与 Hooks

- **组件**：函数组件；逻辑可复用部分抽成自定义 Hook 或纯函数，避免单文件过长。
- **状态**：能用 `useRef` 不触发重绘的（如「是否已恢复存储」）用 ref；需要驱动 UI 的用 `useState`；副作用仅在 `useEffect` 内访问 ref/存储/API。
- **依赖**：`useEffect` 依赖数组完整、准确，避免遗漏或过度依赖导致死循环或未更新。

### 2.4 样式与 UI

- **Tailwind + Shadcn**：样式以 Tailwind 工具类为主，组件来自 `@/components/ui`，使用 `cn()` 做条件合并。
- **主题**：颜色/语义使用 CSS 变量（如 `bg-primary`、`text-muted-foreground`、`bg-destructive/10`），不硬编码色值；需新增语义时在 `globals.css` 的 `:root` / `.dark` 中扩展变量。
- **响应式**：预设问题等「桌面显示、移动隐藏」使用 `hidden md:flex` 等 Tailwind 断点，保持与现有约定一致。

### 2.5 错误与日志

- **生产环境**：不在前端或后端向控制台输出调试日志；后端 `console.error` 仅限 `NODE_ENV === "development"`。
- **错误处理**：API 内 catch 后按类型返回约定状态码与 `{ error: string }`；不向用户暴露堆栈或内部实现细节。

### 2.6 注释与文档

- **复杂逻辑**：如错误分类、消息格式转换、存储恢复/持久化、时间戳与 ref 的配合，必须有简短中文注释说明意图。
- **公开函数/类型**：可加 JSDoc（如 `@param`、`@returns` 或一句话说明）；修改行为时同步改注释与 DESIGN/ARCHITECTURE。

---

## 3. 文件与模块约定

### 3.1 路径别名

- 使用 `@/` 指向 `src/`（如 `@/components/ui`、`@/lib/utils`），不在业务代码中使用相对路径跨多层目录。

### 3.2 常量与配置

- 魔法数字/字符串集中为常量（如 `CHAT_STORAGE_KEY`、`MAX_STORED_MESSAGES`、`PRESET_QUESTIONS`），放在文件顶部或独立常量区；修改时检查是否影响存储、API 或 UI 约定。

### 3.3 新增功能时的检查清单

- [ ] 是否影响现有消息格式或 `/api/chat` 契约？若影响，是否已更新类型与 ARCHITECTURE？
- [ ] 是否涉及 localStorage？若是，是否遵循键、条数上限与清空逻辑？是否更新文档？
- [ ] 是否新增环境变量？若是，是否在 README 或 ARCHITECTURE 中说明？
- [ ] 是否引入新的用户可见错误？若是，是否纳入 `getErrorType` 或等价分类并符合 DESIGN 的错误展示约定？
- [ ] 复杂逻辑是否已加注释？是否通过 lint？

---

## 4. 与 AI 协作的强制约定

1. **修改前必读**：在修改本仓库任何业务代码前，先阅读 `docs/ARCHITECTURE.md` 与 `docs/DESIGN.md`，确保理解当前数据流、消息形态、存储与错误约定。
2. **一致性**：修改后行为与现有设计原则一致（单页、单 API、错误分类、存储条数、清空同步清除等）。
3. **文档同步**：新增 API、页面、环境变量、存储结构或错误类型时，同步更新 ARCHITECTURE 或 DESIGN，并在 PR/提交说明中注明。
4. **不破坏现有约定**：不删除或弱化错误区分、不扩大 localStorage 无上限、不暴露内部错误信息、不取消流式或自动滚动等已有 UX 约定，除非在设计文档中明确变更并说明原因。
