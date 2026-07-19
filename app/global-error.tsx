"use client";

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
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#12142a",
          color: "#eceefc",
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ opacity: 0.7, marginBottom: 20 }}>
            An unexpected error occurred.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#7c5cff",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
