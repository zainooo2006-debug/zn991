import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/components/layout/Shell";
import { useCart } from "@/lib/cart";
import { getWallets } from "@/lib/catalog.functions";
import { createOrder } from "@/lib/admin.functions";
import { previewCoupon } from "@/lib/coupons.functions";
import { whatsappLink } from "@/lib/whatsapp";
import { getSessionId, getVisitorId, trackClientEvent } from "@/lib/analytics-client";
import { Button } from "@/components/ui/button";
import {
  Check,
  Copy,
  CreditCard,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
  Tag,
  UserRound,
  X,
} from "lucide-react";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "إتمام الطلب — زين" },
      { name: "description", content: "أكمل بيانات الطلب والدفع عبر المحافظ الإلكترونية لـ زين." },
      { property: "og:title", content: "إتمام الطلب — زين" },
      {
        property: "og:description",
        content: "أكمل بيانات الطلب والدفع عبر المحافظ الإلكترونية لـ زين.",
      },
      { property: "og:url", content: "https://zn991.lovable.app/checkout" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, total, count, clear } = useCart();
  const navigate = useNavigate();
  const fetchWallets = useServerFn(getWallets);
  const submitOrder = useServerFn(createOrder);
  const checkCoupon = useServerFn(previewCoupon);

  const {
    data: wallets = [],
    isLoading: walletsLoading,
    isError: walletsError,
  } = useQuery({
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
  const startedTracked = useRef(false);

  // Discount code (checked on the server; the server re-checks it when the order is saved).
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState("");
  const discount = coupon?.discount ?? 0;
  const finalTotal = Math.max(total - discount, 0);

  // The cart total changed: the old discount is no longer valid.
  useEffect(() => {
    setCoupon(null);
  }, [total]);

  const applyCouponCode = async () => {
    const code = couponInput.trim();
    if (!code || couponBusy) return;
    setCouponBusy(true);
    setCouponError("");
    try {
      const r = await checkCoupon({
        data: { code, items: items.map((i) => ({ id: i.id, qty: i.qty })) },
      });
      setCoupon({ code: r.code, discount: r.discount });
    } catch (err) {
      setCoupon(null);
      setCouponError((err as Error).message || "تعذّر التحقق من الكود");
    } finally {
      setCouponBusy(false);
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  // Analytics: customer reached checkout with items in the cart (once per visit to this page).
  useEffect(() => {
    if (startedTracked.current || count === 0) return;
    startedTracked.current = true;
    trackClientEvent("checkout_started", { metadata: { items_count: count, total } });
  }, [count, total]);

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
    if (submitting) return;
    setError("");

    if (name.trim().length < 2) return setError("الرجاء إدخال الاسم");
    if (phone.trim().length < 6) return setError("الرجاء إدخال رقم الهاتف");
    if (!walletId) return setError("الرجاء اختيار وسيلة الدفع");

    setSubmitting(true);

    // One key per checkout attempt. If the customer taps twice or the network
    // retries, the server returns the same order instead of creating another.
    const IDEM_KEY = "zain_checkout_idem";
    let idemKey = "";
    try {
      idemKey = sessionStorage.getItem(IDEM_KEY) || "";
      if (!idemKey) {
        idemKey = crypto.randomUUID();
        sessionStorage.setItem(IDEM_KEY, idemKey);
      }
    } catch {
      idemKey = crypto.randomUUID();
    }

    try {
      const saved = await submitOrder({
        data: {
          idempotency_key: idemKey,
          coupon_code: coupon?.code ?? null,
          visitor_id: getVisitorId(),
          session_id: getSessionId(),
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
            `${idx + 1}. ${i.name} × ${i.qty} = ${(i.price * i.qty).toLocaleString()} ر.ي`,
        ),
        "",
        saved.discount > 0
          ? `🎟️ كود الخصم: ${saved.coupon_code} (-${saved.discount.toLocaleString()} ر.ي)`
          : "",
        `💰 *الإجمالي: ${saved.total.toLocaleString()} ر.ي*`,
        `💳 وسيلة الدفع: ${wallet?.name} (${wallet?.account_number})`,
        paymentRef ? `🧾 مرجع التحويل: ${paymentRef}` : "",
        notes ? `📝 ملاحظات: ${notes}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const destination = whatsappLink(lines);
      try {
        sessionStorage.removeItem(IDEM_KEY);
      } catch {
        /* ignore */
      }
      clear();
      window.location.assign(destination);
    } catch (err) {
      setError((err as Error).message || "تعذّر إرسال الطلب");
      setSubmitting(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("تعذّر نسخ رقم الحساب، يمكنك نسخه يدويًا");
    }
  };

  const inputClass =
    "w-full rounded-lg border border-[var(--color-hairline)] bg-[var(--color-card)] px-3 py-3 outline-none transition-colors focus:border-[var(--color-gold)] focus:ring-2 focus:ring-[var(--color-gold-soft)]";

  return (
    <Shell>
      <div className="max-w-5xl mx-auto px-4 py-8 pb-24 md:pb-12">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-gold-soft)] text-[var(--color-ink)]">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl md:text-3xl font-black">إتمام الطلب</h1>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
              أدخل بياناتك ثم أرسل الطلب إلى فريق زين عبر واتساب
            </p>
          </div>
        </div>

        <form
          noValidate
          onSubmit={submit}
          className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
        >
          <div className="space-y-6">
            <section className="card-clean p-5 md:p-6" aria-labelledby="customer-details">
              <h2 id="customer-details" className="text-lg font-bold">
                بيانات العميل
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                    <UserRound className="h-4 w-4 text-[var(--color-gold)]" />
                    الاسم الكامل *
                  </span>
                  <input
                    required
                    maxLength={100}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="اكتب اسمك"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                    <Phone className="h-4 w-4 text-[var(--color-gold)]" />
                    رقم الهاتف *
                  </span>
                  <input
                    required
                    minLength={6}
                    maxLength={30}
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="مثال: 773144403"
                    className={inputClass}
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="h-4 w-4 text-[var(--color-gold)]" />
                    عنوان التوصيل
                  </span>
                  <input
                    maxLength={500}
                    autoComplete="street-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="المدينة، المنطقة، الشارع"
                    className={inputClass}
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                    <MessageCircle className="h-4 w-4 text-[var(--color-gold)]" />
                    ملاحظات الطلب
                  </span>
                  <textarea
                    maxLength={1000}
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أي تفاصيل إضافية تهمنا"
                    className={`${inputClass} resize-y`}
                  />
                </label>
              </div>
            </section>

            <section className="card-clean p-5 md:p-6" aria-labelledby="payment-details">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[var(--color-gold)]" />
                <h2 id="payment-details" className="text-lg font-bold">
                  طريقة الدفع
                </h2>
              </div>

              {walletsLoading ? (
                <div className="mt-5 flex items-center gap-2 text-sm text-[var(--color-ink-soft)]">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  جارٍ تحميل وسائل الدفع...
                </div>
              ) : walletsError ? (
                <p className="mt-5 rounded-lg bg-[var(--color-destructive)]/10 p-3 text-sm text-[var(--color-destructive)]">
                  تعذّر تحميل وسائل الدفع. أعد تحميل الصفحة وحاول مجددًا.
                </p>
              ) : wallets.length === 0 ? (
                <p className="mt-5 rounded-lg bg-[var(--color-surface)] p-3 text-sm text-[var(--color-ink-soft)]">
                  لا توجد وسائل دفع متاحة حاليًا.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {wallets.map((item) => (
                    <label
                      key={item.id}
                      className={`cursor-pointer rounded-lg border p-4 transition-colors ${walletId === item.id ? "border-[var(--color-gold)] bg-[var(--color-gold-soft)]" : "border-[var(--color-hairline)] bg-[var(--color-card)]"}`}
                    >
                      <span className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="wallet"
                          value={item.id}
                          checked={walletId === item.id}
                          onChange={() => setWalletId(item.id)}
                          className="mt-1 accent-[var(--color-gold)]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold">{item.name}</span>
                          <span
                            className="mt-1 block break-all text-sm text-[var(--color-ink-soft)]"
                            dir="ltr"
                          >
                            {item.account_number}
                          </span>
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {wallet && (
                <div className="mt-4 rounded-lg border border-[var(--color-gold)] bg-[var(--color-gold-soft)] p-4">
                  <p className="text-sm font-semibold">حوّل المبلغ إلى رقم الحساب:</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <strong className="break-all text-lg" dir="ltr">
                      {wallet.account_number}
                    </strong>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copy(wallet.account_number)}
                      aria-label="نسخ رقم الحساب"
                      title="نسخ رقم الحساب"
                    >
                      {copied === wallet.account_number ? <Check /> : <Copy />}
                    </Button>
                  </div>
                </div>
              )}

              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-semibold">
                  رقم مرجع التحويل (اختياري)
                </span>
                <input
                  maxLength={100}
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="أدخل رقم العملية بعد التحويل"
                  className={inputClass}
                />
              </label>
            </section>
          </div>

          <aside className="card-clean p-5 lg:sticky lg:top-32" aria-labelledby="order-summary">
            <h2 id="order-summary" className="text-lg font-bold">
              ملخص الطلب
            </h2>
            <ul className="mt-4 divide-y divide-[var(--color-hairline)]">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3 py-3 first:pt-0">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg bg-[var(--color-surface)] object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-lg bg-[var(--color-surface)]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold">{item.name}</p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-sm">
                      <span className="text-[var(--color-ink-soft)]">الكمية: {item.qty}</span>
                      <strong>{(item.price * item.qty).toLocaleString()} ر.ي</strong>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-[var(--color-hairline)] pt-4">
              <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                <Tag className="h-4 w-4 text-[var(--color-gold)]" />
                كود الخصم
              </span>
              {coupon ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm">
                  <span className="font-bold text-green-700" dir="ltr">
                    {coupon.code}
                  </span>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-green-700 hover:text-red-600"
                    aria-label="إزالة كود الخصم"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyCouponCode();
                      }
                    }}
                    maxLength={40}
                    dir="ltr"
                    placeholder="أدخل الكود"
                    className={`${inputClass} py-2`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={applyCouponCode}
                    disabled={couponBusy || !couponInput.trim()}
                    className="shrink-0"
                  >
                    {couponBusy ? <LoaderCircle className="animate-spin" /> : "تطبيق"}
                  </Button>
                </div>
              )}
              {couponError && (
                <p className="mt-2 text-xs font-semibold text-[var(--color-destructive)]">
                  {couponError}
                </p>
              )}
            </div>

            {discount > 0 && (
              <>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-[var(--color-ink-soft)]">المجموع</span>
                  <span>{total.toLocaleString()} ر.ي</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm text-green-700">
                  <span>خصم الكود</span>
                  <span>-{discount.toLocaleString()} ر.ي</span>
                </div>
              </>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-[var(--color-hairline)] pt-4">
              <span className="font-bold">الإجمالي</span>
              <strong className="text-xl text-[var(--color-gold)]">
                {finalTotal.toLocaleString()} ر.ي
              </strong>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-[var(--color-destructive)]/10 p-3 text-sm font-semibold text-[var(--color-destructive)]"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={submitting || walletsLoading || wallets.length === 0}
              className="mt-5 h-12 w-full rounded-lg font-bold"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  جارٍ حفظ الطلب...
                </>
              ) : (
                <>
                  <MessageCircle />
                  إتمام الطلب عبر واتساب
                </>
              )}
            </Button>
            <p className="mt-3 text-center text-xs leading-5 text-[var(--color-ink-soft)]">
              سيتم حفظ طلبك ثم نقلك إلى واتساب لتأكيده مع فريق زين.
            </p>
          </aside>
        </form>
      </div>
    </Shell>
  );
}
