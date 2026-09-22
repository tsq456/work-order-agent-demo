"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { useState } from "react";
import { ClipboardListIcon, ChevronDownIcon } from "lucide-react";
import type { WorkOrder } from "@/lib/types";
import { useDemoStore } from "@/lib/demo-store";
import { WorkOrderListSkeleton } from "@/components/work-order-list-skeleton";

type ListArgs = {
  title?: string;
};

type ListResult = {
  phase: "generating" | "ready";
  orders: WorkOrder[];
  simulated: true;
};

function statusClass(status: WorkOrder["status"]) {
  return status === "待受理"
    ? "bg-amber-100 text-amber-800"
    : "bg-sky-100 text-sky-800";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5 last:border-b-0">
      <span className="shrink-0 text-xs text-slate-500">{label}</span>
      <span className="text-right text-xs font-medium text-slate-800">
        {value}
      </span>
    </div>
  );
}

function WorkOrderCard({ order }: { order: WorkOrder }) {
  const { selectWorkOrder } = useDemoStore();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">
            {order.id}
          </div>
          <div className="mt-0.5 truncate text-xs text-slate-600">
            {order.title}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass(order.status)}`}
        >
          {order.status}
        </span>
      </div>

      <div className="space-y-1.5 px-4 py-3 text-xs text-slate-600">
        <div>
          {order.serviceType} · {order.category}
        </div>
        <div>
          {order.campus} · {order.space}
        </div>
        <div className="line-clamp-2 text-slate-700">{order.description}</div>
      </div>

      {expanded ? (
        <div className="border-t border-slate-100 px-4 py-3">
          <div className="mb-1 text-xs font-semibold text-slate-800">
            工单详情
          </div>
          <DetailRow label="服务类型" value={order.serviceType} />
          <DetailRow label="服务分类" value={order.category} />
          <DetailRow label="所属园区" value={order.campus} />
          <DetailRow label="空间" value={order.space} />
          <DetailRow label="设备" value={order.device} />
          <DetailRow label="问题描述" value={order.description} />
          <DetailRow label="联系人" value={order.contactName} />
          <DetailRow label="联系电话" value={order.contactPhone} />
          <DetailRow label="来源" value={order.source} />
          <DetailRow label="状态" value={order.status} />
          <DetailRow label="处理人员" value={order.assignee ?? "未分派"} />
          <DetailRow label="处理班组" value={order.team ?? "-"} />
          <DetailRow label="创建时间" value={order.createdAt} />
          <DetailRow
            label="附件"
            value={
              order.attachments.length > 0
                ? order.attachments.map((item) => item.fileName).join("、")
                : "无"
            }
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border bg-white px-3 py-1.5 text-sm text-slate-800"
          onClick={() => {
            selectWorkOrder(order.id);
            setExpanded((prev) => !prev);
            window.dispatchEvent(
              new CustomEvent("property-demo-action", {
                detail: {
                  type: "view_work_order",
                  workOrderId: order.id,
                  silent: true,
                },
              }),
            );
          }}
        >
          {expanded ? "收起详情" : "查看工单详情"}
          <ChevronDownIcon
            className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>
    </div>
  );
}

export const WorkOrderListToolUI: ToolCallMessagePartComponent<
  ListArgs,
  ListResult
> = function WorkOrderListToolUI({ result }) {
  if (!result || result.phase !== "ready") {
    return <WorkOrderListSkeleton />;
  }

  return (
    <div className="my-2 space-y-2">
      <div className="flex items-center gap-2 px-0.5 text-sm font-semibold text-slate-900">
        <ClipboardListIcon className="size-4" />
        当前已有工单（{result.orders.length}）
      </div>
      {result.orders.map((order) => (
        <WorkOrderCard key={order.id} order={order} />
      ))}
    </div>
  );
};
