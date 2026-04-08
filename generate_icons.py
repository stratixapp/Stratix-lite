"""
generate_icons.py — Stratix Icon Generator
==========================================
Run this ONCE to generate all required PWA + Play Store icons.

Requirements:
  pip install Pillow

Usage:
  1. Place your source icon (at least 1024x1024 PNG) in same folder as this script.
     Name it: icon-source.png
  2. Run: python generate_icons.py
  3. Copy the generated /icons/ folder to your hosting root.
"""

from PIL import Image, ImageDraw
import os
import math

# ── CONFIG ──────────────────────────────────────────
SOURCE = 'icon-source.png'   # Your master icon (1024x1024+)
OUT_DIR = 'icons'

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
# ────────────────────────────────────────────────────


def make_icon(img, size, path, maskable=False):
    """Resize and save icon. Maskable adds safe-zone padding (10% each side)."""
    canvas = Image.new('RGBA', (size, size), (7, 8, 16, 255))  # --bg color
    if maskable:
        # Safe zone: icon fills inner 80%
        inner = int(size * 0.80)
        pad = (size - inner) // 2
        src = img.resize((inner, inner), Image.LANCZOS)
        canvas.paste(src, (pad, pad), src if src.mode == 'RGBA' else None)
    else:
        src = img.resize((size, size), Image.LANCZOS)
        canvas.paste(src, (0, 0), src if src.mode == 'RGBA' else None)
    canvas.save(path, 'PNG', optimize=True)
    print(f'  ✅ {path} ({size}x{size}{"  maskable" if maskable else ""})')


def generate_fallback_icon(size):
    """Generate a simple SX logo if no source PNG provided."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Background rounded rect (approximate with ellipse corners)
    bg_color = (247, 201, 72, 255)   # #F7C948
    draw.rectangle([0, 0, size-1, size-1], fill=bg_color)
    # Text SX — use default font since we can't guarantee font files
    text = 'SX'
    fs = int(size * 0.45)
    try:
        from PIL import ImageFont
        font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', fs)
    except Exception:
        font = None
    if font:
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(((size - tw) // 2, (size - th) // 2 - int(size*0.03)), text,
                  fill=(26, 26, 26, 255), font=font)
    else:
        # Fallback — just colored square
        draw.text((size//4, size//3), text, fill=(26, 26, 26, 255))
    return img


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    if os.path.exists(SOURCE):
        print(f'📂 Loading source: {SOURCE}')
        src_img = Image.open(SOURCE).convert('RGBA')
    else:
        print(f'⚠️  {SOURCE} not found — generating placeholder SX icons.')
        print('   Replace icons/icon-512.png with your real icon later.\n')
        src_img = generate_fallback_icon(1024)

    print('🎨 Generating icons...')
    for size in SIZES:
        path = os.path.join(OUT_DIR, f'icon-{size}.png')
        make_icon(src_img, size, path, maskable=False)

    # Maskable variant (512 only — Play Store adaptive icon)
    maskable_path = os.path.join(OUT_DIR, 'icon-maskable-512.png')
    make_icon(src_img, 512, maskable_path, maskable=True)

    print(f'\n✅ Done! {len(SIZES) + 1} icons saved to /{OUT_DIR}/')
    print('\nNext:')
    print('  1. Copy /icons/ folder to your Firebase Hosting / Vercel root')
    print('  2. Copy manifest.json to your hosting root')
    print('  3. Copy sw.js to your hosting root')
    print('  4. Deploy!')


if __name__ == '__main__':
    main()
