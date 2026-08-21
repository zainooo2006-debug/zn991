import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPushPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env.WEB_PUSH_PUBLIC_KEY ?? "" };
});

export const subscribePush = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        endpoint: z.string().url().max(1000),
        keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }),
      })
      .parse(d),
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
    if (error) {
      console.error("[push] subscribe error:", error);
      throw new Error("تعذّر تفعيل الإشعارات");
    }
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
    if (error) {
      console.error("[push] unsubscribe error:", error);
      throw new Error("تعذّر إلغاء الإشعارات");
    }
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
    if (error) {
      console.error("[push] list error:", error);
      throw new Error("تعذّر تحميل الإشعارات");
    }
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
    if (error) {
      console.error("[push] mark read error:", error);
      throw new Error("تعذّر تحديث الإشعارات");
    }
    return { ok: true };
  });

// قبل التعديل: كانت هذي الدالة مفتوحة بدون أي تحقق هوية، وتثق ببيانات (اسم العميل/رقم الضمان)
// مبعوثة من المتصفح مباشرة — أي حد يقدر يستدعيها من برا ويبعث إشعار مزيف.
// بعد التعديل: لازم تسجيل دخول، ونتحقق من الضمان نفسه في قاعدة البيانات ونتأكد إنه فعلاً
// يخص المستخدم المسجّل قبل لا نرسل أي إشعار — البيانات المعروضة تجي من القاعدة مو من المتصفح.
export const notifyWarrantyActivated = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        warranty_number: z.string().trim().min(1).max(60),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("warranties")
      .select("warranty_number, customers(full_name, user_id)")
      .eq("warranty_number", data.warranty_number)
      .maybeSingle();

    const customer = (row as any)?.customers;
    if (error || !row || !customer || customer.user_id !== context.userId) {
      // ما نفشل عملية المستخدم، بس ما نرسل إشعار لبيانات ما قدرنا نتحقق منها
      return { ok: false };
    }

    const { notifyAdmin } = await import("./push.server");
    await notifyAdmin({
      type: "warranty_activated",
      title: "تفعيل ضمان جديد",
      body: `العميل: ${customer.full_name ?? "عميل"} — رقم الضمان: ${row.warranty_number}`,
      ref_id: row.warranty_number,
    });
    return { ok: true };
  });
