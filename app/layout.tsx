import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NEXA — Don't just plan. Execute.",
    template: "%s · NEXA",
  },
  description:
    "NEXA is an AI-powered personal execution system that turns your goals into adaptive plans and tells you the best thing to do next.",
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
