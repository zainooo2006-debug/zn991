import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AuthDetails = {
  client?: { name?: string } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
  scope?: string | null;
} | null;

type SupabaseOAuth = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthDetails; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: AuthDetails; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: AuthDetails; error: { message: string } | null }>;
};

function oauth(): SupabaseOAuth {
  return (supabase.auth as unknown as { oauth: SupabaseOAuth }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/warranty/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="max-w-md mx-auto p-6 text-center">
      <h1 className="text-lg font-bold mb-2">تعذّر تحميل طلب المصادقة</h1>
      <p className="text-sm text-slate-600">{String((error as Error)?.message ?? error)}</p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "التطبيق الخارجي";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("لم يُرجع خادم المصادقة رابط إعادة توجيه.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <div
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow p-6 space-y-4"
        dir="rtl"
      >
        <h1 className="text-xl font-bold">ربط {clientName} بحسابك في زين</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          سيتمكّن {clientName} من استدعاء أدوات هذا التطبيق نيابةً عنك أثناء تسجيل دخولك. لن يتجاوز
          ذلك صلاحيات التطبيق أو سياسات الحماية.
        </p>
        {error && (
          <div
            role="alert"
            className="text-sm p-3 rounded-lg bg-red-50 text-red-700 border border-red-200"
          >
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold disabled:opacity-60"
          >
            موافقة
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 font-medium disabled:opacity-60"
          >
            رفض
          </button>
        </div>
      </div>
    </main>
  );
}
