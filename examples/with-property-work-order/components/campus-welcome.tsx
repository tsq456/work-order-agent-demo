"use client";

import { useAui } from "@assistant-ui/react";
import { useEffect, useState } from "react";
import { WELCOME_PROMPT_POOL } from "@/lib/mock-data";

type WelcomeCard = (typeof WELCOME_PROMPT_POOL)[number];

function pickRandomThree(items: readonly WelcomeCard[]): WelcomeCard[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy.slice(0, 3);
}

export function CampusWelcome() {
  const aui = useAui();
  // Defer random pick until after mount to avoid SSR/client hydration mismatch.
  const [cards, setCards] = useState<WelcomeCard[] | null>(null);

  useEffect(() => {
    setCards(pickRandomThree(WELCOME_PROMPT_POOL));
  }, []);

  return (
    <div className="mb-4 flex w-full flex-col gap-4 px-1">
      <p className="text-[17px] leading-relaxed font-medium text-slate-900">
        您好，我是园区工单助手。有物业报修或工单相关的事，直接跟我说就行
      </p>

      <div className="flex flex-col gap-2.5">
        {cards
          ? cards.map((card) => (
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
            ))
          : Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-3"
                aria-hidden
              >
                <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                <div className="mt-2 h-3 w-full animate-pulse rounded bg-slate-100" />
                <div className="mt-1.5 h-3 w-4/5 max-w-[85%] animate-pulse rounded bg-slate-100" />
              </div>
            ))}
      </div>

      <p className="text-sm text-slate-500">您也可以输入想要报修的工单内容</p>
    </div>
  );
}
