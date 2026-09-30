import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, MessageCircle } from "lucide-react";
import { createInvoice, listInvoices, setInvoiceStatus } from "@/lib/billing.functions";
import { getPwd, Loading, Empty, Modal } from "@/components/admin/shared";
import {
  DocItemsEditor,
  fieldClass,
  emptyItem,
  parseItems,
  type EditableItem,
} from "@/components/admin/DocItemsEditor";
import { DocumentViewer, docWhatsappMessage, invoiceToDoc } from "@/components/BillingDocument";
import { INVOICE_STATUS, fmtDate, fmtMoney, waLinkTo, type InvoiceRow } from "@/lib/billing-utils";

/* ===================== Invoices ===================== */
export function InvoicesPanel() {
  const fetchInvoices = useServerFn(listInvoices);
  const setStatus = useServerFn(setInvoiceStatus);
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<InvoiceRow | null>(null);
  const [q, setQ] = useState("");

  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: () => fetchInvoices({ data: { password: getPwd() } }),
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return invoices;
    return invoices.filter(
      (i) =>
        i.invoice_number.toLowerCase().includes(s) ||
        i.customer_name.toLowerCase().includes(s) ||
        i.phone.includes(s),
    );
  }, [invoices, q]);

  const change = async (id: string, status: "issued" | "paid" | "void") => {
    if (status === "void" && !confirm("إلغاء هذه الفاتورة؟ (تبقى محفوظة بحالة ملغاة)")) return;
    try {
      await setStatus({ data: { password: getPwd(), id, status } });
      qc.invalidateQueries({ queryKey: ["admin-invoices"] });
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <input
          className={`${fieldClass} sm:max-w-xs`}
          placeholder="بحث: رقم الفاتورة / الاسم / الهاتف"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button onClick={() => setCreating(true)} className="btn-gold">
          <Plus className="w-4 h-4" /> فاتورة جديدة
        </button>
      </div>

      {isLoading && <Loading />}
      {error && (
        <div className="rounded-xl bg-red-50 text-red-700 p-4 text-sm">
          تعذّر تحميل الفواتير. تأكد أنك شغّلت ملف SQL الخاص بالفواتير في قاعدة البيانات.
        </div>
      )}
      {!isLoading && !error && filtered.length === 0 && <Empty msg="لا توجد فواتير" />}

      {filtered.map((inv) => {
        const st = INVOICE_STATUS[inv.status];
        return (
          <div key={inv.id} className="card-clean p-4">
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div>
                <div className="font-mono font-bold">{inv.invoice_number}</div>
                <div className="font-bold mt-1">
                  {inv.customer_name} • <span dir="ltr">{inv.phone}</span>
                </div>
                <div className="text-xs text-[var(--color-ink-soft)]">{fmtDate(inv.issued_at)}</div>
              </div>
              <div className="text-left">
                <div className="text-[var(--color-gold)] font-black text-lg">
                  {fmtMoney(inv.total)}
                </div>
                <span
                  className="inline-block text-xs font-bold px-3 py-1 rounded-full mt-1"
                  style={{ color: st.color, background: st.bg }}
                >
                  {st.label}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={() => setViewing(inv)} className="btn-outline text-xs">
                <Eye className="w-3 h-3" /> عرض / PDF
              </button>
              <a
                className="btn-outline text-xs"
                target="_blank"
                rel="noreferrer"
                href={waLinkTo(inv.phone, docWhatsappMessage(invoiceToDoc(inv)))}
              >
                <MessageCircle className="w-3 h-3" /> واتساب
              </a>
              {inv.status === "issued" && (
                <button onClick={() => change(inv.id, "paid")} className="btn-outline text-xs">
                  تسجيل كمدفوعة
                </button>
              )}
              {inv.status === "paid" && (
                <button onClick={() => change(inv.id, "issued")} className="btn-outline text-xs">
                  إرجاع لغير مدفوعة
                </button>
              )}
              {inv.status !== "void" && (
                <button
                  onClick={() => change(inv.id, "void")}
                  className="text-xs text-red-600 hover:underline px-2"
                >
                  إلغاء الفاتورة
                </button>
              )}
            </div>
          </div>
        );
      })}

      {creating && (
        <InvoiceForm
          onClose={() => setCreating(false)}
          onCreated={(inv) => {
            setCreating(false);
            qc.invalidateQueries({ queryKey: ["admin-invoices"] });
            setViewing(inv);
          }}
        />
      )}
      {viewing && <DocumentViewer data={invoiceToDoc(viewing)} onClose={() => setViewing(null)} />}
    </div>
  );
}

function InvoiceForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (inv: InvoiceRow) => void;
}) {
  const create = useServerFn(createInvoice);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [payment, setPayment] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<EditableItem[]>([emptyItem()]);
  const [discount, setDiscount] = useState("");
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
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
      const res = await create({
        data: {
          password: getPwd(),
          customer_name: name.trim(),
          phone: phone.trim(),
          address: address.trim() || null,
          vehicle: vehicle.trim() || null,
          payment_method: payment.trim() || null,
          notes: notes.trim() || null,
          items,
          discount: Number(discount) || 0,
          mark_paid: paid,
        },
      });
      onCreated(res.invoice);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="فاتورة جديدة" onClose={onClose}>
      <div className="space-y-3">
        <input className={fieldClass} placeholder="اسم العميل" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={fieldClass} placeholder="رقم الهاتف" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className={fieldClass} placeholder="العنوان (اختياري)" value={address} onChange={(e) => setAddress(e.target.value)} />
        <input className={fieldClass} placeholder="السيارة (اختياري) مثال: لاندكروزر 2025" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
        <input className={fieldClass} placeholder="طريقة الدفع (اختياري)" value={payment} onChange={(e) => setPayment(e.target.value)} />
        <DocItemsEditor rows={rows} onChange={setRows} discount={discount} onDiscountChange={setDiscount} />
        <textarea className={fieldClass} rows={2} placeholder="ملاحظات (اختياري)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          الفاتورة مدفوعة
        </label>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button onClick={submit} disabled={busy} className="btn-gold w-full">
          {busy ? "جاري الإصدار..." : "إصدار الفاتورة"}
        </button>
        <p className="text-xs text-[var(--color-ink-soft)]">
          بعد الإصدار لا تتعدل بنود الفاتورة. لو غلطت، ألغِها وأصدر غيرها.
        </p>
      </div>
    </Modal>
  );
}
