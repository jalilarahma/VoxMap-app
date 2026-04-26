import type { Metadata } from "next";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "VoxMap — The Living Voice of the People",
  description:
    "One question. Every day. The world answers. Vote, see how your city compares globally, and earn your crown. Join the movement.",
  keywords: ["VoxMap", "world poll", "daily vote", "citizen voice", "global opinion", "sentiment map", "live poll", "emergency pins", "community"],
  manifest: "/manifest.json",
  themeColor: "#F59E0B",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VoxMap",
  },
  openGraph: {
    title: "VoxMap — The Living Voice of the People",
    description: "One question. Every day. The world answers. Vote, see how your city compares globally, and earn your crown.",
    type: "website",
    url: "https://vox-map-app.vercel.app",
    siteName: "VoxMap",
    images: [
      {
        url: "https://vox-map-app.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "VoxMap — The Living Voice of the People",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "VoxMap — The Living Voice of the People",
    description: "One question. Every day. The world answers. What do YOU think?",
    images: ["https://vox-map-app.vercel.app/og-image.png"],
    creator: "@voxmap",
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "og:image:type": "image/png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@300;400;500;600;700&display=swap"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-[#020617] min-h-screen text-white antialiased">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
