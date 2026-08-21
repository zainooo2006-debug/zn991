import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "verify_warranty",
  title: "Verify warranty",
  description:
    "Look up a Taj Al Moluk warranty by its warranty number and return its public status details.",
  inputSchema: {
    warranty_number: z
      .string()
      .trim()
      .min(3)
      .max(64)
      .describe("The warranty number, e.g. TM-2025-000123"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ warranty_number }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await supabase.rpc("verify_warranty_public", { _num: warranty_number });
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const rows = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { results: rows },
    };
  },
});
