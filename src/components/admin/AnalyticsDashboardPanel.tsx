import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  BarChart3,
  Bot,
  CheckCircle2,
  Eye,
  Globe2,
  Monitor,
  MousePointerClick,
  Smartphone,
  ShoppingCart,
  Users,
} from "lucide-react";
import { getAnalyticsDashboard } from "@/lib/analytics-dashboard.functions";
import { getPwd } from "./shared";

type DashboardData = Awaited<ReturnType<ReturnType<typeof getAnalyticsDashboard>>>;

export function AnalyticsDashboardPanel() {
  const getDashboard = useServerFn(getAnalyticsDashboard);

  const [data, setData] = useState<DashboardData | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setBusy(true);
    setError("");

    try {
      const result = await getDashboard({
        data: {
          password: getPwd(),
          days: 30,
        },
      });

      setData(result);
    } catch (err) {
      setError((err as Error).message || "تعذر تحميل التحليلات");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (busy) {
    return (
      <div className="card-clean p-8 text-center">
        <Activity className="w-8 h-8 animate-pulse mx-auto text-[var(--color-gold)]" />
        <p className="mt-3 font-bold">جاري تحميل التحليلات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-clean p-6">
        <p className="font-bold text-red-600">تعذر تحميل التحليلات</p>
        <p className="text-sm mt-2 text-[var(--color-ink-soft)]">{error}</p>

        <button onClick={() => void load()} className="btn-gold mt-4">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    {
      label: "زوار اليوم",
      value: data.visitors.today,
      icon: Eye,
    },
    {
      label: "هذا الأسبوع",
      value: data.visitors.week,
      icon: BarChart3,
    },
    {
      label: "هذا الشهر",
      value: data.visitors.month,
      icon: Activity,
    },
    {
      label: "زوار فريدون",
      value: data.visitors.unique,
      icon: Users,
    },
    {
      label: "مستخدمون مسجلون",
      value: data.visitors.users,
      icon: Users,
    },
    {
      label: "التحويل",
      value: `${data.conversion.rate}%`,
      icon: CheckCircle2,
    },
  ];

  const eventCards = [
    {
      label: "مشاهدات الصفحات",
      value: data.events.pageViews,
      icon: Eye,
    },
    {
      label: "إضافة للسلة",
      value: data.events.addToCart,
      icon: ShoppingCart,
    },
    {
      label: "بدء الدفع",
      value: data.events.checkoutStarted,
      icon: MousePointerClick,
    },
    {
      label: "طلبات مكتملة",
      value: data.events.ordersCompleted,
      icon: CheckCircle2,
    },
    {
      label: "فتح المساعد",
      value: data.events.assistantOpened,
      icon: Bot,
    },
    {
      label: "رسائل المساعد",
      value: data.events.assistantMessages,
      icon: Bot,
    },
  ];

  const deviceIcons: Record<string, typeof Smartphone> = {
    android: Smartphone,
    ios: Smartphone,
    desktop: Monitor,
    unknown: Globe2,
  };

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-black">ZAIN Analytics</h2>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">آخر {data.range.days} يوم</p>
        </div>

        <button onClick={() => void load()} className="btn-outline">
          تحديث البيانات
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div key={card.label} className="card-clean p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-[var(--color-ink-soft)]">{card.label}</span>
                <Icon className="w-5 h-5 text-[var(--color-gold)]" />
              </div>

              <div className="text-2xl font-black mt-3">{card.value}</div>
            </div>
          );
        })}
      </div>

      <div>
        <h3 className="text-lg font-black mb-3">الأحداث</h3>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {eventCards.map((card) => {
            const Icon = card.icon;

            return (
              <div key={card.label} className="card-clean p-4">
                <Icon className="w-5 h-5 text-[var(--color-gold)]" />
                <p className="text-sm mt-3 text-[var(--color-ink-soft)]">{card.label}</p>
                <p className="text-xl font-black mt-1">{card.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <section className="card-clean p-4">
          <h3 className="font-black mb-4">الأجهزة</h3>

          <div className="space-y-3">
            {data.devices.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-soft)]">لا توجد بيانات</p>
            ) : (
              data.devices.map((item) => {
                const Icon = deviceIcons[item.name] ?? Globe2;

                return (
                  <div key={item.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </div>

                    <strong>{item.count}</strong>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="card-clean p-4">
          <h3 className="font-black mb-4">مصادر الزيارات</h3>

          <div className="space-y-3">
            {data.sources.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-soft)]">لا توجد بيانات</p>
            ) : (
              data.sources.slice(0, 10).map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3">
                  <span>{item.name}</span>
                  <strong>{item.count}</strong>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card-clean p-4">
          <h3 className="font-black mb-4">أكثر الصفحات زيارة</h3>

          <div className="space-y-3">
            {data.pages.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-soft)]">لا توجد بيانات</p>
            ) : (
              data.pages.slice(0, 10).map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm truncate" dir="ltr">
                      {item.name}
                    </span>
                    <strong>{item.count}</strong>
                  </div>

                  <div className="h-1.5 rounded-full bg-[var(--color-surface)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-gold)]"
                      style={{
                        width: `${Math.max(4, (item.count / data.pages[0].count) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
