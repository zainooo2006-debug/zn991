import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Send, Loader2, Upload, X } from "lucide-react";
import {
  listApprovedReviews,
  submitCustomerReview,
  uploadReviewImage,
} from "@/lib/reviews.functions";

export function CustomerReviewsSection() {
  const listFn = useServerFn(listApprovedReviews);
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["customer-reviews-approved"],
    queryFn: () => listFn(),
  });
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="py-14 bg-[var(--color-surface)]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-black">آراء عملائنا</h2>
            <p className="text-sm text-[var(--color-ink-soft)] mt-1">تجارب حقيقية من عملاء زين</p>
          </div>
          <button onClick={() => setShowForm((v) => !v)} className="btn-gold">
            {showForm ? "إغلاق" : "شارك تجربتك"}
          </button>
        </div>

        {showForm && <ReviewForm onDone={() => setShowForm(false)} />}

        {isLoading ? (
          <div className="text-center py-8 text-[var(--color-ink-soft)]">جاري التحميل…</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-ink-soft)]">
            لا توجد تقييمات بعد. كن أول من يشارك تجربته.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <ReviewCard key={r.id} r={r} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ReviewCard({
  r,
}: {
  r: {
    id: string;
    customer_name: string;
    city: string | null;
    rating: number;
    comment: string;
    images: string[];
    is_featured: boolean;
    created_at: string;
  };
}) {
  return (
    <article className="card-clean p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold truncate">{r.customer_name}</div>
          {r.city && <div className="text-xs text-[var(--color-ink-soft)]">{r.city}</div>}
        </div>
        {r.is_featured && (
          <span className="text-[10px] bg-[var(--color-gold-soft)] text-[var(--color-ink)] px-2 py-0.5 rounded-full font-bold">
            مميّز
          </span>
        )}
      </div>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`w-4 h-4 ${n <= r.rating ? "fill-[var(--color-gold)] text-[var(--color-gold)]" : "text-[var(--color-hairline)]"}`}
          />
        ))}
      </div>
      <p className="text-sm leading-relaxed text-[var(--color-ink)]">{r.comment}</p>
      {r.images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {r.images.map((src) => (
            <a
              key={src}
              href={src}
              target="_blank"
              rel="noreferrer"
              className="block aspect-square rounded-lg overflow-hidden bg-[var(--color-hairline)]"
            >
              <img
                src={src}
                alt="مرفق العميل"
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </a>
          ))}
        </div>
      )}
      <div className="text-[10px] text-[var(--color-ink-soft)] mt-auto">
        {new Date(r.created_at).toLocaleDateString("ar")}
      </div>
    </article>
  );
}

function ReviewForm({ onDone }: { onDone: () => void }) {
  const submit = useServerFn(submitCustomerReview);
  const upload = useServerFn(uploadReviewImage);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || images.length >= 3) return;
    setErr("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { url } = await upload({ data: fd });
      setImages((arr) => [...arr, url]);
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await submit({ data: { customer_name: name, city: city || null, rating, comment, images } });
      setOk(true);
      qc.invalidateQueries({ queryKey: ["customer-reviews-approved"] });
      setTimeout(onDone, 2200);
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (ok) {
    return (
      <div className="card-clean p-6 mb-6 text-center">
        <div className="text-lg font-bold text-emerald-600">شكراً لك! تم استلام تقييمك</div>
        <p className="text-sm text-[var(--color-ink-soft)] mt-1">
          سيظهر بعد مراجعته من قِبل الفريق.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card-clean p-5 mb-6 space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold block mb-1">الاسم</span>
          <input
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold block mb-1">المدينة (اختياري)</span>
          <input
            maxLength={60}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)]"
          />
        </label>
      </div>

      <div>
        <span className="text-sm font-bold block mb-1">التقييم</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} نجوم`}>
              <Star
                className={`w-7 h-7 transition ${n <= rating ? "fill-[var(--color-gold)] text-[var(--color-gold)]" : "text-[var(--color-hairline)]"}`}
              />
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-bold block mb-1">التعليق</span>
        <textarea
          required
          minLength={5}
          maxLength={1000}
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)]"
        />
      </label>

      <div>
        <span className="text-sm font-bold block mb-1">صور (اختياري — حتى 3)</span>
        <div className="flex gap-2 flex-wrap items-center">
          {images.map((src) => (
            <div
              key={src}
              className="relative w-20 h-20 rounded-lg overflow-hidden bg-[var(--color-hairline)]"
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setImages((a) => a.filter((x) => x !== src))}
                className="absolute top-0.5 left-0.5 bg-black/60 text-white rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {images.length < 3 && (
            <label className="w-20 h-20 rounded-lg border-2 border-dashed border-[var(--color-hairline)] flex items-center justify-center cursor-pointer hover:border-[var(--color-gold)]">
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Upload className="w-5 h-5 text-[var(--color-ink-soft)]" />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onFile}
                disabled={uploading}
              />
            </label>
          )}
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="btn-outline">
          إلغاء
        </button>
        <button type="submit" disabled={busy || uploading} className="btn-gold">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          إرسال التقييم
        </button>
      </div>
    </form>
  );
}
