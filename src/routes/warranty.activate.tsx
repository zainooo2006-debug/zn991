import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWarrantyAuth } from "@/lib/warranty-auth";
import { Loader2, PlusCircle, Car } from "lucide-react";

export const Route = createFileRoute("/warranty/activate")({
  component: ActivatePage,
});


type Brand = { id: string; name: string };
type Film = { id: string; name: string; warranty_months: number; brand_id: string | null };
type Branch = { id: string; name: string };
type CarRow = { id: string; brand_id: string | null; model: string | null; year: number | null; plate_number: string | null; vin: string | null };

function ActivatePage() {
  const { user, loading } = useWarrantyAuth();
  const navigate = useNavigate();
  const preselectCar = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("car") ?? undefined : undefined;


  const [brands, setBrands] = useState<Brand[]>([]);
  const [films, setFilms] = useState<Film[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cars, setCars] = useState<CarRow[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [warrantyNumber, setWarrantyNumber] = useState("");
  const [carId, setCarId] = useState<string>("");
  const [brandId, setBrandId] = useState("");
  const [filmId, setFilmId] = useState("");
  const [vin, setVin] = useState("");
  const [branchId, setBranchId] = useState("");
  const [activationDate, setActivationDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: "err" | "ok"; m: string } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/warranty/auth" }); return; }
    (async () => {
      const [b, f, br, c] = await Promise.all([
        supabase.from("warranty_brands").select("id, name").eq("is_active", true).order("sort_order"),
        supabase.from("film_types").select("id, name, warranty_months, brand_id").eq("is_active", true).order("sort_order"),
        supabase.from("branches").select("id, name").eq("is_active", true).order("sort_order"),
        supabase.from("customers").select("id, full_name, phone").eq("user_id", user.id).maybeSingle(),
      ]);
      setBrands((b.data as Brand[]) ?? []);
      setFilms((f.data as Film[]) ?? []);
      setBranches((br.data as Branch[]) ?? []);
      if (c.data) {
        setCustomerId(c.data.id);
        setCustomerName(c.data.full_name ?? "");
        setCustomerPhone(c.data.phone ?? "");
        const carsRes = await supabase.from("cars" as never).select("id, brand_id, model, year, plate_number, vin").eq("customer_id", c.data.id).order("created_at", { ascending: false });
        const carsAny = carsRes as unknown as { data: CarRow[] | null };
        setCars(carsAny.data ?? []);
        if (preselectCar && (carsAny.data ?? []).some((x) => x.id === preselectCar)) {
          setCarId(preselectCar);
        }
      }
    })();
  }, [user, loading, navigate, preselectCar]);

  // When car changes, prefill brand + vin
  useEffect(() => {
    if (!carId) return;
    const c = cars.find((x) => x.id === carId);
    if (!c) return;
    if (c.brand_id) setBrandId(c.brand_id);
    if (c.vin) setVin(c.vin);
  }, [carId, cars]);

  const selectedFilm = films.find((x) => x.id === filmId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      if (!customerName.trim() || !customerPhone.trim()) throw new Error("الاسم ورقم الجوال مطلوبان");
      let cid = customerId;
      if (cid) {
        await supabase.from("customers").update({ full_name: customerName.trim(), phone: customerPhone.trim() }).eq("id", cid);
      } else if (user) {
        const ins = await supabase.from("customers").insert({ user_id: user.id, full_name: customerName.trim(), phone: customerPhone.trim() }).select("id").single();
        if (ins.error) throw ins.error;
        cid = ins.data.id;
        setCustomerId(cid);
      }
      if (!cid) throw new Error("تعذر إنشاء سجل العميل");

      let num = warrantyNumber.trim();
      if (!num) {
        const r = await (supabase.rpc as unknown as (n: string) => Promise<{ data: string | null; error: { message: string } | null }>)("generate_warranty_number");
        if (r.error) throw r.error;
        num = r.data ?? "";
      }

      const months = selectedFilm?.warranty_months ?? 12;
      const exp = new Date(activationDate);
      exp.setMonth(exp.getMonth() + months);

      const { error } = await supabase.from("warranties").insert({
        warranty_number: num,
        customer_id: cid,
        brand_id: brandId || null,
        film_type_id: filmId || null,
        vin: vin.trim() || null,
        branch_id: branchId || null,
        activation_date: activationDate,
        expiry_date: exp.toISOString().slice(0, 10),
        ...(carId ? { car_id: carId } : {}),
      } as never);
      if (error) throw error;
      // إشعار المسؤول — fire and forget، لا يوقف تدفق المستخدم لو فشل
      void notifyActivated({ data: { warranty_number: num, customer_name: customerName.trim() || "عميل" } }).catch(() => {});
      setMsg({ t: "ok", m: `تم تسجيل الضمان: ${num} — بانتظار موافقة المسؤول` });
      setTimeout(() => navigate({ to: "/warranty/dashboard" }), 1000);
    } catch (e) {
      setMsg({ t: "err", m: e instanceof Error ? e.message : "حدث خطأ" });
    } finally { setBusy(false); }
  }

  if (loading) return <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <PlusCircle className="w-6 h-6 text-amber-500" /> تفعيل ضمان جديد
        </h1>
        <p className="text-sm text-slate-500 mb-5">اختر سيارة موجودة أو أدخل البيانات يدويًا.</p>

        {cars.length > 0 && (
          <div className="mb-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50">
            <label className="block">
              <div className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1"><Car className="w-4 h-4" /> اختر سيارة من قائمتك</div>
              <select value={carId} onChange={(e) => setCarId(e.target.value)} className="w-full px-3 py-2 border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-slate-900">
                <option value="">-- إدخال يدوي --</option>
                {cars.map((c) => {
                  const b = brands.find((x) => x.id === c.brand_id)?.name ?? "";
                  return <option key={c.id} value={c.id}>{[b, c.model, c.year, c.plate_number].filter(Boolean).join(" · ")}</option>;
                })}
              </select>
              <Link to="/warranty/cars" className="inline-block mt-2 text-xs text-amber-700 dark:text-amber-400 hover:underline">إدارة سياراتي ←</Link>
            </label>
          </div>
        )}

        {cars.length === 0 && (
          <div className="mb-5 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            💡 <Link to="/warranty/cars" className="text-amber-600 hover:underline font-bold">أضف سياراتك</Link> مسبقًا لتوفير الوقت في المرات القادمة.
          </div>
        )}

        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TxtField label="رقم الضمان (اختياري - يُولّد تلقائيًا)" value={warrantyNumber} onChange={setWarrantyNumber} placeholder="TM-2025-000000" />
          <TxtField label="اسم العميل *" value={customerName} onChange={setCustomerName} required />
          <TxtField label="رقم الجوال *" value={customerPhone} onChange={setCustomerPhone} required />
          <Select label="الماركة" value={brandId} onChange={setBrandId} options={[{ v: "", l: "-- اختر --" }, ...brands.map((b) => ({ v: b.id, l: b.name }))]} />
          <Select label="نوع اللاصق" value={filmId} onChange={setFilmId} options={[{ v: "", l: "-- اختر --" }, ...films.map((f) => ({ v: f.id, l: `${f.name} (${f.warranty_months} شهر)` }))]} />
          <TxtField label="رقم الهيكل / التسلسلي" value={vin} onChange={setVin} placeholder="VIN..." />
          <TxtField label="تاريخ التركيب *" value={activationDate} onChange={setActivationDate} type="date" required />
          <Select label="الفرع" value={branchId} onChange={setBranchId} options={[{ v: "", l: "-- اختر --" }, ...branches.map((b) => ({ v: b.id, l: b.name }))]} />

          {msg && (
            <div className={`sm:col-span-2 text-sm p-3 rounded-lg ${msg.t === "err" ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
              {msg.m}
            </div>
          )}

          <button disabled={busy} className="sm:col-span-2 py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            تفعيل الضمان
          </button>
        </form>
      </div>
    </div>
  );
}

function TxtField({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</div>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500" />
    </label>
  );
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500">
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}
