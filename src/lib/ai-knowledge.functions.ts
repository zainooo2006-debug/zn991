import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Mirrors admin.functions.ts token verification so the same session token works.
function getSessionSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Server misconfigured: no session secret available");
  return s;
}

function assertAdmin(token: string | undefined | null) {
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

export type KnowledgeItem = {
  id: string;
  title: string | null;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const listKnowledge = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ password: z.string() }).parse(d))
  .handler(async ({ data }): Promise<KnowledgeItem[]> => {
    assertAdmin(data.password);
    const { data: rows, error } = await supabaseAdmin
      .from("ai_knowledge_base")
      .select("id, title, content, is_active, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as KnowledgeItem[];
  });

export const saveKnowledge = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        password: z.string(),
        id: z.string().uuid().optional().nullable(),
        title: z.string().trim().max(200).optional().nullable(),
        content: z.string().trim().min(1).max(20000),
        is_active: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const payload = {
      title: data.title ?? null,
      content: data.content,
      is_active: data.is_active ?? true,
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("ai_knowledge_base")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("ai_knowledge_base")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const toggleKnowledge = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ password: z.string(), id: z.string().uuid(), is_active: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { error } = await supabaseAdmin
      .from("ai_knowledge_base")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteKnowledge = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ password: z.string(), id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { error } = await supabaseAdmin.from("ai_knowledge_base").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
