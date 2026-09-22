import {
  AGENT_ENUMS,
  buildSystemPrompt,
  deepseekJson,
  type ClassifyResult,
  type ExtractResult,
  type GuideResult,
  type ListOrdersResult,
  type MatchResult,
  type SuggestResult,
  type ThinkingResult,
} from "@/lib/deepseek";
import { GUIDE_HINT_SEEDS } from "@/lib/mock-data";
import { SOURCE_OPTIONS } from "@/lib/dictionaries";

function pickEnum(value: unknown, options: readonly string[], fallback: string) {
  if (typeof value === "string" && options.includes(value)) return value;
  return fallback;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function asBool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === "string");
}

export async function llmClassify(input: {
  text: string;
  hasWorkOrder: boolean;
}): Promise<ClassifyResult> {
  const raw = await deepseekJson<ClassifyResult>([
    {
      role: "system",
      content: `${buildSystemPrompt()}
根据用户一句话判断意图，返回：
{
  "intent": "repair|list_pending|suggest_assignee|view_created|reset|chat",
  "reply": "当 intent=chat 时给一句简短中文回复，否则可省略"
}
规则：
- 报修、故障、漏水、灯坏、电梯、噪音等 → repair
- 查待受理列表、查看已有工单、工单列表、我的工单 → list_pending
- 推荐/分派处理人 → suggest_assignee
- 查看刚创建的某一张工单详情（带具体编号） → view_created
- 重置/重新开始 → reset
- 其他闲聊、模糊、信息不足 → chat；此时 reply 必须是引导用户补充的友好中文（指出缺什么并给示例），禁止只复述能力介绍
当前是否已有演示工单：${input.hasWorkOrder ? "是" : "否"}`,
    },
    { role: "user", content: input.text },
  ]);

  const intent = raw.intent;
  const allowed = [
    "repair",
    "list_pending",
    "suggest_assignee",
    "view_created",
    "reset",
    "chat",
  ] as const;
  return {
    intent: allowed.includes(intent as (typeof allowed)[number])
      ? (intent as ClassifyResult["intent"])
      : "chat",
    ...(asString(raw.reply) ? { reply: asString(raw.reply) } : {}),
  };
}

export async function llmExtract(userText: string): Promise<ExtractResult> {
  const raw = await deepseekJson<ExtractResult>([
    {
      role: "system",
      content: `${buildSystemPrompt()}
从报修描述提取字段，返回：
{
  "known": {
    "description": "规范化问题描述",
    "source": "物业管理员代录|业主自助|物业巡检",
    "hasPhotoMention": true/false,
    "locationHint": "位置线索",
    "issueHint": "问题短标题"
  },
  "guesses": {
    "serviceType": "...",
    "category": "...",
    "campus": "可选，能猜到再填"
  },
  "missingFields": ["serviceType","category","campus","contactName","contactPhone"],
  "thinkingLines": ["6条左右中文思考步骤，贴合本条问题，逐步分析"]
}
missingFields 只放仍需用户确认的项；联系人电话通常缺失。`,
    },
    { role: "user", content: userText },
  ]);

  const missingFieldOptions = [
    "serviceType",
    "category",
    "campus",
    "contactName",
    "contactPhone",
  ] as const;
  type MissingField = (typeof missingFieldOptions)[number];
  const missingFields: MissingField[] = Array.isArray(raw.missingFields)
    ? raw.missingFields.filter((field): field is MissingField =>
        (missingFieldOptions as readonly string[]).includes(field),
      )
    : ["contactName", "contactPhone", "campus"];

  const guesses: ExtractResult["guesses"] = {
    serviceType: pickEnum(
      raw.guesses?.serviceType,
      AGENT_ENUMS.serviceTypes,
      "报修",
    ),
    category: pickEnum(
      raw.guesses?.category,
      AGENT_ENUMS.serviceCategories,
      "综合维修",
    ),
  };
  if (raw.guesses?.campus) {
    guesses.campus = pickEnum(
      raw.guesses.campus,
      AGENT_ENUMS.campuses,
      AGENT_ENUMS.campuses[0]!,
    );
  }

  return {
    known: {
      description: asString(raw.known?.description, userText),
      source: pickEnum(
        raw.known?.source,
        ["物业管理员代录", "业主自助", "物业巡检"],
        "物业管理员代录",
      ),
      hasPhotoMention: asBool(raw.known?.hasPhotoMention, /照片|拍照|拍了/.test(userText)),
      locationHint: asString(raw.known?.locationHint, "位置待确认"),
      issueHint: asString(raw.known?.issueHint, "物业报修"),
    },
    guesses,
    missingFields:
      missingFields.length > 0
        ? missingFields
        : ["campus", "contactName", "contactPhone"],
    thinkingLines:
      asStringArray(raw.thinkingLines).length >= 3
        ? asStringArray(raw.thinkingLines).slice(0, 8)
        : [
            "正在理解用户报修描述…",
            "正在识别问题类型与位置线索…",
            "正在对照园区服务目录…",
            "正在检查联系人等必备字段…",
            "正在整理待确认事项…",
          ],
  };
}

