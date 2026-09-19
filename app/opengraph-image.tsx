import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "E-Commerce Premium";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 78% 18%, rgba(115,237,255,.20), transparent 30%), radial-gradient(circle at 18% 78%, rgba(216,183,109,.14), transparent 28%), #05070c",
        color: "#f6f8fb",
        fontFamily: "Arial, sans-serif",
      }}>
        <div style={{
          width: 1030,
          height: 490,
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 36,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "54px 64px",
          background: "rgba(255,255,255,.035)",
        }}>
          <div style={{ color: "#73edff", fontSize: 22, letterSpacing: "0.18em", display: "flex" }}>
            INDEPENDENT COMMERCE INFRASTRUCTURE
          </div>
          <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.02, marginTop: 20, display: "flex" }}>
            E-Commerce <span style={{ color: "#d8b76d" }}>Premium</span>
          </div>
          <div style={{ color: "#9aa6b8", fontSize: 28, marginTop: 24, display: "flex" }}>
            Build · Sell · Grow
          </div>
        </div>
      </div>
    ),
    size,
  );
}
