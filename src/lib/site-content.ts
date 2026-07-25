import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getSiteContent } from "@/lib/catalog.functions";

/**
 * Editable-content system for static pages (About, Contact, Footer, ...).
 *
 * How it works:
 * - All values live in the existing `site_content` table (key/value, already
 *   in production, already has a public-read RLS policy — no schema change).
 * - Every field has a hard-coded DEFAULT equal to the current site text.
 *   If the admin never edits anything, the site renders exactly as before.
 * - Editing a field from the dashboard just upserts the matching key.
 */

export type AboutContent = {
  intro1: string;
  intro2: string;
  missionTitle: string;
  missionText: string;
  valuesTitle: string;
  valuesText: string;
  teamTitle: string;
  teamText: string;
};

export type FooterContent = {
  description: string;
  managerName: string;
  address: string;
  hours: string;
};

export type BrandingContent = {
  logoUrl: string;
};

export type ContactContent = {
  subtitle: string;
  address: string;
  hours: string;
};

export type HomeSectionId =
  | "quick_access"
  | "categories"
  | "featured"
  | "hot_deals"
  | "best_sellers"
  | "trust"
  | "reviews";

export type HomeSectionsConfig = {
  order: HomeSectionId[];
  hidden: HomeSectionId[];
};

export type HomeBannerContent = {
  enabled: boolean;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  bgColor: string;
  textColor: string;
};

export const HOME_SECTION_LABELS: Record<HomeSectionId, string> = {
  quick_access: "أزرار المراكز والضمانات",
  categories: "دائرة الأقسام",
  featured: "المنتجات المميزة (سلايدر)",
  hot_deals: "العروض المميزة",
  best_sellers: "الأكثر مبيعاً",
  trust: "شريط الثقة (ضمان/توصيل/تقييم)",
  reviews: "آراء العملاء",
};

const DEFAULT_HOME_ORDER: HomeSectionId[] = [
  "quick_access", "categories", "featured", "hot_deals", "best_sellers", "trust", "reviews",
];

export const CONTENT_DEFAULTS = {
  about_page: {
    intro1:
      "للعناية وزينة السيارات — وجهتك الملكية في صنعاء لتجربة فاخرة تجمع بين متجر إلكتروني واسع وخدمات احترافية تنفذها أيدي خبراء. هدفنا أن تحصل سيارتك على أفضل العناية في مكان واحد، بجودة عالمية وأسعار تنافسية.",
    intro2:
      "من حماية الطلاء بأفلام PPF والنانو سيراميك، إلى التنجيد الفاخر، وتطوير الكشافات، والسمكرة والرش، وقطع الغيار الأصلية، والاكسسوارات المميزة — كل ذلك تحت سقف واحد.",
    missionTitle: "رسالتنا",
    missionText: "تقديم خدمة استثنائية تضع سيارتك في أيدٍ موثوقة.",
    valuesTitle: "قيمنا",
    valuesText: "الجودة، الأمانة، والاحترافية في كل تفصيل.",
    teamTitle: "فريقنا",
    teamText: "بقيادة المدير العام صديق الزين — فنيون معتمدون.",
  } as AboutContent,

  footer_content: {
    description: "زين للعناية وزينة السيارات — جودة ملكية وخدمة احترافية في صنعاء.",
    managerName: "صديق الزين",
    address: "صنعاء - شارع الخمسين  - جوار اس بي سي مول  -   ",
    hours: "السبت - الخميس: 9 ص - 11 م | الجمعة إجازة",
  } as FooterContent,

  branding: {
    logoUrl: "/__l5e/assets-v1/8a480b10-0c8e-47b8-b89b-bde1e2cd54c8/zain-logo.png",
  } as BrandingContent,

  contact_page: {
    subtitle: "نحن هنا لخدمتك — تواصل معنا بالطريقة التي تناسبك.",
    address: "صنعاء - شارع الخمسين  - جوار  اس بي سي مول ",
    hours: "السبت - الخميس: 9 صباحاً - 11 مساءً\nالجمعة: إجازة",
  } as ContactContent,

  home_sections: {
    order: DEFAULT_HOME_ORDER,
    hidden: [],
  } as HomeSectionsConfig,

  home_banner: {
    enabled: false,
    title: "عروض رمضان 🌙",
    subtitle: "خصومات حصرية لفترة محدودة على منتجات مختارة",
    buttonText: "تسوّق الآن",
    buttonLink: "/offers",
    bgColor: "#D4AF37",
    textColor: "#0a0a0a",
  } as HomeBannerContent,
};

export type ContentKey = keyof typeof CONTENT_DEFAULTS;

/** Reads one editable-content key, merged over its default (missing fields fall back). */
export function useSiteContentValue<K extends ContentKey>(key: K): (typeof CONTENT_DEFAULTS)[K] {
  const fetchContent = useServerFn(getSiteContent);
  const { data } = useQuery({
    queryKey: ["site-content", key],
    queryFn: () => fetchContent(),
    staleTime: 60_000,
  });

  const row = data?.find((r) => r.key === key);
  const fallback = CONTENT_DEFAULTS[key];
  if (!row || typeof row.value !== "object" || row.value === null || Array.isArray(row.value)) {
    return fallback;
  }
  // Shallow-merge so a partially-filled admin edit doesn't blank out other fields.
  return { ...fallback, ...(row.value as Record<string, string>) } as (typeof CONTENT_DEFAULTS)[K];
}
