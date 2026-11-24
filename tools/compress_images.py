#!/usr/bin/env python3
"""Resize and recompress site images. Writes WebP sidecars and a size manifest."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "img"
MAX_WIDTH = 1920
JPEG_QUALITY = 80
WEBP_QUALITY = 80
MANIFEST = ROOT / "img" / "image-sizes.json"


def iter_images():
    for path in sorted(IMG.rglob("*")):
        if not path.is_file():
            continue
        if path.name.lower() in {"thumbs.db", "favico.ico", "favicon.ico"}:
            continue
        if path.suffix.lower() in {".jpg", ".jpeg", ".png"}:
            yield path


def save_jpeg(im: Image.Image, dest: Path) -> None:
    rgb = im.convert("RGB")
    rgb.save(
        dest,
        format="JPEG",
        quality=JPEG_QUALITY,
        optimize=True,
        progressive=True,
    )


def save_webp(im: Image.Image, dest: Path) -> None:
    rgb = im.convert("RGB")
    rgb.save(dest, format="WEBP", quality=WEBP_QUALITY, method=6)


def process(path: Path) -> dict:
    with Image.open(path) as im:
        im = im.convert("RGB") if im.mode not in {"RGB", "L"} else im
        width, height = im.size
        longest = max(width, height)
        if longest > MAX_WIDTH:
            scale = MAX_WIDTH / longest
            width = max(1, round(width * scale))
            height = max(1, round(height * scale))
            im = im.resize((width, height), Image.Resampling.LANCZOS)

        suffix = path.suffix.lower()
        if suffix == ".png":
            jpeg_path = path.with_suffix(".jpg")
            save_jpeg(im, jpeg_path)
            webp_path = path.with_suffix(".webp")
            save_webp(im, webp_path)
            # Keep a smaller PNG only if it stays useful; otherwise drop the huge original.
            if path.stat().st_size > 400_000:
                path.unlink()
            display_src = str(jpeg_path.relative_to(ROOT)).replace("\\", "/")
        else:
            # Recompress in place when the file is large or was resized.
            original_size = path.stat().st_size
            if original_size > 180_000 or width == MAX_WIDTH:
                save_jpeg(im, path)
            webp_path = path.with_suffix(".webp")
            save_webp(im, webp_path)
            display_src = str(path.relative_to(ROOT)).replace("\\", "/")

        webp_rel = str(webp_path.relative_to(ROOT)).replace("\\", "/")
        return {
            "src": display_src,
            "webp": webp_rel,
            "width": width,
            "height": height,
            "bytes": Path(ROOT / display_src).stat().st_size,
        }


def main() -> None:
    manifest = {}
    for path in iter_images():
        info = process(path)
        manifest[info["src"]] = info
        # Also index original png path if converted
        orig = str(path.relative_to(ROOT)).replace("\\", "/")
        manifest[orig] = info
        print(f"{orig}: {info['width']}x{info['height']} -> {info['bytes']} bytes")
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {MANIFEST}")


if __name__ == "__main__":
    main()
