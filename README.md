# AT&T Long Lines & Bell Labs

Independent historical site about AT&T Long Lines and Bell Telephone Laboratories. It is not affiliated with AT&T Inc. or Nokia Bell Labs.

Live site: [https://belllaboratories.net](https://belllaboratories.net)

## Editing

The site is plain static HTML and CSS. There is no framework and no build step for deployment.

- Shared look: `css/site.css`
- Shared behavior (theme toggle, mobile nav, slideshow, year): `js/site.js`
- Copy the header/nav/footer from an existing article when you add a page
- Theme choice is stored in `localStorage` (`theme` = `light` or `dark`) and follows `prefers-color-scheme` until the visitor picks one
- Cloudflare Pages serves `name.html` at `/name`. Canonical URLs use `https://belllaboratories.net/name`

Helpers used while compressing images and wrapping chrome (optional, not required to deploy):

- `tools/compress_images.py`
- `tools/wrap_pages.py` and `tools/content/`

## Community gallery

Discord bot **L5** can upload photographs to a private pending queue. Owners approve or reject them at `/admin`. Approved images go public on `/gallery` a few per hour, each credited as `Photo: <name>`.

API, auth, staggered publish, and Cloudflare setup: [docs/gallery-api.md](docs/gallery-api.md).

Required Pages secret (do not commit a value): `L5_GALLERY_TOKEN`.

## Deploy

Cloudflare Pages project `belllabs`. The GitHub Action in `.github/workflows/publish.yml` publishes the repository root. After the first Functions deploy, set the gallery token:

```bash
npx wrangler pages secret put L5_GALLERY_TOKEN --project-name belllabs
```
