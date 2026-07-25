import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shell } from "@/components/layout/Shell";
import { Lock, LogOut, Plus, Pencil, Trash2, X, Upload, Loader2, Sparkles, Eye, EyeOff } from "lucide-react";
import {
  getProducts, getCategories, getServiceCategories, getPackages, getWallets, getSiteContent,
} from "@/lib/catalog.functions";
import {
  saveProduct, saveCategory, saveService, savePackage, saveWallet, saveContent,
  adminDelete, uploadImage, listOrders, updateOrderStatus, adminLogin,
  deleteOrder, listAllReviews, deleteReview,
} from "@/lib/admin.functions";
import {
  adminListCustomerReviews, adminUpdateCustomerReview, adminDeleteCustomerReview,
} from "@/lib/reviews.functions";
import {
  adminListCenters, adminSaveCenter, adminUpdateCenterFlags, adminDeleteCenter,
} from "@/lib/installation-centers.functions";
import {
  adminListHeroSlides, adminSaveHeroSlide, adminUpdateHeroSlideFlags,
  adminDeleteHeroSlide, adminUploadHeroImage,
} from "@/lib/hero-slides.functions";
import {
  WarrantyOverview, WarrantiesTab, WarrantyCustomersTab, WarrantySimpleCrud, WarrantyUsersTab,
} from "@/components/warranty-admin-panels";
import { ThemeManagerPanel } from "@/components/admin/ThemeManagerPanel";
import { CONTENT_DEFAULTS, HOME_SECTION_LABELS, type AboutContent, type FooterContent, type ContactContent, type HomeSectionsConfig, type HomeBannerContent, type HomeSectionId, type BrandingContent } from "@/lib/site-content";
// Session token issued by the server-side `adminLogin` function. The actual
// admin password is never stored in the client bundle or in browser storage.
const TOKEN_KEY = "mycar_admin_token";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "لوحة التحكم — زين" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

type Tab =
 | "orders" | "products" | "categories" | "services" | "packages" | "wallets" | "content" | "site-pages" | "home-builder" | "reviews" | "customer-reviews" | "centers" | "hero"
 | "w-overview" | "w-warranties" | "w-customers" | "w-brands" | "w-films" | "w-branches" | "w-users"
 | "theme";

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
            <h1 className="text-2xl font-black mt-4">لوحة التحكم</h1>
            <p className="text-sm text-[var(--color-ink-soft)] mt-1">أدخل كلمة المرور للمتابعة</p>
            <form onSubmit={submit} className="mt-6 space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة المرور"
                className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)]"
                disabled={busy}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={busy} className="btn-gold w-full">
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

