import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";

function getSessionSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Server misconfigured");
  return s;
}

function assertAdmin(token: string | undefined | null) {
  if (!token || typeof token !== "string" || !token.includes(".")) throw new Error("غير مصرح");
  const [body, sig] = token.split(".");
  const expected = createHmac("sha256", getSessionSecret()).update(body).digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("غير مصرح");
  let payload: { exp?: number };
  try { payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); }
  catch { throw new Error("غير مصرح"); }
  if (!payload.exp || Date.now() > payload.exp) throw new Error("انتهت الجلسة");
}

const Input = z.object({
  password: z.string(),
  brief: z.string().trim().min(3).max(2000),
  kind: z.enum(["product", "marketing", "both"]).default("both"),
});

export const generateProductContent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const sys = `أنت خبير تسويق لمتجر "زين أصل الحماية" في اليمن (تعديل السيارات، الإكسسوارات، العزل الحراري، النانو، PPF). اكتب بلهجة يمنية احترافية جذابة.

أعد ردك بصيغة JSON فقط بدون أي شرح إضافي، بهذا الشكل بالضبط:
{
  "title": "عنوان تسويقي قصير (بحد أقصى 60 حرفاً)",
  "description": "وصف احترافي للمنتج (100-250 كلمة، فقرات قصيرة)",
  "features": ["ميزة 1", "ميزة 2", "ميزة 3", "ميزة 4", "ميزة 5"],
  "marketing_post": "منشور جاهز للنشر على واتساب/سوشيال ميديا مع إيموجي مناسبة (60-120 كلمة)",
  "hashtags": ["#وسم1", "#وسم2", "#وسم3", "#وسم4"]
}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `اكتب محتوى تسويقي لهذا المنتج/الخدمة:\n\n${data.brief}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("تم تجاوز الحد المسموح، حاول لاحقاً");
      if (res.status === 402) throw new Error("انتهى رصيد الذكاء الاصطناعي");
      throw new Error(`AI error [${res.status}]: ${body.slice(0, 200)}`);
    }

    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: {
      title?: string; description?: string; features?: string[];
      marketing_post?: string; hashtags?: string[];
    } = {};
    try { parsed = JSON.parse(text); } catch { parsed = {}; }
    return {
      title: parsed.title ?? "",
      description: parsed.description ?? "",
      features: Array.isArray(parsed.features) ? parsed.features : [],
      marketing_post: parsed.marketing_post ?? "",
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    };
  });
