import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, Save, Loader2, Star, Copy, Download, Upload, Palette, Check, Sparkles,
} from "lucide-react";
import { wbList, wbUpsert, wbDelete } from "@/lib/website-builder.functions";
import {
  DEFAULT_THEME_JSON, setActiveWebsiteTheme, duplicateWebsiteTheme,
} from "@/lib/theme-engine.functions";
import type { LivePayload } from "./LivePreview";

type ThemeRow = { id: string; name: string; theme_json: any; is_active: boolean };

const COLOR_KEYS: { k: string; label: string }[] = [
  { k: "primary", label: "Primary" },
  { k: "background", label: "Background" },
  { k: "foreground", label: "Foreground (text)" },
  { k: "card", label: "Card" },
  { k: "muted", label: "Muted" },
  { k: "accent", label: "Accent" },
  { k: "border", label: "Border" },
  { k: "gold", label: "Gold" },
  { k: "gold-soft", label: "Gold soft" },
  { k: "ink", label: "Ink" },
  { k: "ink-soft", label: "Ink soft" },
  { k: "surface", label: "Surface" },
];

const RADIUS_KEYS = ["base", "sm", "md", "lg", "xl"];
const SPACING_KEYS = ["xs", "sm", "md", "lg", "xl"];
const SHADOW_KEYS = ["sm", "md", "lg", "xl"];

const FONT_PRESETS = [
  '"Cairo", system-ui, sans-serif',
  '"Tajawal", system-ui, sans-serif',
  '"IBM Plex Sans Arabic", system-ui, sans-serif',
  '"Inter", system-ui, sans-serif',
  '"Poppins", system-ui, sans-serif',
];

/** Ready-made occasion identities. Colors/shape are set; background/logo/decorative
 * image URLs are left blank for the admin to fill in (paste a hosted image URL —
 * e.g. upload it via any product/service image field first, then paste the link here). */
const OCCASION_PRESETS: { key: string; label: string; build: () => any }[] = [
  {
    key: "mawlid",
    label: "المولد النبوي الشريف",
    build: () => ({
      ...structuredClone(DEFAULT_THEME_JSON),
      colors: {
        ...DEFAULT_THEME_JSON.colors,
        primary: "#0E6E4E",
        background: "#FAF7EE",
        foreground: "#123326",
        card: "#FFFFFF",
        accent: "#F1E4B8",
        border: "#E4D9A8",
        gold: "#C9A227",
        "gold-soft": "#EAD98C",
        ink: "#123326",
        "ink-soft": "#3E5B4E",
        surface: "#F3EFDD",
      },
      colors_dark: {
        background: "#0B2A20",
        foreground: "#F3EFDD",
        card: "#0F3A2B",
        surface: "#0F3A2B",
        border: "#1E4E3B",
        "ink-soft": "#BFD8CB",
      },
      radius: { ...DEFAULT_THEME_JSON.radius, base: "9999px" },
      buttons: { "primary-bg": "#0E6E4E", "primary-fg": "#FAF7EE", "primary-radius": "9999px" },
      background: { type: "color", value: "#FAF7EE", overlay_opacity: "0" },
      logo_url: "",
      decorative_url: "",
    }),
  },
];

/** Try to render any color string in a native color input; fall back to text. */
function isHex(v: string) { return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v); }

