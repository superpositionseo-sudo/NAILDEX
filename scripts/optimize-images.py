#!/usr/bin/env python3
"""Copy and web-optimize all site images into public/.

Sources (owner's own assets):
  - Article photos: sewinsnearme repo public/images/nails/<set>/
  - Pin images:     ~/workspace/sewinsnearme/nails/pins/
  - Brand:          ~/workspace/sewinsnearme/nails/brand/logo/

Article photos are resized to max 1000px wide, JPEG quality 80.
Pin images keep their 1000x1500 size, saved as quality-85 JPEG.
Brand lockups are resized down for header/footer/favicon use.
"""
import os
from PIL import Image

HOME = os.path.expanduser("~")
REPO_PUBLIC = os.path.join(HOME, "workspace/sewinsnearme/repo/public")
PINS_SRC = os.path.join(HOME, "workspace/sewinsnearme/nails/pins")
LOGO_SRC = os.path.join(HOME, "workspace/sewinsnearme/nails/brand/logo")
OUT = os.path.join(HOME, "workspace/naildex-site/public")


def save_jpg(im, dest, quality=80):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    im.convert("RGB").save(dest, "JPEG", quality=quality, optimize=True, progressive=True)
    return os.path.getsize(dest)


total = 0
for photo_set in ("october-nail-ideas", "fall-nail-ideas"):
    src_dir = os.path.join(REPO_PUBLIC, "images/nails", photo_set)
    for name in sorted(os.listdir(src_dir)):
        if not name.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        im = Image.open(os.path.join(src_dir, name))
        if im.width > 1000:
            im = im.resize((1000, round(im.height * 1000 / im.width)), Image.LANCZOS)
        dest = os.path.join(OUT, "images/nails", photo_set, os.path.splitext(name)[0] + ".jpg")
        total += save_jpg(im, dest, 80)
print("article photos done")

for pin in ("31-october-nail-ideas-in-2026-pin.png", "39-fall-nail-ideas-in-2026-pin.png"):
    im = Image.open(os.path.join(PINS_SRC, pin))
    dest = os.path.join(OUT, "images/pins", pin.replace(".png", ".jpg"))
    total += save_jpg(im, dest, 85)
print("pins done")

# Brand marks
mark = Image.open(os.path.join(LOGO_SRC, "concept-a-almond-avatar-wine.png"))
for size, name in ((256, "mark-256.png"), (64, "mark-64.png")):
    m = mark.resize((size, size), Image.LANCZOS)
    m.save(os.path.join(OUT, "images/brand", name), optimize=True)
mark.resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, "favicon.png"), optimize=True)
mark.resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, "apple-touch-icon.png"), optimize=True)

for lockup, out_name, width in (
    ("naildex-lockup-dark.png", "lockup-cream.png", 700),
    ("naildex-lockup-light.png", "lockup-wine.png", 700),
):
    im = Image.open(os.path.join(LOGO_SRC, lockup))
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(os.path.join(OUT, "images/brand", out_name), optimize=True)
print("brand done")
print("total jpg bytes:", total)
