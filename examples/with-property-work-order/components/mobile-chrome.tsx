"use client";

import { useEffect, type ReactNode } from "react";

const COMPOSER_PLACEHOLDER = "请输入您的问题";

export function MobileChrome({ children }: { children: ReactNode }) {
  useEffect(() => {
    const apply = () => {
      const input = document.querySelector(
        ".mobile-chat .aui-composer-input",
      ) as HTMLTextAreaElement | null;
      if (input && input.placeholder !== COMPOSER_PLACEHOLDER) {
        input.placeholder = COMPOSER_PLACEHOLDER;
      }
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mobile-shell bg-background text-foreground flex h-dvh max-h-dvh w-full flex-col overflow-hidden">
      <header className="safe-top border-border/80 bg-background/95 z-20 shrink-0 border-b backdrop-blur">
        <div className="mx-auto flex h-12 max-w-lg items-center justify-center px-3">
          <div className="text-sm font-semibold">园区物业工单助手</div>
        </div>
      </header>

      <div className="mobile-chat min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
