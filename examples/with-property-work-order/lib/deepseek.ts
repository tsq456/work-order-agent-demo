import {
  CAMPUS_OPTIONS,
  SERVICE_CATEGORY_OPTIONS,
  SERVICE_TYPE_OPTIONS,
} from "@/lib/dictionaries";

const SERVICE_TYPES = SERVICE_TYPE_OPTIONS.map((item) => item.value);
const SERVICE_CATEGORIES = SERVICE_CATEGORY_OPTIONS.map((item) => item.value);
const CAMPUSES = CAMPUS_OPTIONS.map((item) => item.value);

export type AgentAction =
  | "classify"
  | "extract"
  | "match"
  | "suggest"
  | "thinking"
  | "guide";

export type ClassifyResult = {
  intent:
    | "repair"
    | "suggest_assignee"
    | "reset"
    | "chat";
  reply?: string | undefined;
};

export type GuideResult = {
  reply: string;
  suggestions: string[];
};

export type ExtractResult = {
  known: {
    description: string;
    source: string;
    hasPhotoMention: boolean;
    locationHint: string;
    issueHint: string;
  };
  guesses: {
    serviceType: string;
    category: string;
    campus?: string | undefined;
  };
  missingFields: Array<
    "serviceType" | "category" | "campus" | "contactName" | "contactPhone"
  >;
  thinkingLines: string[];
};

export type MatchResult = {
  campus: string;
  space: string;
  device: string;
  thinkingLines: string[];
};

export type SuggestResult = {
  workOrderId: string;
  candidates: Array<{
    id: string;
    name: string;
    team: string;
    skills: string[];
    activeOrders: number;
    status: "可分派" | "处理中";
    recommended?: boolean;
    reasons?: string[];
  }>;
  recommendedId: string;
  recommendedName: string;
  reasons: string[];
  thinkingLines: string[];
};

export type ThinkingResult = {
  lines: string[];
};

export function isLlmConfigured() {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

export function getDeepseekConfig() {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (
      process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com"
    ).replace(/\/$/, ""),
    model: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-flash",
  };
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function deepseekJson<T>(
  messages: ChatMessage[],
  options?: { temperature?: number },
): Promise<T> {
  const config = getDeepseekConfig();
  if (!config) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: options?.temperature ?? 0.2,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `DeepSeek request failed (${response.status}): ${detail.slice(0, 300)}`,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek returned empty content");
  }

  return JSON.parse(content) as T;
}

export const AGENT_ENUMS = {
  serviceTypes: SERVICE_TYPES,
  serviceCategories: SERVICE_CATEGORIES,
  campuses: CAMPUSES,
} as const;

export function buildSystemPrompt() {
  return [
    "你是园区物业工单助手的后端推理模块。",
    "只返回合法 JSON，不要 Markdown，不要解释。",
    "根据用户真实输入生成合理业务数据，不要固定抄示例。",
    `服务类型只能是：${SERVICE_TYPES.join("、")}`,
    `服务分类只能是：${SERVICE_CATEGORIES.join("、")}`,
    `园区只能是：${CAMPUSES.join("、")}`,
  ].join("\n");
}
