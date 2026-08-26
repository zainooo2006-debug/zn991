import { createFileRoute } from "@tanstack/react-router";

// Called by public/sw.js when a customer taps a campaign notification.
// Plain JSON POST (not a TanStack server function) because the service
// worker fetches this directly and can't use the RPC client wrapper.
export const Route = createFileRoute("/api/track-click")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { campaign_id?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const campaignId = body.campaign_id;
        if (!campaignId || typeof campaignId !== "string") {
          return new Response("Missing campaign_id", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await supabaseAdmin
          .from("push_campaigns")
          .select("click_count")
          .eq("id", campaignId)
          .maybeSingle();
        if (!row) return new Response(JSON.stringify({ ok: false }), { status: 200 });

        const { error } = await supabaseAdmin
          .from("push_campaigns")
          .update({ click_count: (row.click_count ?? 0) + 1 })
          .eq("id", campaignId);
        if (error) console.error("[track-click] update error:", error);

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
