"use client";

import { Button } from "@/components/ui/Button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 24,
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 22, margin: 0 }}>Application error</h1>
        <p style={{ color: "#64748b", maxWidth: 420 }}>
          A critical error occurred. Please reload or try again.
        </p>
        <button
          onClick={reset}
          style={{
            background: "#4f46e5",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "10px 18px",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
