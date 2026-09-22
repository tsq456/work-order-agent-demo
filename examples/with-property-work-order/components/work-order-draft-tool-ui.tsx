"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { PaperclipIcon, AlertTriangleIcon } from "lucide-react";
import { useDemoStore } from "@/lib/demo-store";
import { useState } from "react";
import {
  CAMPUS_OPTIONS,
  SERVICE_CATEGORY_OPTIONS,
  SERVICE_TYPE_OPTIONS,
} from "@/lib/dictionaries";
import { WorkOrderDraftSkeleton } from "@/components/work-order-draft-skeleton";

type DraftArgs = Record<string, never>;

type DraftResult = {
  draftId: string;
  phase: "generating" | "ready";
  simulated: true;
};

export const WorkOrderDraftToolUI: ToolCallMessagePartComponent<
  DraftArgs,
  DraftResult
> = function WorkOrderDraftToolUI({ result }) {
  const {
    draft,
    setDraft,
    addDemoAttachment,
    createBlocked,
    createWorkOrderFromDraft,
  } = useDemoStore();
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!result || result.phase === "generating") {
    return <WorkOrderDraftSkeleton />;
  }

  const canCreate =
    !cancelled &&
    !createdId &&
    !createBlocked &&
    draft.attachments.length >= 1 &&
    !busy;

  const onConfirmCreate = async () => {
    setBusy(true);
    setError(null);
    const response = await createWorkOrderFromDraft();
    setBusy(false);
    setConfirmOpen(false);
    if (!response.ok) {
      setError(response.error);
      return;
    }
    setCreatedId(response.workOrder.id);
    window.dispatchEvent(
      new CustomEvent("property-demo-action", {
        detail: { type: "work_order_created", workOrderId: response.workOrder.id },
      }),
    );
  };

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">工单草稿</div>
          <div className="text-xs text-slate-500">物业报修</div>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
          {draft.status}
        </span>
      </div>

      <div className="grid gap-3 px-4 py-4 text-sm sm:grid-cols-2">
        <label className="space-y-1">
          <div className="text-xs text-slate-500">服务类型</div>
          {editing && !cancelled && !createdId ? (
            <select
              className="w-full rounded-md border px-2 py-1.5"
              value={draft.serviceType}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, serviceType: e.target.value }))
              }
            >
              {SERVICE_TYPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="font-medium text-slate-800">{draft.serviceType}</div>
          )}
        </label>

        <label className="space-y-1">
          <div className="text-xs text-slate-500">固定服务分类</div>
          {editing && !cancelled && !createdId ? (
            <select
              className="w-full rounded-md border px-2 py-1.5"
              value={draft.category}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, category: e.target.value }))
              }
            >
              {SERVICE_CATEGORY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="font-medium text-slate-800">{draft.category}</div>
          )}
        </label>

        <label className="space-y-1">
          <div className="text-xs text-slate-500">园区</div>
          {editing && !cancelled && !createdId ? (
            <select
              className="w-full rounded-md border px-2 py-1.5"
              value={draft.campus}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, campus: e.target.value }))
              }
            >
              {CAMPUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="font-medium text-slate-800">{draft.campus}</div>
          )}
        </label>

        {(
          [
            ["空间", "space"],
            ["设备", "device"],
            ["联系人", "contactName"],
            ["联系电话", "contactPhone"],
            ["来源", "source"],
          ] as const
        ).map(([label, key]) => (
          <label key={key} className="space-y-1">
            <div className="text-xs text-slate-500">{label}</div>
            {editing && !cancelled && !createdId ? (
              <input
                className="w-full rounded-md border px-2 py-1.5"
                value={draft[key]}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, [key]: e.target.value }))
                }
              />
            ) : (
              <div className="font-medium text-slate-800">{draft[key]}</div>
            )}
          </label>
        ))}

        <label className="space-y-1 sm:col-span-2">
          <div className="text-xs text-slate-500">问题描述</div>
          {editing && !cancelled && !createdId ? (
            <textarea
              className="min-h-20 w-full rounded-md border px-2 py-1.5"
              value={draft.description}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          ) : (
            <div className="font-medium text-slate-800">{draft.description}</div>
          )}
        </label>

        <div className="space-y-1 sm:col-span-2">
          <div className="text-xs text-slate-500">附件状态</div>
          {draft.attachments.length === 0 ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
              <div>
                <div className="font-medium">报修必须至少上传一个附件。</div>
                <div className="text-xs">当前附件为空，确认创建不可用。</div>
              </div>
            </div>
          ) : (
            <ul className="space-y-1">
              {draft.attachments.map((file) => (
                <li
                  key={file.fileName}
                  className="flex items-center gap-2 rounded-md border bg-slate-50 px-3 py-2"
                >
                  <PaperclipIcon className="size-4 text-slate-500" />
                  <div>
                    <div className="font-medium">{file.fileName}</div>
                    <div className="text-xs text-slate-500">
                      {file.mimeType} · {file.tag}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {error ? (
        <div className="mx-4 mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {createdId ? (
        <div className="space-y-3 border-t bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div>工单 {createdId} 已创建成功（待受理）。</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm text-emerald-900"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("property-demo-action", {
                    detail: {
                      type: "view_work_order",
                      workOrderId: createdId,
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
                      workOrderId: createdId,
                    },
                  }),
                );
              }}
            >
              推荐处理人员
            </button>
          </div>
        </div>
      ) : cancelled ? (
        <div className="border-t bg-slate-50 px-4 py-3 text-sm text-slate-600">
          已取消本次工单草稿。
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 border-t bg-slate-50 px-4 py-3">
          <button
            type="button"
            className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
            onClick={addDemoAttachment}
            disabled={draft.attachments.length > 0}
          >
            添加现场附件
          </button>
          <button
            type="button"
            className="rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "完成修改" : "修改信息"}
          </button>
          <button
            type="button"
            className="rounded-md border bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            onClick={() => setCancelled(true)}
          >
            取消
          </button>
          <button
            type="button"
            disabled={!canCreate}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setConfirmOpen(true)}
          >
            确认创建工单
          </button>
        </div>
      )}

      {confirmOpen ? (
        <div className="border-t bg-white px-4 py-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            确认后将创建工单，状态变为待受理。是否继续？
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
              disabled={busy}
              onClick={onConfirmCreate}
            >
              {busy ? "创建中…" : "确认创建"}
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm"
              disabled={busy}
              onClick={() => setConfirmOpen(false)}
            >
              返回
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
