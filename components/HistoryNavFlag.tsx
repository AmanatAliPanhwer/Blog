"use client";

import { useEffect } from "react";

export const FEED_BACK_FLAG = "feed:back-nav";
export const FEED_ORIGIN_KEY = "feed:post-origin";

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