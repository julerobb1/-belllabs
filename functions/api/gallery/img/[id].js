import { requireGalleryToken } from "../../../_lib/auth.js";
import { PUBLIC_WHERE, dbReady } from "../../../_lib/db.js";
import { ITEM_ID_RE, errorJson, methodNotAllowed } from "../../../_lib/http.js";
import { getImage } from "../../../_lib/storage.js";

export async function onRequest(context) {
  const { request, env, params } = context;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return methodNotAllowed("GET");
  }
  const id = params.id || "";
  if (!ITEM_ID_RE.test(id)) {
    return errorJson(400, "invalid id");
  }
  if (!dbReady(env)) {
    return errorJson(503, "gallery database is not configured");
  }
  const row = await env.GALLERY_DB.prepare("SELECT * FROM gallery_items WHERE id = ?").bind(id).first();
  if (!row || row.status === "rejected") {
    return errorJson(404, "not found");
  }
  const live = row.status === "approved" && row.publish_at && row.publish_at <= new Date().toISOString().slice(0, 19).replace("T", " ");
  if (!live) {
    const auth = await requireGalleryToken(request, env);
    if (!auth.ok) {
      return errorJson(404, "not found");
    }
  }
  const object = await getImage(env, row.object_key);
  if (!object) {
    return errorJson(404, "not found");
  }
  const headers = {
    "content-type": row.content_type || object.contentType || "application/octet-stream",
    "cache-control": live ? "public, max-age=86400" : "private, no-store",
    "x-content-type-options": "nosniff",
  };
  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }
  return new Response(object.body, { status: 200, headers });
}
