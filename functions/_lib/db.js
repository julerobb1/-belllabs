import { nowSql } from "./http.js";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS gallery_items (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    credit_name TEXT NOT NULL,
    discord_user_id TEXT,
    caption TEXT,
    source_url TEXT,
    content_type TEXT NOT NULL,
    object_key TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    byte_size INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at TEXT,
    publish_at TEXT,
    reject_reason TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_gallery_status_created ON gallery_items (status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_gallery_status_publish ON gallery_items (status, publish_at DESC)`,
  `CREATE TABLE IF NOT EXISTS gallery_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `INSERT OR IGNORE INTO gallery_meta (key, value) VALUES ('publish_per_hour', '3')`,
  `INSERT OR IGNORE INTO gallery_meta (key, value) VALUES ('next_publish_slot', '')`,
];

export async function ensureSchema(db) {
  const statements = SCHEMA.map((sql) => db.prepare(sql));
  await db.batch(statements);
}

export function dbReady(env) {
  return Boolean(env.GALLERY_DB);
}

function perHour(env) {
  const n = Number(env.GALLERY_PUBLISH_PER_HOUR);
  if (!Number.isFinite(n) || n <= 0) {
    return 3;
  }
  return Math.min(30, n);
}

export function intervalSeconds(env) {
  return Math.max(60, Math.round(3600 / perHour(env)));
}

export async function allocatePublishAt(db, env) {
  const interval = intervalSeconds(env);
  const row = await db.prepare("SELECT value FROM gallery_meta WHERE key = 'next_publish_slot'").first();
  const now = Date.now();
  let storedMs = 0;
  if (row && row.value) {
    const parsed = Date.parse(String(row.value).replace(" ", "T") + "Z");
    if (!Number.isNaN(parsed)) {
      storedMs = parsed;
    }
  }
  const slotMs = storedMs > now ? storedMs : now;
  const nextMs = slotMs + interval * 1000;
  await db
    .prepare(
      "INSERT INTO gallery_meta (key, value) VALUES ('next_publish_slot', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .bind(nowSql(new Date(nextMs)))
    .run();
  return nowSql(new Date(slotMs));
}

export const PUBLIC_WHERE =
  "status = 'approved' AND publish_at IS NOT NULL AND publish_at <= datetime('now')";
