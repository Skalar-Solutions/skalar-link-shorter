"use client";

import Script from "next/script";
import { FormEvent, useEffect, useState } from "react";

declare global {
  interface Window {
    onTurnstileSuccess?: (token: string) => void;
  }
}

export default function Home() {
  const [targetUrl, setTargetUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE || "https://go.skalarsolutions.com";

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  useEffect(() => {
    window.onTurnstileSuccess = (token: string) => {
      setTurnstileToken(token);
    };

    return () => {
      delete window.onTurnstileSuccess;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setShortUrl("");

    if (!turnstileToken) {
      setError("Selesaikan verifikasi dulu.");
      return;
    }

    setIsLoading(true);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyShortUrl() {
    if (!shortUrl) return;
    await navigator.clipboard.writeText(shortUrl);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
      />

      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
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
                onClick={copyShortUrl}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}