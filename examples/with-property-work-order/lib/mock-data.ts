import type {
  AssigneeCandidate,
  MockAttachment,
  WorkOrder,
  WorkOrderDraft,
} from "./types";

export const DEMO_WORK_ORDER_ID = "WO-2026-0098";
export const DEMO_CREATED_AT = "2026-09-22 20:10";

export const EMPTY_DRAFT: WorkOrderDraft = {
  serviceType: "",
  category: "",
  campus: "",
  space: "",
  device: "",
  description: "",
  contactName: "",
  contactPhone: "",
  source: "物业管理员代录",
  attachmentRequired: true,
  attachments: [],
  status: "工单草稿",
};

export const DEFAULT_DRAFT: WorkOrderDraft = {
  serviceType: "报修",
  category: "暖通空调",
  campus: "智慧产业园",
  space: "3号楼二层公共区域",
  device: "2F-AHU-03 空调机组",
  description: "3号楼二层空调发生漏水，现场地面已有积水",
  contactName: "王女士",
  contactPhone: "138****8899",
  source: "物业管理员代录",
  attachmentRequired: true,
  attachments: [],
  status: "工单草稿",
};

export const DEMO_ATTACHMENT: MockAttachment = {
  fileName: "空调漏水现场照片.jpg",
  mimeType: "image/jpeg",
  tag: "现场附件",
};

export const INITIAL_WORK_ORDERS: WorkOrder[] = [
  {
    id: "WO-2026-0081",
    title: "地下车库照明故障",
    serviceType: "报修",
    category: "强电弱电",
    space: "地下一层车库",
    device: "B1-LGT-12 照明回路",
    contactName: "李先生",
    contactPhone: "139****2211",
    source: "业主自助",
    description: "地下车库部分灯具不亮",
    campus: "智慧产业园",
    status: "待处理",
    assignee: "陈师傅",
    team: "综合维修组",
    createdAt: "2026-09-20 09:30",
    attachments: [
      {
        fileName: "车库照明.jpg",
        mimeType: "image/jpeg",
        tag: "现场附件",
      },
    ],
  },
  {
    id: "WO-2026-0088",
    title: "食堂水管渗漏",
    serviceType: "报修",
    category: "给排水",
    space: "员工食堂后厨",
    device: "CK-WP-02 给水支管",
    contactName: "赵女士",
    contactPhone: "137****5566",
    source: "物业巡检",
    description: "后厨水管接头渗水",
    campus: "智慧产业园",
    status: "待受理",
    createdAt: "2026-09-21 14:05",
    attachments: [
      {
        fileName: "水管渗漏.jpg",
        mimeType: "image/jpeg",
        tag: "现场附件",
      },
    ],
  },
];

export const ASSIGNEE_CANDIDATES: AssigneeCandidate[] = [
  {
    id: "zhang",
    name: "张师傅",
    team: "暖通组",
    skills: ["中央空调", "漏水处理", "风机盘管"],
    activeOrders: 2,
    status: "可分派",
    recommended: true,
    reasons: [
      "先筛出当前有空可接单人员，排除处理中的陈师傅、林师傅",
      "有空人选中，张师傅专长覆盖中央空调与漏水处理",
      "同属暖通责任班组，更贴近本单服务分类",
      "在手工单负荷更低（2 单），更适合优先分派",
    ],
  },
  {
    id: "chen",
    name: "陈师傅",
    team: "综合维修组",
    skills: ["水电维修", "照明维修"],
    activeOrders: 5,
    status: "处理中",
  },
  {
    id: "lin",
    name: "林师傅",
    team: "暖通组",
    skills: ["空调保养", "设备巡检"],
    activeOrders: 4,
    status: "处理中",
  },
];

export const FALLBACK_REPLY =
  "我还没完全理解你的需求。你可以补充「哪里 + 什么问题」，例如：「3号楼二层空调漏水，地面已经有积水」。";

/** 意图不明时的离线引导模板（按用户文本哈希轮换，避免同一句死循环） */
export const GUIDE_FALLBACK_TEMPLATES = [
  "听到了，不过信息还不太够。请告诉我具体位置和现象，例如：「地下车库B2层灯一直闪烁」。",
  "我可以帮你报修或查工单。若是报修，请尽量带上地点和故障描述，比如：「总部大楼1号电梯有异响」。",
  "这句话我还没法直接建单。你可以改成：「滨江科创园A座卫生间地漏堵塞，需要疏通」。",
  "如果是要查进度，可以直接说「查看当前待受理工单」；如果是报修，请补充楼栋楼层和问题。",
  "想推荐处理人员的话，需要先有一张工单。你也可以先描述现场问题，我来帮你整理报修。",
  "我理解你在反馈事情，但还缺关键信息。试着发：「智慧产业园3号楼二层空调漏水，我拍了照片」。",
] as const;

/** 给 DeepSeek 的引导角度种子（用于生成针对性追问） */
export const GUIDE_HINT_SEEDS = [
  {
    angle: "报修缺位置",
    example: "请补充楼栋/楼层，例如「3号楼二层空调漏水」。",
  },
  {
    angle: "报修缺现象",
    example: "可以说清楚故障表现，例如「灯一直闪烁，影响行车」。",
  },
  {
    angle: "查工单",
    example: "若要查单，可直接说「查看当前待受理工单」。",
  },
  {
    angle: "推荐分派",
    example: "若要推荐处理人，可说「这个工单适合分派给谁」。",
  },
  {
    angle: "信息过短",
    example: "请用一句话写清：哪里 + 什么问题 + 是否紧急。",
  },
] as const;

export function pickGuideFallback(userText: string): string {
  let hash = 0;
  for (let i = 0; i < userText.length; i += 1) {
    hash = (hash * 31 + userText.charCodeAt(i)) >>> 0;
  }
  const index = hash % GUIDE_FALLBACK_TEMPLATES.length;
  return GUIDE_FALLBACK_TEMPLATES[index]!;
}

/** 欢迎页随机抽 3 条展示的工单相关快捷问题池 */
export const WELCOME_PROMPT_POOL = [
  {
    title: "空调漏水报修",
    prompt: "3号楼二层空调漏水，地面已经有积水，我拍了现场照片。",
  },
  {
    title: "地下车库照明异常",
    prompt: "地下车库B2层灯一直闪烁，影响行车安全，请帮忙报修。",
  },
  {
    title: "电梯异响",
    prompt: "总部大楼1号电梯上下运行时有明显异响，请尽快安排检修。",
  },
  {
    title: "卫生间堵塞",
    prompt: "滨江科创园A座3层卫生间地漏堵塞、有积水，需要疏通。",
  },
  {
    title: "查看已有工单",
    prompt: "查看当前已有工单",
  },
  {
    title: "推荐处理人员",
    prompt: "这个工单适合分派给谁？",
  },
] as const;

/** @deprecated 使用 WELCOME_PROMPT_POOL */
export const SUGGESTION_PROMPTS = WELCOME_PROMPT_POOL;
