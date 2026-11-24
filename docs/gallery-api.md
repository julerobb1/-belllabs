# L5 community gallery API

The L5 Discord bot uploads photographs to this site. Uploads are **pending** until an owner approves them. Approved items are published on a stagger (default **3 per hour**) rather than all at once. The public gallery never includes Discord user IDs.

## Cloudflare setup

These resources already exist on the `belllabs` Pages project:

| Binding | Resource | Purpose |
| --- | --- | --- |
| `GALLERY_DB` | D1 `belllabs-gallery` (`529c69c5-9c53-4fa2-9cef-12f621f8590e`) | Metadata, pending queue, `publish_at` |
| `GALLERY_KV` | KV `belllabs-gallery` (`fd5625d6de494169b843abbe51e43bb9`) | Image bytes (free-tier fallback) |
| `GALLERY_PUBLISH_PER_HOUR` | Pages var, default `3` | Stagger rate |
| `GALLERY_MAX_SIDE` | Pages var, default `1920` | Longest side when the Images binding is available |
| `L5_GALLERY_TOKEN` | Pages **secret** | Bearer token for upload and moderation |

Set the token (generate a long random value; do not commit it):

```bash
openssl rand -hex 32
npx wrangler pages secret put L5_GALLERY_TOKEN --project-name belllabs
```

Optional, after you enable R2 in the Cloudflare dashboard (one-time; the free allotment is enough for this gallery):

1. Create bucket `belllabs-gallery`.
2. Add to `wrangler.jsonc`:

```jsonc
"r2_buckets": [{ "binding": "GALLERY_BUCKET", "bucket_name": "belllabs-gallery" }]
```

Functions prefer R2 when `GALLERY_BUCKET` is bound. Until then they store bytes in KV.

Optional Images binding (paid) resizes on upload to `GALLERY_MAX_SIDE` and re-encodes JPEG, which also strips remaining metadata. Without it, the Function still **strips EXIF/GPS** from JPEG, PNG, and WebP and stores the cleaned file.

Protect `/admin` with [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-applications/) if you can. The Bearer token is still required.

Local:

```bash
cp .dev.vars.example .dev.vars   # put the token here; never commit .dev.vars
npx wrangler pages dev
```

Schema: `schema.sql` (also applied automatically on first Function request).

## Auth

Authenticated routes expect:

```
Authorization: Bearer <L5_GALLERY_TOKEN>
```

Missing or wrong token → `401`. Token secret not configured → `503`. Comparison is SHA-256 + `timingSafeEqual`.

## Limits

- Types: JPEG, PNG, WebP (magic bytes, not the filename)
- Size: ≤ 10 MB
- EXIF, GPS, IPTC, COM, PNG `eXIf`/`tEXt`/`iTXt`, WebP `EXIF`/`XMP` are stripped
- Discord `user_id` is stored for the owner only and omitted from `GET /api/gallery`

---

## `POST /api/gallery/upload`

Authenticated. Multipart form. Creates a **pending** item; it is not public.

### Fields

| Field | Required | Notes |
| --- | --- | --- |
| `image` | yes | File. Aliases: `file`, `photo` |
| `credit` | yes | Discord display name, max 80. Aliases: `credit_name`, `display_name` |
| `caption` | no | Max 500 |
| `source` | no | `https` link to the Discord message. Aliases: `source_url`, `source_message_link`, `message_link` |
| `user_id` | no | Discord snowflake. Hidden from the public API. Aliases: `discord_user_id` |

### Request

```bash
curl -sS -X POST https://belllaboratories.net/api/gallery/upload \
  -H "Authorization: Bearer $L5_GALLERY_TOKEN" \
  -F "image=@tower.jpg;type=image/jpeg" \
  -F "credit=Lightsnipe" \
  -F "user_id=123456789012345678" \
  -F "caption=Horn-reflector at a former Long Lines site" \
  -F "source=https://discord.com/channels/807000904397094913/1/2"
```

### Response `201`

```json
{
  "id": "c3b0d1a2-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
  "status": "pending",
  "created_at": "2026-11-24 12:00:00",
  "width": 1920,
  "height": 1080,
  "bytes": 412000
}
```

Errors: `400` missing credit/file, `413` too large, `415` not jpg/png/webp, `401` / `503`.

---

## `GET /api/gallery/admin`

