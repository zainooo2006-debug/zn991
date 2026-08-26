import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { getWallets } from "@/lib/catalog.functions";
import { saveWallet, adminDelete } from "@/lib/admin.functions";
import { getPwd, Modal, SimpleForm } from "@/components/admin/shared";

/* ===================== Wallets ===================== */
export function WalletsPanel() {
  const fetchW = useServerFn(getWallets);
  const save = useServerFn(saveWallet);
  const del = useServerFn(adminDelete);
  const qc = useQueryClient();
  const { data: wallets = [] } = useQuery({ queryKey: ["admin-wallets"], queryFn: () => fetchW() });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editing, setEditing] = useState<any | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-wallets"] });
    qc.invalidateQueries({ queryKey: ["wallets"] });
  };

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذه المحفظة؟")) return;
    await del({ data: { password: getPwd(), table: "wallets", id } });
    refresh();
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="font-bold text-lg">المحافظ ({wallets.length})</h2>
        <button onClick={() => setEditing({ sort_order: wallets.length })} className="btn-gold">
          <Plus className="w-4 h-4" /> محفظة جديدة
        </button>
      </div>
      <ul className="space-y-2">
        {wallets.map((w) => (
          <li key={w.id} className="card-clean p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-bold">{w.name}</div>
              <div className="text-xs text-[var(--color-ink-soft)]" dir="ltr">
                {w.account_number}
              </div>
            </div>
            <button onClick={() => setEditing(w)} className="p-2 text-[var(--color-gold)]">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(w.id)} className="p-2 text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
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
