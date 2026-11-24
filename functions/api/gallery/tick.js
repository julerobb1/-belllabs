import { requireGalleryToken } from "../../_lib/auth.js";
import { PUBLIC_WHERE, dbReady, ensureSchema, intervalSeconds } from "../../_lib/db.js";
import { errorJson, json, methodNotAllowed, nowSql } from "../../_lib/http.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST" && request.method !== "GET") {
    return methodNotAllowed("GET, POST");
  }
  const auth = await requireGalleryToken(request, env);
  if (!auth.ok) {
    return errorJson(auth.status, auth.error);
  }
  if (!dbReady(env)) {
    return errorJson(503, "gallery database is not configured");
  }
  await ensureSchema(env.GALLERY_DB);
  const counts = await env.GALLERY_DB.prepare(
    `SELECT
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'approved' AND publish_at IS NOT NULL AND publish_at > datetime('now') THEN 1 ELSE 0 END) AS scheduled,
      SUM(CASE WHEN ${PUBLIC_WHERE} THEN 1 ELSE 0 END) AS live
     FROM gallery_items`
  ).first();
  return json({
    now: nowSql(),
    publish_per_hour: Number(env.GALLERY_PUBLISH_PER_HOUR) || 3,
    interval_seconds: intervalSeconds(env),
    pending: counts?.pending || 0,
    scheduled: counts?.scheduled || 0,
    live: counts?.live || 0,
  });
}
