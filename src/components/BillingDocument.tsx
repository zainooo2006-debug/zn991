import { forwardRef, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Link2, Loader2, MessageCircle, Printer, X } from "lucide-react";
import logoAsset from "@/assets/logo-tajalmoluk.png.asset.json";
import { useSiteContentValue } from "@/lib/site-content";
import {
  INVOICE_STATUS,
  QUOTE_STATUS,
  effectiveQuoteStatus,
  fmtDate,
  fmtMoney,
  invoiceUrl,
  quoteUrl,
  waLinkTo,
  type DocItem,
  type InvoiceRow,
  type QuoteRow,
} from "@/lib/billing-utils";

/* All colours below are inline hex on purpose: html2canvas (used for the PDF)
 * cannot parse the oklch()/color-mix() colours that Tailwind v4 generates. */

export type DocData = {
  kind: "invoice" | "quote";
  id: string;
  number: string;
  date: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
  customer_name: string;
  phone: string;
  address?: string | null;
  vehicle?: string | null;
  items: DocItem[];
  subtotal: number;
  discount: number;
  total: number;
  notes?: string | null;
  payment_method?: string | null;
  valid_until?: string | null;
  url: string;
};

export function invoiceToDoc(inv: InvoiceRow): DocData {
  const st = INVOICE_STATUS[inv.status];
  return {
    kind: "invoice",
    id: inv.id,
    number: inv.invoice_number,
    date: inv.issued_at,
    statusLabel: st.label,
    statusColor: st.color,
    statusBg: st.bg,
    customer_name: inv.customer_name,
    phone: inv.phone,
    address: inv.address,
    vehicle: inv.vehicle,
    items: inv.items,
    subtotal: inv.subtotal,
    discount: inv.discount,
    total: inv.total,
    notes: inv.notes,
    payment_method: inv.payment_method,
    url: invoiceUrl(inv.id),
  };
}

export function quoteToDoc(q: QuoteRow): DocData {
  const st = QUOTE_STATUS[effectiveQuoteStatus(q.status, q.valid_until)];
  return {
    kind: "quote",
    id: q.id,
    number: q.quote_number,
    date: q.created_at,
    statusLabel: st.label,
    statusColor: st.color,
    statusBg: st.bg,
    customer_name: q.customer_name,
    phone: q.phone,
    vehicle: q.vehicle,
    items: q.items,
    subtotal: q.subtotal,
    discount: q.discount,
    total: q.total,
    notes: q.notes,
    valid_until: q.valid_until,
    url: quoteUrl(q.id),
  };
}

const C = {
  ink: "#0f172a",
  soft: "#64748b",
  line: "#e2e8f0",
  surface: "#f8fafc",
  gold: "#b45309",
};

export const BillingDocument = forwardRef<HTMLDivElement, { data: DocData }>(
  function BillingDocument({ data }, ref) {
    const branding = useSiteContentValue("branding");
    const isInvoice = data.kind === "invoice";

    return (
      <div
        ref={ref}
        dir="rtl"
        style={{
          background: "#ffffff",
          color: C.ink,
          border: "4px solid #f59e0b",
          borderRadius: 16,
          overflow: "hidden",
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(to left, #f59e0b, #eab308)",
            color: "#ffffff",
            padding: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={branding.logoUrl || logoAsset.url}
              alt="زين"
              crossOrigin="anonymous"
              style={{
                height: 64,
                width: "auto",
                background: "#ffffff",
                borderRadius: 8,
                padding: 4,
              }}
            />
            <div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>زين</div>
              <div style={{ fontSize: 14, opacity: 0.95 }}>
                {isInvoice ? "فاتورة" : "عرض سعر"}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 12, opacity: 0.95 }}>
              {isInvoice ? "رقم الفاتورة" : "رقم العرض"}
            </div>
            <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 20 }}>
              {data.number}
            </div>
            <div style={{ fontSize: 12, opacity: 0.95, marginTop: 4 }}>{fmtDate(data.date)}</div>
          </div>
        </div>

        {/* Customer + details */}
        <div style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 24,
              justifyContent: "space-between",
              fontSize: 14,
            }}
          >
            <div style={{ minWidth: 200, flex: 1 }}>
              <div style={{ color: C.soft, fontSize: 12, marginBottom: 4 }}>بيانات العميل</div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{data.customer_name}</div>
              <div dir="ltr" style={{ textAlign: "right", marginTop: 2 }}>
                {data.phone}
              </div>
              {data.address ? <div style={{ marginTop: 2 }}>📍 {data.address}</div> : null}
              {data.vehicle ? <div style={{ marginTop: 2 }}>🚗 {data.vehicle}</div> : null}
            </div>
            <div style={{ minWidth: 200, flex: 1 }}>
              <div style={{ color: C.soft, fontSize: 12, marginBottom: 4 }}>التفاصيل</div>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 12px",
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: 13,
                  color: data.statusColor,
                  background: data.statusBg,
                }}
              >
                {data.statusLabel}
              </span>
              {isInvoice && data.payment_method ? (
                <div style={{ marginTop: 6 }}>طريقة الدفع: {data.payment_method}</div>
              ) : null}
              {!isInvoice && data.valid_until ? (
                <div style={{ marginTop: 6 }}>ساري حتى: {fmtDate(data.valid_until)}</div>
              ) : null}
            </div>
          </div>

          {/* Items */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 20,
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ background: C.surface, color: C.soft, fontSize: 12 }}>
                <th style={th("center", 36)}>#</th>
                <th style={th("right")}>البند</th>
                <th style={th("center", 60)}>الكمية</th>
                <th style={th("center", 110)}>السعر</th>
                <th style={th("center", 120)}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it, i) => (
                <tr key={i}>
                  <td style={td("center")}>{i + 1}</td>
                  <td style={td("right")}>{it.name}</td>
                  <td style={td("center")}>{it.qty}</td>
                  <td style={td("center")}>{fmtMoney(it.price)}</td>
                  <td style={{ ...td("center"), fontWeight: 700 }}>
                    {fmtMoney(it.price * it.qty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals + QR */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 24,
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginTop: 20,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  display: "inline-block",
                  padding: 8,
                  background: "#ffffff",
                  border: `1px solid ${C.line}`,
                  borderRadius: 8,
                }}
              >
                <QRCodeSVG value={data.url} size={96} />
              </div>
              <div style={{ fontSize: 11, color: C.soft, marginTop: 4 }}>امسح لعرض المستند</div>
            </div>

            <div style={{ minWidth: 240, fontSize: 14 }}>
              <Row label="المجموع" value={fmtMoney(data.subtotal)} />
              {data.discount > 0 ? (
                <Row label="الخصم" value={`- ${fmtMoney(data.discount)}`} />
              ) : null}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: `2px solid #f59e0b`,
                  fontWeight: 900,
                  fontSize: 18,
                  color: C.gold,
                }}
              >
                <span>الإجمالي</span>
                <span>{fmtMoney(data.total)}</span>
              </div>
            </div>
          </div>

          {data.notes ? (
            <div
              style={{
                marginTop: 20,
                padding: 12,
                background: C.surface,
                borderRadius: 8,
                fontSize: 13,
                whiteSpace: "pre-wrap",
              }}
            >
              <div style={{ color: C.soft, fontSize: 12, marginBottom: 2 }}>ملاحظات</div>
              {data.notes}
            </div>
          ) : null}
        </div>

        <div
          style={{
            background: C.surface,
            padding: 16,
            textAlign: "center",
            fontSize: 12,
            color: "#475569",
            borderTop: `1px solid ${C.line}`,
          }}
        >
          {isInvoice
            ? "شكراً لثقتكم بنا."
            : "هذا العرض غير ملزم قبل تأكيده معنا، والأسعار بالريال اليمني."}{" "}
          مؤسسة زين اصل الحماية للعناية وزينة السيارات - صنعاء، اليمن. لأي استفسار: 780687704
        </div>
      </div>
    );
  },
);

