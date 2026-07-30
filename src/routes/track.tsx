import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Search, Package, Phone } from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { getOrdersByPhone } from "@/lib/catalog.functions";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "تتبع الطلب — زين" },
      { name: "description", content: "تتبع حالة طلبك عبر رقم الهاتف." },
      { property: "og:title", content: "تتبع الطلب — زين" },
      { property: "og:description", content: "تتبع حالة طلبك عبر رقم الهاتف." },
      { property: "og:url", content: "https://tajalmoluk.lovable.app/track" },
    ],
  }),
  component: TrackPage,
});

const STATUS_LABEL: Record<string, string> = {
  new: "جديد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function TrackPage() {
  const [phone, setPhone] = useState("");
  const [orderId, setOrderId] = useState("");
  const mutation = useMutation({
    mutationFn: (v: { phone: string; orderId: string }) => getOrdersByPhone({ data: v }),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length < 9) return;
    if (orderId.trim().length < 4) return;
    mutation.mutate({ phone: phone.trim(), orderId: orderId.trim() });
  };

  return (
    <Shell>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-black mb-2">تتبع الطلب</h1>
        <p className="text-[var(--color-ink-soft)] mb-6">أدخل رقم الطلب (أول 4 أحرف على الأقل) ورقم الهاتف المستخدم في الطلب.</p>

        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2 mb-8">
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="رقم الطلب"
            className="flex-1 border-2 border-blue-200 focus:border-[var(--color-gold)] outline-none rounded-full py-3 px-4 text-sm"
          />
          <div className="relative flex-1">
            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-soft)]" />
            <input
              type="tel"
              inputMode="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="7XXXXXXXX"
              className="w-full border-2 border-blue-200 focus:border-[var(--color-gold)] outline-none rounded-full py-3 pr-10 pl-4 text-sm"
            />
          </div>
          <button type="submit" disabled={mutation.isPending} className="btn-gold">
            <Search className="w-4 h-4" /> {mutation.isPending ? "جارٍ البحث..." : "بحث"}
          </button>
        </form>


        {mutation.isError && (
          <div className="rounded-xl bg-red-50 text-red-700 p-4 text-sm">حدث خطأ، الرجاء المحاولة لاحقاً</div>
        )}

        {mutation.data && mutation.data.length === 0 && (
          <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] p-6 text-center text-[var(--color-ink-soft)]">
            لا توجد طلبات مرتبطة بهذا الرقم.
          </div>
        )}

        {mutation.data && mutation.data.length > 0 && (
          <div className="space-y-4">
            {mutation.data.map((o) => {
              const items = Array.isArray(o.items) ? (o.items as Array<{ name: string; quantity?: number }>) : [];
              return (
                <div key={o.id} className="bg-white border border-[var(--color-hairline)] rounded-2xl p-4">
                  <div className="flex justify-between items-start gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-[var(--color-ink-soft)]">
                        <Package className="w-4 h-4 text-[var(--color-gold)]" />
                        <span>طلب رقم: {o.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                      <div className="text-xs text-[var(--color-ink-soft)] mt-1">
                        {new Date(o.created_at).toLocaleString("ar-EG")}
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLOR[o.status] || "bg-gray-100 text-gray-700"}`}>
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
                  </div>
                  <div className="mt-3 text-sm">
                    <div className="text-[var(--color-ink-soft)] mb-1">المنتجات:</div>
                    <ul className="list-disc pr-5 space-y-0.5">
                      {items.map((it, i) => (
                        <li key={i}>{it.name} {it.quantity ? `× ${it.quantity}` : ""}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-3 flex justify-between items-center border-t border-[var(--color-hairline)] pt-3">
                    <span className="text-sm text-[var(--color-ink-soft)]">الإجمالي</span>
                    <span className="price">{Number(o.total).toLocaleString()} ر.ي</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}
