import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://link.skalarsolutions.com"),
  title: "Skalar Link",
  description: "Bikin shortlink branded dengan domain Skalar.",
  openGraph: {
    title: "Skalar Link",
    description: "Bikin shortlink branded dengan domain Skalar.",
    url: "https://link.skalarsolutions.com",
    siteName: "Skalar Solutions",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Skalar Link by Skalar Solutions",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Skalar Link",
    description: "Bikin shortlink branded dengan domain Skalar.",
    images: ["/twitter-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}