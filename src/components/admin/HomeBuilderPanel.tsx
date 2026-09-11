import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { getSiteContent } from "@/lib/catalog.functions";
import { saveContent } from "@/lib/admin.functions";
import {
  CONTENT_DEFAULTS,
  HOME_SECTION_LABELS,
  withMissingSections,
  type HomeSectionsConfig,
  type HomeBannerContent,
  type HomeSectionId,
  type FeaturedSliderContent,
  type GoogleReviewsContent,
  type SeoMetaContent,
} from "@/lib/site-content";
import { getPwd, ImageUploader, Input } from "@/components/admin/shared";

/* ===================== Home Builder (sections order, seasonal banner, featured slider) ===================== */
export function HomeBuilderPanel() {
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
    return { ...CONTENT_DEFAULTS[key], ...(row.value as Record<string, unknown>) };
  };

  const [sections, setSections] = useState<HomeSectionsConfig | null>(null);
  const [banner, setBanner] = useState<HomeBannerContent | null>(null);
  const [sliderSettings, setSliderSettings] = useState<FeaturedSliderContent>(
    CONTENT_DEFAULTS.featured_slider,
  );
  const [googleReviews, setGoogleReviews] = useState<GoogleReviewsContent>(
    CONTENT_DEFAULTS.google_reviews,
  );
  const [seoMeta, setSeoMeta] = useState<SeoMetaContent>(CONTENT_DEFAULTS.seo_meta);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (!isLoading && !sections) {
      const saved = getValue("home_sections");
      setSections({ ...saved, order: withMissingSections(saved.order) });
      setBanner(getValue("home_banner"));
      setSliderSettings(getValue("featured_slider"));
      setGoogleReviews(getValue("google_reviews"));
      setSeoMeta(getValue("seo_meta"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const addReviewItem = () => {
    setGoogleReviews((g) => ({
      ...g,
      items: [
        ...g.items,
        { id: crypto.randomUUID(), name: "", rating: 5, text: "" },
      ],
    }));
  };
  const updateReviewItem = (id: string, patch: Partial<GoogleReviewsContent["items"][number]>) => {
    setGoogleReviews((g) => ({
      ...g,
      items: g.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  };
  const removeReviewItem = (id: string) => {
    setGoogleReviews((g) => ({ ...g, items: g.items.filter((it) => it.id !== id) }));
  };

  const saveKey = async (key: keyof typeof CONTENT_DEFAULTS, value: unknown) => {
    await save({ data: { password: getPwd(), key, value } });
    qc.invalidateQueries({ queryKey: ["admin-content"] });
    qc.invalidateQueries({ queryKey: ["site-content"] });
    setSavedMsg("تم الحفظ ✓ — التغيير ظاهر في الموقع الآن");
    setTimeout(() => setSavedMsg(""), 2500);
  };

  const move = (id: HomeSectionId, dir: -1 | 1) => {
    if (!sections) return;
    const idx = sections.order.indexOf(id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sections.order.length) return;
    const order = [...sections.order];
    [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
    setSections({ ...sections, order });
  };

  const toggleHidden = (id: HomeSectionId) => {
    if (!sections) return;
    const hidden = sections.hidden.includes(id)
      ? sections.hidden.filter((x) => x !== id)
      : [...sections.hidden, id];
    setSections({ ...sections, hidden });
  };

  if (isLoading || !sections || !banner) {
    return <div className="text-sm text-[var(--color-ink-soft)]">جارِ التحميل...</div>;
  }

  return (
    <div className="space-y-8">
      <p className="text-xs text-[var(--color-ink-soft)]">
        تحكم بترتيب أقسام الصفحة الرئيسية، أخفِ أي قسم مؤقتًا، وفعّل بانر موسمي (رمضان، الجمعة
        البيضاء...) — كل هذا بدون فتح الكود. السلايدر الرئيسي (الهيرو) ثابت دائمًا في الأعلى.
      </p>
      {savedMsg && <div className="text-sm font-bold text-green-600">{savedMsg}</div>}

      <div className="card-clean p-4 space-y-3">
        <h3 className="font-bold text-lg">ترتيب وإظهار أقسام الرئيسية</h3>
        <div className="space-y-2">
          {sections.order.map((id, i) => {
            const hidden = sections.hidden.includes(id);
            return (
              <div
                key={id}
                className={`flex items-center justify-between gap-3 border rounded-lg px-3 py-2 ${hidden ? "opacity-50 border-dashed" : "border-[var(--color-hairline)]"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--color-ink-soft)] w-5">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-sm">{HOME_SECTION_LABELS[id]}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => move(id, -1)}
                    disabled={i === 0}
                    className="p-1.5 rounded hover:bg-[var(--color-surface)] disabled:opacity-30"
                    aria-label="نقل لأعلى"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => move(id, 1)}
                    disabled={i === sections.order.length - 1}
                    className="p-1.5 rounded hover:bg-[var(--color-surface)] disabled:opacity-30"
                    aria-label="نقل لأسفل"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleHidden(id)}
                    className="p-1.5 rounded hover:bg-[var(--color-surface)] text-[var(--color-gold)]"
                    aria-label={hidden ? "إظهار" : "إخفاء"}
                  >
                    {hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <button className="btn-gold" onClick={() => saveKey("home_sections", sections)}>
          حفظ الترتيب
        </button>
      </div>

      <div className="card-clean p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">البانر الموسمي</h3>
          <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={banner.enabled}
              onChange={(e) => setBanner({ ...banner, enabled: e.target.checked })}
            />
            مفعّل
          </label>
        </div>
        <p className="text-xs text-[var(--color-ink-soft)]">
          يظهر أسفل السلايدر مباشرة عند تفعيله — استخدمه لرمضان، الجمعة البيضاء، أو أي مناسبة
          موسمية.
        </p>
        <Input
          label="العنوان"
          value={banner.title}
          onChange={(v) => setBanner({ ...banner, title: v })}
        />
        <Input
          label="النص الفرعي"
          value={banner.subtitle}
          onChange={(v) => setBanner({ ...banner, subtitle: v })}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="نص الزر"
            value={banner.buttonText}
            onChange={(v) => setBanner({ ...banner, buttonText: v })}
          />
          <Input
            label="رابط الزر (مثال: /offers)"
            value={banner.buttonLink}
            onChange={(v) => setBanner({ ...banner, buttonLink: v })}
            ltr
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-bold block mb-1">لون الخلفية</span>
            <input
              type="color"
              value={banner.bgColor}
              onChange={(e) => setBanner({ ...banner, bgColor: e.target.value })}
              className="w-full h-10 rounded-lg border border-[var(--color-hairline)]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold block mb-1">لون النص</span>
            <input
              type="color"
              value={banner.textColor}
              onChange={(e) => setBanner({ ...banner, textColor: e.target.value })}
              className="w-full h-10 rounded-lg border border-[var(--color-hairline)]"
            />
          </label>
        </div>

        <div className="border-t border-[var(--color-hairline)] pt-3 space-y-2">
          <span className="text-sm font-bold block">صور البانر (اختياري)</span>
          <p className="text-xs text-[var(--color-ink-soft)]">
            بدون صور: البانر يظهر بلون واحد فقط. صورة واحدة: تظهر ثابتة. أكثر من صورة: تتحرك
            تلقائيًا مثل سلايدر الأعلى.
          </p>
          <div className="flex flex-wrap gap-2">
            {(banner.bgImages ?? []).map((url, idx) => (
              <div key={idx} className="relative">
                <img
                  src={url}
                  alt=""
                  className="w-20 h-14 object-cover rounded-lg border border-[var(--color-hairline)]"
                />
                <button
                  type="button"
                  onClick={() =>
                    setBanner({ ...banner, bgImages: banner.bgImages.filter((_, i) => i !== idx) })
                  }
                  aria-label="حذف الصورة"
                  className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
            <ImageUploader
              onUploaded={(u) =>
                setBanner({ ...banner, bgImages: [...(banner.bgImages ?? []), u] })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-sm font-bold block mb-1">ارتفاع البانر (بكسل)</span>
            <input
              type="number"
              min={0}
              placeholder="تلقائي"
              value={banner.heightPx || ""}
              onChange={(e) => setBanner({ ...banner, heightPx: Number(e.target.value) || 0 })}
              className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 text-sm"
              dir="ltr"
            />
            <span className="text-[10px] text-[var(--color-ink-soft)] block mt-1">
              اتركه فارغًا للارتفاع التلقائي
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm font-bold cursor-pointer md:pt-6">
            <input
              type="checkbox"
              checked={banner.autoplay}
              onChange={(e) => setBanner({ ...banner, autoplay: e.target.checked })}
            />
            تحريك الصور تلقائيًا
          </label>
          <label className="block">
            <span className="text-sm font-bold block mb-1">سرعة التبديل (ثواني)</span>
            <input
              type="number"
              min={1}
              max={20}
              value={banner.speedSeconds}
              onChange={(e) =>
                setBanner({ ...banner, speedSeconds: Math.max(1, Number(e.target.value) || 1) })
              }
              className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 text-sm"
              dir="ltr"
            />
          </label>
        </div>

        <button className="btn-gold" onClick={() => saveKey("home_banner", banner)}>
          حفظ البانر
        </button>
      </div>

      <div className="card-clean p-4 space-y-3">
        <h3 className="font-bold text-lg">سلايدر المنتجات المميزة</h3>
        <p className="text-xs text-[var(--color-ink-soft)]">
          تحكم بحركة سلايدر "المنتجات المميزة" بالصفحة الرئيسية. عدد المنتجات المعروضة فيه يعتمد على
          المنتجات المفعّل لها "مميز ⭐" من تبويب المنتجات (حتى 60 منتج).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={sliderSettings.autoplay}
              onChange={(e) => setSliderSettings({ ...sliderSettings, autoplay: e.target.checked })}
            />
            تحريك تلقائي
          </label>
          <label className="block">
            <span className="text-sm font-bold block mb-1">سرعة الانتقال (ثواني)</span>
            <input
              type="number"
              min={1}
              max={20}
              value={sliderSettings.speedSeconds}
              onChange={(e) =>
                setSliderSettings({
                  ...sliderSettings,
                  speedSeconds: Math.max(1, Number(e.target.value) || 1),
                })
              }
              className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 text-sm"
              dir="ltr"
            />
          </label>
        </div>
        <button className="btn-gold" onClick={() => saveKey("featured_slider", sliderSettings)}>
          حفظ إعدادات السلايدر
        </button>
      </div>

      <div className="card-clean p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">تقييمات جوجل ماب (سلايدر)</h3>
          <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={googleReviews.enabled}
              onChange={(e) => setGoogleReviews({ ...googleReviews, enabled: e.target.checked })}
            />
            مفعّل
          </label>
        </div>
        <p className="text-xs text-[var(--color-ink-soft)]">
          انسخ التقييمات الحقيقية من صفحة نشاطك على خرائط جوجل (الاسم، عدد النجوم، والنص) وأضفها
          هنا — تظهر في سلايدر متحرك بالصفحة الرئيسية، وترتيبه يُتحكم به من قائمة "ترتيب وإظهار
          أقسام الرئيسية" بالأعلى.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={googleReviews.autoplay}
              onChange={(e) => setGoogleReviews({ ...googleReviews, autoplay: e.target.checked })}
            />
            تحريك تلقائي
          </label>
          <label className="block">
            <span className="text-sm font-bold block mb-1">سرعة التبديل (ثواني)</span>
            <input
              type="number"
              min={1}
              max={20}
              value={googleReviews.speedSeconds}
              onChange={(e) =>
                setGoogleReviews({
                  ...googleReviews,
                  speedSeconds: Math.max(1, Number(e.target.value) || 1),
                })
              }
              className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 text-sm"
              dir="ltr"
            />
          </label>
        </div>

        <div className="space-y-3">
          {googleReviews.items.map((it, idx) => (
            <div
              key={it.id}
              className="border border-[var(--color-hairline)] rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-ink-soft)]">
                  تقييم #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeReviewItem(it.id)}
                  className="text-red-600 hover:opacity-70"
                  aria-label="حذف التقييم"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  label="اسم العميل"
                  value={it.name}
                  onChange={(v) => updateReviewItem(it.id, { name: v })}
                />
                <label className="block">
                  <span className="text-sm font-bold block mb-1">عدد النجوم</span>
                  <select
                    value={it.rating}
                    onChange={(e) => updateReviewItem(it.id, { rating: Number(e.target.value) })}
                    className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 text-sm"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} نجوم
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-bold block mb-1">نص التقييم</span>
                <textarea
                  rows={3}
                  value={it.text}
                  onChange={(e) => updateReviewItem(it.id, { text: e.target.value })}
                  className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 text-sm"
                />
              </label>
            </div>
          ))}
        </div>

        <button type="button" onClick={addReviewItem} className="btn-outline">
          <Plus className="w-4 h-4" /> إضافة تقييم
        </button>

        <div>
          <button className="btn-gold" onClick={() => saveKey("google_reviews", googleReviews)}>
            حفظ تقييمات جوجل
          </button>
        </div>
      </div>

      <div className="card-clean p-4 space-y-3">
        <h3 className="font-bold text-lg">الكلمات المفتاحية (SEO)</h3>
        <p className="text-xs text-[var(--color-ink-soft)]">
          كلمات وعبارات يبحث بها الناس على جوجل — كل ما كانت دقيقة ومرتبطة بمنتجاتك (مثل أسماء
          براندات أفلام الحماية) كل ما زادت فرصة ظهور موقعك في نتائج البحث. افصل بينها بفاصلة.
        </p>
        <label className="block">
          <span className="text-sm font-bold block mb-1">الكلمات المفتاحية</span>
          <textarea
            rows={3}
            value={seoMeta.keywords}
            onChange={(e) => setSeoMeta({ ...seoMeta, keywords: e.target.value })}
            placeholder="PPF, نانو سيراميك, XPEL, 3M, حماية طلاء السيارات صنعاء..."
            className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold block mb-1">وصف الموقع (يظهر في نتائج البحث)</span>
          <textarea
            rows={2}
            value={seoMeta.description}
            onChange={(e) => setSeoMeta({ ...seoMeta, description: e.target.value })}
            className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <button className="btn-gold" onClick={() => saveKey("seo_meta", seoMeta)}>
          حفظ إعدادات SEO
        </button>
      </div>
    </div>
  );
}
