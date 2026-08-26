import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabasePublic } from "./public-backend.server";

const ContentPart = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("image_url"), image_url: z.object({ url: z.string() }) }),
]);

const Message = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([z.string(), z.array(ContentPart)]),
});

const Input = z.object({
  messages: z.array(Message).min(1),
});

const SYSTEM_PROMPT = `أنت المساعد الذكي الرسمي لمتجر "زين أصل الحماية" في صنعاء، اليمن.

أنت خبير في تعديل السيارات، الإكسسوارات، الإنارة، الجنوط، الديكورات، العزل الحراري، النانو سيراميك، طبقة الحماية PPF، وجميع منتجات وخدمات المتجر.

مهمتك:
- مساعدة العملاء في اختيار المنتجات المناسبة لسياراتهم.
- تقديم اقتراحات احترافية بناءً على نوع السيارة واحتياج العميل.
- إذا رفع العميل صورة سيارته أو صورة منتج، حلّلها بعناية واقترح تعديلات أو ألوان أو منتجات تناسبها.
- تشجيع العميل بلطف على زيارة المتجر أو التواصل عبر واتساب لإتمام التركيب.

استخدم لهجة يمنية ودودة ومحترفة، إجابات واضحة ومختصرة ومقنعة، وتنسيق ماركداون بسيط عند الحاجة.

بيانات التواصل:
- المدير: أ/ صديق الزين — 780687704
- واتساب المتجر: 773144403
- أ/ هاشم الزين — 778055135
- أ/ علي غازي — 773345966`;

async function buildKnowledgeBlock(): Promise<string> {
  try {
    const { data: rows } = await supabasePublic
      .from("ai_knowledge_base")
      .select("title, content")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (!rows || rows.length === 0) return "";
    const items = rows
      .map((r) => {
        const t = r.title?.trim();
        return t ? `### ${t}\n${r.content}` : r.content;
      })
      .join("\n\n---\n\n");
    return `\n\n## قاعدة معرفة المتجر (المصدر الرسمي — اعتمد عليها ولا تخترع بيانات خارجها):\n\n${items}`;
  } catch {
    return "";
  }
}

async function buildCatalogBlock(): Promise<string> {
  try {
    const [{ data: cats }, { data: prods }, { data: services }] = await Promise.all([
      supabasePublic.from("categories").select("id, name").order("sort_order"),
      supabasePublic
        .from("products")
        .select("id, name, description, price, old_price, is_bestseller, is_featured, category_id")
        .order("created_at", { ascending: false })
        .limit(120),
      supabasePublic.from("service_categories").select("name, short_desc").order("sort_order"),
    ]);

    const catMap = new Map((cats ?? []).map((c) => [c.id, c.name]));
    const productLines = (prods ?? []).map((p) => {
      const cat = p.category_id ? catMap.get(p.category_id) : null;
      const price = p.price != null ? `${p.price} ر.ي` : "—";
      const old = p.old_price ? ` (بدلاً من ${p.old_price})` : "";
      const tags = [p.is_bestseller ? "الأكثر مبيعاً" : null, p.is_featured ? "مميّز" : null]
        .filter(Boolean)
        .join(" • ");
      const desc = p.description ? ` — ${String(p.description).slice(0, 140)}` : "";
      return `- [${p.id}] ${p.name}${cat ? ` (${cat})` : ""} — السعر: ${price}${old}${tags ? ` [${tags}]` : ""}${desc}`;
    });

    const serviceLines = (services ?? []).map(
      (s) => `- ${s.name}${s.short_desc ? ` — ${s.short_desc}` : ""}`,
    );

    if (productLines.length === 0 && serviceLines.length === 0) return "";

    let out = "\n\n## كتالوج المتجر (يُحدَّث تلقائيًا من قاعدة البيانات):";
    if (productLines.length)
      out += `\n\n### المنتجات (${productLines.length}):\n${productLines.join("\n")}`;
    if (serviceLines.length) out += `\n\n### الخدمات:\n${serviceLines.join("\n")}`;
    return out;
  } catch {
    return "";
  }
}

export const chatWithAssistant = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const [knowledge, catalog] = await Promise.all([buildKnowledgeBlock(), buildCatalogBlock()]);
    const systemPrompt =
      SYSTEM_PROMPT +
      knowledge +
      catalog +
      "\n\nقواعد صارمة:\n- اعتمد على قاعدة المعرفة والكتالوج أعلاه كمصدر رسمي.\n- لا تخترع أسعارًا أو منتجات أو عروضًا غير موجودة في الكتالوج.\n- عند اقتراح منتج، اذكر اسمه وسعره فقط كما ورد في الكتالوج.\n- إذا لم تجد الإجابة، اطلب من العميل التواصل مع المتجر عبر الأرقام أعلاه.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...data.messages],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("تم تجاوز الحد المسموح للطلبات، حاول بعد قليل.");
      if (res.status === 402) throw new Error("انتهى رصيد الذكاء الاصطناعي، يرجى تعبئة الرصيد.");
      throw new Error(`AI error [${res.status}]: ${body}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    return { text };
  });
