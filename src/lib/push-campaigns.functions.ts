import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertAdmin } from "./admin-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/* ============ Admin: push campaigns (customer notifications) ============ */

export const listPushCampaigns = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { data: rows, error } = await supabaseAdmin
      .from("push_campaigns")
      .select(
        "id, title, body, image_url, link_url, target, sent_count, click_count, created_at, sent_at",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("[push-campaigns] list error:", error);
      throw new Error("تعذّر تحميل الحملات");
    }
    return { items: rows ?? [] };
  });

// Creates the campaign row and sends it to customer devices in the same call —
// matches the admin panel's single "send" action (compose → send).
export const sendPushCampaign = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        title: z.string().trim().min(1).max(120),
        body: z.string().trim().min(1).max(500),
        image_url: z.string().url().max(1000).optional().nullable(),
        link_url: z.string().url().max(1000).optional().nullable(),
        target: z.enum(["all", "vip"]).default("all"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);

    const { data: row, error } = await supabaseAdmin
      .from("push_campaigns")
      .insert({
        title: data.title,
        body: data.body,
        image_url: data.image_url ?? null,
        link_url: data.link_url ?? null,
        target: data.target,
      })
      .select("id")
      .single();
    if (error || !row) {
      console.error("[push-campaigns] insert error:", error);
      throw new Error("تعذّر إنشاء الحملة");
    }

    const { sendCampaignToCustomers } = await import("./push.server");
    const { sentCount } = await sendCampaignToCustomers({
      id: row.id,
      title: data.title,
      body: data.body,
      image_url: data.image_url ?? null,
      link_url: data.link_url ?? null,
      target: data.target,
    });

    return { id: row.id, sentCount };
  });

export const deletePushCampaign = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { error } = await supabaseAdmin.from("push_campaigns").delete().eq("id", data.id);
    if (error) {
      console.error("[push-campaigns] delete error:", error);
      throw new Error("تعذّر حذف الحملة");
    }
    return { ok: true };
  });

// ملاحظة: تتبع النقر على الإشعار مو هنا — الـ Service Worker ما يقدر يستدعي
// TanStack server functions مباشرة، فتتبع النقر يمر عبر مسار HTTP عادي:
// src/routes/api/track-click.ts
