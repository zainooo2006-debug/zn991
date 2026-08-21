import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWarrantyAuth } from "@/lib/warranty-auth";
import { Mail, Phone, Lock, User, Loader2 } from "lucide-react";

export const Route = createFileRoute("/warranty/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const n = s.next;
    return typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? { next: n } : {};
  },
  component: AuthPage,
});

function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/warranty/dashboard";
}

type Mode = "signin" | "signup" | "reset";

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const dest = safeNext(next);
  const { user, loading, refresh } = useWarrantyAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: "err" | "ok"; m: string } | null>(null);

  useEffect(() => {
    if (!loading && user) {
      if (dest.startsWith("/")) window.location.href = dest;
      else navigate({ to: "/warranty/dashboard" });
    }
  }, [user, loading, navigate, dest]);

  const emailFrom = (id: string) => {
    const v = id.trim();
    if (v.includes("@")) return v;
    // Phone → synthetic email
    const digits = v.replace(/\D/g, "");
    return `${digits}@phone.tajalmoluk.local`;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailFrom(identifier),
          password,
        });
        if (error) throw error;
        await refresh();
        navigate({ to: "/warranty/dashboard" });
      } else if (mode === "signup") {
        if (!name.trim() || !phone.trim()) throw new Error("الاسم ورقم الجوال مطلوبان");
        const { error } = await supabase.auth.signUp({
          email: emailFrom(identifier),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/warranty/dashboard`,
            data: { full_name: name.trim(), phone: phone.trim() },
          },
        });
        if (error) throw error;
        setMsg({ t: "ok", m: "تم إنشاء الحساب. يمكنك تسجيل الدخول الآن." });
        setMode("signin");
      } else {
        const email = emailFrom(identifier);
        if (!email.includes("@") || email.endsWith("@phone.tajalmoluk.local")) {
          throw new Error("استخدم بريدك الإلكتروني لاستعادة كلمة المرور");
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/warranty/auth`,
        });
        if (error) throw error;
        setMsg({ t: "ok", m: "تم إرسال رابط الاستعادة إلى بريدك." });
      }
    } catch (err) {
      setMsg({ t: "err", m: err instanceof Error ? err.message : "حدث خطأ" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
          <TabBtn active={mode === "signin"} onClick={() => setMode("signin")}>
            دخول
          </TabBtn>
          <TabBtn active={mode === "signup"} onClick={() => setMode("signup")}>
            حساب جديد
          </TabBtn>
          <TabBtn active={mode === "reset"} onClick={() => setMode("reset")}>
            استعادة
          </TabBtn>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <>
              <Field icon={<User className="w-4 h-4" />} label="الاسم الكامل">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-transparent outline-none"
                  placeholder="اسمك الكامل"
                />
              </Field>
              <Field icon={<Phone className="w-4 h-4" />} label="رقم الجوال">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full bg-transparent outline-none"
                  placeholder="7XXXXXXXX"
                />
              </Field>
            </>
          )}
          <Field icon={<Mail className="w-4 h-4" />} label="البريد أو رقم الجوال">
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full bg-transparent outline-none"
              placeholder="example@mail.com أو 7XXXXXXXX"
            />
          </Field>
          {mode !== "reset" && (
            <Field icon={<Lock className="w-4 h-4" />} label="كلمة المرور">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-transparent outline-none"
                placeholder="••••••••"
              />
            </Field>
          )}

          {msg && (
            <div
              className={`text-sm p-3 rounded-lg ${msg.t === "err" ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}
            >
              {msg.m}
            </div>
          )}

          <button
            disabled={busy}
            type="submit"
            className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "signin"
              ? "تسجيل الدخول"
              : mode === "signup"
                ? "إنشاء حساب"
                : "إرسال رابط الاستعادة"}
          </button>
        </form>

        <p className="text-xs text-slate-500 mt-4 text-center">
          بالمتابعة أنت توافق على شروط استخدام زين.
        </p>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${active ? "bg-white dark:bg-slate-900 shadow" : "text-slate-600 dark:text-slate-300"}`}
    >
      {children}
    </button>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</div>
      <div className="flex items-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 focus-within:border-amber-500">
        <span className="text-slate-400">{icon}</span>
        {children}
      </div>
    </label>
  );
}
