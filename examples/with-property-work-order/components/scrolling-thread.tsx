"use client";

import { useAuiState } from "@assistant-ui/react";
import { useEffect, useRef, type ComponentProps } from "react";
import { Thread as AuiThread } from "@/components/assistant-ui/elements/thread.aui";

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Message list is the only scrollport in the mobile shell. */
function getScrollport() {
  return document.querySelector(
    '.mobile-chat [data-slot="aui_message-group"]',
  ) as HTMLElement | null;
}

function ensureOverlay(viewport: HTMLElement) {
  const parent = viewport.parentElement;
  if (!parent) return null;

  const computed = getComputedStyle(parent);
  if (computed.position === "static") {
    parent.style.position = "relative";
  }

  let rail = parent.querySelector(
    ":scope > .mobile-overlay-scrollbar",
  ) as HTMLElement | null;
  if (!rail) {
    rail = document.createElement("div");
    rail.className = "mobile-overlay-scrollbar";
    rail.setAttribute("aria-hidden", "true");
    const thumb = document.createElement("div");
    thumb.className = "mobile-overlay-scrollbar-thumb";
    rail.appendChild(thumb);
    parent.appendChild(rail);
  }
  return rail;
}

function syncOverlayGeometry(viewport: HTMLElement, rail: HTMLElement) {
  const parent = viewport.parentElement;
  if (!parent) return;

  const parentRect = parent.getBoundingClientRect();
  const vpRect = viewport.getBoundingClientRect();
  const top = Math.max(0, vpRect.top - parentRect.top);
  const height = Math.max(0, vpRect.height);

  rail.style.top = `${top}px`;
  rail.style.height = `${height}px`;
  rail.style.bottom = "auto";
}

function getReserveHeight(viewport: HTMLElement) {
  const reserve = viewport.querySelector("[data-aui-top-anchor-reserve]");
  if (!(reserve instanceof HTMLElement)) return 0;
  return reserve.offsetHeight || reserve.getBoundingClientRect().height || 0;
}

/** Latest real message / typing node — skip top-anchor empty slack. */
function getLatestContentEl(viewport: HTMLElement): HTMLElement | null {
  const reserve = viewport.querySelector("[data-aui-top-anchor-reserve]");
  if (reserve?.previousElementSibling instanceof HTMLElement) {
    return reserve.previousElementSibling;
  }
  for (let i = viewport.children.length - 1; i >= 0; i -= 1) {
    const child = viewport.children[i];
    if (!(child instanceof HTMLElement)) continue;
    if (child.hasAttribute("data-aui-top-anchor-reserve")) continue;
    return child;
  }
  return null;
}

/**
 * ScrollTop that keeps the latest content near the bottom of the viewport,
 * without diving into the top-anchor reserve spacer ("scrolls too far down").
 */
function getFollowScrollTop(viewport: HTMLElement) {
  const padding = 12;
  const reserveHeight = getReserveHeight(viewport);
  const absoluteBottom = Math.max(
    0,
    viewport.scrollHeight - reserveHeight - viewport.clientHeight,
  );

  const latest = getLatestContentEl(viewport);
  if (!latest) return absoluteBottom;

  const vpRect = viewport.getBoundingClientRect();
  const elRect = latest.getBoundingClientRect();
  const delta = elRect.bottom - (vpRect.bottom - padding);
  const byLatest = viewport.scrollTop + delta;
  return Math.max(0, Math.min(absoluteBottom, byLatest));
}

function syncOverlayThumb(viewport: HTMLElement, rail: HTMLElement) {
  syncOverlayGeometry(viewport, rail);

  const thumb = rail.querySelector(
    ".mobile-overlay-scrollbar-thumb",
  ) as HTMLElement | null;
  if (!thumb) return;

  const reserveHeight = getReserveHeight(viewport);
  const effectiveScrollHeight = Math.max(
    viewport.clientHeight,
    viewport.scrollHeight - reserveHeight,
  );
  const { clientHeight, scrollTop } = viewport;
  if (effectiveScrollHeight <= clientHeight + 1) {
    rail.classList.remove("is-visible");
    thumb.style.height = "0px";
    return;
  }

  const ratio = clientHeight / effectiveScrollHeight;
  const thumbHeight = Math.max(24, Math.round(clientHeight * ratio));
  const maxTop = Math.max(0, clientHeight - thumbHeight);
  const maxScroll = Math.max(0, effectiveScrollHeight - clientHeight);
  const top = maxScroll > 0 ? Math.round((scrollTop / maxScroll) * maxTop) : 0;

  thumb.style.height = `${thumbHeight}px`;
  thumb.style.transform = `translateY(${Math.min(maxTop, Math.max(0, top))}px)`;
}

