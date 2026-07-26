import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Plus, Pencil, Trash2, Loader2, Save, X, Sparkles, Wand2, Copy, Check } from "lucide-react";
import {
  listKnowledge, saveKnowledge, toggleKnowledge, deleteKnowledge,
  type KnowledgeItem,
} from "@/lib/ai-knowledge.functions";
import { generateProductContent, listProductsForContent } from "@/lib/ai-content.functions";

const TOKEN_KEY = "mycar_admin_token";

export const Route = createFileRoute("/admin_/ai-training")({
  head: () => ({
    meta: [
      { title: "تدريب المساعد الذكي — زين" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AiTrainingPage,
});

function getToken(): string {
  return typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) || "" : "";
}

function AiTrainingPage() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(!!getToken());
  }, []);

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <h1 className="text-xl font-bold mb-2">مطلوب تسجيل الدخول</h1>
          <p className="text-sm text-slate-600 mb-4">
            الرجاء تسجيل الدخول من لوحة الإدارة أولاً.
          </p>
          <Link to="/admin" className="inline-block bg-amber-500 text-white px-6 py-2 rounded-full font-bold">
            الذهاب إلى لوحة الإدارة
          </Link>
        </div>
      </div>
    );
  }

  return <TrainingUI />;
}

type Draft = { id?: string; title: string; content: string; is_active: boolean };
const EMPTY: Draft = { title: "", content: "", is_active: true };

