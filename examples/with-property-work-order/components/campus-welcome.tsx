"use client";

import { useAui } from "@assistant-ui/react";
import { WELCOME_PROMPTS } from "@/lib/mock-data";

export function CampusWelcome() {
  const aui = useAui();

  return (
    <div className="mb-4 flex w-full flex-col gap-4 px-1">
      <p className="text-[17px] leading-relaxed font-medium text-slate-900">
        您好，我是园区工单助手。有物业报修或工单相关的事，直接跟我说就行
      </p>

      <div className="flex flex-col gap-2.5">
        {WELCOME_PROMPTS.map((card) => (
          <button
            key={card.prompt}
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left shadow-sm transition-colors active:bg-slate-50"
            onClick={() => {
              aui.composer.setText(card.prompt);
              aui.composer.send();
            }}
          >
            <div className="text-sm font-medium text-slate-900">
              {card.title}
            </div>
            <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
              {card.prompt}
            </div>
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-500">您也可以输入想要报修的工单内容</p>
    </div>
  );
}
