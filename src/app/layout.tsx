import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STAKD — Collector OS",
  description: "Track, value, and discover collectibles. The operating system for collectors.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[var(--color-bg)] antialiased">
        {children}
      </body>
    </html>
  );
}
