"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { useState } from "react";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  SparklesIcon,
  WrenchIcon,
} from "lucide-react";

type TraceStep = {
  id: string;
  label: string;
  kind: "agent" | "tool";
  toolName?: string;
  status: "running" | "done";
  resultSummary?: string;
};

type NestedTool = {
  toolName: string;
  result?: unknown;
  status: "running" | "done";
};

type ThinkingArgs = {
  title?: string;
};

type ThinkingResult = {
  /** Accumulated thinking lines — never overwrite, only append. */
  lines: string[];
  line: string;
  index: number;
  total: number;
  done: boolean;
  steps?: TraceStep[];
  tools?: NestedTool[];
  simulated: true;
};

export const CampusThinkingToolUI: ToolCallMessagePartComponent<
  ThinkingArgs,
  ThinkingResult
> = function CampusThinkingToolUI({ result }) {
  const done = result?.done === true;
  const lines = result?.lines?.length
    ? result.lines
    : [result?.line ?? "园区助手正在处理…"];
  const steps = result?.steps ?? [];
  const tools = result?.tools ?? [];
  const hasDetails = steps.length > 0 || tools.length > 0;
  const [detailsOpen, setDetailsOpen] = useState(false);

  const progress =
    result && result.total > 0
      ? Math.round(((result.index + (done ? 1 : 0)) / result.total) * 100)
      : 8;

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white shadow-sm">
      <div className="px-3.5 py-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            {done ? (
              <CheckCircle2Icon className="size-4" />
            ) : (
              <LoaderCircleIcon className="size-4 animate-spin" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-sky-900">
              <SparklesIcon className="size-3.5" />
            {done ? "园区助手分析完成" : "园区助手思考中"}
            </div>

            <ul className="mt-2 space-y-1.5">
              {lines.map((item, index) => {
                const isCurrent = !done && index === lines.length - 1;
                return (
                  <li
                    key={`${index}-${item}`}
                    className={`text-sm leading-relaxed ${
                      isCurrent ? "font-medium text-slate-800" : "text-slate-500"
                    }`}
                  >
                    <span className="mr-1.5 text-sky-500">·</span>
                    {item}
                    {isCurrent ? <span className="ml-1 animate-pulse">…</span> : null}
                  </li>
                );
              })}
            </ul>

            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-sky-100">
              <div
                className="h-full rounded-full bg-sky-500 transition-[width] duration-500 ease-out"
                style={{ width: `${Math.min(100, Math.max(6, progress))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {hasDetails ? (
        <div className="border-t border-sky-100 bg-white/70">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs text-slate-600"
            onClick={() => setDetailsOpen((value) => !value)}
          >
            {detailsOpen ? (
              <ChevronDownIcon className="size-3.5" />
            ) : (
              <ChevronRightIcon className="size-3.5" />
            )}
            <WrenchIcon className="size-3.5" />
            <span className="font-medium text-slate-700">调用轨迹与执行详情</span>
            <span className="ml-auto text-slate-400">
              {steps.filter((s) => s.status === "done").length}/{steps.length || 0} 步
            </span>
          </button>

          {detailsOpen ? (
            <div className="space-y-3 border-t border-sky-50 px-3.5 py-3">
              {steps.length > 0 ? (
                <ol className="space-y-2">
                  {steps.map((step, index) => (
                    <li key={step.id} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 text-slate-400">{index + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {step.status === "done" ? (
                            <CheckCircle2Icon className="size-3.5 text-emerald-600" />
                          ) : (
                            <LoaderCircleIcon className="size-3.5 animate-spin text-blue-600" />
                          )}
                          <span className="font-medium text-slate-800">{step.label}</span>
                          {step.toolName ? (
                            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                              {step.toolName}
                            </code>
                          ) : null}
                        </div>
                        {step.resultSummary ? (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {step.resultSummary}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}

              {tools.map((tool) => (
                <details
                  key={tool.toolName}
                  className="rounded-md border border-slate-200 bg-slate-50"
                >
                  <summary className="cursor-pointer list-none px-3 py-2 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-white px-1.5 py-0.5 font-medium">
                        {tool.toolName}
                      </code>
                      <span className="ml-auto text-slate-400">
                        {tool.status === "running" ? "执行中…" : "完成"}
                      </span>
                    </div>
                  </summary>
                  {tool.result !== undefined ? (
                    <pre className="max-h-40 overflow-auto border-t border-slate-200 p-2 text-[11px] leading-relaxed text-slate-600">
                      {JSON.stringify(tool.result, null, 2)}
                    </pre>
                  ) : null}
                </details>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
