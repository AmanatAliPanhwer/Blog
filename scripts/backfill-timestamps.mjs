#!/usr/bin/env node
/**
 * One-time backfill for posts.timestamp (issue #44).
 *
 * Existing posts were timestamped with whatever the writing server's local
 * timezone was and stored without a timezone marker. Every value is a *civic
 * time*; the question is which instant it denotes.
 *
 * Usage:
 *   node scripts/backfill-timestamps.mjs                 # dry run (no writes)
 *   node scripts/backfill-timestamps.mjs --apply         # write the changes
 *   node scripts/backfill-timestamps.mjs --adjust=5 --apply
 *   node scripts/backfill-timestamps.mjs --from=Asia/Karachi --apply
 *
 * Modes:
 *   (default)  normalize — keep the existing civil time, re-mark it as the UTC
 *              instant it already represents in dating. Safe for posts written
 *              by a UTC-hosted deployment (the common case for prod data).
 *   --from=    reinterpret — treat each stored civil time as local time in the
 *              given IANA zone and convert it to UTC. Use this when posts were
 *              authored from a machine in a non-UTC timezone; it shifts every
 *              row by that zone's offset.
 *   --adjust=  shift every stored instant by a fixed signed number of hours
 *              (e.g. --adjust=5 moves all Post times 5 hours later). Use this
 *              when the stored instants are known to be a constant offset off
 *              (for this blog, confirmed ~5h too early). Mutually exclusive
 *              with --from.
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (fallback SUPABASE_ANON_KEY)
 * from .env.local / .env. Requires the @supabase/supabase-js dependency.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "..");

function loadEnv() {
  const envVars = {};
  const files = [".env", ".env.local"]; // .env.local wins
  for (const file of files) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    for (const rawLine of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      envVars[key] = value;
    }
  }
  return envVars;
}

function parseArgs(argv) {
  const args = { apply: false, from: null, adjust: null };
  for (const a of argv) {
    if (a === "--apply") args.apply = true;
    else if (a.startsWith("--from=")) args.from = a.slice("--from=".length) || null;
    else if (a === "--from") args.from = null;
    else if (/^--adjust=/.test(a)) args.adjust = Number(a.slice("--adjust=".length));
    else if (a === "-h" || a === "--help") args.help = true;
  }
  return args;
}

const CIVIL_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/;

function zonedOffsetMinutes(tz, date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const map = new Map(
    fmt
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value])
  );
  let hour = Number(map.get("hour") ?? 0);
  let day = Number(map.get("day") ?? 1);
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

function civilAsUtcIso(y, m, d, hh, mm, ss) {
  return new Date(Date.UTC(y, m - 1, d, hh, mm, ss)).toISOString();
}

function civilInTzAsUtcIso(tz, y, m, d, hh, mm, ss) {
  const naive = Date.UTC(y, m - 1, d, hh, mm, ss);
  let offset = zonedOffsetMinutes(tz, new Date(naive));
  let utc = naive - offset * 60000;
  const offset2 = zonedOffsetMinutes(tz, new Date(utc));
  if (offset2 !== offset) utc += (offset2 - offset) * 60000;
  return new Date(utc).toISOString();
}

function kt(iso) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage: node scripts/backfill-timestamps.mjs [--apply] [--from=<IANA>]`);
    console.log(`  (default)  normalize stored civics as UTC  (no shift)`);
    console.log(`  --from=    reinterpret stored civics as local time in <IANA>, shift to UTC`);
    console.log(`  --apply    write changes; without it, only a plan is printed`);
    return;
  }

  const env = loadEnv();
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env or .env.local");
    process.exit(1);
  }

  const from = args.from;
  if (from && args.adjust != null) {
    console.error("--from and --adjust are mutually exclusive");
    process.exit(1);
  }
  console.log(
    `Mode:   ${
      args.adjust != null
        ? `adjust (${args.adjust >= 0 ? "+" : ""}${args.adjust}h)`
        : from
          ? `reinterpret (${from})`
          : "normalize (no shift)"
    }`
  );
  console.log(`Apply:  ${args.apply ? "YES — writes to the database" : "dry run (no writes)"}\n`);

  const client = createClient(url, key);
  const { data, error } = await client
    .from("posts")
    .select("id, timestamp")
    .order("timestamp", { ascending: false });

  if (error) {
    console.error("Failed to read posts:", error.message);
    process.exit(1);
  }
  if (!data || data.length === 0) {
    console.log("No posts to process.");
    return;
  }

  const changes = [];
  for (const row of data) {
    const ts = String(row.timestamp ?? "");
    const m = ts.match(CIVIL_RE);
    if (!m) {
      console.warn(`  skip id=${row.id}: unparseable timestamp "${ts}"`);
      continue;
    }
    const [, y, mo, d, hh, mm, ss] = m.map(Number);
    const proposed = args.adjust != null
      ? new Date(Date.UTC(y, mo - 1, d, hh, mm, ss) + args.adjust * 3600000).toISOString()
      : from
        ? civilInTzAsUtcIso(from, y, mo, d, hh, mm, ss)
        : civilAsUtcIso(y, mo, d, hh, mm, ss);

    // Compare the civil time that would be stored (DB datetime columns round
    // trip through the UTC session as civil strings), so identical civics are
    // skipped rather than rewritten pointlessly.
    const currentCivil = ts.slice(0, 19).replace("T", " ");
    const proposedCivil = proposed.slice(0, 19).replace("T", " ");
    if (currentCivil === proposedCivil) continue;

    changes.push({ id: row.id, old: ts, new: proposed });
  }

  console.log(`Processed ${data.length} post(s), ${changes.length} would change.\n`);
  for (const c of changes.slice(0, 20)) {
    console.log(`  #${c.id}  ${c.old}  (shows ${kt(c.old)})  ->  ${c.new}  (shows ${kt(c.new)})`);
  }
  if (changes.length > 20) console.log(`  ... and ${changes.length - 20} more`);

  if (changes.length === 0) {
    console.log("\nNo changes needed — every stored civil time already matches its UTC value.");
    return;
  }

  if (!args.apply) {
    console.log("\nRun with --apply to write these changes.");
    return;
  }

  let updated = 0;
  for (const c of changes) {
    const { error: updateError } = await client
      .from("posts")
      .update({ timestamp: c.new })
      .eq("id", c.id);
    if (updateError) {
      console.error(`  FAILED #${c.id}: ${updateError.message}`);
    } else {
      updated++;
    }
  }
  console.log(`\nUpdated ${updated}/${changes.length} post(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});