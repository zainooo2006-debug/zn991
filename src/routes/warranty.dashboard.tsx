import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWarrantyAuth } from "@/lib/warranty-auth";
import {
  statusLabel,
  statusColor,
  formatDateAr,
  computeStatus,
  type WarrantyStatus,
} from "@/lib/warranty-utils";
import { FileText, Loader2, ShieldCheck, PlusCircle } from "lucide-react";

export const Route = createFileRoute("/warranty/dashboard")({
  component: DashboardPage,
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
  branches: { name: string } | null;
};

function DashboardPage() {
  const { user, loading } = useWarrantyAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/warranty/auth" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("warranties")
          .select(
            "id, warranty_number, activation_date, expiry_date, status, vin, warranty_brands(name), film_types(name), branches(name)",
          )
          .order("created_at", { ascending: false });
        if (cancelled) return;
        if (error) {
          setErr(error.message);
          setRows([]);
          return;
        }
        setRows((data as unknown as Row[]) ?? []);
      } catch (e) {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "تعذر تحميل الضمانات");
        setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate]);

  if (loading || (!rows && !err)) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">لوحتي</h1>
          <p className="text-sm text-slate-500">جميع الضمانات المسجّلة على حسابك.</p>
        </div>
        <Link
          to="/warranty/activate"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold"
        >
          <PlusCircle className="w-4 h-4" /> تفعيل ضمان جديد
        </Link>
      </div>

      {err && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
          {err}
        </div>
      )}

      {!rows || rows.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <ShieldCheck className="w-16 h-16 mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-bold">لا توجد ضمانات بعد</h3>
          <p className="text-sm text-slate-500 mt-1">ابدأ بتفعيل أول ضمان لسيارتك.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const s = computeStatus(r.expiry_date, r.status);
            return (
              <div
                key={r.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-xs font-mono bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">
                    {r.warranty_number}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-bold border ${statusColor[s]}`}
                  >
                    {statusLabel[s]}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-slate-500">الماركة:</span>{" "}
                    <b>{r.warranty_brands?.name ?? "-"}</b>
                  </div>
                  <div>
                    <span className="text-slate-500">النوع:</span>{" "}
                    <b>{r.film_types?.name ?? "-"}</b>
                  </div>
                  <div>
                    <span className="text-slate-500">الفرع:</span> {r.branches?.name ?? "-"}
                  </div>
                  <div>
                    <span className="text-slate-500">التفعيل:</span>{" "}
                    {formatDateAr(r.activation_date)}
                  </div>
                  <div>
                    <span className="text-slate-500">الانتهاء:</span> {formatDateAr(r.expiry_date)}
                  </div>
                </div>
                <Link
                  to="/warranty/certificate/$id"
                  params={{ id: r.warranty_number }}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 dark:bg-amber-500 text-white rounded-lg font-medium hover:opacity-90"
                >
                  <FileText className="w-4 h-4" /> شهادة الضمان
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
