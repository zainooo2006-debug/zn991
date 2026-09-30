import { forwardRef, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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

/* html2canvas 1.4.1 cannot read modern CSS colours (oklch, color-mix, color()),
 * which Tailwind v4 / shadcn put on almost every element (border-color,
 * outline-color, ...). Before capturing, every such computed value inside the
 * document is replaced by a plain rgba() value as an inline style. */
const MODERN_COLOR = /(oklch|oklab|color-mix|lab|lch|color)\(/i;
const PURE_MODERN_COLOR = /^(oklch|oklab|color-mix|lab|lch|color)\(/i;
const NONE_WHEN_COMPLEX = new Set([
  "box-shadow",
  "text-shadow",
  "background-image",
  "filter",
  "backdrop-filter",
  "-webkit-mask-image",
  "mask-image",
]);

let colorCtx: CanvasRenderingContext2D | null = null;

function toRgba(value: string): string | null {
  try {
    if (!colorCtx) {
      const c = document.createElement("canvas");
      c.width = 1;
      c.height = 1;
      colorCtx = c.getContext("2d", { willReadFrequently: true });
    }
    const ctx = colorCtx;
    if (!ctx) return null;
    ctx.fillStyle = "#010203"; // sentinel: unchanged after assignment = unsupported value
    ctx.fillStyle = value;
    if (ctx.fillStyle === "#010203") return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
  } catch {
    return null;
  }
}

function sanitizeColors(root: HTMLElement) {
  const nodes: HTMLElement[] = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const node of nodes) {
    const cs = getComputedStyle(node);
    for (let i = 0; i < cs.length; i++) {
      const prop = cs.item(i);
      if (prop.startsWith("--")) continue;
      const v = cs.getPropertyValue(prop);
      if (!v || !MODERN_COLOR.test(v)) continue;
      if (PURE_MODERN_COLOR.test(v.trim())) {
        const rgba = toRgba(v.trim());
        node.style.setProperty(prop, rgba ?? (prop === "color" ? "#0f172a" : "transparent"));
      } else if (NONE_WHEN_COMPLEX.has(prop)) {
        node.style.setProperty(prop, "none");
      }
    }
  }
}

/**
 * Renders the document off-screen (so a scrolled modal / fixed overlay can't
 * crop or blank it), then builds an A4 PDF. If the logo can't be captured
 * (cross-origin), retries without images rather than failing.
 */
export async function downloadElementPdf(el: HTMLElement, filename: string) {
  const holder = document.createElement("div");
  holder.setAttribute("dir", "rtl");
  holder.style.cssText =
    "position:absolute;top:0;left:-10000px;width:800px;background:#ffffff;pointer-events:none;";
  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.margin = "0";
  clone.style.maxWidth = "800px";
  clone.style.width = "800px";
  holder.appendChild(clone);
  document.body.appendChild(holder);

  try {
    sanitizeColors(clone);
    const scale = clone.scrollHeight > 2500 ? 1.5 : 2;
    const render = (withImages: boolean) =>
      html2canvas(clone, {
        scale,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        imageTimeout: 10000,
        onclone: (doc) => {
          // The page's own <html>/<body> backgrounds may use oklch too.
          doc.documentElement.style.background = "#ffffff";
          doc.body.style.background = "#ffffff";
        },
        ignoreElements: withImages ? undefined : (node) => node.tagName === "IMG",
      });

    let canvas: HTMLCanvasElement;
    try {
      canvas = await render(true);
    } catch {
      canvas = await render(false);
    }

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
      const ctx = slice.getContext("2d");
      if (!ctx) throw new Error("canvas unavailable");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      if (page > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL("image/png"), "PNG", margin, margin, w, h / pxPerMm);
      y += h;
      page++;
    }

    try {
      pdf.save(filename);
    } catch {
      // Some in-app browsers block the download; open the PDF instead.
      window.open(pdf.output("bloburl").toString(), "_blank");
    }
  } finally {
    document.body.removeChild(holder);
  }
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
    } catch (err) {
      console.error("[pdf] failed:", err);
      alert(`تعذّر إنشاء ملف PDF\n${err instanceof Error ? err.message : String(err)}`);
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
