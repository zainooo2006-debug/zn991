import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Receipt, History } from "lucide-react";
import { listOrders, updateOrderStatus, deleteOrder } from "@/lib/admin.functions";
import { createInvoice, listInvoices, listOrderHistory } from "@/lib/billing.functions";
import { getPwd, Loading, Empty } from "@/components/admin/shared";
import { DocumentViewer, invoiceToDoc } from "@/components/BillingDocument";
import { ORDER_STATUSES_LIST, normalizeOrderStatus, orderStatusLabel } from "@/lib/order-status";
import type { InvoiceRow } from "@/lib/billing-utils";

/* ===================== Orders ===================== */
export function OrdersPanel() {
  const fetchOrders = useServerFn(listOrders);
  const updateStatus = useServerFn(updateOrderStatus);
  const removeOrder = useServerFn(deleteOrder);
  const fetchInvoices = useServerFn(listInvoices);
  const makeInvoice = useServerFn(createInvoice);
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchOrders({ data: { password: getPwd() } }),
  });
  // Invoices may fail before the SQL migration is run; orders must still work.
  const { data: invoices = [] } = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: () => fetchInvoices({ data: { password: getPwd() } }),
    retry: false,
  });

  const [viewing, setViewing] = useState<InvoiceRow | null>(null);
  const [historyOpen, setHistoryOpen] = useState<string | null>(null);
  const [busyInvoice, setBusyInvoice] = useState<string | null>(null);

  const invoiceFor = (orderId: string) =>
    invoices.find((i) => i.order_id === orderId && i.status !== "void");

  const setStatus = async (id: string, status: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateStatus({ data: { password: getPwd(), id, status: status as any } });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-order-history", id] });
    } catch (err) {
      alert((err as Error).message);
    }
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

  const onInvoice = async (orderId: string) => {
    const existing = invoiceFor(orderId);
    if (existing) {
      setViewing(existing);
      return;
    }
    setBusyInvoice(orderId);
    try {
      const res = await makeInvoice({ data: { password: getPwd(), order_id: orderId } });
      qc.invalidateQueries({ queryKey: ["admin-invoices"] });
      setViewing(res.invoice);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusyInvoice(null);
    }
  };

  if (isLoading) return <Loading />;
  if (orders.length === 0) return <Empty msg="لا توجد طلبات بعد" />;

  return (
    <div className="space-y-3">
      {orders.map((o) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = (o.items as any[]) || [];
        const status = normalizeOrderStatus(o.status);
        const inv = invoiceFor(o.id);
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
                <div className="text-xs text-[var(--color-ink-soft)] font-mono">
                  #{o.id.slice(0, 8)}
                </div>
                {o.address && <div className="text-xs mt-1">📍 {o.address}</div>}
              </div>
              <div className="text-left">
                <div className="text-[var(--color-gold)] font-black text-lg">
                  {Number(o.total).toLocaleString()} ر.ي
                </div>
                {Number((o as { discount?: number }).discount ?? 0) > 0 && (
                  <div className="text-xs text-green-700">
                    خصم {Number((o as { discount?: number }).discount).toLocaleString()} ر.ي
                    {(o as { coupon_code?: string | null }).coupon_code
                      ? ` (${(o as { coupon_code?: string | null }).coupon_code})`
                      : ""}
                  </div>
                )}
                <select
                  value={status}
                  onChange={(e) => setStatus(o.id, e.target.value)}
                  className="text-xs border border-[var(--color-hairline)] rounded px-2 py-1 mt-1"
                >
                  {ORDER_STATUSES_LIST.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {(status === "delivered" || status === "cancelled") && (
                  <button
                    onClick={() => onDeleteOrder(o.id)}
                    className="mt-1 flex items-center gap-1 text-xs text-red-600 hover:underline"
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

            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => onInvoice(o.id)}
                disabled={busyInvoice === o.id}
                className="btn-outline text-xs"
              >
                <Receipt className="w-3 h-3" />
                {inv ? `عرض الفاتورة ${inv.invoice_number}` : "إصدار فاتورة"}
              </button>
              <button
                onClick={() => setHistoryOpen(historyOpen === o.id ? null : o.id)}
                className="btn-outline text-xs"
              >
                <History className="w-3 h-3" /> سجل الحالات
              </button>
            </div>

            {historyOpen === o.id && <OrderHistory orderId={o.id} />}
          </div>
        );
      })}

      {viewing && <DocumentViewer data={invoiceToDoc(viewing)} onClose={() => setViewing(null)} />}
    </div>
  );
}

function OrderHistory({ orderId }: { orderId: string }) {
  const fetchHistory = useServerFn(listOrderHistory);
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["admin-order-history", orderId],
    queryFn: () => fetchHistory({ data: { password: getPwd(), order_id: orderId } }),
  });

  if (isLoading) return <div className="text-xs mt-3">جاري التحميل...</div>;
  if (error) return <div className="text-xs mt-3 text-red-600">تعذّر تحميل السجل</div>;
  if (data.length === 0)
    return <div className="text-xs mt-3 text-[var(--color-ink-soft)]">لا يوجد سجل لهذا الطلب</div>;

  return (
    <ol className="mt-3 border-t border-[var(--color-hairline)] pt-2 space-y-1 text-xs">
      {data.map((h) => (
        <li key={h.id} className="flex justify-between gap-2">
          <span>
            {h.from_status ? `${orderStatusLabel(h.from_status)} ← ` : ""}
            <b>{orderStatusLabel(h.to_status)}</b>
            <span className="text-[var(--color-ink-soft)]">
              {" "}
              ({h.changed_by === "customer" ? "العميل" : h.changed_by === "system" ? "النظام" : "الأدمن"}
              {h.note ? ` — ${h.note}` : ""})
            </span>
          </span>
          <span className="text-[var(--color-ink-soft)] whitespace-nowrap">
            {new Date(h.created_at).toLocaleString("ar")}
          </span>
        </li>
      ))}
    </ol>
  );
}
