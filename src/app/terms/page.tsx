"use client";

import Link from "next/link";

export default function TermsOfService() {
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
        }}>Terms of Service</h1>
        <p className="text-slate-500 text-sm mb-10">Last updated: April 22, 2026</p>

        <div className="space-y-8 text-slate-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using VoxMap, you agree to be bound by these Terms of Service. If you do not
              agree to these terms, please do not use VoxMap.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Description of Service</h2>
            <p>
              VoxMap is a live citizen sentiment mapping platform that allows users to vote on daily questions,
              create emergency pins, participate in community discussions, and view global opinion data on an
              interactive map. The service is provided free of charge.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. User Conduct</h2>
            <p className="mb-3">By using VoxMap, you agree not to:</p>
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <ul className="space-y-2 text-sm text-slate-400">
                <li>🚫 Post false emergency pins that could endanger others</li>
                <li>🚫 Use the platform to harass, threaten, or abuse others</li>
                <li>🚫 Post hate speech, violent content, or illegal material</li>
                <li>🚫 Attempt to manipulate votes through bots or multiple accounts</li>
                <li>🚫 Attempt to hack, exploit, or disrupt the service</li>
                <li>🚫 Impersonate other users or public figures</li>
                <li>🚫 Use the platform for spam, advertising, or commercial solicitation</li>
                <li>🚫 Post personal information of others without consent</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Content & Moderation</h2>
            <p>
              You are responsible for the content you post on VoxMap, including community posts, comments on pins,
              and uploaded photos. We reserve the right to remove any content that violates these terms without
              prior notice. Repeated violations may result in your device being blocked from the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Emergency Pins Disclaimer</h2>
            <p>
              VoxMap's emergency pin feature is a community tool and is NOT a replacement for official emergency
              services. In case of a real emergency, always contact your local emergency number (911, 112, 999, etc.)
              first. VoxMap does not guarantee the accuracy, timeliness, or reliability of emergency pins posted by users.
              We are not liable for any actions taken based on information from emergency pins.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Voting & Data Accuracy</h2>
            <p>
              VoxMap presents aggregated opinion data from anonymous users. Vote results reflect the opinions of
              participating users and should not be considered scientifically accurate polls or representative of
              any population. We do not guarantee the accuracy of location data, city comparisons, or vote counts.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Intellectual Property</h2>
            <p>
              VoxMap and its original content, features, and functionality are owned by VoxMap and are protected by
              international copyright and trademark laws. You may share your votes and screenshots of the platform,
              but you may not copy, reproduce, or redistribute the VoxMap software without permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Points & Gamification</h2>
            <p>
              Points, streaks, and "Voice of the Week" status are for engagement purposes only and hold no monetary
              value. We reserve the right to modify, reset, or remove the points system at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">9. Limitation of Liability</h2>
            <p>
              VoxMap is provided "as is" without warranties of any kind. We are not liable for any damages arising
              from your use of the platform, including but not limited to loss of data, service interruptions,
              or actions taken based on content posted by other users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">10. Changes to Terms</h2>
            <p>
              We may update these terms at any time. Changes will be posted on this page with an updated date.
              Continued use of VoxMap after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">11. Contact</h2>
            <p>
              For questions about these terms, contact us at:
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
          <div className="flex gap-4 justify-center mt-3">
            <Link href="/privacy" className="text-orange-400 hover:text-orange-300 text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link href="/" className="text-orange-400 hover:text-orange-300 text-sm transition-colors">
              ← Back to VoxMap
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
