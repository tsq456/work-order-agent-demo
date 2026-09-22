import type { ThreadMessageLike } from "@assistant-ui/react";

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Demo pacing tuned so a typical clarify / form thinking pass lands around 5–10s.
 */
export const PACE = {
  think: 1600,
  agentStep: 1500,
  toolStart: 1100,
  toolRun: 1400,
  betweenTools: 1200,
  textChunkMs: 32,
  textChunkSize: 2,
  /** Each campus thinking line stays on screen this long. */
  thinkingLineMs: 1500,
} as const;

/** Friendly campus/property lines shown while tools run in the background. */
export const CAMPUS_THINKING_LINES = [
  "正在核对园区楼栋与空间档案…",
  "正在识别报修问题所属服务类型…",
  "正在匹配可能相关的暖通设备…",
  "正在检查是否需要补充联系人信息…",
  "正在联动物业服务目录与工单规则…",
  "马上为你整理待确认事项…",
] as const;

export const CAMPUS_FORM_THINKING_LINES = [
  "已收到确认信息，正在回写工单字段…",
  "正在匹配 3 号楼空间与设备台账…",
  "正在检查报修附件要求…",
  "正在生成结构化工单草稿…",
  "即将完成，请稍候…",
] as const;

export const CAMPUS_SUGGEST_THINKING_LINES = [
  "正在读取工单内容与服务分类…",
  "正在拉取班组排班与在岗状态…",
  "正在筛出当前有空可接单的人员…",
  "正在比对专长与工单类型匹配度…",
  "正在综合路程与在手工单负荷…",
  "正在生成处理人员推荐方案…",
] as const;

export const CAMPUS_LIST_THINKING_LINES = [
  "正在识别查看已有工单诉求…",
  "正在连接物业工单台账…",
  "正在按状态筛选待受理与待处理工单…",
  "正在核对工单字段完整性…",
  "正在整理工单卡片展示…",
  "马上为你呈现当前工单列表…",
] as const;

/** Shown while waiting for LLM classify / first token. */
export const PENDING_WAIT_LINES = [
  "正在理解你的问题…",
  "正在判断你想做什么…",
  "正在整理下一步动作…",
] as const;

export async function streamText(
  fullText: string,
  onUpdate: (partial: string) => void,
  options?: { chunkSize?: number; chunkMs?: number },
) {
  const chunkSize = options?.chunkSize ?? PACE.textChunkSize;
  const chunkMs = options?.chunkMs ?? PACE.textChunkMs;
  let output = "";

  for (let i = 0; i < fullText.length; i += chunkSize) {
    output += fullText.slice(i, i + chunkSize);
    onUpdate(output);
    await sleep(chunkMs);
  }

  return output;
}

/** Cycle through thinking lines; total duration ≈ lines.length * thinkingLineMs. */
export async function runThinkingSequence(
  lines: readonly string[],
  onLine: (payload: {
    line: string;
    index: number;
    total: number;
    done: boolean;
  }) => void,
  lineMs: number = PACE.thinkingLineMs,
) {
  for (let index = 0; index < lines.length; index += 1) {
    onLine({
      line: lines[index]!,
      index,
      total: lines.length,
      done: false,
    });
    await sleep(lineMs);
  }
  onLine({
    line: lines[lines.length - 1] ?? "处理完成",
    index: lines.length - 1,
    total: lines.length,
    done: true,
  });
}

export function updateMessageById(
  messages: readonly ThreadMessageLike[],
  id: string,
  updater: (message: ThreadMessageLike) => ThreadMessageLike,
): readonly ThreadMessageLike[] {
  return messages.map((message) => (message.id === id ? updater(message) : message));
}
