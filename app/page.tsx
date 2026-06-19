"use client";

import Script from "next/script";
import { FormEvent, useEffect, useState } from "react";

type LinkItem = {
  slug: string;
  targetUrl: string;
  clickCount: number;
  createdAt: string;
  shortUrl: string;
};

declare global {
  interface Window {
    onTurnstileSuccess?: (token: string) => void;
    onTurnstileExpired?: () => void;
    onTurnstileError?: () => void;
    turnstile?: {
      reset: () => void;
    };
  }
}

export default function Home() {
  const [targetUrl, setTargetUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [copiedUrl, setCopiedUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE || "https://go.skalarsolutions.com";

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  useEffect(() => {
    window.onTurnstileSuccess = (token: string) => {
      setTurnstileToken(token);
      setError("");
    };

    window.onTurnstileExpired = () => {
      setTurnstileToken("");
    };

    window.onTurnstileError = () => {
      setTurnstileToken("");
      setError("Turnstile verification failed. Please refresh and try again.");
    };

    loadLinks();

    return () => {
      delete window.onTurnstileSuccess;
      delete window.onTurnstileExpired;
      delete window.onTurnstileError;
    };
  }, []);

  async function loadLinks() {
    try {
      const response = await fetch(`${apiBase}/api/links`, {
        method: "GET",
      });

      const data = await response.json();

      if (response.ok) {
        setLinks(data.links || []);
      }
    } catch {
      // History error can be ignored silently
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setShortUrl("");
    setIsLoading(true);

    if (!turnstileToken) {
      setError("Please complete the verification first.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiBase}/api/shorten`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUrl,
          customSlug,
          turnstileToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create shortlink");
      }

      setShortUrl(data.shortUrl);
      await loadLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
      setTurnstileToken("");
      window.turnstile?.reset();
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);

      setCopiedUrl(text);
    }

    setTimeout(() => {
      setCopiedUrl("");
    }, 1600);
  }

  function formatDate(value: string) {
    if (!value) return "-";

    const safeDate = value.includes("T") ? value : value.replace(" ", "T") + "Z";
    const date = new Date(safeDate);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function displayUrl(value: string) {
    return value.replace(/^https?:\/\//, "");
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black flex flex-col">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
      />

      {/* Navbar */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <a
          href="https://skalarsolutions.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img
            src="/icon.png"
            alt="Skalar Logo"
            className="w-8 h-8 object-contain"
          />
          <span className="text-xl font-semibold tracking-tight">Skalar Solutions</span>
        </a>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-3xl text-center space-y-6 mb-12">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight">
            Skalar Solutions
            <span className="block text-2xl md:text-3xl text-white/50 font-medium mt-4">
              shortlink platform.
            </span>
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto">
            Create branded, reliable shortlinks under the Skalar domain. Clean, fast, and enterprise-ready.
          </p>
        </div>

        <div className="w-full max-w-3xl bg-white/5 border border-white/10 p-1 rounded-2xl backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="bg-black border border-white/10 rounded-xl p-8 shadow-2xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Destination URL
                </label>
                <input
                  value={targetUrl}
                  onChange={(event) => setTargetUrl(event.target.value)}
                  placeholder="Enter your long URL"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white focus:bg-white/10 transition-all"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Custom
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-white font-semibold whitespace-nowrap tracking-tight">
                    skalar.cc/
                  </span>
                  <input
                    value={customSlug}
                    onChange={(event) => setCustomSlug(event.target.value)}
                    placeholder="Enter your short URL"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white focus:bg-white/10 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="w-full md:w-auto min-h-[65px] flex items-center justify-center">
                {siteKey ? (
                  <div
                    className="cf-turnstile"
                    data-sitekey={siteKey}
                    data-callback="onTurnstileSuccess"
                    data-expired-callback="onTurnstileExpired"
                    data-error-callback="onTurnstileError"
                    data-theme="dark"
                  />
                ) : (
                  <p className="text-xs text-white/40 border border-white/10 px-3 py-2 rounded">
                    Verification unavailable
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full md:w-auto bg-white text-black font-semibold px-8 py-3 rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? "Shortening..." : "Shorten URL"}
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="mt-6 w-full max-w-3xl bg-black border border-red-500/50 rounded-xl p-4 flex items-center gap-3">
            <span className="text-red-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </span>
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {shortUrl && (
          <div className="mt-6 w-full max-w-3xl bg-white/5 border border-white/20 rounded-xl p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">
              Your Shortlink
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-3 text-white font-medium truncate">
                {displayUrl(shortUrl)}
              </div>
              <button
                type="button"
                onClick={() => copyText(shortUrl)}
                className="shrink-0 bg-white text-black font-semibold px-6 py-3 rounded-lg hover:bg-white/90 transition-colors w-[100px]"
              >
                {copiedUrl === shortUrl ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {links.length > 0 && (
          <div className="mt-24 w-full max-w-4xl">
            <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
              <h2 className="text-xl font-semibold tracking-tight">Recent Links</h2>
              <span className="text-sm text-white/50">{links.length} total</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {links.map((link) => (
                <div
                  key={link.slug}
                  className="group bg-black border border-white/10 hover:border-white/30 rounded-xl p-5 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="overflow-hidden pr-4">
                      <p className="font-semibold text-white truncate text-lg">
                        {displayUrl(link.shortUrl)}
                      </p>
                      <p className="text-sm text-white/40 truncate mt-1">
                        {link.targetUrl}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(link.shortUrl)}
                      className="shrink-0 bg-white/10 hover:bg-white text-white hover:text-black text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                    >
                      {copiedUrl === link.shortUrl ? "Copied" : "Copy"}
                    </button>
                  </div>

                  <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                        Clicks
                      </p>
                      <p className="text-sm font-medium text-white/80">
                        {link.clickCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                        Created
                      </p>
                      <p className="text-sm font-medium text-white/80">
                        {formatDate(link.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-12 px-8 mt-auto">
        <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          {/* Left: Logo & Copyright */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/icon.png"
                alt="Skalar Logo"
                className="w-8 h-8 object-contain"
              />
              <span className="text-xl font-semibold tracking-tight text-white">Skalar Solutions</span>
            </div>
            <p className="text-sm text-white/40 mt-auto md:mt-12">
              &copy; {new Date().getFullYear()} Skalar Solutions.
            </p>
          </div>

          {/* Middle: Location & Contact */}
          <div className="flex flex-col gap-4 max-w-md">
            <div className="flex items-center gap-2 text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span className="font-semibold text-sm">Jakarta, Indonesia</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              Skalar is a technology solutions company based in Jakarta, Indonesia.
            </p>
            <div className="mt-2 text-sm">
              <p className="font-semibold text-white mb-1">Contact us (Email):</p>
              <a href="mailto:skalarsolutions@gmail.com" className="text-white/60 hover:text-white transition-colors">
                skalarsolutions@gmail.com
              </a>
            </div>
          </div>

          {/* Right: Social Media */}
          <div className="flex flex-col gap-4 items-start md:items-end md:ml-auto">
            <div className="flex items-center gap-4">
              <a href="https://www.instagram.com/skalar.solutions/" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors" aria-label="Instagram">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a href="mailto:skalarsolutions@gmail.com" className="text-white/40 hover:text-white transition-colors" aria-label="Email">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}