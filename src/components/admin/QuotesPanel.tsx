import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, MessageCircle, Pencil, ShoppingBag } from "lucide-react";
import {
  convertQuoteToOrder,
  deleteQuote,
  listQuotes,
  saveQuote,
  setQuoteStatus,
} from "@/lib/billing.functions";
import { getPwd, Loading, Empty, Modal } from "@/components/admin/shared";
import {
  DocItemsEditor,
  fieldClass,
  emptyItem,
  parseItems,
  toEditable,
  type EditableItem,
} from "@/components/admin/DocItemsEditor";
import { DocumentViewer, docWhatsappMessage, quoteToDoc } from "@/components/BillingDocument";
import {
  QUOTE_STATUS,
  effectiveQuoteStatus,
  fmtDate,
  fmtMoney,
  waLinkTo,
  type QuoteRow,
  type QuoteStatus,
} from "@/lib/billing-utils";

const FILTERS: { id: "all" | QuoteStatus | "expired"; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "draft", label: "مسودات" },
  { id: "sent", label: "مُرسلة" },
  { id: "accepted", label: "مقبولة" },
  { id: "expired", label: "منتهية" },
  { id: "converted", label: "تحوّلت لطلب" },
];

/* ===================== Quotes ===================== */
export function QuotesPanel() {
  const fetchQuotes = useServerFn(listQuotes);
  const setStatus = useServerFn(setQuoteStatus);
  const convert = useServerFn(convertQuoteToOrder);
  const remove = useServerFn(deleteQuote);
  const qc = useQueryClient();

  const [editing, setEditing] = useState<QuoteRow | "new" | null>(null);
  const [viewing, setViewing] = useState<QuoteRow | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [q, setQ] = useState("");

  const { data: quotes = [], isLoading, error } = useQuery({
    queryKey: ["admin-quotes"],
    queryFn: () => fetchQuotes({ data: { password: getPwd() } }),
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-quotes"] });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return quotes.filter((x) => {
      const view = effectiveQuoteStatus(x.status, x.valid_until);
      if (filter !== "all" && view !== filter) return false;
      if (!s) return true;
      return (
        x.quote_number.toLowerCase().includes(s) ||
        x.customer_name.toLowerCase().includes(s) ||
        x.phone.includes(s)
      );
    });
  }, [quotes, filter, q]);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      refresh();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const changeStatus = (id: string, status: "draft" | "sent" | "accepted" | "rejected" | "cancelled") =>
    run(() => setStatus({ data: { password: getPwd(), id, status } }));

  const onConvert = (x: QuoteRow) =>
    run(async () => {
      if (!confirm(`تحويل ${x.quote_number} إلى طلب مؤكد؟`)) return;
      await convert({ data: { password: getPwd(), id: x.id } });
      alert("تم إنشاء الطلب. تلقاه في تبويب الطلبات، ومنه تقدر تصدر الفاتورة.");
    });

  const onDelete = (x: QuoteRow) =>
    run(async () => {
      if (!confirm("حذف هذه المسودة نهائياً؟")) return;
      await remove({ data: { password: getPwd(), id: x.id } });
    });

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <input
          className={`${fieldClass} sm:max-w-xs`}
          placeholder="بحث: رقم العرض / الاسم / الهاتف"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button onClick={() => setEditing("new")} className="btn-gold">
          <Plus className="w-4 h-4" /> عرض سعر جديد
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
              filter === f.id
                ? "bg-[var(--color-gold)] text-[var(--color-ink)]"
                : "bg-[var(--color-surface)] text-[var(--color-ink-soft)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <Loading />}
      {error && (
        <div className="rounded-xl bg-red-50 text-red-700 p-4 text-sm">
          تعذّر تحميل عروض الأسعار. تأكد أنك شغّلت ملف SQL الخاص بالفواتير والعروض في قاعدة البيانات.
        </div>
      )}
      {!isLoading && !error && filtered.length === 0 && <Empty msg="لا توجد عروض أسعار" />}

      {filtered.map((x) => {
        const view = effectiveQuoteStatus(x.status, x.valid_until);
        const st = QUOTE_STATUS[view];
        const locked = x.status === "converted";
        return (
          <div key={x.id} className="card-clean p-4">
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div>
                <div className="font-mono font-bold">{x.quote_number}</div>
                <div className="font-bold mt-1">
                  {x.customer_name} • <span dir="ltr">{x.phone}</span>
                </div>
                {x.vehicle && <div className="text-xs mt-0.5">🚗 {x.vehicle}</div>}
                <div className="text-xs text-[var(--color-ink-soft)]">
                  {fmtDate(x.created_at)}
                  {x.valid_until ? ` • ساري حتى ${fmtDate(x.valid_until)}` : ""}
                </div>
              </div>
              <div className="text-left">
                <div className="text-[var(--color-gold)] font-black text-lg">{fmtMoney(x.total)}</div>
                <span
                  className="inline-block text-xs font-bold px-3 py-1 rounded-full mt-1"
                  style={{ color: st.color, background: st.bg }}
                >
                  {st.label}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3 items-center">
              <button onClick={() => setViewing(x)} className="btn-outline text-xs">
                <Eye className="w-3 h-3" /> عرض / PDF
              </button>
              {!locked && (
                <button onClick={() => setEditing(x)} className="btn-outline text-xs">
                  <Pencil className="w-3 h-3" /> تعديل
                </button>
              )}
              {x.status !== "draft" && (
                <a
                  className="btn-outline text-xs"
                  target="_blank"
                  rel="noreferrer"
                  href={waLinkTo(x.phone, docWhatsappMessage(quoteToDoc(x)))}
                >
                  <MessageCircle className="w-3 h-3" /> واتساب
                </a>
              )}
              {!locked && x.status !== "rejected" && x.status !== "cancelled" && (
                <button onClick={() => onConvert(x)} className="btn-outline text-xs">
                  <ShoppingBag className="w-3 h-3" /> تحويل إلى طلب
                </button>
              )}
              {!locked && (
                <select
                  value={x.status}
                  onChange={(e) => changeStatus(x.id, e.target.value as never)}
                  className="text-xs border border-[var(--color-hairline)] rounded px-2 py-1"
                >
                  <option value="draft">مسودة</option>
                  <option value="sent">مُرسل</option>
                  <option value="accepted">مقبول</option>
                  <option value="rejected">مرفوض</option>
                  <option value="cancelled">ملغي</option>
                </select>
              )}
              {x.status === "draft" && (
                <button onClick={() => onDelete(x)} className="text-xs text-red-600 hover:underline px-2">
                  حذف
                </button>
              )}
            </div>
          </div>
        );
      })}

      {editing && (
        <QuoteForm
          quote={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved, andView) => {
            setEditing(null);
            refresh();
            if (andView) setViewing(saved);
          }}
        />
      )}
      {viewing && (
        <DocumentViewer
          data={quoteToDoc(viewing)}
          onClose={() => setViewing(null)}
          onShared={() => {
            if (viewing.status === "draft") changeStatus(viewing.id, "sent");
          }}
        />
      )}
    </div>
  );
}

