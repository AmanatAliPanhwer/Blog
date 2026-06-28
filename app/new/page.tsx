import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import NewPostClient from "./NewPostClient";

export default async function NewPostPage() {
  const session = await getSession();
  if (session !== "true") redirect("/login");

  return <NewPostClient />;
}
