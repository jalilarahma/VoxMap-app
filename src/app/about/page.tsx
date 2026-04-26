"use client";

import Link from "next/link";

export default function AboutPage() {
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
          &larr; Back to app
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-black mb-4" style={{
            background: "linear-gradient(135deg, #f97316 0%, #ef4444 40%, #a855f7 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>About VoxMap</h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            We believe every human deserves a voice. VoxMap is the platform that makes it happen
            — anonymously, globally, and in real time.
          </p>
        </div>

        {/* Mission */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-purple-500/10
            border border-orange-500/20 rounded-2xl p-8">
            <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500
                flex items-center justify-center text-lg">
                &#x1F3AF;
              </span>
              Our Mission
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              To transform anonymous citizen sentiment into real-time geopolitical intelligence.
              Every day, one question is posed to the world. Citizens vote. The map lights up.
              Patterns emerge across cities, countries, and continents. VoxMap captures the living
              pulse of humanity — what we think, how we feel, and where we disagree.
            </p>
          </div>
        </section>

        {/* Vision */}
        <section className="mb-16">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500
                flex items-center justify-center text-lg">
                &#x1F52D;
              </span>
              Our Vision
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              A world where public opinion is transparent, accessible, and impossible to ignore.
              Where a citizen in Doha has the same power to shape the global narrative as a citizen
              in New York. Where governments, organizations, and researchers can see what the world
              truly thinks — not through filtered media, but through the unfiltered voices of the people.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-white mb-8 text-center">Our Values</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                icon: "&#x1F6E1;",
                title: "Privacy First",
                desc: "No email. No phone number. No real name. We collect the minimum data needed and protect it with GPS fuzzing, anonymous auth, and encrypted connections. Your opinion matters; your identity is yours alone.",
                color: "from-green-500 to-emerald-600",
              },
              {
                icon: "&#x1F5E3;",
                title: "Free Speech",
                desc: "VoxMap is a free speech platform. We don't filter opinions or censor viewpoints. The community self-moderates through verification and reporting. Every voice is equal.",
                color: "from-orange-500 to-red-500",
              },
              {
                icon: "&#x1F30D;",
                title: "Global Equality",
                desc: "One person, one vote, one world. Whether you're in a capital city or a rural village, your vote carries the same weight. No accounts, no barriers, no gatekeeping.",
                color: "from-blue-500 to-cyan-500",
              },
              {
                icon: "&#x1F50D;",
                title: "Radical Transparency",
                desc: "Vote results are public and real-time. No hidden algorithms. No manipulation. The map shows exactly what the world thinks, updated live as votes arrive.",
                color: "from-purple-500 to-pink-500",
              },
            ].map((v, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${v.color}
                  flex items-center justify-center text-xl mb-4`}
                  dangerouslySetInnerHTML={{ __html: v.icon }}
                />
                <h3 className="text-lg font-bold text-white mb-2">{v.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-white mb-8 text-center">How VoxMap Works</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { step: "01", title: "One Question", desc: "Every day, one question is posed to the world. Relevant, thought-provoking, universal." },
              { step: "02", title: "The World Votes", desc: "Citizens from 195+ countries vote anonymously. No signup needed. Takes 5 seconds." },
              { step: "03", title: "The Map Lights Up", desc: "Votes appear on a live world map. Green for agree, red for disagree. Patterns emerge." },
              { step: "04", title: "Insights Surface", desc: "Our AI analyzes geographic contrasts and demographic patterns. The data tells a story." },
            ].map((s, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
                <div className="text-3xl font-black mb-3" style={{
                  background: "linear-gradient(135deg, #f97316, #ef4444, #a855f7)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>{s.step}</div>
                <h3 className="text-white font-bold text-sm mb-2">{s.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What Makes Us Different */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-white mb-8 text-center">What Makes Us Different</h2>
          <div className="space-y-4">
            {[
              { label: "Zero Friction", value: "No signup, no email, no login. Vote in under 5 seconds.", color: "#f97316" },
              { label: "Stealth Mode", value: "Users in restricted countries can disguise VoxMap as a weather or news app.", color: "#22c55e" },
              { label: "Community Verification", value: "Emergency pins are verified by nearby users. Proximity matters. Truth is local.", color: "#3b82f6" },
              { label: "AI-Powered Insights", value: "Our pattern engine detects geographic contrasts, consensus, and outliers automatically.", color: "#a855f7" },
              { label: "Embeddable Widget", value: "News outlets can embed our daily question on their sites with one line of code.", color: "#06b6d4" },
              { label: "City vs City", value: "Cities compete for the Active City crown. Gamification drives daily engagement.", color: "#eab308" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl px-5 py-4">
                <div className="w-2 h-10 rounded-full" style={{ backgroundColor: item.color }} />
                <div>
                  <p className="text-white font-bold text-sm">{item.label}</p>
                  <p className="text-slate-500 text-xs">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* For B2B */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-8">
            <h2 className="text-2xl font-black text-white mb-4">For Researchers &amp; Organizations</h2>
            <p className="text-slate-300 leading-relaxed mb-6">
              VoxMap is more than a consumer app. It is a geopolitical sentiment infrastructure layer.
              The consumer app collects data. The intelligence layer makes it valuable.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { title: "Real-Time Data", desc: "Access live sentiment data segmented by geography, time, and topic." },
                { title: "API Access", desc: "Query our REST API for vote data, trend analysis, and demographic breakdowns." },
                { title: "Expert Annotations", desc: "Verified partners add context to sentiment spikes — data plus intelligence." },
              ].map((item, i) => (
                <div key={i} className="bg-slate-900/60 rounded-xl p-4">
                  <h3 className="text-cyan-400 font-bold text-sm mb-1">{item.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <a href="mailto:lakhchine.jalila@gmail.com"
                className="inline-block px-8 py-3 rounded-xl text-sm font-bold text-white
                  bg-gradient-to-r from-cyan-500 to-blue-500 hover:scale-105 active:scale-95 transition-all">
                Contact Us for Data Access
              </a>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="mb-16 text-center">
          <h2 className="text-2xl font-black text-white mb-8">The Team</h2>
          <div className="inline-block">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-purple-500
              flex items-center justify-center text-4xl mx-auto mb-4">
              J
            </div>
            <h3 className="text-white font-bold text-lg">Jalila Lakhchine</h3>
            <p className="text-orange-400 text-sm font-semibold">Founder &amp; CEO</p>
            <p className="text-slate-500 text-xs mt-2 max-w-xs mx-auto">
              Building the infrastructure for global democratic expression.
              Based in Qatar.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center mb-16">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <h2 className="text-2xl font-black text-white mb-3">Join the Movement</h2>
            <p className="text-slate-400 mb-6">
              Your voice matters. The world is listening.
            </p>
            <Link href="/"
              className="inline-block px-10 py-4 rounded-2xl text-lg font-bold text-white
                bg-gradient-to-r from-orange-500 via-red-500 to-purple-500
                hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/20">
              Start Voting
            </Link>
          </div>
        </section>

        {/* Footer */}
        <div className="pt-8 border-t border-slate-800 text-center">
          <p className="text-slate-600 text-sm">&copy; 2026 VoxMap. All rights reserved.</p>
          <div className="flex gap-4 justify-center mt-3">
            <Link href="/privacy" className="text-orange-400 hover:text-orange-300 text-sm transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-orange-400 hover:text-orange-300 text-sm transition-colors">Terms of Service</Link>
            <Link href="/embed" className="text-orange-400 hover:text-orange-300 text-sm transition-colors">Embed Widget</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
