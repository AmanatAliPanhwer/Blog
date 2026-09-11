"use client";

import { useEffect } from "react";

// Fires once per app load so a returning Admin gets the admin_session cookie
// re-issued through the write-safe route handler (cookies can't be set during
// Server Component rendering in Next.js).
export default function SessionRestorer() {
  useEffect(() => {
    fetch("/api/restore-session", { method: "POST" }).catch(() => {});
  }, []);

  return null;
}