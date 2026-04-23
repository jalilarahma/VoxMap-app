"use client";

import { useState } from "react";
import Link from "next/link";

// ═══════════════════════════════════════════════════════
// PUBLISHER EMBED PAGE
// Customize and copy the VoxMap widget embed code
// ═══════════════════════════════════════════════════════

export default function EmbedPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [size, setSize] = useState<"full" | "compact">("full");
  const [copied, setCopied] = useState(false);

  const widgetHost = "https://vox-map-app.vercel.app";

  const embedCode = `<div id="voxmap-widget"></div>\n<script src="${widgetHost}/widget.js" data-theme="${theme}" data-size="${size}"></script>`;

  const previewUrl = `${widgetHost}/widget?theme=${theme}&size=${size}`;

  function copyCode() {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <h1 className="text-xl font-bold cursor-pointer" style={{
            background: "linear-gradient(to right, #f97316, #ef4444, #a855f7)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>VoxMap</h1>
        </Link>
        <Link href="/" className="text-slate-500 hover:text-white text-sm transition-colors">
          ← Back to app
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black mb-3" style={{
            background: "linear-gradient(to right, #f97316, #ef4444, #a855f7)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>Live Pulse Widget</h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Add the VoxMap daily question to your website. One line of code.
            Your readers vote, you get engagement, the world gets heard.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Customization */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white">Customize</h2>

            {/* Theme selector */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Theme</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all
                    ${theme === "dark"
                      ? "bg-slate-800 border-2 border-orange-500 text-white"
                      : "bg-slate-900 border-2 border-slate-700 text-slate-400 hover:border-slate-500"
                    }`}
                >
                  🌙 Dark
                </button>
                <button
                  onClick={() => setTheme("light")}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all
                    ${theme === "light"
                      ? "bg-white border-2 border-orange-500 text-slate-900"
                      : "bg-slate-900 border-2 border-slate-700 text-slate-400 hover:border-slate-500"
                    }`}
                >
                  ☀️ Light
                </button>
              </div>
            </div>

            {/* Size selector */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Size</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setSize("full")}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all
                    ${size === "full"
                      ? "bg-slate-800 border-2 border-orange-500 text-white"
                      : "bg-slate-900 border-2 border-slate-700 text-slate-400 hover:border-slate-500"
                    }`}
                >
                  Full
                </button>
                <button
                  onClick={() => setSize("compact")}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all
                    ${size === "compact"
                      ? "bg-slate-800 border-2 border-orange-500 text-white"
                      : "bg-slate-900 border-2 border-slate-700 text-slate-400 hover:border-slate-500"
                    }`}
                >
                  Compact
                </button>
              </div>
            </div>

            {/* Embed code */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Embed Code</label>
              <div className="relative">
                <pre className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-green-400
                  overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed">
                  {embedCode}
                </pre>
                <button
                  onClick={copyCode}
                  className={`absolute top-3 right-3 px-4 py-1.5 rounded-lg text-xs font-bold transition-all
                    ${copied
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30"
                    }`}
                >
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-2">How to add to your site</h3>
              <div className="text-xs text-slate-400 space-y-2">
                <p>1. Copy the embed code above</p>
                <p>2. Paste it anywhere in your HTML page</p>
                <p>3. The widget loads automatically with the daily question</p>
                <p>4. Votes from your readers count toward global results</p>
              </div>
            </div>

            {/* API docs teaser */}
            <div className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-purple-500/10
              border border-orange-500/20 rounded-xl p-4">
              <h3 className="text-sm font-bold text-orange-400 mb-1">API Access</h3>
              <p className="text-xs text-slate-400 mb-2">
                Need raw data or custom questions? Our API endpoints are available:
              </p>
              <div className="text-xs font-mono text-slate-500 space-y-1">
                <p>GET /api/question — Today&apos;s question + results</p>
                <p>POST /api/vote — Submit a vote</p>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Contact us for premium API access with custom questions and analytics.
              </p>
            </div>
          </div>

          {/* Right: Preview */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Preview</h2>
            <div className={`rounded-2xl p-6 ${theme === "light" ? "bg-gray-100" : "bg-slate-950"}`}>
              <iframe
                src={previewUrl}
                style={{
                  width: "100%",
                  height: size === "compact" ? 220 : 280,
                  border: "none",
                  borderRadius: 16,
                  overflow: "hidden",
                }}
                title="VoxMap Widget Preview"
              />
            </div>
            <p className="text-xs text-slate-600 text-center mt-3">
              This is exactly how the widget will look on your website
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center border-t border-slate-800 pt-8">
          <p className="text-slate-500 text-sm mb-4">
            Questions? Want custom branding or dedicated support?
          </p>
          <a
            href="mailto:lakhchine.jalila@gmail.com"
            className="inline-block px-8 py-3 rounded-xl text-sm font-bold text-white
              bg-gradient-to-r from-orange-500 via-red-500 to-purple-500
              hover:scale-105 active:scale-95 transition-all"
          >
            Contact Us
          </a>
        </div>
      </div>
    </div>
  );
}
