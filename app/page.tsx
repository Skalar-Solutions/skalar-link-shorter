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
      setError("Turnstile gagal dimuat. Refresh halaman dan coba lagi.");
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
      // History gagal dimuat tidak perlu ganggu form utama
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setShortUrl("");
    setIsLoading(true);

    if (!turnstileToken) {
      setError("Selesaikan verifikasi dulu.");
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
        throw new Error(data.error || "Gagal bikin shortlink");
      }

      setShortUrl(data.shortUrl);
      await loadLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
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

    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-16">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
      />

      <section className="mx-auto w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <p className="text-sm text-slate-400">Skalar Solutions</p>

        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Skalar Link
        </h1>

        <p className="mt-3 text-slate-300">
          Bikin shortlink branded dengan domain Skalar.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="text-sm text-slate-300">Long URL</label>
            <input
              value={targetUrl}
              onChange={(event) => setTargetUrl(event.target.value)}
              placeholder="https://example.com/link-panjang-banget"
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-white/40"
              required
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">
              Custom slug, optional
            </label>

            <div className="mt-2 flex rounded-xl border border-white/10 bg-slate-900 focus-within:border-white/40">
              <span className="border-r border-white/10 px-4 py-3 text-slate-400">
                go.skalarsolutions.com/
              </span>

              <input
                value={customSlug}
                onChange={(event) => setCustomSlug(event.target.value)}
                placeholder="proposal"
                className="w-full bg-transparent px-4 py-3 text-white outline-none"
              />
            </div>
          </div>

          {siteKey ? (
            <div
              className="cf-turnstile"
              data-sitekey={siteKey}
              data-callback="onTurnstileSuccess"
              data-expired-callback="onTurnstileExpired"
              data-error-callback="onTurnstileError"
            />
          ) : (
            <p className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
              Turnstile site key belum diset.
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-950 disabled:opacity-60"
          >
            {isLoading ? "Creating..." : "Create shortlink"}
          </button>
        </form>

        {error && (
          <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        {shortUrl && (
          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm text-emerald-200">Shortlink lu:</p>

            <div className="mt-2 flex gap-2">
              <input
                value={shortUrl}
                readOnly
                className="w-full rounded-lg bg-slate-950 px-3 py-2 text-sm text-white"
              />

              <button
                type="button"
                onClick={() => copyText(shortUrl)}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950"
              >
                {copiedUrl === shortUrl ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {links.length > 0 && (
          <div className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold text-white">
              Generated Short Links
            </h2>

            {links.map((link) => (
              <div
                key={link.slug}
                className="rounded-xl border border-white/10 bg-slate-950/70 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {link.shortUrl}
                    </p>

                    <p className="mt-1 truncate text-sm text-slate-400">
                      {link.targetUrl}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyText(link.shortUrl)}
                    className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/10"
                  >
                    {copiedUrl === link.shortUrl ? "Copied" : "Copy"}
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-300">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Clicks
                    </p>
                    <p className="mt-1 font-semibold">{link.clickCount}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Created at
                    </p>
                    <p className="mt-1 font-semibold">
                      {formatDate(link.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}