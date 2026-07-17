// Maps DB image filenames (or paths containing them) to bundled asset URLs.
import shampoo from "@/assets/p-shampoo.jpg";
import freshener from "@/assets/p-freshener.jpg";
import led from "@/assets/p-led.jpg";
import ceramic from "@/assets/p-ceramic.jpg";
import steering from "@/assets/p-steering.jpg";
import cleaner from "@/assets/p-cleaner.jpg";
import sticker from "@/assets/p-sticker.jpg";
import brake from "@/assets/p-brake.jpg";
import leather from "@/assets/p-leather.jpg";
import hero from "@/assets/hero-car.jpg";
import sPpf from "@/assets/s-ppf.jpg";
import sCeramic from "@/assets/s-ceramic.jpg";
import sInterior from "@/assets/s-interior.jpg";

const map: Record<string, string> = {
  "p-shampoo.jpg": shampoo,
  "p-freshener.jpg": freshener,
  "p-led.jpg": led,
  "p-ceramic.jpg": ceramic,
  "p-steering.jpg": steering,
  "p-cleaner.jpg": cleaner,
  "p-sticker.jpg": sticker,
  "p-brake.jpg": brake,
  "p-leather.jpg": leather,
  "hero-car.jpg": hero,
  "s-ppf.jpg": sPpf,
  "s-ceramic.jpg": sCeramic,
  "s-interior.jpg": sInterior,
};

// Rewrite Supabase public storage URLs (bucket: media) to same-origin proxy path
// to avoid client-side DNS/network blocking of *.supabase.co in some regions.
const SUPABASE_PUBLIC_MEDIA_RE =
  /^https?:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/media\/(.+)$/i;

export function toProxyUrl(src: string): string {
  const m = src.match(SUPABASE_PUBLIC_MEDIA_RE);
  if (!m) return src;
  // Preserve any query string on the last segment
  return `/api/public/img/${m[1]}`;
}

export function resolveImage(src: string | undefined | null): string {
  if (!src) return shampoo;
  const file = src.split("/").pop()?.split("?")[0] ?? "";
  if (map[file]) return map[file];
  return toProxyUrl(src);
}

export { hero as heroImage };
