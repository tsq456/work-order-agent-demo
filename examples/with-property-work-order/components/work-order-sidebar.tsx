"use client";

import { useDemoStore } from "@/lib/demo-store";

export function WorkOrderSidebar() {
  const {
    stats,
    workOrders,
    selectedWorkOrderId,
    selectWorkOrder,
    resetAll,
    getWorkOrder,
  } = useDemoStore();

  const selected = selectedWorkOrderId
    ? getWorkOrder(selectedWorkOrderId)
    : undefined;

  return (
    <aside className="flex h-full w-full max-w-sm flex-col border-r border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          园区物业工单助手
        </div>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">工单面板</h1>
        <p className="mt-1 text-xs text-slate-500">
          查看待受理 / 待处理工单，并支持重置会话。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 py-4">
        <StatCard label="工单总数" value={stats.total} />
        <StatCard label="待受理" value={stats.pendingAccept} />
        <StatCard label="待处理" value={stats.pendingProcess} />
        <StatCard label="草稿提示" value={stats.draft} />
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
        <div className="mb-2 text-xs font-semibold text-slate-500">工单列表</div>
        <div className="space-y-2">
          {workOrders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => selectWorkOrder(order.id)}
              className={`w-full rounded-lg border px-3 py-2 text-left ${
                selectedWorkOrderId === order.id
                  ? "border-slate-900 bg-white"
                  : "border-slate-200 bg-white/70"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-900">{order.id}</span>
                <span className="text-[11px] text-slate-500">{order.status}</span>
              </div>
              <div className="mt-0.5 truncate text-xs text-slate-600">{order.title}</div>
            </button>
          ))}
        </div>

        {selected ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-sm">
            <div className="mb-2 font-semibold text-slate-900">工单详情</div>
            <DetailRow label="标题" value={selected.title} />
            <DetailRow label="服务类型" value={selected.serviceType} />
            <DetailRow label="分类" value={selected.category} />
            <DetailRow label="空间" value={selected.space} />
            <DetailRow label="设备" value={selected.device} />
            <DetailRow label="联系人" value={selected.contactName} />
            <DetailRow label="状态" value={selected.status} />
            <DetailRow label="处理人员" value={selected.assignee ?? "未分派"} />
            <DetailRow label="处理班组" value={selected.team ?? "-"} />
            <DetailRow label="创建时间" value={selected.createdAt} />
            <DetailRow label="来源" value={selected.source} />
          </div>
        ) : null}
      </div>

      <div className="border-t border-slate-200 p-4">
        <button
          type="button"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
          onClick={async () => {
            await resetAll();
            window.dispatchEvent(
              new CustomEvent("property-demo-action", {
                detail: { type: "reset" },
              }),
            );
          }}
        >
          重置
        </button>
      </div>
    </aside>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5 last:border-b-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-right text-xs font-medium text-slate-800">{value}</span>
    </div>
  );
}
