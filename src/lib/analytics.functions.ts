import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const analyticsEventSchema = z.object({
  event_name: z.string().min(1).max(100),
  visitor_id: z.string().max(100).optional().nullable(),
  session_id: z.string().max(100).optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
  page: z.string().max(500).optional().nullable(),
  product_id: z.string().uuid().optional().nullable(),
  device_type: z.enum(["android", "ios", "desktop", "unknown"]).optional().default("unknown"),
  source: z.string().max(100).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const trackAnalyticsEvent = createServerFn({ method: "POST" })
  .inputValidator((d) => analyticsEventSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("analytics_events").insert({
      event_name: data.event_name,
      visitor_id: data.visitor_id ?? null,
      session_id: data.session_id ?? null,
      user_id: data.user_id ?? null,
      page: data.page ?? null,
      product_id: data.product_id ?? null,
      device_type: data.device_type ?? "unknown",
      source: data.source ?? null,
      metadata: data.metadata ?? {},
    });

    if (error) {
      console.error("[analytics] track event error:", error);
      throw new Error("تعذر تسجيل بيانات التحليلات");
    }

    return { ok: true };
  });