export async function llmMatch(input: {
  values: Record<string, string>;
  description?: string | undefined;
}): Promise<MatchResult> {
  const raw = await deepseekJson<MatchResult>([
    {
      role: "system",
      content: `${buildSystemPrompt()}
根据已确认字段匹配园区空间与设备，返回：
{
  "campus": "四选一园区",
  "space": "具体空间名称",
  "device": "具体设备名称/编号",
  "thinkingLines": ["5条左右中文思考步骤"]
}`,
    },
    {
      role: "user",
      content: JSON.stringify(input),
    },
  ]);

  return {
    campus: pickEnum(raw.campus, AGENT_ENUMS.campuses, input.values.campus || "智慧产业园"),
    space: asString(raw.space, "公共区域"),
    device: asString(raw.device, "待现场确认设备"),
    thinkingLines:
      asStringArray(raw.thinkingLines).length >= 3
        ? asStringArray(raw.thinkingLines).slice(0, 8)
        : [
            "已收到确认信息，正在回写工单字段…",
            "正在匹配空间与设备台账…",
            "正在检查报修附件要求…",
            "正在生成结构化工单草稿…",
          ],
  };
}

export async function llmSuggest(input: {
  workOrderId: string;
  title: string;
  category: string;
  space: string;
  description: string;
}): Promise<SuggestResult> {
  const raw = await deepseekJson<SuggestResult>([
    {
      role: "system",
      content: `${buildSystemPrompt()}
为工单推荐处理人员。先判断谁有空，再在有空人选中比专长与负荷。
返回：
{
  "workOrderId": "...",
  "candidates": [
    {
      "id": "slug",
      "name": "姓名",
      "team": "班组",
      "skills": ["技能"],
      "activeOrders": 0,
      "status": "可分派|处理中",
      "recommended": true/false,
      "reasons": ["可选"]
    }
  ],
  "recommendedId": "...",
  "recommendedName": "...",
  "reasons": ["推荐理由，体现有空筛选与专长匹配"],
  "thinkingLines": ["6条左右思考步骤：读工单→排班→有空筛选→专长→负荷→出方案"]
}
candidates 3人左右，只能有一人 recommended=true，且 status 必须为可分派。`,
    },
    { role: "user", content: JSON.stringify(input) },
  ]);

  const candidates = Array.isArray(raw.candidates)
    ? raw.candidates.slice(0, 5).map((person, index) => {
        const status =
          person?.status === "可分派" || person?.status === "处理中"
            ? person.status
            : index === 0
              ? "可分派"
              : "处理中";
        return {
          id: asString(person?.id, `worker-${index + 1}`),
          name: asString(person?.name, `师傅${index + 1}`),
          team: asString(person?.team, "综合维修组"),
          skills: asStringArray(person?.skills, ["综合维修"]),
          activeOrders: asNumber(person?.activeOrders, status === "可分派" ? 1 : 4),
          status,
          recommended: Boolean(person?.recommended),
          reasons: asStringArray(person?.reasons),
        };
      })
    : [];

  if (candidates.length === 0) {
    candidates.push({
      id: "zhang",
      name: "张师傅",
      team: "暖通组",
      skills: [input.category || "综合维修"],
      activeOrders: 2,
      status: "可分派",
      recommended: true,
      reasons: [],
    });
  }

  let recommended =
    candidates.find((item) => item.recommended && item.status === "可分派") ??
    candidates.find((item) => item.status === "可分派") ??
    candidates[0]!;

  candidates.forEach((item) => {
    item.recommended = item.id === recommended.id;
  });
  recommended = candidates.find((item) => item.id === recommended.id)!;

  return {
    workOrderId: asString(raw.workOrderId, input.workOrderId),
    candidates,
    recommendedId: recommended.id,
    recommendedName: recommended.name,
    reasons:
      asStringArray(raw.reasons).length > 0
        ? asStringArray(raw.reasons)
        : [
            `当前有空可接单：${recommended.name}`,
            `专长更贴近「${input.category}」`,
            `在手工单负荷相对较低`,
          ],
    thinkingLines:
      asStringArray(raw.thinkingLines).length >= 3
        ? asStringArray(raw.thinkingLines).slice(0, 8)
        : [
            "正在读取工单内容与服务分类…",
            "正在拉取班组排班与在岗状态…",
            "正在筛出当前有空可接单的人员…",
            "正在比对专长与工单类型匹配度…",
            "正在综合路程与在手工单负荷…",
            "正在生成处理人员推荐方案…",
          ],
  };
}

