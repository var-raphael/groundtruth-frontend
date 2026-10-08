// One random number per build/server start, shared by the whole site.
// Appended to image URLs as ?v=... so every deploy busts browser and social caches.
export const ASSET_V = Math.floor(Math.random() * 1_000_000_000);

// Adds ?v= to local paths ("/x.png"). External URLs are left untouched.
export function withV(src: string): string {
  if (!src.startsWith("/")) return src;
  return `${src}${src.includes("?") ? "&" : "?"}v=${ASSET_V}`;
}