function TrainingUI() {
  const qc = useQueryClient();
  const list = useServerFn(listKnowledge);
  const save = useServerFn(saveKnowledge);
  const toggle = useServerFn(toggleKnowledge);
  const remove = useServerFn(deleteKnowledge);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ai_knowledge_base"],
    queryFn: () => list({ data: { password: getToken() } }),
  });

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function edit(item: KnowledgeItem) {
    setDraft({
      id: item.id,
      title: item.title ?? "",
      content: item.content,
      is_active: item.is_active,
    });
    setMsg(null);
    setErr(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setDraft(EMPTY);
    setMsg(null);
    setErr(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.content.trim()) return;
    setBusy(true); setErr(null); setMsg(null);
    try {
      await save({
        data: {
          password: getToken(),
          id: draft.id ?? null,
          title: draft.title.trim() || null,
          content: draft.content.trim(),
          is_active: draft.is_active,
        },
      });
      setMsg(draft.id ? "تم تحديث المعلومة" : "تمت إضافة المعلومة");
      setDraft(EMPTY);
      await qc.invalidateQueries({ queryKey: ["ai_knowledge_base"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطأ غير متوقع");
    } finally {
      setBusy(false);
    }
  }

  async function onToggle(item: KnowledgeItem) {
    try {
      await toggle({ data: { password: getToken(), id: item.id, is_active: !item.is_active } });
      await qc.invalidateQueries({ queryKey: ["ai_knowledge_base"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطأ");
    }
  }

  async function onDelete(item: KnowledgeItem) {
    if (!confirm("حذف هذه المعلومة نهائياً؟")) return;
    try {
      await remove({ data: { password: getToken(), id: item.id } });
      if (draft.id === item.id) setDraft(EMPTY);
      await qc.invalidateQueries({ queryKey: ["ai_knowledge_base"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطأ");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/admin" className="p-2 rounded-full hover:bg-slate-100" aria-label="عودة">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 text-white flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-base leading-tight">تدريب المساعد الذكي</h1>
            <p className="text-xs text-slate-500">قاعدة معرفة زين أصل الحماية</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <ContentGenerator />

        {/* Form */}
        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">
              {draft.id ? "تعديل معلومة" : "إضافة معلومة جديدة"}
            </h2>
            {draft.id && (
              <button type="button" onClick={reset} className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1">
                <X className="w-4 h-4" /> إلغاء التعديل
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">العنوان (اختياري)</label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="مثال: أوقات العمل / سياسة الضمان / أرقام التواصل"
              maxLength={200}
              className="w-full border-2 border-slate-200 focus:border-amber-500 outline-none rounded-xl px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              المحتوى <span className="text-red-500">*</span>
            </label>
            <textarea
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              placeholder="اكتب هنا معلومات المتجر، الخدمات، سياسة الضمان، طريقة التعامل مع العملاء، العروض، الأسئلة الشائعة، أو أي تعليمات للمساعد..."
              rows={10}
              maxLength={20000}
              required
              className="w-full border-2 border-slate-200 focus:border-amber-500 outline-none rounded-xl px-4 py-3 text-sm leading-relaxed resize-y"
            />
            <p className="text-xs text-slate-400 mt-1">{draft.content.length} / 20000 حرف</p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
              className="w-4 h-4 accent-amber-500"
            />
            مفعّل — سيستخدمها المساعد في المحادثات
          </label>

          {msg && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{msg}</div>}
          {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{err}</div>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !draft.content.trim()}
              className="flex items-center gap-2 bg-gradient-to-l from-amber-500 to-yellow-500 text-white font-bold px-6 py-2.5 rounded-full disabled:opacity-50 hover:shadow-md transition"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : draft.id ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {draft.id ? "حفظ التعديلات" : "إضافة"}
            </button>
          </div>
        </form>

        {/* List */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-lg mb-4">المعلومات الحالية {data && `(${data.length})`}</h2>

          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل...
            </div>
          ) : error ? (
            <div className="text-sm text-red-600">{(error as Error).message}</div>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">لا توجد معلومات محفوظة بعد. ابدأ بإضافة أول معلومة عن المتجر.</p>
          ) : (
            <ul className="space-y-3">
              {data.map((item) => (
                <li key={item.id} className={`border rounded-xl p-4 ${item.is_active ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-70"}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm truncate">
                        {item.title || <span className="text-slate-400 font-normal">بدون عنوان</span>}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        آخر تعديل: {new Date(item.updated_at).toLocaleString("ar")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onToggle(item)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${item.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-200 text-slate-600 hover:bg-slate-300"}`}
                      >
                        {item.is_active ? "مفعّل" : "متوقف"}
                      </button>
                      <button onClick={() => edit(item)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600" aria-label="تعديل">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(item)} className="p-1.5 rounded-full hover:bg-red-50 text-red-600" aria-label="حذف">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-6">{item.content}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

type GenResult = {
  title: string; description: string; features: string[];
  marketing_post: string; hashtags: string[];
};

function ContentGenerator() {
  const gen = useServerFn(generateProductContent);
  const listProds = useServerFn(listProductsForContent);
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [out, setOut] = useState<GenResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: products } = useQuery({
    queryKey: ["ai_content_products"],
    queryFn: () => listProds({ data: { password: getToken() } }),
  });

  function pickProduct(id: string) {
    const p = (products ?? []).find((x) => x.id === id);
    if (!p) return;
    const parts = [
      `المنتج: ${p.name}`,
      p.description ? `الوصف الحالي: ${p.description}` : null,
      p.price != null ? `السعر: ${p.price} ر.ي${p.old_price ? ` (بدلاً من ${p.old_price})` : ""}` : null,
      "المطلوب: توليد منشور تسويقي جذاب ومزايا محدثة.",
    ].filter(Boolean).join("\n");
    setBrief(parts);
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!brief.trim()) return;
    setBusy(true); setErr(null); setOut(null);
    try {
      const r = await gen({ data: { password: getToken(), brief: brief.trim(), kind: "both" } });
      setOut(r as GenResult);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطأ");
    } finally { setBusy(false); }
  }

  async function copy(k: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(k);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* ignore */ }
  }

  return (
    <section id="content-generator" className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Wand2 className="w-5 h-5 text-amber-600" />
        <h2 className="font-bold text-lg">مولّد محتوى المنتجات والتسويق</h2>

      </div>
      <p className="text-sm text-slate-500 mb-3">
        اختر منتجًا موجودًا من المتجر لتعبئة الوصف تلقائيًا، أو اكتب فكرة قصيرة يدويًا.
      </p>

      {products && products.length > 0 && (
        <div className="mb-3">
          <label className="block text-xs font-bold text-slate-600 mb-1">اختر منتجًا من المتجر (اختياري):</label>
          <select
            onChange={(e) => e.target.value && pickProduct(e.target.value)}
            className="w-full border-2 border-slate-200 focus:border-amber-500 outline-none rounded-xl px-3 py-2 text-sm bg-white"
            defaultValue=""
          >
            <option value="">— بدون —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.price != null ? ` — ${p.price} ر.ي` : ""}</option>
            ))}
          </select>
        </div>
      )}


      <form onSubmit={run} className="space-y-3">
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="مثال: عازل حراري نانو سيراميك 70% للسيارات المرسيدس، يقاوم الحرارة ويحمي من الأشعة فوق البنفسجية"
          rows={3}
          maxLength={2000}
          className="w-full border-2 border-slate-200 focus:border-amber-500 outline-none rounded-xl px-4 py-3 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !brief.trim()}
          className="flex items-center gap-2 bg-gradient-to-l from-amber-500 to-yellow-500 text-white font-bold px-6 py-2.5 rounded-full disabled:opacity-50 hover:shadow-md transition"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {busy ? "جارٍ التوليد..." : "توليد المحتوى"}
        </button>
      </form>

      {err && <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{err}</div>}

      {out && (
        <div className="mt-5 space-y-4">
          {(
            [
              { k: "title", label: "العنوان", value: out.title, multi: false },
              { k: "description", label: "الوصف", value: out.description, multi: true },
              { k: "features", label: "المزايا", value: (out.features || []).map((f, i) => `${i + 1}. ${f}`).join("\n"), multi: true },
              { k: "marketing_post", label: "منشور تسويقي", value: out.marketing_post, multi: true },
              { k: "hashtags", label: "الهاشتاقات", value: (out.hashtags || []).join(" "), multi: false },
            ] as const
          ).map((f) => f.value ? (
            <div key={f.k} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-600">{f.label}</span>
                <button
                  onClick={() => copy(f.k, f.value)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-white border border-slate-200 hover:bg-slate-100"
                >
                  {copied === f.k ? <><Check className="w-3 h-3 text-green-600" /> تم النسخ</> : <><Copy className="w-3 h-3" /> نسخ</>}
                </button>
              </div>
              {f.multi ? (
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{f.value}</p>
              ) : (
                <p className="text-sm text-slate-800 font-medium">{f.value}</p>
              )}
            </div>
          ) : null)}
        </div>
      )}
    </section>
  );
}

