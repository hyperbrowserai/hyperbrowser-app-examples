import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HyperGrowth | Community Signal Miner",
  description:
    "Mine developer communities for growth signals, pain clusters, and GTM plays with Hyperbrowser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
