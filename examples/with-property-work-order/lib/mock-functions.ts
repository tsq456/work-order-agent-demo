import {
  ASSIGNEE_CANDIDATES,
  DEFAULT_DRAFT,
  DEMO_CREATED_AT,
  DEMO_WORK_ORDER_ID,
  EMPTY_DRAFT,
  INITIAL_WORK_ORDERS,
} from "./mock-data";
import type {
  AssigneeCandidate,
  WorkOrder,
  WorkOrderDraft,
} from "./types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function extractWorkOrderFields(input: {
  userText: string;
}): Promise<{
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
  };
  missingFields: Array<
    "serviceType" | "category" | "campus" | "contactName" | "contactPhone"
  >;
  simulated: true;
  inputEcho: string;
}> {
  await delay(1100);
  const text = input.userText.trim();
  const hasPhotoMention = /照片|拍照|拍了|附件|图片/.test(text);
  const locationHint =
    text.match(/(\d+号楼[^，。,\s]{0,12})/)?.[1] ??
    ( /地下车库/.test(text)
      ? "地下车库"
      : /电梯/.test(text)
        ? "电梯区域"
        : /卫生间/.test(text)
          ? "卫生间"
          : "位置待确认");
  const issueHint = /漏水|积水/.test(text)
    ? "漏水 / 积水"
    : /灯|照明/.test(text)
      ? "照明故障"
      : /电梯/.test(text)
        ? "电梯异常"
        : /空调|暖通/.test(text)
          ? "空调异常"
          : text.slice(0, 18) || "物业报修";
  const category = /灯|照明|电/.test(text)
    ? "强电弱电"
    : /电梯/.test(text)
      ? "电梯"
      : /水|漏|排水/.test(text)
        ? "给排水"
        : /空调|暖通|风机/.test(text)
          ? "暖通空调"
          : "综合维修";

  return {
    known: {
      description: text || DEFAULT_DRAFT.description,
      source: "物业管理员代录",
      hasPhotoMention,
      locationHint,
      issueHint,
    },
    guesses: {
      serviceType: "报修",
      category,
    },
    missingFields: [
      "serviceType",
      "category",
      "campus",
      "contactName",
      "contactPhone",
    ],
    simulated: true,
    inputEcho: input.userText,
  };
}

export async function matchSpaceAndDevice(): Promise<{
  campus: string;
  space: string;
  device: string;
  simulated: true;
}> {
  await delay(1000);
  return {
    campus: DEFAULT_DRAFT.campus,
    space: DEFAULT_DRAFT.space,
    device: DEFAULT_DRAFT.device,
    simulated: true,
  };
}

export async function checkAttachmentRequirement(draft: WorkOrderDraft): Promise<{
  required: boolean;
  satisfied: boolean;
  message: string;
  attachmentCount: number;
  simulated: true;
}> {
  await delay(900);
  const satisfied = draft.attachments.length >= 1;
  return {
    required: true,
    satisfied,
    message: satisfied
      ? "附件要求已满足。"
      : "报修必须至少上传一个附件。",
    attachmentCount: draft.attachments.length,
    simulated: true,
  };
}

export async function createMockWorkOrder(input: {
  draft: WorkOrderDraft;
  existing: WorkOrder[];
}): Promise<
  | { ok: true; workOrder: WorkOrder; simulated: true }
  | { ok: false; error: string; simulated: true }
> {
  await delay(1200);
  if (input.existing.some((item) => item.id === DEMO_WORK_ORDER_ID)) {
    return {
      ok: false,
      error: `工单 ${DEMO_WORK_ORDER_ID} 已存在，已阻止重复创建。`,
      simulated: true,
    };
  }
  if (input.draft.attachments.length < 1) {
    return {
      ok: false,
      error: "报修必须至少上传一个附件。",
      simulated: true,
    };
  }

  const workOrder: WorkOrder = {
    id: DEMO_WORK_ORDER_ID,
    title: "3号楼二层空调漏水",
    serviceType: input.draft.serviceType,
    category: input.draft.category,
    space: input.draft.space,
    device: input.draft.device,
    contactName: input.draft.contactName,
    contactPhone: input.draft.contactPhone,
    source: input.draft.source,
    description: input.draft.description,
    campus: input.draft.campus,
    status: "待受理",
    createdAt: DEMO_CREATED_AT,
    attachments: [...input.draft.attachments],
  };

  return { ok: true, workOrder, simulated: true };
}

