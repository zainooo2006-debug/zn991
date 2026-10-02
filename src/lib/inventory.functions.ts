import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAdmin } from "./admin-auth.server";

// Quantities are admin-only information; the storefront only ever sees in_stock.
const db = () => supabaseAdmin as unknown as SupabaseClient;

export type ProductStock = { id: string; stock_qty: number | null; in_stock: boolean };

export const getProductStock = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { data: rows, error } = await db().from("products").select("id, stock_qty, in_stock");
    if (error) {
      console.error("[inventory] DB error:", error);
      throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً");
    }
    return (rows ?? []).map((r) => ({
      id: String(r.id),
      stock_qty: r.stock_qty == null ? null : Number(r.stock_qty),
      in_stock: r.in_stock !== false,
    })) as ProductStock[];
  });
