import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  Zap,
  Sparkles,
  Droplets,
  Wind,
  Sticker,
  Cog,
  Palette,
  ShieldCheck,
  Truck,
  Star,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { ProductCard } from "@/components/shop/ProductCard";
import { FeaturedSlider } from "@/components/home/FeaturedSlider";
import { HeroSlider } from "@/components/home/HeroSlider";
import { SeasonalBanner } from "@/components/home/SeasonalBanner";
import { CustomerReviewsSection } from "@/components/home/CustomerReviewsSection";
import {
  getCategories,
  getProducts,
  getPackages,
  getFeaturedProducts,
  getServiceCategories,
} from "@/lib/catalog.functions";
import { useSiteContentValue, withMissingSections, type HomeSectionId } from "@/lib/site-content";
import { resolveImage } from "@/lib/asset-map";

const iconMap: Record<string, LucideIcon> = {
  Zap,
  Sparkles,
  Droplets,
  Wind,
  Sticker,
  Cog,
  Palette,
};

const catsQO = queryOptions({ queryKey: ["categories"], queryFn: () => getCategories() });
const productsQO = queryOptions({ queryKey: ["products"], queryFn: () => getProducts() });
const packagesQO = queryOptions({ queryKey: ["packages"], queryFn: () => getPackages() });
const featuredQO = queryOptions({
  queryKey: ["featured-products"],
  queryFn: () => getFeaturedProducts(),
});
const servicesQO = queryOptions({ queryKey: ["services"], queryFn: () => getServiceCategories() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZAIN — زين أصل الحماية" },
      {
        name: "description",
        content: "زين أصل الحماية — نانو سيراميك، PPF، عزل حراري، تنجيد وإكسسوارات فاخرة لسيارتك.",
      },
      { property: "og:title", content: "ZAIN — زين أصل الحماية" },
      {
        property: "og:description",
        content: "زين أصل الحماية — نانو سيراميك، PPF، عزل حراري، تنجيد وإكسسوارات فاخرة.",
      },
      { property: "og:url", content: "https://zn991.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://zn991.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "زين أصل الحماية",
          description: "نانو سيراميك، PPF، عزل حراري، تنجيد وإكسسوارات السيارات الفاخرة في صنعاء.",
          url: "https://zn991.lovable.app/",
          telephone: "+967773144403",
          address: {
            "@type": "PostalAddress",
            streetAddress: "شارع الخمسين، جوار اس بي سي مول",
            addressLocality: "صنعاء",
            addressCountry: "YE",
          },
          areaServed: { "@type": "City", name: "صنعاء" },
          openingHours: "Sa-Th 09:00-23:00",
          sameAs: ["https://instagram.com/z_n.9.9"],
        }),
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catsQO);
    context.queryClient.ensureQueryData(productsQO);
    context.queryClient.ensureQueryData(packagesQO);
    context.queryClient.ensureQueryData(featuredQO);
    context.queryClient.ensureQueryData(servicesQO);
  },
  component: HomePage,
});

