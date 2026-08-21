import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { getProductReviews, submitProductReview } from "@/lib/catalog.functions";

export function ProductReviews({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", productId],
    queryFn: () => getProductReviews({ data: { productId } }),
  });

  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      submitProductReview({
        data: { productId, customerName: name.trim(), rating, comment: comment.trim() || null },
      }),
    onSuccess: () => {
      setName("");
      setRating(5);
      setComment("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["reviews", productId] });
    },
    onError: () => setError("تعذّر إرسال التقييم، حاول مجدداً."),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 1) {
      setError("الرجاء إدخال الاسم");
      return;
    }
    if (rating < 1 || rating > 5) {
      setError("التقييم غير صالح");
      return;
    }
    mutation.mutate();
  };

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="mt-16">
      <h2 className="text-2xl font-black mb-4">التقييمات والمراجعات</h2>

      <div className="bg-white border border-[var(--color-hairline)] rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${i < Math.round(avg) ? "fill-[var(--color-gold)] text-[var(--color-gold)]" : "text-gray-300"}`}
              />
            ))}
          </div>
          <span className="text-sm text-[var(--color-ink-soft)]">
            {reviews.length > 0
              ? `${avg.toFixed(1)} من 5 — ${reviews.length} تقييم`
              : "لا توجد تقييمات بعد"}
          </span>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="bg-white border border-[var(--color-hairline)] rounded-2xl p-5 mb-6 space-y-3"
      >
        <h3 className="font-bold">اكتب تقييمك</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسمك"
          maxLength={100}
          className="w-full border-2 border-blue-200 focus:border-[var(--color-gold)] outline-none rounded-lg py-2 px-3 text-sm"
        />
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            const val = i + 1;
            const active = (hover || rating) >= val;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setRating(val)}
                onMouseEnter={() => setHover(val)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${val} نجوم`}
              >
                <Star
                  className={`w-7 h-7 ${active ? "fill-[var(--color-gold)] text-[var(--color-gold)]" : "text-gray-300"}`}
                />
              </button>
            );
          })}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="تعليقك (اختياري)"
          rows={3}
          maxLength={1000}
          className="w-full border-2 border-blue-200 focus:border-[var(--color-gold)] outline-none rounded-lg py-2 px-3 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={mutation.isPending} className="btn-gold">
          {mutation.isPending ? "جارٍ الإرسال..." : "إرسال التقييم"}
        </button>
      </form>

      {isLoading ? (
        <p className="text-[var(--color-ink-soft)] text-sm">جارٍ التحميل...</p>
      ) : reviews.length === 0 ? (
        <p className="text-[var(--color-ink-soft)] text-sm">كن أول من يقيّم هذا المنتج.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="bg-white border border-[var(--color-hairline)] rounded-xl p-4"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold">{r.customer_name}</span>
                <span className="text-xs text-[var(--color-ink-soft)]">
                  {new Date(r.created_at).toLocaleDateString("ar-EG")}
                </span>
              </div>
              <div className="flex mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < r.rating ? "fill-[var(--color-gold)] text-[var(--color-gold)]" : "text-gray-300"}`}
                  />
                ))}
              </div>
              {r.comment && (
                <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">{r.comment}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
