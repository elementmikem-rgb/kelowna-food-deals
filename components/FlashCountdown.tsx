"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "ending…";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  const seconds = Math.floor((ms % 60000) / 1000);
  // Under an hour, seconds matter -- the whole point of a flash special is urgency,
  // and "3m left" jumping straight to "0m left" for a full minute undersells that.
  if (minutes > 0) return `${minutes}m ${seconds}s left`;
  return `${seconds}s left`;
}

// Ticks every second rather than every minute -- a flash special's last few minutes
// are exactly the moment the countdown is doing its job, so it needs to visibly move.
export function FlashCountdown({ expiresAt }: { expiresAt: Date }) {
  const [remaining, setRemaining] = useState(() => expiresAt.getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(expiresAt.getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return <span className="font-mono-tabular">{formatRemaining(remaining)}</span>;
}
