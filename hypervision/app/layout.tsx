import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HyperVision - AI Perception Analysis",
  description: "Visualize how AI perceives webpages using Hyperbrowser",
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
