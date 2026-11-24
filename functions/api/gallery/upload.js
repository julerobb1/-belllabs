import { requireGalleryToken } from "../../_lib/auth.js";
import { dbReady, ensureSchema } from "../../_lib/db.js";
import { errorJson, json, methodNotAllowed, nowSql } from "../../_lib/http.js";
import { MAX_BYTES, prepareUpload } from "../../_lib/image.js";
import { deleteImage, objectKey, putImage, storageConfigured } from "../../_lib/storage.js";

const CREDIT_MAX = 80;
const CAPTION_MAX = 500;
const SOURCE_MAX = 500;
const USER_ID_MAX = 32;

function field(form, names) {
  for (const name of names) {
    const value = form.get(name);
    if (value != null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function validSource(url) {
  if (!url) {
    return true;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (err) {
    return false;
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") {
    return methodNotAllowed("POST");
  }
  const auth = await requireGalleryToken(request, env);
  if (!auth.ok) {
    return errorJson(auth.status, auth.error);
  }
  if (!dbReady(env) || !storageConfigured(env)) {
    return errorJson(503, "gallery storage is not configured");
  }

  const length = Number(request.headers.get("content-length") || "0");
  if (length > MAX_BYTES + 64 * 1024) {
    return errorJson(413, "file too large");
  }

  let form;
  try {
    form = await request.formData();
  } catch (err) {
    return errorJson(400, "expected multipart form data");
  }

  const file = form.get("image") || form.get("file") || form.get("photo");
  if (!file || typeof file.arrayBuffer !== "function") {
    return errorJson(400, "missing image file (field name: image)");
  }
  const credit = field(form, ["credit", "credit_name", "display_name"]);
  if (!credit || credit.length > CREDIT_MAX) {
    return errorJson(400, "credit (Discord display name) is required, max " + CREDIT_MAX + " characters");
  }
  const caption = field(form, ["caption"]);
  if (caption.length > CAPTION_MAX) {
    return errorJson(400, "caption is too long");
  }
  const source = field(form, ["source", "source_url", "source_message_link", "message_link"]);
  if (source.length > SOURCE_MAX || !validSource(source)) {
    return errorJson(400, "source must be an http(s) URL");
  }
  const userId = field(form, ["user_id", "discord_user_id"]);
  if (userId.length > USER_ID_MAX || (userId && !/^\d+$/.test(userId))) {
    return errorJson(400, "user_id must be a numeric Discord snowflake");
  }

  const raw = new Uint8Array(await file.arrayBuffer());
  const prepared = await prepareUpload(raw, env);
  if (prepared.error) {
    return errorJson(prepared.status, prepared.error);
  }

  await ensureSchema(env.GALLERY_DB);
  const id = crypto.randomUUID();
  const key = objectKey(id);
  const createdAt = nowSql();
  await putImage(env, id, prepared.bytes, prepared.contentType);
  try {
    await env.GALLERY_DB.prepare(
      `INSERT INTO gallery_items (
        id, status, credit_name, discord_user_id, caption, source_url,
        content_type, object_key, width, height, byte_size, created_at
      ) VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        credit,
        userId || null,
        caption || null,
        source || null,
        prepared.contentType,
        key,
        prepared.width,
        prepared.height,
        prepared.bytes.length,
        createdAt
      )
      .run();
  } catch (err) {
    try {
      await deleteImage(env, key);
    } catch (cleanupErr) {
      /* best-effort cleanup */
    }
    return errorJson(500, "failed to record upload");
  }

  return json(
    {
      id,
      status: "pending",
      created_at: createdAt,
      width: prepared.width,
      height: prepared.height,
      bytes: prepared.bytes.length,
    },
    201
  );
}
