import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CallMyAgent — Find. Negotiate. Book.",
  description:
    "AI agents that find rentals, call to negotiate, and book the best one for you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#fafafa] text-[#0a0a0a]">
        {children}
      </body>
    </html>
  );
}
