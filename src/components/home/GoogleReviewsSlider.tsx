import { useEffect, useState } from "react";
import { Star, MapPin } from "lucide-react";
import { useSiteContentValue } from "@/lib/site-content";

export function GoogleReviewsSlider() {
  const content = useSiteContentValue("google_reviews");
  const [active, setActive] = useState(0);
  const items = content.items ?? [];

  useEffect(() => {
    if (!content.enabled || !content.autoplay || items.length < 2) return;
    const t = setInterval(
      () => setActive((i) => (i + 1) % items.length),
      Math.max(1, content.speedSeconds) * 1000,
    );
    return () => clearInterval(t);
  }, [content.enabled, content.autoplay, content.speedSeconds, items.length]);

  // Nothing configured yet — render nothing rather than an empty section.
  if (!content.enabled || items.length === 0) return null;

  const current = items[Math.min(active, items.length - 1)];

  return (
    <section className="py-14 bg-[var(--color-surface)]">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-center gap-2 mb-6">
          <MapPin className="w-5 h-5 text-[var(--color-gold)]" />
          <h2 className="text-2xl md:text-3xl font-black">تقييمات عملائنا على خرائط جوجل</h2>
        </div>

        <div className="card-clean p-6 md:p-8 text-center min-h-[220px] flex flex-col items-center justify-center transition-opacity duration-500">
          <div key={current.id} className="animate-in fade-in duration-500">
            <div className="flex justify-center gap-0.5 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`w-5 h-5 ${n <= current.rating ? "fill-[var(--color-gold)] text-[var(--color-gold)]" : "text-[var(--color-hairline)]"}`}
                />
              ))}
            </div>
            <p className="text-base md:text-lg leading-relaxed text-[var(--color-ink)]">
              {current.text}
            </p>
            <div className="mt-4 font-bold">{current.name}</div>
            <div className="text-xs text-[var(--color-ink-soft)] mt-1">تقييم عبر خرائط جوجل</div>
          </div>
        </div>

        {items.length > 1 && (
          <div className="flex justify-center gap-2 mt-5">
            {items.map((it, i) => (
              <button
                key={it.id}
                type="button"
                aria-label={`الانتقال إلى تقييم ${i + 1}`}
                onClick={() => setActive(i)}
                className={`w-2.5 h-2.5 rounded-full transition ${
                  i === active ? "bg-[var(--color-gold)]" : "bg-[var(--color-hairline)]"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
