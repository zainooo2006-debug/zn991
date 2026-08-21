import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AppRole = "admin" | "super_admin" | "manager" | "branch_staff" | "customer";
const ALL_ROLES: AppRole[] = ["admin", "super_admin", "manager", "branch_staff", "customer"];

async function assertAdmin(supabase: any, userId: string) {
  const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
  ]);
  if (!isAdmin && !isSuper) throw new Error("Admin only");
}

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: usersData, error: uerr } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 200,
    });
    if (uerr) throw new Error(uerr.message);
    const { data: roles, error: rerr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, branch_id");
    if (rerr) throw new Error(rerr.message);
    const rolesByUser = new Map<string, { role: AppRole; branch_id: string | null }[]>();
    for (const r of roles ?? []) {
      const arr = rolesByUser.get(r.user_id as string) ?? [];
      arr.push({ role: r.role as AppRole, branch_id: (r as any).branch_id ?? null });
      rolesByUser.set(r.user_id as string, arr);
    }
    return (usersData.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      roles: rolesByUser.get(u.id) ?? [],
    }));
  });

export const adminCreateStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { email: string; password: string; role: AppRole; branch_id?: string | null }) => {
      if (!input.email || !input.password) throw new Error("البريد وكلمة المرور مطلوبة");
      if (input.password.length < 6) throw new Error("كلمة المرور قصيرة");
      if (!ALL_ROLES.includes(input.role)) throw new Error("دور غير صالح");
      return input;
    },
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "تعذر إنشاء المستخدم");
    const { error: rerr } = await supabaseAdmin.from("user_roles").insert({
      user_id: created.user.id,
      role: data.role,
      branch_id: data.branch_id ?? null,
    } as never);
    if (rerr) throw new Error(rerr.message);
    return { id: created.user.id, email: created.user.email };
  });

export const adminGrantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string; role: AppRole; branch_id?: string | null }) => {
    if (!input.user_id) throw new Error("user_id required");
    if (!ALL_ROLES.includes(input.role)) throw new Error("دور غير صالح");
    return input;
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles").upsert(
      {
        user_id: data.user_id,
        role: data.role,
        branch_id: data.branch_id ?? null,
      } as never,
      { onConflict: "user_id,role" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRevokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string; role: AppRole }) => input)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.user_id === context.userId && (data.role === "admin" || data.role === "super_admin")) {
      throw new Error("لا يمكنك إزالة دور الأدمن من حسابك");
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", data.role as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string }) => input)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("لا يمكنك حذف حسابك");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
