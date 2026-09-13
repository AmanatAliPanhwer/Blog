import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PostEditor from "@/components/PostEditor";

export default async function NewPostPage() {
  const session = await getSession();
  if (session !== "true") redirect("/login");

  return <PostEditor mode="new" backHref="/" />;
}