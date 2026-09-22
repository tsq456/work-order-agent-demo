import { NextResponse } from "next/server";
import {
  getDeepseekConfig,
  isLlmConfigured,
  type AgentAction,
} from "@/lib/deepseek";
import {
  llmClassify,
  llmExtract,
  llmGuide,
  llmListOrders,
  llmMatch,
  llmSuggest,
  llmThinking,
} from "@/lib/llm-actions";

export const runtime = "nodejs";
export const maxDuration = 60;

type AgentRequest = {
  action: AgentAction;
  input?: Record<string, unknown>;
};

export async function GET() {
  const config = getDeepseekConfig();
  return NextResponse.json({
    llmEnabled: isLlmConfigured(),
    model: config?.model ?? null,
  });
}

export async function POST(req: Request) {
  if (!isLlmConfigured()) {
    return NextResponse.json(
      { error: "DEEPSEEK_API_KEY is not configured", llmEnabled: false },
      { status: 503 },
    );
  }

  let body: AgentRequest;
  try {
    body = (await req.json()) as AgentRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action;
  const input = body.input ?? {};

  try {
    switch (action) {
      case "classify": {
        const text = String(input.text ?? "");
        const hasWorkOrder = Boolean(input.hasWorkOrder);
        const result = await llmClassify({ text, hasWorkOrder });
        return NextResponse.json({ ok: true, result });
      }
      case "extract": {
        const userText = String(input.userText ?? input.text ?? "");
        if (!userText.trim()) {
          return NextResponse.json({ error: "userText required" }, { status: 400 });
        }
        const result = await llmExtract(userText);
        return NextResponse.json({ ok: true, result });
      }
      case "match": {
        const values = (input.values ?? {}) as Record<string, string>;
        const description =
          typeof input.description === "string" ? input.description : undefined;
        const result = await llmMatch({
          values,
          ...(description ? { description } : {}),
        });
        return NextResponse.json({ ok: true, result });
      }
      case "suggest": {
        const result = await llmSuggest({
          workOrderId: String(input.workOrderId ?? ""),
          title: String(input.title ?? ""),
          category: String(input.category ?? ""),
          space: String(input.space ?? ""),
          description: String(input.description ?? ""),
        });
        return NextResponse.json({ ok: true, result });
      }
      case "listOrders": {
        const result = await llmListOrders({
          text: String(input.text ?? "查看当前已有工单"),
        });
        return NextResponse.json({ ok: true, result });
      }
      case "thinking": {
        const phase = input.phase as "repair" | "form" | "suggest" | "list";
        const context = String(input.context ?? "");
        const result = await llmThinking({
          phase:
            phase === "form" ||
            phase === "suggest" ||
            phase === "repair" ||
            phase === "list"
              ? phase
              : "repair",
          context,
        });
        return NextResponse.json({ ok: true, result });
      }
      case "guide": {
        const text = String(input.text ?? "");
        const hasWorkOrder = Boolean(input.hasWorkOrder);
        const result = await llmGuide({ text, hasWorkOrder });
        return NextResponse.json({ ok: true, result });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
      }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent failed";
    return NextResponse.json({ error: message, llmEnabled: true }, { status: 502 });
  }
}
