import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { formatDateAr, statusLabel, statusColor, computeStatus, type WarrantyStatus } from "@/lib/warranty-utils";
import { Loader2, Search, Trash2, Ban, RefreshCw, CheckCircle2, UserPlus, Shield, X } from "lucide-react";
import {
  adminListWarranties,
  adminListCustomers,
  adminOverviewStats,
  adminListSimple,
  adminMutate,
} from "@/lib/warranty-admin.functions";
import {
  adminListUsers, adminCreateStaff, adminGrantRole, adminRevokeRole, adminDeleteUser,
} from "@/lib/warranty-users.functions";

function Loader() {
  return <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" /></div>;
}

/* ================= Overview ================= */
export function WarrantyOverview() {
  const call = useServerFn(adminOverviewStats);
  const [stats, setStats] = useState<{ customers: number; warranties: number; active: number; expired: number } | null>(null);
  const [latest, setLatest] = useState<Array<{ id: string; warranty_number: string; created_at: string; status: WarrantyStatus; expiry_date: string }>>([]);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    call({ data: undefined as never })
      .then((r) => { setStats(r.stats); setLatest(r.latest as never); })
      .catch((e) => { setErr(e instanceof Error ? e.message : "تعذر التحميل"); setStats({ customers: 0, warranties: 0, active: 0, expired: 0 }); });
  }, [call]);
  if (!stats) return <Loader />;
  return (
    <div className="space-y-4">
      {err && <div className="p-3 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-sm">
        يرجى تسجيل الدخول من <a href="/warranty/auth" className="underline font-bold">بوابة الضمانات</a> بحساب المسؤول لعرض بيانات الضمانات. ({err})
      </div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard color="bg-blue-500" label="إجمالي العملاء" value={stats.customers} />
        <StatCard color="bg-slate-700" label="إجمالي الضمانات" value={stats.warranties} />
        <StatCard color="bg-green-500" label="ضمانات سارية" value={stats.active} />
        <StatCard color="bg-gray-500" label="ضمانات منتهية" value={stats.expired} />
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <h3 className="font-bold mb-3">أحدث الضمانات</h3>
        <div className="space-y-2 text-sm">
          {latest.map((r) => {
            const s = computeStatus(r.expiry_date, r.status);
            return (
              <div key={r.id} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <span className="font-mono">{r.warranty_number}</span>
                <span className="text-slate-500 text-xs">{formatDateAr(r.created_at)}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs border ${statusColor[s]}`}>{statusLabel[s]}</span>
              </div>
            );
          })}
          {latest.length === 0 && <div className="text-center text-slate-500 py-4">لا توجد بيانات</div>}
        </div>
      </div>
    </div>
  );
}
function StatCard({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className={`${color} text-white rounded-2xl p-4 shadow`}>
      <div className="text-xs opacity-90">{label}</div>
      <div className="text-3xl font-black mt-1">{value}</div>
    </div>
  );
}

/* ================= Warranties Tab ================= */
type WarrantyRow = {
  id: string;
  warranty_number: string;
  activation_date: string;
  expiry_date: string;
  status: WarrantyStatus;
  vin: string | null;
  customers: { full_name: string; phone: string } | null;
  warranty_brands: { name: string } | null;
  film_types: { name: string } | null;
  branches: { name: string } | null;
};

export function WarrantiesTab() {
  const listFn = useServerFn(adminListWarranties);
  const mutFn = useServerFn(adminMutate);
  const [rows, setRows] = useState<WarrantyRow[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | WarrantyStatus>("all");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setBusy(true); setErr(null);
    try {
      const data = await listFn({ data: undefined as never });
      setRows((data as unknown as WarrantyRow[]) ?? []);
    } catch (e) { setErr(e instanceof Error ? e.message : "تعذر التحميل"); setRows([]); }
    setBusy(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      const s = computeStatus(r.expiry_date, r.status);
      if (filter !== "all" && s !== filter) return false;
      if (!query) return true;
      return (
        r.warranty_number.toLowerCase().includes(query) ||
        (r.customers?.full_name ?? "").toLowerCase().includes(query) ||
        (r.customers?.phone ?? "").includes(query) ||
        (r.vin ?? "").toLowerCase().includes(query)
      );
    });
  }, [rows, q, filter]);

  async function approve(id: string) {
    if (!confirm("الموافقة على الضمان وتفعيله؟")) return;
    const e = await mutFn({ data: { op: "warranty_approve", id } });
    if (e) alert(e); else load();
  }
  async function cancel(id: string) {
    if (!confirm("إلغاء الضمان؟")) return;
    const e = await mutFn({ data: { op: "warranty_cancel", id } });
    if (e) alert(e); else load();
  }
  async function extend(id: string, current: string) {
    const months = Number(prompt("عدد الأشهر للتمديد:", "12") ?? 0);
    if (!months || months < 1) return;
    const d = new Date(current); d.setMonth(d.getMonth() + months);
    const e = await mutFn({ data: { op: "warranty_extend", id, expiry_date: d.toISOString().slice(0, 10) } });
    if (e) alert(e); else load();
  }
  async function remove(id: string) {
    if (!confirm("حذف الضمان نهائيًا؟")) return;
    const e = await mutFn({ data: { op: "warranty_delete", id } });
    if (e) alert(e); else load();
  }

  return (
    <div className="space-y-3">
      {err && <div className="p-3 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-sm">
        يرجى تسجيل الدخول من <a href="/warranty/auth" className="underline font-bold">بوابة الضمانات</a> بحساب مسؤول. ({err})
      </div>}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث برقم/عميل/جوال/هيكل..."
            className="w-full pr-10 pl-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 outline-none focus:border-amber-500" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as never)} className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800">
          <option value="all">كل الحالات</option>
          <option value="pending">بانتظار الموافقة</option>
          <option value="active">سارية</option>
          <option value="expired">منتهية</option>
          <option value="cancelled">ملغية</option>
        </select>
        <button onClick={load} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        {busy ? <Loader /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-xs">
              <tr>
                <th className="p-2 text-right">الرقم</th>
                <th className="p-2 text-right">العميل</th>
                <th className="p-2 text-right">الماركة/النوع</th>
                <th className="p-2 text-right">التفعيل</th>
                <th className="p-2 text-right">الانتهاء</th>
                <th className="p-2 text-right">الحالة</th>
                <th className="p-2 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const s = computeStatus(r.expiry_date, r.status);
                return (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="p-2 font-mono text-xs">{r.warranty_number}</td>
                    <td className="p-2">{r.customers?.full_name}<div className="text-xs text-slate-500">{r.customers?.phone}</div></td>
                    <td className="p-2 text-xs">{r.warranty_brands?.name ?? "-"} / {r.film_types?.name ?? "-"}</td>
                    <td className="p-2 text-xs">{formatDateAr(r.activation_date)}</td>
                    <td className="p-2 text-xs">{formatDateAr(r.expiry_date)}</td>
                    <td className="p-2"><span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[s]}`}>{statusLabel[s]}</span></td>
                    <td className="p-2 whitespace-nowrap">
                      {s === "pending" && (
                        <button onClick={() => approve(r.id)} className="p-1 hover:bg-green-50 rounded" title="موافقة وتفعيل"><CheckCircle2 className="w-4 h-4 text-green-600" /></button>
                      )}
                      <button onClick={() => extend(r.id, r.expiry_date)} className="p-1 hover:bg-slate-100 rounded" title="تمديد"><RefreshCw className="w-4 h-4 text-blue-600" /></button>
                      <button onClick={() => cancel(r.id)} className="p-1 hover:bg-slate-100 rounded" title="إلغاء"><Ban className="w-4 h-4 text-orange-600" /></button>
                      <button onClick={() => remove(r.id)} className="p-1 hover:bg-slate-100 rounded" title="حذف"><Trash2 className="w-4 h-4 text-red-600" /></button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">لا توجد ضمانات</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ================= Customers Tab ================= */
type CustomerRow = { id: string; full_name: string; phone: string; email: string | null; created_at: string };
export function WarrantyCustomersTab() {
  const listFn = useServerFn(adminListCustomers);
  const mutFn = useServerFn(adminMutate);
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const data = await listFn({ data: undefined as never });
      setRows((data as CustomerRow[]) ?? []);
    } catch { setRows([]); }
    setBusy(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function addManual() {
    const name = prompt("اسم العميل:") ?? ""; if (!name.trim()) return;
    const phone = prompt("رقم الجوال:") ?? ""; if (!phone.trim()) return;
    const e = await mutFn({ data: { op: "customer_insert", full_name: name.trim(), phone: phone.trim() } });
    if (e) alert(e); else load();
  }
  async function edit(r: CustomerRow) {
    const name = prompt("اسم العميل:", r.full_name) ?? r.full_name;
    const phone = prompt("رقم الجوال:", r.phone) ?? r.phone;
    const e = await mutFn({ data: { op: "customer_update", id: r.id, full_name: name, phone } });
    if (e) alert(e); else load();
  }
  async function remove(id: string) {
    if (!confirm("حذف العميل؟")) return;
    const e = await mutFn({ data: { op: "customer_delete", id } });
    if (e) alert(e); else load();
  }

  const filtered = rows.filter((r) => {
    const t = q.trim().toLowerCase(); if (!t) return true;
    return r.full_name.toLowerCase().includes(t) || r.phone.includes(t) || (r.email ?? "").toLowerCase().includes(t);
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..." className="w-full pr-10 pl-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 outline-none focus:border-amber-500" />
        </div>
        <button onClick={addManual} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium">+ عميل جديد</button>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        {busy ? <Loader /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-xs"><tr>
              <th className="p-2 text-right">الاسم</th><th className="p-2 text-right">الجوال</th><th className="p-2 text-right">البريد</th><th className="p-2 text-right">التسجيل</th><th className="p-2"></th>
            </tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700">
                  <td className="p-2">{r.full_name}</td>
                  <td className="p-2 font-mono text-xs">{r.phone}</td>
                  <td className="p-2 text-xs">{r.email ?? "-"}</td>
                  <td className="p-2 text-xs">{formatDateAr(r.created_at)}</td>
                  <td className="p-2 whitespace-nowrap">
                    <button onClick={() => edit(r)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 mr-1">تعديل</button>
                    <button onClick={() => remove(r.id)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">حذف</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">لا يوجد عملاء</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ================= Generic Simple CRUD ================= */
type Field = { k: string; l: string; type?: "text" | "number" };
type SimpleTable = "warranty_brands" | "film_types" | "branches";
export function WarrantySimpleCrud({ table, title, fields }: { table: SimpleTable; title: string; fields: Field[] }) {
  const listFn = useServerFn(adminListSimple);
  const mutFn = useServerFn(adminMutate);
  const [rows, setRows] = useState<Array<Record<string, unknown> & { id: string; is_active?: boolean }>>([]);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    try {
      const data = await listFn({ data: { table } });
      setRows((data as never) ?? []);
    } catch { setRows([]); }
    setBusy(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [table]);

  async function addRow() {
    const rec: Record<string, unknown> = {};
    for (const f of fields) {
      const v = prompt(f.l) ?? "";
      if (!v) continue;
      rec[f.k] = f.type === "number" ? Number(v) : v;
    }
    if (!rec.name) return;
    const e = await mutFn({ data: { op: "simple_insert", table, values: rec } });
    if (e) alert(e); else load();
  }
  async function editRow(r: Record<string, unknown> & { id: string }) {
    const rec: Record<string, unknown> = {};
    for (const f of fields) {
      const cur = String(r[f.k] ?? "");
      const v = prompt(f.l, cur) ?? cur;
      rec[f.k] = f.type === "number" ? Number(v) : v;
    }
    const e = await mutFn({ data: { op: "simple_update", table, id: r.id, values: rec } });
    if (e) alert(e); else load();
  }
  async function toggle(r: { id: string; is_active?: boolean }) {
    const e = await mutFn({ data: { op: "simple_toggle", table, id: r.id, is_active: !r.is_active } });
    if (e) alert(e); else load();
  }
  async function del(id: string) {
    if (!confirm("حذف؟")) return;
    const e = await mutFn({ data: { op: "simple_delete", table, id } });
    if (e) alert(e); else load();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">{title}</h3>
        <button onClick={addRow} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium">+ إضافة</button>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        {busy ? <Loader /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-xs"><tr>
              {fields.map((f) => <th key={f.k} className="p-2 text-right">{f.l}</th>)}
              <th className="p-2 text-right">الحالة</th>
              <th className="p-2"></th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700">
                  {fields.map((f) => <td key={f.k} className="p-2">{String(r[f.k] ?? "-")}</td>)}
                  <td className="p-2">
                    <button onClick={() => toggle(r)} className={`text-xs px-2 py-0.5 rounded-full border ${r.is_active ? "bg-green-100 text-green-800 border-green-300" : "bg-gray-100 text-gray-700 border-gray-300"}`}>
                      {r.is_active ? "مفعّل" : "متوقف"}
                    </button>
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    <button onClick={() => editRow(r)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 mr-1">تعديل</button>
                    <button onClick={() => del(r.id)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">حذف</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={fields.length + 2} className="p-8 text-center text-slate-500">لا توجد بيانات</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ================= Users & Roles ================= */
type AppRole = "admin" | "super_admin" | "manager" | "branch_staff" | "customer";
const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "مدير أعلى",
  admin: "أدمن",
  manager: "مدير",
  branch_staff: "موظف فرع",
  customer: "عميل",
};
const ROLE_COLOR: Record<AppRole, string> = {
  super_admin: "bg-purple-100 text-purple-700 border-purple-300",
  admin: "bg-red-100 text-red-700 border-red-300",
  manager: "bg-blue-100 text-blue-700 border-blue-300",
  branch_staff: "bg-emerald-100 text-emerald-700 border-emerald-300",
  customer: "bg-slate-100 text-slate-600 border-slate-300",
};

type UserRow = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: { role: AppRole; branch_id: string | null }[];
};

export function WarrantyUsersTab() {
  const list = useServerFn(adminListUsers);
  const create = useServerFn(adminCreateStaff);
  const grant = useServerFn(adminGrantRole);
  const revoke = useServerFn(adminRevokeRole);
  const del = useServerFn(adminDeleteUser);
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setRows(null);
    list({ data: undefined as never })
      .then((r) => setRows(r as UserRow[]))
      .catch((e) => { setErr(e instanceof Error ? e.message : "تعذر التحميل"); setRows([]); });
  };
  useEffect(load, [list]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const s = q.trim().toLowerCase();
    return s ? rows.filter((u) => u.email.toLowerCase().includes(s)) : rows;
  }, [rows, q]);

  const doGrant = async (user_id: string, role: AppRole) => {
    setBusy(true);
    try { await grant({ data: { user_id, role } }); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "خطأ"); }
    finally { setBusy(false); }
  };
  const doRevoke = async (user_id: string, role: AppRole) => {
    if (!confirm(`إزالة دور "${ROLE_LABEL[role]}" من هذا المستخدم؟`)) return;
    setBusy(true);
    try { await revoke({ data: { user_id, role } }); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "خطأ"); }
    finally { setBusy(false); }
  };
  const doDelete = async (user_id: string, email: string) => {
    if (!confirm(`حذف الحساب ${email} نهائياً؟`)) return;
    setBusy(true);
    try { await del({ data: { user_id } }); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "خطأ"); }
    finally { setBusy(false); }
  };

  if (rows === null) return <Loader />;

  return (
    <div className="space-y-4">
      {err && <div className="p-3 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-sm">{err}</div>}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالبريد..."
            className="w-full pr-9 pl-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
        </div>
        <button onClick={() => setOpenNew(true)} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 text-sm font-bold">
          <UserPlus className="w-4 h-4" /> إضافة مستخدم
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="p-3 text-right">البريد الإلكتروني</th>
                <th className="p-3 text-right">الأدوار</th>
                <th className="p-3 text-right">آخر دخول</th>
                <th className="p-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const has = new Set(u.roles.map((r) => r.role));
                return (
                  <tr key={u.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="p-3 font-mono text-xs" dir="ltr">{u.email || u.id.slice(0, 8)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 && <span className="text-xs text-slate-400">— بدون دور</span>}
                        {u.roles.map((r) => (
                          <button key={r.role} onClick={() => doRevoke(u.id, r.role)} disabled={busy}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${ROLE_COLOR[r.role]} hover:opacity-70`}
                            title="اضغط للإزالة">
                            {ROLE_LABEL[r.role]} <X className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("ar") : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        <select
                          disabled={busy}
                          onChange={(e) => { if (e.target.value) { doGrant(u.id, e.target.value as AppRole); e.target.value = ""; } }}
                          className="text-xs border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800"
                          defaultValue=""
                        >
                          <option value="">+ منح دور</option>
                          {(["super_admin", "admin", "manager", "branch_staff"] as AppRole[])
                            .filter((r) => !has.has(r))
                            .map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                        </select>
                        <button onClick={() => doDelete(u.id, u.email)} disabled={busy}
                          className="p-1.5 rounded hover:bg-red-50 text-red-600" title="حذف الحساب">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-500">لا يوجد مستخدمون</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {openNew && (
        <NewUserModal
          onClose={() => setOpenNew(false)}
          onCreate={async (email, password, role, branchId) => {
            await create({ data: { email, password, role, branch_id: branchId ?? null } });
            setOpenNew(false);
            load();
          }}
        />

      )}
    </div>
  );
}

function NewUserModal({ onClose, onCreate }: { onClose: () => void; onCreate: (email: string, password: string, role: AppRole, branchId?: string | null) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("branch_staff");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("branches").select("id, name").eq("is_active", true).order("sort_order");
      if (!cancelled) setBranches((data as { id: string; name: string }[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      if (role === "branch_staff" && !branchId) throw new Error("اختر الفرع");
      await onCreate(email.trim(), password, role, role === "branch_staff" ? branchId : null);
    }
    catch (e) { setErr(e instanceof Error ? e.message : "خطأ"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-amber-500" /> مستخدم جديد</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="w-4 h-4" /></button>
        </div>
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">البريد الإلكتروني</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" dir="ltr" />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">كلمة المرور (6+ أحرف)</span>
          <input type="text" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" dir="ltr" />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">الدور</span>
          <select value={role} onChange={(e) => setRole(e.target.value as AppRole)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <option value="super_admin">مدير أعلى (كل الصلاحيات)</option>
            <option value="admin">أدمن</option>
            <option value="manager">مدير</option>
            <option value="branch_staff">موظف فرع</option>
          </select>
        </label>
        {err && <div className="p-2 rounded bg-red-50 text-red-700 text-sm border border-red-200">{err}</div>}
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={busy} className="flex-1 py-2 rounded-lg bg-amber-500 text-white font-bold hover:bg-amber-600 disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "إنشاء"}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">إلغاء</button>
        </div>
      </form>
    </div>
  );
}
