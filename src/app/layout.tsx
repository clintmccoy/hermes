import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hermes — CRE Underwriting",
  description: "Agentic CRE financial underwriting platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
