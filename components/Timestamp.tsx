"use client";

import { useEffect, useState } from "react";
import { formatReaderTimestamp } from "@/lib/formatReaderDate";

/**
 * Renders a Post timestamp in the reader's local timezone after hydration.
 * The server passes `label` (the BLOG_TIMEZONE rendering) so the first client
 * render matches the SSR HTML exactly; once mounted we swap to the visitor's
 * own timezone without a hydration mismatch.
 */
export default function Timestamp({
  iso,
  label,
}: {
  iso?: string;
  label?: string;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  return <>{ready && iso ? formatReaderTimestamp(iso) : label || "—"}</>;
}