export async function llmListOrders(input: {
  text: string;
}): Promise<ListOrdersResult> {
  const sources = SOURCE_OPTIONS.map((item) => item.value);
  const raw = await deepseekJson<ListOrdersResult>([
    {
      role: "system",
      content: `${buildSystemPrompt()}
用户想查看当前已有工单。请生成恰好 3 条园区物业工单 mock 数据，字段必须与系统 WorkOrder 对齐。
返回：
{
  "orders": [
    {
      "id": "WO-2026-xxxx",
      "title": "短标题",
      "serviceType": "...",
      "category": "...",
      "campus": "...",
      "space": "空间位置",
      "device": "设备名称或编号",
      "description": "问题描述",
      "contactName": "联系人",
      "contactPhone": "手机号可打码",
      "source": "物业管理员代录|业主自助|物业巡检",
      "status": "待受理|待处理",
      "assignee": "待处理时填写处理人，待受理可省略",
      "team": "班组，可省略",
      "createdAt": "YYYY-MM-DD HH:mm",
      "attachments": [{"fileName":"xxx.jpg","mimeType":"image/jpeg","tag":"现场附件"}]
    }
  ],
  "thinkingLines": ["5~7条中文思考步骤，体现查询工单库与整理列表"]
}
要求：
- 必须正好 3 条，id 互不重复
- status 只能是 待受理 或 待处理；待处理应有 assignee
- source 只能是：${sources.join("、")}
- 结合用户原话场景生成差异化内容，不要三条雷同`,
    },
    { role: "user", content: input.text || "查看当前已有工单" },
  ]);

  const normalizeOrder = (
    item: ListOrdersResult["orders"][number] | undefined,
    index: number,
  ): ListOrdersResult["orders"][number] => {
    const status =
      item?.status === "待处理" || item?.status === "待受理"
        ? item.status
        : index === 0
          ? "待处理"
          : "待受理";
    const attachments = Array.isArray(item?.attachments)
      ? item.attachments
          .map((file) => ({
            fileName: asString(file?.fileName, `现场照片-${index + 1}.jpg`),
            mimeType: asString(file?.mimeType, "image/jpeg"),
            tag: "现场附件" as const,
          }))
          .slice(0, 3)
      : [
          {
            fileName: `现场照片-${index + 1}.jpg`,
            mimeType: "image/jpeg",
            tag: "现场附件" as const,
          },
        ];

    const order: ListOrdersResult["orders"][number] = {
      id: asString(item?.id, `WO-2026-${9000 + index}`),
      title: asString(item?.title, `园区报修工单 ${index + 1}`),
      serviceType: pickEnum(
        item?.serviceType,
        AGENT_ENUMS.serviceTypes,
        "报修",
      ),
      category: pickEnum(
        item?.category,
        AGENT_ENUMS.serviceCategories,
        "综合维修",
      ),
      campus: pickEnum(item?.campus, AGENT_ENUMS.campuses, "智慧产业园"),
      space: asString(item?.space, "公共区域"),
      device: asString(item?.device, "待核设备"),
      description: asString(item?.description, "现场问题待跟进"),
      contactName: asString(item?.contactName, "物业管理员"),
      contactPhone: asString(item?.contactPhone, "138****0000"),
      source: pickEnum(item?.source, sources, "物业管理员代录"),
      status,
      createdAt: asString(item?.createdAt, "2026-09-22 10:00"),
      attachments,
    };
    const assignee = asString(item?.assignee);
    const team = asString(item?.team);
    if (status === "待处理" && assignee) order.assignee = assignee;
    else if (status === "待处理") order.assignee = "陈师傅";
    if (team) order.team = team;
    else if (status === "待处理") order.team = "综合维修组";
    return order;
  };

  const rawOrders = Array.isArray(raw.orders) ? raw.orders : [];
  const orders = [0, 1, 2].map((index) =>
    normalizeOrder(rawOrders[index], index),
  );

  return {
    orders,
    thinkingLines:
      asStringArray(raw.thinkingLines).length >= 3
        ? asStringArray(raw.thinkingLines).slice(0, 8)
        : [
            "正在识别查看已有工单诉求…",
            "正在连接物业工单台账…",
            "正在按状态筛选待受理与待处理工单…",
            "正在核对字段完整性…",
            "正在整理三张工单卡片…",
          ],
  };
}

