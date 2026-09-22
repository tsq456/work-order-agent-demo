"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { useEffect, useRef, useState } from "react";
import {
  CAMPUS_OPTIONS,
  SERVICE_CATEGORY_OPTIONS,
  SERVICE_TYPE_OPTIONS,
} from "@/lib/dictionaries";
import { useDemoStore } from "@/lib/demo-store";
import type { WorkOrderDraft } from "@/lib/types";
import { ClarifyFieldsSkeleton } from "@/components/clarify-fields-skeleton";

type ClarifyArgs = {
  title?: string;
};

type ClarifyResult = {
  sessionId: string;
  phase: "generating" | "ready";
  knownSummary: string[];
  missingFields: string[];
  guesses: Partial<WorkOrderDraft>;
  known: Partial<WorkOrderDraft>;
  simulated: true;
};

const FIELD_LABELS: Record<string, string> = {
  serviceType: "服务类型",
  category: "服务分类",
  campus: "所属园区",
  contactName: "联系人",
  contactPhone: "联系电话",
  description: "问题描述",
};

type ClarifyForm = {
  serviceType: string;
  category: string;
  campus: string;
  contactName: string;
  contactPhone: string;
  description: string;
  source: string;
};

function formFromResult(result: ClarifyResult): ClarifyForm {
  return {
    serviceType: result.guesses.serviceType ?? "报修",
    category: result.guesses.category ?? "暖通空调",
    campus: result.guesses.campus ?? "智慧产业园",
    contactName: result.known.contactName ?? "",
    contactPhone: result.known.contactPhone ?? "",
    description: result.known.description ?? "",
    source: result.known.source ?? "物业管理员代录",
  };
}

export const ClarifyFieldsToolUI: ToolCallMessagePartComponent<
  ClarifyArgs,
  ClarifyResult
> = function ClarifyFieldsToolUI({ result }) {
  const { clarification, setClarification, setDraft } = useDemoStore();
  const [form, setForm] = useState<ClarifyForm>({
    serviceType: "报修",
    category: "暖通空调",
    campus: "智慧产业园",
    contactName: "",
    contactPhone: "",
    description: "",
    source: "物业管理员代录",
  });
  const [submitted, setSubmitted] = useState(
    clarification.status === "confirmed",
  );
  const hydratedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!result || result.phase !== "ready") return;
    if (hydratedSessionRef.current === result.sessionId) return;
    hydratedSessionRef.current = result.sessionId;
    setForm(formFromResult(result));
  }, [result]);

  if (!result || result.phase !== "ready") {
    return <ClarifyFieldsSkeleton />;
  }

  if (submitted) {
    return (
      <div className="my-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        关键信息已确认，正在继续匹配空间设备并生成工单草稿…
      </div>
    );
  }

  const canSubmit =
    Boolean(form.serviceType) &&
    Boolean(form.category) &&
    Boolean(form.campus) &&
    Boolean(form.contactName.trim()) &&
    Boolean(form.contactPhone.trim()) &&
    Boolean(form.description.trim());

  const onConfirm = () => {
    const confirmed: Partial<WorkOrderDraft> = {
      serviceType: form.serviceType,
      category: form.category,
      campus: form.campus,
      contactName: form.contactName.trim(),
      contactPhone: form.contactPhone.trim(),
      description: form.description.trim(),
      source: form.source,
      status: "工单草稿",
    };
    setDraft((prev) => ({
      ...prev,
      ...confirmed,
      attachments: [],
    }));
    setClarification({
      ...clarification,
      status: "confirmed",
      knownFields: {
        ...clarification.knownFields,
        ...confirmed,
      },
      missingFields: [],
    });
    setSubmitted(true);
    window.dispatchEvent(
      new CustomEvent("property-demo-action", {
        detail: {
          type: "clarification_confirmed",
          values: confirmed,
        },
      }),
    );
  };

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
      <div className="border-b border-blue-100 bg-blue-50 px-4 py-3">
        <div className="text-sm font-semibold text-blue-950">待确认信息</div>
        <div className="mt-1 text-xs text-blue-800">
          当前描述信息不完整，请确认后再生成工单草稿
        </div>
      </div>

      <div className="space-y-2 px-4 py-3 text-xs text-slate-600">
        <div className="font-medium text-slate-800">已识别：</div>
        <ul className="list-disc space-y-1 pl-4">
          {result.knownSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="pt-1 font-medium text-slate-800">仍需确认：</div>
        <div className="flex flex-wrap gap-1.5">
          {result.missingFields.map((field) => (
            <span
              key={field}
              className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800"
            >
              {FIELD_LABELS[field] ?? field}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 border-t px-4 py-4 text-sm sm:grid-cols-2">
        <label className="space-y-1 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-slate-500">问题描述</div>
            <div className="text-[11px] text-slate-400">基于 AI 解析，可修改</div>
          </div>
          <textarea
            className="min-h-24 w-full resize-y rounded-md border px-2 py-1.5 leading-relaxed"
            placeholder="请补充或修改问题描述"
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs text-slate-500">服务类型</div>
          <select
            className="w-full rounded-md border px-2 py-1.5"
            value={form.serviceType}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, serviceType: e.target.value }))
            }
          >
            {SERVICE_TYPE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-xs text-slate-500">服务分类</div>
          <select
            className="w-full rounded-md border px-2 py-1.5"
            value={form.category}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, category: e.target.value }))
            }
          >
            {SERVICE_CATEGORY_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 sm:col-span-2">
          <div className="text-xs text-slate-500">所属园区</div>
          <select
            className="w-full rounded-md border px-2 py-1.5"
            value={form.campus}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, campus: e.target.value }))
            }
          >
            {CAMPUS_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-xs text-slate-500">联系人</div>
          <input
            className="w-full rounded-md border px-2 py-1.5"
            placeholder="例如：王女士"
            value={form.contactName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, contactName: e.target.value }))
            }
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs text-slate-500">联系电话</div>
          <input
            className="w-full rounded-md border px-2 py-1.5"
            placeholder="例如：138****8899"
            value={form.contactPhone}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, contactPhone: e.target.value }))
            }
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 border-t bg-slate-50 px-4 py-3">
        <button
          type="button"
          className="rounded-md border bg-white px-3 py-1.5 text-sm"
          onClick={() =>
            setForm((prev) => ({
              ...prev,
              contactName: "王女士",
              contactPhone: "138****8899",
              campus: "智慧产业园",
              serviceType: "报修",
              category: "暖通空调",
            }))
          }
        >
          填入常用信息
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          onClick={onConfirm}
        >
          确认并继续生成草稿
        </button>
      </div>
    </div>
  );
};
