import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { listCoupons, saveCoupon, deleteCoupon, type CouponRow } from "@/lib/coupons.functions";
import { getPwd, Modal, Input, Select, Loading, Empty } from "@/components/admin/shared";

/* ===================== Coupons ===================== */

const fmtNum = (n: number) => Number(n).toLocaleString("en-US");

/** ISO timestamp -> YYYY-MM-DD in the admin's local time (for <input type="date">). */
function toDateInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-CA");
}

function couponState(c: CouponRow) {
  const now = Date.now();
  if (!c.is_active) return { label: "موقوف", cls: "bg-gray-100 text-gray-600" };
  if (c.expires_at && new Date(c.expires_at).getTime() < now)
    return { label: "منتهي", cls: "bg-red-100 text-red-700" };
  if (c.starts_at && new Date(c.starts_at).getTime() > now)
    return { label: "لم يبدأ", cls: "bg-blue-100 text-blue-700" };
  if (c.max_uses !== null && c.used_count >= c.max_uses)
    return { label: "استُهلك", cls: "bg-red-100 text-red-700" };
  return { label: "فعّال", cls: "bg-green-100 text-green-700" };
}

export function CouponsPanel() {
  const fetchCoupons = useServerFn(listCoupons);
  const save = useServerFn(saveCoupon);
  const del = useServerFn(deleteCoupon);
  const qc = useQueryClient();
  const {
    data: coupons = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: () => fetchCoupons({ data: { password: getPwd() } }),
    retry: false,
  });
  const [editing, setEditing] = useState<Partial<CouponRow> | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-coupons"] });

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذا الكوبون؟ (الطلبات القديمة لا تتأثر)")) return;
    try {
      await del({ data: { password: getPwd(), id } });
      refresh();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const toggle = async (c: CouponRow) => {
    try {
      await save({
        data: {
          password: getPwd(),
          id: c.id,
          data: {
            code: c.code,
            kind: c.kind,
            value: c.value,
            min_order: c.min_order,
            max_discount: c.max_discount,
            max_uses: c.max_uses,
            starts_at: c.starts_at,
            expires_at: c.expires_at,
            is_active: !c.is_active,
            note: c.note,
          },
        },
      });
      refresh();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div>
      <div className="flex justify-between mb-4 gap-2 flex-wrap">
        <h2 className="font-bold text-lg">كوبونات الخصم ({coupons.length})</h2>
        <button
          onClick={() => setEditing({ kind: "percent", is_active: true, min_order: 0 })}
          className="btn-gold"
        >
          <Plus className="w-4 h-4" /> كوبون جديد
        </button>
      </div>

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          تعذّر تحميل الكوبونات. تأكد أنك شغّلت ملف SQL الخاص بالكوبونات والمخزون.
          <span className="block text-xs mt-1" dir="ltr">
            {(error as Error)?.message}
          </span>
        </p>
      ) : coupons.length === 0 ? (
        <Empty msg="لا توجد كوبونات بعد" />
      ) : (
        <ul className="space-y-2">
          {coupons.map((c) => {
            const st = couponState(c);
            return (
              <li key={c.id} className="card-clean p-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-48">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black font-mono" dir="ltr">
                      {c.code}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="text-sm text-[var(--color-gold)] font-bold">
                    {c.kind === "percent"
                      ? `خصم ${fmtNum(c.value)}%${c.max_discount ? ` (حتى ${fmtNum(c.max_discount)} ر.ي)` : ""}`
                      : `خصم ${fmtNum(c.value)} ر.ي`}
                  </div>
                  <div className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                    الاستخدام: {c.used_count}
                    {c.max_uses !== null ? ` / ${c.max_uses}` : " (بدون حد)"}
                    {c.min_order > 0 ? ` • حد أدنى للطلب ${fmtNum(c.min_order)} ر.ي` : ""}
                    {c.expires_at ? ` • ينتهي ${toDateInput(c.expires_at)}` : ""}
                  </div>
                  {c.note && (
                    <div className="text-xs text-[var(--color-ink-soft)] mt-0.5">{c.note}</div>
                  )}
                </div>
                <button onClick={() => toggle(c)} className="btn-outline text-xs">
                  {c.is_active ? "إيقاف" : "تفعيل"}
                </button>
                <button onClick={() => setEditing(c)} className="p-2 text-[var(--color-gold)]">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(c.id)} className="p-2 text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <Modal title={editing.id ? "تعديل كوبون" : "كوبون جديد"} onClose={() => setEditing(null)}>
          <CouponForm
            initial={editing}
            onSave={async (data) => {
              await save({ data: { password: getPwd(), id: editing.id, data } });
              setEditing(null);
              refresh();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function CouponForm({
  initial,
  onSave,
}: {
  initial: Partial<CouponRow>;
  onSave: (d: {
    code: string;
    kind: "percent" | "fixed";
    value: number;
    min_order: number;
    max_discount: number | null;
    max_uses: number | null;
    starts_at: string | null;
    expires_at: string | null;
    is_active: boolean;
    note: string | null;
  }) => Promise<void>;
}) {
  const [code, setCode] = useState(initial.code || "");
  const [kind, setKind] = useState<"percent" | "fixed">(initial.kind || "percent");
  const [value, setValue] = useState(initial.value != null ? String(initial.value) : "");
  const [minOrder, setMinOrder] = useState(initial.min_order ? String(initial.min_order) : "");
  const [maxDiscount, setMaxDiscount] = useState(
    initial.max_discount ? String(initial.max_discount) : "",
  );
  const [maxUses, setMaxUses] = useState(initial.max_uses ? String(initial.max_uses) : "");
  const [startsAt, setStartsAt] = useState(toDateInput(initial.starts_at));
  const [expiresAt, setExpiresAt] = useState(toDateInput(initial.expires_at));
  const [active, setActive] = useState(initial.is_active !== false);
  const [note, setNote] = useState(initial.note || "");
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave({
            code: code.trim().toUpperCase(),
            kind,
            value: Number(value),
            min_order: minOrder ? Number(minOrder) : 0,
            max_discount: kind === "percent" && maxDiscount ? Number(maxDiscount) : null,
            max_uses: maxUses ? Math.floor(Number(maxUses)) : null,
            starts_at: startsAt ? new Date(`${startsAt}T00:00:00`).toISOString() : null,
            expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
            is_active: active,
            note: note.trim() || null,
          });
        } catch (err) {
          alert((err as Error).message);
        }
        setBusy(false);
      }}
      className="space-y-3"
    >
      <Input label="الكود * (أحرف إنجليزية وأرقام)" value={code} onChange={setCode} required ltr />
      <Select
        label="نوع الخصم"
        value={kind}
        onChange={(v) => setKind(v as "percent" | "fixed")}
        options={[
          { value: "percent", label: "نسبة مئوية %" },
          { value: "fixed", label: "مبلغ ثابت (ر.ي)" },
        ]}
      />
      <Input
        label={kind === "percent" ? "نسبة الخصم % *" : "مبلغ الخصم (ر.ي) *"}
        type="number"
        value={value}
        onChange={setValue}
        required
      />
      {kind === "percent" && (
        <Input
          label="أقصى مبلغ خصم (اختياري)"
          type="number"
          value={maxDiscount}
          onChange={setMaxDiscount}
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <Input label="حد أدنى للطلب (اختياري)" type="number" value={minOrder} onChange={setMinOrder} />
        <Input label="عدد مرات الاستخدام (اختياري)" type="number" value={maxUses} onChange={setMaxUses} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="يبدأ من (اختياري)" type="date" value={startsAt} onChange={setStartsAt} />
        <Input label="ينتهي في (اختياري)" type="date" value={expiresAt} onChange={setExpiresAt} />
      </div>
      <Input label="ملاحظة داخلية (اختياري)" value={note} onChange={setNote} />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="accent-[var(--color-gold)]"
        />
        فعّال
      </label>
      <button type="submit" disabled={busy} className="btn-gold w-full">
        {busy ? "جاري الحفظ..." : "حفظ"}
      </button>
    </form>
  );
}
