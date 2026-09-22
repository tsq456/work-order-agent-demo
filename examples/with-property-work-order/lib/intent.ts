export type DemoIntent =
  | "repair"
  | "list_pending"
  | "suggest_assignee"
  | "view_created"
  | "reset"
  | "unknown";

export function classifyIntent(text: string): DemoIntent {
  const normalized = text.trim().toLowerCase();

  if (
    /重置|重新开始|reset/.test(normalized) ||
    normalized.includes("resetdemo")
  ) {
    return "reset";
  }

  if (
    /漏水|报修|空调|积水|提交.*报修|帮我提交/.test(normalized) ||
    normalized.includes("3号楼")
  ) {
    return "repair";
  }

  if (
    /待受理|查看当前待受理|已有工单|工单列表|我的工单|当前工单|查看.*工单/.test(
      normalized,
    )
  ) {
    return "list_pending";
  }

  if (/分派给谁|推荐处理|适合分派|处理人员/.test(normalized)) {
    return "suggest_assignee";
  }

  if (/刚刚创建|wo-2026-0098|工单详情/.test(normalized)) {
    return "view_created";
  }

  return "unknown";
}
