import type { Metadata } from "next";
import { Manrope, DM_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["500"], // Medium weight
});

export const metadata: Metadata = {
  title: "Hyperleads- AI-Powered Lead Research",
  description: "Stop hunting leads manually. AI-powered Hyperleads research across Yelp, Google Maps & Yellow Pages with live progress tracking.",
  icons: {
    icon: '/Logo.svg',
    shortcut: '/Logo.svg',
    apple: '/Logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode; 
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${dmMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="px-4 py-6 md:py-10">{children}</main>
        <footer className="mt-16 py-6">
          <div className="max-w-4xl mx-auto px-4 text-center text-xs text-muted-foreground">
            <p>
              <strong>Built with <a href="https://hyperbrowser.ai" target="_blank" rel="noopener noreferrer" className="underline">Hyperbrowser</a></strong>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
