import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Human Fallback - Hyperbrowser + Human Pages",
  description: "Scrape any page with Hyperbrowser. When automation fails, hire a real human via Human Pages.",
  keywords: "web scraping, human fallback, CAPTCHA bypass, Hyperbrowser, Human Pages",
  authors: [{ name: "Hyperbrowser" }],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32', type: 'image/x-icon' },
    ],
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
