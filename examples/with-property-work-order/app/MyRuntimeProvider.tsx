"use client";

import {
  AssistantRuntimeProvider,
  makeAssistantToolUI,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AgentTraceToolUI } from "@/components/agent-trace-tool-ui";
import { CampusThinkingToolUI } from "@/components/campus-thinking-ui";
import { ClarifyFieldsToolUI } from "@/components/clarify-fields-tool-ui";
import { CompactToolResultUI } from "@/components/compact-tool-result-ui";
import { ReplyTypingToolUI } from "@/components/reply-typing-ui";
import { SuggestAssigneeToolUI } from "@/components/suggest-assignee-tool-ui";
import { WorkOrderCreatedToolUI } from "@/components/work-order-created-tool-ui";
import { WorkOrderDraftToolUI } from "@/components/work-order-draft-tool-ui";
import { useDemoStore } from "@/lib/demo-store";
import { EMPTY_DRAFT } from "@/lib/mock-data";
import * as agentFns from "@/lib/agent-functions";
import { classifyIntent } from "@/lib/intent";
import {
  CAMPUS_FORM_THINKING_LINES,
  CAMPUS_SUGGEST_THINKING_LINES,
  CAMPUS_THINKING_LINES,
  runThinkingSequence,
  sleep,
  streamText,
  updateMessageById,
} from "@/lib/stream";
import type { AgentTraceStep, WorkOrderDraft } from "@/lib/types";

/** Append-only thinking lines — never overwrite prior steps. */
function appendThinkingLine(lines: string[], next: string) {
  if (lines[lines.length - 1] === next) return lines;
  return [...lines, next];
}

type NestedTool = {
  toolName: string;
  result?: unknown;
  status: "running" | "done";
};

const convertMessage = (message: ThreadMessageLike) => message;

let toolCallSeq = 0;

type ToolCallPart = Extract<
  ThreadMessageLike["content"],
  readonly unknown[]
> extends readonly (infer P)[]
  ? Extract<P, { type: "tool-call" }>
  : never;

type ContentPart = Exclude<ThreadMessageLike["content"], string>[number];

function toolCall(
  toolName: string,
  args: Record<string, string | number | boolean | null | object>,
  result?: unknown,
  toolCallId?: string,
): ToolCallPart {
  toolCallSeq += 1;
  return {
    type: "tool-call" as const,
    toolCallId: toolCallId ?? `${toolName}-${toolCallSeq}`,
    toolName,
    args: args as Record<string, string | number | boolean | null>,
    argsText: JSON.stringify(args),
    ...(result === undefined ? {} : { result }),
  } as ToolCallPart;
}

function pendingTypingPart(assistantId: string) {
  return toolCall(
    "replyTyping",
    {},
    { simulated: true as const },
    `replyTyping-${assistantId}`,
  );
}

const PresentDraftUI = makeAssistantToolUI({
  toolName: "presentWorkOrderDraft",
  render: WorkOrderDraftToolUI,
});
const ClarifyUI = makeAssistantToolUI({
  toolName: "clarifyWorkOrderFields",
  render: ClarifyFieldsToolUI,
});
const TraceUI = makeAssistantToolUI({
  toolName: "agentTrace",
  render: AgentTraceToolUI,
});
const ThinkingUI = makeAssistantToolUI({
  toolName: "campusThinking",
  render: CampusThinkingToolUI,
});
const TypingUI = makeAssistantToolUI({
  toolName: "replyTyping",
  render: ReplyTypingToolUI,
});
const CreatedUI = makeAssistantToolUI({
  toolName: "createMockWorkOrder",
  render: WorkOrderCreatedToolUI,
});
const SuggestUI = makeAssistantToolUI({
  toolName: "suggestAssignee",
  render: SuggestAssigneeToolUI,
});
const ExtractUI = makeAssistantToolUI({
  toolName: "extractWorkOrderFields",
  render: CompactToolResultUI,
});
const MatchUI = makeAssistantToolUI({
  toolName: "matchSpaceAndDevice",
  render: CompactToolResultUI,
});
const AttachmentUI = makeAssistantToolUI({
  toolName: "checkAttachmentRequirement",
  render: CompactToolResultUI,
});
const AssignUI = makeAssistantToolUI({
  toolName: "assignMockWorkOrder",
  render: CompactToolResultUI,
});
const ResetUI = makeAssistantToolUI({
  toolName: "resetDemo",
  render: CompactToolResultUI,
});

