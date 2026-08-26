import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import {
  adminListCenters,
  adminSaveCenter,
  adminUpdateCenterFlags,
  adminDeleteCenter,
} from "@/lib/installation-centers.functions";
import { getPwd, ImageUploader, Modal, Input, Loading, Empty } from "@/components/admin/shared";

/* ===================== Installation Centers ===================== */
type CenterRow = {
  id: string;
  name: string;
  city: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  google_maps_url: string | null;
  logo_url: string | null;
  images: string[];
  services: string[];
  is_active: boolean;
  is_approved: boolean;
  sort_order: number;
};

export function InstallationCentersPanel() {
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
    try {
      await flagsFn({ data: { password: getPwd(), id, [key]: val } });
      refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  };
  const onDelete = async (id: string) => {
    if (!confirm("حذف المركز نهائياً؟")) return;
    try {
      await delFn({ data: { password: getPwd(), id } });
      refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="font-bold text-lg">مراكز التركيب ({rows.length})</h2>
        <button onClick={() => setEditing({})} className="btn-gold inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> مركز جديد
        </button>
      </div>

      {isLoading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty msg="لا توجد مراكز بعد" />
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => (
            <li key={c.id} className="card-clean p-4">
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div className="flex gap-3 flex-1 min-w-0">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-[var(--color-gold-soft)]" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{c.name}</span>
                      <span className="text-xs text-[var(--color-ink-soft)]">— {c.city}</span>
                      {c.is_approved ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                          معتمد
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                          بانتظار
                        </span>
                      )}
                      {!c.is_active && (
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                          موقوف
                        </span>
                      )}
                    </div>
                    {c.address && (
                      <div className="text-xs text-[var(--color-ink-soft)] mt-1">{c.address}</div>
                    )}
                    <div className="text-xs text-[var(--color-ink-soft)] mt-1 flex flex-wrap gap-3">
                      {c.phone && <span>📞 {c.phone}</span>}
                      {c.whatsapp && <span>💬 {c.whatsapp}</span>}
                      {c.google_maps_url && (
                        <a
                          href={c.google_maps_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline"
                        >
                          الموقع
                        </a>
                      )}
                    </div>
                    {c.services?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.services.map((s) => (
                          <span
                            key={s}
                            className="text-[10px] bg-[var(--color-surface)] px-2 py-0.5 rounded-full"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => toggle(c.id, "is_approved", !c.is_approved)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${c.is_approved ? "bg-slate-200 text-slate-700" : "bg-emerald-600 text-white"}`}
                  >
                    {c.is_approved ? "إلغاء الاعتماد" : "اعتماد"}
                  </button>
                  <button
                    onClick={() => toggle(c.id, "is_active", !c.is_active)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-hairline)]"
                  >
                    {c.is_active ? "إيقاف" : "تفعيل"}
                  </button>
                  <button
                    onClick={() => setEditing(c)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--color-gold-soft)] flex items-center gap-1 justify-center"
                  >
                    <Pencil className="w-3 h-3" /> تعديل
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white flex items-center gap-1 justify-center"
                  >
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
              setEditing(null);
              refresh();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function CenterForm({
  initial,
  onSave,
}: {
  initial: Partial<CenterRow>;
  onSave: (v: Omit<CenterRow, "id">) => Promise<void>;
}) {
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
  const up = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  const addImageUrl = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      alert("الرجاء إدخال رابط صحيح يبدأ بـ http:// أو https://");
      return;
    }
    up("images", [...v.images, url]);
    setNewImageUrl("");
  };

  const removeImage = (idx: number) =>
    up(
      "images",
      v.images.filter((_, i) => i !== idx),
    );

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
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
            services: v.services
              .split(/[,،\n]/)
              .map((s) => s.trim())
              .filter(Boolean),
            is_active: v.is_active,
            is_approved: v.is_approved,
            sort_order: Number(v.sort_order) || 0,
          });
        } catch (err) {
          alert((err as Error).message);
        }
        setBusy(false);
      }}
      className="space-y-3"
    >
      <Input label="الاسم *" value={v.name} onChange={(x) => up("name", x)} required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="المدينة *" value={v.city} onChange={(x) => up("city", x)} required />
        <Input
          label="ترتيب العرض"
          type="number"
          value={String(v.sort_order)}
          onChange={(x) => up("sort_order", Number(x) as never)}
        />
      </div>
      <Input label="العنوان" value={v.address} onChange={(x) => up("address", x)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="رقم الهاتف" value={v.phone} onChange={(x) => up("phone", x)} ltr />
        <Input label="واتساب" value={v.whatsapp} onChange={(x) => up("whatsapp", x)} ltr />
      </div>
      <Input
        label="رابط خرائط جوجل"
        value={v.google_maps_url}
        onChange={(x) => up("google_maps_url", x)}
        ltr
      />
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
            <div
              key={idx}
              className="relative w-16 h-16 rounded-lg overflow-hidden border border-[var(--color-hairline)] bg-[var(--color-surface)]"
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-0.5 left-0.5 bg-red-600 text-white rounded-full p-0.5"
              >
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
          <button type="button" onClick={addImageUrl} className="btn-outline text-xs px-3">
            إضافة
          </button>
        </div>
        <div className="mt-2">
          <ImageUploader onUploaded={(u) => up("images", [...v.images, u])} />
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-bold block mb-1">الخدمات (افصل بفاصلة)</span>
        <input
          value={v.services}
          onChange={(e) => up("services", e.target.value)}
          placeholder="حماية الطلاء، تظليل، سيراميك"
          className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)]"
        />
      </label>
      <div className="flex gap-4">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={v.is_approved}
            onChange={(e) => up("is_approved", e.target.checked)}
          />
          معتمد (يظهر للعامة)
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={v.is_active}
            onChange={(e) => up("is_active", e.target.checked)}
          />
          مفعّل
        </label>
      </div>
      <button type="submit" disabled={busy} className="btn-gold w-full">
        {busy ? "..." : "حفظ"}
      </button>
    </form>
  );
}
