function encoder() {
  return new TextEncoder();
}

async function sha256(value) {
  return crypto.subtle.digest("SHA-256", encoder().encode(value));
}

function timingSafeEqual(left, right) {
  const a = left instanceof Uint8Array ? left : new Uint8Array(left);
  const b = right instanceof Uint8Array ? right : new Uint8Array(right);
  if (typeof crypto.subtle.timingSafeEqual === "function" && a.length === b.length) {
    return crypto.subtle.timingSafeEqual(a, b);
  }
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    diff |= (a[i] || 0) ^ (b[i] || 0);
  }
  return diff === 0;
}

export async function tokensEqual(provided, expected) {
  const [left, right] = await Promise.all([sha256(provided || ""), sha256(expected || "")]);
  return timingSafeEqual(left, right);
}

export function bearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(\S+)/i);
  if (match) {
    return match[1];
  }
  return "";
}

export async function requireGalleryToken(request, env) {
  const expected = env.L5_GALLERY_TOKEN;
  if (!expected) {
    return { ok: false, status: 503, error: "L5_GALLERY_TOKEN is not configured" };
  }
  const provided = bearerToken(request);
  if (!(await tokensEqual(provided, expected))) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  return { ok: true };
}
