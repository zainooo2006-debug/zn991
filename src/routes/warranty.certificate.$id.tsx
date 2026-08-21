import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useWarrantyAuth } from "@/lib/warranty-auth";
import { verifyWarranty } from "@/lib/warranty-public.functions";
import {
  formatDateAr,
  statusLabel,
  statusColor,
  computeStatus,
  type WarrantyStatus,
  verifyUrl,
} from "@/lib/warranty-utils";
import { Download, Printer, ArrowRight, Loader2, MessageCircle } from "lucide-react";
import logoAsset from "@/assets/logo-tajalmoluk.png.asset.json";
import { useSiteContentValue } from "@/lib/site-content";
import { whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/warranty/certificate/$id")({
  component: CertificatePage,
});

type Data = {
  warranty_number: string;
  activation_date: string;
  expiry_date: string;
  status: WarrantyStatus;
  vin: string | null;
  customer_name: string | null;
  brand_name: string | null;
  film_type_name: string | null;
  branch_name: string | null;
};

function CertificatePage() {
  const { id } = Route.useParams();
  const { user, loading } = useWarrantyAuth();
  const navigate = useNavigate();
  const verify = useServerFn(verifyWarranty);
  const branding = useSiteContentValue("branding");
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/warranty/auth" });
      return;
    }
    (async () => {
      try {
        const rows = await verify({ data: { num: id } });
        const row = Array.isArray(rows) ? rows[0] : null;
        if (!row) {
          setErr("لم يتم العثور على الضمان");
          return;
        }
        setData({
          warranty_number: row.warranty_number,
          activation_date: row.activation_date,
          expiry_date: row.expiry_date,
          status: row.status,
          vin: row.vin,
          customer_name: row.customer_name,
          brand_name: row.brand_name,
          film_type_name: row.film_type_name,
          branch_name: row.branch_name,
        });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "تعذر تحميل الشهادة");
      }
    })();
  }, [id, user, loading, navigate, verify]);

  async function downloadPdf() {
    if (!certRef.current || !data) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      let w = pageW - 20;
      let h = w / ratio;
      if (h > pageH - 20) {
        h = pageH - 20;
        w = h * ratio;
      }
      pdf.addImage(img, "PNG", (pageW - w) / 2, 10, w, h);
      pdf.save(`certificate-${data.warranty_number}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  if (loading || (!data && !err))
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
      </div>
    );
  if (err)
    return (
      <div className="max-w-md mx-auto p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-center">
        {err}
      </div>
    );
  if (!data) return null;

  const s = computeStatus(data.expiry_date, data.status);

  if (s === "pending") {
    return (
      <div className="max-w-lg mx-auto text-center bg-white dark:bg-slate-800 rounded-2xl border-2 border-amber-300 dark:border-amber-500/50 shadow-lg p-8 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-amber-700 dark:text-amber-400">
          بانتظار موافقة المسؤول
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          تم تسجيل الضمان رقم <span className="font-mono font-bold">{data.warranty_number}</span>{" "}
          بنجاح.
          <br />
          ستُصدر الشهادة الرقمية فور مراجعة المسؤول واعتماد الضمان.
        </p>
        <Link
          to="/warranty/dashboard"
          className="inline-flex items-center gap-1 text-sm px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600"
        >
          <ArrowRight className="w-4 h-4" /> العودة إلى لوحتي
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 print:hidden">
        <Link
          to="/warranty/dashboard"
          className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
        >
          <ArrowRight className="w-4 h-4" /> لوحتي
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
        >
          <Printer className="w-4 h-4" /> طباعة
        </button>
        <button
          onClick={downloadPdf}
          disabled={downloading}
          className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}{" "}
          تحميل PDF
        </button>
        <a
          href={whatsappLink(
            `شهادة ضمان زين\nرقم الضمان: ${data.warranty_number}\nالعميل: ${data.customer_name ?? "-"}\nتاريخ الانتهاء: ${formatDateAr(data.expiry_date)}\n\nللتحقق: ${verifyUrl(data.warranty_number)}`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
        >
          <MessageCircle className="w-4 h-4" /> واتساب
        </a>
      </div>

      <div
        ref={certRef}
        className="max-w-3xl mx-auto bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-500 print:shadow-none print:border-2"
      >
        <div className="bg-gradient-to-l from-amber-500 to-yellow-500 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={branding.logoUrl || logoAsset.url}
              alt="زين"
              className="h-16 w-auto bg-white rounded-lg p-1"
            />
            <div>
              <h1 className="text-2xl font-black">زين</h1>
              <p className="text-sm opacity-90">شهادة ضمان رسمية</p>
            </div>
          </div>
          <div className="text-left">
            <div className="text-xs opacity-90">رقم الضمان</div>
            <div className="font-mono font-bold text-xl">{data.warranty_number}</div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6" dir="rtl">
          <div className="md:col-span-2 space-y-3 text-sm">
            <CertRow label="اسم العميل" value={data.customer_name ?? "-"} />
            <CertRow label="الماركة" value={data.brand_name ?? "-"} />
            <CertRow label="نوع اللاصق" value={data.film_type_name ?? "-"} />
            <CertRow label="رقم الهيكل" value={data.vin ?? "-"} />
            <CertRow label="الفرع" value={data.branch_name ?? "-"} />
            <CertRow label="تاريخ التفعيل" value={formatDateAr(data.activation_date)} />
            <CertRow label="تاريخ الانتهاء" value={formatDateAr(data.expiry_date)} highlight />
            <div>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-bold border ${statusColor[s]}`}
              >
                الحالة: {statusLabel[s]}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 border-r-2 border-dashed border-slate-200 pr-4">
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <QRCodeSVG value={verifyUrl(data.warranty_number)} size={140} />
            </div>
            <p className="text-xs text-slate-500 text-center">امسح للتحقق من صحة الضمان</p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 text-center text-xs text-slate-600 border-t border-slate-200">
          هذه الشهادة صادرة عن مؤسسة زين اصل الحماية للعناية وزينة السيارات - صنعاء، اليمن. لأي
          استفسار: 780687704
        </div>
      </div>
    </div>
  );
}

function CertRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex justify-between items-center gap-3 pb-2 border-b border-slate-100 ${highlight ? "text-amber-700 font-bold" : ""}`}
    >
      <span className="text-slate-500 text-xs">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
