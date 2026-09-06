"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
        className="pin-card flex flex-col gap-4 w-full max-w-xs rounded-2xl border border-border bg-surface p-7"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <Image
            src="/icons/icon-192.png"
            alt="Kelowna Food Deals logo"
            width={48}
            height={48}
            className="rounded-full"
          />
          <div>
            <p className="font-display text-lg text-foreground leading-tight">Kelowna Food Deals</p>
            <p className="text-xs uppercase tracking-wide text-muted-2">Admin</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="admin-password" className="sr-only">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-dim/40 focus:border-accent-dim"
          />
        </div>

        {error && (
          <p className="text-sm text-stale bg-accent-soft/25 border border-accent-soft rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || password.length === 0}
          className="press-pill rounded-full bg-accent text-background px-4 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
