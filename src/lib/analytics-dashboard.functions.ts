import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertAdmin } from "./admin-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const dashboardSchema = z.object({
  password: z.string(),
  days: z.coerce.number().int().min(1).max(90).default(30),
});

function getStartDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function getPeriodStart(period: "today" | "week" | "month") {
  const now = new Date();

  if (period === "today") {
    now.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    now.setDate(now.getDate() - diff);
    now.setHours(0, 0, 0, 0);
  } else {
    now.setDate(1);
    now.setHours(0, 0, 0, 0);
  }

  return now.toISOString();
}

async function getEventCount(
  eventName: string,
  startDate: string,
  endDate?: string,
) {
  let query = supabaseAdmin
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("event_name", eventName)
    .gte("created_at", startDate);

  if (endDate) {
    query = query.lt("created_at", endDate);
  }

  const { count, error } = await query;

  if (error) {
    console.error("[analytics-dashboard] event count error:", error);
    throw new Error("تعذّر حساب بيانات التحليلات");
  }

  return count ?? 0;
}

export const getAnalyticsDashboard = createServerFn({ method: "POST" })
  .inputValidator((d) => dashboardSchema.parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);

    const now = new Date().toISOString();

    const todayStart = getPeriodStart("today");
    const weekStart = getPeriodStart("week");
    const monthStart = getPeriodStart("month");
    const rangeStart = getStartDate(data.days);

    const [
      todayPageViews,
      weekPageViews,
      monthPageViews,
      totalEvents,
      addToCart,
      checkoutStarted,
      ordersCompleted,
      assistantOpened,
      assistantMessages,
    ] = await Promise.all([
      getEventCount("page_view", todayStart, now),
      getEventCount("page_view", weekStart, now),
      getEventCount("page_view", monthStart, now),
      getEventCount("page_view", rangeStart, now),
      getEventCount("add_to_cart", rangeStart, now),
      getEventCount("checkout_started", rangeStart, now),
      getEventCount("order_completed", rangeStart, now),
      getEventCount("assistant_opened", rangeStart, now),
      getEventCount("assistant_message", rangeStart, now),
    ]);

    const { data: events, error: eventsError } = await supabaseAdmin
      .from("analytics_events")
      .select(
        "event_name, visitor_id, user_id, page, product_id, device_type, source, created_at",
      )
      .gte("created_at", rangeStart)
      .lt("created_at", now)
      .order("created_at", { ascending: false })
      .limit(10000);

    if (eventsError) {
      console.error("[analytics-dashboard] events query error:", eventsError);
      throw new Error("تعذّر تحميل بيانات التحليلات");
    }

    const rows = events ?? [];

    const uniqueVisitors = new Set(
      rows
        .map((row) => row.visitor_id)
        .filter((value): value is string => Boolean(value)),
    ).size;

    const uniqueUsers = new Set(
      rows
        .map((row) => row.user_id)
        .filter((value): value is string => Boolean(value)),
    ).size;

    const devices: Record<string, number> = {};
    const sources: Record<string, number> = {};
    const pages: Record<string, number> = {};

    for (const row of rows) {
      if (row.device_type) {
        devices[row.device_type] = (devices[row.device_type] ?? 0) + 1;
      }

      if (row.source) {
        sources[row.source] = (sources[row.source] ?? 0) + 1;
      }

      if (row.event_name === "page_view" && row.page) {
        pages[row.page] = (pages[row.page] ?? 0) + 1;
      }
    }

    const sortStats = (stats: Record<string, number>) =>
      Object.entries(stats)
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => ({ name, count }));

    const conversionRate =
      addToCart > 0 ? Number(((ordersCompleted / addToCart) * 100).toFixed(2)) : 0;

    return {
      range: {
        days: data.days,
        start: rangeStart,
        end: now,
      },

      visitors: {
        today: todayPageViews,
        week: weekPageViews,
        month: monthPageViews,
        unique: uniqueVisitors,
        users: uniqueUsers,
      },

      events: {
        pageViews: totalEvents,
        addToCart,
        checkoutStarted,
        ordersCompleted,
        assistantOpened,
        assistantMessages,
      },

      conversion: {
        rate: conversionRate,
      },

      devices: sortStats(devices),
      sources: sortStats(sources),
      pages: sortStats(pages).slice(0, 20),
    };
  });
