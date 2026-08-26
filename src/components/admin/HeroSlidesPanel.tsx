import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Upload } from "lucide-react";
import {
  adminListHeroSlides,
  adminSaveHeroSlide,
  adminUpdateHeroSlideFlags,
  adminDeleteHeroSlide,
  adminUploadHeroImage,
} from "@/lib/hero-slides.functions";
import { getPwd, Loading, Empty } from "@/components/admin/shared";

/* ===================== Hero Slides ===================== */
type HeroSlideRow = {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_active: boolean;
};

export function HeroSlidesPanel() {
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
    image_url: string;
    alt_text: string | null;
    sort_order: number;
    is_active: boolean;
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
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
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
              <img
                src={r.image_url}
                alt={r.alt_text ?? ""}
                className="w-32 h-20 object-cover rounded-lg shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{r.alt_text || "بدون وصف"}</div>
                <div className="text-xs text-[var(--color-ink-soft)]">ترتيب: {r.sort_order}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => toggleActive(r)}
                    className={`text-xs px-2 py-1 rounded-full font-bold ${
                      r.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
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
                    onClick={() => {
                      setEditing(r);
                      setShowForm(true);
                    }}
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
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={onSave}
        />
      )}
    </div>
  );
}

function HeroSlideFormModal({
  initial,
  defaultSort,
  onCancel,
  onSave,
}: {
  initial: HeroSlideRow | null;
  defaultSort: number;
  onCancel: () => void;
  onSave: (v: {
    image_url: string;
    alt_text: string | null;
    sort_order: number;
    is_active: boolean;
  }) => Promise<void>;
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
    setErr("");
    setUploading(true);
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
    if (!imageUrl) {
      setErr("الصورة مطلوبة");
      return;
    }
    setBusy(true);
    setErr("");
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
          <button onClick={onCancel} className="p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3 text-sm">
          <div>
            <label className="block font-bold mb-1">الصورة</label>
            {imageUrl && (
              <img
                src={imageUrl}
                alt=""
                className="w-full h-40 object-cover rounded-lg mb-2 border"
              />
            )}
            <label className="btn-outline inline-flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              {uploading ? "جاري الرفع..." : imageUrl ? "استبدال الصورة" : "رفع صورة"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) pick(f);
                  e.target.value = "";
                }}
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
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              مفعّلة
            </label>
          </div>
          {err && <p className="text-red-600">{err}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCancel} className="btn-outline flex-1">
              إلغاء
            </button>
            <button type="submit" disabled={busy || uploading} className="btn-gold flex-1">
              {busy ? "..." : "حفظ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
