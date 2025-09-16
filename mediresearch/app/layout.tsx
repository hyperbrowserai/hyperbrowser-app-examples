import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { manropeSemibold, dmSansMono } from "@/lib/fonts";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MediResearch",
  description: "MediResearch is a platform for deep-researching  your blood reports",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@600&family=DM+Mono:wght@400&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${manropeSemibold.variable} ${dmSansMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
