import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgriNexus ProofOS",
  description: "Evidence-driven agricultural decision intelligence — early demo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
