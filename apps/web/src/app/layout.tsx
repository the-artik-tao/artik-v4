import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UI/UX Agent Platform",
  description: "Cursor for React/UX - AI-powered UI development",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