function QuoteForm({
  quote,
  onClose,
  onSaved,
}: {
  quote: QuoteRow | null;
  onClose: () => void;
  onSaved: (q: QuoteRow, andView: boolean) => void;
}) {
  const save = useServerFn(saveQuote);
  const [name, setName] = useState(quote?.customer_name ?? "");
  const [phone, setPhone] = useState(quote?.phone ?? "");
  const [vehicle, setVehicle] = useState(quote?.vehicle ?? "");
  const [validUntil, setValidUntil] = useState(quote?.valid_until ?? "");
  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [rows, setRows] = useState<EditableItem[]>(quote ? toEditable(quote.items) : [emptyItem()]);
  const [discount, setDiscount] = useState(quote && quote.discount ? String(quote.discount) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (andView: boolean) => {
    setErr("");
    const items = parseItems(rows);
    if (name.trim().length < 2 || phone.trim().length < 6) {
      setErr("اكتب اسم العميل ورقم هاتفه");
      return;
    }
    if (!items) {
      setErr("تأكد من البنود: الاسم والكمية والسعر لكل بند");
      return;
    }
    setBusy(true);
    try {
      const saved = await save({
        data: {
          password: getPwd(),
          id: quote?.id ?? null,
          customer_name: name.trim(),
          phone: phone.trim(),
          vehicle: vehicle.trim() || null,
          items,
          discount: Number(discount) || 0,
          valid_until: validUntil || null,
          notes: notes.trim() || null,
        },
      });
      onSaved(saved, andView);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={quote ? `تعديل ${quote.quote_number}` : "عرض سعر جديد"} onClose={onClose}>
      <div className="space-y-3">
        <input className={fieldClass} placeholder="اسم العميل" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={fieldClass} placeholder="رقم الهاتف" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className={fieldClass} placeholder="السيارة (اختياري) مثال: لاندكروزر 2025" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
        <div className="grid grid-cols-2 gap-2 items-center">
          <label className="text-sm">ساري حتى (اختياري)</label>
          <input type="date" className={fieldClass} dir="ltr" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
        <DocItemsEditor rows={rows} onChange={setRows} discount={discount} onDiscountChange={setDiscount} />
        <textarea className={fieldClass} rows={2} placeholder="ملاحظات / شروط (اختياري)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {err && <div className="text-sm text-red-600">{err}</div>}
        <div className="flex gap-2">
          <button onClick={() => submit(true)} disabled={busy} className="btn-gold flex-1">
            {busy ? "جاري الحفظ..." : "حفظ ومعاينة"}
          </button>
          <button onClick={() => submit(false)} disabled={busy} className="btn-outline flex-1">
            حفظ فقط
          </button>
        </div>
        <p className="text-xs text-[var(--color-ink-soft)]">
          العرض يبقى مسودة (لا يراه العميل) لين ترسله بواتساب أو تغيّر حالته إلى مُرسل.
        </p>
      </div>
    </Modal>
  );
}
