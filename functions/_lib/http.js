const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

export function json(data, status = 200, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

export function errorJson(status, message, extra) {
  const body = { error: message };
  if (extra && typeof extra === "object") {
    Object.assign(body, extra);
  }
  return json(body, status);
}

export function methodNotAllowed(allow) {
  return errorJson(405, "method not allowed", { allow });
}

export function nowSql(date = new Date()) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export function parseLimit(url, fallback = 30, max = 50) {
  const raw = Number(url.searchParams.get("limit"));
  if (!Number.isFinite(raw) || raw <= 0) {
    return fallback;
  }
  return Math.min(max, Math.floor(raw));
}

export const ITEM_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function publicItem(row, request) {
  const origin = new URL(request.url).origin;
  return {
    id: row.id,
    url: origin + "/api/gallery/img/" + row.id,
    credit: row.credit_name,
    caption: row.caption || "",
    source: row.source_url || null,
    published_at: row.publish_at,
    width: row.width || null,
    height: row.height || null,
  };
}