export async function llmThinking(input: {
  phase: "repair" | "form" | "suggest" | "list";
  context: string;
}): Promise<ThinkingResult> {
  const raw = await deepseekJson<ThinkingResult>([
    {
      role: "system",
      content: `${buildSystemPrompt()}
为园区助手生成思考步骤文案，返回 {"lines":["..."]}，4~7 条，贴合 phase=${input.phase}。`,
    },
    { role: "user", content: input.context },
  ]);
  const lines = asStringArray(raw.lines);
  return {
    lines:
      lines.length >= 3
        ? lines.slice(0, 8)
        : ["正在分析当前请求…", "正在核对业务规则…", "即将给出结果…"],
  };
}

export async function llmGuide(input: {
  text: string;
  hasWorkOrder: boolean;
}): Promise<GuideResult> {
  const hintBlock = GUIDE_HINT_SEEDS.map(
    (item, index) => `${index + 1}. ${item.angle}：${item.example}`,
  ).join("\n");

  const raw = await deepseekJson<GuideResult>(
    [
      {
        role: "system",
        content: `${buildSystemPrompt()}
用户意图不明确。请结合用户原话，生成引导补充信息的中文回复。
返回：
{
  "reply": "2~4句，先回应理解到的部分，再指出还缺什么，最后给一个可直接发送的示例句子",
  "suggestions": ["可选的短示例1", "短示例2"]
}
要求：
- 不要重复套话，不要只说「我可以协助报修」
- 结合用户已说内容做针对性追问（位置/现象/是否已有工单等）
- suggestions 给 1~3 条短示例，用户可直接点发
- 当前是否已有工单：${input.hasWorkOrder ? "是" : "否"}
可参考这些引导角度（按相关性选用，勿整段照抄）：
${hintBlock}`,
      },
      { role: "user", content: input.text },
    ],
    { temperature: 0.55 },
  );

  const reply = asString(raw.reply);
  const suggestions = asStringArray(raw.suggestions).slice(0, 3);
  return {
    reply:
      reply ||
      "我还不太确定你的具体需求。可以补充一下地点和现象，例如：「3号楼二层空调漏水，地面已有积水」。",
    suggestions,
  };
}
