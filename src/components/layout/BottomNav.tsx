import { Link } from "@tanstack/react-router";
import { Home, Store, Wrench, ShoppingCart, ShieldCheck } from "lucide-react";
import { useCart } from "@/lib/cart";

const items = [
  { to: "/" as const, label: "الرئيسية", icon: Home },
  { to: "/shop" as const, label: "المتجر", icon: Store },
  { to: "/services" as const, label: "الخدمات", icon: Wrench },
  { to: "/cart" as const, label: "السلة", icon: ShoppingCart, badge: true },
  { to: "/warranty" as const, label: "الضمان", icon: ShieldCheck },
];

export function BottomNav() {
  const { count } = useCart();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[var(--color-hairline)]">
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon, badge }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] text-[var(--color-ink-soft)] data-[status=active]:text-[var(--color-gold)]"
            >
              <Icon className="w-5 h-5" />
              {badge && count > 0 && (
                <span className="absolute top-1 left-[calc(50%-1.25rem)] bg-[var(--color-gold)] text-[var(--color-ink)] text-[9px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                  {count}
                </span>
              )}
              <span className="font-semibold">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
