import type { StaticImageData } from "next/image";

export function assetUrl(asset: string | StaticImageData) {
  return typeof asset === "string" ? asset : asset.src;
}
