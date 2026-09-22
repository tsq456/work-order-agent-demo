"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

type GenericResult = Record<string, unknown> & { simulated?: boolean };

export const CompactToolResultUI: ToolCallMessagePartComponent<
  Record<string, unknown>,
  GenericResult
> = function CompactToolResultUI({ toolName, result, status }) {
  const running = status?.type === "running";
  const [open, setOpen] = useState(false);

  return (
    <div className="my-1 overflow-hidden rounded-md border border-slate-200 bg-white text-xs text-slate-700">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <ChevronDownIcon className="size-3.5 shrink-0 text-slate-400" />
        ) : (
          <ChevronRightIcon className="size-3.5 shrink-0 text-slate-400" />
        )}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-medium">
          {toolName}
        </code>
        <span className="ml-auto text-slate-400">
          {running ? "执行中…" : result ? "完成 · 可展开" : "等待中"}
        </span>
      </button>
      {open && result ? (
        <pre className="max-h-40 overflow-auto border-t border-slate-100 bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-600">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
};
