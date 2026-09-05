import { NextResponse } from "next/server";
import { getFeed } from "@/lib/posts";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function originOf(req: Request): string {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

export async function GET(req: Request) {
  const origin = originOf(req);
  const { posts } = await getFeed({ page: 1 });

  const items = posts
    .map((p) => {
      const link = `${origin}/post/${p.id}`;
      const pubDate = p.timestamp
        ? new Date(p.timestamp).toUTCString()
        : "";
      return [
        "<item>",
        `<title>${escapeXml(p.title || `Note #${p.id}`)}</title>`,
        `<link>${link}</link>`,
        `<guid>${link}</guid>`,
        pubDate ? `<pubDate>${pubDate}</pubDate>` : "",
        `<description><![CDATA[${p.content_safe || p.content}]]></description>`,
        "</item>",
      ].join("");
    })
    .join("");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "<channel>",
    "<title>My Blog</title>",
    `<link>${origin}</link>`,
    `<atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${origin}/rss.xml" rel="self" type="application/rss+xml"/>`,
    "<description>Personal work journal</description>",
    items,
    "</channel>",
    "</rss>",
  ].join("");

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}