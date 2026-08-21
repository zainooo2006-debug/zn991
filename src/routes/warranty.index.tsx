import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Search, PlusCircle, LayoutDashboard } from "lucide-react";
import { useWarrantyAuth } from "@/lib/warranty-auth";

export const Route = createFileRoute("/warranty/")({
  component: WarrantyHome,
});

function WarrantyHome() {
  const { user, loading } = useWarrantyAuth();

  return (
    <div className="space-y-8">
      <section className="text-center py-10 rounded-2xl bg-gradient-to-l from-amber-500 via-amber-400 to-yellow-500 text-white shadow-lg">
        <ShieldCheck className="w-16 h-16 mx-auto mb-3" />
        <h1 className="text-3xl md:text-4xl font-bold mb-2">نظام ضمانات زين</h1>
        <p className="text-white/90 max-w-2xl mx-auto px-4">
          فعّل ضمانك، اطبع شهادتك الرقمية، وتحقّق من صحة الضمان في أي وقت.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          to="/warranty/verify"
          icon={<Search className="w-8 h-8" />}
          title="التحقق من ضمان"
          desc="أدخل رقم الضمان للتأكد من صحته وحالته."
          color="bg-blue-500"
        />
        {loading ? null : user ? (
          <>
            <ActionCard
              to="/warranty/dashboard"
              icon={<LayoutDashboard className="w-8 h-8" />}
              title="لوحتي"
              desc="عرض جميع ضماناتي وتحميل الشهادات."
              color="bg-emerald-500"
            />
            <ActionCard
              to="/warranty/activate"
              icon={<PlusCircle className="w-8 h-8" />}
              title="تفعيل ضمان جديد"
              desc="سجّل ضمان جديد لسيارتك."
              color="bg-amber-500"
            />
          </>
        ) : (
          <ActionCard
            to="/warranty/auth"
            icon={<PlusCircle className="w-8 h-8" />}
            title="تسجيل الدخول"
            desc="ادخل لعرض ضماناتك أو تفعيل ضمان جديد."
            color="bg-amber-500"
          />
        )}
      </div>
    </div>
  );
}

function ActionCard({
  to,
  icon,
  title,
  desc,
  color,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <Link
      to={to}
      className="group block rounded-2xl bg-white dark:bg-slate-800 p-6 shadow hover:shadow-xl transition-all border border-slate-200 dark:border-slate-700"
    >
      <div
        className={`w-14 h-14 rounded-xl ${color} text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
      >
        {icon}
      </div>
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">{desc}</p>
    </Link>
  );
}
