"use client";

import { useState } from "react";
import BrandLogos from "@/components/brand/BrandLogos";

type Props = {
  src: string;
  aspectRatio: string;
  label: string;
  mode?: "landscape" | "portrait";
  maxHeight?: number;
};

export default function SagaHeroMedia({ src, aspectRatio, label, mode = "landscape", maxHeight }: Props) {
  const [failed, setFailed] = useState(false);

  const style = {
    width: "100%",
    display: "block",
    aspectRatio,
    objectFit: "cover" as const,
    maxHeight: maxHeight ? `${maxHeight}px` : undefined,
    margin: mode === "portrait" ? "0 auto" : undefined,
  };

  if (failed) {
    return (
      <div
        style={{
          ...style,
          display: "grid",
          placeItems: "center",
          padding: 16,
          background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,236,218,0.92))",
          color: "#203126",
          textAlign: "center",
        }}
      >
        <div style={{ display: "grid", gap: 10, justifyItems: "center" }}>
          <BrandLogos variant={mode === "portrait" ? "badge" : "ip-secondary"} />
          <div style={{ fontWeight: 700 }}>{label}</div>
          <div style={{ color: "#65786a", fontSize: 14 }}>
            Visual da saga Baribudos em preparação para este dispositivo.
          </div>
        </div>
      </div>
    );
  }

  return (
    <video
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
      style={style}
      aria-label={label}
    />
  );
}
