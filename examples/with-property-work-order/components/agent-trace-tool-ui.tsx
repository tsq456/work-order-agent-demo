"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { useState } from "react";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
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

type TraceArgs = {
  title?: string;
};

type TraceResult = {
  steps: TraceStep[];
  simulated: true;
};

export const AgentTraceToolUI: ToolCallMessagePartComponent<
  TraceArgs,
  TraceResult
> = function AgentTraceToolUI({ result }) {
  const steps = result?.steps ?? [];
  const running = steps.some((step) => step.status === "running");
  const doneCount = steps.filter((step) => step.status === "done").length;
  const [open, setOpen] = useState(false);

  return (
    <div className="my-1.5 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <ChevronDownIcon className="size-4 shrink-0 text-slate-500" />
        ) : (
          <ChevronRightIcon className="size-4 shrink-0 text-slate-500" />
        )}
        <WrenchIcon className="size-3.5 shrink-0 text-slate-600" />
        <span className="min-w-0 flex-1 font-medium text-slate-800">
          调用轨迹
          <span className="ml-1.5 text-xs font-normal text-slate-500">
            {doneCount}/{steps.length || 0} 步
          </span>
        </span>
        {running ? (
          <LoaderCircleIcon className="size-3.5 animate-spin text-sky-600" />
        ) : (
          <CheckCircle2Icon className="size-3.5 text-emerald-600" />
        )}
      </button>

      {open ? (
        <ol className="space-y-2 border-t border-slate-200 px-3 py-2.5">
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
                    <code className="rounded bg-white px-1.5 py-0.5 text-[11px] text-slate-600">
                      {step.toolName}
                    </code>
                  ) : null}
                </div>
                {step.resultSummary ? (
                  <p className="mt-0.5 text-xs text-slate-500">{step.resultSummary}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
};
