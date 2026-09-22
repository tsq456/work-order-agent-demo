"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { useDemoStore } from "@/lib/demo-store";
import { ClipboardListIcon } from "lucide-react";

type CreatedArgs = Record<string, never>;
type CreatedResult = {
  workOrderId: string;
  title: string;
  status: string;
  simulated: true;
};

export const WorkOrderCreatedToolUI: ToolCallMessagePartComponent<
  CreatedArgs,
  CreatedResult
> = function WorkOrderCreatedToolUI({ result }) {
  const { selectWorkOrder } = useDemoStore();
  if (!result) return null;

  return (
    <div className="my-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-900">
        <ClipboardListIcon className="size-4" />
        工单创建成功
      </div>
      <div className="space-y-1 text-sm text-emerald-900">
        <div>
          编号：<strong>{result.workOrderId}</strong>
        </div>
        <div>标题：{result.title}</div>
        <div>状态：{result.status}</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm"
          onClick={() => {
            selectWorkOrder(result.workOrderId);
            window.dispatchEvent(
              new CustomEvent("property-demo-action", {
                detail: {
                  type: "view_work_order",
                  workOrderId: result.workOrderId,
                },
              }),
            );
          }}
        >
          查看工单详情
        </button>
        <button
          type="button"
          className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent("property-demo-action", {
                detail: {
                  type: "suggest_assignee",
                  workOrderId: result.workOrderId,
                },
              }),
            );
          }}
        >
          推荐处理人员
        </button>
      </div>
    </div>
  );
};
