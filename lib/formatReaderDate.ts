/**
 * Client-safe rendering of a Post's canonical UTC instant in the reader's own
 * timezone and locale. Imported only from client components: keep this module
 * free of Node-only APIs (no process.env), so it never leaks server config.
 */

export function formatReaderTimestamp(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}