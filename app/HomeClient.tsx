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

  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [hasNextState, setHasNextState] = useState(hasNext);
  const [isLoading, setIsLoading] = useState(false);
  const [contentReady, setContentReady] = useState(initialPage <= 1);

  const pageRef = useRef(initialPage);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const shouldRestoreRef = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollYRef = useRef(0);

  const feedPosKey = `feed:pos:${JSON.stringify([q, year, month, day])}`;

  // Capture the Y at scroll-event time and write it debounced, so an
  // unwritten position can never be read as the (new page's) scrollY later.
  const saveScroll = useCallback(() => {
    lastScrollYRef.current = window.scrollY;
    if (scrollTimer.current) return;
    scrollTimer.current = setTimeout(() => {
      scrollTimer.current = null;
      try {
        sessionStorage.setItem(feedPosKey, String(lastScrollYRef.current || 0));
      } catch {
        // ignore storage failures
      }
    }, 150);
  }, [feedPosKey]);

  const restoreScroll = useCallback(() => {
    let y: number | null = null;
    try {
      const raw = sessionStorage.getItem(feedPosKey);
      y = raw === null ? null : Number(raw);
    } catch {
      // ignore storage failures
    }
    if (y === null || !Number.isFinite(y) || y <= 0) return;

    // Re-assert a few times: Next.js/browser scroll handling may fire after
    // our first attempt. Only act while still at the top, so a position the
    // router already restored (or a user who started scrolling) is left alone.
    const apply = () => {
      if (window.scrollY === y) return;
      if (window.scrollY !== 0) return;
      window.scrollTo(0, y);
    };
    apply();
    window.setTimeout(apply, 100);
    window.setTimeout(apply, 300);
    window.setTimeout(apply, 600);
  }, [feedPosKey]);

  // Persist the Feed Position while scrolling and on the way out.
  useEffect(() => {
    const finalize = () => {
      try {
        sessionStorage.setItem(feedPosKey, String(window.scrollY || 0));
      } catch {
        // ignore storage failures
      }
    };
    window.addEventListener("scroll", saveScroll, { passive: true });
    window.addEventListener("pagehide", finalize, { passive: true });
    return () => {
      // Cancel any pending debounced write: it would fire after Next.js has
      // scrolled the navigated-to page to top and clobber the position with 0.
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current);
        scrollTimer.current = null;
      }
      window.removeEventListener("scroll", saveScroll);
      window.removeEventListener("pagehide", finalize);
      finalize();
    };
  }, [saveScroll, feedPosKey]);

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

  // Once the content (including prefetched prefix pages) is in place, apply
  // the restored Feed Position for a traversal arrival.
  useEffect(() => {
    if (!contentReady) return;
    if (shouldRestoreRef.current) {
      shouldRestoreRef.current = false;
      restoreScroll();
    }
  }, [contentReady, restoreScroll]);

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

  // Refresh with ?page=N should restore the accumulated scroll position,
  // so fetch the preceding pages and prepend them.
  useEffect(() => {
    if (initialPage <= 1) return;
    let cancelled = false;
    (async () => {
      const prefix: Post[] = [];
      for (let p = 1; p < initialPage; p++) {
        const res = await fetch(`/api/feed?${buildQuery(p)}`);
        const data = await res.json();
        prefix.push(...(data.posts ?? []));
        if (cancelled) break;
      }
      if (cancelled) return;
      setPosts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prefix.filter((p) => !ids.has(p.id)), ...prev];
      });
      setContentReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasNextState) return;
    loadingRef.current = true;
    setIsLoading(true);
    const next = pageRef.current + 1;
    try {
      const res = await fetch(`/api/feed?${buildQuery(next)}`);
      const data = await res.json();
      if (data.posts?.length) {
        setPosts((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          return [...prev, ...data.posts.filter((p: Post) => !ids.has(p.id))];
        });
        pageRef.current = next;
        const url = new URL(window.location.href);
        if (next > 1) url.searchParams.set("page", String(next));
        else url.searchParams.delete("page");
        window.history.replaceState(null, "", url.pathname + url.search);
      }
      setHasNextState(data.has_next);
    } catch (e) {
      console.error("Failed to load more posts:", e);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [buildQuery, hasNextState]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

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

      {posts.length === 0 && !isLoading ? (
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
          {posts.map((post) => (
            <PostCard key={post.id} post={post} isAdmin={isAdmin} />
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