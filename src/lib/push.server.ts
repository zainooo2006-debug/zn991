import { createHmac, timingSafeEqual } from "crypto";
import { buildPushPayload } from "@block65/webcrypto-web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/* ============ Admin token verification (same scheme as admin.functions.ts) ============ */

function getSessionSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Server misconfigured: no session secret available");
  return s;
}

export function assertAdminToken(token: string | undefined | null): void {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    throw new Error("غير مصرح");
  }
  const [body, sig] = token.split(".");
  const expected = createHmac("sha256", getSessionSecret()).update(body).digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("غير مصرح");
  }
  let payload: { exp?: number };
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new Error("غير مصرح");
  }
  if (!payload.exp || Date.now() > payload.exp) {
    throw new Error("انتهت الجلسة، الرجاء تسجيل الدخول مجدداً");
  }
}

/* ============ Web push sending ============ */

function vapid() {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_CONTACT_EMAIL || "mailto:info@zaincare.com";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export type NotifyInput = {
  type: string;
  title: string;
  body: string;
  ref_id?: string | null;
};

type Subscription = { id: string; endpoint: string; p256dh: string; auth: string };
type PushDataPayload = Record<string, unknown>;

/**
 * Shared low-level sender: pushes the same payload to a list of subscriptions
 * and returns which endpoints came back dead (404/410) so the caller can
 * clean them up. Used by both admin alerts and customer campaigns.
 */
async function sendToSubscriptions(
  subs: Subscription[],
  dataPayload: PushDataPayload,
  keys: NonNullable<ReturnType<typeof vapid>>,
): Promise<{ sentCount: number; stale: string[] }> {
  const stale: string[] = [];
  let sentCount = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        const payload = await buildPushPayload(
          { data: dataPayload as never, options: { ttl: 3600 } },
          { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } },
          keys,
        );
        const res = await fetch(s.endpoint, {
          method: "POST",
          headers: payload.headers,
          body: payload.body as unknown as BodyInit,
        });
        if (res.status === 404 || res.status === 410) {
          stale.push(s.endpoint);
        } else if (!res.ok) {
          console.error("[push] send failed:", res.status, await res.text().catch(() => ""));
        } else {
          sentCount++;
        }
      } catch (e) {
        console.error("[push] send error:", e);
      }
    }),
  );

  return { sentCount, stale };
}

/**
 * Internal only — never exposed as a server function.
 * Records the notification then pushes it to every registered admin browser.
 * Only targets subscriber_type = 'admin' — customer devices are never included.
 */
export async function notifyAdmin(input: NotifyInput): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("notifications").insert({
      type: input.type,
      title: input.title,
      body: input.body,
      ref_id: input.ref_id ?? null,
    });
    if (error) console.error("[push] insert notification error:", error);
  } catch (e) {
    console.error("[push] insert notification failed:", e);
  }

  const keys = vapid();
  if (!keys) return;

  let subs: Subscription[] = [];
  try {
    const { data, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("subscriber_type", "admin");
    if (error) {
      console.error("[push] list subs error:", error);
      return;
    }
    subs = data ?? [];
  } catch (e) {
    console.error("[push] list subs failed:", e);
    return;
  }

  const { stale } = await sendToSubscriptions(
    subs,
    { title: input.title, body: input.body, type: input.type, ref_id: input.ref_id ?? null },
    keys,
  );

  if (stale.length) {
    await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
  }
}

export type CampaignInput = {
  id: string;
  title: string;
  body: string;
  image_url?: string | null;
  link_url?: string | null;
  target: "all" | "vip";
};

/**
 * Internal only — never exposed as a server function.
 * Sends a campaign to customer devices (subscriber_type = 'customer') and
 * updates the campaign's sent_count/sent_at. Admin devices are never
 * included. VIP targeting is a placeholder for now (sends to all customer
 * devices) until customer segmentation is built.
 */
export async function sendCampaignToCustomers(
  campaign: CampaignInput,
): Promise<{ sentCount: number }> {
  const keys = vapid();
  if (!keys) return { sentCount: 0 };

  let subs: Subscription[] = [];
  try {
    const { data, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("subscriber_type", "customer");
    if (error) {
      console.error("[push] list customer subs error:", error);
      return { sentCount: 0 };
    }
    subs = data ?? [];
  } catch (e) {
    console.error("[push] list customer subs failed:", e);
    return { sentCount: 0 };
  }

  const { sentCount, stale } = await sendToSubscriptions(
    subs,
    {
      title: campaign.title,
      body: campaign.body,
      type: "campaign",
      campaign_id: campaign.id,
      image_url: campaign.image_url ?? null,
      link_url: campaign.link_url ?? null,
    },
    keys,
  );

  if (stale.length) {
    await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
  }

  const { error: updateError } = await supabaseAdmin
    .from("push_campaigns")
    .update({ sent_count: sentCount, sent_at: new Date().toISOString() })
    .eq("id", campaign.id);
  if (updateError) console.error("[push] campaign update error:", updateError);

  return { sentCount };
}
