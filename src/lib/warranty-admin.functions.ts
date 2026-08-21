import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertStaff(supabase: any, userId: string) {
  const [{ data: isAdmin }, { data: isSuper }, { data: isManager }, { data: isStaff }] =
    await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "manager" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "branch_staff" }),
    ]);
  const admin = !!isAdmin || !!isSuper;
  const staff = admin || !!isManager || !!isStaff;
  if (!staff) throw new Error("Forbidden");

  // تقييد بالفرع لموظف الفرع (branch_staff) فقط. الأدمن والمدير يبقون بدون تقييد كالسابق.
  let branchId: string | null = null;
  if (!admin && !isManager && isStaff) {
    const { data } = await supabase.rpc("get_user_branch", { _user_id: userId });
    branchId = data ?? null;
  }
  return { isAdmin: admin, isStaff: staff, branchId };
}

export const adminListWarranties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { branchId } = await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("warranties")
      .select(
        "id, warranty_number, activation_date, expiry_date, status, vin, branch_id, customers(full_name, phone), warranty_brands(name), film_types(name), branches(name)",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (branchId) query = query.eq("branch_id", branchId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminListCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { branchId } = await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("customers")
      .select("id, full_name, phone, email, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    // جدول customers ما فيه branch_id مباشر، فنحدد عملاء فرعه عن طريق ضماناتهم في هذا الفرع فقط.
    if (branchId) {
      const { data: branchWarranties, error: bwErr } = await supabaseAdmin
        .from("warranties")
        .select("customer_id")
        .eq("branch_id", branchId);
      if (bwErr) throw new Error(bwErr.message);
      const ids = Array.from(
        new Set((branchWarranties ?? []).map((w: any) => w.customer_id).filter(Boolean)),
      );
      if (ids.length === 0) return [];
      query = query.in("id", ids as string[]);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminOverviewStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { branchId } = await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = new Date().toISOString().slice(0, 10);

    let wTotalQ = supabaseAdmin.from("warranties").select("id", { count: "exact", head: true });
    let wActiveQ = supabaseAdmin
      .from("warranties")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("expiry_date", today);
    let wExpiredQ = supabaseAdmin
      .from("warranties")
      .select("id", { count: "exact", head: true })
      .lt("expiry_date", today);
    let wLatestQ = supabaseAdmin
      .from("warranties")
      .select("id, warranty_number, created_at, status, expiry_date")
      .order("created_at", { ascending: false })
      .limit(10);

    if (branchId) {
      wTotalQ = wTotalQ.eq("branch_id", branchId);
      wActiveQ = wActiveQ.eq("branch_id", branchId);
      wExpiredQ = wExpiredQ.eq("branch_id", branchId);
      wLatestQ = wLatestQ.eq("branch_id", branchId);
    }

    const [c, w, wa, we, l] = await Promise.all([
      supabaseAdmin.from("customers").select("id", { count: "exact", head: true }),
      wTotalQ,
      wActiveQ,
      wExpiredQ,
      wLatestQ,
    ]);
    return {
      stats: {
        customers: c.count ?? 0,
        warranties: w.count ?? 0,
        active: wa.count ?? 0,
        expired: we.count ?? 0,
      },
      latest: l.data ?? [],
    };
  });

export const adminListSimple = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { table: "warranty_brands" | "film_types" | "branches" }) => {
    if (!["warranty_brands", "film_types", "branches"].includes(input.table))
      throw new Error("Bad table");
    return input;
  })
  .handler(async ({ context, data }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from(data.table)
      .select("*")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

type MutOp =
  | { op: "warranty_approve"; id: string }
  | { op: "warranty_cancel"; id: string }
  | { op: "warranty_extend"; id: string; expiry_date: string }
  | { op: "warranty_delete"; id: string }
  | { op: "customer_insert"; full_name: string; phone: string }
  | { op: "customer_update"; id: string; full_name: string; phone: string }
  | { op: "customer_delete"; id: string }
  | {
      op: "simple_insert";
      table: "warranty_brands" | "film_types" | "branches";
      values: Record<string, unknown>;
    }
  | {
      op: "simple_update";
      table: "warranty_brands" | "film_types" | "branches";
      id: string;
      values: Record<string, unknown>;
    }
  | {
      op: "simple_toggle";
      table: "warranty_brands" | "film_types" | "branches";
      id: string;
      is_active: boolean;
    }
  | { op: "simple_delete"; table: "warranty_brands" | "film_types" | "branches"; id: string };

export const adminMutate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: MutOp) => input)
  .handler(async ({ context, data }) => {
    const { isAdmin, branchId } = await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const allowedTables = ["warranty_brands", "film_types", "branches"] as const;

    // موظف الفرع (branch_staff) ما يقدر يعدّل ضمان أو عميل إلا لو مرتبط بفرعه هو.
    async function assertWarrantyInScope(id: string) {
      if (!branchId) return;
      const { data: row, error } = await supabaseAdmin
        .from("warranties")
        .select("branch_id")
        .eq("id", id)
        .maybeSingle();
      if (error || !row || (row as any).branch_id !== branchId)
        throw new Error("Forbidden: warranty outside your branch");
    }
    async function assertCustomerInScope(id: string) {
      if (!branchId) return;
      const { data: rows, error } = await supabaseAdmin
        .from("warranties")
        .select("id")
        .eq("customer_id", id)
        .eq("branch_id", branchId)
        .limit(1);
      if (error || !rows || rows.length === 0)
        throw new Error("Forbidden: customer outside your branch");
    }

    switch (data.op) {
      case "warranty_approve":
        await assertWarrantyInScope(data.id);
        return (
          (await supabaseAdmin.from("warranties").update({ status: "active" }).eq("id", data.id))
            .error?.message ?? null
        );
      case "warranty_cancel":
        await assertWarrantyInScope(data.id);
        return (
          (await supabaseAdmin.from("warranties").update({ status: "cancelled" }).eq("id", data.id))
            .error?.message ?? null
        );
      case "warranty_extend":
        await assertWarrantyInScope(data.id);
        return (
          (
            await supabaseAdmin
              .from("warranties")
              .update({ expiry_date: data.expiry_date, status: "active" })
              .eq("id", data.id)
          ).error?.message ?? null
        );
      case "warranty_delete":
        if (!isAdmin) throw new Error("Admin only");
        return (
          (await supabaseAdmin.from("warranties").delete().eq("id", data.id)).error?.message ?? null
        );
      case "customer_insert":
        return (
          (
            await supabaseAdmin
              .from("customers")
              .insert({ full_name: data.full_name, phone: data.phone })
          ).error?.message ?? null
        );
      case "customer_update":
        await assertCustomerInScope(data.id);
        return (
          (
            await supabaseAdmin
              .from("customers")
              .update({ full_name: data.full_name, phone: data.phone })
              .eq("id", data.id)
          ).error?.message ?? null
        );
      case "customer_delete":
        if (!isAdmin) throw new Error("Admin only");
        return (
          (await supabaseAdmin.from("customers").delete().eq("id", data.id)).error?.message ?? null
        );
      case "simple_insert":
        if (!allowedTables.includes(data.table)) throw new Error("Bad table");
        return (
          (await supabaseAdmin.from(data.table).insert(data.values as never)).error?.message ?? null
        );
      case "simple_update":
        if (!allowedTables.includes(data.table)) throw new Error("Bad table");
        return (
          (
            await supabaseAdmin
              .from(data.table)
              .update(data.values as never)
              .eq("id", data.id)
          ).error?.message ?? null
        );
      case "simple_toggle":
        if (!allowedTables.includes(data.table)) throw new Error("Bad table");
        return (
          (
            await supabaseAdmin
              .from(data.table)
              .update({ is_active: data.is_active } as never)
              .eq("id", data.id)
          ).error?.message ?? null
        );
      case "simple_delete":
        if (!isAdmin) throw new Error("Admin only");
        if (!allowedTables.includes(data.table)) throw new Error("Bad table");
        return (
          (await supabaseAdmin.from(data.table).delete().eq("id", data.id)).error?.message ?? null
        );
    }
  });
