"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";

/** Lightweight typing dots while waiting for the first reply token. */
export const ReplyTypingToolUI: ToolCallMessagePartComponent = function ReplyTypingToolUI() {
  return (
    <div
      className="my-1 flex items-center gap-1.5 py-1.5"
      role="status"
      aria-label="正在回复"
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          aria-hidden
          className="size-1.5 animate-bounce rounded-full bg-slate-500/70 motion-reduce:animate-none"
          style={{
            animationDelay: `${index * 0.16}s`,
            animationDuration: "1.1s",
          }}
        />
      ))}
    </div>
  );
};
