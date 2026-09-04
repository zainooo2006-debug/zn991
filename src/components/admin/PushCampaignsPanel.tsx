import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Trash2, Bell } from "lucide-react";
import {
  listPushCampaigns,
  sendPushCampaign,
  deletePushCampaign,
} from "@/lib/push-campaigns.functions";
import {
  getPwd,
  Modal,
  Input,
  Textarea,
  Select,
  ImageUploader,
  Loading,
  Empty,
} from "@/components/admin/shared";

/* ===================== Push Campaigns (customer notifications) ===================== */
export function PushCampaignsPanel() {
  const fetchCampaigns = useServerFn(listPushCampaigns);
  const send = useServerFn(sendPushCampaign);
  const del = useServerFn(deletePushCampaign);
  const qc = useQueryClient();
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["admin-push-campaigns"],
    queryFn: () => fetchCampaigns({ data: { password: getPwd() } }).then((r) => r.items),
  });
  const [composing, setComposing] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-push-campaigns"] });

  const onDelete = async (id: string) => {
    if (!confirm("حذف سجل هذه الحملة؟ (هذا لا يسحب الإشعار من أجهزة العملاء)")) return;
    try {
      await del({ data: { password: getPwd(), id } });
      refresh();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="font-bold text-lg">إشعارات العملاء ({campaigns.length})</h2>
        <button onClick={() => setComposing(true)} className="btn-gold">
          <Bell className="w-4 h-4" /> إشعار جديد
        </button>
      </div>

      {isLoading ? (
        <Loading />
      ) : campaigns.length === 0 ? (
        <Empty msg="لا توجد إشعارات مُرسلة بعد" />
      ) : (
        <ul className="space-y-2">
          {campaigns.map((c) => (
            <li key={c.id} className="card-clean p-3 flex items-center gap-3">
              {c.image_url && (
                <img
                  src={c.image_url}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{c.title}</div>
                <div className="text-xs text-[var(--color-ink-soft)] truncate">{c.body}</div>
                <div className="text-[10px] text-[var(--color-ink-soft)] mt-1">
                  {new Date(c.created_at).toLocaleString("ar")} •{" "}
                  {c.target === "vip" ? "VIP" : "الجميع"} • أُرسل إلى {c.sent_count} جهاز • نُقر{" "}
                  {c.click_count} مرة
                </div>
              </div>
              <button onClick={() => onDelete(c.id)} className="p-2 text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {composing && (
        <Modal title="إشعار جديد للعملاء" onClose={() => setComposing(false)}>
          <CampaignComposeForm
            onSend={async (d) => {
              const result = await send({ data: { password: getPwd(), ...d } });
              setComposing(false);
              refresh();
              alert(`تم الإرسال إلى ${result.sentCount} جهاز`);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function CampaignComposeForm({
  onSend,
}: {
  onSend: (d: {
    title: string;
    body: string;
    image_url: string | null;
    link_url: string | null;
    target: "all" | "vip";
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [target, setTarget] = useState<"all" | "vip">("all");
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!confirm("سيُرسل هذا الإشعار فوراً لكل الأجهزة المشتركة. متابعة؟")) return;
        setBusy(true);
        try {
          await onSend({
            title,
            body,
            image_url: imageUrl || null,
            link_url: linkUrl || null,
            target,
          });
        } catch (err) {
          alert((err as Error).message);
        }
        setBusy(false);
      }}
      className="space-y-3"
    >
      <Input label="العنوان *" value={title} onChange={setTitle} required />
      <Textarea label="الرسالة *" value={body} onChange={setBody} />
      <div>
        <span className="text-sm font-bold block mb-1">صورة (اختياري)</span>
        <div className="flex items-center gap-2">
          <ImageUploader onUploaded={setImageUrl} />
          {imageUrl && <img src={imageUrl} alt="" className="w-12 h-12 rounded object-cover" />}
        </div>
      </div>
      <Input label="رابط عند الضغط (اختياري)" value={linkUrl} onChange={setLinkUrl} ltr />
      <Select
        label="الفئة المستهدفة"
        value={target}
        onChange={(v) => setTarget(v as "all" | "vip")}
        options={[
          { value: "all", label: "الجميع" },
          { value: "vip", label: "VIP (قريباً — يُرسل للجميع حالياً)" },
        ]}
      />
      <button type="submit" disabled={busy || !title || !body} className="btn-gold w-full">
        {busy ? (
          "جاري الإرسال..."
        ) : (
          <>
            <Send className="w-4 h-4" /> إرسال الآن
          </>
        )}
      </button>
    </form>
  );
}
