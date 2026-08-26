import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabasePublic } from "./public-backend.server";

const schema = z.object({ num: z.string().trim().min(3).max(64) });

export const verifyWarranty = createServerFn({ method: "POST" })
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabasePublic.rpc("verify_warranty_public", {
      _num: data.num,
    });
    if (error) {
      console.error("[server] DB error:", error);
      throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً");
    }
    return rows ?? [];
  });
