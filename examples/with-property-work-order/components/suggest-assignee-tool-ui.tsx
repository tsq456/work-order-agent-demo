"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { useDemoStore } from "@/lib/demo-store";
import { useState } from "react";
import { UserCheckIcon } from "lucide-react";
import type { AssigneeCandidate } from "@/lib/types";
import { SuggestAssigneeSkeleton } from "@/components/suggest-assignee-skeleton";

type SuggestArgs = {
  workOrderId: string;
};

type SuggestResult = {
  workOrderId: string;
  phase: "generating" | "ready";
  candidates: AssigneeCandidate[];
  recommendedId: string;
  recommendedName: string;
  reasons: string[];
  simulated: true;
};

export const SuggestAssigneeToolUI: ToolCallMessagePartComponent<
  SuggestArgs,
  SuggestResult
> = function SuggestAssigneeToolUI({ result }) {
  const {
    selectedAssigneeId,
    setSelectedAssigneeId,
    assignBlocked,
    assignSelectedWorkOrder,
    selectWorkOrder,
  } = useDemoStore();
  const [busy, setBusy] = useState(false);
  const [doneText, setDoneText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deferred, setDeferred] = useState(false);
  const [pickingOther, setPickingOther] = useState(false);

  if (!result || result.phase !== "ready") {
    return <SuggestAssigneeSkeleton />;
  }

  const onAssign = async () => {
    setBusy(true);
    setError(null);
    selectWorkOrder(result.workOrderId);
    const response = await assignSelectedWorkOrder(selectedAssigneeId);
    setBusy(false);
    if (!response.ok) {
      setError(response.error);
      return;
    }
    setDoneText(
      `工单 ${response.workOrder.id} 已受理并分派给 ${response.workOrder.assignee}，当前状态为待处理。`,
    );
    window.dispatchEvent(
      new CustomEvent("property-demo-action", {
        detail: {
          type: "assigned",
          workOrderId: response.workOrder.id,
          message: `工单 ${response.workOrder.id} 已受理并分派给 ${response.workOrder.assignee}，当前状态为待处理。`,
        },
      }),
    );
  };

  return (
    <div className="my-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <UserCheckIcon className="size-4" />
        处理人员推荐
      </div>

      <p className="mb-3 text-sm text-slate-700">
        推荐 <strong>{result.recommendedName}</strong>
        ，需你确认后才会受理并分派。
      </p>

      <ul className="mb-3 space-y-2">
        {result.reasons.map((reason) => (
          <li key={reason} className="text-sm text-slate-600">
            · {reason}
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        {result.candidates.map((person) => {
          const selected = selectedAssigneeId === person.id;
          return (
            <button
              key={person.id}
              type="button"
              disabled={!!doneText || deferred || assignBlocked}
              onClick={() => setSelectedAssigneeId(person.id)}
              className={`w-full rounded-lg border px-3 py-3 text-left ${
                selected
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-slate-900">
                  {person.name}
                  {person.recommended ? (
                    <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">
                      推荐
                    </span>
                  ) : null}
                </div>
                <span className="text-xs text-slate-500">{person.status}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                班组：{person.team} · 处理中工单：{person.activeOrders}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                技能：{person.skills.join("、")}
              </div>
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {doneText ? (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {doneText}
        </div>
      ) : deferred ? (
        <div className="mt-3 rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-600">
          已暂不分派。你可以稍后继续推荐或分派。
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || assignBlocked}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            onClick={onAssign}
          >
            {busy ? "分派中…" : "确认受理并分派"}
          </button>
          <button
            type="button"
            disabled={busy || assignBlocked}
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={() => {
              setPickingOther(true);
              const other = result.candidates.find(
                (item) => item.id !== result.recommendedId,
              );
              if (other) setSelectedAssigneeId(other.id);
            }}
          >
            选择其他人员
          </button>
          <button
            type="button"
            disabled={busy || assignBlocked}
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={() => setDeferred(true)}
          >
            暂不分派
          </button>
        </div>
      )}

      {pickingOther && !doneText && !deferred ? (
        <p className="mt-2 text-xs text-slate-500">
          已切换为可选人员，请点选卡片后点击“确认受理并分派”。
        </p>
      ) : null}
    </div>
  );
};
