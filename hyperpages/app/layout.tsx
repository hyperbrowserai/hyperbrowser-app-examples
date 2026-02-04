import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HyperPages - AI-Powered Research Pages",
  description: "Built with Hyperbrowser",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
