import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Human Development Assessment",
  description:
    "A deployable self-assessment website with auto-scoring, AI reflection scoring, human review, and compliance-oriented email preferences.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="container" style={{ paddingBottom: 0 }}>
          <div className="nav" style={{ marginBottom: 20 }}>
            <Link className="tablink" href="/">
              Home
            </Link>
            <Link className="tablink" href="/assessment">
              Assessment
            </Link>
            <Link className="tablink" href="/privacy">
              Privacy
            </Link>
            <Link className="tablink" href="/terms">
              Terms
            </Link>
          </div>
        </div>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
