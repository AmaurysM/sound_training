import type { Metadata, Viewport } from "next"; // ← Add Viewport import
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "NATA Training Tracker",
  description: "Track and manage athletic training progress",
  // ← Remove viewport from here
};

// ← Add separate viewport export
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-blue-50">
      <head>
        {/* ← You can remove this meta tag too, Next.js handles it now */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-blue-50`}
      >
        {children}
      </body>
    </html>
  );
}