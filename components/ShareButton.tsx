"use client";

import { useState, useRef, useEffect } from "react";

interface ShareButtonProps {
  title: string;
  text: string;
  url: string;
  className?: string;
}

// Web Share API covers the OS share sheet (Messages/SMS, WhatsApp, Instagram,
// Snapchat, Mail, etc.) on mobile in one call. Desktop browsers mostly don't
// support it, so we fall back to a small menu with direct share links.
export function ShareButton({ title, text, url, className }: ShareButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  async function handleClick() {
    window.kdsTrack?.("share_click", url);
    if (canNativeShare) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // user cancelled the native sheet, or it failed — fall through to menu
      }
    }
    setMenuOpen((v) => !v);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.kdsTrack?.("share_copy_link", url);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — link is still visible via the browser bar
    }
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  return (
    <div className="relative inline-block" ref={wrapperRef}>
      <button
        type="button"
        onClick={handleClick}
        className={
          className ??
          "press-pill inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted hover:border-muted hover:text-foreground"
        }
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.6" y1="10.6" x2="15.4" y2="6.4" />
          <line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
        </svg>
        Share
      </button>

      {menuOpen && !canNativeShare && (
        <div className="absolute right-0 top-full mt-2 z-20 flex flex-col gap-1 rounded-xl border border-border bg-surface p-2 shadow-lg min-w-[180px]">
          <a
            href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => window.kdsTrack?.("share_whatsapp", url)}
            className="rounded-lg px-3 py-1.5 text-sm text-foreground/90 hover:bg-accent-soft/30"
          >
            WhatsApp
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => window.kdsTrack?.("share_facebook", url)}
            className="rounded-lg px-3 py-1.5 text-sm text-foreground/90 hover:bg-accent-soft/30"
          >
            Facebook
          </a>
          <a
            href={`sms:?body=${encodedText}%20${encodedUrl}`}
            onClick={() => window.kdsTrack?.("share_sms", url)}
            className="rounded-lg px-3 py-1.5 text-sm text-foreground/90 hover:bg-accent-soft/30"
          >
            Text message
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}%20${encodedUrl}`}
            onClick={() => window.kdsTrack?.("share_email", url)}
            className="rounded-lg px-3 py-1.5 text-sm text-foreground/90 hover:bg-accent-soft/30"
          >
            Email
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="rounded-lg px-3 py-1.5 text-sm text-left text-foreground/90 hover:bg-accent-soft/30"
          >
            {copied ? "Link copied!" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
