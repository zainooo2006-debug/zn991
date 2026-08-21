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

/**
 * Internal only — never exposed as a server function.
 * Records the notification then pushes it to every registered admin browser.
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

  let subs: Array<{ id: string; endpoint: string; p256dh: string; auth: string }> = [];
  try {
    const { data, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth");
    if (error) {
      console.error("[push] list subs error:", error);
      return;
    }
    subs = data ?? [];
  } catch (e) {
    console.error("[push] list subs failed:", e);
    return;
  }

  const stale: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        const payload = await buildPushPayload(
          {
            data: {
              title: input.title,
              body: input.body,
              type: input.type,
              ref_id: input.ref_id ?? null,
            },
            options: { ttl: 3600 },
          },
          { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } },
          keys,
        );
        const res = await fetch(s.endpoint, {
          method: "POST",
          headers: payload.headers,
          body: payload.body as unknown as BodyInit,
        });
        if (res.status === 404 || res.status === 410) stale.push(s.endpoint);
        else if (!res.ok)
          console.error("[push] send failed:", res.status, await res.text().catch(() => ""));
      } catch (e) {
        console.error("[push] send error:", e);
      }
    }),
  );

  if (stale.length) {
    await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
  }
}
