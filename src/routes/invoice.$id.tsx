import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { getPublicInvoice } from "@/lib/billing.functions";
import { BillingDocument, DocActions, invoiceToDoc } from "@/components/BillingDocument";

export const Route = createFileRoute("/invoice/$id")({
  head: () => ({
    meta: [{ title: "فاتورة — زين" }, { name: "robots", content: "noindex" }],
  }),
  component: InvoicePage,
});

function InvoicePage() {
  const { id } = Route.useParams();
  const ref = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-invoice", id],
    queryFn: () => getPublicInvoice({ data: { id } }),
    retry: false,
  });

  return (
    <div dir="rtl" className="min-h-screen px-3 py-6" style={{ background: "#f8fafc" }}>
      {isLoading && (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
        </div>
      )}
      {(isError || (!isLoading && !data)) && (
        <div className="max-w-md mx-auto text-center py-16">
          <p className="font-bold">الفاتورة غير موجودة</p>
          <a href="/" className="btn-outline mt-4 inline-flex">
            العودة للموقع
          </a>
        </div>
      )}
      {data && (
        <div className="max-w-3xl mx-auto space-y-4">
          <BillingDocument ref={ref} data={invoiceToDoc(data)} />
          <DocActions data={invoiceToDoc(data)} docRef={ref} showPrint hideWhatsapp />
        </div>
      )}
    </div>
  );
}
