-- Community gallery metadata (D1). Image bytes live in R2 (GALLERY_BUCKET) or KV (GALLERY_KV).
CREATE TABLE IF NOT EXISTS gallery_items (
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
);

CREATE INDEX IF NOT EXISTS idx_gallery_status_created ON gallery_items (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_status_publish ON gallery_items (status, publish_at DESC);

CREATE TABLE IF NOT EXISTS gallery_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO gallery_meta (key, value) VALUES ('publish_per_hour', '3');
INSERT OR IGNORE INTO gallery_meta (key, value) VALUES ('next_publish_slot', '');
