import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPushPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env.WEB_PUSH_PUBLIC_KEY ?? "" };
});

export const subscribePush = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      password: z.string(),
      endpoint: z.string().url().max(1000),
      keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { assertAdminToken } = await import("./push.server");
    assertAdminToken(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        { endpoint: data.endpoint, p256dh: data.keys.p256dh, auth: data.keys.auth },
        { onConflict: "endpoint" },
      );
    if (error) { console.error("[push] subscribe error:", error); throw new Error("تعذّر تفعيل الإشعارات"); }
    return { ok: true };
  });

export const unsubscribePush = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ password: z.string(), endpoint: z.string().url().max(1000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { assertAdminToken } = await import("./push.server");
    assertAdminToken(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint);
    if (error) { console.error("[push] unsubscribe error:", error); throw new Error("تعذّر إلغاء الإشعارات"); }
    return { ok: true };
  });

export const listNotifications = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { assertAdminToken } = await import("./push.server");
    assertAdminToken(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("notifications")
      .select("id, type, title, body, ref_id, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) { console.error("[push] list error:", error); throw new Error("تعذّر تحميل الإشعارات"); }
    const items = rows ?? [];
    return { items, unread: items.filter((r) => !r.is_read).length };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ password: z.string(), id: z.string().uuid().optional().nullable() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { assertAdminToken } = await import("./push.server");
    assertAdminToken(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("notifications").update({ is_read: true }).eq("is_read", false);
    if (data.id) q = q.eq("id", data.id);
    const { error } = await q;
    if (error) { console.error("[push] mark read error:", error); throw new Error("تعذّر تحديث الإشعارات"); }
    return { ok: true };
  });

export const notifyWarrantyActivated = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      warranty_number: z.string().trim().min(1).max(60),
      customer_name: z.string().trim().min(1).max(120),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { notifyAdmin } = await import("./push.server");
    await notifyAdmin({
      type: "warranty_activated",
      title: "تفعيل ضمان جديد",
      body: `العميل: ${data.customer_name} — رقم الضمان: ${data.warranty_number}`,
      ref_id: data.warranty_number,
    });
    return { ok: true };
  });
