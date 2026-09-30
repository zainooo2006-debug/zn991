// Client-safe helpers shared by invoices and quotes.

export type DocItem = { name: string; qty: number; price: number };

export type InvoiceStatus = "issued" | "paid" | "void";
export type QuoteStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "converted"
  | "cancelled";

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  order_id: string | null;
  quote_id: string | null;
  customer_name: string;
  phone: string;
  address: string | null;
  vehicle: string | null;
  items: DocItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string | null;
  notes: string | null;
  status: InvoiceStatus;
  issued_at: string;
  paid_at: string | null;
  created_at: string;
};

export type QuoteRow = {
  id: string;
  quote_number: string;
  customer_name: string;
  phone: string;
  vehicle: string | null;
  items: DocItem[];
  subtotal: number;
  discount: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  status: QuoteStatus;
  order_id: string | null;
  created_at: string;
  updated_at: string;
};

export function calcTotals(items: DocItem[], discount = 0) {
  const subtotal = items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
  const d = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  return { subtotal, discount: d, total: subtotal - d };
}

export function fmtMoney(n: number | string | null | undefined) {
  return `${Number(n || 0).toLocaleString("en-US")} ر.ي`;
}

export function fmtDate(d?: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  issued: { label: "صادرة", color: "#b45309", bg: "#fef3c7" },
  paid: { label: "مدفوعة", color: "#15803d", bg: "#dcfce7" },
  void: { label: "ملغاة", color: "#b91c1c", bg: "#fee2e2" },
};

export type QuoteStatusView = QuoteStatus | "expired";

export const QUOTE_STATUS: Record<QuoteStatusView, { label: string; color: string; bg: string }> = {
  draft: { label: "مسودة", color: "#475569", bg: "#f1f5f9" },
  sent: { label: "مُرسل", color: "#1d4ed8", bg: "#dbeafe" },
  accepted: { label: "مقبول", color: "#15803d", bg: "#dcfce7" },
  rejected: { label: "مرفوض", color: "#b91c1c", bg: "#fee2e2" },
  converted: { label: "تحوّل لطلب", color: "#6d28d9", bg: "#ede9fe" },
  cancelled: { label: "ملغي", color: "#b91c1c", bg: "#fee2e2" },
  expired: { label: "منتهي", color: "#b45309", bg: "#fef3c7" },
};

/** A "sent" quote past its validity date is shown as expired. */
export function effectiveQuoteStatus(status: QuoteStatus, validUntil?: string | null): QuoteStatusView {
  if (status === "sent" && validUntil) {
    const end = new Date(`${validUntil}T23:59:59`);
    if (!Number.isNaN(end.getTime()) && end.getTime() < Date.now()) return "expired";
  }
  return status;
}

/** Normalises a Yemeni phone number for wa.me (967XXXXXXXXX). */
export function waPhone(phone: string) {
  let d = (phone || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("967")) return d;
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 9 && d.startsWith("7")) return `967${d}`;
  return d;
}

export function waLinkTo(phone: string, message: string) {
  return `https://wa.me/${waPhone(phone)}?text=${encodeURIComponent(message)}`;
}

export function siteOrigin() {
  return typeof window !== "undefined" ? window.location.origin : "https://zn991.lovable.app";
}

export const invoiceUrl = (id: string) => `${siteOrigin()}/invoice/${id}`;
export const quoteUrl = (id: string) => `${siteOrigin()}/quote/${id}`;
