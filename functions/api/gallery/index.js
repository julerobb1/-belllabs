import { requireGalleryToken } from "../../_lib/auth.js";
import { PUBLIC_WHERE, dbReady, ensureSchema } from "../../_lib/db.js";
import { errorJson, json, methodNotAllowed, parseLimit, publicItem } from "../../_lib/http.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, OPTIONS",
        "access-control-allow-headers": "Content-Type",
      },
    });
  }
  if (request.method !== "GET") {
    return methodNotAllowed("GET");
  }
  if (!dbReady(env)) {
    return errorJson(503, "gallery database is not configured");
  }
  await ensureSchema(env.GALLERY_DB);
  const url = new URL(request.url);
  const limit = parseLimit(url);
  const before = url.searchParams.get("before");
  const auth = await requireGalleryToken(request, env);
  const includeScheduled = url.searchParams.get("include") === "scheduled" && auth.ok;

  let sql =
    "SELECT id, credit_name, caption, source_url, content_type, width, height, publish_at, created_at, status FROM gallery_items WHERE ";
  const binds = [];
  if (includeScheduled) {
    sql += "status = 'approved'";
  } else {
    sql += PUBLIC_WHERE;
  }
  if (before) {
    sql += " AND publish_at < ?";
    binds.push(before);
  }
  sql += " ORDER BY publish_at DESC, id DESC LIMIT ?";
  binds.push(limit + 1);

  const result = await env.GALLERY_DB.prepare(sql)
    .bind(...binds)
    .all();
  const rows = result.results || [];
  const extra = rows.length > limit;
  const page = extra ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return json(
    {
      items: page.map((row) => publicItem(row, request)),
      next_before: extra && last ? last.publish_at : null,
    },
    200,
    { "access-control-allow-origin": "*", "cache-control": "public, max-age=60" }
  );
}
