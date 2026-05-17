import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flow — Agentic Housing",
  description: "Spawn, call, negotiate, pick, book.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
