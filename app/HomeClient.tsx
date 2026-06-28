"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Post } from "@/types";
import PostCard from "@/components/PostCard";
import FilterPanel from "@/components/FilterPanel";
import Toast from "@/components/Toast";

interface HomeClientProps {
  initialPosts: Post[];
  hasNext: boolean;
  years: string[];
  months: string[];
  days: string[];
  isAdmin: boolean;
}

export default function HomeClient({ initialPosts, hasNext: initialHasNext, years, months, days, isAdmin }: HomeClientProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [hasNext, setHasNext] = useState(initialHasNext);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" | "info" } | null>(null);

  const pageRef = useRef(2);
  const loadingRef = useRef(false);
  const hasNextRef = useRef(initialHasNext);

  const handleFilter = (filteredPosts: Post[]) => {
    setPosts(filteredPosts);
    setHasNext(false);
    hasNextRef.current = false;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const msg = params.get("flash");
    if (msg) {
      setToast({ message: msg, type: "success" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasNextRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/posts?page=${pageRef.current}`);
      const data = await res.json();
      if (data.posts?.length) {
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPosts = data.posts.filter((p: Post) => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
        pageRef.current += 1;
      }
      setHasNext(data.has_next);
      hasNextRef.current = data.has_next;
    } catch (e) {
      console.error("Failed to load more posts:", e);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
        loadMore();
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [loadMore]);

  return (
    <div className="container Post-Container" id="posts-container">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h1 className="title" style={{ fontSize: "400%" }}>My Blog</h1>
      {isAdmin ? (
        <>
          <a href="/new">New Post</a>
          <a href="/logout" id="logoutButton">Logout</a>
        </>
      ) : (
        <a href="/login" id="loginButton">Login</a>
      )}

      <FilterPanel years={years} months={months} days={days} onFilter={handleFilter} />

      <hr />

      {posts.map((post) => (
        <PostCard key={post.id} post={post} isAdmin={isAdmin} />
      ))}

      <div id="loading-indicator" style={{ display: isLoading ? "flex" : "none", alignItems: "center", justifyContent: "center" }}>
        <div className="loader"></div>
      </div>
      <div id="end-of-posts-message" style={{ display: hasNext ? "none" : "block" }}>
        <p>You&apos;ve reached the end.</p>
      </div>
    </div>
  );
}
