import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { WarrantyAuthProvider, useWarrantyAuth } from "@/lib/warranty-auth";
import logoAsset from "@/assets/logo-tajalmoluk.png.asset.json";
import { useSiteContentValue } from "@/lib/site-content";
import { LogOut, ShieldCheck, LayoutDashboard, PlusCircle, Search, Home, Car } from "lucide-react";

export const Route = createFileRoute("/warranty")({
  component: WarrantyLayout,
});

function WarrantyLayout() {
  return (
    <WarrantyAuthProvider>
      <div
        dir="rtl"
        className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-cairo"
      >
        <WHeader />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Outlet />
        </main>
        <footer className="border-t border-slate-200 dark:border-slate-800 mt-12 py-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} زين · نظام إدارة الضمانات
        </footer>
      </div>
    </WarrantyAuthProvider>
  );
}

function WHeader() {
  const { user, isAdmin, isStaff, signOut } = useWarrantyAuth();
  const navigate = useNavigate();
  const branding = useSiteContentValue("branding");

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <Link to="/warranty" className="flex items-center gap-2 shrink-0">
          <img src={branding.logoUrl || logoAsset.url} alt="زين" className="h-10 w-auto" />
          <div className="hidden sm:block">
            <div className="font-bold text-sm leading-tight">زين</div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400">
              نظام إدارة الضمانات
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1 mr-auto text-sm">
          <Link
            to="/"
            className="hidden md:inline-flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Home className="w-4 h-4" /> المتجر
          </Link>
          <Link
            to="/warranty/verify"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Search className="w-4 h-4" /> <span className="hidden sm:inline">تحقق</span>
          </Link>
          {user ? (
            <>
              <Link
                to="/warranty/dashboard"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <LayoutDashboard className="w-4 h-4" />{" "}
                <span className="hidden sm:inline">لوحتي</span>
              </Link>
              <Link
                to="/warranty/cars"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Car className="w-4 h-4" /> <span className="hidden sm:inline">سياراتي</span>
              </Link>
              <Link
                to="/warranty/activate"
                search={{}}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                <PlusCircle className="w-4 h-4" />{" "}
                <span className="hidden sm:inline">تفعيل ضمان</span>
              </Link>
              {(isAdmin || isStaff) && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600"
                >
                  <ShieldCheck className="w-4 h-4" /> لوحة التحكم
                </Link>
              )}
              <button
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/warranty/auth" });
                }}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">خروج</span>
              </button>
            </>
          ) : (
            <Link
              to="/warranty/auth"
              className="px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-medium"
            >
              تسجيل الدخول
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
