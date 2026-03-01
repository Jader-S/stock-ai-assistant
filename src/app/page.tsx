"use client"

/**
 * AI 投研助手 - 首页聊天界面
 * 使用 Vercel AI SDK 的 useChat 连接 /api/chat，实现流式对话。
 */

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { TextStreamChatTransport } from "ai"
import ReactMarkdown from "react-markdown"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** 根据错误信息区分错误类型，用于展示不同提示 */
function getErrorType(message: string): "network" | "ai_service" | "client" | "unknown" {
  const m = message.toLowerCase()
  if (
    m.includes("failed to fetch") ||
    m.includes("network") ||
    m.includes("load failed") ||
    m.includes("econnrefused") ||
    m.includes("econnreset") ||
    m.includes("timeout")
  ) {
    return "network"
  }
  if (
    m.includes("ollama") ||
    m.includes("服务器") ||
    m.includes("配置错误") ||
    m.includes("内部错误") ||
    m.includes("不可用")
  ) {
    return "ai_service"
  }
  if (m.includes("请求体") || m.includes("格式错误")) return "client"
  return "unknown"
}

/** 格式化为本地时间 HH:mm */
function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
}

const PRESET_QUESTIONS = ["分析 AAPL", "分析 TSLA", "分析 00700"] as const

const CHAT_STORAGE_KEY = "stock-ai-assistant-chat"
const MAX_STORED_MESSAGES = 20

/** 可序列化的单条消息（与 useChat 的 UIMessage 兼容） */
type StoredMessage = {
  id: string
  role: string
  parts?: Array<{ type: string; text?: string }>
  content?: string
}

function loadMessagesFromStorage(): StoredMessage[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as { messages?: unknown[] }
    const list = Array.isArray(data?.messages) ? data.messages : []
    // 只保留结构合法的消息对象（含 id、role），并限制条数
    return list
      .filter(
        (m): m is StoredMessage =>
          m != null &&
          typeof m === "object" &&
          typeof (m as StoredMessage).id === "string" &&
          typeof (m as StoredMessage).role === "string"
      )
      .slice(-MAX_STORED_MESSAGES)
  } catch {
    return []
  }
}

function saveMessagesToStorage(messages: StoredMessage[]) {
  if (typeof window === "undefined") return
  try {
    const toSave = messages.slice(-MAX_STORED_MESSAGES)
    localStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify({ messages: toSave, savedAt: Date.now() })
    )
  } catch {
    // 忽略存储失败（如隐私模式）
  }
}