function HomePage() {
  const { data: categories } = useSuspenseQuery(catsQO);
  const { data: products } = useSuspenseQuery(productsQO);
  const { data: packages } = useSuspenseQuery(packagesQO);
  const { data: featured } = useSuspenseQuery(featuredQO);
  const { data: services } = useSuspenseQuery(servicesQO);
  const bestSellers = products.filter((p) => p.is_bestseller).slice(0, 4);

  const sectionsConfig = useSiteContentValue("home_sections");
  const banner = useSiteContentValue("home_banner");
  const sliderSettings = useSiteContentValue("featured_slider");

  const sectionMap: Record<HomeSectionId, ReactNode> = {
    quick_access: (
      <section key="quick_access" className="max-w-7xl mx-auto px-4 pt-6 md:pt-8">
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <Link
            to="/centers"
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[var(--color-hairline)] bg-white hover:border-[var(--color-gold)] hover:bg-[var(--color-gold-soft)] text-[var(--color-ink)] font-bold py-3 md:py-4 transition"
            aria-label="المراكز المعتمدة"
          >
            <MapPin className="w-5 h-5 text-[var(--color-gold)]" />
            <span>المراكز</span>
          </Link>
          <Link
            to="/warranty"
            className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 md:py-4 transition shadow"
            aria-label="الضمانات"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>الضمانات</span>
          </Link>
        </div>
      </section>
    ),
    categories: (
      <section key="categories" className="max-w-7xl mx-auto px-4 py-8 md:py-10">
        <div className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar pb-2">
          {categories.map((c) => {
            const Icon = iconMap[c.icon ?? "Sparkles"] ?? Sparkles;
            return (
              <Link
                key={c.id}
                to="/shop"
                search={{ cat: c.slug } as never}
                className="flex flex-col items-center gap-2 shrink-0"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[var(--color-surface)] border border-[var(--color-hairline)] flex items-center justify-center hover:border-[var(--color-gold)] transition">
                  <Icon className="w-7 h-7 md:w-8 md:h-8 text-[var(--color-gold)]" />
                </div>
                <span className="text-xs md:text-sm text-[var(--color-ink)] font-semibold">
                  {c.name}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    ),
    services: (
      <section key="services" className="max-w-7xl mx-auto px-4 py-8 md:py-10">
        <SectionTitle title="خدماتنا" subtitle="خدمات احترافية للعناية بسيارتك" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mt-6">
          {services.slice(0, 8).map((s) => (
            <Link
              key={s.id}
              to="/services/$slug"
              params={{ slug: s.slug }}
              className="card-clean overflow-hidden group flex flex-col"
            >
              <div className="w-full aspect-[4/3] bg-[var(--color-surface)] overflow-hidden">
                <img
                  src={resolveImage(s.image_url)}
                  alt={s.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
              </div>
              <div className="p-3">
                <h3 className="text-sm md:text-base font-bold line-clamp-1">{s.name}</h3>
                {s.short_desc && (
                  <p className="text-xs text-[var(--color-ink-soft)] mt-1 line-clamp-2">
                    {s.short_desc}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link to="/services" className="btn-outline">
            عرض جميع الخدمات
          </Link>
        </div>
      </section>
    ),
    featured: (
      <FeaturedSlider
        key="featured"
        products={featured}
        autoplay={sliderSettings.autoplay}
        speedSeconds={sliderSettings.speedSeconds}
      />
    ),
    hot_deals: (
      <section key="hot_deals" className="max-w-7xl mx-auto px-4 py-8">
        <SectionTitle title="🔥 العروض المميزة" subtitle="بكجات حصرية لفترة محدودة" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {packages.map((p) => (
            <Link key={p.id} to="/offers" className="card-clean group flex flex-col p-5 relative">
              {p.badge && (
                <span className="absolute top-3 left-3 bg-[var(--color-gold)] text-[var(--color-ink)] text-[10px] font-bold px-2 py-1 rounded-full">
                  {p.badge}
                </span>
              )}
              <h3 className="text-xl font-bold">{p.name}</h3>
              <p className="text-sm text-[var(--color-ink-soft)] mt-1">{p.description}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-[var(--color-ink-soft)] flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-[var(--color-gold)] mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="price text-xl">{p.price}</span>
                {p.old_price && (
                  <span className="text-xs text-[var(--color-ink-soft)] line-through">
                    {p.old_price}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    ),
    best_sellers: (
      <section key="best_sellers" className="max-w-7xl mx-auto px-4 py-8">
        <SectionTitle title="الأكثر مبيعاً" subtitle="منتجات يثق بها عملاؤنا" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mt-6">
          {bestSellers.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link to="/shop" className="btn-outline">
            عرض جميع المنتجات
          </Link>
        </div>
      </section>
    ),
    trust: (
      <section
        key="trust"
        className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {[
          { Icon: ShieldCheck, title: "ضمان الجودة", text: "منتجات أصلية بأعلى المعايير" },
          { Icon: Truck, title: "خدمة منزلية VIP", text: "فريقنا يصلك أينما كنت في صنعاء" },
          { Icon: Star, title: "تقييم ممتاز", text: "آلاف العملاء يثقون بنا" },
        ].map(({ Icon, title, text }) => (
          <div key={title} className="card-clean p-5 flex items-start gap-3">
            <Icon className="w-7 h-7 text-[var(--color-gold)] shrink-0" />
            <div>
              <h4 className="font-bold">{title}</h4>
              <p className="text-sm text-[var(--color-ink-soft)] mt-1">{text}</p>
            </div>
          </div>
        ))}
      </section>
    ),
    reviews: <CustomerReviewsSection key="reviews" />,
  };

  const orderedIds = withMissingSections(
    sectionsConfig.order.length
      ? sectionsConfig.order
      : ([
          "quick_access",
          "categories",
          "services",
          "featured",
          "hot_deals",
          "best_sellers",
          "trust",
          "reviews",
        ] as HomeSectionId[]),
  );
  const hiddenSet = new Set(sectionsConfig.hidden);

  return (
    <Shell>
      {/* HERO SLIDER — always first, not reorderable/hideable (it's the page identity) */}
      <HeroSlider />

      {/* SEASONAL BANNER — shown only when enabled from the dashboard */}
      <SeasonalBanner banner={banner} />

      {orderedIds.filter((id) => !hiddenSet.has(id) && sectionMap[id]).map((id) => sectionMap[id])}
    </Shell>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="text-2xl md:text-3xl font-black">{title}</h2>
        {subtitle && <p className="text-sm text-[var(--color-ink-soft)] mt-1">{subtitle}</p>}
      </div>
      <div className="h-1 w-16 bg-[var(--color-gold)] rounded-full hidden md:block" />
    </div>
  );
}
