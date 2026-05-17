import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Lead Finder — Find Anyone. Analyze Everything.",
  description:
    "Universal AI-powered lead generation tool. Find buyers, influencers, distributors, partners, investors and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
