import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d0d0d",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 32 32">
          <path
            d="M16 4 L26 16 L16 28 L6 16 Z"
            stroke="#00ff88"
            strokeWidth="2.5"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M16 10 L21 16 L16 22 L11 16 Z"
            fill="#00ff88"
            fillOpacity="0.3"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