export default function HomePage() {
  const [inputValue, setInputValue] = React.useState("")
  const hasRestoredRef = React.useRef(false)

  const {
    messages,
    status,
    error,
    sendMessage,
    setMessages,
  } = useChat({
    transport: new TextStreamChatTransport({ api: "/api/chat" }),
  })

  const isLoading = status === "streaming" || status === "submitted"

  // 页面加载时从 localStorage 恢复历史对话（仅执行一次）
  React.useEffect(() => {
    if (hasRestoredRef.current) return
    hasRestoredRef.current = true
    const stored = loadMessagesFromStorage()
    if (stored.length > 0) {
      setMessages(stored as Parameters<typeof setMessages>[0])
    }
  }, [setMessages])

  // 消息变化时持久化到 localStorage，最多保留最近 20 条
  React.useEffect(() => {
    if (!hasRestoredRef.current) return
    const toStore = messages as unknown as StoredMessage[]
    saveMessagesToStorage(toStore)
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = inputValue.trim()
    if (!text || isLoading) return
    sendMessage({ text })
    setInputValue("")
  }

  // 清空对话时同时清除 localStorage
  const handleClearChat = () => {
    setMessages([])
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(CHAT_STORAGE_KEY)
      } catch {}
    }
  }

  // 每条消息的首次出现时间（用于时间戳展示），仅在 effect 中更新避免在渲染时访问 ref
  const [messageTimes, setMessageTimes] = React.useState<Record<string, string>>({})
  // 只对新出现的消息 id 写入当前时间，用于时间戳展示
  React.useEffect(() => {
    setMessageTimes((prev) => {
      let changed = false
      const next = { ...prev }
      messages.forEach((msg) => {
        if (!(msg.id in next)) {
          next[msg.id] = formatMessageTime(new Date())
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [messages])

  // 自动滚动到底部：新消息或开始加载时
  const bottomRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  // 预设问题：点击后直接发送，不经过输入框
  const handlePresetClick = (text: string) => {
    if (!text.trim() || isLoading) return
    sendMessage({ text: text.trim() })
  }

  // 输入框：Enter 发送，Shift+Enter 换行
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return
    if (e.shiftKey) return // Shift+Enter 保持换行
    e.preventDefault()
    const text = inputValue.trim()
    if (!text || isLoading) return
    sendMessage({ text })
    setInputValue("")
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ========== 顶部：标题 + 清空对话 ========== */}
      <header className="shrink-0 border-b bg-card px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">
            AI 投研助手
          </h1>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            disabled={isLoading || messages.length === 0}
            className="text-muted-foreground hover:text-foreground"
          >
            清空对话
          </Button>
        </div>
      </header>

      {/* ========== 中间：可滚动的聊天消息区域 ========== */}
      <main className="flex-1 overflow-hidden px-4 py-4">
        <Card className="mx-auto h-full max-w-3xl overflow-hidden">
          <ScrollArea className="h-[50vh] min-h-[280px] w-full">
            <div className="flex flex-col gap-4 p-4">
              {/* 无消息且未在加载时：显示欢迎骨架屏，提示用户输入 */}
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col gap-3 py-4">
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-1/2 rounded-md" />
                  <Skeleton className="h-4 w-4/5 rounded-md" />
                  <p className="text-muted-foreground text-sm">
                    输入问题开始对话，例如：简要介绍某只股票的基本面。
                  </p>
                </div>
              )}

              {/* 有消息或正在加载时：渲染消息列表 */}
              {messages.map((message) => {
                const isUser = message.role === "user"
                // 统一从 parts 中取出文本；若无 parts 则兜底用 content（兼容不同 SDK 形态）
                const textContent =
                  message.parts
                    ?.filter(
                      (p): p is { type: "text"; text: string } => p.type === "text"
                    )
                    .map((p) => p.text)
                    .join("") ??
                  (typeof (message as unknown as { content?: string }).content ===
                  "string"
                    ? (message as unknown as { content: string }).content
                    : "")
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex w-full flex-col gap-0.5",
                      isUser ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap break-words">
                          {textContent}
                        </div>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{textContent}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs text-muted-foreground",
                        isUser ? "mr-1" : "ml-1"
                      )}
                    >
                      {messageTimes[message.id] ?? "—"}
                    </span>
                  </div>
                )
              })}

              {/* 正在流式输出时：在最后显示一个“正在输入”的占位，提升体验 */}
              {isLoading && messages[messages.length - 1]?.role === "assistant" && (
                <span className="text-muted-foreground text-xs">正在输入…</span>
              )}
              {/* 占位元素，用于滚动到底部 */}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* ========== 错误提示：区分网络错误与 AI 服务错误 ========== */}
          {error && (() => {
            const msg = error.message || "请求失败，请稍后重试。"
            const type = getErrorType(msg)
            const isNetwork = type === "network"
            const isAiService = type === "ai_service"
            const title = isNetwork
              ? "网络错误"
              : isAiService
                ? "AI 服务错误"
                : "请求失败"
            const hint = isNetwork
              ? "请检查网络连接或代理设置后重试。"
              : isAiService
                ? "请确认 Ollama 已启动且环境变量配置正确。"
                : "请检查输入或稍后重试。"
            return (
              <div
                className={cn(
                  "border-t px-4 py-2 text-sm",
                  isNetwork && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                  isAiService && "bg-destructive/10 text-destructive",
                  type === "unknown" && "bg-destructive/10 text-destructive"
                )}
              >
                <span className="font-medium">{title}</span>
                <span className="ml-1">{msg}</span>
                <p className="mt-1 text-xs opacity-90">{hint}</p>
              </div>
            )
          })()}

          <CardContent className="border-t p-4 space-y-3">
            {/* ========== 预设问题（桌面端显示，移动端隐藏）========== */}
            <div className="hidden md:flex flex-wrap gap-2">
              {PRESET_QUESTIONS.map((label) => (
                <Button
                  key={label}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => handlePresetClick(label)}
                  className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {label}
                </Button>
              ))}
            </div>
            {/* ========== 底部：多行输入（Enter 发送，Shift+Enter 换行）+ 发送按钮 ========== */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入问题…（Enter 发送，Shift+Enter 换行）"
                className={cn(
                  "flex min-h-10 max-h-32 w-full min-w-0 resize-y rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  "disabled:pointer-events-none disabled:opacity-50 md:text-sm"
                )}
                rows={2}
                disabled={isLoading}
                aria-label="输入消息"
              />
              <Button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="min-h-10 shrink-0 self-end"
              >
                {isLoading ? "发送中…" : "发送"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      {/* ========== 免责声明 ========== */}
      <footer className="shrink-0 py-3 text-center text-xs text-muted-foreground">
        仅供参考，不构成投资建议
      </footer>
    </div>
  )
}
