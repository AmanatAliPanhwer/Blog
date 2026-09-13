import PostEditor from "@/components/PostEditor";
import { getSession } from "@/lib/auth";
import { DiagPanel, requestDiag } from "@/lib/diag";

export default async function NewPostPage() {
  const session = await getSession();
  if (session === "true") {
    return <PostEditor mode="new" backHref="/" />;
  }

  const diag = await requestDiag();

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-primary">
        new note
      </h1>
      <p>server session diagnostic — normally this page would redirect to /login</p>
      <DiagPanel diag={diag} />
    </div>
  );
}