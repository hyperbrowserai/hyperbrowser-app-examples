import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  weight: ["400", "600", "800"],
  subsets: ["latin"],
  variable: "--font-manrope",
});

const mono = JetBrains_Mono({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "WebMCP Census",
  description: "Which websites declare WebMCP tools for AI agents? A read-only census.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${mono.variable} antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