export async function suggestAssignee(input: {
  workOrderId?: string;
}): Promise<{
  workOrderId: string;
  candidates: AssigneeCandidate[];
  recommendedId: string;
  recommendedName: string;
  reasons: string[];
  simulated: true;
}> {
  await delay(1300);
  const recommended = ASSIGNEE_CANDIDATES.find((item) => item.recommended)!;
  return {
    workOrderId: input.workOrderId ?? DEMO_WORK_ORDER_ID,
    candidates: ASSIGNEE_CANDIDATES.map((item) => ({ ...item })),
    recommendedId: recommended.id,
    recommendedName: recommended.name,
    reasons: [...(recommended.reasons ?? [])],
    simulated: true,
  };
}

export async function assignMockWorkOrder(input: {
  workOrder: WorkOrder;
  assigneeId: string;
}): Promise<
  | {
      ok: true;
      workOrder: WorkOrder;
      simulated: true;
    }
  | { ok: false; error: string; simulated: true }
> {
  await delay(1100);
  if (input.workOrder.status === "待处理" && input.workOrder.assignee) {
    return {
      ok: false,
      error: `工单 ${input.workOrder.id} 已分派给 ${input.workOrder.assignee}，已阻止重复分派。`,
      simulated: true,
    };
  }

  const assignee = ASSIGNEE_CANDIDATES.find(
    (item) => item.id === input.assigneeId,
  );
  if (!assignee) {
    return { ok: false, error: "未找到处理人员。", simulated: true };
  }

  return {
    ok: true,
    workOrder: {
      ...input.workOrder,
      status: "待处理",
      assignee: assignee.name,
      team: assignee.team,
    },
    simulated: true,
  };
}

export async function listMockWorkOrders(input?: {
  text?: string;
}): Promise<{
  orders: WorkOrder[];
  thinkingLines: string[];
  simulated: true;
}> {
  await delay(1200);
  void input;
  const third: WorkOrder = {
    id: "WO-2026-0095",
    title: "总部大楼电梯异响",
    serviceType: "报修",
    category: "电梯",
    campus: "总部大楼",
    space: "1号电梯轿厢",
    device: "EL-01 曳引主机",
    description: "1号电梯上下运行时有明显异响，需安排检修",
    contactName: "周先生",
    contactPhone: "136****7788",
    source: "业主自助",
    status: "待受理",
    createdAt: "2026-09-22 09:20",
    attachments: [
      {
        fileName: "电梯异响现场.mp4",
        mimeType: "video/mp4",
        tag: "现场附件",
      },
    ],
  };

  return {
    orders: [
      ...INITIAL_WORK_ORDERS.map((item) => ({
        ...item,
        attachments: item.attachments.map((file) => ({ ...file })),
      })),
      third,
    ].slice(0, 3),
    thinkingLines: [
      "正在识别查看已有工单诉求…",
      "正在连接物业工单台账…",
      "正在按状态筛选待受理与待处理工单…",
      "正在核对工单字段完整性…",
      "正在整理三张工单卡片…",
    ],
    simulated: true,
  };
}

export async function resetDemo(): Promise<{
  workOrders: WorkOrder[];
  draft: WorkOrderDraft;
  simulated: true;
}> {
  await delay(600);
  return {
    workOrders: INITIAL_WORK_ORDERS.map((item) => ({
      ...item,
      attachments: item.attachments.map((file) => ({ ...file })),
    })),
    draft: {
      ...EMPTY_DRAFT,
      attachments: [],
    },
    simulated: true,
  };
}
