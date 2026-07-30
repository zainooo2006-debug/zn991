import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import type { HomeBannerContent } from "@/lib/site-content";

/**
 * Seasonal banner shown below the hero slider when enabled from the dashboard.
 * Supports zero images (solid color), one image (static), or multiple images
 * (auto-rotating slider, same idea as the hero slider).
 */
export function SeasonalBanner({ banner }: { banner: HomeBannerContent }) {
  const images = (banner.bgImages ?? []).filter(Boolean);
  const [i, setI] = useState(0);
  const timer = useRef<number | null>(null);
  const touchStart = useRef<number | null>(null);

  const goTo = useCallback(
    (n: number) => {
      if (images.length === 0) return;
      setI(((n % images.length) + images.length) % images.length);
    },
    [images.length],
  );
  const next = useCallback(() => goTo(i + 1), [i, goTo]);
  const prev = useCallback(() => goTo(i - 1), [i, goTo]);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (!banner.autoplay || images.length < 2) return;
    const ms = Math.max(1, banner.speedSeconds || 5) * 1000;
    timer.current = window.setTimeout(next, ms);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [i, next, banner.autoplay, banner.speedSeconds, images.length]);

  if (!banner.enabled) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current == null || images.length < 2) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 40) {
      dx > 0 ? prev() : next();
    }
    touchStart.current = null;
  };

  const hasImages = images.length > 0;
  const heightStyle = banner.heightPx > 0 ? `${banner.heightPx}px` : hasImages ? "220px" : undefined;

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ backgroundColor: banner.bgColor, height: heightStyle }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Rotating background images */}
      {hasImages &&
        images.map((url, idx) => (
          <div
            key={url + idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
              idx === i ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={idx !== i}
          >
            <img src={url} alt="" className="w-full h-full object-cover" loading={idx === 0 ? "eager" : "lazy"} />
            <div className="absolute inset-0" style={{ backgroundColor: banner.bgColor, opacity: 0.45 }} />
          </div>
        ))}

      {/* Text + button */}
      <div
        className={`relative z-10 max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-right ${
          hasImages ? "h-full py-4" : "py-4"
        }`}
        style={{ color: banner.textColor }}
      >
        <div>
          <h3 className="font-black text-lg">{banner.title}</h3>
          {banner.subtitle && <p className="text-sm opacity-90">{banner.subtitle}</p>}
        </div>
        {banner.buttonText && (
          <Link
            to={banner.buttonLink || "/"}
            className="shrink-0 rounded-full px-5 py-2 font-bold bg-black/10 hover:bg-black/20 transition"
            style={{ color: banner.textColor }}
          >
            {banner.buttonText}
          </Link>
        )}
      </div>

      {/* Dots (only when more than one image) */}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              aria-label={`الصورة ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
