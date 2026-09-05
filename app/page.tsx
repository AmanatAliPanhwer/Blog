import { Suspense } from "react";
import { getFeed, getFilterOptions } from "@/lib/posts";
import { getSession } from "@/lib/auth";
import HomeClient from "./HomeClient";

interface Props {
  searchParams: Promise<{
    q?: string;
    year?: string;
    month?: string;
    day?: string;
    page?: string;
    flash?: string;
  }>;
}

export default async function HomePage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const session = await getSession();
  const isAdmin = session === "true";

  const { posts, has_next } = await getFeed({
    page,
    q: sp.q,
    year: sp.year,
    month: sp.month,
    day: sp.day,
  });
  const { years, months, days } = await getFilterOptions();

  const filterKey = `${sp.q ?? ""}|${sp.year ?? ""}|${sp.month ?? ""}|${sp.day ?? ""}`;

  return (
    <Suspense>
      <HomeClient
        key={filterKey}
        initialPosts={posts}
        hasNext={has_next}
        years={years}
        months={months}
        days={days}
        isAdmin={isAdmin}
        page={page}
      />
    </Suspense>
  );
}