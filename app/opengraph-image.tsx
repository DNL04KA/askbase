import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Askbase — Turn Your Docs Into an AI Chatbot";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #12142a 0%, #1c1440 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 40,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgba(124,92,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
            }}
          >
            🤖
          </div>
          Askbase
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 64,
            fontWeight: 700,
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.15,
          }}
        >
          Turn Your Docs Into an AI Chatbot
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 28,
            color: "rgba(236,238,252,0.7)",
          }}
        >
          RAG-powered answers · Embeddable widget · Set up in 5 minutes
        </div>
      </div>
    ),
    size
  );
}
