import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { listAllReviews, deleteReview } from "@/lib/admin.functions";
import { getPwd, Loading, Empty } from "@/components/admin/shared";

/* ===================== Reviews ===================== */
export function ReviewsPanel() {
  const fetchReviews = useServerFn(listAllReviews);
  const remove = useServerFn(deleteReview);
  const qc = useQueryClient();
  const [negativeOnly, setNegativeOnly] = useState(false);
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-reviews", negativeOnly],
    queryFn: () =>
      fetchReviews({ data: { password: getPwd(), maxRating: negativeOnly ? 2 : null } }),
  });

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذا التقييم؟")) return;
    try {
      await remove({ data: { password: getPwd(), id } });
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="font-bold text-lg">التقييمات ({reviews.length})</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setNegativeOnly(false)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold ${!negativeOnly ? "bg-[var(--color-gold)] text-[var(--color-ink)]" : "bg-[var(--color-surface)] text-[var(--color-ink-soft)]"}`}
          >
            الكل
          </button>
          <button
            onClick={() => setNegativeOnly(true)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold ${negativeOnly ? "bg-red-600 text-white" : "bg-[var(--color-surface)] text-[var(--color-ink-soft)]"}`}
          >
            السلبية (≤ نجمتين)
          </button>
        </div>
      </div>
      {isLoading ? (
        <Loading />
      ) : reviews.length === 0 ? (
        <Empty msg="لا توجد تقييمات" />
      ) : (
        <ul className="space-y-2">
          {reviews.map((r) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prod = (r as any).products as { name?: string } | null;
            return (
              <li key={r.id} className="card-clean p-3">
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{r.customer_name}</span>
                      <span className="text-xs text-[var(--color-gold)]">
                        {"★".repeat(r.rating)}
                        {"☆".repeat(5 - r.rating)}
                      </span>
                      {r.rating <= 2 && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                          سلبي
                        </span>
                      )}
                    </div>
                    {prod?.name && (
                      <div className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                        المنتج: {prod.name}
                      </div>
                    )}
                    {r.comment && <p className="text-sm mt-1 leading-relaxed">{r.comment}</p>}
                    <div className="text-[10px] text-[var(--color-ink-soft)] mt-1">
                      {new Date(r.created_at).toLocaleString("ar")}
                    </div>
                  </div>
                  <button onClick={() => onDelete(r.id)} className="p-2 text-red-600" title="حذف">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
