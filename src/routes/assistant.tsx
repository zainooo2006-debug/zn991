import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Image as ImageIcon, Send, Sparkles, Trash2, X, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { chatWithAssistant } from "@/lib/assistant.functions";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string | ContentPart[];
  ts: number;
};

type ProductCtx = { id?: string; name?: string; image?: string; url?: string };

const STORAGE_KEY = "zain_assistant_chat_v1";

const SUGGESTIONS = [
  "🚗 جرّب أي منتج على سيارتي",
  "📷 سأرفع صورة سيارتي",
  "🎨 اقترح لونًا جديدًا لسيارتي",
  "🌡️ ما أفضل العوازل الحرارية؟",
  "💡 ما أفضل خيارات الإنارة؟",
  "🛡️ ما أفضل خيارات الحماية و PPF؟",
  "✨ اقترح لي تعديلات كاملة لسيارتي",
];

export const Route = createFileRoute("/assistant")({
  validateSearch: (s: Record<string, unknown>): ProductCtx => ({
    id: typeof s.id === "string" ? s.id : undefined,
    name: typeof s.name === "string" ? s.name : undefined,
    image: typeof s.image === "string" ? s.image : undefined,
    url: typeof s.url === "string" ? s.url : undefined,
  }),
  head: () => ({
    meta: [
      { title: "المساعد الذكي — زين أصل الحماية" },
      {
        name: "description",
        content:
          "مساعد ذكي متخصص في تعديل وحماية السيارات: استشارات فورية، تجربة المنتجات على سيارتك بالذكاء الاصطناعي، واقتراحات احترافية.",
      },
      { property: "og:title", content: "المساعد الذكي — زين أصل الحماية" },
      {
        property: "og:description",
        content: "استشر خبير زين الذكي واختر التعديل المناسب لسيارتك.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AssistantPage,
});

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function AssistantPage() {
  const search = Route.useSearch();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const initedProductRef = useRef(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages, hydrated]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Auto-start conversation from product context
  useEffect(() => {
    if (!hydrated || initedProductRef.current) return;
    if (!search.name || messages.length > 0) return;
    initedProductRef.current = true;
    const parts: ContentPart[] = [];
    if (search.image) parts.push({ type: "image_url", image_url: { url: search.image } });
    parts.push({
      type: "text",
      text: `أرغب بتجربة هذا المنتج على سيارتي: ${search.name}${search.url ? `\nرابط المنتج: ${search.url}` : ""}\n\nهل يمكنك اقتراح كيف سيبدو على سيارتي؟ سأرفع صورة سيارتي بعد قليل.`,
    });
    void sendRaw(parts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, search.name]);

  const showWelcome = hydrated && messages.length === 0;

  async function sendRaw(userContent: string | ContentPart[]) {
    setError(null);
    const userMsg: Msg = { id: newId(), role: "user", content: userContent, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);
    try {
      const payloadMessages = next.map((m) => ({ role: m.role, content: m.content }));
      const res = await chatWithAssistant({ data: { messages: payloadMessages } });
      const asst: Msg = {
        id: newId(),
        role: "assistant",
        content: res.text || "…",
        ts: Date.now(),
      };
      setMessages((cur) => [...cur, asst]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text && !pendingImage) return;
    if (loading) return;
    const parts: ContentPart[] = [];
    if (pendingImage) parts.push({ type: "image_url", image_url: { url: pendingImage } });
    if (text) parts.push({ type: "text", text });
    setInput("");
    setPendingImage(null);
    await sendRaw(parts.length === 1 && parts[0].type === "text" ? text : parts);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      setError("حجم الصورة كبير جداً (الحد 8MB)");
      return;
    }
    const url = await fileToDataUrl(f);
    setPendingImage(url);
  }

  function clearChat() {
    if (!confirm("مسح المحادثة الحالية؟")) return;
    setMessages([]);
    setError(null);
    initedProductRef.current = false;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[var(--color-hairline)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="p-2 rounded-full hover:bg-slate-100" aria-label="العودة">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 text-white flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-base leading-tight">المساعد الذكي</h1>
            <p className="text-xs text-slate-500">زين أصل الحماية · متصل الآن</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
              aria-label="مسح المحادثة"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {showWelcome ? (
            <WelcomeScreen
              onPick={(s) => {
                setInput(s);
              }}
            />
          ) : (
            <div className="space-y-4">
              {messages.map((m) => (
                <MessageBubble key={m.id} m={m} />
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  المساعد يفكّر...
                </div>
              )}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 bg-white border-t border-[var(--color-hairline)]">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {pendingImage && (
            <div className="mb-2 relative inline-block">
              <img
                src={pendingImage}
                alt="مرفقة"
                className="h-20 rounded-lg border border-slate-200"
              />
              <button
                onClick={() => setPendingImage(null)}
                className="absolute -top-2 -left-2 bg-slate-800 text-white rounded-full p-1"
                aria-label="إزالة الصورة"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="p-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 shrink-0"
              aria-label="رفع صورة"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              rows={1}
              placeholder="اكتب سؤالك للمساعد..."
              className="flex-1 resize-none max-h-32 rounded-2xl border-2 border-slate-200 focus:border-amber-500 outline-none px-4 py-3 text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || (!input.trim() && !pendingImage)}
              className="p-3 rounded-full bg-gradient-to-l from-amber-500 to-yellow-500 text-white shrink-0 disabled:opacity-50 hover:shadow-md transition"
              aria-label="إرسال"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="text-[10px] text-slate-400 text-center mt-2">
            محادثاتك محفوظة على جهازك فقط
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ m }: { m: Msg }) {
  const isUser = m.role === "user";
  const parts: ContentPart[] =
    typeof m.content === "string" ? [{ type: "text", text: m.content }] : m.content;
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "" : "flex gap-2"}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-3 ${isUser ? "bg-amber-500 text-white" : "bg-white border border-slate-200 text-slate-800"} space-y-2`}
        >
          {parts.map((p, i) =>
            p.type === "image_url" ? (
              <img
                key={i}
                src={p.image_url.url}
                alt=""
                className="rounded-lg max-h-56 object-cover"
              />
            ) : isUser ? (
              <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed">
                {p.text}
              </p>
            ) : (
              <div
                key={i}
                className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1"
              >
                <ReactMarkdown>{p.text}</ReactMarkdown>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="text-center py-6">
      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 text-white flex items-center justify-center shadow-lg mb-4">
        <Sparkles className="w-10 h-10" />
      </div>
      <h2 className="text-2xl font-black mb-2">مرحباً بك في المساعد الذكي 👋</h2>
      <p className="text-slate-600 mb-6 max-w-md mx-auto">
        استشر خبير زين الذكي لاختيار التعديل المناسب لسيارتك، أو ارفع صورة سيارتك لتجربة أي منتج
        عليها.
      </p>
      <div className="grid gap-2 max-w-md mx-auto text-right">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="w-full text-sm bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-400 rounded-xl px-4 py-3 transition text-slate-700"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
