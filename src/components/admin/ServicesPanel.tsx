import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Sparkles } from "lucide-react";
import { getServiceCategories } from "@/lib/catalog.functions";
import { saveService, adminDelete } from "@/lib/admin.functions";
import { generateProductContent } from "@/lib/ai-content.functions";
import { resolveImage } from "@/lib/asset-map";
import { getPwd, Modal, Input, Textarea, ImageUploader } from "@/components/admin/shared";

/* ===================== Services ===================== */

// Normalizes a slug: trims, lowercases, replaces spaces/invalid chars with "-".
// Prevents the "details page won't open" bug caused by stray spaces or
// mismatched casing between the saved slug and the URL used to look it up.
function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ServicesPanel() {
  const fetchSvc = useServerFn(getServiceCategories);
  const save = useServerFn(saveService);
  const del = useServerFn(adminDelete);
  const qc = useQueryClient();
  const { data: svcs = [] } = useQuery({ queryKey: ["admin-svcs"], queryFn: () => fetchSvc() });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editing, setEditing] = useState<any | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-svcs"] });
    qc.invalidateQueries({ queryKey: ["services"] });
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذه الخدمة؟")) return;
    await del({ data: { password: getPwd(), table: "service_categories", id } });
    refresh();
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="font-bold text-lg">الخدمات ({svcs.length})</h2>
        <button onClick={() => setEditing({ sort_order: svcs.length })} className="btn-gold">
          <Plus className="w-4 h-4" /> خدمة جديدة
        </button>
      </div>
      <ul className="space-y-2">
        {svcs.map((s) => (
          <li key={s.id} className="card-clean p-3 flex items-center gap-3">
            <img
              src={resolveImage(s.image_url)}
              alt=""
              className="w-12 h-12 rounded-lg object-cover shrink-0"
            />
            <div className="flex-1">
              <div className="font-bold">{s.name}</div>
              <div className="text-xs text-[var(--color-ink-soft)] line-clamp-1">
                {s.short_desc}
              </div>
              <div className="text-[10px] text-[var(--color-ink-soft)]" dir="ltr">
                {s.slug}
              </div>
            </div>
            <button onClick={() => setEditing(s)} className="p-2 text-[var(--color-gold)]">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(s.id)} className="p-2 text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
      {editing && (
        <Modal title={editing.id ? "تعديل خدمة" : "خدمة جديدة"} onClose={() => setEditing(null)}>
          <ServiceForm
            initial={editing}
            existingSlugs={svcs.filter((s) => s.id !== editing.id).map((s) => s.slug)}
            onSave={async (d) => {
              await save({ data: { password: getPwd(), id: editing.id, data: d } });
              setEditing(null);
              refresh();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function ServiceForm({
  initial,
  existingSlugs,
  onSave,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initial: any;
  existingSlugs: string[];
  onSave: (d: {
    name: string;
    slug: string;
    short_desc: string | null;
    long_desc: string | null;
    image_url: string | null;
    sort_order: number;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(initial.name || "");
  const [slug, setSlug] = useState(initial.slug || "");
  const [shortDesc, setShortDesc] = useState(initial.short_desc || "");
  const [longDesc, setLongDesc] = useState(initial.long_desc || "");
  const [imageUrl, setImageUrl] = useState(initial.image_url || "");
  const [sortOrder, setSortOrder] = useState(String(initial.sort_order ?? 0));
  const [busy, setBusy] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!initial.slug);

  const generate = useServerFn(generateProductContent);
  const [aiBusy, setAiBusy] = useState(false);

  const handleGenDesc = async () => {
    if (!name.trim()) return;
    setAiBusy(true);
    try {
      const brief = `الخدمة: ${name}${shortDesc ? `\nالوصف الحالي: ${shortDesc}` : ""}`;
      const result = await generate({ data: { password: getPwd(), brief, kind: "product" } });
      setLongDesc(result.description);
      setShortDesc(
        result.description.split(/(?<=[.!؟])\s/)[0]?.slice(0, 150) ||
          result.description.slice(0, 150),
      );
    } catch (e) {
      alert((e as Error).message);
    }
    setAiBusy(false);
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const cleanSlug = slugify(slug);
        if (!cleanSlug) {
          alert(
            "المعرّف (slug) لا يمكن أن يكون فارغاً بعد التصحيح — استخدم حروف/أرقام إنجليزية فقط.",
          );
          return;
        }
        if (existingSlugs.includes(cleanSlug)) {
          alert("هذا المعرّف (slug) مستخدم في خدمة أخرى — اختر معرّفاً مختلفاً.");
          return;
        }
        setBusy(true);
        try {
          await onSave({
            name,
            slug: cleanSlug,
            short_desc: shortDesc || null,
            long_desc: longDesc || null,
            image_url: imageUrl || null,
            sort_order: Number(sortOrder || 0),
          });
        } catch (err) {
          alert((err as Error).message);
        }
        setBusy(false);
      }}
      className="space-y-3"
    >
      <Input
        label="الاسم *"
        value={name}
        onChange={(v) => {
          setName(v);
          if (!slugTouched) setSlug(slugify(v));
        }}
        required
      />
      <div>
        <Input
          label="المعرّف (slug) *"
          value={slug}
          onChange={(v) => {
            setSlug(v);
            setSlugTouched(true);
          }}
          required
          ltr
        />
        <p className="text-[10px] text-[var(--color-ink-soft)] mt-1">
          حروف إنجليزية صغيرة وأرقام وشرطات فقط، بدون مسافات. يُصحَّح تلقائياً عند الحفظ.
        </p>
      </div>
      <div>
        <Input label="الوصف القصير" value={shortDesc} onChange={setShortDesc} />
      </div>
      <div>
        <Textarea label="الوصف الكامل" value={longDesc} onChange={setLongDesc} />
        <button
          type="button"
          onClick={handleGenDesc}
          disabled={aiBusy || !name.trim()}
          className="btn-outline text-xs mt-1 inline-flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3" />{" "}
          {aiBusy ? "جاري التوليد..." : "توليد وصف بالذكاء الاصطناعي"}
        </button>
      </div>
      <div>
        <span className="text-sm font-bold block mb-1">رابط الصورة</span>
        <div className="flex items-center gap-2">
          <ImageUploader onUploaded={(u) => setImageUrl(u)} />
          {imageUrl && (
            <img src={resolveImage(imageUrl)} alt="" className="w-12 h-12 rounded object-cover" />
          )}
        </div>
      </div>
      <Input label="الترتيب" type="number" value={sortOrder} onChange={setSortOrder} />
      <button type="submit" disabled={busy} className="btn-gold w-full">
        {busy ? "جاري الحفظ..." : "حفظ"}
      </button>
    </form>
  );
}
