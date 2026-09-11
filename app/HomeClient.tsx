"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, SearchX } from "lucide-react";
import type { Post } from "@/types";
import PostCard from "@/components/PostCard";
import FilterPanel from "@/components/FilterPanel";
import { consumeFeedBackFlag } from "@/components/HistoryNavFlag";

interface HomeClientProps {
  initialPosts: Post[];
  hasNext: boolean;
  years: string[];
  months: string[];
  days: string[];
  isAdmin: boolean;
  page: number;
}

interface FeedPage {
  page: number;
  posts: Post[];
}

interface FeedPos {
  y: number;
  focusId: number | null;
  focusOffset: number;
}

const feedPostElId = (id: number) => `feed-post-${id}`;

export default function HomeClient({
  initialPosts,
  hasNext,
  years,
  months,
  days,
  isAdmin,
  page: initialPage,
}: HomeClientProps) {
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const year = searchParams.get("year") ?? "";
  const month = searchParams.get("month") ?? "";
  const day = searchParams.get("day") ?? "";
  const urlPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const [pageSets, setPageSets] = useState<FeedPage[]>(() =>
    initialPage === urlPage ? [{ page: initialPage, posts: initialPosts }] : []
  );
  const [hasNextState, setHasNextState] = useState(hasNext);
  const [isLoading, setIsLoading] = useState(false);

  const pageElsRef = useRef<Record<number, HTMLElement | null>>({});
  const pageSetsRef = useRef(pageSets);
  pageSetsRef.current = pageSets;
  const urlPageRef = useRef(urlPage);
  urlPageRef.current = urlPage;
  const prevAnchorPropRef = useRef(initialPage);
  const lowPageRef = useRef(initialPage);
  const highPageRef = useRef(initialPage);
  const loadingTopRef = useRef(false);
  const loadingBottomRef = useRef(false);
  const shouldRestoreRef = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const anchorLoadLatchRef = useRef<number | null>(null);

  const feedPosKey = `feed:pos:${JSON.stringify([q, year, month, day])}`;

  // The feed renders the page you left off on (the URL's page anchor), with
  // the pages above and below fetched lazily as you scroll toward them.
  const contentReady = pageSets.some((p) => p.page === urlPage);

  // When the server props jump to a different page (e.g. Next restores the
  // home segment from cache on Back, then patches in the real page payload),
  // re-anchor the feed on whichever page the URL actually points at.
  useEffect(() => {
    if (prevAnchorPropRef.current === initialPage) return;
    prevAnchorPropRef.current = initialPage;
    if (lowPageRef.current <= initialPage && initialPage <= highPageRef.current) return;
    setPageSets([{ page: initialPage, posts: initialPosts }]);
    lowPageRef.current = initialPage;
    highPageRef.current = initialPage;
  }, [initialPage, initialPosts]);

  const buildQuery = useCallback(
    (page: number) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (year) params.set("year", year);
      if (month) params.set("month", month);
      if (day) params.set("day", day);
      if (page > 1) params.set("page", String(page));
      return params.toString();
    },
    [q, year, month, day]
  );

  // Fallback: if the URL points at a page the server payload never delivers
  // (Back restoring a stale cache entry), fetch the anchor page ourselves.
  useEffect(() => {
    if (anchorLoadLatchRef.current === urlPage) return;
    if (pageSets.some((p) => p.page === urlPage)) {
      anchorLoadLatchRef.current = urlPage;
      return;
    }
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/feed?${buildQuery(urlPage)}`);
        const data = await res.json();
        anchorLoadLatchRef.current = urlPage;
        setPageSets([{ page: urlPage, posts: data.posts ?? [] }]);
        lowPageRef.current = urlPage;
        highPageRef.current = urlPage;
      } catch {
        // leave it for the next URL/page change
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [urlPage, buildQuery, pageSets]);

  const findViewportPage = useCallback((y: number): number => {
    let best = urlPageRef.current;
    let bestDist = Infinity;
    for (const [pg, el] of Object.entries(pageElsRef.current)) {
      if (!el) continue;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const dist = Math.abs(y - (top + el.getBoundingClientRect().height / 2));
      if (dist < bestDist) {
        bestDist = dist;
        best = Number(pg);
      }
    }
    return best;
  }, []);

  const computeFocusPos = useCallback((): FeedPos => {
    const y = window.scrollY;
    const pageNum = findViewportPage(y);
    const posts = pageSetsRef.current.find((p) => p.page === pageNum)?.posts ?? [];
    let focusId: number | null = null;
    let focusOffset = 0;
    let lastAbs = -Infinity;
    for (const post of posts) {
      const el = document.getElementById(feedPostElId(post.id));
      if (!el) continue;
      const absTop = el.getBoundingClientRect().top + y;
      if (absTop <= y + 40 && absTop > lastAbs) {
        lastAbs = absTop;
        focusId = post.id;
        focusOffset = el.getBoundingClientRect().top;
      }
    }
    if (focusId === null && posts[0]) {
      const el = document.getElementById(feedPostElId(posts[0].id));
      if (el) {
        focusId = posts[0].id;
        focusOffset = el.getBoundingClientRect().top;
      }
    }
    return { y, focusId, focusOffset };
  }, [findViewportPage]);

  const saveScroll = useCallback(() => {
    if (scrollTimer.current) return;
    scrollTimer.current = setTimeout(() => {
      scrollTimer.current = null;
      try {
        sessionStorage.setItem(feedPosKey, JSON.stringify(computeFocusPos()));
      } catch {
        // ignore storage failures
      }
    }, 150);
  }, [feedPosKey, computeFocusPos]);

  // Write the full position (exact post + viewport offset) and keep the URL's
  // page param pointing at the page under the viewport when leaving the feed.
  const finalize = useCallback(() => {
    try {
      // DOM may already be detached when the feed unmounts, so keep the last
      // focus captured during scrolling instead of dropping it to null.
      const fresh = computeFocusPos();
      let prev: Pick<FeedPos, "focusId" | "focusOffset"> | null = null;
      try {
        const raw = sessionStorage.getItem(feedPosKey);
        if (raw) {
          const p = JSON.parse(raw);
          if (p && p.focusId != null) prev = { focusId: p.focusId, focusOffset: Number(p.focusOffset) || 0 };
        }
      } catch {
        // ignore parse failures
      }
      const merged: FeedPos = {
        y: fresh.y,
        focusId: fresh.focusId ?? prev?.focusId ?? null,
        focusOffset: fresh.focusId != null ? fresh.focusOffset : prev?.focusOffset ?? 0,
      };
      sessionStorage.setItem(feedPosKey, JSON.stringify(merged));
    } catch {
      // ignore storage failures
    }
    try {
      if (window.location.pathname !== "/") return;
      const pageNum = findViewportPage(window.scrollY);
      const u = new URL(window.location.href);
      if (pageNum > 1) u.searchParams.set("page", String(pageNum));
      else u.searchParams.delete("page");
      window.history.replaceState(null, "", u.pathname + u.search);
    } catch {
      // ignore history/storage failures
    }
  }, [computeFocusPos, findViewportPage, feedPosKey]);

  useEffect(() => {
    window.addEventListener("scroll", saveScroll, { passive: true });
    window.addEventListener("pagehide", finalize, { passive: true });
    return () => {
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current);
        scrollTimer.current = null;
      }
      window.removeEventListener("scroll", saveScroll);
      window.removeEventListener("pagehide", finalize);
      finalize();
    };
  }, [saveScroll, finalize]);

  const restoreScroll = useCallback(() => {
    let pos: FeedPos | null = null;
    try {
      const raw = sessionStorage.getItem(feedPosKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        pos =
          typeof parsed === "object"
            ? { y: Number(parsed.y) || 0, focusId: parsed.focusId ?? null, focusOffset: Number(parsed.focusOffset) || 0 }
            : { y: Number(raw) || 0, focusId: null, focusOffset: 0 };
      }
    } catch {
      // ignore storage/parse failures
    }
    if (!pos || pos.y <= 0) return;

    let target = pos.y;
    if (pos.focusId !== null) {
      const el = document.getElementById(feedPostElId(pos.focusId));
      if (el) {
        target = el.getBoundingClientRect().top + window.scrollY - pos.focusOffset;
      }
    }

    // Re-assert a few times: Next.js/browser scroll handling may fire after
    // our first attempt. Only act while still at the top, so a position the
    // router already restored (or a user who started scrolling) is left alone.
    const apply = () => {
      if (Math.abs(window.scrollY - target) < 2) return;
      if (window.scrollY !== 0) return;
      window.scrollTo(0, target);
    };
    apply();
    window.setTimeout(apply, 100);
    window.setTimeout(apply, 300);
    window.setTimeout(apply, 600);
  }, [feedPosKey]);

  // Restore only when arriving via a history traversal (Back/Forward).
  useEffect(() => {
    if (consumeFeedBackFlag()) {
      shouldRestoreRef.current = true;
    }
    const onPopState = () => {
      shouldRestoreRef.current = true;
      if (contentReady) restoreScroll();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [contentReady, restoreScroll]);

  // Once the anchor page is in place, apply the restored position.
  useEffect(() => {
    if (!contentReady) return;
    if (shouldRestoreRef.current) {
      shouldRestoreRef.current = false;
      restoreScroll();
    }
  }, [contentReady, restoreScroll]);

  // Load the page above the current lowest one, and compensate the scroll by
  // the added height so the reader does not jump.
  const loadUp = useCallback(async () => {
    const targetPage = lowPageRef.current - 1;
    if (targetPage < 1 || loadingTopRef.current) return;
    loadingTopRef.current = true;
    const anchorNode = pageElsRef.current[lowPageRef.current] ?? null;
    const anchorRect = anchorNode?.getBoundingClientRect().top ?? 0;
    try {
      const res = await fetch(`/api/feed?${buildQuery(targetPage)}`);
      const data = await res.json();
      const yAtCommit = window.scrollY;
      if (data.posts?.length) {
        setPageSets((prev) => {
          const ids = new Set(prev.flatMap((p) => p.posts).map((p) => p.id));
          return [{ page: targetPage, posts: data.posts.filter((p: Post) => !ids.has(p.id)) }, ...prev];
        });
        lowPageRef.current = targetPage;
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (anchorNode?.isConnected && yAtCommit >= 0) {
            const delta = anchorNode.getBoundingClientRect().top - anchorRect;
            if (Math.abs(delta) > 1) window.scrollTo(0, Math.max(0, yAtCommit + delta));
          }
        });
      });
    } catch (e) {
      console.error("Failed to load previous page:", e);
    } finally {
      loadingTopRef.current = false;
    }
  }, [buildQuery]);

  // Trigger the upward page load as soon as the user scrolls up (there is no
  // scroll room above the anchor page until those pages are prepended, so a
  // wheel/touch attempt at the very top and a top sentinel both count).
  useEffect(() => {
    if (!contentReady) return;
    let lastY = window.scrollY;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let interacted = false;
    const maybeLoadUp = () => {
      if (lowPageRef.current > 1 && !timer) {
        timer = setTimeout(() => {
          timer = null;
          loadUp();
        }, 120);
      }
    };
    const onScroll = () => {
      const y = window.scrollY;
      interacted = true;
      if (y < lastY - 2) maybeLoadUp();
      lastY = y;
    };
    const onWheel = (e: WheelEvent) => {
      interacted = true;
      if (e.deltaY < 0) maybeLoadUp();
      if (topSentinelRef.current && window.scrollY === 0) maybeLoadUp();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      if (timer) clearTimeout(timer);
    };
  }, [contentReady, loadUp]);

  useEffect(() => {
    if (!contentReady) return;
    const node = topSentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadUp();
      },
      { rootMargin: "300px 0px 0px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [contentReady, loadUp]);

  const loadMore = useCallback(async () => {
    if (loadingBottomRef.current || !hasNextState) return;
    loadingBottomRef.current = true;
    setIsLoading(true);
    const next = highPageRef.current + 1;
    try {
      const res = await fetch(`/api/feed?${buildQuery(next)}`);
      const data = await res.json();
      if (data.posts?.length) {
        setPageSets((prev) => {
          const ids = new Set(prev.flatMap((p) => p.posts).map((p) => p.id));
          return [...prev, { page: next, posts: data.posts.filter((p: Post) => !ids.has(p.id)) }];
        });
        highPageRef.current = next;
        const url = new URL(window.location.href);
        if (next > 1) url.searchParams.set("page", String(next));
        else url.searchParams.delete("page");
        window.history.replaceState(null, "", url.pathname + url.search);
      }
      setHasNextState(data.has_next);
    } catch (e) {
      console.error("Failed to load more posts:", e);
    } finally {
      loadingBottomRef.current = false;
      setIsLoading(false);
    }
  }, [buildQuery, hasNextState]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !contentReady) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, contentReady]);

  // Show success messages surfaced via ?flash= from create/edit/delete flows.
  useEffect(() => {
    const msg = searchParams.get("flash");
    if (msg) {
      toast.success(msg);
      const url = new URL(window.location.href);
      url.searchParams.delete("flash");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const posts = pageSets.flatMap((p) => p.posts);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-5xl font-bold tracking-tight text-primary">
          {q ? (
            <>
              search: <span className="text-primary">“{q}”</span>
            </>
          ) : (
            "My Blog"
          )}
        </h1>
        <FilterPanel years={years} months={months} days={days} />
      </div>

      {!contentReady ? (
        <div className="flex justify-center py-16" aria-busy="true">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-muted-foreground">
          <SearchX className="size-8" />
          <p className="text-sm">No posts match.</p>
          {q || year || month || day ? (
            <a href="/" className="text-sm text-primary underline-offset-4 hover:underline">
              Clear filters
            </a>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div ref={topSentinelRef} className="h-px" aria-hidden />
          {pageSets.map((p) => (
            <section
              key={p.page}
              ref={(el) => {
                pageElsRef.current[p.page] = el;
              }}
              className="space-y-4"
            >
              {p.posts.map((post) => (
                <div key={post.id} id={feedPostElId(post.id)}>
                  <PostCard post={post} isAdmin={isAdmin} />
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-px" aria-hidden />

      {isLoading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : null}

      {!hasNextState && posts.length > 0 ? (
        <p className="border-t border-border/60 pt-4 text-center font-mono text-xs text-muted-foreground">
          — end of journal —
        </p>
      ) : null}
    </div>
  );
}