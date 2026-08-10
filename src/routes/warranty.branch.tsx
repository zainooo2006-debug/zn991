import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWarrantyAuth } from "@/lib/warranty-auth";
import { statusLabel, statusColor, formatDateAr, computeStatus, type WarrantyStatus } from "@/lib/warranty-utils";
import { Loader2, Store, PlusCircle, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/warranty/branch")({
  head: () => ({
    meta: [
      { title: "لوحة مركز التركيب — زين" },
      { name: "description", content: "لوحة خاصة بموظفي مراكز التركيب لعرض ضمانات الفرع وتسجيل ضمان جديد." },
      { property: "og:title", content: "لوحة مركز التركيب — زين" },
      { property: "og:description", content: "عرض ضمانات الفرع وتسجيل ضمان جديد بسرعة من الجوال." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BranchPage,
});

type Row = {
  id: string;
  warranty_number: string;
  activation_date: string;
  expiry_date: string;
  status: WarrantyStatus;
  vin: string | null;
  warranty_brands: { name: string } | null;
  film_types: { name: string } | null;
};

type Brand = { id: string; name: string };
type Film = { id: string; name: string; warranty_months: number };

function BranchPage() {
  const { user, loading, roles } = useWarrantyAuth();
  const navigate = useNavigate();
  const isBranchStaff = roles.includes("branch_staff");

  const [branchName, setBranchName] = useState<string>("");
  const [branchId, setBranchId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/warranty/auth" }); return; }
    if (!isBranchStaff) { navigate({ to: "/warranty/dashboard" }); return; }
  }, [user, loading, isBranchStaff, navigate]);

  const loadWarranties = useCallback(async () => {
    const { data, error } = await supabase
      .from("warranties")
      .select("id, warranty_number, activation_date, expiry_date, status, vin, warranty_brands(name), film_types(name)")
      .order("created_at", { ascending: false });
    if (error) { setErr(error.message); setRows([]); return; }
    setErr(null);
    setRows((data as unknown as Row[]) ?? []);
  }, []);

  useEffect(() => {
    if (loading || !user || !isBranchStaff) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await (supabase.rpc as unknown as (n: string, p: Record<string, unknown>) => Promise<{ data: string | null; error: { message: string } | null }>)(
          "get_user_branch", { _user_id: user.id }
        );
        if (cancelled) return;
        if (r.data) {
          setBranchId(r.data);
          const b = await supabase.from("branches").select("name").eq("id", r.data).maybeSingle();
          if (!cancelled) setBranchName(b.data?.name ?? "");
        }
        await loadWarranties();
      } catch (e) {
        if (!cancelled) { setErr(e instanceof Error ? e.message : "تعذر التحميل"); setRows([]); }
      }
    })();
    return () => { cancelled = true; };
  }, [user, loading, isBranchStaff, loadWarranties]);

  if (loading || !user || !isBranchStaff) {
    return <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" /></div>;
  }

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      <div className="flex items-center gap-2">
        <Store className="w-6 h-6 text-amber-500" />
        <div>
          <h1 className="text-xl font-bold leading-tight">{branchName || "فرعي"}</h1>
          <p className="text-xs text-slate-500">ضمانات الفرع وتسجيل ضمان جديد</p>
        </div>
        <button onClick={() => loadWarranties()} className="mr-auto p-2 rounded-lg border border-slate-200 dark:border-slate-700" aria-label="تحديث">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <NewWarrantyForm branchId={branchId} onDone={loadWarranties} />

      {err && <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">{err}</div>}

      <div className="space-y-3">
        <h2 className="font-bold text-sm text-slate-600 dark:text-slate-300">ضمانات الفرع ({rows?.length ?? 0})</h2>
        {!rows ? (
          <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-500">
            لا توجد ضمانات بعد.
          </div>
        ) : (
          rows.map((r) => {
            const s = computeStatus(r.expiry_date, r.status);
            return (
              <div key={r.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">{r.warranty_number}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold border ${statusColor[s]}`}>{statusLabel[s]}</span>
                </div>
                <div className="text-sm space-y-0.5">
                  <div><span className="text-slate-500">الماركة:</span> <b>{r.warranty_brands?.name ?? "-"}</b></div>
                  <div><span className="text-slate-500">النوع:</span> <b>{r.film_types?.name ?? "-"}</b></div>
                  <div><span className="text-slate-500">التفعيل:</span> {formatDateAr(r.activation_date)}</div>
                  <div><span className="text-slate-500">الانتهاء:</span> {formatDateAr(r.expiry_date)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function NewWarrantyForm({ branchId, onDone }: { branchId: string | null; onDone: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [films, setFilms] = useState<Film[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [brandId, setBrandId] = useState("");
  const [filmId, setFilmId] = useState("");
  const [vin, setVin] = useState("");
  const [activationDate, setActivationDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: "err" | "ok"; m: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [b, f] = await Promise.all([
        supabase.from("warranty_brands").select("id, name").eq("is_active", true).order("sort_order"),
        supabase.from("film_types").select("id, name, warranty_months").eq("is_active", true).order("sort_order"),
      ]);
      setBrands((b.data as Brand[]) ?? []);
      setFilms((f.data as Film[]) ?? []);
    })();
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      if (!customerName.trim() || !customerPhone.trim()) throw new Error("الاسم ورقم الجوال مطلوبان");
      const ins = await supabase.from("customers")
        .insert({ full_name: customerName.trim(), phone: customerPhone.trim() })
        .select("id").single();
      if (ins.error) throw ins.error;

      const r = await (supabase.rpc as unknown as (n: string) => Promise<{ data: string | null; error: { message: string } | null }>)("generate_warranty_number");
      if (r.error) throw r.error;
      const num = r.data ?? "";

      const months = films.find((x) => x.id === filmId)?.warranty_months ?? 12;
      const exp = new Date(activationDate);
      exp.setMonth(exp.getMonth() + months);

      const { error } = await supabase.from("warranties").insert({
        warranty_number: num,
        customer_id: ins.data.id,
        brand_id: brandId || null,
        film_type_id: filmId || null,
        vin: vin.trim() || null,
        branch_id: branchId,
        activation_date: activationDate,
        expiry_date: exp.toISOString().slice(0, 10),
      } as never);
      if (error) throw error;

      setMsg({ t: "ok", m: `تم تسجيل الضمان: ${num}` });
      setCustomerName(""); setCustomerPhone(""); setVin(""); setBrandId(""); setFilmId("");
      await onDone();
    } catch (e) {
      setMsg({ t: "err", m: e instanceof Error ? e.message : "حدث خطأ" });
    } finally { setBusy(false); }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold inline-flex items-center justify-center gap-2">
        <PlusCircle className="w-5 h-5" /> تسجيل ضمان جديد
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-sm">ضمان جديد</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:underline">إلغاء</button>
      </div>
      <Fld label="اسم العميل *"><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required className="fld" /></Fld>
      <Fld label="رقم الجوال *"><input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required className="fld" /></Fld>
      <Fld label="الماركة">
        <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="fld">
          <option value="">-- اختر --</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </Fld>
      <Fld label="نوع اللاصق">
        <select value={filmId} onChange={(e) => setFilmId(e.target.value)} className="fld">
          <option value="">-- اختر --</option>
          {films.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.warranty_months} شهر)</option>)}
        </select>
      </Fld>
      <Fld label="رقم الهيكل (VIN)"><input value={vin} onChange={(e) => setVin(e.target.value)} className="fld" dir="ltr" /></Fld>
      <Fld label="تاريخ التركيب *"><input type="date" value={activationDate} onChange={(e) => setActivationDate(e.target.value)} required className="fld" /></Fld>

      {msg && (
        <div className={`text-sm p-3 rounded-lg ${msg.t === "err" ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
          {msg.m}
        </div>
      )}

      <button disabled={busy} className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} حفظ الضمان
      </button>
    </form>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</div>
      <div className="[&_.fld]:w-full [&_.fld]:px-3 [&_.fld]:py-2 [&_.fld]:border [&_.fld]:border-slate-300 [&_.fld]:dark:border-slate-600 [&_.fld]:rounded-lg [&_.fld]:bg-slate-50 [&_.fld]:dark:bg-slate-900 [&_.fld]:outline-none">
        {children}
      </div>
    </label>
  );
}
