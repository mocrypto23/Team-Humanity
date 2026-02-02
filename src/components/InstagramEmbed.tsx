"use client";

import Script from "next/script";
import { useEffect } from "react";

export default function InstagramEmbed({ url }: { url: string }) {
  useEffect(() => {
    if (window?.instgrm?.Embeds?.process) {
      window.instgrm.Embeds.process();
    }
  }, [url]);

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200/70 bg-white">
      <Script
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
        onLoad={() => {
          if (window?.instgrm?.Embeds?.process) {
            window.instgrm.Embeds.process();
          }
        }}
      />

      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{ background: "#fff", border: 0, margin: "0 auto", maxWidth: 540, width: "100%" }}
      />
    </div>
  );
}
