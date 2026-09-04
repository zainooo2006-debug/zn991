import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWarrantyAuth } from "@/lib/warranty-auth";
import { Car, Loader2, Plus, Trash2, Edit3, X, PlusCircle } from "lucide-react";

export const Route = createFileRoute("/warranty/cars")({
  component: CarsPage,
});

type Brand = { id: string; name: string };
type CarRow = {
  id: string;
  customer_id: string;
  brand_id: string | null;
  model: string | null;
  year: number | null;
  plate_number: string | null;
  color: string | null;
  vin: string | null;
  notes: string | null;
  car_makes?: { name: string } | null;
};

type FormState = {
  id?: string;
  brand_id: string;
  model: string;
  year: string;
  plate_number: string;
  color: string;
  vin: string;
  notes: string;
};

const emptyForm: FormState = {
  brand_id: "",
  model: "",
  year: "",
  plate_number: "",
  color: "",
  vin: "",
  notes: "",
};

function CarsPage() {
  const { user, loading } = useWarrantyAuth();
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [rows, setRows] = useState<CarRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);

  const load = async (uid: string) => {
    const c = await supabase.from("customers").select("id").eq("user_id", uid).maybeSingle();
    if (!c.data) {
      setRows([]);
      return;
    }
    setCustomerId(c.data.id);
    const [carsRes, brandsRes] = await Promise.all([
      supabase
        .from("cars" as never)
        .select("*, car_makes(name)")
        .eq("customer_id", c.data.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("car_makes" as never)
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order"),
    ]);
    const carsAny = carsRes as unknown as {
      data: CarRow[] | null;
      error: { message: string } | null;
    };
    if (carsAny.error) {
      setErr(carsAny.error.message);
      setRows([]);
      return;
    }
    setRows(carsAny.data ?? []);
    setBrands((brandsRes.data as Brand[]) ?? []);
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/warranty/auth" });
      return;
    }
    load(user.id).catch((e) => {
      setErr(e instanceof Error ? e.message : "تعذر التحميل");
      setRows([]);
    });
  }, [user, loading, navigate]);

  function openAdd() {
    setForm(emptyForm);
    setShowForm(true);
  }
  function openEdit(r: CarRow) {
    setForm({
      id: r.id,
      brand_id: r.brand_id ?? "",
      model: r.model ?? "",
      year: r.year ? String(r.year) : "",
      plate_number: r.plate_number ?? "",
      color: r.color ?? "",
      vin: r.vin ?? "",
      notes: r.notes ?? "",
    });
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) return;
    setBusy(true);
    try {
      const payload = {
        customer_id: customerId,
        brand_id: form.brand_id || null,
        model: form.model.trim() || null,
        year: form.year ? Number(form.year) : null,
        plate_number: form.plate_number.trim() || null,
        color: form.color.trim() || null,
        vin: form.vin.trim() || null,
        notes: form.notes.trim() || null,
      };
      const table = supabase.from("cars" as never);
      if (form.id) {
        const upd = await (
          table as unknown as {
            update: (v: unknown) => {
              eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
            };
          }
        )
          .update(payload)
          .eq("id", form.id);
        if (upd.error) throw upd.error;
      } else {
        const ins = await (
          table as unknown as {
            insert: (v: unknown) => Promise<{ error: { message: string } | null }>;
          }
        ).insert(payload);
        if (ins.error) throw ins.error;
      }
      setShowForm(false);
      setForm(emptyForm);
      if (user) await load(user.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    if (!confirm("حذف هذه السيارة؟ سيتم إلغاء ربطها من أي ضمان مرتبط بها.")) return;
    const res = await (
      supabase.from("cars" as never) as unknown as {
        delete: () => {
          eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
        };
      }
    )
      .delete()
      .eq("id", id);
    if (res.error) {
      setErr(res.error.message);
      return;
    }
    if (user) load(user.id);
  }

  if (loading || rows === null)
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Car className="w-6 h-6 text-amber-500" /> سياراتي
          </h1>
          <p className="text-sm text-slate-500">
            أضف جميع سياراتك مرة واحدة، ثم فعّل الضمان لأي منها.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold"
        >
          <Plus className="w-4 h-4" /> إضافة سيارة
        </button>
      </div>

      {err && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
          {err}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Car className="w-16 h-16 mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-bold">لا توجد سيارات مسجّلة</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            ابدأ بإضافة أول سيارة لتفعيل الضمان لها لاحقًا.
          </p>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold"
          >
            <Plus className="w-4 h-4" /> إضافة سيارة
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <div className="font-bold truncate">
                    {r.car_makes?.name ?? "—"} {r.model ? `· ${r.model}` : ""}
                  </div>
                  <div className="text-xs text-slate-500">
                    {r.year ?? ""} {r.color ? `· ${r.color}` : ""}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(r)}
                    className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                    aria-label="تعديل"
                  >
                    <Edit3 className="w-4 h-4 text-slate-600" />
                  </button>
                  <button
                    onClick={() => del(r.id)}
                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                    aria-label="حذف"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                {r.plate_number && (
                  <div>
                    <span className="text-slate-500">اللوحة:</span> <b>{r.plate_number}</b>
                  </div>
                )}
                {r.vin && (
                  <div className="truncate">
                    <span className="text-slate-500">الهيكل:</span>{" "}
                    <span className="font-mono text-xs">{r.vin}</span>
                  </div>
                )}
                {r.notes && <div className="text-xs text-slate-500 line-clamp-2">{r.notes}</div>}
              </div>
              <Link
                to="/warranty/activate"
                search={{ car: r.id } as never}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 dark:bg-amber-500 text-white rounded-lg font-medium hover:opacity-90"
              >
                <PlusCircle className="w-4 h-4" /> تفعيل ضمان لهذه السيارة
              </Link>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{form.id ? "تعديل سيارة" : "إضافة سيارة"}</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block sm:col-span-2">
                <div className="text-xs font-medium mb-1">الماركة</div>
                <select
                  value={form.brand_id}
                  onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900"
                >
                  <option value="">-- اختر --</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="الموديل"
                value={form.model}
                onChange={(v) => setForm({ ...form, model: v })}
                placeholder="كامري / أكورد ..."
              />
              <Field
                label="سنة الصنع"
                value={form.year}
                onChange={(v) => setForm({ ...form, year: v.replace(/\D/g, "").slice(0, 4) })}
                placeholder="2024"
              />
              <Field
                label="رقم اللوحة"
                value={form.plate_number}
                onChange={(v) => setForm({ ...form, plate_number: v })}
              />
              <Field
                label="اللون"
                value={form.color}
                onChange={(v) => setForm({ ...form, color: v })}
              />
              <Field
                label="رقم الهيكل (VIN)"
                value={form.vin}
                onChange={(v) => setForm({ ...form, vin: v })}
                full
              />
              <label className="block sm:col-span-2">
                <div className="text-xs font-medium mb-1">ملاحظات</div>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900"
                />
              </label>
              <button
                disabled={busy}
                className="sm:col-span-2 py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                {form.id ? "حفظ التعديلات" : "إضافة السيارة"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <div className="text-xs font-medium mb-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900"
      />
    </label>
  );
}
