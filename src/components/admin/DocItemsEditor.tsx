import { Plus, Trash2 } from "lucide-react";
import { calcTotals, fmtMoney, type DocItem } from "@/lib/billing-utils";

export const fieldClass =
  "w-full rounded-lg border border-[var(--color-hairline)] bg-[var(--color-card)] px-3 py-2 text-sm outline-none focus:border-[var(--color-gold)]";

export type EditableItem = { name: string; qty: string; price: string };

export const emptyItem = (): EditableItem => ({ name: "", qty: "1", price: "" });

export function toEditable(items: DocItem[]): EditableItem[] {
  return items.length
    ? items.map((i) => ({ name: i.name, qty: String(i.qty), price: String(i.price) }))
    : [emptyItem()];
}

/** Returns valid items, or null if any filled row is invalid / none are filled. */
export function parseItems(rows: EditableItem[]): DocItem[] | null {
  const out: DocItem[] = [];
  for (const r of rows) {
    if (!r.name.trim() && !r.price.trim()) continue; // ignore fully empty rows
    const qty = Number(r.qty);
    const price = Number(r.price);
    if (!r.name.trim() || !Number.isInteger(qty) || qty < 1 || !(price >= 0) || r.price.trim() === "") {
      return null;
    }
    out.push({ name: r.name.trim(), qty, price });
  }
  return out.length ? out : null;
}

export function DocItemsEditor({
  rows,
  onChange,
  discount,
  onDiscountChange,
}: {
  rows: EditableItem[];
  onChange: (rows: EditableItem[]) => void;
  discount: string;
  onDiscountChange: (v: string) => void;
}) {
  const set = (i: number, patch: Partial<EditableItem>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const parsed = parseItems(rows);
  const totals = parsed ? calcTotals(parsed, Number(discount) || 0) : null;

  return (
    <div className="space-y-2">
      <div className="text-sm font-bold">البنود</div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-center">
          <input
            className={`${fieldClass} col-span-12 sm:col-span-6`}
            placeholder="اسم البند (منتج / خدمة)"
            value={r.name}
            onChange={(e) => set(i, { name: e.target.value })}
          />
          <input
            className={`${fieldClass} col-span-4 sm:col-span-2`}
            placeholder="الكمية"
            inputMode="numeric"
            dir="ltr"
            value={r.qty}
            onChange={(e) => set(i, { qty: e.target.value.replace(/\D/g, "") })}
          />
          <input
            className={`${fieldClass} col-span-6 sm:col-span-3`}
            placeholder="السعر"
            inputMode="decimal"
            dir="ltr"
            value={r.price}
            onChange={(e) => set(i, { price: e.target.value.replace(/[^\d.]/g, "") })}
          />
          <button
            type="button"
            onClick={() => onChange(rows.length > 1 ? rows.filter((_, idx) => idx !== i) : [emptyItem()])}
            className="col-span-2 sm:col-span-1 text-red-600 flex justify-center"
            aria-label="حذف البند"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, emptyItem()])}
        className="btn-outline text-xs"
      >
        <Plus className="w-3 h-3" /> إضافة بند
      </button>

      <div className="grid grid-cols-2 gap-2 items-center pt-2">
        <label className="text-sm">الخصم (ر.ي)</label>
        <input
          className={fieldClass}
          inputMode="decimal"
          dir="ltr"
          placeholder="0"
          value={discount}
          onChange={(e) => onDiscountChange(e.target.value.replace(/[^\d.]/g, ""))}
        />
      </div>

      {totals ? (
        <div className="rounded-lg bg-[var(--color-surface)] p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span>المجموع</span>
            <span>{fmtMoney(totals.subtotal)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between">
              <span>الخصم</span>
              <span>- {fmtMoney(totals.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-[var(--color-gold)]">
            <span>الإجمالي</span>
            <span>{fmtMoney(totals.total)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
