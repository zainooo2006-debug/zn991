import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { resolveImage } from "@/lib/asset-map";

export interface FeaturedProduct {
  id: string;
  name: string;
  price: number;
  old_price: number | null;
  images: string[];
  rating: number;
}

export function FeaturedSlider({
  products,
  autoplay = true,
  speedSeconds = 3,
}: {
  products: FeaturedProduct[];
  autoplay?: boolean;
  speedSeconds?: number;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const hovering = useRef(false);

  if (!products.length) return null;

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  // Autoplay: move one card to the left (RTL "next") every `speedSeconds`,
  // looping back to the start once it reaches the end. Pauses on hover/touch
  // so people can browse without the slider fighting them.
  useEffect(() => {
    if (!autoplay || products.length < 2) return;
    const ms = Math.max(1, speedSeconds || 3) * 1000;
    const id = window.setInterval(() => {
      const el = scrollerRef.current;
      if (!el || hovering.current) return;
      const atEnd = el.scrollLeft <= -(el.scrollWidth - el.clientWidth - 4);
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: -(el.clientWidth * 0.35), behavior: "smooth" });
      }
    }, ms);
    return () => window.clearInterval(id);
  }, [autoplay, speedSeconds, products.length]);

  return (
    <section className="max-w-7xl mx-auto px-4 py-8 md:py-10">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--color-gold)]" />
            <h2 className="text-2xl md:text-3xl font-black">المنتجات المميزة</h2>
          </div>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">اختيارات فاخرة منتقاة بعناية</p>
        </div>
        <div className="hidden md:flex gap-2">
          {/* In RTL, scrolling "right" visually means scrollBy negative left */}
          <button
            onClick={() => scrollBy(1)}
            aria-label="السابق"
            className="w-10 h-10 rounded-full border border-[var(--color-hairline)] bg-[var(--color-card,white)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] flex items-center justify-center transition shadow-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => scrollBy(-1)}
            aria-label="التالي"
            className="w-10 h-10 rounded-full border border-[var(--color-hairline)] bg-[var(--color-card,white)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] flex items-center justify-center transition shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onMouseEnter={() => (hovering.current = true)}
        onMouseLeave={() => (hovering.current = false)}
        onTouchStart={() => (hovering.current = true)}
        onTouchEnd={() => (hovering.current = false)}
        className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 -mx-4 px-4 scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {products.map((p) => {
          const img = resolveImage(p.images?.[0]);
          return (
            <Link
              key={p.id}
              to="/product/$id"
              params={{ id: p.id }}
              className="group snap-start shrink-0 w-[70%] sm:w-[45%] md:w-[30%] lg:w-[23%] card-clean overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-square overflow-hidden bg-[var(--color-surface)]">
                <img
                  src={img}
                  alt={p.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <span className="absolute top-3 right-3 bg-[var(--color-gold)] text-[var(--color-ink)] text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> مميز
                </span>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold line-clamp-2 min-h-[2.5rem]">{p.name}</h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="price text-lg">{Number(p.price).toLocaleString()} ر.ي</span>
                  {p.old_price && (
                    <span className="text-xs text-[var(--color-ink-soft)] line-through">
                      {Number(p.old_price).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
