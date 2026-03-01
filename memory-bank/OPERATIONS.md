# AI 操作日志

每条记录格式如下（复制模板在末尾追加即可）：

```markdown
## 版本 N — YYYY-MM-DD

- **摘要**：一句话描述本次修改内容。
- **涉及文件**：`path/to/file1`、`path/to/file2`
- **说明**：（可选）重要决策或与架构/设计文档的关联。
```

版本号按操作顺序递增（1, 2, 3…）。

---

## 版本 1 — 2025-03-01

- **摘要**：初始化 memory-bank：新增 `memory-bank/README.md`、`memory-bank/OPERATIONS.md`，并约定操作日志格式与 Cursor 规则中的自动更新要求。
- **涉及文件**：`memory-bank/README.md`、`memory-bank/OPERATIONS.md`、`.cursor/rules/stock-ai-assistant.mdc`
- **说明**：为满足「AI 每次操作记录与版本记录」及「修改时自动查看 docs」而建立本目录与规则更新。

## 版本 2 — 2025-03-01

- **摘要**：建立 memory-bank 使用约定，规则中明确「开始时自动读取 docs/ARCHITECTURE.md 与 docs/DESIGN.md」「修改完成后更新 memory-bank/OPERATIONS.md」。
- **涉及文件**：`memory-bank/README.md`、`memory-bank/OPERATIONS.md`、`.cursor/rules/stock-ai-assistant.mdc`
- **说明**：用户要求自动查看 docs、无需每次输入；且每次 AI 操作记录到 memory-bank 并在 rules 中固化。

## 版本 3 — 2025-03-01

- **摘要**：在 ARCHITECTURE、docs/README、根 README 中补充 memory-bank 目录说明与 OPERATIONS 链接。
- **涉及文件**：`docs/ARCHITECTURE.md`、`docs/README.md`、`README.md`
- **说明**：保持项目文档与 memory-bank 约定一致，便于后续查阅。
