import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { Phone, MessageCircle, MapPin, Clock } from "lucide-react";
import { SALES_PHONE, WHATSAPP_NUMBER, whatsappLink } from "@/lib/whatsapp";
import { useSiteContentValue } from "@/lib/site-content";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "اتصل بنا — زين" },
      { name: "description", content: "تواصل مع زين للعناية وزينة السيارات — صنعاء، شارع 22 مايو، جوار فندق الأحلام، قبل جولة الثقافة." },
      { property: "og:title", content: "اتصل بنا — زين" },
      { property: "og:description", content: "تواصل مع زين للعناية وزينة السيارات — صنعاء، شارع 22 مايو، جوار فندق الأحلام، قبل جولة الثقافة." },
      { property: "og:url", content: "https://zn991.lovable.app/contact" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const c = useSiteContentValue("contact_page");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = `رسالة من ${name} (${phone}):\n${message}`;
    window.open(whatsappLink(msg), "_blank");
  };

  return (
    <Shell>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-black">اتصل بنا</h1>
        <p className="text-[var(--color-ink-soft)] mt-2">{c.subtitle}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="space-y-4">
            <InfoRow Icon={Phone} title="الهاتف">
              <a href={`tel:${SALES_PHONE}`} className="hover:text-[var(--color-gold)]">{SALES_PHONE}</a>
            </InfoRow>
            <InfoRow Icon={MessageCircle} title="واتساب">
              <a href={whatsappLink("مرحباً")} className="hover:text-[var(--color-gold)]">{WHATSAPP_NUMBER.replace("967","")}</a>
            </InfoRow>
            <InfoRow Icon={MapPin} title="العنوان">
              {c.address}
            </InfoRow>
            <InfoRow Icon={Clock} title="أوقات العمل">
              {c.hours.split("\n").map((line, i) => (
                <span key={i}>{i > 0 && <br />}{line}</span>
              ))}
            </InfoRow>
          </div>

          <form onSubmit={submit} className="card-clean p-6">
            <h2 className="text-xl font-bold">أرسل رسالة</h2>
            <div className="space-y-3 mt-4">
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)]" />
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الجوال" className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)]" />
              <textarea required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="رسالتك" rows={4} className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)]" />
            </div>
            <button type="submit" className="btn-gold mt-4 w-full">إرسال عبر واتساب</button>
          </form>
        </div>
      </div>
    </Shell>
  );
}

function InfoRow({ Icon, title, children }: { Icon: typeof Phone; title: string; children: React.ReactNode }) {
  return (
    <div className="card-clean p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[var(--color-gold)]" />
      </div>
      <div>
        <h4 className="font-bold">{title}</h4>
        <p className="text-sm text-[var(--color-ink-soft)] mt-0.5">{children}</p>
      </div>
    </div>
  );
}