function th(align: "right" | "center", width?: number): React.CSSProperties {
  return {
    padding: "8px 6px",
    textAlign: align,
    width,
    borderBottom: `1px solid ${C.line}`,
    fontWeight: 700,
  };
}
function td(align: "right" | "center"): React.CSSProperties {
  return { padding: "10px 6px", textAlign: align, borderBottom: `1px solid ${C.line}` };
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "2px 0" }}>
      <span style={{ color: C.soft }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export async function downloadElementPdf(el: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const w = pageW - margin * 2;
  const pxPerMm = canvas.width / w;
  const sliceH = Math.floor((pageH - margin * 2) * pxPerMm);

  let y = 0;
  let page = 0;
  while (y < canvas.height) {
    const h = Math.min(sliceH, canvas.height - y);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = h;
    slice.getContext("2d")!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (page > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL("image/png"), "PNG", margin, margin, w, h / pxPerMm);
    y += h;
    page++;
  }
  pdf.save(filename);
}

export function docWhatsappMessage(d: DocData) {
  const what = d.kind === "invoice" ? "فاتورتك" : "عرض السعر الخاص بك";
  return [
    `مرحباً ${d.customer_name} 👋`,
    `${what} من زين رقم ${d.number}`,
    `الإجمالي: ${fmtMoney(d.total)}`,
    d.url,
  ].join("\n");
}

/** Buttons under a document: PDF, WhatsApp to customer, copy link, print. */
export function DocActions({
  data,
  docRef,
  showPrint,
  hideWhatsapp,
  onShared,
}: {
  data: DocData;
  docRef: React.RefObject<HTMLDivElement | null>;
  showPrint?: boolean;
  /** Public pages hide the "send to customer" button (the viewer IS the customer). */
  hideWhatsapp?: boolean;
  onShared?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const pdf = async () => {
    if (!docRef.current) return;
    setBusy(true);
    try {
      await downloadElementPdf(docRef.current, `${data.number}.pdf`);
    } catch {
      alert("تعذّر إنشاء ملف PDF");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      prompt("انسخ الرابط:", data.url);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center print:hidden">
      <button onClick={pdf} disabled={busy} className="btn-gold">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        تحميل PDF
      </button>
      {hideWhatsapp ? null : (
        <a
          href={waLinkTo(data.phone, docWhatsappMessage(data))}
          target="_blank"
          rel="noreferrer"
          onClick={onShared}
          className="btn-outline"
        >
          <MessageCircle className="w-4 h-4" />
          إرسال للعميل واتساب
        </a>
      )}
      <button onClick={copy} className="btn-outline">
        <Link2 className="w-4 h-4" />
        {copied ? "تم النسخ ✓" : "نسخ الرابط"}
      </button>
      {showPrint ? (
        <button onClick={() => window.print()} className="btn-outline">
          <Printer className="w-4 h-4" />
          طباعة
        </button>
      ) : null}
    </div>
  );
}

/** Full-screen viewer used from the admin panels. */
export function DocumentViewer({
  data,
  onClose,
  onShared,
}: {
  data: DocData;
  onClose: () => void;
  onShared?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 overflow-auto p-3"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-3xl mx-auto space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-white rounded-full p-2 shadow"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <BillingDocument ref={ref} data={data} />
        <div className="bg-white rounded-2xl p-3">
          <DocActions data={data} docRef={ref} onShared={onShared} />
        </div>
      </div>
    </div>
  );
}
