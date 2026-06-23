"use client";

import Script from "next/script";
import { FormEvent, useEffect, useState, useRef } from "react";
import type QRCodeStylingType from "qr-code-styling";
import type { DotType, CornerSquareType, Options } from "qr-code-styling";

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
  const [activeTab, setActiveTab] = useState<"shorten" | "qr">("shorten");

  // Shorten states
  const [targetUrl, setTargetUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [copiedUrl, setCopiedUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // QR Generator states
  const [qrUrl, setQrUrl] = useState("");
  const [qrColorType, setQrColorType] = useState<"solid" | "gradient">("solid");
  const [qrSolidColor, setQrSolidColor] = useState("#000000");
  const [qrGradientColor1, setQrGradientColor1] = useState("#ffffff");
  const [qrGradientColor2, setQrGradientColor2] = useState("#a855f7");
  const [qrBodyPattern, setQrBodyPattern] = useState<DotType>("square");
  const [qrEyePattern, setQrEyePattern] = useState<CornerSquareType>("square");

  const [qrCode, setQrCode] = useState<QRCodeStylingType | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

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

  // Initialize QR Code generator
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("qr-code-styling").then((module) => {
        const QRCodeStyling = module.default;
        const qr = new QRCodeStyling({
          width: 260,
          height: 260,
          data: "https://skalarsolutions.com",
          margin: 5,
          qrOptions: {
            typeNumber: 0,
            mode: "Byte",
            errorCorrectionLevel: "Q"
          },
          imageOptions: {
            hideBackgroundDots: true,
            imageSize: 0.4,
            margin: 0
          },
          dotsOptions: {
            type: "square",
            color: "#ffffff"
          },
          backgroundOptions: {
            color: "transparent"
          },
          cornersSquareOptions: {
            type: "square",
            color: "#ffffff"
          }
        });
        setQrCode(qr);
      });
    }
  }, []);

  // Mount QR Canvas
  useEffect(() => {
    if (qrCode && qrRef.current && activeTab === "qr") {
      qrRef.current.innerHTML = "";
      qrCode.append(qrRef.current);
    }
  }, [qrCode, qrRef, activeTab]);

  // Update QR Code settings
  useEffect(() => {
    if (!qrCode) return;

    const dotsOptions: NonNullable<Options["dotsOptions"]> = { type: qrBodyPattern };
    const cornersSquareOptions: NonNullable<Options["cornersSquareOptions"]> = { type: qrEyePattern };

    if (qrColorType === "solid") {
      dotsOptions.color = qrSolidColor;
      cornersSquareOptions.color = qrSolidColor;
    } else {
      const gradient: NonNullable<Options["dotsOptions"]>["gradient"] = {
        type: "linear",
        rotation: 0,
        colorStops: [
          { offset: 0, color: qrGradientColor1 },
          { offset: 1, color: qrGradientColor2 }
        ]
      };
      dotsOptions.gradient = gradient;
      cornersSquareOptions.gradient = gradient;
    }

    qrCode.update({
      data: qrUrl || "https://skalarsolutions.com",
      dotsOptions,
      cornersSquareOptions
    });
  }, [qrUrl, qrColorType, qrSolidColor, qrGradientColor1, qrGradientColor2, qrBodyPattern, qrEyePattern, qrCode]);

  function loadLinks() {
    try {
      const saved = localStorage.getItem("skalar_links_history");
      if (saved) {
        setLinks(JSON.parse(saved));
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

      // Save to localStorage
      const newSlug = data.slug || data.shortUrl?.split('/').pop() || customSlug || "link";
      const newLink: LinkItem = {
        slug: newSlug,
        targetUrl: targetUrl,
        clickCount: 0,
        createdAt: new Date().toISOString(),
        shortUrl: data.shortUrl,
      };

      const newLinks = [newLink, ...links];
      setLinks(newLinks);
      localStorage.setItem("skalar_links_history", JSON.stringify(newLinks));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
      setTurnstileToken("");
      window.turnstile?.reset();
    }
  }

  async function copyText(text: string, isQr: boolean = false) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(isQr ? "qr" : text);
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

      setCopiedUrl(isQr ? "qr" : text);
    }

    setTimeout(() => {
      setCopiedUrl("");
    }, 1600);
  }

  async function copyQrToClipboard() {
    if (!qrCode) return;
    try {
      const rawData = await qrCode.getRawData("png");
      if (!rawData) return;
      const blob = rawData as Blob;
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob })
      ]);
      setCopiedUrl("qr");
      setTimeout(() => setCopiedUrl(""), 1600);
    } catch (err) {
      console.error("Failed to copy", err);
      alert("Failed to copy QR code to clipboard. Your browser might not support this feature.");
    }
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
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black relative overflow-hidden flex flex-col">
      {/* Animated Lava Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/30 rounded-full mix-blend-screen filter blur-[120px] animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-blue-600/30 rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-20%] left-[20%] w-[30rem] h-[30rem] bg-pink-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
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
        <main className="flex-1 flex flex-col items-center px-6 py-12 md:py-20">

          {/* Tab Navigation */}
          <div className="w-full flex justify-center mb-10">
            <div className="bg-white/5 p-1 rounded-lg border border-white/10 flex">
              <button
                onClick={() => setActiveTab('shorten')}
                className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === 'shorten' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
              >
                Shorten a Link
              </button>
              <button
                onClick={() => setActiveTab('qr')}
                className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === 'qr' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
              >
                Create QR Code
              </button>
            </div>
          </div>

          <div className="w-full max-w-3xl text-center space-y-6 mb-12">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight">
              Skalar Solutions
              <span className="block text-2xl md:text-3xl text-white/50 font-medium mt-4">
                {activeTab === 'shorten' ? "shortlink platform." : "QR code generator."}
              </span>
            </h1>
            <p className="text-lg text-white/50 max-w-xl mx-auto">
              {activeTab === 'shorten'
                ? "Create branded, reliable shortlinks under the Skalar domain. Clean, fast, and enterprise-ready."
                : "Generate customizable, high-quality QR codes instantly. Choose patterns, colors, and export easily."}
            </p>
          </div>

          {activeTab === 'shorten' && (
            <>
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
            </>
          )}

          {activeTab === 'qr' && (
            <div className="w-full max-w-5xl bg-white/5 border border-white/10 p-1 rounded-2xl backdrop-blur-sm">
              <div className="bg-black border border-white/10 rounded-xl p-6 md:p-10 shadow-2xl grid grid-cols-1 lg:grid-cols-5 gap-12">

                {/* Settings Panel */}
                <div className="lg:col-span-3 space-y-8">
                  {/* URL Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                      Target URL
                    </label>
                    <input
                      value={qrUrl}
                      onChange={(e) => setQrUrl(e.target.value)}
                      placeholder="https://skalarsolutions.com"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white focus:bg-white/10 transition-all"
                    />
                  </div>

                  {/* Color Settings */}
                  <div className="space-y-4">
                    <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                      QR Color
                    </label>
                    <div className="flex gap-6 mb-3">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${qrColorType === "solid" ? "border-white" : "border-white/40 group-hover:border-white/80"}`}>
                          {qrColorType === "solid" && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <input
                          type="radio"
                          className="hidden"
                          checked={qrColorType === "solid"}
                          onChange={() => setQrColorType("solid")}
                        />
                        <span className="text-sm text-white/80 group-hover:text-white transition-colors">Solid Color</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${qrColorType === "gradient" ? "border-white" : "border-white/40 group-hover:border-white/80"}`}>
                          {qrColorType === "gradient" && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <input
                          type="radio"
                          className="hidden"
                          checked={qrColorType === "gradient"}
                          onChange={() => setQrColorType("gradient")}
                        />
                        <span className="text-sm text-white/80 group-hover:text-white transition-colors">Gradient</span>
                      </label>
                    </div>

                    {qrColorType === "solid" ? (
                      <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-lg p-3">
                        <input
                          type="color"
                          value={qrSolidColor}
                          onChange={(e) => setQrSolidColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0"
                        />
                        <span className="text-sm font-mono text-white/80 uppercase">{qrSolidColor}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-4 flex-1 bg-white/5 border border-white/10 rounded-lg p-3">
                          <input
                            type="color"
                            value={qrGradientColor1}
                            onChange={(e) => setQrGradientColor1(e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0"
                          />
                          <span className="text-sm font-mono text-white/80 uppercase">{qrGradientColor1}</span>
                        </div>
                        <span className="text-white/40 text-sm">to</span>
                        <div className="flex items-center gap-4 flex-1 bg-white/5 border border-white/10 rounded-lg p-3">
                          <input
                            type="color"
                            value={qrGradientColor2}
                            onChange={(e) => setQrGradientColor2(e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0"
                          />
                          <span className="text-sm font-mono text-white/80 uppercase">{qrGradientColor2}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Body Patterns */}
                  <div className="space-y-4">
                    <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                      Body Patterns
                    </label>
                    <div className="flex gap-4">
                      {(["square", "dots", "rounded"] as DotType[]).map(pattern => (
                        <button
                          key={pattern}
                          onClick={() => setQrBodyPattern(pattern)}
                          className={`w-14 h-14 rounded-xl border flex items-center justify-center transition-all ${qrBodyPattern === pattern ? 'border-white bg-white/10' : 'border-white/10 hover:border-white/30 bg-white/5'}`}
                          title={pattern}
                        >
                          <div className={`w-6 h-6 bg-white ${pattern === 'rounded' ? 'rounded-md' : pattern === 'dots' ? 'rounded-full' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Eye Patterns */}
                  <div className="space-y-4">
                    <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                      External Eye Patterns
                    </label>
                    <div className="flex gap-4">
                      {(["square", "dot", "extra-rounded"] as CornerSquareType[]).map(pattern => (
                        <button
                          key={pattern}
                          onClick={() => setQrEyePattern(pattern)}
                          className={`w-14 h-14 rounded-xl border flex items-center justify-center transition-all ${qrEyePattern === pattern ? 'border-white bg-white/10' : 'border-white/10 hover:border-white/30 bg-white/5'}`}
                          title={pattern}
                        >
                          <div className={`w-8 h-8 border-[3px] border-white flex items-center justify-center ${pattern === 'extra-rounded' ? 'rounded-full' : pattern === 'dot' ? 'rounded-xl' : ''}`}>
                            <div className={`w-2.5 h-2.5 bg-white ${pattern === 'extra-rounded' ? 'rounded-full' : pattern === 'dot' ? 'rounded-sm' : ''}`} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preview Panel */}
                <div className="lg:col-span-2 flex flex-col items-center justify-center space-y-8 lg:border-l border-white/10 lg:pl-12 pt-8 lg:pt-0 border-t lg:border-t-0">
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold tracking-tight">Preview</h3>
                    <p className="text-xs text-white/50">Scan to test your code</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                    <div ref={qrRef} className="transition-all duration-300" />
                  </div>

                  <div className="w-full space-y-3">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 text-center mb-4">
                      Generate Your QR Code as
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => qrCode?.download({ extension: "png" })}
                        className="bg-white/10 hover:bg-white hover:text-black border border-white/10 text-white text-sm font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        PNG
                      </button>
                      <button
                        onClick={() => qrCode?.download({ extension: "svg" })}
                        className="bg-white/10 hover:bg-white hover:text-black border border-white/10 text-white text-sm font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        SVG
                      </button>
                      <button
                        onClick={copyQrToClipboard}
                        className="col-span-2 bg-white text-black text-sm font-semibold py-3 rounded-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-2 mt-1"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        {copiedUrl === "qr" ? "Copied!" : "Copy to Clipboard"}
                      </button>
                    </div>
                  </div>
                </div>
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
              <div className="mt-2 text-sm flex flex-col gap-2">
                <div>
                  <p className="font-semibold text-white mb-1">Contact us (Email):</p>
                  <a href="mailto:skalarsolutions@gmail.com" className="text-white/60 hover:text-white transition-colors">
                    skalarsolutions@gmail.com
                  </a>
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">WhatsApp:</p>
                  <a href="https://wa.me/6285121504200" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">
                    +62 851-2150-4200
                  </a>
                </div>
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
                <a href="https://wa.me/6285121504200" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors" aria-label="WhatsApp">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
