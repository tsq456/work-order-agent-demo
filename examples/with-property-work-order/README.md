# 园区物业工单助手

移动端 Chat 演示：自然语言报修 → 确认字段 → 工单草稿 / 创建 → 处理人员推荐。

支持两种模式：

| 模式 | 条件 | 行为 |
|------|------|------|
| 本地 Mock | 未配置 `DEEPSEEK_API_KEY` | 浏览器内剧本 + 启发式提取 |
| DeepSeek | 已配置 Key | Serverless `/api/agent` 按用户输入生成结构化数据 |

前端仍保留思考卡、骨架屏与 Tool UI；模型只负责填业务 JSON。

## 本地启动

```bash
# 在 monorepo 根目录
cp examples/with-property-work-order/.env.example examples/with-property-work-order/.env.local
# 编辑 .env.local，填入 DEEPSEEK_API_KEY（可选）

cd examples/with-property-work-order
corepack pnpm exec next dev -H 0.0.0.0 -p 3010
```

- 本机：http://localhost:3010  
- 健康检查：http://localhost:3010/api/agent → `{ "llmEnabled": true/false }`

## DeepSeek 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `DEEPSEEK_API_KEY` | 是（开 LLM） | DeepSeek API Key，仅服务端 |
| `DEEPSEEK_BASE_URL` | 否 | 默认 `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 否 | 默认 `deepseek-flash`（`deepseek-chat` 已退役） |

## 部署到 Vercel

1. 导入整个 `assistant-ui` monorepo（本示例依赖 `workspace:*` 包）。
2. Root Directory 设为 `examples/with-property-work-order`。
3. Build 设置（也可写在本目录 `vercel.json`）：
   - Install：`cd ../.. && pnpm install --filter with-property-work-order... --workspace-root`（EdgeOne **不要** `corepack enable`；Vercel 可加）
   - Build：`cd ../.. && pnpm exec turbo build --concurrency=1 --filter=@assistant-ui/react... --filter=@assistant-ui/react-markdown... --filter=@assistant-ui/next... && pnpm --filter with-property-work-order run build`
   - Node.js：`24.x`（monorepo `engines` 要求 ≥24.11）
4. 在项目环境变量中添加 `DEEPSEEK_API_KEY`（及可选 `DEEPSEEK_MODEL` / `DEEPSEEK_BASE_URL`）。
5. 部署后访问站点；打开 `/api/agent` 确认 `llmEnabled: true`。

> 不要用 `--filter=with-property-work-order...` 做 turbo build：会连带编 vue/rn 等无关包，EdgeOne `/dev/shm` 容易磁盘满（ENOSPC）。
> 不要使用 `output: 'export'` 纯静态导出，否则无法运行 `/api/agent` Serverless。
> EdgeOne Pages 可用同目录 `edgeone.json` 覆盖 Install/Build。

## 演示路径

1. 任意描述现场问题（接 LLM 后不必写死空调漏水话术）
2. 在「待确认信息」补全并确认
3. 补充现场附件 → 确认创建
4. 推荐处理人员 → 确认分派
5. 顶栏「重置」可重新开始

## API

`POST /api/agent`

```json
{ "action": "extract|match|suggest|classify|thinking", "input": { } }
```

无 Key 时返回 `503`，前端自动回退本地 Mock。
