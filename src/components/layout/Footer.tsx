import { Link } from "@tanstack/react-router";
import { Phone, MessageCircle, MapPin, Clock, Instagram } from "lucide-react";

import { SALES_PHONE, WHATSAPP_NUMBER, DEV_PHONE, whatsappLink } from "@/lib/whatsapp";
import logoAsset from "@/assets/logo-tajalmoluk.png.asset.json";
import { useSiteContentValue } from "@/lib/site-content";

const wallets = [
  "جيب",
  "موبايل موني",
  "ون كاش",
  "كريمي حاسب",
  "محفظتي",
  "جوالي",
  "فلوسك",
];

export function Footer() {
  const c = useSiteContentValue("footer_content");
  return (
    <footer className="bg-white border-t border-[var(--color-hairline)] mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <img src={logoAsset.url} alt="زين" className="h-16 w-auto object-contain" />
          <p className="text-sm text-[var(--color-ink-soft)] mt-3 leading-relaxed">
            {c.description}
          </p>
          <p className="text-xs text-[var(--color-ink-soft)] mt-3">
            المدير العام: <span className="font-semibold text-[var(--color-ink)]">{c.managerName}</span>
          </p>
        </div>

        <div>
          <h4 className="font-bold mb-4">روابط سريعة</h4>
          <ul className="space-y-2 text-sm text-[var(--color-ink-soft)]">
            <li><Link to="/shop" className="hover:text-[var(--color-gold)]">المتجر</Link></li>
            <li><Link to="/services" className="hover:text-[var(--color-gold)]">الخدمات</Link></li>
            <li><Link to="/offers" className="hover:text-[var(--color-gold)]">العروض</Link></li>
            <li><Link to="/vip" className="hover:text-[var(--color-gold)]">VIP</Link></li>
            <li><Link to="/about" className="hover:text-[var(--color-gold)]">من نحن</Link></li>
            <li><Link to="/contact" className="hover:text-[var(--color-gold)]">اتصل بنا</Link></li>
            <li><Link to="/track" className="hover:text-[var(--color-gold)]">تتبع الطلب</Link></li>
          </ul>
          <div className="flex items-center gap-3 mt-5">
            <a
              href="https://instagram.com/z_n.9.9"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="إنستغرام"
              className="w-9 h-9 rounded-full bg-[var(--color-surface)] border border-[var(--color-hairline)] flex items-center justify-center hover:bg-[var(--color-gold)] hover:text-white transition-colors"
            >
              <Instagram className="w-4 h-4" />
            </a>
          </div>

        </div>

        <div>
          <h4 className="font-bold mb-4">تواصل معنا</h4>
          <ul className="space-y-3 text-sm text-[var(--color-ink-soft)]">
            <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-[var(--color-gold)]" /> <a href={`tel:${SALES_PHONE}`}>{SALES_PHONE}</a></li>
            <li className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-[var(--color-gold)]" /> <a href={whatsappLink("مرحباً")}>{WHATSAPP_NUMBER.replace("967","")}</a></li>
            <li className="flex items-start gap-2"><MapPin className="w-4 h-4 text-[var(--color-gold)] mt-0.5" /> {c.address}</li>
            <li className="flex items-start gap-2"><Clock className="w-4 h-4 text-[var(--color-gold)] mt-0.5" /> {c.hours}</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-4">المحافظ الإلكترونية</h4>
          <div className="flex flex-wrap gap-2">
            {wallets.map((w) => (
              <span key={w} className="text-xs bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-full px-3 py-1 text-[var(--color-ink-soft)]">
                {w}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--color-hairline)]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row gap-2 justify-between items-center text-xs text-[var(--color-ink-soft)]">
          <p>© {new Date().getFullYear()} زين — جميع الحقوق محفوظة</p>
          <p>
            تطوير: <a href={`tel:${DEV_PHONE}`} className="text-[var(--color-gold)] font-semibold">صديق الزين {DEV_PHONE}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
