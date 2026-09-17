/**
 * Server-side timestamp handling for the Blog.
 *
 * A Post is stored once as a canonical UTC instant. Values coming back from
 * Supabase may carry an explicit offset (timestamptz) or be a naive civil
 * string (timestamp column written/read in a UTC session, or legacy rows that
 * were inserted as "server local" time and interpreted as UTC). Both resolve
 * to the same instant here: a naive value is read as if it were UTC civil
 * time, since after the write-path and backfill changes every stored value
 * represents UTC.
 *
 * Human formatting and Archive Filter grouping/boundaries are anchored to
 * BLOG_TIMEZONE (the journal owner's timezone) so a single Post lands in the
 * same year/month/day everywhere server-side. Reader-facing rendering happens
 * on the client in the visitor's own timezone (see lib/formatReaderDate.ts).
 */

export const BLOG_TIMEZONE = process.env.BLOG_TIMEZONE || "Asia/Karachi";

const FULL_HOUR24 = new Intl.DateTimeFormat("en-US", {
  timeZone: BLOG_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const FULL_HOUR12 = new Intl.DateTimeFormat("en-US", {
  timeZone: BLOG_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const DATE_ONLY = new Intl.DateTimeFormat("en-US", {
  timeZone: BLOG_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function partsAsMap(
  fmt: Intl.DateTimeFormat,
  date: Date
): Map<string, string> {
  return new Map(
    fmt
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value])
  );
}

/** UTC offset (minutes) of `date`'s wall time in BLOG_TIMEZONE. */
function zonedOffsetMinutes(date: Date): number {
  const map = partsAsMap(FULL_HOUR24, date);
  let hour = Number(map.get("hour") ?? 0);
  let day = Number(map.get("day") ?? 1);
  // en-US with hour12:false reports midnight as "24" on the current day.
  if (map.get("hour") === "24") {
    hour = 0;
    day += 1;
  }
  const asUtc = Date.UTC(
    Number(map.get("year") ?? 0),
    (Number(map.get("month") ?? 1) || 1) - 1,
    day,
    hour,
    Number(map.get("minute") ?? 0),
    Number(map.get("second") ?? 0)
  );
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** Interpret Y/M/D (and optional HH:mm:ss) civil time in BLOG_TIMEZONE as a UTC instant. */
export function zonedCivilToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, second);
  let offset = zonedOffsetMinutes(new Date(naive));
  let utc = naive - offset * 60000;
  const offset2 = zonedOffsetMinutes(new Date(utc));
  if (offset2 !== offset) utc += (offset2 - offset) * 60000;
  return new Date(utc);
}

export interface ZonedDay {
  year: number;
  month: number;
  day: number;
}

/** The civil year/month/day of an instant as seen in BLOG_TIMEZONE. */
export function zonedYearMonthDay(date: Date): ZonedDay {
  const map = partsAsMap(DATE_ONLY, date);
  return {
    year: Number(map.get("year") ?? 0),
    month: Number(map.get("month") ?? 1),
    day: Number(map.get("day") ?? 1),
  };
}

/**
 * Half-open [start, end) UTC instant range covering the civil year,
 * month, or day in BLOG_TIMEZONE. `month` and `day` are 1-based.
 */
export function zonedCivilRangeUtc(
  year: number,
  month?: number | null,
  day?: number | null
): { gte: Date; lt: Date } {
  const gte = month
    ? day
      ? zonedCivilToUtc(year, month, day)
      : zonedCivilToUtc(year, month, 1)
    : zonedCivilToUtc(year, 1, 1);

  const endNaive =
    month && day
      ? new Date(Date.UTC(year, month - 1, day + 1)) // Date.UTC normalizes month/year rollover.
      : month
        ? new Date(Date.UTC(year, month, 1))
        : new Date(Date.UTC(year + 1, 0, 1));
  const lt = zonedCivilToUtc(
    endNaive.getUTCFullYear(),
    endNaive.getUTCMonth() + 1,
    endNaive.getUTCDate()
  );
  return { gte, lt };
}

/**
 * Values from the DB can be:
 *   - "2026-09-17T14:30:00+00:00" (timestamptz, explicit offset)
 *   - "2026-09-17T14:30:00.000Z"  (timestamptz or our own writes)
 *   - "2026-09-17 14:30:00" or "2026-09-17T14:30:00" (naive — readonly as UTC)
 */
export function parseStoredTimestamp(
  ts: string | null | undefined
): Date | null {
  if (!ts) return null;
  try {
    const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/.test(ts.trim());
    const d = hasOffset
      ? new Date(ts)
      : new Date(`${ts.trim().replace(" ", "T")}Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** A Post's canonical stored value: a UTC instant as ISO 8601 with Z. */
export function nowUtcIso(): string {
  return new Date().toISOString();
}

/** Server/SSR fallback rendering in BLOG_TIMEZONE, e.g. "2026-09-17 2:30 PM". */
export function formatBlogTimestamp(date: Date): string {
  const map = partsAsMap(FULL_HOUR12, date);
  const year = map.get("year") ?? "";
  const month = map.get("month") ?? "";
  const day = map.get("day") ?? "";
  const hour = map.get("hour") ?? "12";
  const minute = map.get("minute") ?? "00";
  const period = map.get("dayPeriod") ?? "";
  return `${year}-${month}-${day} ${hour}:${minute}${period ? ` ${period}` : ""}`;
}