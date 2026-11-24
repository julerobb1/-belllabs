import { requireGalleryToken } from "../../_lib/auth.js";
import { PUBLIC_WHERE, dbReady, ensureSchema } from "../../_lib/db.js";
import { errorJson, json, methodNotAllowed, parseLimit } from "../../_lib/http.js";

function adminItem(row) {
  return {
    id: row.id,
    status: row.status,
    credit: row.credit_name,
    user_id: row.discord_user_id || null,
    caption: row.caption || "",
    source: row.source_url || null,
    content_type: row.content_type,
    width: row.width,
    height: row.height,
    bytes: row.byte_size,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at,
    publish_at: row.publish_at,
    reject_reason: row.reject_reason,
    preview_url: "/api/gallery/img/" + row.id,
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") {
    return methodNotAllowed("GET");
  }
  const auth = await requireGalleryToken(request, env);
  if (!auth.ok) {
    return errorJson(auth.status, auth.error);
  }
  if (!dbReady(env)) {
    return errorJson(503, "gallery database is not configured");
  }
  await ensureSchema(env.GALLERY_DB);
  const url = new URL(request.url);
  const status = (url.searchParams.get("status") || "pending").toLowerCase();
  const allowed = new Set(["pending", "approved", "rejected", "scheduled", "live"]);
  if (!allowed.has(status)) {
    return errorJson(400, "status must be pending, approved, rejected, scheduled, or live");
  }
  const limit = parseLimit(url, 50, 100);
  let where = "status = ?";
  const binds = [];
  if (status === "scheduled") {
    where = "status = 'approved' AND publish_at IS NOT NULL AND publish_at > datetime('now')";
  } else if (status === "live") {
    where = PUBLIC_WHERE;
  } else {
    binds.push(status);
  }
  binds.push(limit);
  const result = await env.GALLERY_DB.prepare(
    `SELECT * FROM gallery_items WHERE ${where} ORDER BY created_at DESC LIMIT ?`
  )
    .bind(...binds)
    .all();

  const counts = await env.GALLERY_DB.prepare(
    `SELECT
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'approved' AND publish_at IS NOT NULL AND publish_at > datetime('now') THEN 1 ELSE 0 END) AS scheduled,
      SUM(CASE WHEN ${PUBLIC_WHERE} THEN 1 ELSE 0 END) AS live,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
     FROM gallery_items`
  ).first();

  return json({
    items: (result.results || []).map(adminItem),
    counts: {
      pending: counts?.pending || 0,
      scheduled: counts?.scheduled || 0,
      live: counts?.live || 0,
      rejected: counts?.rejected || 0,
    },
  });
}
