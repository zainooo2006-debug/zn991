import { createHmac, timingSafeEqual } from "crypto";

const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

export function getAdminPassword(): string {
  const pwd = process.env.ADMIN_PASSWORD;
  if (!pwd) throw new Error("Server misconfigured: ADMIN_PASSWORD not set");
  return pwd;
}

export function getSessionSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Server misconfigured: no session secret available");
  return s;
}

export function signToken(payload: { exp: number }): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSessionSecret()).update(body).digest("hex");
  return `${body}.${sig}`;
}

export function verifyToken(token: string | undefined | null): void {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    throw new Error("غير مصرح");
  }
  const [body, sig] = token.split(".");
  const expected = createHmac("sha256", getSessionSecret()).update(body).digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("غير مصرح");
  }
  let payload: { exp?: number };
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new Error("غير مصرح");
  }
  if (!payload.exp || Date.now() > payload.exp) {
    throw new Error("انتهت الجلسة، الرجاء تسجيل الدخول مجدداً");
  }
}

export function assertAdmin(token: string) {
  verifyToken(token);
}

export function verifyAdminPassword(password: string): boolean {
  const candidates = [getAdminPassword(), process.env.ADMIN_PASSWORD_2].filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  );
  const a = Buffer.from(password);
  let matched = false;
  for (const expected of candidates) {
    const b = Buffer.from(expected);
    const maxLen = Math.max(a.length, b.length);
    const ap = Buffer.concat([a, Buffer.alloc(maxLen - a.length)]);
    const bp = Buffer.concat([b, Buffer.alloc(maxLen - b.length)]);
    const eq = a.length === b.length && timingSafeEqual(ap, bp);
    if (eq) matched = true;
  }
  return matched;
}

export function base64ToBytes(base64: string): Uint8Array {
  return Buffer.from(base64, "base64");
}
