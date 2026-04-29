import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Converge Editor",
  description: "Browser-based playbook editor POC for Converge.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
