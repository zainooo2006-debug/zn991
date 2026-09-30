import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAdmin } from "./admin-auth.server";
import { recordOrderStatus } from "./order-history.server";
import {
  calcTotals,
  type DocItem,
  type InvoiceRow,
  type QuoteRow,
  effectiveQuoteStatus,
} from "./billing-utils";
import { ORDER_STATUS_VALUES } from "./order-status";

// The billing tables are new; talk to them untyped so this file compiles
// whether or not the generated Supabase types already include them.
const db = () => supabaseAdmin as unknown as SupabaseClient;

function fail(e: unknown): never {
  console.error("[billing] DB error:", e);
  throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً");
}

const itemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  qty: z.number().int().min(1).max(999),
  price: z.number().min(0).max(1_000_000_000),
});
const itemsSchema = z.array(itemSchema).min(1).max(60);

const tokenSchema = z.object({ password: z.string() });
const uuid = z.string().uuid();

/* ---------- row normalisers ---------- */

function cleanItems(v: unknown): DocItem[] {
  if (!Array.isArray(v)) return [];
  return v.map((i) => {
    const o = i as Record<string, unknown>;
    return {
      name: String(o.name ?? ""),
      qty: Number(o.qty ?? o.quantity ?? 1) || 1,
      price: Number(o.price ?? 0) || 0,
    };
  });
}

function normInvoice(r: Record<string, unknown>): InvoiceRow {
  return {
    ...(r as unknown as InvoiceRow),
    items: cleanItems(r.items),
    subtotal: Number(r.subtotal ?? 0),
    discount: Number(r.discount ?? 0),
    total: Number(r.total ?? 0),
  };
}

function normQuote(r: Record<string, unknown>): QuoteRow {
  return {
    ...(r as unknown as QuoteRow),
    items: cleanItems(r.items),
    subtotal: Number(r.subtotal ?? 0),
    discount: Number(r.discount ?? 0),
    total: Number(r.total ?? 0),
  };
}

/* =====================================================================
 * INVOICES
 * ===================================================================== */

export const listInvoices = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { data: rows, error } = await db()
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) fail(error);
    return (rows ?? []).map(normInvoice);
  });

export const createInvoice = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        order_id: uuid.optional().nullable(),
        customer_name: z.string().trim().min(2).max(100).optional(),
        phone: z.string().trim().min(6).max(30).optional(),
        address: z.string().trim().max(500).optional().nullable(),
        vehicle: z.string().trim().max(200).optional().nullable(),
        items: itemsSchema.optional(),
        discount: z.number().min(0).optional(),
        payment_method: z.string().trim().max(100).optional().nullable(),
        notes: z.string().trim().max(1000).optional().nullable(),
        mark_paid: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const client = db();

    let customer_name = data.customer_name;
    let phone = data.phone;
    let address = data.address ?? null;
    let items: DocItem[] | undefined = data.items;
    let payment_method = data.payment_method ?? null;
    let notes = data.notes ?? null;

    if (data.order_id) {
      // One active invoice per order: return the existing one.
      const { data: existing } = await client
        .from("invoices")
        .select("*")
        .eq("order_id", data.order_id)
        .neq("status", "void")
        .maybeSingle();
      if (existing) return { invoice: normInvoice(existing), existed: true };

      const { data: order, error: oErr } = await client
        .from("orders")
        .select("*")
        .eq("id", data.order_id)
        .maybeSingle();
      if (oErr) fail(oErr);
      if (!order) throw new Error("الطلب غير موجود");

      customer_name = customer_name ?? String(order.customer_name);
      phone = phone ?? String(order.phone);
      address = address ?? (order.address ? String(order.address) : null);
      items = items ?? cleanItems(order.items);
      payment_method = payment_method ?? (order.wallet_name ? String(order.wallet_name) : null);
      notes = notes ?? null;
    }

    if (!customer_name || !phone || !items || items.length === 0) {
      throw new Error("بيانات الفاتورة ناقصة (الاسم، الهاتف، البنود)");
    }

    const t = calcTotals(items, data.discount ?? 0);
    const now = new Date().toISOString();
    const { data: row, error } = await client
      .from("invoices")
      .insert({
        order_id: data.order_id ?? null,
        customer_name,
        phone,
        address,
        vehicle: data.vehicle ?? null,
        items,
        subtotal: t.subtotal,
        discount: t.discount,
        total: t.total,
        payment_method,
        notes,
        status: data.mark_paid ? "paid" : "issued",
        paid_at: data.mark_paid ? now : null,
      })
      .select("*")
      .single();

    if (error) {
      // Lost a race with another click on the same order -> return that one.
      if ((error as { code?: string }).code === "23505" && data.order_id) {
        const { data: again } = await client
          .from("invoices")
          .select("*")
          .eq("order_id", data.order_id)
          .neq("status", "void")
          .maybeSingle();
        if (again) return { invoice: normInvoice(again), existed: true };
      }
      fail(error);
    }
    return { invoice: normInvoice(row), existed: false };
  });

