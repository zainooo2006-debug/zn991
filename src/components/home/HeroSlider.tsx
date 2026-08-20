import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight } from "lucide-react";
import hero1 from "@/assets/hero/hero-1.jpg.asset.json";
import hero2 from "@/assets/hero/hero-2.png.asset.json";
import hero3 from "@/assets/hero/hero-3.png.asset.json";
import hero4 from "@/assets/hero/hero-4.png.asset.json";
import { listPublicHeroSlides } from "@/lib/hero-slides.functions";

type Slide = { key: string; url: string; alt?: string | null };
const FALLBACK_ALTS = [
  "سيارة فاخرة بعد تلميع ونانو سيراميك في مركز زين أصل الحماية بصنعاء",
  "تركيب فيلم حماية الطلاء PPF على سيارة في مركز زين",
  "عزل حراري لزجاج السيارات من زين أصل الحماية",
  "تنجيد داخلي فاخر وإكسسوارات سيارات من زين",
];
const FALLBACK: Slide[] = [hero1, hero2, hero3, hero4].map((s, idx) => ({
  key: s.asset_id,
  url: s.url,
  alt: FALLBACK_ALTS[idx],
}));
const INTERVAL = 5500;

export function HeroSlider() {
  const fetchSlides = useServerFn(listPublicHeroSlides);
  const { data: remote } = useQuery({
    queryKey: ["hero-slides"],
    queryFn: () => fetchSlides(),
    staleTime: 60_000,
  });
  const SLIDES: Slide[] =
    remote && remote.length > 0
      ? remote.map((s) => ({ key: s.id, url: s.image_url, alt: s.alt_text }))
      : FALLBACK;

  const [i, setI] = useState(0);
  const timer = useRef<number | null>(null);
  const touchStart = useRef<number | null>(null);

  const goTo = useCallback((n: number) => {
    setI(((n % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);
  const next = useCallback(() => goTo(i + 1), [i, goTo]);
  const prev = useCallback(() => goTo(i - 1), [i, goTo]);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(next, INTERVAL);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [i, next]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 40) {
      // RTL: swipe right => previous
      dx > 0 ? prev() : next();
    }
    touchStart.current = null;
  };

  return (
    <section
      className="relative w-full bg-black overflow-hidden select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carousel"
      aria-label="عرض ZAIN"
    >
      <div className="relative h-[60vh] min-h-[420px] md:h-[78vh] md:min-h-[560px] max-h-[820px]">
        {SLIDES.map((s, idx) => (
          <div
            key={s.key}
            className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
              idx === i ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={idx !== i}
          >
            <img
              src={s.url}
              alt={s.alt ?? ""}
              className={`w-full h-full object-cover ${
                idx === i ? "scale-105 transition-transform duration-[6000ms] ease-out" : "scale-100"
              }`}
              fetchPriority={idx === 0 ? "high" : "low"}
              loading={idx === 0 ? "eager" : "lazy"}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />
          </div>
        ))}

        {/* Overlay text */}
        <div className="absolute inset-0 flex flex-col items-center justify-end md:justify-center text-center px-6 pb-24 md:pb-0">
          <div key={i} className="animate-[fadeUp_900ms_ease-out] max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-2xl">
              <span className="text-[var(--color-gold)]">ZAIN</span>{" "}
              <span className="block md:inline mt-2 md:mt-0">أصل الحماية</span>
            </h1>
            <p className="mt-4 md:mt-6 text-base md:text-xl text-white/90 max-w-xl mx-auto">
              نانو سيراميك · PPF · عزل حراري · تنجيد فاخر · اكسسوارات أصلية
            </p>
          </div>
        </div>
      </div>

      {/* Arrows */}
      <button
        onClick={prev}
        aria-label="السابق"
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-[var(--color-gold)] hover:text-black text-white items-center justify-center backdrop-blur-sm transition"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
      <button
        onClick={next}
        aria-label="التالي"
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-[var(--color-gold)] hover:text-black text-white items-center justify-center backdrop-blur-sm transition"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            aria-label={`الشريحة ${idx + 1}`}
            className={`h-2 rounded-full transition-all ${
              idx === i ? "w-8 bg-[var(--color-gold)]" : "w-2 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
