import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import {
  adminListCustomerReviews,
  adminUpdateCustomerReview,
  adminDeleteCustomerReview,
} from "@/lib/reviews.functions";
import { getPwd, Loading, Empty } from "@/components/admin/shared";

/* ===================== Customer Reviews (site-wide) ===================== */
export function CustomerReviewsPanel() {
  const listFn = useServerFn(adminListCustomerReviews);
  const updateFn = useServerFn(adminUpdateCustomerReview);
  const deleteFn = useServerFn(adminDeleteCustomerReview);
  const qc = useQueryClient();
  const [status, setStatus] = useState<"all" | "pending" | "approved">("pending");
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-customer-reviews", status],
    queryFn: () => listFn({ data: { password: getPwd(), status } }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-customer-reviews"] });

  const toggleApprove = async (id: string, current: boolean) => {
    try {
      await updateFn({ data: { password: getPwd(), id, is_approved: !current } });
      refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  };
  const toggleFeature = async (id: string, current: boolean) => {
    try {
      await updateFn({ data: { password: getPwd(), id, is_featured: !current } });
      refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  };
  const onDelete = async (id: string) => {
    if (!confirm("حذف هذا التقييم نهائياً؟")) return;
    try {
      await deleteFn({ data: { password: getPwd(), id } });
      refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const tabs: { id: typeof status; label: string }[] = [
    { id: "pending", label: "بانتظار الموافقة" },
    { id: "approved", label: "الموافق عليها" },
    { id: "all", label: "الكل" },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="font-bold text-lg">آراء العملاء ({reviews.length})</h2>
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setStatus(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${status === t.id ? "bg-[var(--color-gold)] text-[var(--color-ink)]" : "bg-[var(--color-surface)] text-[var(--color-ink-soft)]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <Loading />
      ) : reviews.length === 0 ? (
        <Empty msg="لا توجد تقييمات" />
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="card-clean p-4">
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{r.customer_name}</span>
                    {r.city && (
                      <span className="text-xs text-[var(--color-ink-soft)]">— {r.city}</span>
                    )}
                    <span className="text-xs text-[var(--color-gold)]">
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </span>
                    {r.is_approved ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                        موافق
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                        بانتظار
                      </span>
                    )}
                    {r.is_featured && (
                      <span className="text-[10px] bg-[var(--color-gold-soft)] px-2 py-0.5 rounded-full font-bold">
                        مميّز
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-2 leading-relaxed">{r.comment}</p>
                  {r.images && r.images.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {r.images.map((src) => (
                        <a
                          key={src}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                          className="block w-16 h-16 rounded overflow-hidden bg-[var(--color-hairline)]"
                        >
                          <img src={src} alt="" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-[var(--color-ink-soft)] mt-2">
                    {new Date(r.created_at).toLocaleString("ar")}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => toggleApprove(r.id, r.is_approved)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${r.is_approved ? "bg-slate-200 text-slate-700" : "bg-emerald-600 text-white"}`}
                  >
                    {r.is_approved ? "إلغاء الموافقة" : "موافقة"}
                  </button>
                  {r.is_approved && (
                    <button
                      onClick={() => toggleFeature(r.id, r.is_featured)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${r.is_featured ? "bg-[var(--color-gold-soft)]" : "bg-[var(--color-surface)] border border-[var(--color-hairline)]"}`}
                    >
                      {r.is_featured ? "إلغاء التمييز" : "تمييز"}
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(r.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white flex items-center gap-1 justify-center"
                  >
                    <Trash2 className="w-3 h-3" /> حذف
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
