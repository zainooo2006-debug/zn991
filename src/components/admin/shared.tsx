import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Upload, Loader2 } from "lucide-react";
import { uploadImage } from "@/lib/admin.functions";

// Session token issued by the server-side `adminLogin` function. The actual
// admin password is never stored in the client bundle or in browser storage.
export const TOKEN_KEY = "mycar_admin_token";

export function getPwd() {
  // Returns the server-issued session token. Field name kept as "password"
  // in the server fn API for backward compatibility — the server treats it
  // as an HMAC-signed token, not a raw password.
  return typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) || "" : "";
}

export function ImageUploader({ onUploaded }: { onUploaded: (url: string) => void }) {
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
      const result = await upload({
        data: { password: getPwd(), filename: file.name, contentType: file.type, base64 },
      });
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

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-[var(--color-hairline)] sticky top-0 bg-white">
          <h3 className="font-black text-lg">{title}</h3>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  ltr,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  ltr?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold block mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        dir={ltr ? "ltr" : undefined}
        className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)]"
      />
    </label>
  );
}

export function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold block mb-1">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)] font-mono text-sm"
      />
    </label>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold block mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-[var(--color-hairline)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-gold)]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export type FieldDef = {
  key: string;
  label: string;
  required?: boolean;
  ltr?: boolean;
  textarea?: boolean;
  image?: boolean;
  type?: string;
};

export function SimpleForm({
  initial,
  fields,
  onSave,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initial: any;
  fields: FieldDef[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (data: any) => Promise<void>;
}) {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((f) => [f.key, initial[f.key] != null ? String(initial[f.key]) : ""]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const update = (k: string, v: string) => setVals((p) => ({ ...p, [k]: v }));

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data: any = {};
          for (const f of fields) {
            const v = vals[f.key];
            data[f.key] = f.type === "number" ? Number(v || 0) : v || null;
          }
          await onSave(data);
        } catch (err) {
          alert((err as Error).message);
        }
        setBusy(false);
      }}
      className="space-y-3"
    >
      {fields.map((f) => (
        <div key={f.key}>
          {f.textarea ? (
            <Textarea label={f.label} value={vals[f.key]} onChange={(v) => update(f.key, v)} />
          ) : (
            <Input
              label={f.label}
              value={vals[f.key]}
              onChange={(v) => update(f.key, v)}
              type={f.type || "text"}
              required={f.required}
              ltr={f.ltr}
            />
          )}
          {f.image && (
            <div className="mt-1 flex items-center gap-2">
              <ImageUploader onUploaded={(u) => update(f.key, u)} />
              {vals[f.key] && (
                <img src={vals[f.key]} alt="" className="w-12 h-12 rounded object-cover" />
              )}
            </div>
          )}
        </div>
      ))}
      <button type="submit" disabled={busy} className="btn-gold w-full">
        {busy ? "..." : "حفظ"}
      </button>
    </form>
  );
}

export function Loading() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--color-gold)]" />
    </div>
  );
}

export function Empty({ msg }: { msg: string }) {
  return <div className="text-center py-12 text-[var(--color-ink-soft)]">{msg}</div>;
}
