import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glidepath Solutions | EVcapture",
  description: "Mobile-first site survey capture for Glidepath Solutions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
