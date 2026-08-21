import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "super_admin" | "manager" | "branch_staff" | "customer";

type Ctx = {
  session: Session | null;
  user: User | null;
  roles: Role[];
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const WAuth = createContext<Ctx | null>(null);

export function WarrantyAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = async (uid: string | undefined) => {
    if (!uid) {
      setRoles([]);
      return;
    }
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data ?? []).map((r: { role: Role }) => r.role));
  };

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    await loadRoles(data.session?.user?.id);
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await loadRoles(data.session?.user?.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      // Defer to avoid deadlock inside callback
      setTimeout(() => loadRoles(s?.user?.id), 0);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: Ctx = {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    isAdmin: roles.includes("admin") || roles.includes("super_admin"),
    isStaff: roles.some((r) => ["admin", "super_admin", "manager", "branch_staff"].includes(r)),
    refresh,
    signOut: async () => {
      await supabase.auth.signOut();
      setRoles([]);
    },
  };
  return <WAuth.Provider value={value}>{children}</WAuth.Provider>;
}

export function useWarrantyAuth() {
  const ctx = useContext(WAuth);
  if (!ctx) throw new Error("useWarrantyAuth must be used within WarrantyAuthProvider");
  return ctx;
}
