export type WorkOrderStatus = "工单草稿" | "待受理" | "待处理";

export type MockAttachment = {
  fileName: string;
  mimeType: string;
  tag: "现场附件";
};

export type WorkOrderDraft = {
  serviceType: string;
  category: string;
  campus: string;
  space: string;
  device: string;
  description: string;
  contactName: string;
  contactPhone: string;
  source: string;
  attachmentRequired: boolean;
  attachments: MockAttachment[];
  status: WorkOrderStatus;
};

export type DraftFieldKey = keyof Pick<
  WorkOrderDraft,
  | "serviceType"
  | "category"
  | "campus"
  | "space"
  | "device"
  | "description"
  | "contactName"
  | "contactPhone"
  | "source"
>;

export type ClarificationSession = {
  status: "idle" | "awaiting_confirm" | "confirmed";
  userText: string;
  knownFields: Partial<WorkOrderDraft>;
  missingFields: DraftFieldKey[];
  guessedFields: Partial<WorkOrderDraft>;
};

export type WorkOrder = {
  id: string;
  title: string;
  serviceType: string;
  category: string;
  space: string;
  device: string;
  contactName: string;
  contactPhone: string;
  source: string;
  description: string;
  campus: string;
  status: Exclude<WorkOrderStatus, "工单草稿">;
  assignee?: string;
  team?: string;
  createdAt: string;
  attachments: MockAttachment[];
};

export type AssigneeCandidate = {
  id: string;
  name: string;
  team: string;
  skills: string[];
  activeOrders: number;
  status: "可分派" | "处理中";
  recommended?: boolean;
  reasons?: string[];
};

export type WorkOrderStats = {
  draft: number;
  pendingAccept: number;
  pendingProcess: number;
  total: number;
};

export type AgentTraceStep = {
  id: string;
  label: string;
  kind: "agent" | "tool";
  toolName?: string;
  status: "running" | "done";
  resultSummary?: string;
};
