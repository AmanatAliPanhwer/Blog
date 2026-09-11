"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, SearchX } from "lucide-react";
import type { Post } from "@/types";
import PostCard from "@/components/PostCard";
import FilterPanel from "@/components/FilterPanel";
import { cacheFeedPos, consumeFeedBackFlag, getCachedFeedPos } from "@/components/HistoryNavFlag";

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
  /** Feed page that contained the focused Post at capture time. */
  page?: number;
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
  const lastFocusRef = useRef<FeedPos | null>(null);
  const restoreRafRef = useRef<number | null>(null);
  const restoreStopRef = useRef<(() => void) | null>(null);
  const restoringRef = useRef(false);
  const settleRafRef = useRef<number | null>(null);
  const prependSettleRef = useRef<(() => void) | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const anchorLoadLatchRef = useRef<number | null>(null);
  const loadUpRef = useRef<() => void>(() => {});

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
        const feedId = buildQuery(urlPage);
        const res = await fetch(`/api/feed?${feedId}`);
        const data = await res.json();
        // Drop responses that no longer belong to the current feed: the
        // filters or the page may have changed while the request was in
        // flight, and installing an obsolete anchor would corrupt the feed.
        if (feedId !== buildQuery(urlPage)) return;
        anchorLoadLatchRef.current = urlPage;
        setPageSets([{ page: urlPage, posts: data.posts ?? [] }]);
        setHasNextState(data.has_next);
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

  // While scrolling, keep the in-memory position fresh (the click snapshot and
  // any later scroll restores read from it). Storage is written throttled so a
  // manual reload still restores, without hammering sessionStorage per event.
  const saveScroll = useCallback(() => {
    if (restoringRef.current) return;
    lastFocusRef.current = computeFocusPos();
    cacheFeedPos(feedPosKey, lastFocusRef.current);
    if (!scrollTimer.current) {
      scrollTimer.current = setTimeout(() => {
        scrollTimer.current = null;
        try {
          sessionStorage.setItem(feedPosKey, JSON.stringify(lastFocusRef.current));
        } catch {
          // ignore storage failures
        }
      }, 250);
    }
  }, [computeFocusPos, feedPosKey]);

  // The position must reflect exactly what the reader sees when they click a
  // Post. Scroll events capture an older frame (images above keep loading and
  // shifting the layout), so the feed snapshots the position on any click via
  // a capture-phase handler that runs before the Post Link navigates.
  const snapshotPos = useCallback(() => {
    if (restoringRef.current) return;
    lastFocusRef.current = computeFocusPos();
    const pos = lastFocusRef.current;
    // Record the page that the focused Post sits on and patch the URL while
    // the DOM is still alive. It can't be done at unmount: by the time the
    // feed tears down, the browser has already navigated to the Post route,
    // so the back URL would keep a stale (or absent) page param.
    if (pos.focusId != null) {
      const found = pageSetsRef.current.find((p) => p.posts.some((x) => x.id === pos.focusId));
      if (found) pos.page = found.page;
      try {
        const u = new URL(window.location.href);
        if (pos.page != null && pos.page > 1) u.searchParams.set("page", String(pos.page));
        else u.searchParams.delete("page");
        if (u.pathname + u.search !== window.location.pathname + window.location.search) {
          window.history.replaceState(null, "", u.pathname + u.search);
        }
      } catch {
        // ignore history failures
      }
    }
    cacheFeedPos(feedPosKey, pos);
    try {
      sessionStorage.setItem(feedPosKey, JSON.stringify(pos));
    } catch {
      // ignore storage failures
    }
  }, [feedPosKey, computeFocusPos]);

  // Track scroll so the in-memory position always reflects what the reader is
  // looking at; the click snapshot re-captures it at the moment of navigation.
  useEffect(() => {
    window.addEventListener("scroll", saveScroll, { passive: true });
    return () => {
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current);
        scrollTimer.current = null;
      }
      window.removeEventListener("scroll", saveScroll);
    };
  }, [saveScroll]);

  const restoreScroll = useCallback(() => {
    // Tear down any in-flight restoration (loop + input listeners) and start
    // fresh, so restarts can never leak listeners or cancel a newer loop.
    restoreStopRef.current?.();
    restoringRef.current = true;

    // Prefer the in-memory position: it is always the freshest capture (the
    // click snapshot, not a scroll event), and a remount can clobber
    // sessionStorage with a detached-DOM zero right after mount.
    let pos: FeedPos | null = getCachedFeedPos(feedPosKey) ?? null;
    if (!pos) {
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
    }
    if (!pos || pos.y <= 0) {
      restoringRef.current = false;
      restoreStopRef.current = null;
      return;
    }

    // Only restore while still on the Feed with the same filter set; a Post
    // navigation away must never scroll the destination page.
    const stillForThisFeed = () => {
      if (window.location.pathname !== "/") return false;
      const p = new URLSearchParams(window.location.search);
      return (
        (p.get("q") ?? "") === q &&
        (p.get("year") ?? "") === year &&
        (p.get("month") ?? "") === month &&
        (p.get("day") ?? "") === day
      );
    };

    const start = Date.now();
    let lastRealignAt = start;
    let lastLoadUpAt = start;
    let stopped = false;

    const stop = () => {
      if (stopped) return;
      stopped = true;
      restoringRef.current = false;
      if (restoreStopRef.current === stop) restoreStopRef.current = null;
      if (restoreRafRef.current !== null) {
        cancelAnimationFrame(restoreRafRef.current);
        restoreRafRef.current = null;
      }
      for (const type of ["wheel", "touchstart", "pointerdown", "keydown"] as const) {
        window.removeEventListener(type, onUserInput);
      }
    };

    // Keep nudging the viewport every frame until the left-off post sits at
    // exactly the offset it had when we left. This absorbs images and lazy
    // pages growing after the anchor page renders (the doc's height is not
    // final on the first frame), so the landing is never "random".
    const frame = () => {
      if (stopped) return;
      const now = Date.now();
      if (now - start > 8000) {
        stop();
        return;
      }
      if (!stillForThisFeed()) {
        stop();
        return;
      }
      const el = pos.focusId !== null ? document.getElementById(feedPostElId(pos.focusId)) : null;
      if (el) {
        const offset = el.getBoundingClientRect().top;
        if (Math.abs(offset - pos.focusOffset) <= 2) {
          // Keep pinning until the layout has been quiet for a while: images
          // and prepended pages keep shifting the post for a few seconds, so
          // stopping after a couple of stable frames lets it drift again.
          if (now - lastRealignAt > 400) {
            stop();
            return;
          }
        } else {
          lastRealignAt = now;
          const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
          const target = window.scrollY + (offset - pos.focusOffset);
          if (target > maxScroll && lowPageRef.current > 1 && now - lastLoadUpAt > 250) {
            // The saved post can't reach its offset because the pages ABOVE
            // the anchor page are not rendered yet (the doc is too short).
            // Fetch the next page up instead of bottom-clamping; the loop
            // keeps chasing as the doc grows, so the pin stays exact.
            lastLoadUpAt = now;
            loadUpRef.current();
          } else {
            window.scrollTo(0, Math.max(0, Math.min(target, maxScroll)));
          }
        }
      } else if (now - start > 2500) {
        // The focus post never appeared (e.g. anchor could not load): fall
        // back to an absolute scroll so the reader is near their old depth.
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo(0, Math.max(0, Math.min(pos.y, maxScroll)));
        stop();
        return;
      }
      restoreRafRef.current = requestAnimationFrame(frame);
    };

    // Any deliberate user input ends the restore so we never fight them.
    const onUserInput = () => stop();
    window.addEventListener("wheel", onUserInput, { passive: true });
    window.addEventListener("touchstart", onUserInput, { passive: true });
    window.addEventListener("pointerdown", onUserInput, { passive: true });
    window.addEventListener("keydown", onUserInput);

    restoreStopRef.current = stop;
    restoreRafRef.current = requestAnimationFrame(frame);
  }, [feedPosKey, q, year, month, day]);

  // Restore only when arriving via a history traversal (Back/Forward).
  useEffect(() => {
    if (consumeFeedBackFlag()) {
      shouldRestoreRef.current = true;
      restoringRef.current = true;
      // Release the save-block if the restore never starts (anchor missing).
      window.setTimeout(() => {
        if (restoringRef.current && !restoreStopRef.current) restoringRef.current = false;
      }, 4000);
    }
    const onPopState = () => {
      shouldRestoreRef.current = true;
      restoringRef.current = true;
      window.setTimeout(() => {
        if (restoringRef.current && !restoreStopRef.current) restoringRef.current = false;
      }, 4000);
      if (contentReady) restoreScroll();
      // HistoryNavFlag writes the flag synchronously during this dispatch;
      // clear it (after all synchronous listeners) so a later ordinary Home
      // mount cannot restore a stale position.
      window.setTimeout(() => {
        consumeFeedBackFlag();
      }, 0);
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      restoreStopRef.current?.();
      prependSettleRef.current?.();
    };
  }, [contentReady, restoreScroll]);

  // Once the anchor page is in place, apply the restored position.
  useEffect(() => {
    if (!contentReady) return;
    if (shouldRestoreRef.current) {
      shouldRestoreRef.current = false;
      restoreScroll();
    }
  }, [contentReady, restoreScroll]);

  // After prepending a page, keep the previously-top page pinned at the exact
  // absolute position it had before the insert. The new page's DOM mounts
  // before its images load, so its height isn't final; this loop re-corrects
  // as those images grow, so the reader below never drifts.
  const startAnchorSettle = useCallback((el: HTMLElement, initialAbsTop: number) => {
    prependSettleRef.current?.();
    const start = Date.now();
    let stableFrames = 0;
    let stopped = false;

    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (prependSettleRef.current === stop) prependSettleRef.current = null;
      if (settleRafRef.current !== null) {
        cancelAnimationFrame(settleRafRef.current);
        settleRafRef.current = null;
      }
      for (const type of ["wheel", "touchstart", "pointerdown", "keydown"] as const) {
        window.removeEventListener(type, onUserInput);
      }
    };

    const frame = () => {
      if (stopped) return;
      if (!el.isConnected) {
        stop();
        return;
      }
      const absTop = el.getBoundingClientRect().top + window.scrollY;
      const delta = absTop - initialAbsTop;
      if (Math.abs(delta) <= 1) {
        if (++stableFrames >= 8) {
          stop();
          return;
        }
      } else {
        stableFrames = 0;
        window.scrollTo(0, Math.max(0, window.scrollY + delta));
      }
      if (Date.now() - start > 6000) {
        stop();
        return;
      }
      settleRafRef.current = requestAnimationFrame(frame);
    };

    // Stop compensating as soon as the user starts scrolling themselves.
    const onUserInput = () => stop();
    window.addEventListener("wheel", onUserInput, { passive: true });
    window.addEventListener("touchstart", onUserInput, { passive: true });
    window.addEventListener("pointerdown", onUserInput, { passive: true });
    window.addEventListener("keydown", onUserInput);

    prependSettleRef.current = stop;
    settleRafRef.current = requestAnimationFrame(frame);
  }, []);

  // Load the page above the current lowest one, and compensate the scroll by
  // the added height so the reader does not jump.
  const loadUp = useCallback(async () => {
    const targetPage = lowPageRef.current - 1;
    if (targetPage < 1 || loadingTopRef.current) return;
    loadingTopRef.current = true;
    const anchorNode = pageElsRef.current[lowPageRef.current] ?? null;
    const anchorAbs = anchorNode ? anchorNode.getBoundingClientRect().top + window.scrollY : 0;
    try {
      const res = await fetch(`/api/feed?${buildQuery(targetPage)}`);
      const data = await res.json();
      if (data.posts?.length) {
        setPageSets((prev) => {
          const ids = new Set(prev.flatMap((p) => p.posts).map((p) => p.id));
          return [{ page: targetPage, posts: data.posts.filter((p: Post) => !ids.has(p.id)) }, ...prev];
        });
        lowPageRef.current = targetPage;
      }
      if (anchorNode && !restoringRef.current) {
        // Start correcting once the new nodes are committed; keep correcting
        // while their images lazy-load (the page height is far from final).
        // Skipped while a scroll restore is in flight: the restore loop is
        // already chasing the focus post, so settle would fight it.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (anchorNode?.isConnected) startAnchorSettle(anchorNode, anchorAbs);
          });
        });
      }
    } catch (e) {
      console.error("Failed to load previous page:", e);
    } finally {
      loadingTopRef.current = false;
    }
  }, [buildQuery, startAnchorSettle]);

  loadUpRef.current = loadUp;

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
    <div className="space-y-6" onClickCapture={snapshotPos}>
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