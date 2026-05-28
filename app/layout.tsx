import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Check-in",
  description: "FIS check-in / check-out",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="font-sans">{children}</body>
    </html>
  );
}
