import { NextResponse } from "next/server";
import { getFilteredPosts } from "@/lib/posts";

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
  const posts = await getFilteredPosts({});

  const urls = [`<url><loc>${origin}/</loc></url>`];
  for (const p of posts) {
    urls.push(
      `<url><loc>${origin}/post/${p.id}</loc>${
        p.timestamp ? `<lastmod>${new Date(p.timestamp).toISOString()}</lastmod>` : ""
      }</url>`
    );
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls.join(""),
    "</urlset>",
  ].join("");

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}