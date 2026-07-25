import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeSVG } from "qrcode.react";
import { verifyWarranty } from "@/lib/warranty-public.functions";
import { statusLabel, statusColor, formatDateAr, computeStatus, verifyUrl, type WarrantyStatus } from "@/lib/warranty-utils";
import { Search, ShieldCheck, ShieldX, Loader2, Printer } from "lucide-react";
import logoAsset from "@/assets/logo-tajalmoluk.png.asset.json";
import { useSiteContentValue } from "@/lib/site-content";

export const Route = createFileRoute("/warranty/verify")({
  component: VerifyPage,
  head: () => ({
    meta: [
      { title: "التحقق من الضمان — زين" },
      { name: "description", content: "تحقق من صحة شهادة ضمان زين بمسح رمز QR أو إدخال رقم الضمان." },
    ],
  }),
});

type Result = {
  warranty_number: string;
  activation_date: string;
  expiry_date: string;
  status: WarrantyStatus;
  vin: string | null;
  customer_name: string;
  brand_name: string | null;
  film_type_name: string | null;
  branch_name: string | null;
};

function VerifyPage() {
  const initial = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("n") ?? "" : "";
  const [num, setNum] = useState(initial);
  const verify = useServerFn(verifyWarranty);
  const branding = useSiteContentValue("branding");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function doSearch(value: string) {
    const v = value.trim();
    if (!v) return;
    setBusy(true); setError(null); setResult(null); setNotFound(false);
    try {
      const rows = (await verify({ data: { num: v } })) as unknown as Result[];
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) { setNotFound(true); return; }
      setResult({ ...row, status: computeStatus(row.expiry_date, row.status) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ، الرجاء المحاولة لاحقاً");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { if (initial) doSearch(initial); /* eslint-disable-next-line */ }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700 print:hidden">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Search className="w-6 h-6 text-amber-500" /> التحقق من الضمان
        </h1>
        <p className="text-sm text-slate-500 mb-5">أدخل رقم الضمان أو امسح رمز QR الموجود على الشهادة.</p>
        <form onSubmit={(e) => { e.preventDefault(); doSearch(num); }} className="flex gap-2">
          <input
            value={num}
            onChange={(e) => setNum(e.target.value)}
            placeholder="TM-2025-000000"
            className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none focus:border-amber-500 font-mono"
          />
          <button disabled={busy} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold inline-flex items-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            بحث
          </button>
        </form>
        {error && <div className="mt-4 text-sm p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{error}</div>}
      </div>

      {notFound && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border-2 border-red-200 dark:border-red-900/50 text-center print:hidden">
          <ShieldX className="w-20 h-20 mx-auto text-red-500 mb-3" />
          <h3 className="text-xl font-bold text-red-700 dark:text-red-400">لا يوجد ضمان بهذا الرقم</h3>
          <p className="text-sm text-slate-500 mt-1">تأكد من الرقم أو تواصل مع زين.</p>
        </div>
      )}

      {result && (
        <>
          <div className="flex items-center justify-end gap-2 print:hidden">
            <button onClick={() => window.print()} className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800">
              <Printer className="w-4 h-4" /> طباعة الشهادة
            </button>
          </div>

          <div className="max-w-3xl mx-auto bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-500 print:shadow-none print:border-2">
            <div className="bg-gradient-to-l from-amber-500 to-yellow-500 text-white p-6 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <img src={branding.logoUrl || logoAsset.url} alt="زين" className="h-16 w-auto bg-white rounded-lg p-1" />
                <div>
                  <h1 className="text-2xl font-black">زين</h1>
                  <p className="text-sm opacity-90">شهادة ضمان رسمية</p>
                </div>
              </div>
              <div className="text-left">
                <div className="text-xs opacity-90">رقم الضمان</div>
                <div className="font-mono font-bold text-xl">{result.warranty_number}</div>
              </div>
            </div>

            <div className={`px-6 py-3 flex items-center gap-3 text-white ${result.status === "active" ? "bg-green-600" : result.status === "expired" ? "bg-slate-500" : result.status === "cancelled" ? "bg-red-600" : "bg-amber-600"}`}>
              {result.status === "active" ? <ShieldCheck className="w-6 h-6" /> : <ShieldX className="w-6 h-6" />}
              <div className="font-bold">الحالة: {statusLabel[result.status]}</div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6" dir="rtl">
              <div className="md:col-span-2 space-y-3 text-sm">
                <Row label="اسم العميل" value={result.customer_name} />
                <Row label="الماركة" value={result.brand_name ?? "-"} />
                <Row label="نوع اللاصق" value={result.film_type_name ?? "-"} />
                <Row label="رقم الهيكل" value={result.vin ?? "-"} />
                <Row label="الفرع" value={result.branch_name ?? "-"} />
                <Row label="تاريخ التفعيل" value={formatDateAr(result.activation_date)} />
                <Row label="تاريخ الانتهاء" value={formatDateAr(result.expiry_date)} highlight />
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${statusColor[result.status]}`}>
                    {statusLabel[result.status]}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 border-r-2 border-dashed border-slate-200 pr-4">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <QRCodeSVG value={verifyUrl(result.warranty_number)} size={140} />
                </div>
                <p className="text-xs text-slate-500 text-center">امسح للتحقق من صحة الضمان</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 text-center text-xs text-slate-600 border-t border-slate-200">
              هذه الشهادة صادرة عن مؤسسة زين للعناية وزينة السيارات - صنعاء، اليمن. لأي استفسار: 782222919
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center gap-3 pb-2 border-b border-slate-100 ${highlight ? "text-amber-700 font-bold" : ""}`}>
      <span className="text-slate-500 text-xs">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
