import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertAdmin } from "./admin-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const dashboardSchema = z.object({
  password: z.string(),
  days: z.coerce.number().int().min(1).max(90).default(30),
});

type AnalyticsRow = {
  event_name: string;
  visitor_id: string | null;
  session_id?: string | null;
  user_id: string | null;
  page: string | null;
  product_id: string | null;
  device_type: string | null;
  source: string | null;
  created_at: string;
};

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

async function getEventCount(eventName: string, startDate: string, endDate: string) {
  const { count, error } = await supabaseAdmin
    .from("analytics_events")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("event_name", eventName)
    .gte("created_at", startDate)
    .lt("created_at", endDate);

  if (error) {
    console.error("[analytics-dashboard] event count error:", error);
    throw new Error("تعذّر حساب بيانات التحليلات");
  }

  return count ?? 0;
}

function uniqueValues(
  rows: AnalyticsRow[],
  getter: (row: AnalyticsRow) => string | null | undefined,
) {
  return new Set(rows.map(getter).filter((value): value is string => Boolean(value))).size;
}

function filterRowsByDate(rows: AnalyticsRow[], startDate: string, endDate: string) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  return rows.filter((row) => {
    const timestamp = new Date(row.created_at).getTime();
    return timestamp >= start && timestamp < end;
  });
}

function sortStats(stats: Record<string, number>) {
  return Object.entries(stats)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({
      name,
      count,
    }));
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

    const [addToCart, checkoutStarted, ordersCompleted, assistantOpened, assistantMessages] =
      await Promise.all([
        getEventCount("add_to_cart", rangeStart, now),
        getEventCount("checkout_started", rangeStart, now),
        getEventCount("order_completed", rangeStart, now),
        getEventCount("assistant_opened", rangeStart, now),
        getEventCount("assistant_message", rangeStart, now),
      ]);

    const { data: events, error: eventsError } = await supabaseAdmin
      .from("analytics_events")
      .select(
        "event_name, visitor_id, session_id, user_id, page, product_id, device_type, source, created_at",
      )
      .gte("created_at", rangeStart)
      .lt("created_at", now)
      .order("created_at", { ascending: false })
      .limit(50000);

    if (eventsError) {
      console.error("[analytics-dashboard] events query error:", eventsError);
      throw new Error("تعذّر تحميل بيانات التحليلات");
    }

    const rows = (events ?? []) as AnalyticsRow[];

    const todayRows = filterRowsByDate(rows, todayStart, now);
    const weekRows = filterRowsByDate(rows, weekStart, now);
    const monthRows = filterRowsByDate(rows, monthStart, now);

    const todayPageViews = todayRows.filter((row) => row.event_name === "page_view").length;

    const weekPageViews = weekRows.filter((row) => row.event_name === "page_view").length;

    const monthPageViews = monthRows.filter((row) => row.event_name === "page_view").length;

    const rangePageViews = rows.filter((row) => row.event_name === "page_view").length;

    const todayVisitors = uniqueValues(
      todayRows.filter((row) => row.event_name === "page_view"),
      (row) => row.visitor_id,
    );

    const weekVisitors = uniqueValues(
      weekRows.filter((row) => row.event_name === "page_view"),
      (row) => row.visitor_id,
    );

    const monthVisitors = uniqueValues(
      monthRows.filter((row) => row.event_name === "page_view"),
      (row) => row.visitor_id,
    );

    const uniqueVisitors = uniqueValues(
      rows.filter((row) => row.event_name === "page_view"),
      (row) => row.visitor_id,
    );

    const uniqueUsers = uniqueValues(rows, (row) => row.user_id);

    const devices: Record<string, Set<string>> = {};
    const sources: Record<string, Set<string>> = {};
    const pages: Record<string, number> = {};

    for (const row of rows) {
      if (row.event_name !== "page_view") {
        continue;
      }

      if (row.device_type) {
        if (!devices[row.device_type]) {
          devices[row.device_type] = new Set<string>();
        }

        const visitorKey = row.visitor_id ?? row.user_id ?? `anonymous-${row.created_at}`;

        devices[row.device_type].add(visitorKey);
      }

      if (row.source) {
        if (!sources[row.source]) {
          sources[row.source] = new Set<string>();
        }

        const sourceKey = row.visitor_id ?? row.user_id ?? `anonymous-${row.created_at}`;

        sources[row.source].add(sourceKey);
      }

      if (row.page) {
        pages[row.page] = (pages[row.page] ?? 0) + 1;
      }
    }

    const deviceStats = Object.entries(devices)
      .map(([name, visitors]) => ({
        name,
        count: visitors.size,
      }))
      .sort((a, b) => b.count - a.count);

    const sourceStats = Object.entries(sources)
      .map(([name, visitors]) => ({
        name,
        count: visitors.size,
      }))
      .sort((a, b) => b.count - a.count);

    const conversionRate =
      addToCart > 0 ? Number(((ordersCompleted / addToCart) * 100).toFixed(2)) : 0;

    return {
      range: {
        days: data.days,
        start: rangeStart,
        end: now,
      },

      visitors: {
        today: todayVisitors,
        week: weekVisitors,
        month: monthVisitors,
        unique: uniqueVisitors,
        users: uniqueUsers,
      },

      pageViews: {
        today: todayPageViews,
        week: weekPageViews,
        month: monthPageViews,
        range: rangePageViews,
      },

      events: {
        pageViews: rangePageViews,
        addToCart,
        checkoutStarted,
        ordersCompleted,
        assistantOpened,
        assistantMessages,
      },

      conversion: {
        rate: conversionRate,
      },

      devices: deviceStats,

      sources: sourceStats,

      pages: sortStats(pages).slice(0, 20),
    };
  });
