import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertAdmin } from "./admin-auth.server";

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

    const sys = `أنت كاتب محتوى تسويقي لبراند "زين أصل الحماية" في اليمن (نانو سيراميك، PPF، عزل حراري، تنجيد، إكسسوارات فاخرة للسيارات).

اكتب بالقواعد التالية:
1. الدقة أولاً — اعتمد فقط على المعلومات المُعطاة عن المنتج، بدون اختلاق مواصفات.
2. طابع فخامة هادئ لا صراخ: ممنوع النداءات الحراجية ("يا أهل..."، "يا شباب...")، وممنوع الإلحاح ("لا تفوت الفرصة")، وممنوع التشبيهات المبالغة ("أسد الطريق").
3. اربط الفائدة العملية بواقع اليمن (الحرارة، الأتربة، الطرق) دون مبالغة.
4. لغة عربية فصحى ميسّرة، بدون عامية مبتذلة.
5. منشور السوشيال ميديا يجوز فيه إيموجي باعتدال، لكن بنفس الهدوء والرزانة — مو أسلوب إعلان حراج.

أعد ردك بصيغة JSON فقط بدون أي شرح إضافي، بهذا الشكل بالضبط:
{
  "title": "عنوان تسويقي قصير (بحد أقصى 60 حرفاً)",
  "description": "وصف احترافي للمنتج (100-250 كلمة، فقرات قصيرة)",
  "features": ["ميزة 1", "ميزة 2", "ميزة 3", "ميزة 4", "ميزة 5"],
  "marketing_post": "منشور جاهز للنشر على واتساب/سوشيال ميديا (60-120 كلمة)",
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

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: {
      title?: string;
      description?: string;
      features?: string[];
      marketing_post?: string;
      hashtags?: string[];
    } = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {};
    }
    return {
      title: parsed.title ?? "",
      description: parsed.description ?? "",
      features: Array.isArray(parsed.features) ? parsed.features : [],
      marketing_post: parsed.marketing_post ?? "",
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    };
  });

export const listProductsForContent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ password: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("products")
      .select("id, name, description, price, old_price")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      id: string;
      name: string;
      description: string | null;
      price: number | null;
      old_price: number | null;
    }>;
  });
