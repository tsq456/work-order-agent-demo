"use client";

export function WorkOrderDraftSkeleton() {
  return (
    <div className="my-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
        <div className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-5 w-16 animate-pulse rounded-full bg-amber-100" />
      </div>

      <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
            <div className="h-9 w-full animate-pulse rounded-md bg-slate-100" />
          </div>
        ))}
        <div className="space-y-2 sm:col-span-2">
          <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
          <div className="h-20 w-full animate-pulse rounded-md bg-slate-100" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
          <div className="h-14 w-full animate-pulse rounded-md bg-slate-100" />
        </div>
      </div>

      <div className="border-t bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block size-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          正在生成结构化工单草稿…
        </div>
      </div>
    </div>
  );
}
