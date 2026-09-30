import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Search, Package, Phone } from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { getOrdersByPhone } from "@/lib/catalog.functions";
import { getOrderTimelines } from "@/lib/billing.functions";
import { ORDER_STATUS_META, normalizeOrderStatus } from "@/lib/order-status";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "تتبع الطلب — زين" },
      { name: "description", content: "تتبع حالة طلبك عبر رقم الهاتف." },
      { property: "og:title", content: "تتبع الطلب — زين" },
      { property: "og:description", content: "تتبع حالة طلبك عبر رقم الهاتف." },
      { property: "og:url", content: "https://zn991.lovable.app/track" },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const [phone, setPhone] = useState("");
  const [orderId, setOrderId] = useState("");

  const mutation = useMutation({
    mutationFn: async (v: { phone: string; orderId: string }) => {
      const orders = await getOrdersByPhone({ data: v });
      let timelines: Record<string, Array<{ to_status: string; created_at: string }>> = {};
      if (orders.length > 0) {
        try {
          timelines = await getOrderTimelines({
            data: { phone: v.phone, orderIds: orders.map((o) => o.id) },
          });
        } catch {
          // The timeline is optional; the order list must still show.
        }
      }
      return { orders, timelines };
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (phone.replace(/\D/g, "").length < 9) return;
    if (orderId.trim().length < 4) return;

    mutation.mutate({
      phone: phone.trim(),
      orderId: orderId.trim(),
    });
  };

  return (
    <Shell>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-black mb-2">تتبع الطلب</h1>

        <p className="text-[var(--color-ink-soft)] mb-6">
          أدخل رقم الطلب (أول 4 أحرف على الأقل) ورقم الهاتف المستخدم في الطلب.
        </p>

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
            <Search className="w-4 h-4" />
            {mutation.isPending ? "جارٍ البحث..." : "بحث"}
          </button>
        </form>

        {mutation.isError && (
          <div className="rounded-xl bg-red-50 text-red-700 p-4 text-sm">
            حدث خطأ، الرجاء المحاولة لاحقاً
          </div>
        )}

        {mutation.data && mutation.data.orders.length === 0 && (
          <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-hairline)] p-6 text-center text-[var(--color-ink-soft)]">
            لا توجد طلبات مرتبطة بهذا الرقم.
          </div>
        )}

        {mutation.data && mutation.data.orders.length > 0 && (
          <div className="space-y-4">
            {mutation.data.orders.map((o) => {
              const items = Array.isArray(o.items)
                ? (o.items as Array<{
                    name: string;
                    qty?: number;
                    quantity?: number;
                  }>)
                : [];
              const status = normalizeOrderStatus(o.status);
              const meta = ORDER_STATUS_META[status];
              const timeline = mutation.data?.timelines[o.id] ?? [];

              return (
                <div
                  key={o.id}
                  className="bg-white border border-[var(--color-hairline)] rounded-2xl p-4"
                >
                  <div className="flex justify-between items-start gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-[var(--color-ink-soft)]">
                        <Package className="w-4 h-4 text-[var(--color-gold)]" />
                        <span>طلب رقم: {o.id.slice(0, 8)}</span>
                      </div>

                      <div className="text-xs text-[var(--color-ink-soft)] mt-1">
                        {new Date(o.created_at).toLocaleString("ar-EG")}
                      </div>
                    </div>

                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${meta.badge}`}>
                      {meta.label}
                    </span>
                  </div>

                  <div className="mt-3 text-sm">
                    <div className="text-[var(--color-ink-soft)] mb-1">المنتجات:</div>

                    <ul className="list-disc pr-5 space-y-0.5">
                      {items.map((it, i) => (
                        <li key={i}>
                          {it.name} {it.qty || it.quantity ? `× ${it.qty ?? it.quantity}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {timeline.length > 0 && (
                    <div className="mt-3 text-sm">
                      <div className="text-[var(--color-ink-soft)] mb-1">مراحل الطلب:</div>
                      <ol className="space-y-1 border-r-2 border-[var(--color-hairline)] pr-3">
                        {timeline.map((t, i) => (
                          <li key={i} className="flex justify-between gap-2 text-xs">
                            <span className="font-bold">
                              {ORDER_STATUS_META[normalizeOrderStatus(t.to_status)].short}
                            </span>
                            <span className="text-[var(--color-ink-soft)]">
                              {new Date(t.created_at).toLocaleString("ar-EG")}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

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