export const setInvoiceStatus = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        id: uuid,
        status: z.enum(["issued", "paid", "void"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { data: row, error } = await db()
      .from("invoices")
      .update({
        status: data.status,
        paid_at: data.status === "paid" ? new Date().toISOString() : null,
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) fail(error);
    return normInvoice(row);
  });

/** Public: the invoice link is an unguessable UUID (same idea as a share link). */
export const getPublicInvoice = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await db()
      .from("invoices")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) fail(error);
    return row ? normInvoice(row) : null;
  });

/* =====================================================================
 * QUOTES
 * ===================================================================== */

export const listQuotes = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { data: rows, error } = await db()
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) fail(error);
    return (rows ?? []).map(normQuote);
  });

export const saveQuote = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        id: uuid.optional().nullable(),
        customer_name: z.string().trim().min(2).max(100),
        phone: z.string().trim().min(6).max(30),
        vehicle: z.string().trim().max(200).optional().nullable(),
        items: itemsSchema,
        discount: z.number().min(0).optional(),
        valid_until: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .nullable(),
        notes: z.string().trim().max(1000).optional().nullable(),
        status: z.enum(["draft", "sent"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const t = calcTotals(data.items, data.discount ?? 0);
    const fields = {
      customer_name: data.customer_name,
      phone: data.phone,
      vehicle: data.vehicle ?? null,
      items: data.items,
      subtotal: t.subtotal,
      discount: t.discount,
      total: t.total,
      valid_until: data.valid_until || null,
      notes: data.notes ?? null,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: cur } = await db()
        .from("quotes")
        .select("status")
        .eq("id", data.id)
        .maybeSingle();
      if (!cur) throw new Error("عرض السعر غير موجود");
      if (cur.status === "converted") throw new Error("لا يمكن تعديل عرض تحوّل إلى طلب");
      const patch = data.status ? { ...fields, status: data.status } : fields;
      const { data: row, error } = await db()
        .from("quotes")
        .update(patch)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) fail(error);
      return normQuote(row);
    }

    const { data: row, error } = await db()
      .from("quotes")
      .insert({ ...fields, status: data.status ?? "draft" })
      .select("*")
      .single();
    if (error) fail(error);
    return normQuote(row);
  });

export const setQuoteStatus = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        id: uuid,
        status: z.enum(["draft", "sent", "accepted", "rejected", "cancelled"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { data: cur } = await db().from("quotes").select("status").eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("عرض السعر غير موجود");
    if (cur.status === "converted") throw new Error("العرض تحوّل إلى طلب ولا يمكن تغيير حالته");
    const { data: row, error } = await db()
      .from("quotes")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) fail(error);
    return normQuote(row);
  });

export const deleteQuote = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string(), id: uuid }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { data: cur } = await db().from("quotes").select("status").eq("id", data.id).maybeSingle();
    if (!cur) return { ok: true };
    if (cur.status !== "draft") throw new Error("يمكن حذف المسودات فقط. غيّر الحالة إلى ملغي بدلاً من الحذف");
    const { error } = await db().from("quotes").delete().eq("id", data.id);
    if (error) fail(error);
    return { ok: true };
  });

