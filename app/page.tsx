import { getPosts, getFilterOptions } from "@/lib/posts";
import { getSession } from "@/lib/auth";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  const session = await getSession();
  const isAdmin = session === "true";
  const { posts, has_next } = await getPosts(1);
  const { years, months, days } = await getFilterOptions();

  return (
    <HomeClient
      initialPosts={posts}
      hasNext={has_next}
      years={years}
      months={months}
      days={days}
      isAdmin={isAdmin}
    />
  );
}
