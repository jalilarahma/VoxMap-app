"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ═══════════════════════════════════════════════════
// ABOUT PAGE — Cinematic Intelligence Briefing
// Ultra-dark, glassmorphism, scroll-triggered animation
// ═══════════════════════════════════════════════════

// ── Scroll-triggered reveal hook ──
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

// ── Animated counter ──
function Counter({ target, suffix = "", duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const animate = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(target * eased));
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ── Parallax background with mouse tracking ──
function ParallaxBg() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setOffset({ x, y });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Primary radial glow */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, rgba(239,68,68,0.08) 40%, transparent 70%)",
          top: "15%",
          left: "50%",
          transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px)`,
          transition: "transform 0.3s ease-out",
        }}
      />
      {/* Secondary cyan glow */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-15"
        style={{
          background: "radial-gradient(circle, rgba(0,207,255,0.1) 0%, transparent 60%)",
          bottom: "20%",
          right: "10%",
          transform: `translate(${-offset.x * 0.5}px, ${-offset.y * 0.5}px)`,
          transition: "transform 0.3s ease-out",
        }}
      />
      {/* Dot grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
        <defs>
          <pattern id="about-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1" fill="#00CFFF" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#about-grid)" />
      </svg>
    </div>
  );
}

// ── Section wrapper with reveal animation ──
function Section({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal(0.1);
  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Monospace badge ──
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-medium tracking-widest uppercase"
      style={{
        background: "rgba(245,158,11,0.08)",
        border: "1px solid rgba(245,158,11,0.2)",
        color: "#F59E0B",
      }}
    >
      {children}
    </span>
  );
}

// ── Glass card ──
function GlassCard({ children, className = "", glowColor = "rgba(245,158,11,0.05)" }: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}) {
  return (
    <div
      className={`relative rounded-2xl border border-white/[0.08] overflow-hidden ${className}`}
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* Top edge glow */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)` }}
      />
      {children}
    </div>
  );
}

