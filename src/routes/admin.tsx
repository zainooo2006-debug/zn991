import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shell } from "@/components/layout/Shell";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { Lock, LogOut, Sparkles } from "lucide-react";
import { adminLogin } from "@/lib/admin.functions";
import {
  WarrantyOverview,
  WarrantiesTab,
  WarrantyCustomersTab,
  WarrantySimpleCrud,
  WarrantyUsersTab,
} from "@/components/warranty-admin-panels";
import { ThemeManagerPanel } from "@/components/admin/ThemeManagerPanel";
import { TOKEN_KEY, getPwd } from "@/components/admin/shared";
import { WalletsPanel } from "@/components/admin/WalletsPanel";
import { CategoriesPanel } from "@/components/admin/CategoriesPanel";
import { ServicesPanel } from "@/components/admin/ServicesPanel";
import { PackagesPanel } from "@/components/admin/PackagesPanel";
import { OrdersPanel } from "@/components/admin/OrdersPanel";
import { ProductsPanel } from "@/components/admin/ProductsPanel";
import { HomeBuilderPanel } from "@/components/admin/HomeBuilderPanel";
import { SitePagesPanel } from "@/components/admin/SitePagesPanel";
import { ContentPanel } from "@/components/admin/ContentPanel";
import { ReviewsPanel } from "@/components/admin/ReviewsPanel";
import { CustomerReviewsPanel } from "@/components/admin/CustomerReviewsPanel";
import { InstallationCentersPanel } from "@/components/admin/InstallationCentersPanel";
import { HeroSlidesPanel } from "@/components/admin/HeroSlidesPanel";
import { PushCampaignsPanel } from "@/components/admin/PushCampaignsPanel";
import { AnalyticsDashboardPanel } from "@/components/admin/AnalyticsDashboardPanel";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — زين" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "manifest", href: "/admin-manifest.json" }],
  }),
  component: AdminPage,
});

type Tab =
  | "orders"
  | "products"
  | "categories"
  | "services"
  | "packages"
  | "wallets"
  | "content"
  | "site-pages"
  | "home-builder"
  | "reviews"
  | "customer-reviews"
  | "centers"
  | "hero"
  | "push-campaigns"
  | "w-overview"
  | "w-warranties"
  | "w-customers"
  | "w-brands"
  | "w-films"
  | "w-branches"
  | "w-users"
  | "theme"
  | "analytics";

