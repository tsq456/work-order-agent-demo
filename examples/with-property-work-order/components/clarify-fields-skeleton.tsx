"use client";

export function ClarifyFieldsSkeleton() {
  return (
    <div className="my-2 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
      <div className="border-b border-blue-100 bg-blue-50 px-4 py-3">
        <div className="h-4 w-24 animate-pulse rounded bg-blue-200/80" />
        <div className="mt-2 h-3 w-56 animate-pulse rounded bg-blue-100" />
      </div>

      <div className="space-y-2 px-4 py-3">
        <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-3 w-full max-w-[80%] animate-pulse rounded bg-slate-100" />
        <div className="mt-2 flex gap-2">
          <div className="h-5 w-16 animate-pulse rounded-full bg-amber-100" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-amber-100" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-amber-100" />
        </div>
      </div>

      <div className="grid gap-3 border-t px-4 py-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
          <div className="h-24 w-full animate-pulse rounded-md bg-slate-100" />
        </div>
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className={`space-y-2 ${index === 2 ? "sm:col-span-2" : ""}`}
          >
            <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
            <div className="h-9 w-full animate-pulse rounded-md bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="border-t bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block size-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          正在整理待确认信息表单…
        </div>
      </div>
    </div>
  );
}
