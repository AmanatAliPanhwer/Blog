"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const form = e.currentTarget;
    const data = {
      username: (form.elements.namedItem("username") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
      remember: (form.elements.namedItem("remember") as HTMLInputElement).checked,
    };

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Welcome back");
      router.push("/");
      router.refresh();
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Invalid credentials");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col items-stretch gap-4 rounded-[10px] border border-[#fffaff]/30 bg-card p-6 shadow-[0_4px_8px_rgba(0,255,0,0.4)]">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-background text-primary">
          <Lock className="size-5" />
        </span>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-primary">
          Admin Login
        </h1>
        <p className="font-sans text-sm text-muted-foreground">restricted area</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" type="text" required autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="remember"
            className="size-4 accent-primary"
          />
          Remember me
        </label>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}