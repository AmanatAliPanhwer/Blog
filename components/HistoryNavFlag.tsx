"use client";

import { useEffect } from "react";

export const FEED_BACK_FLAG = "feed:back-nav";
export const FEED_ORIGIN_KEY = "feed:post-origin";

interface CachedPos {
  y: number;
  focusId: number | null;
  focusOffset: number;
}

// In-memory copy of the last reader position per feed. Unlike sessionStorage
// it cannot be overwritten by transient writes (e.g. a remount writing y:0
// from a detached DOM), so Back-restore never reads a clobbered position.
const posCache: Record<string, CachedPos> = {};

export function cacheFeedPos(key: string, pos: CachedPos): void {
  if (pos && pos.y >= 0) posCache[key] = pos;
}

export function getCachedFeedPos(key: string): CachedPos | null {
  return posCache[key] ?? null;
}

function setBackFlag() {
  try {
    sessionStorage.setItem(FEED_BACK_FLAG, "1");
  } catch {
    // ignore storage failures (private mode etc.)
  }
}

export function markFeedOrigin(id: number): void {
  try {
    sessionStorage.setItem(FEED_ORIGIN_KEY, String(id));
  } catch {
    // ignore storage failures (private mode etc.)
  }
}

// True when a Post was opened from the Feed (rather than a direct/shared
// link), so the in-app Back button can safely pop instead of leaving the app.
export function consumeFeedOrigin(id: number): boolean {
  try {
    if (sessionStorage.getItem(FEED_ORIGIN_KEY) === String(id)) {
      sessionStorage.removeItem(FEED_ORIGIN_KEY);
      return true;
    }
  } catch {
    // ignore storage failures
  }
  return false;
}

export function consumeFeedBackFlag(): boolean {
  try {
    if (sessionStorage.getItem(FEED_BACK_FLAG) === "1") {
      sessionStorage.removeItem(FEED_BACK_FLAG);
      return true;
    }
  } catch {
    // ignore storage failures
  }
  return false;
}

export default function HistoryNavFlag() {
  useEffect(() => {
    const onPopState = () => setBackFlag();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return null;
}