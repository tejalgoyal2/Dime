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
          background: "#0a0a0a",
          borderRadius: "50%",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "2px solid #e85d3a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#f0a830",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          ¢
        </div>
      </div>
    ),
    { ...size }
  );
}
