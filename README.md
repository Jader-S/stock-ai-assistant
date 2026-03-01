# AI 投研助手 (stock-ai-assistant)

基于 Next.js 与本地 Ollama 的股票研究与舆情分析对话应用。单页聊天界面，支持流式回复、历史持久化与错误分类展示。

## 快速开始

### 环境要求

- Node.js 18+
- 本地已安装并运行 [Ollama](https://ollama.com)，且拉取过可用模型（如 `llama3.2`）

### 配置

在项目根目录创建 `.env.local`：

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### 安装与运行

```bash
npm install
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000) 即可使用。

## 项目文档（开发与 AI 协作必读）

| 文档 | 说明 |
|------|------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 项目架构：目录结构、技术栈、数据流、环境变量、关键文件职责 |
| [docs/DESIGN.md](docs/DESIGN.md) | 设计原则与编码规范：单页/API 约定、存储与错误、TypeScript/React/样式、修改检查清单 |
| [memory-bank/OPERATIONS.md](memory-bank/OPERATIONS.md) | AI 操作日志与版本记录（每次修改后由 AI 自动追加） |

**修改本项目前请先阅读 docs 中的架构与设计文档**，并遵循其中的设计原则与规范。  
本仓库已配置 Cursor 规则（`.cursor/rules/`）：**AI 在修改时会自动先读 docs，无需每次手动提醒**；**每次修改完成后会在 [memory-bank/OPERATIONS.md](memory-bank/OPERATIONS.md) 中追加操作记录**。

## 技术栈概览

- **框架**：Next.js 16 (App Router)、React 19  
- **AI**：Vercel AI SDK（`ai`、`@ai-sdk/react`、`@ai-sdk/openai`），通过 Ollama 兼容接口调用本地模型  
- **UI**：Shadcn UI、Tailwind CSS v4、react-markdown  

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 生产运行 |
| `npm run lint` | ESLint 检查 |

## 免责声明

本应用仅供信息整理与舆情分析参考，不构成任何投资建议。
