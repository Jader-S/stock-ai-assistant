import { NextResponse } from "next/server"
import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

// 前端 useChat 发送的是 UI 消息格式（带 parts），streamText 需要的是 model 消息格式（带 content: string）
type UIMessagePart = { type: "text"; text: string } | { type: string; [k: string]: unknown }
type ChatRequestBody = {
  messages: Array<{
    role: "system" | "user" | "assistant"
    content?: string
    parts?: UIMessagePart[]
  }>
}

const MODEL_ROLES = ["system", "user", "assistant"] as const

/** 将前端传来的 UI 消息（可能带 parts）转成 streamText 需要的 { role, content: string } */
function toModelMessages(
  uiMessages: ChatRequestBody["messages"]
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  return uiMessages
    .filter((m) => MODEL_ROLES.includes(m.role as (typeof MODEL_ROLES)[number]))
    .map((m) => {
      let content = ""
      if (typeof m.content === "string") {
        content = m.content
      } else if (Array.isArray(m.parts)) {
        content = m.parts
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("")
      }
      return { role: m.role, content }
    })
}

// 处理 POST 请求，即 /api/chat 的主入口
export async function POST(req: Request) {
  try {
    // 1. 解析前端传来的 JSON 请求体
    const body = (await req.json()) as ChatRequestBody

    // 2. 基础校验：确保 messages 存在且为数组
    if (!body?.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        {
          error: "请求体格式错误：必须提供 messages 数组。",
        },
        { status: 400 },
      )
    }

    // 3. 从环境变量中读取 Ollama 相关配置
    const rawBaseURL = process.env.OLLAMA_BASE_URL
    const modelName = process.env.OLLAMA_MODEL

    if (!rawBaseURL || !modelName) {
      // 如果环境变量没有配置好，属于服务端配置问题，返回 500
      return NextResponse.json(
        {
          error: "服务器配置错误：缺少 OLLAMA_BASE_URL 或 OLLAMA_MODEL 环境变量。",
        },
        { status: 500 },
      )
    }

    // 4. 规范化 baseURL，并使用 @ai-sdk/openai 创建一个 OpenAI 兼容的客户端，指向本地 Ollama
    //    - baseURL：指向本地 Ollama 的 OpenAI 兼容接口，一般是 http://localhost:11434/v1
    //    - apiKey：Ollama 实际上不需要，但适配器类型上通常要求提供一个值，这里可以随便填
    // 去掉可能存在的末尾斜杠，避免出现类似 http://localhost:11434//v1
    const trimmedBaseURL = rawBaseURL.replace(/\/$/, "")
    // 如果没有带 /v1，则自动补上，使其符合 Ollama 的 OpenAI 风格接口路径
    const baseURL = trimmedBaseURL.endsWith("/v1")
      ? trimmedBaseURL
      : `${trimmedBaseURL}/v1`

    const openai = createOpenAI({
      baseURL,
      apiKey: "ollama-local-any-string", // Ollama 不校验 key，这里只是占位
    })

    // 5. 定义系统提示词（system prompt）
    const systemPrompt =
      "你是一个专业的金融分析助手。你只提供信息整理和舆情分析，不提供投资建议。回答要简洁、客观，包含风险提示。"

    // 6. 将前端的 UI 消息转为 model 消息格式，再拼上 system prompt，供 streamText 使用
    const modelMessages = toModelMessages(body.messages)
    const result = await streamText({
      model: openai.chat(modelName),
      messages: [
        { role: "system", content: systemPrompt },
        ...modelMessages,
      ],
    })

    // 7. 将结果转换成 Next.js App Router 兼容的流式文本流响应返回给前端
    // 当前安装的 AI SDK 版本上，streamText 返回的结果提供的是 toTextStreamResponse 方法
    // （而不是 toDataStreamResponse），因此这里改为使用 toTextStreamResponse。
    return result.toTextStreamResponse()
  } catch (error: unknown) {
    // 8. 错误处理：这里会捕获到网络错误、解析错误等
    if (process.env.NODE_ENV === "development") {
      console.error("Chat API error:", error)
    }

    // 如果是 Ollama 服务不可用（大概率是端口没开 / 容器没启动），返回 503
    const message =
      error instanceof Error ? error.message : String(error ?? "")
    // 识别连接类错误（Ollama 未启动、端口未开等）
    const isConnectionError =
      message.includes("ECONNREFUSED") ||
      message.includes("connect ECONN") ||
      message.includes("fetch failed") ||
      message.includes("Failed to fetch")

    if (isConnectionError) {
      return NextResponse.json(
        {
          error:
            "本地 Ollama 服务不可用，请确认已在 OLLAMA_BASE_URL 指定的地址启动（通常是 http://localhost:11434）。",
        },
        { status: 503 },
      )
    }

    // 其他未知错误统一返回 500，避免把内部细节暴露给前端
    return NextResponse.json(
      {
        error: "服务器内部错误，请稍后重试。",
      },
      { status: 500 },
    )
  }
}
