import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shell } from "@/components/layout/Shell";
import { supabase } from "@/integrations/supabase/client";
import {
  wbList, wbUpsert, wbDelete, wbCreateBackup, wbRestoreBackup, wbExportAll, wbImportAll,
} from "@/lib/website-builder.functions";
import { LivePreview, type LivePayload } from "@/components/admin/LivePreview";
import {
  Plus, Trash2, Save, Download, Upload, ArrowLeft, Loader2, RefreshCw, FileText,
  Layout, Boxes, Palette, Package, Image as ImageIcon, Menu as MenuIcon, Settings, Search, Code2, HistoryIcon, Eye, EyeOff,
} from "lucide-react";

export const Route = createFileRoute("/admin_/website-builder")({
  head: () => ({ meta: [{ title: "Website Builder — لوحة التحكم" }, { name: "robots", content: "noindex" }] }),
  component: WebsiteBuilderPage,
});

type Tab =
  | "dashboard" | "pages" | "components" | "layouts" | "templates" | "themes"
  | "media" | "menus" | "settings" | "seo" | "custom-code" | "import-export" | "backups";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", icon: Layout },
  { id: "pages", label: "Pages", icon: FileText },
  { id: "components", label: "Components", icon: Boxes },
  { id: "layouts", label: "Layouts", icon: Layout },
  { id: "templates", label: "Templates", icon: Package },
  { id: "themes", label: "Themes", icon: Palette },
  { id: "media", label: "Media Library", icon: ImageIcon },
  { id: "menus", label: "Menus", icon: MenuIcon },
  { id: "settings", label: "Global Settings", icon: Settings },
  { id: "seo", label: "SEO", icon: Search },
  { id: "custom-code", label: "Custom Code", icon: Code2 },
  { id: "import-export", label: "Import / Export", icon: Download },
  { id: "backups", label: "Backups", icon: HistoryIcon },
];

function WebsiteBuilderPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!data.user) { setAuthed(false); return; }
      const [{ data: a }, { data: s }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: data.user.id, _role: "super_admin" }),
      ]);
      setAuthed(!!a || !!s);
    })();
    return () => { mounted = false; };
  }, []);

  const [tab, setTab] = useState<Tab>("dashboard");

  if (authed === null) {
    return <Shell><div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin inline" /></div></Shell>;
  }
  if (!authed) {
    return (
      <Shell>
        <div className="max-w-md mx-auto p-8 text-center">
          <h1 className="text-xl font-bold mb-3">وصول مقيّد</h1>
          <p className="text-sm text-[var(--color-ink-soft)] mb-4">هذه الصفحة متاحة للمدراء فقط. سجّل الدخول بحساب مدير.</p>
          <Link to="/warranty/auth" className="btn-primary">تسجيل الدخول</Link>
        </div>
      </Shell>
    );
  }

  const [previewOpen, setPreviewOpen] = useState(true);
  const [livePayload, setLivePayload] = useState<LivePayload>(null);
  const [previewPath, setPreviewPath] = useState("/");

  return (
    <Shell>
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black">Website Builder</h1>
            <p className="text-sm text-[var(--color-ink-soft)]">محرك بناء مواقع ديناميكي مدفوع بـ JSON مع معاينة مباشرة</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPreviewOpen((v) => !v)} className="btn-outline">
              {previewOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {previewOpen ? "إخفاء المعاينة" : "إظهار المعاينة"}
            </button>
            <Link to="/admin" className="btn-outline"><ArrowLeft className="w-4 h-4" /> لوحة التحكم</Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3 mb-6">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded-lg text-sm font-bold inline-flex items-center gap-2 transition ${
                tab === t.id ? "bg-[var(--color-gold)] text-[var(--color-ink)]" : "bg-[var(--color-surface)] text-[var(--color-ink-soft)] hover:bg-[var(--color-gold-soft)]"
              }`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className={previewOpen ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4" : ""}>
          <div className="min-w-0">
            {tab === "dashboard" && <DashboardPanel onNavigate={setTab} />}
            {tab === "pages" && <TablePanel table="website_pages" title="Pages" jsonFields={["page_json","seo_json"]} textFields={[{k:"name",l:"Name"},{k:"slug",l:"Slug"},{k:"status",l:"Status (draft/published)"}]} onEditPath={(r) => setPreviewPath("/" + (r.slug ?? ""))} />}
            {tab === "components" && <TablePanel table="website_components" title="Components" jsonFields={["schema_json","settings_json"]} textFields={[{k:"name",l:"Name"},{k:"category",l:"Category"}]} />}
            {tab === "layouts" && <TablePanel table="website_layouts" title="Layouts" jsonFields={["layout_json"]} textFields={[{k:"name",l:"Name"}]} />}
            {tab === "templates" && <TablePanel table="website_templates" title="Templates" jsonFields={["template_json"]} textFields={[{k:"name",l:"Name"},{k:"type",l:"Type (section/page)"},{k:"category",l:"Category"}]} />}
            {tab === "themes" && <TablePanel table="website_themes" title="Themes" jsonFields={["theme_json"]} textFields={[{k:"name",l:"Name"},{k:"is_active",l:"Active (true/false)"}]} liveKind="theme" onLiveChange={setLivePayload} />}
            {tab === "media" && <MediaPanel />}
            {tab === "menus" && <TablePanel table="website_menus" title="Menus" jsonFields={["menu_json"]} textFields={[{k:"name",l:"Name"},{k:"location",l:"Location (header/footer)"}]} />}
            {tab === "settings" && <SettingsPanel />}
            {tab === "seo" && <SEOPanel />}
            {tab === "custom-code" && <CustomCodePanel />}
            {tab === "import-export" && <ImportExportPanel />}
            {tab === "backups" && <BackupsPanel />}
          </div>

          {previewOpen && (
            <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-6rem)]">
              <LivePreview path={previewPath} payload={livePayload} />
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

/* ---------- Dashboard ---------- */
function DashboardPanel({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const list = useServerFn(wbList);
  const q = useQuery({
    queryKey: ["wb-dash"],
    queryFn: async () => {
      const tables = ["website_pages","website_components","website_layouts","website_themes","website_templates","website_media","website_menus","website_backups"] as const;
      const results: Record<string, number> = {};
      for (const t of tables) {
        const rows = await list({ data: { table: t } });
        results[t] = rows.length;
      }
      return results;
    },
  });
  const items: { key: string; label: string; tab: Tab }[] = [
    { key: "website_pages", label: "Pages", tab: "pages" },
    { key: "website_components", label: "Components", tab: "components" },
    { key: "website_layouts", label: "Layouts", tab: "layouts" },
    { key: "website_themes", label: "Themes", tab: "themes" },
    { key: "website_templates", label: "Templates", tab: "templates" },
    { key: "website_media", label: "Media", tab: "media" },
    { key: "website_menus", label: "Menus", tab: "menus" },
    { key: "website_backups", label: "Backups", tab: "backups" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it) => (
        <button key={it.key} onClick={() => onNavigate(it.tab)}
          className="bg-[var(--color-surface)] rounded-xl p-4 text-right hover:bg-[var(--color-gold-soft)] transition">
          <div className="text-xs text-[var(--color-ink-soft)]">{it.label}</div>
          <div className="text-2xl font-black mt-1">{q.data?.[it.key] ?? "—"}</div>
        </button>
      ))}
    </div>
  );
}

/* ---------- Generic Table Panel with JSON editor ---------- */
type FieldDef = { k: string; l: string };
function TablePanel({
  table, title, jsonFields, textFields, liveKind, onLiveChange, onEditPath,
}: {
  table: any; title: string; jsonFields: string[]; textFields: FieldDef[];
  liveKind?: "theme";
  onLiveChange?: (p: LivePayload) => void;
  onEditPath?: (row: any) => void;
}) {
  const list = useServerFn(wbList);
  const upsert = useServerFn(wbUpsert);
  const del = useServerFn(wbDelete);
  const qc = useQueryClient();
  const key = ["wb", table];
  const q = useQuery({ queryKey: key, queryFn: () => list({ data: { table } }) });
  const [editing, setEditing] = useState<any | null>(null);

  const newRow = () => {
    const row: any = {};
    textFields.forEach((f) => (row[f.k] = ""));
    jsonFields.forEach((f) => (row[f] = {}));
    setEditing(row);
    onLiveChange?.(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">{title} <span className="text-sm text-[var(--color-ink-soft)]">({q.data?.length ?? 0})</span></h2>
        <div className="flex gap-2">
          <button onClick={() => qc.invalidateQueries({ queryKey: key })} className="btn-outline"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={newRow} className="btn-primary"><Plus className="w-4 h-4" /> جديد</button>
        </div>
      </div>

      {editing ? (
        <RowEditor row={editing} textFields={textFields} jsonFields={jsonFields}
          liveKind={liveKind} onLiveChange={onLiveChange}
          onCancel={() => { setEditing(null); onLiveChange?.(null); }}
          onSave={async (values) => {
            await upsert({ data: { table, values } });
            setEditing(null);
            onLiveChange?.({ kind: "reload" });
            qc.invalidateQueries({ queryKey: key });
          }} />
      ) : (
        <div className="space-y-2">
          {(q.data ?? []).map((r: any) => (
            <div key={r.id} className="bg-[var(--color-surface)] rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-bold truncate">{r.name ?? r.slug ?? r.id}</div>
                <div className="text-xs text-[var(--color-ink-soft)] truncate">
                  {textFields.map((f) => `${f.l}: ${String(r[f.k] ?? "—")}`).join(" · ")}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(r)} className="btn-outline text-xs">تعديل</button>
                <button onClick={async () => {
                  if (!confirm("حذف هذا العنصر؟")) return;
                  await del({ data: { table, id: r.id } });
                  qc.invalidateQueries({ queryKey: key });
                }} className="btn-outline text-xs text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {q.isLoading && <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin inline" /></div>}
          {!q.isLoading && (q.data ?? []).length === 0 && (
            <div className="text-center py-8 text-sm text-[var(--color-ink-soft)]">لا توجد عناصر. اضغط "جديد" لإضافة أول عنصر.</div>
          )}
        </div>
      )}
    </div>
  );
}

function RowEditor({ row, textFields, jsonFields, onSave, onCancel }: {
  row: any; textFields: FieldDef[]; jsonFields: string[];
  onSave: (v: any) => Promise<void>; onCancel: () => void;
}) {
  const [values, setValues] = useState<any>(() => {
    const v: any = { ...row };
    jsonFields.forEach((f) => { v[f] = JSON.stringify(row[f] ?? {}, null, 2); });
    return v;
  });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setErr(""); setSaving(true);
    try {
      const out: any = { ...values };
      for (const f of jsonFields) {
        try { out[f] = JSON.parse(values[f] || "{}"); }
        catch { throw new Error(`JSON غير صحيح في الحقل: ${f}`); }
      }
      // Coerce booleans/numbers-as-strings for known keys
      if (typeof out.is_active === "string") out.is_active = out.is_active === "true";
      await onSave(out);
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-4 space-y-3">
      {textFields.map((f) => (
        <label key={f.k} className="block">
          <div className="text-xs font-bold mb-1">{f.l}</div>
          <input value={values[f.k] ?? ""} onChange={(e) => setValues({ ...values, [f.k]: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]" />
        </label>
      ))}
      {jsonFields.map((f) => (
        <label key={f} className="block">
          <div className="text-xs font-bold mb-1">{f} (JSON)</div>
          <textarea value={values[f] ?? "{}"} onChange={(e) => setValues({ ...values, [f]: e.target.value })}
            rows={12} spellCheck={false}
            className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-xs" />
        </label>
      ))}
      {err && <div className="text-sm p-3 rounded bg-red-500/10 text-red-500">{err}</div>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
        </button>
        <button onClick={onCancel} className="btn-outline">إلغاء</button>
      </div>
    </div>
  );
}

/* ---------- Media Panel (uses existing 'media' bucket) ---------- */
function MediaPanel() {
  const list = useServerFn(wbList);
  const upsert = useServerFn(wbUpsert);
  const del = useServerFn(wbDelete);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["wb","website_media"], queryFn: () => list({ data: { table: "website_media" as any } }) });
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const path = `builder/${Date.now()}-${file.name.replace(/[^\w.\-]/g,"_")}`;
      const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      await upsert({ data: { table: "website_media" as any, values: { file_url: data.publicUrl, folder: "root", metadata: { name: file.name, size: file.size, type: file.type } } } });
      qc.invalidateQueries({ queryKey: ["wb","website_media"] });
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">Media Library ({q.data?.length ?? 0})</h2>
        <label className="btn-primary cursor-pointer">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} رفع ملف
          <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(q.data ?? []).map((m: any) => (
          <div key={m.id} className="bg-[var(--color-surface)] rounded-lg overflow-hidden">
            <div className="aspect-square bg-black/10">
              {/^image\//.test(m.metadata?.type ?? "") || /\.(png|jpe?g|webp|gif|svg)$/i.test(m.file_url)
                ? <img src={m.file_url} className="w-full h-full object-cover" alt="" />
                : <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-ink-soft)]">ملف</div>}
            </div>
            <div className="p-2 text-xs">
              <div className="truncate">{m.metadata?.name ?? m.file_url.split("/").pop()}</div>
              <div className="flex justify-between items-center mt-1">
                <button onClick={() => navigator.clipboard.writeText(m.file_url)} className="text-[var(--color-gold)]">نسخ الرابط</button>
                <button onClick={async () => {
                  if (!confirm("حذف؟")) return;
                  await del({ data: { table: "website_media" as any, id: m.id } });
                  qc.invalidateQueries({ queryKey: ["wb","website_media"] });
                }} className="text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Settings singleton ---------- */
function SettingsPanel() {
  const list = useServerFn(wbList);
  const upsert = useServerFn(wbUpsert);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["wb","website_settings"], queryFn: () => list({ data: { table: "website_settings" as any } }) });
  const row: any = q.data?.[0];
  const [txt, setTxt] = useState<string>("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  useEffect(() => { if (row) setTxt(JSON.stringify(row.settings_json ?? {}, null, 2)); }, [row?.id]);
  if (!row) return <div className="text-center py-6 text-sm text-[var(--color-ink-soft)]">جاري التحميل...</div>;
  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-4 space-y-3">
      <div className="text-xs font-bold">Global Settings (JSON)</div>
      <textarea value={txt} onChange={(e) => setTxt(e.target.value)} rows={20} spellCheck={false}
        className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-xs" />
      {err && <div className="text-sm p-2 rounded bg-red-500/10 text-red-500">{err}</div>}
      {ok && <div className="text-sm p-2 rounded bg-green-500/10 text-green-500">{ok}</div>}
      <button onClick={async () => {
        setErr(""); setOk("");
        try {
          const parsed = JSON.parse(txt);
          await upsert({ data: { table: "website_settings" as any, values: { id: row.id, settings_json: parsed } } });
          qc.invalidateQueries({ queryKey: ["wb","website_settings"] });
          setOk("تم الحفظ");
        } catch (e) { setErr((e as Error).message); }
      }} className="btn-primary"><Save className="w-4 h-4" /> حفظ</button>
    </div>
  );
}

/* ---------- SEO: edit seo_json across pages ---------- */
function SEOPanel() {
  const list = useServerFn(wbList);
  const upsert = useServerFn(wbUpsert);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["wb","website_pages"], queryFn: () => list({ data: { table: "website_pages" as any } }) });
  const [editing, setEditing] = useState<any | null>(null);
  const [txt, setTxt] = useState("");
  useEffect(() => { if (editing) setTxt(JSON.stringify(editing.seo_json ?? {}, null, 2)); }, [editing?.id]);
  return (
    <div>
      <h2 className="text-lg font-bold mb-3">SEO — Per-page metadata</h2>
      {editing ? (
        <div className="bg-[var(--color-surface)] rounded-xl p-4 space-y-3">
          <div className="text-xs">Page: <b>{editing.name}</b> ({editing.slug})</div>
          <textarea value={txt} onChange={(e) => setTxt(e.target.value)} rows={16} spellCheck={false}
            className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-xs" />
          <div className="flex gap-2">
            <button onClick={async () => {
              try {
                const parsed = JSON.parse(txt);
                await upsert({ data: { table: "website_pages" as any, values: { id: editing.id, seo_json: parsed } } });
                setEditing(null);
                qc.invalidateQueries({ queryKey: ["wb","website_pages"] });
              } catch (e) { alert((e as Error).message); }
            }} className="btn-primary"><Save className="w-4 h-4" /> حفظ</button>
            <button onClick={() => setEditing(null)} className="btn-outline">إلغاء</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {(q.data ?? []).map((p: any) => (
            <div key={p.id} className="bg-[var(--color-surface)] rounded-lg p-3 flex justify-between items-center">
              <div className="text-sm"><b>{p.name}</b> · <span className="text-[var(--color-ink-soft)]">/{p.slug}</span></div>
              <button onClick={() => setEditing(p)} className="btn-outline text-xs">تعديل SEO</button>
            </div>
          ))}
          {(q.data ?? []).length === 0 && <div className="text-center py-6 text-sm text-[var(--color-ink-soft)]">أضف صفحات أولاً من تبويب Pages.</div>}
        </div>
      )}
    </div>
  );
}

/* ---------- Custom Code (in website_settings) ---------- */
function CustomCodePanel() {
  const list = useServerFn(wbList);
  const upsert = useServerFn(wbUpsert);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["wb","website_settings"], queryFn: () => list({ data: { table: "website_settings" as any } }) });
  const row: any = q.data?.[0];
  const [html, setHtml] = useState(""); const [css, setCss] = useState(""); const [js, setJs] = useState("");
  const [ok, setOk] = useState("");
  useEffect(() => { if (row) { setHtml(row.custom_html ?? ""); setCss(row.custom_css ?? ""); setJs(row.custom_js ?? ""); } }, [row?.id]);
  if (!row) return <div className="text-center py-6 text-sm text-[var(--color-ink-soft)]">جاري التحميل...</div>;
  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--color-ink-soft)]">يُحفظ في قاعدة البيانات فقط. لتنفيذه في الصفحة، يقرأه المُصيّر (Renderer). الكود الديناميكي لا يُحقن تلقائياً في التطبيق الحالي؛ استخدم Custom HTML عبر مكوّن "custom_html".</p>
      {[
        { l: "Custom HTML (global)", v: html, s: setHtml, rows: 6 },
        { l: "Custom CSS (global)", v: css, s: setCss, rows: 8 },
        { l: "Custom JS (global)", v: js, s: setJs, rows: 8 },
      ].map((f) => (
        <label key={f.l} className="block">
          <div className="text-xs font-bold mb-1">{f.l}</div>
          <textarea value={f.v} onChange={(e) => f.s(e.target.value)} rows={f.rows} spellCheck={false}
            className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-xs" />
        </label>
      ))}
      {ok && <div className="text-sm p-2 rounded bg-green-500/10 text-green-500">{ok}</div>}
      <button onClick={async () => {
        setOk("");
        await upsert({ data: { table: "website_settings" as any, values: { id: row.id, custom_html: html, custom_css: css, custom_js: js } } });
        qc.invalidateQueries({ queryKey: ["wb","website_settings"] });
        setOk("تم الحفظ");
      }} className="btn-primary"><Save className="w-4 h-4" /> حفظ</button>
    </div>
  );
}

/* ---------- Import / Export ---------- */
function ImportExportPanel() {
  const exportAll = useServerFn(wbExportAll);
  const importAll = useServerFn(wbImportAll);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const doExport = async () => {
    setBusy(true); setMsg("");
    try {
      const dump = await exportAll({});
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `website-builder-${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
      setMsg("تم التصدير");
    } catch (e) { setMsg((e as Error).message); }
    finally { setBusy(false); }
  };

  const doImport = async (file: File) => {
    setBusy(true); setMsg("");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const snapshot = parsed.data ?? parsed;
      const res = await importAll({ data: { snapshot } });
      setMsg("تم الاستيراد: " + JSON.stringify(res));
    } catch (e) { setMsg((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-6 space-y-4">
      <div className="flex gap-3 flex-wrap">
        <button onClick={doExport} disabled={busy} className="btn-primary">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} تصدير JSON
        </button>
        <label className="btn-outline cursor-pointer">
          <Upload className="w-4 h-4" /> استيراد JSON
          <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
        </label>
      </div>
      {msg && <div className="text-sm p-2 rounded bg-[var(--color-bg)]">{msg}</div>}
    </div>
  );
}

