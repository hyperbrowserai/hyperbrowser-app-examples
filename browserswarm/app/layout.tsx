import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Browserswarm. One brain, a swarm of browsers.",
  description:
    "One Kimi K3 context. A swarm of Hyperbrowser cloud browsers reading the web in parallel — every page streamed into a single shared memory. Built with Hyperbrowser.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${jetbrains.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