/** Turns a quote into an order without re-entering customer/items. */
export const convertQuoteToOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string(), id: uuid }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const client = db();
    const { data: q, error } = await client.from("quotes").select("*").eq("id", data.id).maybeSingle();
    if (error) fail(error);
    if (!q) throw new Error("عرض السعر غير موجود");
    if (q.order_id) return { order_id: String(q.order_id), existed: true };
    if (q.status === "rejected" || q.status === "cancelled") {
      throw new Error("لا يمكن تحويل عرض مرفوض أو ملغي");
    }

    const quote = normQuote(q);
    const orderId = crypto.randomUUID();
    const orderStatus: (typeof ORDER_STATUS_VALUES)[number] = "confirmed";
    const { error: oErr } = await client.from("orders").insert({
      id: orderId,
      customer_name: quote.customer_name,
      phone: quote.phone,
      address: null,
      items: quote.items.map((i, idx) => ({
        id: `quote-${idx + 1}`,
        name: i.name,
        price: i.price,
        qty: i.qty,
      })),
      subtotal: quote.subtotal,
      total: quote.total,
      notes: `من عرض السعر ${quote.quote_number}${quote.vehicle ? ` — ${quote.vehicle}` : ""}`,
      status: orderStatus,
    });
    if (oErr) fail(oErr);

    await recordOrderStatus(orderId, null, orderStatus, {
      changedBy: "admin",
      source: "quote",
      note: `تحويل من ${quote.quote_number}`,
    });

    const { error: uErr } = await client
      .from("quotes")
      .update({ status: "converted", order_id: orderId, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (uErr) fail(uErr);

    return { order_id: orderId, existed: false };
  });

/** Public: draft quotes are never exposed. */
export const getPublicQuote = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await db()
      .from("quotes")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) fail(error);
    if (!row || row.status === "draft") return null;
    const q = normQuote(row);
    return { ...q, view_status: effectiveQuoteStatus(q.status, q.valid_until) };
  });

/* =====================================================================
 * ORDER STATUS HISTORY
 * ===================================================================== */

export const listOrderHistory = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string(), order_id: uuid }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { data: rows, error } = await db()
      .from("order_status_history")
      .select("id, from_status, to_status, changed_by, source, note, created_at")
      .eq("order_id", data.order_id)
      .order("created_at", { ascending: true });
    if (error) fail(error);
    return (rows ?? []) as Array<{
      id: string;
      from_status: string | null;
      to_status: string;
      changed_by: string;
      source: string;
      note: string | null;
      created_at: string;
    }>;
  });

/**
 * Public timeline for the tracking page. Same protection as tracking itself:
 * the caller must supply the phone that belongs to each order.
 */
export const getOrderTimelines = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        phone: z.string().trim().min(9).max(30),
        orderIds: z.array(uuid).min(1).max(80),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const normalized = data.phone.replace(/\D/g, "");
    if (normalized.length < 9) return {} as Record<string, Array<{ to_status: string; created_at: string }>>;
    const client = db();

    const { data: owned, error: oErr } = await client
      .from("orders")
      .select("id")
      .in("id", data.orderIds)
      .ilike("phone", `%${normalized}%`);
    if (oErr) fail(oErr);
    const ids = (owned ?? []).map((o) => String(o.id));
    if (ids.length === 0) return {} as Record<string, Array<{ to_status: string; created_at: string }>>;

    const { data: rows, error } = await client
      .from("order_status_history")
      .select("order_id, to_status, created_at")
      .in("order_id", ids)
      .order("created_at", { ascending: true });
    if (error) fail(error);

    const out: Record<string, Array<{ to_status: string; created_at: string }>> = {};
    for (const r of rows ?? []) {
      const k = String(r.order_id);
      (out[k] ||= []).push({ to_status: String(r.to_status), created_at: String(r.created_at) });
    }
    return out;
  });
