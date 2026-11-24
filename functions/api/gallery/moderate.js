import { requireGalleryToken } from "../../_lib/auth.js";
import { allocatePublishAt, dbReady, ensureSchema } from "../../_lib/db.js";
import { ITEM_ID_RE, errorJson, json, methodNotAllowed, nowSql } from "../../_lib/http.js";
import { deleteImage } from "../../_lib/storage.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") {
    return methodNotAllowed("POST");
  }
  const auth = await requireGalleryToken(request, env);
  if (!auth.ok) {
    return errorJson(auth.status, auth.error);
  }
  if (!dbReady(env)) {
    return errorJson(503, "gallery database is not configured");
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return errorJson(400, "expected JSON body");
  }
  const id = String(body.id || "");
  const action = String(body.action || "").toLowerCase();
  const reason = body.reason != null ? String(body.reason).slice(0, 300) : "";
  if (!ITEM_ID_RE.test(id)) {
    return errorJson(400, "invalid id");
  }
  if (action !== "approve" && action !== "reject") {
    return errorJson(400, "action must be approve or reject");
  }

  await ensureSchema(env.GALLERY_DB);
  const row = await env.GALLERY_DB.prepare("SELECT * FROM gallery_items WHERE id = ?").bind(id).first();
  if (!row) {
    return errorJson(404, "not found");
  }
  if (row.status !== "pending" && !(action === "reject" && row.status === "approved")) {
    return errorJson(409, "item is not pending", { status: row.status });
  }

  const reviewedAt = nowSql();
  if (action === "reject") {
    await env.GALLERY_DB.prepare(
      "UPDATE gallery_items SET status = 'rejected', reviewed_at = ?, reject_reason = ?, publish_at = NULL WHERE id = ?"
    )
      .bind(reviewedAt, reason || null, id)
      .run();
    try {
      await deleteImage(env, row.object_key);
    } catch (err) {
      /* metadata already marked rejected */
    }
    return json({ id, status: "rejected", reviewed_at: reviewedAt });
  }

  const publishAt = await allocatePublishAt(env.GALLERY_DB, env);
  await env.GALLERY_DB.prepare(
    "UPDATE gallery_items SET status = 'approved', reviewed_at = ?, publish_at = ?, reject_reason = NULL WHERE id = ?"
  )
    .bind(reviewedAt, publishAt, id)
    .run();
  return json({
    id,
    status: "approved",
    reviewed_at: reviewedAt,
    publish_at: publishAt,
    live: publishAt <= nowSql(),
  });
}
