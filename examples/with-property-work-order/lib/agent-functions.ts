"use client";

import type {
  ClassifyResult,
  ExtractResult,
  GuideResult,
  MatchResult,
  SuggestResult,
} from "@/lib/deepseek";
import * as mockFns from "@/lib/mock-functions";
import { pickGuideFallback } from "@/lib/mock-data";
import {
  CAMPUS_FORM_THINKING_LINES,
  CAMPUS_SUGGEST_THINKING_LINES,
  CAMPUS_THINKING_LINES,
} from "@/lib/stream";
import type { WorkOrder, WorkOrderDraft } from "@/lib/types";

type AgentResponse<T> = { ok: true; result: T } | { error: string };

let llmEnabledCache: boolean | null = null;

export async function fetchLlmStatus(force = false): Promise<boolean> {
  if (!force && llmEnabledCache !== null) return llmEnabledCache;
  try {
    const response = await fetch("/api/agent", { method: "GET" });
    if (!response.ok) {
      llmEnabledCache = false;
      return false;
    }
    const data = (await response.json()) as { llmEnabled?: boolean };
    llmEnabledCache = Boolean(data.llmEnabled);
    return llmEnabledCache;
  } catch {
    llmEnabledCache = false;
    return false;
  }
}

async function callAgent<T>(
  action: string,
  input?: Record<string, unknown>,
): Promise<T | null> {
  const enabled = await fetchLlmStatus();
  if (!enabled) return null;
  try {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, input }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as AgentResponse<T>;
    if (!("ok" in data) || !data.ok) return null;
    return data.result;
  } catch {
    return null;
  }
}

export async function classifyUserIntent(input: {
  text: string;
  hasWorkOrder: boolean;
}): Promise<ClassifyResult | null> {
  return callAgent<ClassifyResult>("classify", input);
}

export async function guideUnclearIntent(input: {
  text: string;
  hasWorkOrder: boolean;
}): Promise<string> {
  const llm = await callAgent<GuideResult>("guide", input);
  if (llm?.reply?.trim()) {
    const tips = (llm.suggestions ?? []).filter(Boolean).slice(0, 3);
    if (tips.length === 0) return llm.reply.trim();
    return `${llm.reply.trim()}\n\n你可以这样说：\n${tips
      .map((item) => `· ${item}`)
      .join("\n")}`;
  }
  return pickGuideFallback(input.text);
}

export async function extractWorkOrderFields(input: { userText: string }) {
  const llm = await callAgent<ExtractResult>("extract", input);
  if (llm) {
    return {
      known: llm.known,
      guesses: {
        serviceType: llm.guesses.serviceType,
        category: llm.guesses.category,
        campus: llm.guesses.campus,
      },
      missingFields: llm.missingFields,
      simulated: true as const,
      inputEcho: input.userText,
      thinkingLines: llm.thinkingLines,
      source: "llm" as const,
    };
  }

  const fallback = await mockFns.extractWorkOrderFields(input);
  return {
    ...fallback,
    thinkingLines: [...CAMPUS_THINKING_LINES],
    source: "mock" as const,
  };
}

export async function matchSpaceAndDevice(input?: {
  values?: Partial<WorkOrderDraft>;
  description?: string | undefined;
}) {
  const values = Object.fromEntries(
    Object.entries(input?.values ?? {}).map(([key, value]) => [
      key,
      String(value ?? ""),
    ]),
  );
  const llm = await callAgent<MatchResult>("match", {
    values,
    ...(input?.description ? { description: input.description } : {}),
  });
  if (llm) {
    return {
      campus: llm.campus,
      space: llm.space,
      device: llm.device,
      simulated: true as const,
      thinkingLines: llm.thinkingLines,
      source: "llm" as const,
    };
  }

  const fallback = await mockFns.matchSpaceAndDevice();
  return {
    ...fallback,
    thinkingLines: [...CAMPUS_FORM_THINKING_LINES],
    source: "mock" as const,
  };
}

export async function suggestAssignee(input: {
  workOrderId?: string;
  workOrder?: WorkOrder;
}) {
  const order = input.workOrder;
  const llm = order
    ? await callAgent<SuggestResult>("suggest", {
        workOrderId: order.id,
        title: order.title,
        category: order.category,
        space: order.space,
        description: order.description,
      })
    : null;

  if (llm) {
    return {
      workOrderId: llm.workOrderId,
      candidates: llm.candidates,
      recommendedId: llm.recommendedId,
      recommendedName: llm.recommendedName,
      reasons: llm.reasons,
      simulated: true as const,
      thinkingLines: llm.thinkingLines,
      source: "llm" as const,
    };
  }

  const fallback = await mockFns.suggestAssignee({
    ...(input.workOrderId ? { workOrderId: input.workOrderId } : {}),
  });
  return {
    ...fallback,
    thinkingLines: [...CAMPUS_SUGGEST_THINKING_LINES],
    source: "mock" as const,
  };
}

export async function checkAttachmentRequirement(draft: WorkOrderDraft) {
  return mockFns.checkAttachmentRequirement(draft);
}

export const createMockWorkOrder = mockFns.createMockWorkOrder;
export const assignMockWorkOrder = mockFns.assignMockWorkOrder;
export const resetDemo = mockFns.resetDemo;
