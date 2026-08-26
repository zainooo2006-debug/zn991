import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { getCategories } from "@/lib/catalog.functions";
import { saveCategory, adminDelete } from "@/lib/admin.functions";
import { getPwd, Modal, SimpleForm } from "@/components/admin/shared";

/* ===================== Categories ===================== */
export function CategoriesPanel() {
  const fetchCats = useServerFn(getCategories);
  const save = useServerFn(saveCategory);
  const del = useServerFn(adminDelete);
  const qc = useQueryClient();
  const { data: cats = [] } = useQuery({ queryKey: ["admin-cats"], queryFn: () => fetchCats() });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editing, setEditing] = useState<any | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-cats"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذا القسم؟")) return;
    await del({ data: { password: getPwd(), table: "categories", id } });
    refresh();
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="font-bold text-lg">أقسام المتجر ({cats.length})</h2>
        <button onClick={() => setEditing({ sort_order: cats.length })} className="btn-gold">
          <Plus className="w-4 h-4" /> قسم جديد
        </button>
      </div>
      <ul className="space-y-2">
        {cats.map((c) => (
          <li key={c.id} className="card-clean p-3 flex items-center gap-3">
            {c.icon && (
              <img
                src={c.icon}
                alt=""
                className="w-10 h-10 rounded-lg object-cover bg-[var(--color-surface)]"
              />
            )}
            <div className="flex-1">
              <div className="font-bold">{c.name}</div>
              <div className="text-xs text-[var(--color-ink-soft)]" dir="ltr">
                {c.slug}
              </div>
            </div>
            <button onClick={() => setEditing(c)} className="p-2 text-[var(--color-gold)]">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(c.id)} className="p-2 text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
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
