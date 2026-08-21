import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { getServiceBySlug } from "@/lib/catalog.functions";
import { whatsappLink } from "@/lib/whatsapp";
import { resolveImage } from "@/lib/asset-map";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const serviceQO = (slug: string) =>
  queryOptions({
    queryKey: ["service", slug],
    queryFn: () => getServiceBySlug({ data: { slug } }),
  });

export const Route = createFileRoute("/services/$slug")({
  head: ({ params, loaderData }) => {
    const data = loaderData as
      | {
          name: string;
          short_desc: string | null;
          long_desc: string | null;
          image_url: string | null;
        }
      | undefined;
    const url = `https://zn991.lovable.app/services/${params.slug}`;
    const title = data ? `${data.name} — زين` : "خدمة — زين";
    const desc = (data?.short_desc || data?.long_desc || "تفاصيل الخدمة وحجز سريع.").slice(0, 160);
    const imgRaw = data?.image_url ? resolveImage(data.image_url) : null;
    const img = imgRaw
      ? imgRaw.startsWith("http")
        ? imgRaw
        : `https://zn991.lovable.app${imgRaw}`
      : null;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        ...(img
          ? [
              { property: "og:image", content: img },
              { name: "twitter:image", content: img },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      ...(data
        ? {
            scripts: [
              {
                type: "application/ld+json",
                children: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Service",
                  name: data.name,
                  description: desc,
                  url,
                  ...(img ? { image: img } : {}),
                  serviceType: data.name,
                  areaServed: { "@type": "City", name: "صنعاء" },
                  provider: {
                    "@type": "LocalBusiness",
                    name: "زين أصل الحماية",
                    address: {
                      "@type": "PostalAddress",
                      streetAddress: "شارع الخمسين، جوار اس بي سي مول",
                      addressLocality: "صنعاء",
                      addressCountry: "YE",
                    },
                    telephone: "+967773144403",
                  },
                }),
              },
            ],
          }
        : {}),
    };
  },
  loader: async ({ context, params }) => {
    const s = await context.queryClient.ensureQueryData(serviceQO(params.slug));
    if (!s) throw notFound();
    return s;
  },
  component: ServiceDetailPage,
});

function ServiceDetailPage() {
  const { slug } = Route.useParams();
  const { data: service } = useSuspenseQuery(serviceQO(slug));
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [carModel, setCarModel] = useState("");

  if (!service) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = `طلب حجز خدمة: ${service.name}\nالاسم: ${name}\nالجوال: ${phone}\nطراز السيارة: ${carModel}`;
    window.open(whatsappLink(msg), "_blank");
  };

  const features = [
    "فنيون معتمدون وذوو خبرة",
    "أحدث المعدات والمواد",
    "ضمان على الخدمة",
    "أسعار تنافسية",
  ];

  return (
    <Shell>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link
          to="/services"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-gold)] mb-4"
        >
          <ArrowRight className="w-4 h-4" /> العودة للخدمات
        </Link>

        <div className="aspect-[16/7] rounded-2xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-hairline)]">
          <img
            src={resolveImage(service.image_url ?? "s-ppf.jpg")}
            alt={service.name}
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="text-3xl md:text-4xl font-black mt-6">{service.name}</h1>
        <p className="text-[var(--color-ink-soft)] mt-3 leading-relaxed">{service.long_desc}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {features.map((f) => (
            <div key={f} className="flex items-center gap-2 card-clean p-4">
              <CheckCircle2 className="w-5 h-5 text-[var(--color-gold)]" /> {f}
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="card-clean p-6 mt-8">
          <h2 className="text-xl font-bold">احجز هذه الخدمة الآن</h2>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            سنرسل تفاصيل حجزك مباشرة لإدارة المركز عبر واتساب.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="الاسم"
              className="border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)]"
            />
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="رقم الجوال"
              className="border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)]"
            />
            <input
              value={carModel}
              onChange={(e) => setCarModel(e.target.value)}
              placeholder="طراز السيارة"
              className="border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)]"
            />
          </div>
          <button type="submit" className="btn-gold mt-4">
            إرسال الحجز عبر واتساب
          </button>
        </form>
      </div>
    </Shell>
  );
}
