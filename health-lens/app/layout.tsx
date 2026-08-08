import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HealthLens - Built with Hyperbrowser",
  description:
    "Compare your health data with recent medical studies. Powered by Hyperbrowser AI web scraping. Not for medical diagnosis.",
  icons: {
    icon: "/hyperbrowser_symbol-DARK.svg",
    shortcut: "/hyperbrowser_symbol-DARK.svg",
    apple: "/hyperbrowser_symbol-DARK.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.className} antialiased tracking-tight`}>
        {children}
      </body>
    </html>
  );
}
