"use client";

import { useState } from "react";
import { OwnerLoginRequestForm } from "@/components/OwnerLoginRequestForm";
import { OwnerPasswordLoginForm } from "@/components/OwnerPasswordLoginForm";

// Magic link stays the default tab -- it's the only option that works for every owner
// (password is opt-in, set later from the dashboard), so it shouldn't require an extra
// click to reach for the common case.
export function OwnerLoginOptions() {
  const [mode, setMode] = useState<"link" | "password">("link");

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm">
      <div className="flex gap-1 rounded-full border border-border p-0.5 text-xs">
        <button
          onClick={() => setMode("link")}
          className={`press-pill rounded-full px-3 py-1 ${mode === "link" ? "bg-accent text-background" : "text-muted"}`}
        >
          Email me a link
        </button>
        <button
          onClick={() => setMode("password")}
          className={`press-pill rounded-full px-3 py-1 ${mode === "password" ? "bg-accent text-background" : "text-muted"}`}
        >
          Password
        </button>
      </div>
      {mode === "link" ? (
        <>
          <p className="text-sm text-muted max-w-sm">
            Enter the email your listing is under and we&apos;ll send you a login link.
          </p>
          <OwnerLoginRequestForm />
        </>
      ) : (
        <OwnerPasswordLoginForm />
      )}
    </div>
  );
}