export function ThemeEditor({ onLiveChange }: { onLiveChange: (p: LivePayload) => void }) {
  const list = useServerFn(wbList);
  const upsert = useServerFn(wbUpsert);
  const del = useServerFn(wbDelete);
  const setActive = useServerFn(setActiveWebsiteTheme);
  const dup = useServerFn(duplicateWebsiteTheme);
  const qc = useQueryClient();

  const key = ["wb", "website_themes"];
  const q = useQuery({ queryKey: key, queryFn: () => list({ data: { table: "website_themes" as any } }) });
  const themes: ThemeRow[] = (q.data as any) ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Auto-select active theme on load
  useEffect(() => {
    if (!selectedId && themes.length > 0) {
      const active = themes.find((t) => t.is_active) ?? themes[0];
      setSelectedId(active.id);
    }
  }, [themes, selectedId]);

  // When selection changes, hydrate draft
  useEffect(() => {
    const t = themes.find((x) => x.id === selectedId);
    if (t) {
      setDraft(mergeDefaults(t.theme_json));
      setName(t.name);
    }
  }, [selectedId, themes]);

  // Push live preview on every draft change
  useEffect(() => {
    if (!draft) return;
    onLiveChange({ kind: "theme", json: draft });
  }, [draft, onLiveChange]);

  const currentActive = themes.find((t) => t.is_active);

  const createNew = async () => {
    const row: any = await upsert({ data: {
      table: "website_themes" as any,
      values: { name: `Theme ${themes.length + 1}`, theme_json: DEFAULT_THEME_JSON, is_active: themes.length === 0 },
    }});
    await qc.invalidateQueries({ queryKey: key });
    setSelectedId(row?.id ?? null);
  };

  const createFromPreset = async (preset: typeof OCCASION_PRESETS[number]) => {
    const row: any = await upsert({ data: {
      table: "website_themes" as any,
      values: { name: preset.label, theme_json: preset.build(), is_active: false },
    }});
    await qc.invalidateQueries({ queryKey: key });
    setSelectedId(row?.id ?? null);
    setMsg(`تم إنشاء هوية "${preset.label}" — عدّل الألوان/الصور ثم اضغط "تفعيل على الموقع" عند الجاهزية.`);
  };

  const save = async () => {
    if (!selectedId) return;
    setSaving(true); setMsg(null);
    try {
      await upsert({ data: {
        table: "website_themes" as any,
        values: { id: selectedId, name, theme_json: draft },
      }});
      await qc.invalidateQueries({ queryKey: key });
      await qc.invalidateQueries({ queryKey: ["active-website-theme"] });
      setMsg("تم الحفظ ✓");
      // Reload live preview only if this was the active theme so it re-fetches from DB
      onLiveChange({ kind: "theme", json: draft });
    } catch (e) {
      setMsg((e as Error).message);
    } finally { setSaving(false); }
  };

  const activate = async () => {
    if (!selectedId) return;
    setSaving(true); setMsg(null);
    try {
      await setActive({ data: { id: selectedId } });
      await qc.invalidateQueries({ queryKey: key });
      await qc.invalidateQueries({ queryKey: ["active-website-theme"] });
      setMsg("تم تفعيل هذا المظهر على الموقع ✓");
      onLiveChange({ kind: "reload" });
    } catch (e) { setMsg((e as Error).message); }
    finally { setSaving(false); }
  };

  const duplicate = async () => {
    if (!selectedId) return;
    const row: any = await dup({ data: { id: selectedId } });
    await qc.invalidateQueries({ queryKey: key });
    if (row?.id) setSelectedId(row.id);
  };

  const remove = async () => {
    if (!selectedId) return;
    if (!confirm("حذف هذا المظهر؟")) return;
    await del({ data: { table: "website_themes" as any, id: selectedId } });
    setSelectedId(null); setDraft(null);
    qc.invalidateQueries({ queryKey: key });
  };

  const exportJson = () => {
    if (!draft) return;
    const blob = new Blob([JSON.stringify({ name, theme_json: draft }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `theme-${(name || "theme").replace(/\s+/g, "-")}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      const tj = parsed.theme_json ?? parsed;
      const nm = parsed.name ?? `Imported ${Date.now()}`;
      const row: any = await upsert({ data: {
        table: "website_themes" as any,
        values: { name: nm, theme_json: mergeDefaults(tj), is_active: false },
      }});
      await qc.invalidateQueries({ queryKey: key });
      if (row?.id) setSelectedId(row.id);
      setMsg("تم الاستيراد ✓");
    } catch (e) { alert((e as Error).message); }
  };

  const patch = (path: string[], value: string) => {
    setDraft((prev: any) => {
      const next = structuredClone(prev ?? {});
      let cur = next;
      for (let i = 0; i < path.length - 1; i++) {
        cur[path[i]] = cur[path[i]] ?? {};
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = value;
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Occasion presets */}
      <div className="bg-[var(--color-surface)] rounded-xl p-3">
        <h3 className="text-sm font-bold mb-2 inline-flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--color-gold)]" /> هويات مناسبات جاهزة
        </h3>
        <p className="text-xs text-[var(--color-ink-soft)] mb-3">
          تنشئ نسخة جديدة غير مفعّلة يمكنك تعديلها ومعاينتها، وتفعيلها لاحقاً وقت المناسبة.
        </p>
        <div className="flex flex-wrap gap-2">
          {OCCASION_PRESETS.map((p) => (
            <button key={p.key} onClick={() => createFromPreset(p)} className="btn-outline text-xs">
              <Plus className="w-3 h-3" /> {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Themes list */}
      <div className="bg-[var(--color-surface)] rounded-xl p-3">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-lg font-bold inline-flex items-center gap-2">
            <Palette className="w-5 h-5" /> Themes
            <span className="text-sm text-[var(--color-ink-soft)]">({themes.length})</span>
          </h2>
          <div className="flex gap-2 flex-wrap">
            <label className="btn-outline cursor-pointer">
              <Upload className="w-4 h-4" /> استيراد
              <input type="file" accept="application/json" className="hidden"
                onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
            </label>
            <button onClick={createNew} className="btn-primary"><Plus className="w-4 h-4" /> جديد</button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {themes.map((t) => (
            <button key={t.id} onClick={() => setSelectedId(t.id)}
              className={`text-right p-3 rounded-lg border transition ${
                selectedId === t.id
                  ? "border-[var(--color-gold)] bg-[var(--color-gold-soft)]"
                  : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-gold)]"
              }`}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold truncate">{t.name}</div>
                {t.is_active && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/15 text-green-600 inline-flex items-center gap-1">
                    <Check className="w-3 h-3" /> نشط
                  </span>
                )}
              </div>
              <div className="flex gap-1 mt-2">
                {["primary", "background", "gold", "ink", "accent"].map((k) => (
                  <span key={k} className="w-4 h-4 rounded-full border border-black/10"
                    style={{ background: t.theme_json?.colors?.[k] ?? "#ccc" }} />
                ))}
              </div>
            </button>
          ))}
          {themes.length === 0 && (
            <div className="col-span-full text-center py-6 text-sm text-[var(--color-ink-soft)]">
              لا توجد مظاهر. اضغط "جديد" لإنشاء أول مظهر.
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      {draft && selectedId && (
        <div className="bg-[var(--color-surface)] rounded-xl p-4 space-y-5">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[200px]">
              <div className="text-xs font-bold mb-1">اسم المظهر</div>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]" />
            </label>
            <div className="flex gap-2 flex-wrap">
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
              </button>
              <button onClick={activate} disabled={saving} className="btn-gold">
                <Star className="w-4 h-4" /> تفعيل على الموقع
              </button>
              <button onClick={duplicate} className="btn-outline"><Copy className="w-4 h-4" /> تكرار</button>
              <button onClick={exportJson} className="btn-outline"><Download className="w-4 h-4" /> تصدير</button>
              <button onClick={remove} className="btn-outline text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>

          {msg && <div className="text-sm p-2 rounded bg-[var(--color-bg)]">{msg}</div>}
          {currentActive && currentActive.id !== selectedId && (
            <div className="text-xs p-2 rounded bg-amber-500/10 text-amber-700">
              أنت تعدّل مظهراً غير مفعّل. اضغط "تفعيل على الموقع" لتطبيقه للزوار.
            </div>
          )}

          <Section title="الألوان">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COLOR_KEYS.map(({ k, label }) => {
                const v = draft.colors?.[k] ?? "";
                return (
                  <div key={k} className="flex items-center gap-2">
                    <input type="color" value={isHex(v) ? v : "#ffffff"} disabled={!isHex(v)}
                      onChange={(e) => patch(["colors", k], e.target.value)}
                      className="w-10 h-10 rounded border border-[var(--color-border)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold">{label} <span className="text-[var(--color-ink-soft)] font-normal">({k})</span></div>
                      <input value={v} onChange={(e) => patch(["colors", k], e.target.value)} dir="ltr"
                        className="w-full px-2 py-1 text-xs font-mono rounded bg-[var(--color-bg)] border border-[var(--color-border)]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="الخطوط">
            {(["sans", "heading"] as const).map((k) => (
              <div key={k} className="mb-2">
                <div className="text-xs font-bold mb-1">{k}</div>
                <input value={draft.fonts?.[k] ?? ""} onChange={(e) => patch(["fonts", k], e.target.value)}
                  list={`fonts-${k}`} dir="ltr"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-mono" />
                <datalist id={`fonts-${k}`}>
                  {FONT_PRESETS.map((f) => <option key={f} value={f} />)}
                </datalist>
              </div>
            ))}
          </Section>

          <Section title="الحواف (Radius)">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {RADIUS_KEYS.map((k) => (
                <label key={k}>
                  <div className="text-xs font-bold mb-1">{k}</div>
                  <input value={draft.radius?.[k] ?? ""} onChange={(e) => patch(["radius", k], e.target.value)} dir="ltr"
                    className="w-full px-2 py-1 text-xs font-mono rounded bg-[var(--color-bg)] border border-[var(--color-border)]" />
                </label>
              ))}
            </div>
          </Section>

          <Section title="المسافات">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {SPACING_KEYS.map((k) => (
                <label key={k}>
                  <div className="text-xs font-bold mb-1">{k}</div>
                  <input value={draft.spacing?.[k] ?? ""} onChange={(e) => patch(["spacing", k], e.target.value)} dir="ltr"
                    className="w-full px-2 py-1 text-xs font-mono rounded bg-[var(--color-bg)] border border-[var(--color-border)]" />
                </label>
              ))}
            </div>
          </Section>

          <Section title="الظلال">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SHADOW_KEYS.map((k) => (
                <label key={k}>
                  <div className="text-xs font-bold mb-1">shadow-{k}</div>
                  <input value={draft.shadows?.[k] ?? ""} onChange={(e) => patch(["shadows", k], e.target.value)} dir="ltr"
                    className="w-full px-2 py-1 text-xs font-mono rounded bg-[var(--color-bg)] border border-[var(--color-border)]" />
                </label>
              ))}
            </div>
          </Section>

          <Section title="الأزرار">
            <div className="flex gap-2 mb-3 flex-wrap">
              <span className="text-xs font-bold self-center">شكل سريع:</span>
              {[
                { label: "دائري (سبحة)", v: "9999px" },
                { label: "متوسط", v: "0.75rem" },
                { label: "حاد", v: "0.125rem" },
              ].map((s) => (
                <button key={s.v} type="button" onClick={() => patch(["buttons", "primary-radius"], s.v)}
                  className="btn-outline text-xs">{s.label}</button>
              ))}
            </div>
            {[
              { k: "primary-bg", label: "خلفية الزر الأساسي" },
              { k: "primary-fg", label: "لون نص الزر الأساسي" },
              { k: "primary-radius", label: "زاوية الزر (radius)" },
            ].map(({ k, label }) => (
              <div key={k} className="mb-2">
                <div className="text-xs font-bold mb-1">{label} <span className="text-[var(--color-ink-soft)] font-normal">({k})</span></div>
                <input value={draft.buttons?.[k] ?? ""} onChange={(e) => patch(["buttons", k], e.target.value)} dir="ltr"
                  className="w-full px-2 py-1 text-xs font-mono rounded bg-[var(--color-bg)] border border-[var(--color-border)]" />
              </div>
            ))}
          </Section>

          <Section title="ألوان الوضع الليلي (اختياري)">
            <p className="text-xs text-[var(--color-ink-soft)] mb-3">
              اتركها فارغة لأي لون تريد أن يبقى كما هو في الوضع الليلي. عبّي فقط الألوان التي تحتاج قيمة مختلفة في الوضع الليلي.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COLOR_KEYS.map(({ k, label }) => {
                const v = draft.colors_dark?.[k] ?? "";
                return (
                  <div key={k} className="flex items-center gap-2">
                    <input type="color" value={isHex(v) ? v : "#000000"} disabled={!isHex(v)}
                      onChange={(e) => patch(["colors_dark", k], e.target.value)}
                      className="w-10 h-10 rounded border border-[var(--color-border)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold">{label} <span className="text-[var(--color-ink-soft)] font-normal">({k})</span></div>
                      <input value={v} placeholder="نفس لون النهار" onChange={(e) => patch(["colors_dark", k], e.target.value)} dir="ltr"
                        className="w-full px-2 py-1 text-xs font-mono rounded bg-[var(--color-bg)] border border-[var(--color-border)]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="الخلفية">
            <div className="mb-3">
              <div className="text-xs font-bold mb-1">نوع الخلفية</div>
              <select value={draft.background?.type ?? "color"} onChange={(e) => patch(["background", "type"], e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded bg-[var(--color-bg)] border border-[var(--color-border)]">
                <option value="color">لون ثابت</option>
                <option value="gradient">تدرج لوني (CSS gradient)</option>
                <option value="image">صورة</option>
              </select>
            </div>
            <div className="mb-3">
              <div className="text-xs font-bold mb-1">
                {draft.background?.type === "image" ? "رابط الصورة" : draft.background?.type === "gradient" ? "قيمة CSS gradient" : "قيمة اللون (hex)"}
              </div>
              <input value={draft.background?.value ?? ""} onChange={(e) => patch(["background", "value"], e.target.value)} dir="ltr"
                placeholder={draft.background?.type === "gradient" ? "linear-gradient(135deg, #0E6E4E, #123326)" : draft.background?.type === "image" ? "https://..." : "#FAF7EE"}
                className="w-full px-2 py-1 text-xs font-mono rounded bg-[var(--color-bg)] border border-[var(--color-border)]" />
              {draft.background?.type === "image" && (
                <p className="text-[10px] text-[var(--color-ink-soft)] mt-1">
                  ارفع الصورة من أي حقل صورة في لوحة التحكم أولاً (مثل صورة منتج أو خدمة)، ثم الصق رابطها هنا.
                </p>
              )}
            </div>
            {draft.background?.type === "image" && (
              <div>
                <div className="text-xs font-bold mb-1">تعتيم فوق الصورة (0 = بدون، 1 = أسود كامل)</div>
                <input type="number" min={0} max={1} step={0.05} value={draft.background?.overlay_opacity ?? "0"}
                  onChange={(e) => patch(["background", "overlay_opacity"], e.target.value)} dir="ltr"
                  className="w-full px-2 py-1 text-xs font-mono rounded bg-[var(--color-bg)] border border-[var(--color-border)]" />
              </div>
            )}
          </Section>

          <Section title="الشعار والزخارف">
            <div className="mb-3">
              <div className="text-xs font-bold mb-1">شعار مخصص لهذه الهوية (اختياري)</div>
              <input value={draft.logo_url ?? ""} onChange={(e) => patch(["logo_url"], e.target.value)} dir="ltr"
                placeholder="https://... — اتركه فارغاً لاستخدام الشعار الافتراضي"
                className="w-full px-2 py-1 text-xs font-mono rounded bg-[var(--color-bg)] border border-[var(--color-border)]" />
            </div>
            <div>
              <div className="text-xs font-bold mb-1">صورة زخرفية فوق الموقع (اختياري، مثل نقوش أو هلال زاوية)</div>
              <input value={draft.decorative_url ?? ""} onChange={(e) => patch(["decorative_url"], e.target.value)} dir="ltr"
                placeholder="https://..."
                className="w-full px-2 py-1 text-xs font-mono rounded bg-[var(--color-bg)] border border-[var(--color-border)]" />
              <p className="text-[10px] text-[var(--color-ink-soft)] mt-1">
                يفضّل صورة PNG بخلفية شفافة، بحجم معقول حتى لا تُبطئ تحميل الموقع لزوار الإنترنت الضعيف.
              </p>
            </div>
          </Section>

          <Section title="JSON خام">
            <RawJsonEditor value={draft} onChange={setDraft} />
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-[var(--color-border)] rounded-lg">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full text-right px-3 py-2 font-bold text-sm bg-[var(--color-bg)] rounded-t-lg">
        {open ? "▼" : "◀"} {title}
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}

function RawJsonEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [err, setErr] = useState<string | null>(null);
  const stringified = useMemo(() => JSON.stringify(value, null, 2), [value]);
  useEffect(() => { setText(stringified); }, [stringified]);
  return (
    <div>
      <textarea value={text} onChange={(e) => {
        setText(e.target.value);
        try { onChange(JSON.parse(e.target.value)); setErr(null); }
        catch (ex) { setErr((ex as Error).message); }
      }} rows={12} spellCheck={false} dir="ltr"
        className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-xs" />
      {err && <div className="text-xs mt-1 text-red-500">{err}</div>}
    </div>
  );
}

function mergeDefaults(tj: any): any {
  const out: any = structuredClone(DEFAULT_THEME_JSON);
  if (!tj || typeof tj !== "object") return out;
  for (const k of Object.keys(DEFAULT_THEME_JSON) as (keyof typeof DEFAULT_THEME_JSON)[]) {
    if (tj[k] && typeof tj[k] === "object") out[k] = { ...out[k], ...tj[k] };
    else if (typeof tj[k] === "string") out[k] = tj[k];
  }
  // preserve any extra keys the user added
  for (const k of Object.keys(tj)) if (!(k in out)) out[k] = tj[k];
  return out;
}