/* ---------- Backups ---------- */
function BackupsPanel() {
  const list = useServerFn(wbList);
  const createBackup = useServerFn(wbCreateBackup);
  const restoreBackup = useServerFn(wbRestoreBackup);
  const del = useServerFn(wbDelete);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["wb","website_backups"], queryFn: () => list({ data: { table: "website_backups" as any } }) });
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <div className="bg-[var(--color-surface)] rounded-xl p-4 mb-4 flex gap-2 items-end">
        <label className="flex-1">
          <div className="text-xs font-bold mb-1">Label (اختياري)</div>
          <input value={label} onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]" />
        </label>
        <button disabled={busy} onClick={async () => {
          setBusy(true);
          try { await createBackup({ data: { label } }); setLabel(""); qc.invalidateQueries({ queryKey: ["wb","website_backups"] }); }
          finally { setBusy(false); }
        }} className="btn-primary">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} نسخة احتياطية</button>
      </div>

      <div className="space-y-2">
        {(q.data ?? []).map((b: any) => (
          <div key={b.id} className="bg-[var(--color-surface)] rounded-lg p-3 flex justify-between items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-bold truncate">{b.label ?? b.id}</div>
              <div className="text-xs text-[var(--color-ink-soft)]">{new Date(b.created_at).toLocaleString("ar")}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={async () => {
                if (!confirm("استعادة هذه النسخة ستستبدل بيانات Website Builder الحالية. متابعة؟")) return;
                await restoreBackup({ data: { id: b.id } });
                alert("تم الاستعادة");
              }} className="btn-outline text-xs">استعادة</button>
              <button onClick={async () => {
                if (!confirm("حذف النسخة؟")) return;
                await del({ data: { table: "website_backups" as any, id: b.id } });
                qc.invalidateQueries({ queryKey: ["wb","website_backups"] });
              }} className="btn-outline text-xs text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
        {(q.data ?? []).length === 0 && <div className="text-center py-6 text-sm text-[var(--color-ink-soft)]">لا توجد نسخ احتياطية بعد.</div>}
      </div>
    </div>
  );
}