function AdminPage() {
  const login = useServerFn(adminLogin);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(TOKEN_KEY)) {
      setAuthed(true);
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const { token } = await login({ data: { password } });
      sessionStorage.setItem(TOKEN_KEY, token);
      setAuthed(true);
      setPassword("");
    } catch (err) {
      setError((err as Error).message || "كلمة المرور غير صحيحة");
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setAuthed(false);
    setPassword("");
  };

  if (!authed) {
    return (
      <Shell>
        <div className="max-w-md mx-auto px-4 py-16">
          <div className="card-clean p-8 text-center">
            <Lock className="w-10 h-10 text-[var(--color-gold)] mx-auto" />

            <h1 className="text-2xl font-black mt-4">
              لوحة التحكم
            </h1>

            <p className="text-sm text-[var(--color-ink-soft)] mt-1">
              أدخل كلمة المرور للمتابعة
            </p>

            <form onSubmit={submit} className="mt-6 space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة المرور"
                className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)]"
                disabled={busy}
              />

              {error && (
                <p className="text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="btn-gold w-full"
              >
                {busy ? "جاري التحقق..." : "دخول"}
              </button>
            </form>
          </div>
        </div>
      </Shell>
    );
  }

  return <AdminDashboard onLogout={logout} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("orders");

  const groups: {
    title: string;
    tabs: { id: Tab; label: string }[];
  }[] = [
    {
      title: "المتجر",
      tabs: [
        { id: "orders", label: "الطلبات" },
        { id: "products", label: "المنتجات" },
        { id: "categories", label: "الأقسام" },
        { id: "services", label: "الخدمات" },
        { id: "packages", label: "البكجات" },
        { id: "wallets", label: "المحافظ" },
        { id: "reviews", label: "تقييمات المنتجات" },
        { id: "customer-reviews", label: "آراء العملاء" },
        { id: "centers", label: "مراكز التركيب" },
        { id: "hero", label: "إدارة السلايدر" },
        { id: "push-campaigns", label: "إشعارات العملاء 🔔" },
        { id: "home-builder", label: "بناء الرئيسية 🧩" },
        { id: "site-pages", label: "صفحات الموقع" },
        { id: "content", label: "المحتوى (متقدم)" },
      ],
    },
    {
      title: "الضمانات",
      tabs: [
        { id: "w-overview", label: "نظرة عامة" },
        { id: "w-warranties", label: "الضمانات" },
        { id: "w-customers", label: "عملاء الضمان" },
        { id: "w-brands", label: "الماركات" },
        { id: "w-films", label: "أنواع اللاصق" },
        { id: "w-branches", label: "الفروع" },
        { id: "w-users", label: "المستخدمون والصلاحيات" },
      ],
    },
    {
      title: "التحليلات",
      tabs: [
        { id: "analytics", label: "📊 التحليلات" },
      ],
    },
    {
      title: "المظهر",
      tabs: [
        { id: "theme", label: "إدارة المظهر" },
      ],
    },
  ];

  return (
    <Shell>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black">
              لوحة التحكم
            </h1>

            <p className="text-sm text-[var(--color-ink-soft)]">
              إدارة المتجر والضمانات
            </p>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell token={getPwd()} />

            <a
              href="/admin/website-builder"
              className="btn-outline"
            >
              <Sparkles className="w-4 h-4" />
              Website Builder
            </a>

            <a
              href="/admin/ai-training"
              className="btn-outline"
            >
              <Sparkles className="w-4 h-4" />
              تدريب المساعد
            </a>

            <button
              onClick={onLogout}
              className="btn-outline"
            >
              <LogOut className="w-4 h-4" />
              خروج
            </button>
          </div>
        </div>

        {groups.map((g) => (
          <div key={g.title} className="mt-4">
            <div className="text-xs font-bold text-[var(--color-ink-soft)] mb-2">
              {g.title}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {g.tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${
                    tab === t.id
                      ? "bg-[var(--color-gold)] text-[var(--color-ink)]"
                      : "bg-[var(--color-surface)] text-[var(--color-ink-soft)] hover:bg-[var(--color-gold-soft)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-6">
          {tab === "orders" && <OrdersPanel />}
          {tab === "products" && <ProductsPanel />}
          {tab === "categories" && <CategoriesPanel />}
          {tab === "services" && <ServicesPanel />}
          {tab === "packages" && <PackagesPanel />}
          {tab === "wallets" && <WalletsPanel />}
          {tab === "reviews" && <ReviewsPanel />}
          {tab === "customer-reviews" && <CustomerReviewsPanel />}
          {tab === "centers" && <InstallationCentersPanel />}
          {tab === "hero" && <HeroSlidesPanel />}
          {tab === "push-campaigns" && <PushCampaignsPanel />}
          {tab === "home-builder" && <HomeBuilderPanel />}
          {tab === "site-pages" && <SitePagesPanel />}
          {tab === "content" && <ContentPanel />}

          {tab === "w-overview" && <WarrantyOverview />}
          {tab === "w-warranties" && <WarrantiesTab />}
          {tab === "w-customers" && <WarrantyCustomersTab />}

          {tab === "w-brands" && (
            <WarrantySimpleCrud
              table="warranty_brands"
              title="الماركات"
              fields={[
                { k: "name", l: "الاسم" },
                { k: "logo_url", l: "رابط الشعار" },
              ]}
            />
          )}

          {tab === "w-films" && (
            <WarrantySimpleCrud
              table="film_types"
              title="أنواع اللاصق"
              fields={[
                { k: "name", l: "الاسم" },
                {
                  k: "warranty_months",
                  l: "مدة الضمان (شهر)",
                  type: "number",
                },
                { k: "description", l: "الوصف" },
              ]}
            />
          )}

          {tab === "w-branches" && (
            <WarrantySimpleCrud
              table="branches"
              title="الفروع"
              fields={[
                { k: "name", l: "الاسم" },
                { k: "address", l: "العنوان" },
                { k: "phone", l: "الجوال" },
              ]}
            />
          )}

          {tab === "w-users" && <WarrantyUsersTab />}

          {tab === "analytics" && <AnalyticsDashboardPanel />}

          {tab === "theme" && <ThemeManagerPanel />}
        </div>
      </div>
    </Shell>
  );
}

/* ===================== Moved out ===================== */
/* ProductsPanel, ProductForm, ImagesField -> src/components/admin/ProductsPanel.tsx */
/* ContentPanel -> src/components/admin/ContentPanel.tsx */
/* ReviewsPanel -> src/components/admin/ReviewsPanel.tsx */
/* CustomerReviewsPanel -> src/components/admin/CustomerReviewsPanel.tsx */
/* InstallationCentersPanel, CenterForm -> src/components/admin/InstallationCentersPanel.tsx */
/* HeroSlidesPanel, HeroSlideFormModal -> src/components/admin/HeroSlidesPanel.tsx */
