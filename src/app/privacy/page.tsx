"use client";

import Link from "next/link";

export default function PrivacyPolicy() {
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

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2" style={{
          background: "linear-gradient(to right, #f97316, #ef4444, #a855f7)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-10">Last updated: April 22, 2026</p>

        <div className="space-y-8 text-slate-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Introduction</h2>
            <p>
              VoxMap ("we", "our", "us") is a live citizen sentiment mapping platform. We are committed to
              protecting your privacy and being transparent about how we handle your data. This policy explains
              what information we collect, how we use it, and your rights regarding your data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect minimal information to provide our service:</p>

            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3">
              <div>
                <p className="text-orange-400 font-semibold text-sm">Votes</p>
                <p className="text-sm text-slate-400">Your vote on daily questions (Agree/Disagree). Votes are anonymous and tied to a device fingerprint, not to your personal identity.</p>
              </div>
              <div>
                <p className="text-orange-400 font-semibold text-sm">Approximate Location</p>
                <p className="text-sm text-slate-400">If you grant permission, we collect your approximate location (fuzzed to ~100 meters) to show vote patterns on the map. We never store your exact GPS coordinates. You can deny location access and still use the app.</p>
              </div>
              <div>
                <p className="text-orange-400 font-semibold text-sm">Username</p>
                <p className="text-sm text-slate-400">A username you choose, stored locally in your browser. We do not require your real name, email, phone number, or any other personal identifier.</p>
              </div>
              <div>
                <p className="text-orange-400 font-semibold text-sm">Device Fingerprint</p>
                <p className="text-sm text-slate-400">A hashed (non-reversible) fingerprint of your device to prevent duplicate voting. This is not linked to your identity and cannot be used to identify you personally.</p>
              </div>
              <div>
                <p className="text-orange-400 font-semibold text-sm">Emergency Pins</p>
                <p className="text-sm text-slate-400">If you create an emergency pin, we store the category, optional comment, and approximate location. Photos uploaded with pins are compressed and stored as data.</p>
              </div>
              <div>
                <p className="text-orange-400 font-semibold text-sm">Community Posts</p>
                <p className="text-sm text-slate-400">Posts you share in the Community section, including your chosen username and post text.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. What We Do NOT Collect</h2>
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <ul className="space-y-2 text-sm text-slate-400">
                <li>❌ We do not collect your real name, email address, or phone number</li>
                <li>❌ We do not require account registration or login</li>
                <li>❌ We do not track your browsing activity outside VoxMap</li>
                <li>❌ We do not sell your data to third parties</li>
                <li>❌ We do not use your data for advertising</li>
                <li>❌ We do not store your exact GPS coordinates (all locations are fuzzed)</li>
                <li>❌ We do not use cookies for tracking</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. How We Use Your Information</h2>
            <p>We use the collected information solely to:</p>
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 mt-3">
              <ul className="space-y-2 text-sm text-slate-400">
                <li>✅ Display aggregated vote results on the world map</li>
                <li>✅ Show local vs. global voting comparisons</li>
                <li>✅ Display emergency pins to help people in your area</li>
                <li>✅ Provide community features (posts, likes, leaderboard)</li>
                <li>✅ Prevent spam and duplicate voting</li>
                <li>✅ Generate anonymous, aggregated analytics</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Data Storage & Security</h2>
            <p>
              Your data is stored securely on Supabase (PostgreSQL) with Row Level Security (RLS) enabled.
              All connections are encrypted via HTTPS/TLS. Location data is fuzzed before storage to protect
              your privacy. We use anonymous authentication — no passwords or personal credentials are stored.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Data Retention</h2>
            <p>
              Votes are retained indefinitely for historical analytics. Emergency pins automatically expire
              after 24 hours. Community posts are retained until deleted by the user or moderated by our team.
              You can clear your local data (username, points, streak) at any time by clearing your browser data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Your Rights</h2>
            <p>You have the right to:</p>
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 mt-3">
              <ul className="space-y-2 text-sm text-slate-400">
                <li>🔹 Deny location access and still use the app</li>
                <li>🔹 Choose any username — your real name is never required</li>
                <li>🔹 Clear your local data at any time through your browser settings</li>
                <li>🔹 Report inappropriate content using the report button</li>
                <li>🔹 Request deletion of your data by contacting us</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Children's Privacy</h2>
            <p>
              VoxMap does not knowingly collect personal information from children under 13. The app is designed
              for general audiences and does not require any personal information to use. If you believe a child
              has provided personal information through our platform, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">9. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 mt-3 space-y-2 text-sm text-slate-400">
              <p><span className="text-white font-semibold">Supabase</span> — Database and authentication (anonymous auth only)</p>
              <p><span className="text-white font-semibold">Vercel</span> — Hosting and deployment</p>
              <p><span className="text-white font-semibold">OpenStreetMap / Nominatim</span> — Reverse geocoding for city detection</p>
              <p><span className="text-white font-semibold">CartoDB</span> — Map tiles</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. Any changes will be reflected on this page
              with an updated date. Continued use of VoxMap after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">11. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy or want to request data deletion, contact us at:
            </p>
            <p className="mt-3">
              <a href="mailto:lakhchine.jalila@gmail.com" className="text-orange-400 hover:text-orange-300 transition-colors">
                lakhchine.jalila@gmail.com
              </a>
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-800 text-center">
          <p className="text-slate-600 text-sm">© 2026 VoxMap. All rights reserved.</p>
          <Link href="/" className="text-orange-400 hover:text-orange-300 text-sm mt-2 inline-block transition-colors">
            ← Back to VoxMap
          </Link>
        </div>
      </div>
    </div>
  );
}
