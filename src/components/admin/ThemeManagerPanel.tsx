import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";
import { getSiteTheme, saveTheme, restoreDefaultTheme } from "@/lib/theme.functions";

const TOKEN_KEY = "mycar_admin_token";

const SAMPLE_JSON = `{
  "theme": {
    "colors": {
      "gold": "#c9a24a",
      "ink": "#0a0a0a"
    },
    "fonts": {},
    "spacing": {}
  },
  "layout": {
    "header": {},
    "sections": [],
    "footer": {}
  },
  "components": {
    "buttons": {},
    "cards": {}
  }
}`;

export function ThemeManagerPanel() {
  const fetchTheme = useServerFn(getSiteTheme);
  const doSave = useServerFn(saveTheme);
  const doRestore = useServerFn(restoreDefaultTheme);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-site-theme"],
    queryFn: () => fetchTheme(),
  });

  const [text, setText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.active_theme_json) {
      setText(JSON.stringify(data.active_theme_json, null, 2));
    } else if (!isLoading) {
      setText(SAMPLE_JSON);
    }
  }, [data, isLoading]);

  const validate = (raw: string): unknown | null => {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setJsonError("يجب أن يكون كائن JSON صالح");
        return null;
      }
      setJsonError(null);
      return parsed;
    } catch (e) {
      setJsonError((e as Error).message);
      return null;
    }
  };

  const onChange = (v: string) => {
    setText(v);
    if (v.trim()) validate(v);
    else setJsonError(null);
  };

  const onSave = async () => {
    const parsed = validate(text);
    if (!parsed) return;
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) { setMsg({ type: "err", text: "الجلسة منتهية" }); return; }
    setBusy(true); setMsg(null);
    try {
      await doSave({ data: { password: token, active_theme_json: parsed as Record<string, unknown> } });
      await qc.invalidateQueries({ queryKey: ["admin-site-theme"] });
      await qc.invalidateQueries({ queryKey: ["site-theme"] });
      setMsg({ type: "ok", text: "تم حفظ وتطبيق المظهر" });
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) { setMsg({ type: "err", text: "الجلسة منتهية" }); return; }
    if (!confirm("استعادة المظهر الافتراضي؟ سيتم استبدال المظهر الحالي.")) return;
    setBusy(true); setMsg(null);
    try {
      const res = await doRestore({ data: { password: token } });
      if (res.default_theme_json) {
        setText(JSON.stringify(res.default_theme_json, null, 2));
      }
      await qc.invalidateQueries({ queryKey: ["admin-site-theme"] });
      await qc.invalidateQueries({ queryKey: ["site-theme"] });
      setMsg({ type: "ok", text: "تمت استعادة المظهر الافتراضي" });
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">إدارة المظهر (Theme Manager)</h2>
          <p className="text-sm text-[var(--color-ink-soft)]">
            الصق إعدادات JSON للألوان والخطوط والتخطيط، ثم احفظ لتطبيقها فوراً.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onRestore} disabled={busy} className="btn-outline">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            استعادة الافتراضي
          </button>
          <button onClick={onSave} disabled={busy || !!jsonError} className="btn-gold">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ وتطبيق المظهر
          </button>
        </div>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
          msg.type === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
        }`}>
          {msg.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {jsonError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-amber-50 text-amber-900">
          <AlertCircle className="w-4 h-4" /> JSON غير صالح: {jsonError}
        </div>
      )}

      <textarea
        dir="ltr"
        spellCheck={false}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[520px] font-mono text-sm p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]"
        placeholder={SAMPLE_JSON}
      />

      <p className="text-xs text-[var(--color-ink-soft)]">
        البنية المدعومة: <code>theme.colors</code>, <code>theme.fonts</code>, <code>theme.spacing</code>,
        <code> layout</code>, <code>components</code>. الألوان تُطبّق كمتغيرات CSS
        (<code>--color-*</code>)، الخطوط كـ <code>--font-*</code>، والمسافات كـ <code>--space-*</code>.
      </p>
    </div>
  );
}
