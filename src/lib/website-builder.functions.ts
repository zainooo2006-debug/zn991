import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TABLES = [
  "website_pages",
  "website_components",
  "website_layouts",
  "website_themes",
  "website_templates",
  "website_media",
  "website_menus",
  "website_settings",
  "website_backups",
] as const;
type WBTable = (typeof TABLES)[number];

async function assertAdmin(supabase: any, userId: string) {
  const [{ data: a }, { data: s }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
  ]);
  if (!a && !s) throw new Error("Admin only");
}

/** Public: list all rows of a builder table (used by dynamic renderer & admin) */
export const wbList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { table: WBTable; orderBy?: string; ascending?: boolean }) => {
    if (!TABLES.includes(i.table)) throw new Error("Bad table");
    return i;
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = supabaseAdmin.from(data.table).select("*")
      .order(data.orderBy ?? "created_at", { ascending: data.ascending ?? false });
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const wbGet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { table: WBTable; id: string }) => {
    if (!TABLES.includes(i.table)) throw new Error("Bad table");
    return i;
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from(data.table).select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const wbUpsert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { table: WBTable; values: Record<string, unknown> }) => {
    if (!TABLES.includes(i.table)) throw new Error("Bad table");
    return i;
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const values: any = { ...data.values };
    // Auto-clean: drop empty id so DB generates one
    if (!values.id) delete values.id;
    const { data: row, error } = await supabaseAdmin.from(data.table).upsert(values).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const wbDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { table: WBTable; id: string }) => {
    if (!TABLES.includes(i.table)) throw new Error("Bad table");
    return i;
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from(data.table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Snapshot all builder tables into website_backups */
export const wbCreateBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { label?: string }) => i)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const snapshot: Record<string, unknown> = {};
    for (const t of TABLES.filter((x) => x !== "website_backups")) {
      const { data: rows, error } = await supabaseAdmin.from(t).select("*");
      if (error) throw new Error(error.message);
      snapshot[t] = rows ?? [];
    }
    const { data: row, error } = await supabaseAdmin.from("website_backups").insert({
      label: data.label ?? new Date().toISOString(),
      snapshot_json: snapshot,
    } as never).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

/** Restore a backup — replaces contents of each table in the snapshot */
export const wbRestoreBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin: any = supabaseAdmin;
    const { data: b, error: e1 } = await admin.from("website_backups").select("snapshot_json").eq("id", data.id).maybeSingle();
    if (e1 || !b) throw new Error(e1?.message ?? "Backup not found");
    const snap = b.snapshot_json as Record<string, any[]>;
    for (const t of Object.keys(snap)) {
      if (!TABLES.includes(t as WBTable) || t === "website_backups") continue;
      await admin.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (Array.isArray(snap[t]) && snap[t].length > 0) {
        const { error } = await admin.from(t).insert(snap[t]);
        if (error) throw new Error(`${t}: ${error.message}`);
      }
    }
    return { ok: true };
  });

/** Export snapshot without saving — for JSON download */
export const wbExportAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ exported_at: string; data: Record<string, any[]> }> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin: any = supabaseAdmin;
    const snapshot: Record<string, any[]> = {};
    for (const t of TABLES.filter((x) => x !== "website_backups")) {
      const { data: rows, error } = await admin.from(t).select("*");
      if (error) throw new Error(error.message);
      snapshot[t] = rows ?? [];
    }
    return { exported_at: new Date().toISOString(), data: snapshot };
  });

/** Import: merge JSON into tables (upsert by id) */
export const wbImportAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { snapshot: Record<string, any[]> }) => i)
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const results: Record<string, number> = {};
    for (const [t, rows] of Object.entries(data.snapshot)) {
      if (!TABLES.includes(t as WBTable) || t === "website_backups") continue;
      if (!Array.isArray(rows) || rows.length === 0) { results[t] = 0; continue; }
      const { error } = await supabaseAdmin.from(t).upsert(rows as never);
      if (error) throw new Error(`${t}: ${error.message}`);
      results[t] = rows.length;
    }
    return results;
  });
