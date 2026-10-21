#!/usr/bin/env python3
"""Generate social/schema image crops for every article.

For each post in data/posts.json, crops the article's 1000x1500 pin
image (the one consistently large asset on every article; cover photos
vary from 474px to 1000px wide) into the sizes Google and the social
platforms ask for:

  public/images/og/<slug>-og.jpg    1200x630  (og:image, ~1.91:1)
  public/images/og/<slug>-16x9.jpg  1280x720
  public/images/og/<slug>-4x3.jpg   1200x900
  public/images/og/<slug>-1x1.jpg   1200x1200

Wide ratios are cropped from the top of the pin (the top photo pair,
above the title band); the square is center-cropped. Output is JPEG
quality 82, matching the site's photo compression.

Run directly or via scripts/generate.mjs, which invokes it at build
time. Uses PIL, same as scripts/optimize-images.py.
"""
import json
import os

from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT_DIR = os.path.join(ROOT, "public", "images", "og")

# (suffix, out_w, out_h, anchor) -- anchor "top" pins the crop to y=0,
# "center" centers it vertically.
CROPS = [
    ("og", 1200, 630, "top"),
    ("16x9", 1280, 720, "top"),
    ("4x3", 1200, 900, "top"),
    ("1x1", 1200, 1200, "center"),
]


def crop_to(im, out_w, out_h, anchor):
    ratio = out_w / out_h
    w, h = im.size
    if w / h > ratio:  # source wider than target: crop width
        box_w = int(h * ratio)
        box_h = h
        x0 = (w - box_w) // 2
        y0 = 0
    else:  # crop height
        box_w = w
        box_h = int(w / ratio)
        x0 = 0
        y0 = 0 if anchor == "top" else (h - box_h) // 2
    return im.crop((x0, y0, x0 + box_w, y0 + box_h)).resize(
        (out_w, out_h), Image.LANCZOS)


def main():
    with open(os.path.join(ROOT, "data", "posts.json")) as f:
        posts = json.load(f)["posts"]
    os.makedirs(OUT_DIR, exist_ok=True)
    made = 0
    for post in posts:
        src_path = os.path.join(ROOT, "public", post["pinImage"].lstrip("/"))
        if not os.path.exists(src_path):
            print("og-images: missing pin image for", post["slug"])
            continue
        im = Image.open(src_path).convert("RGB")
        for suffix, out_w, out_h, anchor in CROPS:
            dest = os.path.join(OUT_DIR, f'{post["slug"]}-{suffix}.jpg')
            crop_to(im, out_w, out_h, anchor).save(
                dest, "JPEG", quality=82, optimize=True, progressive=True)
            made += 1
    print(f"og-images: wrote {made} crops for {len(posts)} articles")


if __name__ == "__main__":
    main()
