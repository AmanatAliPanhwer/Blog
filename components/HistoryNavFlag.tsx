"use client";

import { useEffect } from "react";

export const FEED_BACK_FLAG = "feed:back-nav";

function setBackFlag() {
  try {
    sessionStorage.setItem(FEED_BACK_FLAG, "1");
  } catch {
    // ignore storage failures (private mode etc.)
  }
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