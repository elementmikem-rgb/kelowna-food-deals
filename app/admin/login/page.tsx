"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Login failed");
      }
      router.push("/admin/submissions");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 w-full max-w-xs rounded-xl border border-border bg-surface p-6"
      >
        <h1 className="font-display text-xl text-foreground">Admin</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-stale">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-accent text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
