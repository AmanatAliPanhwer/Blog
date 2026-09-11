import type { Metadata } from "next";
import "./globals.css";
import { getSession } from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";
import HistoryNavFlag from "@/components/HistoryNavFlag";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "My Blog",
    template: "%s · My Blog",
  },
  description: "A personal work journal.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en">
      <body className="min-h-dvh">
        <HistoryNavFlag />
        <SiteHeader isAdmin={session === "true"} />
        <main className="mx-auto w-full max-w-3xl px-4 pt-10 pb-16">{children}</main>
        <Toaster position="top-right" theme="dark" />
      </body>
    </html>
  );
}