import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSiteContent } from "@/lib/catalog.functions";
import { saveContent } from "@/lib/admin.functions";
import {
  CONTENT_DEFAULTS,
  type AboutContent,
  type FooterContent,
  type ContactContent,
  type BrandingContent,
} from "@/lib/site-content";
import { getPwd, ImageUploader, Input, Textarea } from "@/components/admin/shared";

/* ===================== Site Pages (about, footer, contact, branding) ===================== */
export function SitePagesPanel() {
  const fetchContent = useServerFn(getSiteContent);
  const save = useServerFn(saveContent);
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-content"],
    queryFn: () => fetchContent(),
  });

  const getValue = <K extends keyof typeof CONTENT_DEFAULTS>(
    key: K,
  ): (typeof CONTENT_DEFAULTS)[K] => {
    const row = rows.find((r) => r.key === key);
    if (!row || typeof row.value !== "object" || row.value === null || Array.isArray(row.value)) {
      return CONTENT_DEFAULTS[key];
    }
    return { ...CONTENT_DEFAULTS[key], ...(row.value as Record<string, string>) };
  };

  const [about, setAbout] = useState<AboutContent | null>(null);
  const [footer, setFooter] = useState<FooterContent | null>(null);
  const [contact, setContact] = useState<ContactContent | null>(null);
  const [branding, setBranding] = useState<BrandingContent | null>(null);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (!isLoading && !about) {
      setAbout(getValue("about_page"));
      setFooter(getValue("footer_content"));
      setContact(getValue("contact_page"));
      setBranding(getValue("branding"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const saveKey = async (key: keyof typeof CONTENT_DEFAULTS, value: unknown) => {
    await save({ data: { password: getPwd(), key, value } });
    qc.invalidateQueries({ queryKey: ["admin-content"] });
    qc.invalidateQueries({ queryKey: ["site-content"] });
    setSavedMsg("تم الحفظ ✓");
    setTimeout(() => setSavedMsg(""), 2000);
  };

  if (isLoading || !about || !footer || !contact || !branding) {
    return <div className="text-sm text-[var(--color-ink-soft)]">جارِ التحميل...</div>;
  }

  return (
    <div className="space-y-8">
      <p className="text-xs text-[var(--color-ink-soft)]">
        عدّل نصوص صفحات الموقع مباشرة — أي تعديل يظهر في الموقع فورًا بدون نشر جديد. إذا ما عدّلت
        شي، تبقى النصوص كما هي حاليًا.
      </p>
      {savedMsg && <div className="text-sm font-bold text-green-600">{savedMsg}</div>}

      <div className="card-clean p-4 space-y-3">
        <h3 className="font-bold text-lg">شعار الموقع</h3>
        <p className="text-xs text-[var(--color-ink-soft)]">
          يظهر هذا الشعار في أعلى كل صفحات الموقع بدلاً من الشعار الافتراضي.
        </p>
        <div className="flex items-center gap-4">
          {branding.logoUrl && (
            <img
              src={branding.logoUrl}
              alt=""
              className="h-14 w-auto object-contain bg-[var(--color-surface)] rounded-lg p-1"
            />
          )}
          <ImageUploader onUploaded={(u) => setBranding({ ...branding, logoUrl: u })} />
        </div>
        <input
          value={branding.logoUrl}
          onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
          placeholder="أو ألصق رابط الشعار"
          dir="ltr"
          className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 text-sm"
        />
        <button className="btn-gold" onClick={() => saveKey("branding", branding)}>
          حفظ الشعار
        </button>
      </div>

      <div className="card-clean p-4 space-y-3">
        <h3 className="font-bold text-lg">صفحة "من نحن"</h3>
        <Textarea
          label="الفقرة الأولى (بعد كلمة زين)"
          value={about.intro1}
          onChange={(v) => setAbout({ ...about, intro1: v })}
        />
        <Textarea
          label="الفقرة الثانية"
          value={about.intro2}
          onChange={(v) => setAbout({ ...about, intro2: v })}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="عنوان: رسالتنا"
            value={about.missionTitle}
            onChange={(v) => setAbout({ ...about, missionTitle: v })}
          />
          <Input
            label="عنوان: قيمنا"
            value={about.valuesTitle}
            onChange={(v) => setAbout({ ...about, valuesTitle: v })}
          />
          <Input
            label="عنوان: فريقنا"
            value={about.teamTitle}
            onChange={(v) => setAbout({ ...about, teamTitle: v })}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="نص: رسالتنا"
            value={about.missionText}
            onChange={(v) => setAbout({ ...about, missionText: v })}
          />
          <Input
            label="نص: قيمنا"
            value={about.valuesText}
            onChange={(v) => setAbout({ ...about, valuesText: v })}
          />
          <Input
            label="نص: فريقنا"
            value={about.teamText}
            onChange={(v) => setAbout({ ...about, teamText: v })}
          />
        </div>
        <button className="btn-gold" onClick={() => saveKey("about_page", about)}>
          حفظ صفحة "من نحن"
        </button>
      </div>

      <div className="card-clean p-4 space-y-3">
        <h3 className="font-bold text-lg">الفوتر (أسفل كل صفحة)</h3>
        <Textarea
          label="الوصف المختصر"
          value={footer.description}
          onChange={(v) => setFooter({ ...footer, description: v })}
        />
        <Input
          label="اسم المدير العام"
          value={footer.managerName}
          onChange={(v) => setFooter({ ...footer, managerName: v })}
        />
        <Input
          label="العنوان"
          value={footer.address}
          onChange={(v) => setFooter({ ...footer, address: v })}
        />
        <Input
          label="أوقات العمل"
          value={footer.hours}
          onChange={(v) => setFooter({ ...footer, hours: v })}
        />
        <button className="btn-gold" onClick={() => saveKey("footer_content", footer)}>
          حفظ الفوتر
        </button>
      </div>

      <div className="card-clean p-4 space-y-3">
        <h3 className="font-bold text-lg">صفحة "اتصل بنا"</h3>
        <Input
          label="الجملة التعريفية"
          value={contact.subtitle}
          onChange={(v) => setContact({ ...contact, subtitle: v })}
        />
        <Input
          label="العنوان"
          value={contact.address}
          onChange={(v) => setContact({ ...contact, address: v })}
        />
        <Textarea
          label="أوقات العمل (سطر جديد = فاصل)"
          value={contact.hours}
          onChange={(v) => setContact({ ...contact, hours: v })}
        />
        <button className="btn-gold" onClick={() => saveKey("contact_page", contact)}>
          حفظ صفحة "اتصل بنا"
        </button>
      </div>
    </div>
  );
}
