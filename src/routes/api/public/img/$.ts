import { createFileRoute } from "@tanstack/react-router";

// Proxy for public Supabase Storage objects in the "media" bucket.
// URL shape: /api/public/img/<path-inside-bucket>
// Example:   /api/public/img/products/abc.jpg
//   -> fetches https://<project>.supabase.co/storage/v1/object/public/media/products/abc.jpg

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
]);

async function handle(request: Request, splat: string | undefined) {
  const path = (splat ?? "").replace(/^\/+/, "");
  if (!path || path.includes("..")) {
    return new Response("Invalid path", { status: 400 });
  }

  const base = process.env.SUPABASE_URL;
  if (!base) return new Response("Server misconfigured", { status: 500 });

  const upstream = `${base}/storage/v1/object/public/media/${path}`;
  let res: Response;
  try {
    res = await fetch(upstream, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers: { accept: "image/*" },
    });
  } catch (err) {
    console.error("[img-proxy] fetch failed:", err);
    return new Response("Upstream fetch failed", { status: 502 });
  }

  if (!res.ok) {
    return new Response("Not found", { status: res.status });
  }

  const upstreamType = res.headers.get("content-type") ?? "application/octet-stream";
  const contentType = upstreamType.split(";")[0].trim().toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return new Response("Unsupported content type", { status: 415 });
  }

  const headers = new Headers();
  headers.set("content-type", upstreamType);
  const len = res.headers.get("content-length");
  if (len) headers.set("content-length", len);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("access-control-allow-origin", "*");
  headers.set("x-content-type-options", "nosniff");

  return new Response(res.body, { status: 200, headers });
}

export const Route = createFileRoute("/api/public/img/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => handle(request, (params as { _splat?: string })._splat),
      HEAD: async ({ request, params }) => handle(request, (params as { _splat?: string })._splat),
    },
  },
});
