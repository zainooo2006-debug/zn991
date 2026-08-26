import { useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Sparkles } from "lucide-react";
import { getProducts, getCategories } from "@/lib/catalog.functions";
import { saveProduct, adminDelete } from "@/lib/admin.functions";
import { generateProductContent } from "@/lib/ai-content.functions";
import {
  getPwd,
  ImageUploader,
  Modal,
  Input,
  Textarea,
  Select,
} from "@/components/admin/shared";

/* ===================== Products ===================== */
type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  old_price: number | null;
  images: string[];
  is_bestseller: boolean;
  is_featured: boolean;
  category_id: string | null;
};

export function ProductsPanel() {
  const fetchProducts = useServerFn(getProducts);
  const fetchCats = useServerFn(getCategories);
  const save = useServerFn(saveProduct);
  const del = useServerFn(adminDelete);
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts(),
  });
  const { data: cats = [] } = useQuery({ queryKey: ["admin-cats"], queryFn: () => fetchCats() });
  const [editing, setEditing] = useState<Partial<ProductRow> | null>(null);

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["featured-products"] });
  }, [qc]);

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذا المنتج؟")) return;
    await del({ data: { password: getPwd(), table: "products", id } });
    refresh();
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="font-bold text-lg">المنتجات ({products.length})</h2>
        <div className="flex items-center gap-2">
          <a
            href="/admin/ai-training#content-generator"
            className="btn-outline inline-flex items-center gap-1"
          >
            <Sparkles className="w-4 h-4" /> مولّد المحتوى والمنشورات
          </a>
          <button
            onClick={() => setEditing({ images: [], is_bestseller: false, is_featured: false })}
            className="btn-gold"
          >
            <Plus className="w-4 h-4" /> منتج جديد
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {products.map((p) => (
          <div key={p.id} className="card-clean p-3 flex gap-3">
            <img
              src={p.images?.[0] || ""}
              alt=""
              className="w-16 h-16 rounded-lg object-cover bg-[var(--color-surface)]"
            />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{p.name}</div>
              <div className="text-[var(--color-gold)] font-bold text-sm">
                {Number(p.price).toLocaleString()} ر.ي
              </div>
              <div className="flex gap-1 mt-1 flex-wrap">
                {p.is_bestseller && (
                  <span className="text-[10px] bg-[var(--color-gold-soft)] text-[var(--color-ink)] px-1.5 py-0.5 rounded">
                    الأكثر مبيعاً
                  </span>
                )}
                {(p as ProductRow).is_featured && (
                  <span className="text-[10px] bg-[var(--color-gold)] text-[var(--color-ink)] px-1.5 py-0.5 rounded">
                    مميز
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setEditing(p as ProductRow)}
                className="p-2 text-[var(--color-gold)]"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => onDelete(p.id)} className="p-2 text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing.id ? "تعديل منتج" : "منتج جديد"} onClose={() => setEditing(null)}>
          <ProductForm
            initial={editing}
            categories={cats}
            onSave={async (data) => {
              await save({ data: { password: getPwd(), id: editing.id, data } });
              setEditing(null);
              refresh();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function ProductForm({
  initial,
  categories,
  onSave,
}: {
  initial: Partial<ProductRow>;
  categories: { id: string; name: string }[];
  onSave: (d: {
    name: string;
    description: string | null;
    price: number;
    old_price: number | null;
    images: string[];
    category_id: string | null;
    is_bestseller: boolean;
    is_featured: boolean;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(initial.name || "");
  const [desc, setDesc] = useState(initial.description || "");
  const [price, setPrice] = useState(String(initial.price ?? ""));
  const [oldPrice, setOldPrice] = useState(initial.old_price ? String(initial.old_price) : "");
  const [images, setImages] = useState<string[]>(initial.images || []);
  const [catId, setCatId] = useState(initial.category_id || "");
  const [bestseller, setBestseller] = useState(initial.is_bestseller || false);
  const [featured, setFeatured] = useState(initial.is_featured || false);
  const [busy, setBusy] = useState(false);

  const generate = useServerFn(generateProductContent);
  const [aiBusy, setAiBusy] = useState<"" | "description" | "instagram">("");
  const [instaPost, setInstaPost] = useState("");
  const catName = categories.find((c) => c.id === catId)?.name || "";

  const buildBrief = () =>
    [
      `المنتج: ${name}`,
      catName ? `القسم: ${catName}` : null,
      price ? `السعر: ${price} ر.ي` : null,
      desc ? `الوصف الحالي: ${desc}` : null,
    ]
      .filter(Boolean)
      .join("\n");

  const handleGenDesc = async () => {
    setAiBusy("description");
    try {
      const result = await generate({
        data: { password: getPwd(), brief: buildBrief(), kind: "product" },
      });
      setDesc(result.description);
    } catch (e) {
      alert((e as Error).message);
    }
    setAiBusy("");
  };

  const handleGenInsta = async () => {
    setAiBusy("instagram");
    try {
      const result = await generate({
        data: { password: getPwd(), brief: buildBrief(), kind: "marketing" },
      });
      const withTags = result.hashtags?.length
        ? `${result.marketing_post}\n\n${result.hashtags.join(" ")}`
        : result.marketing_post;
      setInstaPost(withTags);
    } catch (e) {
      alert((e as Error).message);
    }
    setAiBusy("");
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave({
            name,
            description: desc || null,
            price: Number(price),
            old_price: oldPrice ? Number(oldPrice) : null,
            images,
            category_id: catId || null,
            is_bestseller: bestseller,
            is_featured: featured,
          });
        } catch (err) {
          alert((err as Error).message);
        }
        setBusy(false);
      }}
      className="space-y-3"
    >
      <Input label="الاسم *" value={name} onChange={setName} required />
      <div>
        <Textarea label="الوصف" value={desc} onChange={setDesc} />
        <button
          type="button"
          onClick={handleGenDesc}
          disabled={aiBusy !== "" || !name}
          className="btn-outline text-xs mt-1 inline-flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3" />{" "}
          {aiBusy === "description" ? "جاري التوليد..." : "توليد وصف بالذكاء الاصطناعي"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="السعر *" type="number" value={price} onChange={setPrice} required />
        <Input label="السعر القديم (مشطوب)" type="number" value={oldPrice} onChange={setOldPrice} />
      </div>
      <Select
        label="القسم"
        value={catId}
        onChange={setCatId}
        options={[
          { value: "", label: "بدون قسم" },
          ...categories.map((c) => ({ value: c.id, label: c.name })),
        ]}
      />
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={bestseller}
            onChange={(e) => setBestseller(e.target.checked)}
            className="accent-[var(--color-gold)]"
          />
          الأكثر مبيعاً
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="accent-[var(--color-gold)]"
          />
          منتج مميز (يظهر في السلايدر)
        </label>
      </div>
      <ImagesField images={images} onChange={setImages} />
      <div>
        <button
          type="button"
          onClick={handleGenInsta}
          disabled={aiBusy !== "" || !name}
          className="btn-outline text-xs inline-flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3" />{" "}
          {aiBusy === "instagram" ? "جاري التوليد..." : "تجهيز منشور انستغرام"}
        </button>
        {instaPost && (
          <textarea
            readOnly
            value={instaPost}
            rows={6}
            className="w-full mt-2 border border-[var(--color-hairline)] rounded-lg px-3 py-2 text-sm"
          />
        )}
      </div>
      <button type="submit" disabled={busy} className="btn-gold w-full">
        {busy ? "جاري الحفظ..." : "حفظ"}
      </button>
    </form>
  );
}

function ImagesField({ images, onChange }: { images: string[]; onChange: (i: string[]) => void }) {
  const [url, setUrl] = useState("");
  return (
    <div>
      <div className="text-sm font-bold mb-2">الصور</div>
      <div className="flex gap-2 flex-wrap mb-2">
        {images.map((src, i) => (
          <div
            key={i}
            className="relative w-16 h-16 rounded-lg overflow-hidden border border-[var(--color-hairline)]"
          >
            <img src={src} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              className="absolute top-0 left-0 bg-red-600 text-white rounded-bl-lg p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <ImageUploader onUploaded={(u) => onChange([...images, u])} />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="أو ألصق رابط صورة"
          className="flex-1 min-w-40 border border-[var(--color-hairline)] rounded-lg px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            if (url) {
              onChange([...images, url]);
              setUrl("");
            }
          }}
          className="btn-outline text-xs"
        >
          إضافة
        </button>
      </div>
    </div>
  );
}
