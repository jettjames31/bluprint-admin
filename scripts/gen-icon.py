#!/usr/bin/env python3
"""Prepare the Bluprint logo for the dark dashboard + generate the app icon.

The source logo is a silver "B" on a WHITE background (no alpha). Since the mark
is grayscale, we derive an alpha channel from luminance — keying out the white
field (and the enclosed counters of the B) to transparent while preserving the
metal — then:
  1. write a transparent, web-sized logo to src/assets/logo.png (used in-app), and
  2. composite the keyed mark onto a near-black squircle for the macOS app icon.

  python3 scripts/gen-icon.py
  npx @tauri-apps/cli icon src-tauri/icons/source.png
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "src", "assets", "logo-source.png")
LOGO_OUT = os.path.join(ROOT, "src", "assets", "logo.png")
ICON_OUT = os.path.join(ROOT, "src-tauri", "icons", "source.png")

CUT = 244        # luminance >= CUT  -> fully transparent (the white field)
FEATHER = 222    # FEATHER..CUT     -> partial alpha (anti-aliased edge)


def keyed_logo():
    """Return the logo as RGBA with the white background keyed out."""
    rgb = Image.open(SRC).convert("RGB")
    lum = rgb.convert("L")

    def alpha_for(l):
        if l >= CUT:
            return 0
        if l >= FEATHER:
            return int(255 * (CUT - l) / (CUT - FEATHER))
        return 255

    alpha = lum.point(alpha_for)  # 256-entry LUT — fast
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    return out


def main():
    logo = keyed_logo()

    # 1) transparent web logo (256px, trimmed to content)
    bbox = logo.getbbox()
    trimmed = logo.crop(bbox) if bbox else logo
    web = trimmed.copy()
    web.thumbnail((256, 256), Image.LANCZOS)
    web.save(LOGO_OUT)
    print("wrote", LOGO_OUT, web.size)

    # 2) app icon: keyed mark on a near-black squircle
    SIZE, RADIUS, SCALE = 1024, 230, 0.62
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=RADIUS, fill=255)
    fill = Image.new("RGBA", (SIZE, SIZE))
    top, bot = (22, 22, 26), (10, 10, 12)
    for y in range(SIZE):
        t = y / (SIZE - 1)
        row = (
            round(top[0] + (bot[0] - top[0]) * t),
            round(top[1] + (bot[1] - top[1]) * t),
            round(top[2] + (bot[2] - top[2]) * t),
            255,
        )
        for x in range(SIZE):
            fill.putpixel((x, y), row)
    canvas.paste(fill, (0, 0), mask)
    border = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(border).rounded_rectangle(
        [2, 2, SIZE - 3, SIZE - 3], radius=RADIUS - 2, outline=(255, 255, 255, 26), width=3
    )
    canvas = Image.alpha_composite(canvas, border)

    mark = trimmed.copy()
    target = int(SIZE * SCALE)
    w, h = mark.size
    s = target / max(w, h)
    mark = mark.resize((round(w * s), round(h * s)), Image.LANCZOS)
    pos = ((SIZE - mark.size[0]) // 2, (SIZE - mark.size[1]) // 2)
    canvas.alpha_composite(mark, pos)
    canvas.save(ICON_OUT)
    print("wrote", ICON_OUT, canvas.size)


if __name__ == "__main__":
    main()
