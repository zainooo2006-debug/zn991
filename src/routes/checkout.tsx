import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/layout/Shell";
import { useCart } from "@/lib/cart";
import { getWallets } from "@/lib/catalog.functions";
import { createOrder } from "@/lib/admin.functions";
import { whatsappLink } from "@/lib/whatsapp";
import { Copy, Check, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "إتمام الطلب — زين" },
      { name: "description", content: "أكمل بيانات الطلب والدفع عبر المحافظ الإلكترونية لـ زين." },
      { property: "og:title", content: "إتمام الطلب — زين" },
      { property: "og:description", content: "أكمل بيانات الطلب والدفع عبر المحافظ الإلكترونية لـ زين." },
      { property: "og:url", content: "https://tajalmoluk.lovable.app/checkout" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, total, count, clear } = useCart();
  const navigate = useNavigate();
  const fetchWallets = useServerFn(getWallets);
  const submitOrder = useServerFn(createOrder);

  const { data: wallets = [] } = useQuery({
    queryKey: ["wallets"],
    queryFn: () => fetchWallets(),
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [walletId, setWalletId] = useState<string>("");
  const [paymentRef, setPaymentRef] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (count === 0 && typeof window !== "undefined") {
      const t = setTimeout(() => navigate({ to: "/shop" }), 1500);
      return () => clearTimeout(t);
    }
  }, [count, navigate]);

  if (count === 0) {
    return (
      <Shell>
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <ShoppingBag className="w-16 h-16 text-[var(--color-gold)] mx-auto" />
          <p className="mt-4">سلتك فارغة، يتم تحويلك للمتجر...</p>
        </div>
      </Shell>
    );
  }

  const wallet = wallets.find((w) => w.id === walletId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (name.trim().length < 2) return setError("الرجاء إدخال الاسم");
    if (phone.trim().length < 6) return setError("الرجاء إدخال رقم الهاتف");
    if (!walletId) return setError("الرجاء اختيار وسيلة الدفع");

    setSubmitting(true);

    try {
      await submitOrder({
        data: {
          customer_name: name.trim(),
          phone: phone.trim(),
          address: address.trim() || null,
          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            price: i.price,
            qty: i.qty,
            image: i.image,
          })),
          wallet_id: walletId,
          wallet_name: wallet?.name ?? null,
          payment_ref: paymentRef.trim() || null,
          notes: notes.trim() || null,
        },
      });

      const lines = [
        "🛒 *طلب جديد من زين*",
        `👤 الاسم: ${name}`,
        `📱 الهاتف: ${phone}`,
        address ? `📍 العنوان: ${address}` : "",
        "",
        "*المنتجات:*",
        ...items.map(
          (i, idx) =>
            `${idx + 1}. ${i.name} × ${i.qty} = ${(i.price * i.qty).toLocaleString()} ر.ي`
        ),
        "",
        `💰 *الإجمالي: ${total.toLocaleString()} ر.ي*`,
        `💳 وسيلة الدفع: ${wallet?.name} (${wallet?.account_number})`,
        paymentRef ? `🧾 مرجع التحويل: ${paymentRef}` : "",
        notes ? `📝 ملاحظات: ${notes}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      clear();
      window.location.href = whatsappLink(lines);
    } catch (err) {
      setError((err as Error).message || "تعذّر إرسال الطلب");
      setSubmitting(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Shell>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-black">إتمام الطلب</h1>

        <form onSubmit={submit} className="mt-6 space-y-6">
          {/* باقي الواجهة كما في الملف الأصلي */}
        </form>
      </div>
    </Shell>
  );
}
