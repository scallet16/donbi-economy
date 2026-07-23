"use client";

import Image from "next/image";
import { useState } from "react";

export function CharacterImage({ src, alt, mood = "guide" }: { src: string; alt: string; mood?: "guide" | "celebrate" | "word" }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`character-fallback ${mood}`} role="img" aria-label={alt}>돈비</div>;
  return <Image className={`character-image ${mood}`} src={src} alt={alt} width={512} height={512} onError={() => setFailed(true)} />;
}
