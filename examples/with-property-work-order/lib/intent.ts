export type DemoIntent =
  | "repair"
  | "suggest_assignee"
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

  if (/分派给谁|推荐处理|适合分派|处理人员/.test(normalized)) {
    return "suggest_assignee";
  }

  return "unknown";
}
