import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { getPackages } from "@/lib/catalog.functions";
import { savePackage, adminDelete } from "@/lib/admin.functions";
import { getPwd, Modal, Input, Textarea } from "@/components/admin/shared";

/* ===================== Packages ===================== */
export function PackagesPanel() {
  const fetchPkg = useServerFn(getPackages);
  const save = useServerFn(savePackage);
  const del = useServerFn(adminDelete);
  const qc = useQueryClient();
  const { data: pkgs = [] } = useQuery({ queryKey: ["admin-pkgs"], queryFn: () => fetchPkg() });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editing, setEditing] = useState<any | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-pkgs"] });
    qc.invalidateQueries({ queryKey: ["packages"] });
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذه البكج؟")) return;
    await del({ data: { password: getPwd(), table: "packages", id } });
    refresh();
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="font-bold text-lg">البكجات ({pkgs.length})</h2>
        <button
          onClick={() => setEditing({ features: [], sort_order: pkgs.length })}
          className="btn-gold"
        >
          <Plus className="w-4 h-4" /> بكج جديدة
        </button>
      </div>
      <ul className="space-y-2">
        {pkgs.map((p) => (
          <li key={p.id} className="card-clean p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-bold">
                {p.name}{" "}
                {p.badge && (
                  <span className="text-xs bg-[var(--color-gold-soft)] px-2 py-0.5 rounded-full">
                    {p.badge}
                  </span>
                )}
              </div>
              <div className="text-[var(--color-gold)] font-bold text-sm">{p.price} ر.ي</div>
            </div>
            <button onClick={() => setEditing(p)} className="p-2 text-[var(--color-gold)]">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(p.id)} className="p-2 text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
      {editing && (
        <Modal title={editing.id ? "تعديل بكج" : "بكج جديدة"} onClose={() => setEditing(null)}>
          <PackageForm
            initial={editing}
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

function PackageForm({
  initial,
  onSave,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initial: any;
  onSave: (d: {
    name: string;
    slug: string;
    description: string | null;
    price: string;
    old_price: string | null;
    features: string[];
    badge: string | null;
    sort_order: number;
  }) => Promise<void>;
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
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave({
            name,
            slug,
            description: desc || null,
            price,
            old_price: oldP || null,
            features,
            badge: badge || null,
            sort_order: Number(order),
          });
        } catch (err) {
          alert((err as Error).message);
        }
        setBusy(false);
      }}
      className="space-y-3"
    >
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
            <li
              key={i}
              className="flex items-center gap-2 text-sm bg-[var(--color-surface)] rounded px-2 py-1"
            >
              <span className="flex-1">{f}</span>
              <button
                type="button"
                onClick={() => setFeatures(features.filter((_, idx) => idx !== i))}
                className="text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            value={feat}
            onChange={(e) => setFeat(e.target.value)}
            placeholder="ميزة جديدة"
            className="flex-1 border border-[var(--color-hairline)] rounded-lg px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              if (feat) {
                setFeatures([...features, feat]);
                setFeat("");
              }
            }}
            className="btn-outline text-xs"
          >
            إضافة
          </button>
        </div>
      </div>
      <Input label="الترتيب" type="number" value={order} onChange={setOrder} />
      <button type="submit" disabled={busy} className="btn-gold w-full">
        {busy ? "..." : "حفظ"}
      </button>
    </form>
  );
}