Authenticated. Owner queue.

Query:

- `status` = `pending` (default) | `scheduled` | `live` | `approved` | `rejected`
- `limit` = 1–100, default 50

```bash
curl -sS https://belllaboratories.net/api/gallery/admin?status=pending \
  -H "Authorization: Bearer $L5_GALLERY_TOKEN"
```

```json
{
  "items": [
    {
      "id": "c3b0d1a2-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
      "status": "pending",
      "credit": "Lightsnipe",
      "user_id": "123456789012345678",
      "caption": "Horn-reflector at a former Long Lines site",
      "source": "https://discord.com/channels/807000904397094913/1/2",
      "content_type": "image/jpeg",
      "width": 1920,
      "height": 1080,
      "bytes": 412000,
      "created_at": "2026-11-24 12:00:00",
      "reviewed_at": null,
      "publish_at": null,
      "reject_reason": null,
      "preview_url": "/api/gallery/img/c3b0d1a2-4e5f-4a6b-8c9d-0e1f2a3b4c5d"
    }
  ],
  "counts": { "pending": 1, "scheduled": 0, "live": 4, "rejected": 0 }
}
```

Pending previews need the same Bearer token (`<img>` tags cannot send it; the admin page fetches a blob URL).

---

## `POST /api/gallery/moderate`

Authenticated. Approve or reject.

```bash
curl -sS -X POST https://belllaboratories.net/api/gallery/moderate \
  -H "Authorization: Bearer $L5_GALLERY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id":"c3b0d1a2-4e5f-4a6b-8c9d-0e1f2a3b4c5d","action":"approve"}'
```

```json
{
  "id": "c3b0d1a2-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
  "status": "approved",
  "reviewed_at": "2026-11-24 12:05:00",
  "publish_at": "2026-11-24 12:05:00",
  "live": true
}
```

Reject:

```json
{ "id": "c3b0d1a2-4e5f-4a6b-8c9d-0e1f2a3b4c5d", "action": "reject", "reason": "off topic" }
```

```json
{
  "id": "c3b0d1a2-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
  "status": "rejected",
  "reviewed_at": "2026-11-24 12:06:00"
}
```

`409` if the item is not pending. Reject also works on an approved item (unpublish + delete bytes).

### Stagger

On approve, `publish_at` is the next free slot:

- First approval in an empty queue: now (goes live on the next public read)
- Further approvals: previous slot + `3600 / GALLERY_PUBLISH_PER_HOUR` seconds (default 20 minutes, 3 per hour)
- Minimum interval is 60 seconds

Public list and `/gallery` only return rows with `status = approved` **and** `publish_at <= now`. No cron is required. Optional heartbeat:

```bash
curl -sS https://belllaboratories.net/api/gallery/tick \
  -H "Authorization: Bearer $L5_GALLERY_TOKEN"
```

A Cloudflare Worker cron can `GET`/`POST` that URL if you want a scheduled ping. Publish-at timestamps are the source of truth.

---

## `GET /api/gallery`

Public. Newest live items first. No Discord user IDs.

Query: `limit` (default 30, max 50), `before` (SQL timestamp cursor from `next_before`).

```bash
curl -sS https://belllaboratories.net/api/gallery?limit=2
```

```json
{
  "items": [
    {
      "id": "c3b0d1a2-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
      "url": "https://belllaboratories.net/api/gallery/img/c3b0d1a2-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
      "credit": "Lightsnipe",
      "caption": "Horn-reflector at a former Long Lines site",
      "source": "https://discord.com/channels/807000904397094913/1/2",
      "published_at": "2026-11-24 12:05:00",
      "width": 1920,
      "height": 1080
    }
  ],
  "next_before": null
}
```

Authenticated `?include=scheduled` also returns approved items that are not live yet (for the bot if it needs the queue).

---

## `GET /api/gallery/img/:id`

Public for **live** items. Pending/scheduled images return `404` unless the Bearer token is present.

---

## Pages

| URL | Who |
| --- | --- |
| `/gallery` | Public. Community photos with **Photo: &lt;name&gt;**, lazy-loaded, then the existing site collection |
| `/admin` | Owner queue. Token in `sessionStorage`. `robots` noindex |

Bot pull: `GET /api/gallery` (live) and, with the token, `GET /api/gallery/admin?status=pending`.