type DemoActionDetail =
  | { type: "work_order_created"; workOrderId: string }
  | { type: "view_work_order"; workOrderId: string; silent?: boolean }
  | { type: "suggest_assignee"; workOrderId: string }
  | { type: "assigned"; workOrderId: string; message: string }
  | { type: "clarification_confirmed"; values: Partial<WorkOrderDraft> }
  | { type: "reset" };

function nextAssistantId(prefix: string) {
  toolCallSeq += 1;
  return `${prefix}-${toolCallSeq}`;
}

export function MyRuntimeProvider({ children }: { children: ReactNode }) {
  const demo = useDemoStore();
  const demoRef = useRef(demo);
  demoRef.current = demo;

  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<readonly ThreadMessageLike[]>([]);

  const patchAssistant = useCallback(
    (id: string, patch: Partial<ThreadMessageLike> & { content?: ContentPart[] }) => {
      setMessages((prev) =>
        updateMessageById(prev, id, (message) => ({
          ...message,
          ...patch,
        })),
      );
    },
    [],
  );

  const streamAssistantText = useCallback(
    async (id: string, fullText: string, prefixParts: ContentPart[] = []) => {
      await streamText(fullText, (partial) => {
        patchAssistant(id, {
          status: { type: "running" },
          content: [...prefixParts, { type: "text", text: partial }],
        });
      });
    },
    [patchAssistant],
  );

  const finishAssistant = useCallback(
    (id: string, content: ContentPart[]) => {
      patchAssistant(id, {
        status: { type: "complete", reason: "stop" },
        content,
      });
    },
    [patchAssistant],
  );

  const beginPendingReply = useCallback(() => {
    const id = nextAssistantId("assistant-pending");
    setIsRunning(true);
    setMessages((prev) => [
      ...prev,
      {
        id,
        role: "assistant",
        status: { type: "running" },
        content: [pendingTypingPart(id)],
      },
    ]);
    return id;
  }, []);

  const appendStreamingReply = useCallback(
    async (
      fullText: string,
      extraParts: ContentPart[] = [],
      options?: { reuseId?: string },
    ) => {
      const id = options?.reuseId ?? nextAssistantId("assistant-reply");
      setIsRunning(true);
      if (!options?.reuseId) {
        setMessages((prev) => [
          ...prev,
          {
            id,
            role: "assistant",
            status: { type: "running" },
            content: [{ type: "text", text: "" }],
          },
        ]);
      } else {
        patchAssistant(id, {
          status: { type: "running" },
          content: [{ type: "text", text: "" }],
        });
      }
      await streamAssistantText(id, fullText);
      finishAssistant(id, [{ type: "text", text: fullText }, ...extraParts]);
      setIsRunning(false);
    },
    [finishAssistant, patchAssistant, streamAssistantText],
  );

  /** Phase 1: analyze + ask user to confirm missing fields. */
  const runRepairClarifyFlow = useCallback(
    async (userText: string, options?: { reuseId?: string }) => {
      const store = demoRef.current;
      store.setDraft(() => ({
        ...EMPTY_DRAFT,
        attachments: [],
        status: "工单草稿",
      }));

      const assistantId = options?.reuseId ?? nextAssistantId("assistant-clarify");
      const thinkingId = `campusThinking-${assistantId}`;
      const clarifyId = `clarifyWorkOrderFields-${assistantId}`;

      setIsRunning(true);
      if (!options?.reuseId) {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            status: { type: "running" },
            content: [{ type: "text", text: "" }],
          },
        ]);
      }

      const intro =
        "收到报修描述。我先帮你核对园区档案与服务目录，稍后再请你确认缺失信息。";
      await streamAssistantText(assistantId, intro);

      let thinkingLines: string[] = [];
      let sequenceLines: string[] = [...CAMPUS_THINKING_LINES];
      let steps: AgentTraceStep[] = [
        {
          id: "intent",
          label: "园区总 Agent 正在识别用户意图",
          kind: "agent",
          status: "running",
        },
      ];
      let tools: NestedTool[] = [];
      let extracted: Awaited<ReturnType<typeof agentFns.extractWorkOrderFields>> | null =
        null;

      const thinkingResult = (done: boolean) => {
        const line =
          thinkingLines[thinkingLines.length - 1] ??
          "园区助手正在处理…";
        return {
          lines: thinkingLines,
          line,
          index: Math.max(0, thinkingLines.length - 1),
          total: Math.max(sequenceLines.length, thinkingLines.length, 1),
          done,
          steps,
          tools,
          simulated: true as const,
        };
      };

      const buildContent = (
        done: boolean,
        extra: ContentPart[] = [],
        texts: string[] = [intro],
      ): ContentPart[] => [
        ...texts.map((text) => ({ type: "text" as const, text })),
        toolCall(
          "campusThinking",
          { title: "园区助手思考中" },
          thinkingResult(done),
          thinkingId,
        ),
        ...extra,
      ];

      // Kick off extract immediately (LLM or local mock).
      const extractTask = (async () => {
        steps = [
          {
            id: "intent",
            label: "园区总 Agent 正在识别用户意图",
            kind: "agent",
            status: "done",
            resultSummary: "识别为物业报修诉求",
          },
          {
            id: "delegate",
            label: "园区总 Agent 调用物业 Agent",
            kind: "agent",
            status: "done",
            resultSummary: "已切换至物业 Agent",
          },
          {
            id: "extract",
            label: "物业 Agent 调用 extractWorkOrderFields",
            kind: "tool",
            toolName: "extractWorkOrderFields",
            status: "running",
          },
        ];
        tools = [
          {
            toolName: "extractWorkOrderFields",
            status: "running",
          },
        ];
        thinkingLines = appendThinkingLine(thinkingLines, "正在分析你的报修描述…");
        patchAssistant(assistantId, {
          content: buildContent(false),
        });
        const result = await agentFns.extractWorkOrderFields({ userText });
        extracted = result;
        if (result.thinkingLines?.length) {
          sequenceLines = result.thinkingLines;
        }
        steps = steps.map((step) =>
          step.id === "extract"
            ? {
                ...step,
                status: "done" as const,
                resultSummary: `已识别 ${result.known.issueHint}，缺 ${result.missingFields.length} 项`,
              }
            : step,
        );
        tools = [
          {
            toolName: "extractWorkOrderFields",
            status: "done",
            result,
          },
        ];
        return result;
      })();

      const finalExtracted = extracted ?? (await extractTask);
      await runThinkingSequence(
        sequenceLines,
        (payload) => {
          thinkingLines = appendThinkingLine(thinkingLines, payload.line);
          patchAssistant(assistantId, {
            status: { type: "running" },
            content: buildContent(false),
          });
        },
        900,
      );

      thinkingLines = appendThinkingLine(
        thinkingLines,
        "已完成初步分析，等待你确认关键信息",
      );

      store.setClarification({
        status: "awaiting_confirm",
        userText,
        knownFields: {
          description: finalExtracted.known.description,
          source: finalExtracted.known.source,
        },
        missingFields: finalExtracted.missingFields,
        guessedFields: {
          serviceType: finalExtracted.guesses.serviceType,
          category: finalExtracted.guesses.category,
          ...("campus" in finalExtracted.guesses && finalExtracted.guesses.campus
            ? { campus: finalExtracted.guesses.campus }
            : {}),
        },
      });

      const askText =
        "初步分析完成。联系人、电话、园区和服务分类等信息还不完整，请先确认后再生成工单草稿。";

      const clarifyPayload = {
        sessionId: clarifyId,
        phase: "generating" as const,
        knownSummary: [
          `问题：${finalExtracted.known.issueHint}`,
          `位置线索：${finalExtracted.known.locationHint}`,
          `描述：${finalExtracted.known.description}`,
          finalExtracted.known.hasPhotoMention
            ? "用户提到已拍摄现场照片"
            : "未明确附件情况",
        ],
        missingFields: finalExtracted.missingFields,
        guesses: finalExtracted.guesses,
        known: {
          description: finalExtracted.known.description,
          source: finalExtracted.known.source,
        },
        simulated: true as const,
      };

      // Keep intro; stream askText as a second paragraph (no overwrite).
      await streamText(askText, (partial) => {
        patchAssistant(assistantId, {
          status: { type: "running" },
          content: buildContent(
            true,
            [
              toolCall(
                "clarifyWorkOrderFields",
                { title: "确认缺失字段" },
                clarifyPayload,
                clarifyId,
              ),
            ],
            [intro, partial],
          ),
        });
      });

      await sleep(900);

      finishAssistant(assistantId, [
        { type: "text", text: intro },
        { type: "text", text: askText },
        toolCall(
          "campusThinking",
          { title: "园区助手思考中" },
          thinkingResult(true),
          thinkingId,
        ),
        toolCall(
          "clarifyWorkOrderFields",
          { title: "确认缺失字段" },
          { ...clarifyPayload, phase: "ready" as const },
          clarifyId,
        ),
      ]);
      setIsRunning(false);
    },
    [finishAssistant, patchAssistant, streamAssistantText],
  );

  /** Phase 2: after confirmation → match + attachment check + skeleton form. */
  const runFormAfterClarify = useCallback(
    async (values: Partial<WorkOrderDraft>) => {
      const store = demoRef.current;
      const assistantId = beginPendingReply();
      const thinkingId = `campusThinking-${assistantId}`;
      const draftId = `presentWorkOrderDraft-${assistantId}`;

      const intro = "关键信息已确认。我继续匹配空间设备，并生成工单草稿。";
      // Brief beat so typing dots are visible, then continue.
      await sleep(400);
      await streamAssistantText(assistantId, intro);

      let thinkingLines: string[] = [];
      let sequenceLines: string[] = [...CAMPUS_FORM_THINKING_LINES];
      let steps: AgentTraceStep[] = [
        {
          id: "confirmed",
          label: "用户已确认关键字段",
          kind: "agent",
          status: "done",
          resultSummary: `${values.serviceType}/${values.category}/${values.campus}`,
        },
        {
          id: "match",
          label: "物业 Agent 调用 matchSpaceAndDevice",
          kind: "tool",
          toolName: "matchSpaceAndDevice",
          status: "running",
        },
      ];
      let tools: NestedTool[] = [
        { toolName: "matchSpaceAndDevice", status: "running" },
      ];

      const thinkingResult = (done: boolean) => {
        const line =
          thinkingLines[thinkingLines.length - 1] ??
          "园区助手正在处理…";
        return {
          lines: thinkingLines,
          line,
          index: Math.max(0, thinkingLines.length - 1),
          total: Math.max(sequenceLines.length, thinkingLines.length, 1),
          done,
          steps,
          tools,
          simulated: true as const,
        };
      };

      const buildContent = (
        done: boolean,
        extra: ContentPart[] = [],
        texts: string[] = [intro],
      ): ContentPart[] => [
        ...texts.map((text) => ({ type: "text" as const, text })),
        toolCall(
          "campusThinking",
          { title: "园区助手思考中" },
          thinkingResult(done),
          thinkingId,
        ),
        ...extra,
      ];

      const backendTask = (async () => {
        thinkingLines = appendThinkingLine(
          thinkingLines,
          "已收到确认信息，正在匹配空间设备…",
        );
        patchAssistant(assistantId, { content: buildContent(false) });

        const matchResult = await agentFns.matchSpaceAndDevice({
          values,
          ...(values.description ? { description: values.description } : {}),
        });
        if (matchResult.thinkingLines?.length) {
          sequenceLines = matchResult.thinkingLines;
        }
        store.setDraft((prev) => ({
          ...prev,
          ...values,
          campus: values.campus || matchResult.campus,
          space: matchResult.space,
          device: matchResult.device,
          attachments: [],
          status: "工单草稿",
        }));
        steps = [
          {
            id: "confirmed",
            label: "用户已确认关键字段",
            kind: "agent",
            status: "done",
          },
          {
            id: "match",
            label: "物业 Agent 调用 matchSpaceAndDevice",
            kind: "tool",
            toolName: "matchSpaceAndDevice",
            status: "done",
            resultSummary: `${matchResult.space} / ${matchResult.device}`,
          },
          {
            id: "attachment",
            label: "物业 Agent 调用 checkAttachmentRequirement",
            kind: "tool",
            toolName: "checkAttachmentRequirement",
            status: "running",
          },
        ];
        tools = [
          {
            toolName: "matchSpaceAndDevice",
            status: "done",
            result: matchResult,
          },
          {
            toolName: "checkAttachmentRequirement",
            status: "running",
          },
        ];

        const draftForCheck = {
          ...EMPTY_DRAFT,
          ...values,
          campus: values.campus || matchResult.campus,
          space: matchResult.space,
          device: matchResult.device,
          attachments: [] as WorkOrderDraft["attachments"],
          status: "工单草稿" as const,
        };
        const check = await agentFns.checkAttachmentRequirement(draftForCheck);
        steps = steps.map((step) =>
          step.id === "attachment"
            ? {
                ...step,
                status: "done" as const,
                resultSummary: check.message,
              }
            : step,
        );
        steps = [
          ...steps,
          {
            id: "draft",
            label: "生成结构化工单草稿",
            kind: "agent",
            status: "running",
          },
        ];
        tools = [
          {
            toolName: "matchSpaceAndDevice",
            status: "done",
            result: matchResult,
          },
          {
            toolName: "checkAttachmentRequirement",
            status: "done",
            result: check,
          },
        ];
        return { matchResult, check };
      })();

      await backendTask;
      await runThinkingSequence(
        sequenceLines,
        (payload) => {
          thinkingLines = appendThinkingLine(thinkingLines, payload.line);
          const extras: ContentPart[] = [];
          if (payload.index >= Math.max(0, sequenceLines.length - 2)) {
            extras.push(
              toolCall(
                "presentWorkOrderDraft",
                {},
                { draftId: "draft-1", phase: "generating", simulated: true },
                draftId,
              ),
            );
          }
          patchAssistant(assistantId, {
            status: { type: "running" },
            content: buildContent(false, extras),
          });
        },
        850,
      );

      steps = steps.map((step) =>
        step.id === "draft"
          ? {
              ...step,
              status: "done" as const,
              resultSummary: "状态：工单草稿",
            }
          : step,
      );
      thinkingLines = appendThinkingLine(thinkingLines, "工单草稿已准备就绪");

      const readyText =
        "工单草稿已生成。请补充现场附件后确认创建；服务类型 / 分类 / 园区可在修改信息中通过选择器调整。";

      await streamText(readyText, (partial) => {
        patchAssistant(assistantId, {
          status: { type: "running" },
          content: buildContent(
            true,
            [
              toolCall(
                "presentWorkOrderDraft",
                {},
                { draftId: "draft-1", phase: "generating", simulated: true },
                draftId,
              ),
            ],
            [intro, partial],
          ),
        });
      });

      await sleep(600);

      finishAssistant(assistantId, [
        { type: "text", text: intro },
        { type: "text", text: readyText },
        toolCall(
          "campusThinking",
          { title: "园区助手思考中" },
          thinkingResult(true),
          thinkingId,
        ),
        toolCall(
          "presentWorkOrderDraft",
          {},
          { draftId: "draft-1", phase: "ready", simulated: true },
          draftId,
        ),
      ]);
      setIsRunning(false);
    },
    [finishAssistant, patchAssistant, streamAssistantText],
  );

  const runSuggestFlow = useCallback(
    async (workOrderId?: string, options?: { reuseId?: string }) => {
      const store = demoRef.current;
      const target =
        (workOrderId ? store.getWorkOrder(workOrderId) : undefined) ??
        store.getDemoWorkOrder();

      if (!target) {
        await appendStreamingReply(
          "当前还没有可推荐分派的工单。请先创建报修工单后再试。",
          [],
          options?.reuseId ? { reuseId: options.reuseId } : undefined,
        );
        return;
      }

      store.selectWorkOrder(target.id);
      const assistantId =
        options?.reuseId ?? nextAssistantId("assistant-suggest");
      const thinkingId = `campusThinking-${assistantId}`;
      const suggestId = `suggestAssignee-${assistantId}`;

      setIsRunning(true);
      if (!options?.reuseId) {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            status: { type: "running" },
            content: [{ type: "text", text: "" }],
          },
        ]);
      }

      const intro = `收到分派请求。我先核对工单 ${target.id} 的内容，再评估当前可接单人员。`;
      await streamAssistantText(assistantId, intro);

      let thinkingLines: string[] = [];
      let sequenceLines: string[] = [...CAMPUS_SUGGEST_THINKING_LINES];
      let steps: AgentTraceStep[] = [
        {
          id: "intent",
          label: "识别为处理人员推荐诉求",
          kind: "agent",
          status: "done",
          resultSummary: target.title,
        },
        {
          id: "roster",
          label: "拉取班组排班与在岗状态",
          kind: "agent",
          status: "running",
        },
      ];
      let tools: NestedTool[] = [];
      let suggestion: Awaited<ReturnType<typeof agentFns.suggestAssignee>> | null =
        null;

      const thinkingResult = (done: boolean) => {
        const line =
          thinkingLines[thinkingLines.length - 1] ?? "园区助手正在处理…";
        return {
          lines: thinkingLines,
          line,
          index: Math.max(0, thinkingLines.length - 1),
          total: Math.max(sequenceLines.length, thinkingLines.length, 1),
          done,
          steps,
          tools,
          simulated: true as const,
        };
      };

      const buildContent = (
        done: boolean,
        extra: ContentPart[] = [],
        texts: string[] = [intro],
      ): ContentPart[] => [
        ...texts.map((text) => ({ type: "text" as const, text })),
        toolCall(
          "campusThinking",
          { title: "园区助手思考中" },
          thinkingResult(done),
          thinkingId,
        ),
        ...extra,
      ];

      const backendTask = (async () => {
        thinkingLines = appendThinkingLine(
          thinkingLines,
          "正在读取工单内容与班组排班…",
        );
        patchAssistant(assistantId, { content: buildContent(false) });
        tools = [{ toolName: "suggestAssignee", status: "running" }];
        steps = [
          {
            id: "intent",
            label: "识别为处理人员推荐诉求",
            kind: "agent",
            status: "done",
          },
          {
            id: "roster",
            label: "拉取班组排班与在岗状态",
            kind: "agent",
            status: "done",
            resultSummary: "已获取在岗名单",
          },
          {
            id: "available",
            label: "筛选当前有空可接单人员",
            kind: "agent",
            status: "running",
          },
          {
            id: "suggest",
            label: "生成处理人员推荐方案",
            kind: "tool",
            toolName: "suggestAssignee",
            status: "running",
          },
        ];

        const result = await agentFns.suggestAssignee({
          workOrderId: target.id,
          workOrder: target,
        });
        suggestion = result;
        if (result.thinkingLines?.length) {
          sequenceLines = result.thinkingLines;
        }
        store.setCandidates(result.candidates);
        store.setSelectedAssigneeId(result.recommendedId);
        const availableCount = result.candidates.filter(
          (item) => item.status === "可分派",
        ).length;
        steps = [
          {
            id: "intent",
            label: "识别为处理人员推荐诉求",
            kind: "agent",
            status: "done",
          },
          {
            id: "roster",
            label: "拉取班组排班与在岗状态",
            kind: "agent",
            status: "done",
          },
          {
            id: "available",
            label: "筛选当前有空可接单人员",
            kind: "agent",
            status: "done",
            resultSummary: `${availableCount} 人当前可接单`,
          },
          {
            id: "match",
            label: "比对专长、路程与在手工单负荷",
            kind: "agent",
            status: "done",
            resultSummary: `优先匹配 ${target.category}`,
          },
          {
            id: "suggest",
            label: "生成处理人员推荐方案",
            kind: "tool",
            toolName: "suggestAssignee",
            status: "done",
            resultSummary: `推荐 ${result.recommendedName}`,
          },
        ];
        tools = [
          {
            toolName: "suggestAssignee",
            status: "done",
            result,
          },
        ];
        return result;
      })();

      const finalSuggestion = suggestion ?? (await backendTask);
      await runThinkingSequence(
        sequenceLines,
        (payload) => {
          thinkingLines = appendThinkingLine(thinkingLines, payload.line);
          const extras: ContentPart[] = [];
          if (payload.index >= Math.max(0, sequenceLines.length - 2)) {
            extras.push(
              toolCall(
                "suggestAssignee",
                { workOrderId: target.id },
                {
                  workOrderId: target.id,
                  phase: "generating",
                  candidates: [],
                  recommendedId: "",
                  recommendedName: "",
                  reasons: [],
                  simulated: true,
                },
                suggestId,
              ),
            );
          }
          patchAssistant(assistantId, {
            status: { type: "running" },
            content: buildContent(false, extras),
          });
        },
        850,
      );

      thinkingLines = appendThinkingLine(
        thinkingLines,
        `已完成人员评估，推荐 ${finalSuggestion.recommendedName}`,
      );

      const closing = `针对工单 ${target.id}，已完成处理人员推荐。请确认后受理并分派，也可改选其他人员。`;

      await streamText(closing, (partial) => {
        patchAssistant(assistantId, {
          status: { type: "running" },
          content: buildContent(
            true,
            [
              toolCall(
                "suggestAssignee",
                { workOrderId: target.id },
                {
                  ...finalSuggestion,
                  phase: "generating",
                },
                suggestId,
              ),
            ],
            [intro, partial],
          ),
        });
      });

      await sleep(900);

      finishAssistant(assistantId, [
        { type: "text", text: intro },
        { type: "text", text: closing },
        toolCall(
          "campusThinking",
          { title: "园区助手思考中" },
          thinkingResult(true),
          thinkingId,
        ),
        toolCall(
          "suggestAssignee",
          { workOrderId: target.id },
          {
            ...finalSuggestion,
            phase: "ready",
          },
          suggestId,
        ),
      ]);
      setIsRunning(false);
    },
    [appendStreamingReply, finishAssistant, patchAssistant, streamAssistantText],
  );

  const onNew = useCallback(
    async (message: AppendMessage) => {
      if (message.content.length !== 1 || message.content[0]?.type !== "text") {
        throw new Error("Only text content is supported");
      }

      const text = message.content[0].text;
      const userMessage: ThreadMessageLike = {
        role: "user",
        content: [{ type: "text", text }],
      };
      setMessages((prev) => [...prev, userMessage]);

      // Instant feedback while waiting for LLM / local routing.
      const pendingId = beginPendingReply();
      const replyOpts = { reuseId: pendingId };

      try {
        const store = demoRef.current;

        // If awaiting clarification, guide user to the confirm card.
        if (store.clarification.status === "awaiting_confirm") {
          if (/确认|继续|生成草稿|王女士|智慧产业园/.test(text)) {
            await appendStreamingReply(
              "请在上方「待确认信息」卡片中选择园区/服务类型/分类，并填写联系人与电话，然后点击“确认并继续生成草稿”。也可先点“填入常用信息”。",
              [],
              replyOpts,
            );
            return;
          }
        }

        let intent = classifyIntent(text);
        const hasWorkOrder = Boolean(store.getDemoWorkOrder());

        // When local rules miss, ask DeepSeek (if configured) so arbitrary text works.
        if (intent === "unknown") {
          const llmIntent = await agentFns.classifyUserIntent({
            text,
            hasWorkOrder,
          });
          if (llmIntent?.intent === "chat") {
            const guide =
              llmIntent.reply?.trim() ||
              (await agentFns.guideUnclearIntent({ text, hasWorkOrder }));
            await appendStreamingReply(guide, [], replyOpts);
            return;
          }
          if (llmIntent?.intent === "repair") intent = "repair";
          else if (llmIntent?.intent === "suggest_assignee")
            intent = "suggest_assignee";
          else if (llmIntent?.intent === "reset") intent = "reset";
          else {
            const guide = await agentFns.guideUnclearIntent({
              text,
              hasWorkOrder,
            });
            await appendStreamingReply(guide, [], replyOpts);
            return;
          }
        }

        if (intent === "repair") {
          await runRepairClarifyFlow(text, replyOpts);
          return;
        }

        if (intent === "suggest_assignee") {
          await runSuggestFlow(undefined, replyOpts);
          return;
        }

        if (intent === "reset") {
          await store.resetAll();
          const result = await agentFns.resetDemo();
          await appendStreamingReply(
            "已重置，可以重新开始。",
            [toolCall("resetDemo", {}, result)],
            replyOpts,
          );
          return;
        }

        const guide = await agentFns.guideUnclearIntent({ text, hasWorkOrder });
        await appendStreamingReply(guide, [], replyOpts);
      } catch (error) {
        await appendStreamingReply(
          "刚才处理时出了点问题，请再试一次，或换一种方式描述你的需求。",
          [],
          replyOpts,
        );
        console.error(error);
      }
    },
    [
      appendStreamingReply,
      beginPendingReply,
      runRepairClarifyFlow,
      runSuggestFlow,
    ],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<DemoActionDetail>).detail;
      if (!detail) return;

      if (detail.type === "clarification_confirmed") {
        void runFormAfterClarify(detail.values);
        return;
      }

      if (detail.type === "work_order_created") {
        const order = demoRef.current.getWorkOrder(detail.workOrderId);
        if (!order) return;
        void appendStreamingReply(
          `工单 ${order.id} 创建成功，当前状态为待受理。`,
          [
            toolCall(
              "createMockWorkOrder",
              { draftId: "draft-1" },
              {
                workOrderId: order.id,
                title: order.title,
                status: order.status,
                simulated: true,
              },
            ),
          ],
        );
        return;
      }

      if (detail.type === "view_work_order") {
        demoRef.current.selectWorkOrder(detail.workOrderId);
        if (detail.silent) return;
        const order = demoRef.current.getWorkOrder(detail.workOrderId);
        if (!order) return;
        void appendStreamingReply(
          `工单详情：${order.id} · ${order.title} · 状态 ${order.status}`,
        );
        return;
      }

      if (detail.type === "suggest_assignee") {
        void runSuggestFlow(detail.workOrderId);
        return;
      }

      if (detail.type === "assigned") {
        void appendStreamingReply(detail.message, [
          toolCall(
            "assignMockWorkOrder",
            { workOrderId: detail.workOrderId },
            { ok: true, message: detail.message, simulated: true },
          ),
        ]);
        return;
      }

      if (detail.type === "reset") {
        setMessages([]);
      }
    };

    window.addEventListener("property-demo-action", handler);
    return () => window.removeEventListener("property-demo-action", handler);
  }, [appendStreamingReply, runFormAfterClarify, runSuggestFlow]);

  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    setMessages,
    onNew,
    convertMessage,
    isRunning,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThinkingUI />
      <TypingUI />
      <TraceUI />
      <ExtractUI />
      <ClarifyUI />
      <MatchUI />
      <AttachmentUI />
      <PresentDraftUI />
      <CreatedUI />
      <SuggestUI />
      <AssignUI />
      <ResetUI />
      {children}
    </AssistantRuntimeProvider>
  );
}