function getPwd() {
  // Returns the server-issued session token. Field name kept as "password"
  // in the server fn API for backward compatibility — the server treats it
  // as an HMAC-signed token, not a raw password.
  return typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) || "" : "";
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("orders");

  const groups: { title: string; tabs: { id: Tab; label: string }[] }[] = [
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
            <h1 className="text-2xl md:text-3xl font-black">لوحة التحكم</h1>
            <p className="text-sm text-[var(--color-ink-soft)]">إدارة المتجر والضمانات</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/admin/website-builder" className="btn-outline"><Sparkles className="w-4 h-4" /> Website Builder</a>
            <a href="/admin/ai-training" className="btn-outline"><Sparkles className="w-4 h-4" /> تدريب المساعد</a>
            <button onClick={onLogout} className="btn-outline"><LogOut className="w-4 h-4" /> خروج</button>
          </div>
        </div>

        {groups.map((g) => (
          <div key={g.title} className="mt-4">
            <div className="text-xs font-bold text-[var(--color-ink-soft)] mb-2">{g.title}</div>
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
          {tab === "home-builder" && <HomeBuilderPanel />}
          {tab === "site-pages" && <SitePagesPanel />}
          {tab === "content" && <ContentPanel />}
          {tab === "w-overview" && <WarrantyOverview />}
          {tab === "w-warranties" && <WarrantiesTab />}
          {tab === "w-customers" && <WarrantyCustomersTab />}
          {tab === "w-brands" && <WarrantySimpleCrud table="warranty_brands" title="الماركات" fields={[{ k: "name", l: "الاسم" }, { k: "logo_url", l: "رابط الشعار" }]} />}
          {tab === "w-films" && <WarrantySimpleCrud table="film_types" title="أنواع اللاصق" fields={[{ k: "name", l: "الاسم" }, { k: "warranty_months", l: "مدة الضمان (شهر)", type: "number" }, { k: "description", l: "الوصف" }]} />}
          {tab === "w-branches" && <WarrantySimpleCrud table="branches" title="الفروع" fields={[{ k: "name", l: "الاسم" }, { k: "address", l: "العنوان" }, { k: "phone", l: "الجوال" }]} />}
          {tab === "w-users" && <WarrantyUsersTab />}
          {tab === "theme" && <ThemeManagerPanel />}
        </div>
      </div>
    </Shell>
  );
}

/* ===================== Orders ===================== */
function OrdersPanel() {
  const fetchOrders = useServerFn(listOrders);
  const updateStatus = useServerFn(updateOrderStatus);
  const removeOrder = useServerFn(deleteOrder);
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchOrders({ data: { password: getPwd() } }),
  });

  const setStatus = async (id: string, status: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateStatus({ data: { password: getPwd(), id, status: status as any } });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const onDeleteOrder = async (id: string) => {
    if (!confirm("حذف هذا الطلب نهائياً؟")) return;
    try {
      await removeOrder({ data: { password: getPwd(), id } });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (err) {
      alert((err as Error).message);
    }
  };

  if (isLoading) return <Loading />;
  if (orders.length === 0) return <Empty msg="لا توجد طلبات بعد" />;

  return (
    <div className="space-y-3">
      {orders.map((o) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = (o.items as any[]) || [];
        return (
          <div key={o.id} className="card-clean p-4">
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div>
                <div className="font-bold">{o.customer_name} • <span dir="ltr">{o.phone}</span></div>
                <div className="text-xs text-[var(--color-ink-soft)]">{new Date(o.created_at).toLocaleString("ar")}</div>
                {o.address && <div className="text-xs mt-1">📍 {o.address}</div>}
              </div>
              <div className="text-left">
                <div className="text-[var(--color-gold)] font-black text-lg">{Number(o.total).toLocaleString()} ر.ي</div>
                <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}
                  className="text-xs border border-[var(--color-hairline)] rounded px-2 py-1 mt-1">
                  <option value="new">جديد</option>
                  <option value="confirmed">مؤكد</option>
                  <option value="shipped">تم الشحن</option>
                  <option value="delivered">تم التوصيل</option>
                  <option value="cancelled">ملغي</option>
                </select>
                {(o.status === "delivered" || o.status === "cancelled") && (
                  <button onClick={() => onDeleteOrder(o.id)}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-red-600 hover:underline">
                    <Trash2 className="w-3 h-3" /> حذف
                  </button>
                )}
              </div>
            </div>
            <ul className="text-sm mt-3 space-y-1 border-t border-[var(--color-hairline)] pt-2">
              {items.map((i, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>{i.name} × {i.qty}</span>
                  <span className="font-bold">{(i.price * i.qty).toLocaleString()} ر.ي</span>
                </li>
              ))}
            </ul>
            {o.wallet_name && <div className="text-xs mt-2 text-[var(--color-ink-soft)]">💳 {o.wallet_name} {o.payment_ref && `— مرجع: ${o.payment_ref}`}</div>}
            {o.notes && <div className="text-xs mt-1 text-[var(--color-ink-soft)]">📝 {o.notes}</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ===================== Image Upload Helper ===================== */
function ImageUploader({ onUploaded }: { onUploaded: (url: string) => void }) {
  const upload = useServerFn(uploadImage);
  const [busy, setBusy] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const result = await upload({ data: { password: getPwd(), filename: file.name, contentType: file.type, base64 } });
      onUploaded(result.url);
    } catch (err) {
      alert("فشل الرفع: " + (err as Error).message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <label className="btn-outline cursor-pointer text-xs">
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
      {busy ? "جاري الرفع..." : "رفع صورة"}
      <input type="file" accept="image/*" onChange={onFile} className="hidden" disabled={busy} />
    </label>
  );
}

/* ===================== Products ===================== */
type ProductRow = {
  id: string; name: string; description: string | null; price: number;
  old_price: number | null; images: string[]; is_bestseller: boolean;
  is_featured: boolean; category_id: string | null;
};

function ProductsPanel() {
  const fetchProducts = useServerFn(getProducts);
  const fetchCats = useServerFn(getCategories);
  const save = useServerFn(saveProduct);
  const del = useServerFn(adminDelete);
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({ queryKey: ["admin-products"], queryFn: () => fetchProducts() });
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
        <button onClick={() => setEditing({ images: [], is_bestseller: false, is_featured: false })} className="btn-gold"><Plus className="w-4 h-4" /> منتج جديد</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {products.map((p) => (
          <div key={p.id} className="card-clean p-3 flex gap-3">
            <img src={p.images?.[0] || ""} alt="" className="w-16 h-16 rounded-lg object-cover bg-[var(--color-surface)]" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{p.name}</div>
              <div className="text-[var(--color-gold)] font-bold text-sm">{Number(p.price).toLocaleString()} ر.ي</div>
              <div className="flex gap-1 mt-1 flex-wrap">
                {p.is_bestseller && <span className="text-[10px] bg-[var(--color-gold-soft)] text-[var(--color-ink)] px-1.5 py-0.5 rounded">الأكثر مبيعاً</span>}
                {(p as ProductRow).is_featured && <span className="text-[10px] bg-[var(--color-gold)] text-[var(--color-ink)] px-1.5 py-0.5 rounded">مميز</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => setEditing(p as ProductRow)} className="p-2 text-[var(--color-gold)]"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => onDelete(p.id)} className="p-2 text-red-600"><Trash2 className="w-4 h-4" /></button>
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

function ProductForm({ initial, categories, onSave }: {
  initial: Partial<ProductRow>;
  categories: { id: string; name: string }[];
  onSave: (d: { name: string; description: string | null; price: number; old_price: number | null; images: string[]; category_id: string | null; is_bestseller: boolean; is_featured: boolean }) => Promise<void>;
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

  return (
    <form onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      try {
        await onSave({
          name, description: desc || null, price: Number(price),
          old_price: oldPrice ? Number(oldPrice) : null,
          images, category_id: catId || null,
          is_bestseller: bestseller, is_featured: featured,
        });
      } catch (err) { alert((err as Error).message); }
      setBusy(false);
    }} className="space-y-3">
      <Input label="الاسم *" value={name} onChange={setName} required />
      <Textarea label="الوصف" value={desc} onChange={setDesc} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="السعر *" type="number" value={price} onChange={setPrice} required />
        <Input label="السعر القديم (مشطوب)" type="number" value={oldPrice} onChange={setOldPrice} />
      </div>
      <Select label="القسم" value={catId} onChange={setCatId} options={[{ value: "", label: "بدون قسم" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={bestseller} onChange={(e) => setBestseller(e.target.checked)} className="accent-[var(--color-gold)]" />
          الأكثر مبيعاً
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="accent-[var(--color-gold)]" />
          منتج مميز (يظهر في السلايدر)
        </label>
      </div>
      <ImagesField images={images} onChange={setImages} />
      <button type="submit" disabled={busy} className="btn-gold w-full">{busy ? "جاري الحفظ..." : "حفظ"}</button>
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
          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[var(--color-hairline)]">
            <img src={src} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              className="absolute top-0 left-0 bg-red-600 text-white rounded-bl-lg p-0.5">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <ImageUploader onUploaded={(u) => onChange([...images, u])} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="أو ألصق رابط صورة"
          className="flex-1 min-w-40 border border-[var(--color-hairline)] rounded-lg px-3 py-1.5 text-sm" />
        <button type="button" onClick={() => { if (url) { onChange([...images, url]); setUrl(""); } }}
          className="btn-outline text-xs">إضافة</button>
      </div>
    </div>
  );
}

/* ===================== Categories ===================== */
function CategoriesPanel() {
  const fetchCats = useServerFn(getCategories);
  const save = useServerFn(saveCategory);
  const del = useServerFn(adminDelete);
  const qc = useQueryClient();
  const { data: cats = [] } = useQuery({ queryKey: ["admin-cats"], queryFn: () => fetchCats() });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editing, setEditing] = useState<any | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-cats"] }); qc.invalidateQueries({ queryKey: ["categories"] }); };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذا القسم؟")) return;
    await del({ data: { password: getPwd(), table: "categories", id } });
    refresh();
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="font-bold text-lg">أقسام المتجر ({cats.length})</h2>
        <button onClick={() => setEditing({ sort_order: cats.length })} className="btn-gold"><Plus className="w-4 h-4" /> قسم جديد</button>
      </div>
      <ul className="space-y-2">
        {cats.map((c) => (
          <li key={c.id} className="card-clean p-3 flex items-center gap-3">
            {c.icon && <img src={c.icon} alt="" className="w-10 h-10 rounded-lg object-cover bg-[var(--color-surface)]" />}
            <div className="flex-1">
              <div className="font-bold">{c.name}</div>
              <div className="text-xs text-[var(--color-ink-soft)]" dir="ltr">{c.slug}</div>
            </div>
            <button onClick={() => setEditing(c)} className="p-2 text-[var(--color-gold)]"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => onDelete(c.id)} className="p-2 text-red-600"><Trash2 className="w-4 h-4" /></button>
          </li>
        ))}
      </ul>
      {editing && (
        <Modal title={editing.id ? "تعديل قسم" : "قسم جديد"} onClose={() => setEditing(null)}>
          <SimpleForm
            initial={editing}
            fields={[
              { key: "name", label: "الاسم *", required: true },
              { key: "slug", label: "المعرّف (slug) *", required: true, ltr: true },
              { key: "icon", label: "رابط الأيقونة/الصورة", image: true },
              { key: "sort_order", label: "الترتيب", type: "number" },
            ]}
            onSave={async (d) => { await save({ data: { password: getPwd(), id: editing.id, data: d } }); setEditing(null); refresh(); }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ===================== Services ===================== */
function ServicesPanel() {
  const fetchSvc = useServerFn(getServiceCategories);
  const save = useServerFn(saveService);
  const del = useServerFn(adminDelete);
  const qc = useQueryClient();
  const { data: svcs = [] } = useQuery({ queryKey: ["admin-svcs"], queryFn: () => fetchSvc() });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editing, setEditing] = useState<any | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-svcs"] }); qc.invalidateQueries({ queryKey: ["services"] }); };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذه الخدمة؟")) return;
    await del({ data: { password: getPwd(), table: "service_categories", id } });
    refresh();
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="font-bold text-lg">الخدمات ({svcs.length})</h2>
        <button onClick={() => setEditing({ sort_order: svcs.length })} className="btn-gold"><Plus className="w-4 h-4" /> خدمة جديدة</button>
      </div>
      <ul className="space-y-2">
        {svcs.map((s) => (
          <li key={s.id} className="card-clean p-3 flex items-center gap-3">
            {s.image_url && <img src={s.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />}
            <div className="flex-1">
              <div className="font-bold">{s.name}</div>
              <div className="text-xs text-[var(--color-ink-soft)] line-clamp-1">{s.short_desc}</div>
            </div>
            <button onClick={() => setEditing(s)} className="p-2 text-[var(--color-gold)]"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => onDelete(s.id)} className="p-2 text-red-600"><Trash2 className="w-4 h-4" /></button>
          </li>
        ))}
      </ul>
      {editing && (
        <Modal title={editing.id ? "تعديل خدمة" : "خدمة جديدة"} onClose={() => setEditing(null)}>
          <SimpleForm
            initial={editing}
            fields={[
              { key: "name", label: "الاسم *", required: true },
              { key: "slug", label: "المعرّف (slug) *", required: true, ltr: true },
              { key: "short_desc", label: "الوصف القصير" },
              { key: "long_desc", label: "الوصف الكامل", textarea: true },
              { key: "image_url", label: "رابط الصورة", image: true },
              { key: "sort_order", label: "الترتيب", type: "number" },
            ]}
            onSave={async (d) => { await save({ data: { password: getPwd(), id: editing.id, data: d } }); setEditing(null); refresh(); }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ===================== Packages ===================== */
function PackagesPanel() {
  const fetchPkg = useServerFn(getPackages);
  const save = useServerFn(savePackage);
  const del = useServerFn(adminDelete);
  const qc = useQueryClient();
  const { data: pkgs = [] } = useQuery({ queryKey: ["admin-pkgs"], queryFn: () => fetchPkg() });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editing, setEditing] = useState<any | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-pkgs"] }); qc.invalidateQueries({ queryKey: ["packages"] }); };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذه البكج؟")) return;
    await del({ data: { password: getPwd(), table: "packages", id } });
    refresh();
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="font-bold text-lg">البكجات ({pkgs.length})</h2>
        <button onClick={() => setEditing({ features: [], sort_order: pkgs.length })} className="btn-gold"><Plus className="w-4 h-4" /> بكج جديدة</button>
      </div>
      <ul className="space-y-2">
        {pkgs.map((p) => (
          <li key={p.id} className="card-clean p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-bold">{p.name} {p.badge && <span className="text-xs bg-[var(--color-gold-soft)] px-2 py-0.5 rounded-full">{p.badge}</span>}</div>
              <div className="text-[var(--color-gold)] font-bold text-sm">{p.price} ر.ي</div>
            </div>
            <button onClick={() => setEditing(p)} className="p-2 text-[var(--color-gold)]"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => onDelete(p.id)} className="p-2 text-red-600"><Trash2 className="w-4 h-4" /></button>
          </li>
        ))}
      </ul>
      {editing && (
        <Modal title={editing.id ? "تعديل بكج" : "بكج جديدة"} onClose={() => setEditing(null)}>
          <PackageForm
            initial={editing}
            onSave={async (d) => { await save({ data: { password: getPwd(), id: editing.id, data: d } }); setEditing(null); refresh(); }}
          />
        </Modal>
      )}
    </div>
  );
}

function PackageForm({ initial, onSave }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initial: any;
  onSave: (d: { name: string; slug: string; description: string | null; price: string; old_price: string | null; features: string[]; badge: string | null; sort_order: number }) => Promise<void>;
}) {
  const [name, setName] = useState(initial.name || "");
  const [slug, setSlug] = useState(initial.slug || "");
  const [desc, setDesc] = useState(initial.description || "");
  const [price, setPrice] = useState(initial.price || "");
  const [oldP, setOldP] = useState(initial.old_price || "");
  const [badge, setBadge] = useState(initial.badge || "");
  const [features, setFeatures] = useState<string[]>(initial.features || []);
  const [feat, setFeat] = useState("");
  const [order, setOrder] = useState(String(initial.sort_order ?? 0));
  const [busy, setBusy] = useState(false);

  return (
    <form onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      try {
        await onSave({ name, slug, description: desc || null, price, old_price: oldP || null, features, badge: badge || null, sort_order: Number(order) });
      } catch (err) { alert((err as Error).message); }
      setBusy(false);
    }} className="space-y-3">
      <Input label="الاسم *" value={name} onChange={setName} required />
      <Input label="المعرّف *" value={slug} onChange={setSlug} required ltr />
      <Textarea label="الوصف" value={desc} onChange={setDesc} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="السعر *" value={price} onChange={setPrice} required />
        <Input label="السعر القديم" value={oldP} onChange={setOldP} />
      </div>
      <Input label="الشارة (Badge)" value={badge} onChange={setBadge} />
      <div>
        <div className="text-sm font-bold mb-1">المميزات</div>
        <ul className="space-y-1 mb-2">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm bg-[var(--color-surface)] rounded px-2 py-1">
              <span className="flex-1">{f}</span>
              <button type="button" onClick={() => setFeatures(features.filter((_, idx) => idx !== i))} className="text-red-600"><X className="w-3 h-3" /></button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input value={feat} onChange={(e) => setFeat(e.target.value)} placeholder="ميزة جديدة"
            className="flex-1 border border-[var(--color-hairline)] rounded-lg px-3 py-1.5 text-sm" />
          <button type="button" onClick={() => { if (feat) { setFeatures([...features, feat]); setFeat(""); } }} className="btn-outline text-xs">إضافة</button>
        </div>
      </div>
      <Input label="الترتيب" type="number" value={order} onChange={setOrder} />
      <button type="submit" disabled={busy} className="btn-gold w-full">{busy ? "..." : "حفظ"}</button>
    </form>
  );
}

/* ===================== Wallets ===================== */
function WalletsPanel() {
  const fetchW = useServerFn(getWallets);
  const save = useServerFn(saveWallet);
  const del = useServerFn(adminDelete);
  const qc = useQueryClient();
  const { data: wallets = [] } = useQuery({ queryKey: ["admin-wallets"], queryFn: () => fetchW() });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editing, setEditing] = useState<any | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-wallets"] }); qc.invalidateQueries({ queryKey: ["wallets"] }); };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذه المحفظة؟")) return;
    await del({ data: { password: getPwd(), table: "wallets", id } });
    refresh();
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="font-bold text-lg">المحافظ ({wallets.length})</h2>
        <button onClick={() => setEditing({ sort_order: wallets.length })} className="btn-gold"><Plus className="w-4 h-4" /> محفظة جديدة</button>
      </div>
      <ul className="space-y-2">
        {wallets.map((w) => (
          <li key={w.id} className="card-clean p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-bold">{w.name}</div>
              <div className="text-xs text-[var(--color-ink-soft)]" dir="ltr">{w.account_number}</div>
            </div>
            <button onClick={() => setEditing(w)} className="p-2 text-[var(--color-gold)]"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => onDelete(w.id)} className="p-2 text-red-600"><Trash2 className="w-4 h-4" /></button>
          </li>
        ))}
      </ul>
      {editing && (
        <Modal title={editing.id ? "تعديل محفظة" : "محفظة جديدة"} onClose={() => setEditing(null)}>
          <SimpleForm
            initial={editing}
            fields={[
              { key: "name", label: "اسم المحفظة *", required: true },
              { key: "account_number", label: "الرقم/الحساب *", required: true, ltr: true },
              { key: "sort_order", label: "الترتيب", type: "number" },
            ]}
            onSave={async (d) => { await save({ data: { password: getPwd(), id: editing.id, data: d } }); setEditing(null); refresh(); }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ===================== Content (key/value) ===================== */
function HomeBuilderPanel() {
  const fetchContent = useServerFn(getSiteContent);
  const save = useServerFn(saveContent);
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["admin-content"], queryFn: () => fetchContent() });

  const getValue = <K extends keyof typeof CONTENT_DEFAULTS>(key: K): (typeof CONTENT_DEFAULTS)[K] => {
    const row = rows.find((r) => r.key === key);
    if (!row || typeof row.value !== "object" || row.value === null || Array.isArray(row.value)) {
      return CONTENT_DEFAULTS[key];
    }
    return { ...CONTENT_DEFAULTS[key], ...(row.value as Record<string, unknown>) };
  };

  const [sections, setSections] = useState<HomeSectionsConfig | null>(null);
  const [banner, setBanner] = useState<HomeBannerContent | null>(null);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (!isLoading && !sections) {
      setSections(getValue("home_sections"));
      setBanner(getValue("home_banner"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const saveKey = async (key: keyof typeof CONTENT_DEFAULTS, value: unknown) => {
    await save({ data: { password: getPwd(), key, value } });
    qc.invalidateQueries({ queryKey: ["admin-content"] });
    qc.invalidateQueries({ queryKey: ["site-content"] });
    setSavedMsg("تم الحفظ ✓ — التغيير ظاهر في الموقع الآن");
    setTimeout(() => setSavedMsg(""), 2500);
  };

  const move = (id: HomeSectionId, dir: -1 | 1) => {
    if (!sections) return;
    const idx = sections.order.indexOf(id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sections.order.length) return;
    const order = [...sections.order];
    [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
    setSections({ ...sections, order });
  };

  const toggleHidden = (id: HomeSectionId) => {
    if (!sections) return;
    const hidden = sections.hidden.includes(id)
      ? sections.hidden.filter((x) => x !== id)
      : [...sections.hidden, id];
    setSections({ ...sections, hidden });
  };

  if (isLoading || !sections || !banner) {
    return <div className="text-sm text-[var(--color-ink-soft)]">جارِ التحميل...</div>;
  }

  return (
    <div className="space-y-8">
      <p className="text-xs text-[var(--color-ink-soft)]">
        تحكم بترتيب أقسام الصفحة الرئيسية، أخفِ أي قسم مؤقتًا، وفعّل بانر موسمي (رمضان، الجمعة البيضاء...) — كل هذا بدون فتح الكود. السلايدر الرئيسي (الهيرو) ثابت دائمًا في الأعلى.
      </p>
      {savedMsg && <div className="text-sm font-bold text-green-600">{savedMsg}</div>}

      <div className="card-clean p-4 space-y-3">
        <h3 className="font-bold text-lg">ترتيب وإظهار أقسام الرئيسية</h3>
        <div className="space-y-2">
          {sections.order.map((id, i) => {
            const hidden = sections.hidden.includes(id);
            return (
              <div key={id} className={`flex items-center justify-between gap-3 border rounded-lg px-3 py-2 ${hidden ? "opacity-50 border-dashed" : "border-[var(--color-hairline)]"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--color-ink-soft)] w-5">{i + 1}</span>
                  <span className="font-semibold text-sm">{HOME_SECTION_LABELS[id]}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => move(id, -1)} disabled={i === 0}
                    className="p-1.5 rounded hover:bg-[var(--color-surface)] disabled:opacity-30" aria-label="نقل لأعلى">▲</button>
                  <button type="button" onClick={() => move(id, 1)} disabled={i === sections.order.length - 1}
                    className="p-1.5 rounded hover:bg-[var(--color-surface)] disabled:opacity-30" aria-label="نقل لأسفل">▼</button>
                  <button type="button" onClick={() => toggleHidden(id)}
                    className="p-1.5 rounded hover:bg-[var(--color-surface)] text-[var(--color-gold)]" aria-label={hidden ? "إظهار" : "إخفاء"}>
                    {hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <button className="btn-gold" onClick={() => saveKey("home_sections", sections)}>حفظ الترتيب</button>
      </div>

      <div className="card-clean p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">البانر الموسمي</h3>
          <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
            <input type="checkbox" checked={banner.enabled} onChange={(e) => setBanner({ ...banner, enabled: e.target.checked })} />
            مفعّل
          </label>
        </div>
        <p className="text-xs text-[var(--color-ink-soft)]">يظهر أسفل السلايدر مباشرة عند تفعيله — استخدمه لرمضان، الجمعة البيضاء، أو أي مناسبة موسمية.</p>
        <Input label="العنوان" value={banner.title} onChange={(v) => setBanner({ ...banner, title: v })} />
        <Input label="النص الفرعي" value={banner.subtitle} onChange={(v) => setBanner({ ...banner, subtitle: v })} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="نص الزر" value={banner.buttonText} onChange={(v) => setBanner({ ...banner, buttonText: v })} />
          <Input label="رابط الزر (مثال: /offers)" value={banner.buttonLink} onChange={(v) => setBanner({ ...banner, buttonLink: v })} ltr />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-bold block mb-1">لون الخلفية</span>
            <input type="color" value={banner.bgColor} onChange={(e) => setBanner({ ...banner, bgColor: e.target.value })} className="w-full h-10 rounded-lg border border-[var(--color-hairline)]" />
          </label>
          <label className="block">
            <span className="text-sm font-bold block mb-1">لون النص</span>
            <input type="color" value={banner.textColor} onChange={(e) => setBanner({ ...banner, textColor: e.target.value })} className="w-full h-10 rounded-lg border border-[var(--color-hairline)]" />
          </label>
        </div>
        <button className="btn-gold" onClick={() => saveKey("home_banner", banner)}>حفظ البانر</button>
      </div>
    </div>
  );
}

function SitePagesPanel() {
  const fetchContent = useServerFn(getSiteContent);
  const save = useServerFn(saveContent);
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["admin-content"], queryFn: () => fetchContent() });

  const getValue = <K extends keyof typeof CONTENT_DEFAULTS>(key: K): (typeof CONTENT_DEFAULTS)[K] => {
    const row = rows.find((r) => r.key === key);
    if (!row || typeof row.value !== "object" || row.value === null || Array.isArray(row.value)) {
      return CONTENT_DEFAULTS[key];
    }
    return { ...CONTENT_DEFAULTS[key], ...(row.value as Record<string, string>) };
  };

  const [about, setAbout] = useState<AboutContent | null>(null);
  const [footer, setFooter] = useState<FooterContent | null>(null);
  const [contact, setContact] = useState<ContactContent | null>(null);
  const [branding, setBranding] = useState<BrandingContent | null>(null);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (!isLoading && !about) {
      setAbout(getValue("about_page"));
      setFooter(getValue("footer_content"));
      setContact(getValue("contact_page"));
      setBranding(getValue("branding"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const saveKey = async (key: keyof typeof CONTENT_DEFAULTS, value: unknown) => {
    await save({ data: { password: getPwd(), key, value } });
    qc.invalidateQueries({ queryKey: ["admin-content"] });
    qc.invalidateQueries({ queryKey: ["site-content"] });
    setSavedMsg("تم الحفظ ✓");
    setTimeout(() => setSavedMsg(""), 2000);
  };

  if (isLoading || !about || !footer || !contact || !branding) {
    return <div className="text-sm text-[var(--color-ink-soft)]">جارِ التحميل...</div>;
  }

  return (
    <div className="space-y-8">
      <p className="text-xs text-[var(--color-ink-soft)]">
        عدّل نصوص صفحات الموقع مباشرة — أي تعديل يظهر في الموقع فورًا بدون نشر جديد. إذا ما عدّلت شي، تبقى النصوص كما هي حاليًا.
      </p>
      {savedMsg && <div className="text-sm font-bold text-green-600">{savedMsg}</div>}

      <div className="card-clean p-4 space-y-3">
        <h3 className="font-bold text-lg">شعار الموقع</h3>
        <p className="text-xs text-[var(--color-ink-soft)]">يظهر هذا الشعار في أعلى كل صفحات الموقع بدلاً من الشعار الافتراضي.</p>
        <div className="flex items-center gap-4">
          {branding.logoUrl && (
            <img src={branding.logoUrl} alt="" className="h-14 w-auto object-contain bg-[var(--color-surface)] rounded-lg p-1" />
          )}
          <ImageUploader onUploaded={(u) => setBranding({ ...branding, logoUrl: u })} />
        </div>
        <input
          value={branding.logoUrl}
          onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
          placeholder="أو ألصق رابط الشعار"
          dir="ltr"
          className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 text-sm"
        />
        <button className="btn-gold" onClick={() => saveKey("branding", branding)}>حفظ الشعار</button>
      </div>

      <div className="card-clean p-4 space-y-3">
        <h3 className="font-bold text-lg">صفحة "من نحن"</h3>
        <Textarea label="الفقرة الأولى (بعد كلمة زين)" value={about.intro1} onChange={(v) => setAbout({ ...about, intro1: v })} />
        <Textarea label="الفقرة الثانية" value={about.intro2} onChange={(v) => setAbout({ ...about, intro2: v })} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="عنوان: رسالتنا" value={about.missionTitle} onChange={(v) => setAbout({ ...about, missionTitle: v })} />
          <Input label="عنوان: قيمنا" value={about.valuesTitle} onChange={(v) => setAbout({ ...about, valuesTitle: v })} />
          <Input label="عنوان: فريقنا" value={about.teamTitle} onChange={(v) => setAbout({ ...about, teamTitle: v })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="نص: رسالتنا" value={about.missionText} onChange={(v) => setAbout({ ...about, missionText: v })} />
          <Input label="نص: قيمنا" value={about.valuesText} onChange={(v) => setAbout({ ...about, valuesText: v })} />
          <Input label="نص: فريقنا" value={about.teamText} onChange={(v) => setAbout({ ...about, teamText: v })} />
        </div>
        <button className="btn-gold" onClick={() => saveKey("about_page", about)}>حفظ صفحة "من نحن"</button>
      </div>

      <div className="card-clean p-4 space-y-3">
        <h3 className="font-bold text-lg">الفوتر (أسفل كل صفحة)</h3>
        <Textarea label="الوصف المختصر" value={footer.description} onChange={(v) => setFooter({ ...footer, description: v })} />
        <Input label="اسم المدير العام" value={footer.managerName} onChange={(v) => setFooter({ ...footer, managerName: v })} />
        <Input label="العنوان" value={footer.address} onChange={(v) => setFooter({ ...footer, address: v })} />
        <Input label="أوقات العمل" value={footer.hours} onChange={(v) => setFooter({ ...footer, hours: v })} />
        <button className="btn-gold" onClick={() => saveKey("footer_content", footer)}>حفظ الفوتر</button>
      </div>

      <div className="card-clean p-4 space-y-3">
        <h3 className="font-bold text-lg">صفحة "اتصل بنا"</h3>
        <Input label="الجملة التعريفية" value={contact.subtitle} onChange={(v) => setContact({ ...contact, subtitle: v })} />
        <Input label="العنوان" value={contact.address} onChange={(v) => setContact({ ...contact, address: v })} />
        <Textarea label="أوقات العمل (سطر جديد = فاصل)" value={contact.hours} onChange={(v) => setContact({ ...contact, hours: v })} />
        <button className="btn-gold" onClick={() => saveKey("contact_page", contact)}>حفظ صفحة "اتصل بنا"</button>
      </div>
    </div>
  );
          }
function ContentPanel() {
  const fetchContent = useServerFn(getSiteContent);
  const save = useServerFn(saveContent);
  const del = useServerFn(adminDelete);
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({ queryKey: ["admin-content"], queryFn: () => fetchContent() });
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-content"] });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsed: unknown = value;
    try { parsed = JSON.parse(value); } catch { /* keep string */ }
    await save({ data: { password: getPwd(), key, value: parsed } });
    setKey(""); setValue(""); refresh();
  };

  return (
    <div>
      <h2 className="font-bold text-lg mb-2">محتوى الموقع</h2>
      <p className="text-xs text-[var(--color-ink-soft)] mb-4">قيم نصية أو JSON. مفاتيح أمثلة: <code>top_bar_text</code>, <code>hero_title</code>, <code>about_html</code>.</p>

      <form onSubmit={submit} className="card-clean p-4 space-y-3 mb-6">
        <Input label="المفتاح" value={key} onChange={setKey} required ltr />
        <Textarea label="القيمة (نص أو JSON)" value={value} onChange={setValue} />
        <button type="submit" className="btn-gold">حفظ / تحديث</button>
      </form>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.key} className="card-clean p-3">
            <div className="flex justify-between items-start gap-2">
              <div className="font-bold text-sm" dir="ltr">{r.key}</div>
              <div className="flex gap-1">
                <button onClick={() => { setKey(r.key); setValue(typeof r.value === "string" ? r.value : JSON.stringify(r.value, null, 2)); }}
                  className="p-1.5 text-[var(--color-gold)]"><Pencil className="w-4 h-4" /></button>
                <button onClick={async () => {
                  if (!confirm("حذف؟")) return;
                  await del({ data: { password: getPwd(), table: "site_content", id: r.key } }); refresh();
                }} className="p-1.5 text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <pre className="text-xs text-[var(--color-ink-soft)] mt-1 whitespace-pre-wrap break-all">{typeof r.value === "string" ? r.value : JSON.stringify(r.value, null, 2)}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ===================== Reviews ===================== */
function ReviewsPanel() {
  const fetchReviews = useServerFn(listAllReviews);
  const remove = useServerFn(deleteReview);
  const qc = useQueryClient();
  const [negativeOnly, setNegativeOnly] = useState(false);
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-reviews", negativeOnly],
    queryFn: () => fetchReviews({ data: { password: getPwd(), maxRating: negativeOnly ? 2 : null } }),
  });

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذا التقييم؟")) return;
    try {
      await remove({ data: { password: getPwd(), id } });
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="font-bold text-lg">التقييمات ({reviews.length})</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setNegativeOnly(false)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold ${!negativeOnly ? "bg-[var(--color-gold)] text-[var(--color-ink)]" : "bg-[var(--color-surface)] text-[var(--color-ink-soft)]"}`}
          >
            الكل
          </button>
          <button
            onClick={() => setNegativeOnly(true)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold ${negativeOnly ? "bg-red-600 text-white" : "bg-[var(--color-surface)] text-[var(--color-ink-soft)]"}`}
          >
            السلبية (≤ نجمتين)
          </button>
        </div>
      </div>
      {isLoading ? (
        <Loading />
      ) : reviews.length === 0 ? (
        <Empty msg="لا توجد تقييمات" />
      ) : (
        <ul className="space-y-2">
          {reviews.map((r) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prod = (r as any).products as { name?: string } | null;
            return (
              <li key={r.id} className="card-clean p-3">
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{r.customer_name}</span>
                      <span className="text-xs text-[var(--color-gold)]">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                      {r.rating <= 2 && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">سلبي</span>}
                    </div>
                    {prod?.name && <div className="text-xs text-[var(--color-ink-soft)] mt-0.5">المنتج: {prod.name}</div>}
                    {r.comment && <p className="text-sm mt-1 leading-relaxed">{r.comment}</p>}
                    <div className="text-[10px] text-[var(--color-ink-soft)] mt-1">{new Date(r.created_at).toLocaleString("ar")}</div>
                  </div>
                  <button onClick={() => onDelete(r.id)} className="p-2 text-red-600" title="حذف">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ===================== Customer Reviews (site-wide) ===================== */
function CustomerReviewsPanel() {
  const listFn = useServerFn(adminListCustomerReviews);
  const updateFn = useServerFn(adminUpdateCustomerReview);
  const deleteFn = useServerFn(adminDeleteCustomerReview);
  const qc = useQueryClient();
  const [status, setStatus] = useState<"all" | "pending" | "approved">("pending");
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-customer-reviews", status],
    queryFn: () => listFn({ data: { password: getPwd(), status } }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-customer-reviews"] });

  const toggleApprove = async (id: string, current: boolean) => {
    try { await updateFn({ data: { password: getPwd(), id, is_approved: !current } }); refresh(); }
    catch (e) { alert((e as Error).message); }
  };
  const toggleFeature = async (id: string, current: boolean) => {
    try { await updateFn({ data: { password: getPwd(), id, is_featured: !current } }); refresh(); }
    catch (e) { alert((e as Error).message); }
  };
  const onDelete = async (id: string) => {
    if (!confirm("حذف هذا التقييم نهائياً؟")) return;
    try { await deleteFn({ data: { password: getPwd(), id } }); refresh(); }
    catch (e) { alert((e as Error).message); }
  };

  const tabs: { id: typeof status; label: string }[] = [
    { id: "pending", label: "بانتظار الموافقة" },
    { id: "approved", label: "الموافق عليها" },
    { id: "all", label: "الكل" },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="font-bold text-lg">آراء العملاء ({reviews.length})</h2>
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setStatus(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${status === t.id ? "bg-[var(--color-gold)] text-[var(--color-ink)]" : "bg-[var(--color-surface)] text-[var(--color-ink-soft)]"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? <Loading /> : reviews.length === 0 ? <Empty msg="لا توجد تقييمات" /> : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="card-clean p-4">
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{r.customer_name}</span>
                    {r.city && <span className="text-xs text-[var(--color-ink-soft)]">— {r.city}</span>}
                    <span className="text-xs text-[var(--color-gold)]">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    {r.is_approved ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">موافق</span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">بانتظار</span>
                    )}
                    {r.is_featured && <span className="text-[10px] bg-[var(--color-gold-soft)] px-2 py-0.5 rounded-full font-bold">مميّز</span>}
                  </div>
                  <p className="text-sm mt-2 leading-relaxed">{r.comment}</p>
                  {r.images && r.images.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {r.images.map((src) => (
                        <a key={src} href={src} target="_blank" rel="noreferrer" className="block w-16 h-16 rounded overflow-hidden bg-[var(--color-hairline)]">
                          <img src={src} alt="" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-[var(--color-ink-soft)] mt-2">{new Date(r.created_at).toLocaleString("ar")}</div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => toggleApprove(r.id, r.is_approved)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${r.is_approved ? "bg-slate-200 text-slate-700" : "bg-emerald-600 text-white"}`}>
                    {r.is_approved ? "إلغاء الموافقة" : "موافقة"}
                  </button>
                  {r.is_approved && (
                    <button onClick={() => toggleFeature(r.id, r.is_featured)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${r.is_featured ? "bg-[var(--color-gold-soft)]" : "bg-[var(--color-surface)] border border-[var(--color-hairline)]"}`}>
                      {r.is_featured ? "إلغاء التمييز" : "تمييز"}
                    </button>
                  )}
                  <button onClick={() => onDelete(r.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white flex items-center gap-1 justify-center">
                    <Trash2 className="w-3 h-3" /> حذف
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ===================== Installation Centers ===================== */
type CenterRow = {
  id: string; name: string; city: string; address: string | null;
  phone: string | null; whatsapp: string | null; google_maps_url: string | null;
  logo_url: string | null; images: string[]; services: string[]; is_active: boolean; is_approved: boolean; sort_order: number;
};

function InstallationCentersPanel() {
  const listFn = useServerFn(adminListCenters);
  const saveFn = useServerFn(adminSaveCenter);
  const flagsFn = useServerFn(adminUpdateCenterFlags);
  const delFn = useServerFn(adminDeleteCenter);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<CenterRow> | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-centers"],
    queryFn: () => listFn({ data: { password: getPwd() } }) as Promise<CenterRow[]>,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-centers"] });

  const toggle = async (id: string, key: "is_approved" | "is_active", val: boolean) => {
    try { await flagsFn({ data: { password: getPwd(), id, [key]: val } }); refresh(); }
    catch (e) { alert((e as Error).message); }
  };
  const onDelete = async (id: string) => {
    if (!confirm("حذف المركز نهائياً؟")) return;
    try { await delFn({ data: { password: getPwd(), id } }); refresh(); }
    catch (e) { alert((e as Error).message); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="font-bold text-lg">مراكز التركيب ({rows.length})</h2>
        <button onClick={() => setEditing({})} className="btn-gold inline-flex items-center gap-2"><Plus className="w-4 h-4" /> مركز جديد</button>
      </div>

      {isLoading ? <Loading /> : rows.length === 0 ? <Empty msg="لا توجد مراكز بعد" /> : (
        <ul className="space-y-3">
          {rows.map((c) => (
            <li key={c.id} className="card-clean p-4">
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div className="flex gap-3 flex-1 min-w-0">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
                  ) : <div className="w-14 h-14 rounded-lg bg-[var(--color-gold-soft)]" />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{c.name}</span>
                      <span className="text-xs text-[var(--color-ink-soft)]">— {c.city}</span>
                      {c.is_approved
                        ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">معتمد</span>
                        : <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">بانتظار</span>}
                      {!c.is_active && <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">موقوف</span>}
                    </div>
                    {c.address && <div className="text-xs text-[var(--color-ink-soft)] mt-1">{c.address}</div>}
                    <div className="text-xs text-[var(--color-ink-soft)] mt-1 flex flex-wrap gap-3">
                      {c.phone && <span>📞 {c.phone}</span>}
                      {c.whatsapp && <span>💬 {c.whatsapp}</span>}
                      {c.google_maps_url && <a href={c.google_maps_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">الموقع</a>}
                    </div>
                    {c.services?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.services.map((s) => <span key={s} className="text-[10px] bg-[var(--color-surface)] px-2 py-0.5 rounded-full">{s}</span>)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => toggle(c.id, "is_approved", !c.is_approved)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${c.is_approved ? "bg-slate-200 text-slate-700" : "bg-emerald-600 text-white"}`}>
                    {c.is_approved ? "إلغاء الاعتماد" : "اعتماد"}
                  </button>
                  <button onClick={() => toggle(c.id, "is_active", !c.is_active)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-hairline)]">
                    {c.is_active ? "إيقاف" : "تفعيل"}
                  </button>
                  <button onClick={() => setEditing(c)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--color-gold-soft)] flex items-center gap-1 justify-center">
                    <Pencil className="w-3 h-3" /> تعديل
                  </button>
                  <button onClick={() => onDelete(c.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white flex items-center gap-1 justify-center">
                    <Trash2 className="w-3 h-3" /> حذف
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Modal title={editing.id ? "تعديل مركز" : "مركز جديد"} onClose={() => setEditing(null)}>
          <CenterForm
            initial={editing}
            onSave={async (values) => {
              await saveFn({ data: { password: getPwd(), id: editing.id ?? null, values } });
              setEditing(null); refresh();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function CenterForm({ initial, onSave }: { initial: Partial<CenterRow>; onSave: (v: Omit<CenterRow, "id">) => Promise<void> }) {
  const [v, setV] = useState({
    name: initial.name ?? "",
    city: initial.city ?? "",
    address: initial.address ?? "",
    phone: initial.phone ?? "",
    whatsapp: initial.whatsapp ?? "",
    google_maps_url: initial.google_maps_url ?? "",
    logo_url: initial.logo_url ?? "",
    images: initial.images ?? [],
    services: (initial.services ?? []).join("، "),
    is_active: initial.is_active ?? true,
    is_approved: initial.is_approved ?? false,
    sort_order: initial.sort_order ?? 0,
  });
  const [busy, setBusy] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const up = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((p) => ({ ...p, [k]: val }));

  const addImageUrl = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) { alert("الرجاء إدخال رابط صحيح يبدأ بـ http:// أو https://"); return; }
    up("images", [...v.images, url]);
    setNewImageUrl("");
  };

  const removeImage = (idx: number) => up("images", v.images.filter((_, i) => i !== idx));

  return (
    <form onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      try {
        await onSave({
          name: v.name.trim(),
          city: v.city.trim(),
          address: v.address.trim() || null,
          phone: v.phone.trim() || null,
          whatsapp: v.whatsapp.trim() || null,
          google_maps_url: v.google_maps_url.trim() || null,
          logo_url: v.logo_url.trim() || null,
          images: v.images.filter(Boolean),
          services: v.services.split(/[,،\n]/).map((s) => s.trim()).filter(Boolean),
          is_active: v.is_active,
          is_approved: v.is_approved,
          sort_order: Number(v.sort_order) || 0,
        });
      } catch (err) { alert((err as Error).message); }
      setBusy(false);
    }} className="space-y-3">
      <Input label="الاسم *" value={v.name} onChange={(x) => up("name", x)} required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="المدينة *" value={v.city} onChange={(x) => up("city", x)} required />
        <Input label="ترتيب العرض" type="number" value={String(v.sort_order)} onChange={(x) => up("sort_order", Number(x) as never)} />
      </div>
      <Input label="العنوان" value={v.address} onChange={(x) => up("address", x)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="رقم الهاتف" value={v.phone} onChange={(x) => up("phone", x)} ltr />
        <Input label="واتساب" value={v.whatsapp} onChange={(x) => up("whatsapp", x)} ltr />
      </div>
      <Input label="رابط خرائط جوجل" value={v.google_maps_url} onChange={(x) => up("google_maps_url", x)} ltr />
      <div>
        <Input label="رابط الشعار" value={v.logo_url} onChange={(x) => up("logo_url", x)} ltr />
        <div className="mt-2 flex items-center gap-2">
          <ImageUploader onUploaded={(u) => up("logo_url", u)} />
          {v.logo_url && <img src={v.logo_url} alt="" className="w-12 h-12 rounded object-cover" />}
        </div>
      </div>

      <div>
        <span className="text-sm font-bold block mb-1">صور المركز</span>
        <div className="flex flex-wrap gap-2 mb-2">
          {v.images.map((src, idx) => (
            <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[var(--color-hairline)] bg-[var(--color-surface)]">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => removeImage(idx)} className="absolute top-0.5 left-0.5 bg-red-600 text-white rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            placeholder="رابط صورة جديدة"
            className="flex-1 border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)] text-sm"
            dir="ltr"
          />
          <button type="button" onClick={addImageUrl} className="btn-outline text-xs px-3">إضافة</button>
        </div>
        <div className="mt-2">
          <ImageUploader onUploaded={(u) => up("images", [...v.images, u])} />
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-bold block mb-1">الخدمات (افصل بفاصلة)</span>
        <input value={v.services} onChange={(e) => up("services", e.target.value)}
          placeholder="حماية الطلاء، تظليل، سيراميك"
          className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)]" />
      </label>
      <div className="flex gap-4">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={v.is_approved} onChange={(e) => up("is_approved", e.target.checked)} />
          معتمد (يظهر للعامة)
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={v.is_active} onChange={(e) => up("is_active", e.target.checked)} />
          مفعّل
        </label>
      </div>
      <button type="submit" disabled={busy} className="btn-gold w-full">{busy ? "..." : "حفظ"}</button>
    </form>
  );
}



function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-[var(--color-hairline)] sticky top-0 bg-white">
          <h3 className="font-black text-lg">{title}</h3>
          <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required, ltr }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; ltr?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold block mb-1">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} dir={ltr ? "ltr" : undefined}
        className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)]" />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-bold block mb-1">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4}
        className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)] font-mono text-sm" />
    </label>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold block mb-1">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)]">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

type FieldDef = { key: string; label: string; required?: boolean; ltr?: boolean; textarea?: boolean; image?: boolean; type?: string };

function SimpleForm({ initial, fields, onSave }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initial: any;
  fields: FieldDef[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (data: any) => Promise<void>;
}) {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, initial[f.key] != null ? String(initial[f.key]) : ""])),
  );
  const [busy, setBusy] = useState(false);
  const update = (k: string, v: string) => setVals((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = {};
        for (const f of fields) {
          const v = vals[f.key];
          data[f.key] = f.type === "number" ? Number(v || 0) : (v || null);
        }
        await onSave(data);
      } catch (err) { alert((err as Error).message); }
      setBusy(false);
    }} className="space-y-3">
      {fields.map((f) => (
        <div key={f.key}>
          {f.textarea ? (
            <Textarea label={f.label} value={vals[f.key]} onChange={(v) => update(f.key, v)} />
          ) : (
            <Input label={f.label} value={vals[f.key]} onChange={(v) => update(f.key, v)} type={f.type || "text"} required={f.required} ltr={f.ltr} />
          )}
          {f.image && (
            <div className="mt-1 flex items-center gap-2">
              <ImageUploader onUploaded={(u) => update(f.key, u)} />
              {vals[f.key] && <img src={vals[f.key]} alt="" className="w-12 h-12 rounded object-cover" />}
            </div>
          )}
        </div>
      ))}
      <button type="submit" disabled={busy} className="btn-gold w-full">{busy ? "..." : "حفظ"}</button>
    </form>
  );
}

function Loading() {
  return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--color-gold)]" /></div>;
}
function Empty({ msg }: { msg: string }) {
  return <div className="text-center py-12 text-[var(--color-ink-soft)]">{msg}</div>;
}

/* ===================== Hero Slides ===================== */
type HeroSlideRow = {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_active: boolean;
};

function HeroSlidesPanel() {
  const list = useServerFn(adminListHeroSlides);
  const save = useServerFn(adminSaveHeroSlide);
  const flags = useServerFn(adminUpdateHeroSlideFlags);
  const remove = useServerFn(adminDeleteHeroSlide);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<HeroSlideRow | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-hero-slides"],
    queryFn: () => list({ data: { password: getPwd() } }) as Promise<HeroSlideRow[]>,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-hero-slides"] });
    qc.invalidateQueries({ queryKey: ["hero-slides"] });
  };

  const toggleActive = async (r: HeroSlideRow) => {
    await flags({ data: { password: getPwd(), id: r.id, is_active: !r.is_active } });
    invalidate();
  };

  const move = async (r: HeroSlideRow, dir: -1 | 1) => {
    const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((x) => x.id === r.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    await Promise.all([
      flags({ data: { password: getPwd(), id: r.id, sort_order: swap.sort_order } }),
      flags({ data: { password: getPwd(), id: swap.id, sort_order: r.sort_order } }),
    ]);
    invalidate();
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذه الشريحة؟")) return;
    await remove({ data: { password: getPwd(), id } });
    invalidate();
  };

  const onSave = async (values: {
    image_url: string; alt_text: string | null; sort_order: number; is_active: boolean;
  }) => {
    await save({ data: { password: getPwd(), id: editing?.id ?? null, values } });
    setShowForm(false);
    setEditing(null);
    invalidate();
  };

  if (isLoading) return <Loading />;

  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">إدارة السلايدر</h2>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="btn-gold inline-flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> إضافة صورة
        </button>
      </div>

      {sorted.length === 0 ? (
        <Empty msg="لا توجد شرائح بعد. أضف أول صورة." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sorted.map((r, idx) => (
            <div key={r.id} className="card-clean p-3 flex gap-3">
              <img src={r.image_url} alt={r.alt_text ?? ""} className="w-32 h-20 object-cover rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{r.alt_text || "بدون وصف"}</div>
                <div className="text-xs text-[var(--color-ink-soft)]">ترتيب: {r.sort_order}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => toggleActive(r)}
                    className={`text-xs px-2 py-1 rounded-full font-bold ${
                      r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {r.is_active ? "مفعّلة" : "متوقفة"}
                  </button>
                  <button
                    onClick={() => move(r, -1)}
                    disabled={idx === 0}
                    className="text-xs px-2 py-1 rounded-full bg-[var(--color-surface)] disabled:opacity-40"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => move(r, 1)}
                    disabled={idx === sorted.length - 1}
                    className="text-xs px-2 py-1 rounded-full bg-[var(--color-surface)] disabled:opacity-40"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => { setEditing(r); setShowForm(true); }}
                    className="text-xs px-2 py-1 rounded-full bg-[var(--color-gold-soft)] inline-flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" /> تعديل
                  </button>
                  <button
                    onClick={() => onDelete(r.id)}
                    className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-600 inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <HeroSlideFormModal
          initial={editing}
          defaultSort={editing?.sort_order ?? (sorted.at(-1)?.sort_order ?? 0) + 10}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          onSave={onSave}
        />
      )}
    </div>
  );
}

function HeroSlideFormModal({
  initial, defaultSort, onCancel, onSave,
}: {
  initial: HeroSlideRow | null;
  defaultSort: number;
  onCancel: () => void;
  onSave: (v: { image_url: string; alt_text: string | null; sort_order: number; is_active: boolean }) => Promise<void>;
}) {
  const upload = useServerFn(adminUploadHeroImage);
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [alt, setAlt] = useState(initial?.alt_text ?? "");
  const [sortOrder, setSortOrder] = useState<number>(initial?.sort_order ?? defaultSort);
  const [isActive, setIsActive] = useState<boolean>(initial?.is_active ?? true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const pick = async (file: File) => {
    setErr(""); setUploading(true);
    try {
      const fd = new FormData();
      fd.append("password", getPwd());
      fd.append("file", file);
      const { url } = await upload({ data: fd });
      setImageUrl(url);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) { setErr("الصورة مطلوبة"); return; }
    setBusy(true); setErr("");
    try {
      await onSave({
        image_url: imageUrl,
        alt_text: alt.trim() || null,
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black">{initial ? "تعديل شريحة" : "إضافة شريحة"}</h3>
          <button onClick={onCancel} className="p-1"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3 text-sm">
          <div>
            <label className="block font-bold mb-1">الصورة</label>
            {imageUrl && (
              <img src={imageUrl} alt="" className="w-full h-40 object-cover rounded-lg mb-2 border" />
            )}
            <label className="btn-outline inline-flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              {uploading ? "جاري الرفع..." : (imageUrl ? "استبدال الصورة" : "رفع صورة")}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ""; }}
                disabled={uploading}
              />
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="أو الصق رابط الصورة"
              className="mt-2 w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-bold mb-1">الوصف البديل (اختياري)</label>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">الترتيب</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2"
              />
            </div>
            <label className="flex items-end gap-2 pb-2 font-bold">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              مفعّلة
            </label>
          </div>
          {err && <p className="text-red-600">{err}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCancel} className="btn-outline flex-1">إلغاء</button>
            <button type="submit" disabled={busy || uploading} className="btn-gold flex-1">
              {busy ? "..." : "حفظ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
