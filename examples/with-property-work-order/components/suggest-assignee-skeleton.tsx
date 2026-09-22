"use client";

export function SuggestAssigneeSkeleton() {
  return (
    <div className="my-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b bg-slate-50 px-4 py-3">
        <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-3 w-52 animate-pulse rounded bg-slate-100" />
      </div>

      <div className="space-y-2 px-4 py-3">
        <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-[85%] animate-pulse rounded bg-slate-100" />
      </div>

      <div className="space-y-2 border-t px-4 py-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="space-y-2 rounded-lg border border-slate-100 px-3 py-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-12 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-52 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="border-t bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block size-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          正在整理处理人员推荐…
        </div>
      </div>
    </div>
  );
}