function useFollowViewportWhileGenerating() {
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const fingerprint = useAuiState((s) => {
    const last = s.thread.messages.at(-1);
    if (!last) return "empty";
    const content = last.content as
      | string
      | readonly {
          type: string;
          text?: string;
          toolName?: string;
          result?: unknown;
        }[];
    if (typeof content === "string") {
      return `${last.id}:${content.length}`;
    }
    return `${last.id}:${content
      .map((part) => {
        if (part.type === "text") return `t${part.text?.length ?? 0}`;
        if (part.type === "tool-call") {
          return `c${part.toolName ?? ""}${part.result === undefined ? "0" : "1"}`;
        }
        return part.type;
      })
      .join("|")}`;
  });

  const allowFollowRef = useRef(true);
  const programmaticRef = useRef(false);
  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;

  const animFrameRef = useRef<number | null>(null);
  const followLoopRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const hideBarTimerRef = useRef<number | null>(null);
  const viewportRef = useRef<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLElement | null>(null);

  const cancelAnim = () => {
    if (animFrameRef.current != null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  const cancelFollowLoop = () => {
    if (followLoopRef.current != null) {
      cancelAnimationFrame(followLoopRef.current);
      followLoopRef.current = null;
    }
  };

  const cancelSettleTimer = () => {
    if (settleTimerRef.current != null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  };

  const getViewport = () => {
    if (viewportRef.current?.isConnected) return viewportRef.current;
    const el = getScrollport();
    viewportRef.current = el;
    return el;
  };

  const flashScrollbar = (viewport: HTMLElement) => {
    const rail = overlayRef.current ?? ensureOverlay(viewport);
    if (!rail) return;
    overlayRef.current = rail;
    syncOverlayThumb(viewport, rail);
    rail.classList.add("is-visible");
    if (hideBarTimerRef.current != null) {
      window.clearTimeout(hideBarTimerRef.current);
    }
    hideBarTimerRef.current = window.setTimeout(() => {
      hideBarTimerRef.current = null;
      rail.classList.remove("is-visible");
    }, 900);
  };

  const smoothToFollow = (durationMs = 420) => {
    const viewport = getViewport();
    if (!viewport || !allowFollowRef.current) return;

    cancelAnim();
    flashScrollbar(viewport);

    if (prefersReducedMotion()) {
      programmaticRef.current = true;
      viewport.scrollTop = getFollowScrollTop(viewport);
      requestAnimationFrame(() => {
        programmaticRef.current = false;
      });
      return;
    }

    const start = viewport.scrollTop;
    const startTime = performance.now();
    programmaticRef.current = true;

    const step = (now: number) => {
      const target = getFollowScrollTop(viewport);
      const t = Math.min(1, (now - startTime) / durationMs);
      viewport.scrollTop = start + (target - start) * easeOutCubic(t);
      const rail = overlayRef.current;
      if (rail) syncOverlayThumb(viewport, rail);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step);
        return;
      }

      viewport.scrollTop = getFollowScrollTop(viewport);
      animFrameRef.current = null;
      requestAnimationFrame(() => {
        programmaticRef.current = false;
      });
    };

    animFrameRef.current = requestAnimationFrame(step);
  };

  const scheduleSettle = (durationMs: number, delayMs = 20) => {
    cancelSettleTimer();
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null;
      smoothToFollow(durationMs);
    }, delayMs);
  };

  useEffect(() => {
    let attached: HTMLElement | null = null;
    let observer: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const onScroll = () => {
      const viewport = attached;
      if (!viewport) return;
      flashScrollbar(viewport);
      if (programmaticRef.current) return;
      if (isRunningRef.current) {
        allowFollowRef.current = true;
        return;
      }
      const target = getFollowScrollTop(viewport);
      allowFollowRef.current = Math.abs(viewport.scrollTop - target) < 120;
    };

    const bind = (viewport: HTMLElement) => {
      if (attached === viewport) return;
      if (attached) {
        attached.removeEventListener("scroll", onScroll);
        resizeObserver?.disconnect();
      }
      attached = viewport;
      viewportRef.current = viewport;
      overlayRef.current = ensureOverlay(viewport);
      viewport.addEventListener("scroll", onScroll, { passive: true });
      resizeObserver = new ResizeObserver(() => {
        const rail = overlayRef.current;
        if (rail) syncOverlayThumb(viewport, rail);
      });
      resizeObserver.observe(viewport);
    };

    const tryBind = () => {
      const viewport = getScrollport();
      if (viewport) bind(viewport);
    };

    tryBind();
    observer = new MutationObserver(tryBind);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      resizeObserver?.disconnect();
      attached?.removeEventListener("scroll", onScroll);
      cancelAnim();
      cancelFollowLoop();
      cancelSettleTimer();
      if (hideBarTimerRef.current != null) {
        window.clearTimeout(hideBarTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    cancelFollowLoop();
    cancelSettleTimer();
    const viewport = getViewport();
    if (!viewport) return;

    if (!isRunning) {
      // Only gently settle once generation ends — don't yank into reserve slack.
      if (allowFollowRef.current) scheduleSettle(360, 40);
      return;
    }

    allowFollowRef.current = true;

    if (prefersReducedMotion()) {
      const snap = () => {
        programmaticRef.current = true;
        viewport.scrollTop = getFollowScrollTop(viewport);
        programmaticRef.current = false;
        followLoopRef.current = requestAnimationFrame(snap);
      };
      followLoopRef.current = requestAnimationFrame(snap);
      return () => cancelFollowLoop();
    }

    const tick = () => {
      if (allowFollowRef.current) {
        const target = getFollowScrollTop(viewport);
        const current = viewport.scrollTop;
        const gap = target - current;
        if (gap > 0.8) {
          // Follow new content growing downward.
          programmaticRef.current = true;
          viewport.scrollTop = current + gap * 0.18;
          programmaticRef.current = false;
          flashScrollbar(viewport);
        } else if (gap < -8) {
          // Pulled past latest content into top-anchor slack — snap back.
          programmaticRef.current = true;
          viewport.scrollTop = target;
          programmaticRef.current = false;
          flashScrollbar(viewport);
        }
      }
      followLoopRef.current = requestAnimationFrame(tick);
    };

    followLoopRef.current = requestAnimationFrame(tick);
    return () => cancelFollowLoop();
  }, [isRunning]);

  useEffect(() => {
    if (isRunning) return;
    if (!allowFollowRef.current) return;
    // Debounce content-size settle so mid-layout reserve spikes don't yank scroll.
    scheduleSettle(320, 80);
  }, [fingerprint, isRunning]);
}

export function ScrollingThread(props: ComponentProps<typeof AuiThread>) {
  useFollowViewportWhileGenerating();
  return <AuiThread {...props} />;
}
