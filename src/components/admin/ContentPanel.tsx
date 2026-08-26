import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { getSiteContent } from "@/lib/catalog.functions";
import { saveContent, adminDelete } from "@/lib/admin.functions";
import { getPwd, Input, Textarea } from "@/components/admin/shared";

/* ===================== Content (key/value) ===================== */
export function ContentPanel() {
  const fetchContent = useServerFn(getSiteContent);
  const save = useServerFn(saveContent);
  const del = useServerFn(adminDelete);
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-content"],
    queryFn: () => fetchContent(),
  });
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-content"] });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsed: unknown = value;
    try {
      parsed = JSON.parse(value);
    } catch {
      /* keep string */
    }
    await save({ data: { password: getPwd(), key, value: parsed } });
    setKey("");
    setValue("");
    refresh();
  };

  return (
    <div>
      <h2 className="font-bold text-lg mb-2">محتوى الموقع</h2>
      <p className="text-xs text-[var(--color-ink-soft)] mb-4">
        قيم نصية أو JSON. مفاتيح أمثلة: <code>top_bar_text</code>, <code>hero_title</code>,{" "}
        <code>about_html</code>.
      </p>

      <form onSubmit={submit} className="card-clean p-4 space-y-3 mb-6">
        <Input label="المفتاح" value={key} onChange={setKey} required ltr />
        <Textarea label="القيمة (نص أو JSON)" value={value} onChange={setValue} />
        <button type="submit" className="btn-gold">
          حفظ / تحديث
        </button>
      </form>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.key} className="card-clean p-3">
            <div className="flex justify-between items-start gap-2">
              <div className="font-bold text-sm" dir="ltr">
                {r.key}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setKey(r.key);
                    setValue(
                      typeof r.value === "string" ? r.value : JSON.stringify(r.value, null, 2),
                    );
                  }}
                  className="p-1.5 text-[var(--color-gold)]"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    if (!confirm("حذف؟")) return;
                    await del({ data: { password: getPwd(), table: "site_content", id: r.key } });
                    refresh();
                  }}
                  className="p-1.5 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <pre className="text-xs text-[var(--color-ink-soft)] mt-1 whitespace-pre-wrap break-all">
              {typeof r.value === "string" ? r.value : JSON.stringify(r.value, null, 2)}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
