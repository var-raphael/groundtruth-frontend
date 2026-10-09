export const ASSET_V = process.env.NEXT_PUBLIC_ASSET_V ?? "dev";

export function withV(src: string): string {
  if (!src.startsWith("/")) return src;
  return `${src}${src.includes("?") ? "&" : "?"}v=${ASSET_V}`;
}