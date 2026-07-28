import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono, Manrope } from "next/font/google";
import "./globals.css";

const heading = Manrope({ subsets: ["latin"], variable: "--font-heading" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Automation Foundry — Hyperbrowser × Claude Opus 5",
  description: "Turn a plain-language web task into a tested browser automation.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
