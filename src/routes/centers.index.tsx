import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/layout/Shell";
import { MapPin, Phone, MessageCircle, ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import { listPublicCenters } from "@/lib/installation-centers.functions";

export const Route = createFileRoute("/centers/")({
  head: () => ({
    meta: [
      { title: "مراكز التركيب المعتمدة — زين" },
      {
        name: "description",
        content: "قائمة مراكز التركيب المعتمدة من زين لحماية الطلاء والتظليل في اليمن.",
      },
      { property: "og:title", content: "مراكز التركيب المعتمدة — زين" },
      {
        property: "og:description",
        content:
          "اعثر على أقرب مركز معتمد من زين للحصول على خدمات حماية الطلاء والتظليل بأعلى جودة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CentersListPage,
});

function CentersListPage() {
  const fetchCenters = useServerFn(listPublicCenters);
  const { data: centers = [], isLoading } = useQuery({
    queryKey: ["public-centers"],
    queryFn: () => fetchCenters(),
  });

  return (
    <Shell>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[var(--color-gold-soft)] text-[var(--color-ink)] px-4 py-1.5 rounded-full text-xs font-bold mb-3">
            <ShieldCheck className="w-4 h-4" /> معتمدون رسمياً من زين
          </div>
          <h1 className="text-3xl md:text-4xl font-black">مراكز التركيب المعتمدة</h1>
          <p className="text-[var(--color-ink-soft)] mt-2 max-w-2xl mx-auto">
            اعثر على أقرب مركز معتمد للحصول على خدمات حماية الطلاء والتظليل بضمان أصلي.
          </p>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-gold)]" />
          </div>
        ) : centers.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-ink-soft)]">
            لا توجد مراكز متاحة حالياً.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {centers.map((c) => (
              <article key={c.id} className="card-clean p-5 flex flex-col">
                <div className="flex items-start gap-3">
                  {c.logo_url ? (
                    <img
                      src={c.logo_url}
                      alt={c.name}
                      className="w-14 h-14 rounded-lg object-cover bg-[var(--color-hairline)]"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-[var(--color-gold-soft)] flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6 text-[var(--color-gold)]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-black text-base leading-tight">{c.name}</h2>
                    <div className="text-xs text-[var(--color-ink-soft)] flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {c.city}
                    </div>
                  </div>
                </div>

                {c.address && (
                  <p className="text-sm text-[var(--color-ink-soft)] mt-3">{c.address}</p>
                )}

                {c.services && c.services.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {c.services.map((s) => (
                      <span
                        key={s}
                        className="text-[11px] bg-[var(--color-surface)] text-[var(--color-ink)] px-2 py-0.5 rounded-full"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--color-hairline)]">
                  <Link
                    to="/centers/$id"
                    params={{ id: c.id }}
                    className="flex-1 inline-flex items-center justify-center gap-1 bg-[var(--color-gold)] hover:opacity-90 text-[var(--color-ink)] px-3 py-2 rounded-lg text-xs font-bold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> التفاصيل
                  </Link>
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      className="flex-1 inline-flex items-center justify-center gap-1 bg-[var(--color-surface)] hover:bg-[var(--color-gold-soft)] text-[var(--color-ink)] px-3 py-2 rounded-lg text-xs font-bold"
                      aria-label="اتصال"
                    >
                      <Phone className="w-3.5 h-3.5" /> اتصال
                    </a>
                  )}
                  {c.whatsapp && (
                    <a
                      href={`https://wa.me/${c.whatsapp.replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> واتساب
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
