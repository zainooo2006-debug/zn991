// Single source of truth for order statuses.
// Used by: admin panel, customer tracking, server functions, invoices.

export const ORDER_STATUS_VALUES = [
  "new",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; badge: string; short: string }
> = {
  new: { label: "جديد", badge: "bg-blue-100 text-blue-700", short: "استلمنا طلبك" },
  confirmed: { label: "مؤكد", badge: "bg-amber-100 text-amber-700", short: "تم تأكيد الطلب" },
  preparing: {
    label: "قيد التجهيز",
    badge: "bg-yellow-100 text-yellow-700",
    short: "جاري تجهيز الطلب",
  },
  shipped: { label: "تم الشحن", badge: "bg-purple-100 text-purple-700", short: "تم شحن الطلب" },
  delivered: { label: "تم التسليم", badge: "bg-green-100 text-green-700", short: "تم تسليم الطلب" },
  cancelled: { label: "ملغي", badge: "bg-red-100 text-red-700", short: "تم إلغاء الطلب" },
};

/** Maps any stored value (including the legacy "processing") to a known status. */
export function normalizeOrderStatus(s?: string | null): OrderStatus {
  if (s === "processing") return "preparing";
  return (ORDER_STATUS_VALUES as readonly string[]).includes(s ?? "")
    ? (s as OrderStatus)
    : "new";
}

export function orderStatusLabel(s?: string | null) {
  return ORDER_STATUS_META[normalizeOrderStatus(s)].label;
}

export function orderStatusBadge(s?: string | null) {
  return ORDER_STATUS_META[normalizeOrderStatus(s)].badge;
}

/** Ordered list for dropdowns / timelines. */
export const ORDER_STATUSES_LIST = ORDER_STATUS_VALUES.map((value) => ({
  value,
  label: ORDER_STATUS_META[value].label,
}));
