import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { listOrders, updateOrderStatus, deleteOrder } from "@/lib/admin.functions";
import { getPwd, Loading, Empty } from "@/components/admin/shared";

/* ===================== Orders ===================== */
export function OrdersPanel() {
  const fetchOrders = useServerFn(listOrders);
  const updateStatus = useServerFn(updateOrderStatus);
  const removeOrder = useServerFn(deleteOrder);
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchOrders({ data: { password: getPwd() } }),
  });

  const setStatus = async (id: string, status: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateStatus({ data: { password: getPwd(), id, status: status as any } });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const onDeleteOrder = async (id: string) => {
    if (!confirm("حذف هذا الطلب نهائياً؟")) return;
    try {
      await removeOrder({ data: { password: getPwd(), id } });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (err) {
      alert((err as Error).message);
    }
  };

  if (isLoading) return <Loading />;
  if (orders.length === 0) return <Empty msg="لا توجد طلبات بعد" />;

  return (
    <div className="space-y-3">
      {orders.map((o) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = (o.items as any[]) || [];
        return (
          <div key={o.id} className="card-clean p-4">
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div>
                <div className="font-bold">
                  {o.customer_name} • <span dir="ltr">{o.phone}</span>
                </div>
                <div className="text-xs text-[var(--color-ink-soft)]">
                  {new Date(o.created_at).toLocaleString("ar")}
                </div>
                {o.address && <div className="text-xs mt-1">📍 {o.address}</div>}
              </div>
              <div className="text-left">
                <div className="text-[var(--color-gold)] font-black text-lg">
                  {Number(o.total).toLocaleString()} ر.ي
                </div>
                <select
                  value={o.status}
                  onChange={(e) => setStatus(o.id, e.target.value)}
                  className="text-xs border border-[var(--color-hairline)] rounded px-2 py-1 mt-1"
                >
                  <option value="new">جديد</option>
                  <option value="confirmed">مؤكد</option>
                  <option value="shipped">تم الشحن</option>
                  <option value="delivered">تم التوصيل</option>
                  <option value="cancelled">ملغي</option>
                </select>
                {(o.status === "delivered" || o.status === "cancelled") && (
                  <button
                    onClick={() => onDeleteOrder(o.id)}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                  >
                    <Trash2 className="w-3 h-3" /> حذف
                  </button>
                )}
              </div>
            </div>
            <ul className="text-sm mt-3 space-y-1 border-t border-[var(--color-hairline)] pt-2">
              {items.map((i, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>
                    {i.name} × {i.qty}
                  </span>
                  <span className="font-bold">{(i.price * i.qty).toLocaleString()} ر.ي</span>
                </li>
              ))}
            </ul>
            {o.wallet_name && (
              <div className="text-xs mt-2 text-[var(--color-ink-soft)]">
                💳 {o.wallet_name} {o.payment_ref && `— مرجع: ${o.payment_ref}`}
              </div>
            )}
            {o.notes && (
              <div className="text-xs mt-1 text-[var(--color-ink-soft)]">📝 {o.notes}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