export default function AboutPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "#050505", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <ParallaxBg />

      {/* ── Vignette overlay ── */}
      <div
        className="fixed inset-0 pointer-events-none z-[5]"
        style={{ background: "radial-gradient(circle, transparent 40%, rgba(0,0,0,0.4) 100%)" }}
      />

      {/* ── Navigation ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrollY > 50 ? "rgba(5,5,5,0.85)" : "transparent",
          backdropFilter: scrollY > 50 ? "blur(20px)" : "none",
          borderBottom: scrollY > 50 ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <span className="text-xl font-bold cursor-pointer gradient-text">VoxMap</span>
          </Link>
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-mono text-slate-600 tracking-wider hidden sm:block">
              CLASSIFICATION: PUBLIC
            </span>
            <Link href="/" className="text-sm text-slate-500 hover:text-white transition-colors font-mono tracking-wide">
              ← RETURN TO MAP
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════
          SECTION 1: THE HERO
          ═══════════════════════════════════════════ */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-5xl mx-auto text-center"
          style={{ transform: `translateY(${scrollY * -0.15}px)` }}
        >
          <Section>
            <Badge>Intelligence Platform v1.0</Badge>
          </Section>

          <Section delay={200}>
            <h1
              className="mt-8 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <span className="block text-white/90">Decoding the Pulse</span>
              <span className="block text-white/90">of the World,</span>
              <span className="block gradient-text">One Signal at a Time.</span>
            </h1>
          </Section>

          <Section delay={400}>
            <p className="mt-8 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              VoxMap transforms invisible public sentiment into a visible,
              live geopolitical asset.
            </p>
          </Section>

          <Section delay={600}>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-white" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                  <Counter target={50} suffix="+" />
                </div>
                <div className="text-[10px] font-mono text-slate-600 tracking-widest uppercase mt-1">Global Hotspots</div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-white" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                  <Counter target={24} suffix="/7" />
                </div>
                <div className="text-[10px] font-mono text-slate-600 tracking-widest uppercase mt-1">Live Monitoring</div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-white" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                  <Counter target={0} suffix=" PII" />
                </div>
                <div className="text-[10px] font-mono text-slate-600 tracking-widest uppercase mt-1">Data Collected</div>
              </div>
            </div>
          </Section>

          {/* Scroll indicator */}
          <Section delay={800}>
            <div className="mt-20 flex flex-col items-center gap-2 animate-bounce">
              <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1">
                <div className="w-1 h-2 bg-white/40 rounded-full" />
              </div>
              <span className="text-[9px] font-mono text-slate-700 tracking-widest">SCROLL</span>
            </div>
          </Section>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 2: THE CORE LOGIC (Smart Grid)
          ═══════════════════════════════════════════ */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <Section>
            <div className="text-center mb-16">
              <Badge>Core Architecture</Badge>
              <h2 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-black text-white/90">
                How the Signal Works
              </h2>
              <p className="mt-4 text-slate-500 max-w-xl mx-auto">
                Three interlocking systems that transform raw human expression into actionable geopolitical intelligence.
              </p>
            </div>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                icon: "🌐",
                title: "Democratic Visualization",
                body: "Turning raw public data into an intuitive heatmap, allowing users to see social and political trends as they emerge.",
                accent: "rgba(245,158,11,0.1)",
                accentBorder: "rgba(245,158,11,0.2)",
              },
              {
                num: "02",
                icon: "🧠",
                title: "Pattern Recognition",
                body: "Using AI-driven analytics to detect 'Signals'—shifting sentiments that traditional news cycles often miss.",
                accent: "rgba(239,68,68,0.1)",
                accentBorder: "rgba(239,68,68,0.2)",
              },
              {
                num: "03",
                icon: "🔒",
                title: "Zero-Identity Architecture",
                body: "Ensuring that every voice is added to the map without ever leaving a digital profile or footprint.",
                accent: "rgba(0,207,255,0.08)",
                accentBorder: "rgba(0,207,255,0.15)",
              },
            ].map((item, i) => (
              <Section key={i} delay={i * 150}>
                <GlassCard className="p-8 h-full group hover:border-white/[0.15] transition-all duration-500" glowColor={item.accentBorder}>
                  <div className="flex items-center gap-3 mb-6">
                    <span
                      className="text-[11px] font-mono font-bold tracking-widest"
                      style={{ color: item.accentBorder, fontFamily: "'Roboto Mono', monospace" }}
                    >
                      {item.num}
                    </span>
                    <div className="h-px flex-1" style={{ background: item.accentBorder }} />
                    <span className="text-2xl">{item.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.body}</p>

                  {/* Bottom glow on hover */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-24 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                    style={{ background: `linear-gradient(to top, ${item.accent}, transparent)` }}
                  />
                </GlassCard>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 3: THE THREE PILLARS
          ═══════════════════════════════════════════ */}
      <section className="relative z-10 py-32 px-6">
        {/* Horizontal rule */}
        <div className="max-w-6xl mx-auto mb-20">
          <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.2), transparent)" }} />
        </div>

        <div className="max-w-6xl mx-auto">
          <Section>
            <div className="text-center mb-20">
              <Badge>Foundational Principles</Badge>
              <h2 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-black text-white/90">
                The Three Pillars
              </h2>
            </div>
          </Section>

          <div className="space-y-24">
            {/* Pillar I */}
            <Section>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-[10px] font-mono font-bold tracking-[0.3em] text-amber-500/80"
                      style={{ fontFamily: "'Roboto Mono', monospace" }}>PILLAR I</span>
                    <div className="h-px flex-1 bg-amber-500/20" />
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black text-white mb-6">
                    Radical Anonymity
                  </h3>
                  <p className="text-slate-400 leading-relaxed text-lg">
                    Your data is an encryption, not a profile. We believe true freedom
                    of expression requires absolute privacy. Every signal on VoxMap is
                    stripped of identity before it reaches the map.
                  </p>
                  <div className="mt-8 flex gap-4">
                    <div className="px-4 py-2 rounded-xl border border-white/[0.06]"
                      style={{ background: "rgba(255,255,255,0.02)" }}>
                      <div className="text-xs font-mono text-amber-500" style={{ fontFamily: "'Roboto Mono', monospace" }}>ZKP</div>
                      <div className="text-[9px] text-slate-600 font-mono">Zero-Knowledge</div>
                    </div>
                    <div className="px-4 py-2 rounded-xl border border-white/[0.06]"
                      style={{ background: "rgba(255,255,255,0.02)" }}>
                      <div className="text-xs font-mono text-amber-500" style={{ fontFamily: "'Roboto Mono', monospace" }}>E2E</div>
                      <div className="text-[9px] text-slate-600 font-mono">End-to-End</div>
                    </div>
                    <div className="px-4 py-2 rounded-xl border border-white/[0.06]"
                      style={{ background: "rgba(255,255,255,0.02)" }}>
                      <div className="text-xs font-mono text-amber-500" style={{ fontFamily: "'Roboto Mono', monospace" }}>GPS±</div>
                      <div className="text-[9px] text-slate-600 font-mono">Fuzzed Location</div>
                    </div>
                  </div>
                </div>
                <GlassCard className="p-10 text-center">
                  <div className="text-6xl mb-4">🛡️</div>
                  <div className="text-5xl font-black text-white" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                    <Counter target={100} suffix="%" />
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 tracking-widest uppercase mt-2">Anonymous Signals</div>
                  <div className="mt-6 h-px w-20 mx-auto bg-amber-500/20" />
                  <p className="mt-4 text-xs text-slate-600 italic">No accounts. No cookies. No traces.</p>
                </GlassCard>
              </div>
            </Section>

            {/* Pillar II */}
            <Section>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <GlassCard className="p-10 text-center order-2 lg:order-1">
                  <div className="text-6xl mb-4">⚡</div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-mono text-green-400" style={{ fontFamily: "'Roboto Mono', monospace" }}>LIVE</span>
                  </div>
                  <div className="mt-4 text-4xl font-black text-white" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                    &lt;1<span className="text-lg text-slate-500">sec</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 tracking-widest uppercase mt-2">Signal Latency</div>
                  <div className="mt-6 h-px w-20 mx-auto bg-cyan-500/20" />
                  <p className="mt-4 text-xs text-slate-600 italic">From vote to map in under a second.</p>
                </GlassCard>
                <div className="order-1 lg:order-2">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-[10px] font-mono font-bold tracking-[0.3em] text-cyan-500/80"
                      style={{ fontFamily: "'Roboto Mono', monospace" }}>PILLAR II</span>
                    <div className="h-px flex-1 bg-cyan-500/20" />
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black text-white mb-6">
                    Real-Time Intelligence
                  </h3>
                  <p className="text-slate-400 leading-relaxed text-lg">
                    From Doha to the world, every pulse on our map is live. We provide
                    a window into the world&apos;s heart, updated every second. No delays,
                    no filters, no editorial gatekeepers.
                  </p>
                </div>
              </div>
            </Section>

            {/* Pillar III */}
            <Section>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-[10px] font-mono font-bold tracking-[0.3em] text-purple-500/80"
                      style={{ fontFamily: "'Roboto Mono', monospace" }}>PILLAR III</span>
                    <div className="h-px flex-1 bg-purple-500/20" />
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black text-white mb-6">
                    Integrity of the Signal
                  </h3>
                  <p className="text-slate-400 leading-relaxed text-lg">
                    Every hotspot is verified through decentralized fact-checking,
                    ensuring the &quot;Pulse&quot; reflects reality, not noise. Community
                    verification, AI pattern detection, and expert annotations work
                    together to maintain signal integrity.
                  </p>
                  <div className="mt-8 space-y-3">
                    {[
                      { label: "Community Verification", value: "Peer-validated" },
                      { label: "AI Pattern Detection", value: "Automated" },
                      { label: "Expert Annotations", value: "Partner-driven" },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                        <span className="text-sm text-slate-500">{row.label}</span>
                        <span className="text-xs font-mono text-purple-400" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <GlassCard className="p-10 text-center">
                  <div className="text-6xl mb-4">✅</div>
                  <div className="text-5xl font-black text-white" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                    3<span className="text-lg text-slate-500">-layer</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 tracking-widest uppercase mt-2">Verification Stack</div>
                  <div className="mt-6 h-px w-20 mx-auto bg-purple-500/20" />
                  <p className="mt-4 text-xs text-slate-600 italic">Truth through consensus, not authority.</p>
                </GlassCard>
              </div>
            </Section>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 4: CALL TO ACTION (Footer)
          ═══════════════════════════════════════════ */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="h-px w-full mb-20" style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.2), transparent)" }} />

          <Section>
            <div className="text-center">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6">
                <span className="text-white/90">The Map is Alive.</span>
                <br />
                <span className="gradient-text">Be the Signal.</span>
              </h2>
              <p className="text-slate-500 max-w-md mx-auto mb-12">
                Every voice matters. Every signal counts.
                Join the world&apos;s first decentralized sentiment intelligence network.
              </p>
              <Link href="/">
                <button className="px-10 py-4 rounded-2xl text-base font-bold text-white
                  bg-gradient-to-r from-orange-500 via-red-500 to-purple-500
                  hover:from-orange-400 hover:via-red-400 hover:to-purple-400
                  active:scale-95 transition-all duration-300
                  shadow-lg shadow-orange-500/20">
                  Enter the Map →
                </button>
              </Link>
            </div>
          </Section>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.04] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <span className="gradient-text font-bold text-sm">VoxMap</span>
            <span className="text-[10px] font-mono text-slate-700" style={{ fontFamily: "'Roboto Mono', monospace" }}>
              © 2026 All Rights Reserved
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-[11px] font-mono text-slate-600 hover:text-slate-400 transition-colors tracking-wider">
              TERMS
            </Link>
            <Link href="#" className="text-[11px] font-mono text-slate-600 hover:text-slate-400 transition-colors tracking-wider">
              PRIVACY
            </Link>
            <Link href="#" className="text-[11px] font-mono text-slate-600 hover:text-slate-400 transition-colors tracking-wider">
              ZKP v1.0
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-mono text-slate-700" style={{ fontFamily: "'Roboto Mono', monospace" }}>
              SYSTEM OPERATIONAL
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
