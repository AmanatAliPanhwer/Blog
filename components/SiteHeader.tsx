"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, PenLine, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SiteHeader({ isAdmin }: { isAdmin: boolean }) {
  const [q, setQ] = useState("");
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/?q=${encodeURIComponent(query)}` : "/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-[#0f0f0f]/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className="shrink-0 font-heading text-3xl font-bold text-primary"
        >
          My Blog
        </Link>

        <form
          onSubmit={handleSubmit}
          className="relative hidden min-w-0 flex-1 justify-end sm:flex"
          role="search"
        >
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search posts…"
            aria-label="Search posts"
            className="h-9 w-64 bg-[#101010] pl-8"
          />
        </form>

        <div className="flex shrink-0 items-center gap-1.5">
          {isAdmin ? (
            <>
              <Button asChild variant="link" size="sm">
                <Link href="/new">
                  <PenLine />
                  New Post
                </Link>
              </Button>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={async () => {
                  await fetch("/logout", { method: "POST" });
                  router.push("/");
                  router.refresh();
                }}
              >
                <LogOut />
                Logout
              </Button>
            </>
          ) : (
            <Button asChild variant="link" size="sm">
              <Link href="/login">
                <LogIn />
                Login
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}