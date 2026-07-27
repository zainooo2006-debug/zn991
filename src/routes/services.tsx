import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { getServiceCategories } from "@/lib/catalog.functions";
import { resolveImage } from "@/lib/asset-map";

const servicesQO = queryOptions({ queryKey: ["services"], queryFn: () => getServiceCategories() });

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "الخدمات — زين" },
      { name: "description", content: "خدمات احترافية للعناية بسيارتك: PPF، نانو سيراميك، تنجيد، سمكرة ورش، كهرباء، واكسسوارات." },
      { property: "og:title", content: "الخدمات — زين" },
      { property: "og:description", content: "خدمات احترافية للعناية بسيارتك: PPF، نانو سيراميك، تنجيد، سمكرة ورش، كهرباء، واكسسوارات." },
      { property: "og:url", content: "https://tajalmoluk.lovable.app/services" },
      { property: "og:type", content: "website" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(servicesQO),
  component: ServicesPage,
});

function ServicesPage() {
  const { data: services } = useSuspenseQuery(servicesQO);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? services.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.short_desc?.toLowerCase().includes(q) ?? false),
      )
    : services;
  return (
    <Shell>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl md:text-4xl font-black">خدماتنا الاحترافية</h1>
        <p className="text-[var(--color-ink-soft)] mt-2">11 خدمة متكاملة لراحتك — تنفذها أيدي خبراء.</p>

        <div className="mt-6">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن خدمة..."
            className="w-full bg-white border-2 border-blue-200 focus:border-[var(--color-gold)] outline-none rounded-full py-2 px-4 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {filtered.map((s) => (
            <Link
              key={s.id}
              to="/services/$slug"
              params={{ slug: s.slug }}
              className="card-clean p-5 group flex flex-col"
            >
              <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-[var(--color-surface)]">
                <img
                  src={resolveImage(s.image_url)}
                  alt={s.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
              </div>
              <h3 className="text-lg font-bold mt-3">{s.name}</h3>
              <p className="text-sm text-[var(--color-ink-soft)] mt-1 flex-1">{s.short_desc}</p>
              <span className="text-sm text-[var(--color-gold)] font-semibold mt-3 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                التفاصيل <ArrowLeft className="w-4 h-4" />
              </span>
            </Link>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-[var(--color-ink-soft)] py-12">لا توجد نتائج مطابقة.</p>
        )}
      </div>
    </Shell>
  );
}
