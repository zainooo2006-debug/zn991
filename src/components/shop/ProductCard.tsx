import { Link } from "@tanstack/react-router";
import { Star, ShoppingCart, Check } from "lucide-react";
import { useState } from "react";
import { resolveImage } from "@/lib/asset-map";
import { useCart } from "@/lib/cart";

export interface ProductCardProduct {
  id: string;
  name: string;
  price: number;
  old_price: number | null;
  images: string[];
  rating: number;
}

export function ProductCard({ p }: { p: ProductCardProduct }) {
  const img = resolveImage(p.images?.[0]);
  const cart = useCart();
  const [added, setAdded] = useState(false);

  const add = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cart.add({ id: p.id, name: p.name, price: Number(p.price), image: img });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <Link
      to="/product/$id"
      params={{ id: p.id }}
      className="card-clean group flex flex-col relative"
    >
      <div className="aspect-square bg-[var(--color-surface)] overflow-hidden">
        <img
          src={img}
          alt={p.name}
          loading="lazy"
          width={400}
          height={400}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <h3 className="text-sm font-semibold text-[var(--color-ink)] line-clamp-2 leading-tight min-h-[2.5rem]">
          {p.name}
        </h3>
        <div className="flex items-center gap-1 text-xs text-[var(--color-ink-soft)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-3 h-3 ${i < Math.round(p.rating) ? "fill-[var(--color-gold)] text-[var(--color-gold)]" : "text-gray-300"}`}
            />
          ))}
          <span>({p.rating})</span>
        </div>
        <div className="mt-auto flex items-baseline gap-2">
          <span className="price text-lg">{p.price.toLocaleString()} ر.ي</span>
          {p.old_price && (
            <span className="text-xs text-[var(--color-ink-soft)] line-through">
              {p.old_price.toLocaleString()}
            </span>
          )}
        </div>
        <button
          onClick={add}
          className="mt-2 w-full bg-[var(--color-gold)] text-[var(--color-ink)] text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 hover:opacity-90 transition"
        >
          {added ? (
            <>
              <Check className="w-3 h-3" /> تمت الإضافة
            </>
          ) : (
            <>
              <ShoppingCart className="w-3 h-3" /> أضف للسلة
            </>
          )}
        </button>
      </div>
    </Link>
  );
}
