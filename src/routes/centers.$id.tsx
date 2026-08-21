import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/layout/Shell";
import {
  MapPin,
  Phone,
  MessageCircle,
  ShieldCheck,
  Loader2,
  ArrowRight,
  Images,
} from "lucide-react";
import { getPublicCenterById } from "@/lib/installation-centers.functions";

export const Route = createFileRoute("/centers/$id")({
  head: ({ params }) => ({
    meta: [
      { title: "مركز التركيب المعتمد — زين" },
      {
        name: "description",
        content: "تفاصيل مركز التركيب المعتمد من زين لحماية الطلاء والتظليل.",
      },
      { property: "og:title", content: "مركز التركيب المعتمد — زين" },
      {
        property: "og:description",
        content: "تفاصيل مركز التركيب المعتمد من زين لحماية الطلاء والتظليل.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["public-center", params.id],
      queryFn: () => getPublicCenterById({ data: { id: params.id } }),
    });
  },
  errorComponent: CenterError,
  notFoundComponent: CenterNotFound,
  component: CenterDetailPage,
});

function CenterDetailPage() {
  const { id } = Route.useParams();
  const fetchCenter = useServerFn(getPublicCenterById);
  const {
    data: center,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public-center", id],
    queryFn: () => fetchCenter({ data: { id } }),
  });

  if (isLoading) {
    return (
      <Shell>
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-gold)]" />
        </div>
      </Shell>
    );
  }

  if (error || !center) {
    return (
      <Shell>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-black">المركز غير موجود</h1>
          <p className="text-[var(--color-ink-soft)] mt-2">
            قد يكون تم إزالة المركز أو أنه غير معتمد بعد.
          </p>
          <Link to="/centers" className="btn-gold mt-6 inline-flex">
            <ArrowRight className="w-4 h-4" /> العودة للقائمة
          </Link>
        </div>
      </Shell>
    );
  }

  const images = center.images?.filter(Boolean) ?? [];

  return (
    <Shell>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link
          to="/centers"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-gold)] mb-4"
        >
          <ArrowRight className="w-4 h-4" /> العودة لمراكز التركيب
        </Link>

        <div className="card-clean overflow-hidden">
          {/* Hero header */}
          <div className="relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-[var(--color-gold-soft)] to-[var(--color-surface)]">
            <div className="absolute inset-0 flex items-center justify-center">
              {center.logo_url ? (
                <img
                  src={center.logo_url}
                  alt={center.name}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover shadow-lg bg-white"
                />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white flex items-center justify-center shadow-lg">
                  <ShieldCheck className="w-12 h-12 md:w-16 md:h-16 text-[var(--color-gold)]" />
                </div>
              )}
            </div>
            <div className="absolute top-4 right-4 inline-flex items-center gap-2 bg-white/90 backdrop-blur text-[var(--color-ink)] px-3 py-1.5 rounded-full text-xs font-bold shadow">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> معتمد رسمياً من زين
            </div>
          </div>

          {/* Body */}
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black">{center.name}</h1>
                <div className="flex items-center gap-2 text-[var(--color-ink-soft)] mt-2">
                  <MapPin className="w-4 h-4 text-[var(--color-gold)]" />
                  <span>{center.city}</span>
                  {center.address && <span className="text-[var(--color-hairline)]">|</span>}
                  {center.address && <span className="max-w-md truncate">{center.address}</span>}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {center.phone && (
                  <a
                    href={`tel:${center.phone}`}
                    className="inline-flex items-center gap-2 bg-[var(--color-surface)] hover:bg-[var(--color-gold-soft)] text-[var(--color-ink)] px-4 py-2 rounded-full text-sm font-bold transition"
                  >
                    <Phone className="w-4 h-4" /> {center.phone}
                  </a>
                )}
                {center.whatsapp && (
                  <a
                    href={`https://wa.me/${center.whatsapp.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full text-sm font-bold transition"
                  >
                    <MessageCircle className="w-4 h-4" /> واتساب
                  </a>
                )}
              </div>
            </div>

            {center.services && center.services.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-bold mb-3">الخدمات المتوفرة</h2>
                <div className="flex flex-wrap gap-2">
                  {center.services.map((s) => (
                    <span
                      key={s}
                      className="bg-[var(--color-gold-soft)] text-[var(--color-ink)] px-3 py-1.5 rounded-full text-sm font-bold"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {images.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Images className="w-5 h-5 text-[var(--color-gold)]" /> معرض الصور
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {images.map((src, idx) => (
                    <a
                      key={idx}
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="block aspect-square rounded-xl overflow-hidden bg-[var(--color-hairline)] border border-[var(--color-hairline)] hover:border-[var(--color-gold)] transition"
                    >
                      <img
                        src={src}
                        alt={`${center.name} — صورة ${idx + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition duration-500"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {center.google_maps_url && (
              <div className="mt-8">
                <h2 className="text-lg font-bold mb-3">الموقع على الخريطة</h2>
                <a
                  href={center.google_maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-full font-bold transition"
                >
                  <MapPin className="w-5 h-5" /> فتح الموقع في خرائط Google
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function CenterError() {
  return (
    <Shell>
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-black">تعذّر تحميل بيانات المركز</h1>
        <p className="text-[var(--color-ink-soft)] mt-2">
          حدث خطأ أثناء جلب التفاصيل. حاول مرة أخرى.
        </p>
        <Link to="/centers" className="btn-gold mt-6 inline-flex">
          <ArrowRight className="w-4 h-4" /> العودة للقائمة
        </Link>
      </div>
    </Shell>
  );
}

function CenterNotFound() {
  return (
    <Shell>
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-black">المركز غير موجود</h1>
        <p className="text-[var(--color-ink-soft)] mt-2">
          قد يكون تم إزالة المركز أو أنه غير معتمد بعد.
        </p>
        <Link to="/centers" className="btn-gold mt-6 inline-flex">
          <ArrowRight className="w-4 h-4" /> العودة للقائمة
        </Link>
      </div>
    </Shell>
  );
}
