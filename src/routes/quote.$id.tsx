import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { getPublicQuote } from "@/lib/billing.functions";
import { BillingDocument, DocActions, quoteToDoc } from "@/components/BillingDocument";
import { whatsappLink } from "@/lib/whatsapp";
import { fmtMoney } from "@/lib/billing-utils";

export const Route = createFileRoute("/quote/$id")({
  head: () => ({
    meta: [{ title: "عرض سعر — زين" }, { name: "robots", content: "noindex" }],
  }),
  component: QuotePage,
});

function QuotePage() {
  const { id } = Route.useParams();
  const ref = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-quote", id],
    queryFn: () => getPublicQuote({ data: { id } }),
    retry: false,
  });

  const canAccept = data && (data.view_status === "sent" || data.view_status === "accepted");

  return (
    <div dir="rtl" className="min-h-screen px-3 py-6" style={{ background: "#f8fafc" }}>
      {isLoading && (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
        </div>
      )}
      {(isError || (!isLoading && !data)) && (
        <div className="max-w-md mx-auto text-center py-16">
          <p className="font-bold">عرض السعر غير موجود</p>
          <a href="/" className="btn-outline mt-4 inline-flex">
            العودة للموقع
          </a>
        </div>
      )}
      {data && (
        <div className="max-w-3xl mx-auto space-y-4">
          <BillingDocument ref={ref} data={quoteToDoc(data)} />

          {data.view_status === "expired" && (
            <div className="rounded-xl bg-amber-50 text-amber-800 p-3 text-sm text-center">
              انتهت صلاحية هذا العرض. تواصل معنا لتجديده.
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-center print:hidden">
            {canAccept && (
              <a
                className="btn-gold"
                target="_blank"
                rel="noreferrer"
                href={whatsappLink(
                  `مرحباً، أوافق على عرض السعر رقم ${data.quote_number}\nالإجمالي: ${fmtMoney(data.total)}\nالاسم: ${data.customer_name}`,
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                أوافق على العرض (تأكيد واتساب)
              </a>
            )}
            <a
              className="btn-outline"
              target="_blank"
              rel="noreferrer"
              href={whatsappLink(`مرحباً، عندي استفسار عن عرض السعر رقم ${data.quote_number}`)}
            >
              <MessageCircle className="w-4 h-4" />
              استفسار
            </a>
          </div>
          <DocActions data={quoteToDoc(data)} docRef={ref} showPrint hideWhatsapp />
        </div>
      )}
    </div>
  );
}
