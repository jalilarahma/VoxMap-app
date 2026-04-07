import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoxMap — The Living Voice of the People",
  description:
    "Real-time citizen sentiment mapping. Vote on daily questions, drop emergency pins, and see how the world really feels.",
  keywords: ["sentiment", "polls", "map", "citizen", "voice", "emergency"],
  openGraph: {
    title: "VoxMap",
    description: "The Living Voice of the People",
    type: "website",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="bg-[#0A0A0A] min-h-screen text-white antialiased noise-bg">
        {children}
      </body>
    </html>
  );
}
