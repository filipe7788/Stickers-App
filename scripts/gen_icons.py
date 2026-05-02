"""Generate app icons for PaqueteStickers — iOS + Android."""
import os, math
from PIL import Image, ImageDraw, ImageFont

SIZE = 1024

def make_master(path):
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Gradient background: violet → hot-pink (diagonal)
    for y in range(SIZE):
        for x in range(SIZE):
            t = (x + y) / (2 * SIZE)
            r = int(72  + (255 - 72)  * t)
            g = int(52  + (75  - 52)  * t)
            b = int(212 + (130 - 212) * t)
            draw.point((x, y), fill=(r, g, b, 255))

    # Rounded-rect background (fill already done above, just need icon elements)
    # White sticker card — slightly tilted
    card_size = int(SIZE * 0.62)
    card = Image.new("RGBA", (card_size, card_size), (0, 0, 0, 0))
    card_draw = ImageDraw.Draw(card)
    radius = int(card_size * 0.18)
    card_draw.rounded_rectangle([0, 0, card_size - 1, card_size - 1],
                                 radius=radius, fill=(255, 255, 255, 255))
    card_rot = card.rotate(12, expand=True, resample=Image.BICUBIC)
    cx = (SIZE - card_rot.width) // 2
    cy = (SIZE - card_rot.height) // 2 - int(SIZE * 0.02)
    img.paste(card_rot, (cx, cy), card_rot)

    # Emoji sticker dots — colourful circles scattered on the card
    dots = [
        (0.30, 0.28, "#FF6B6B", 0.09),  # red
        (0.68, 0.32, "#FFD93D", 0.08),  # yellow
        (0.25, 0.62, "#6BCB77", 0.07),  # green
        (0.70, 0.65, "#4D96FF", 0.08),  # blue
        (0.50, 0.47, "#FF922B", 0.10),  # orange (centre)
    ]
    for (fx, fy, colour, fr) in dots:
        r_px = int(SIZE * fr)
        x0 = int(SIZE * fx) - r_px
        y0 = int(SIZE * fy) - r_px
        draw.ellipse([x0, y0, x0 + r_px * 2, y0 + r_px * 2], fill=colour)

    # Bold "P" letter on the centre dot
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", int(SIZE * 0.12))
    except Exception:
        font = ImageFont.load_default()

    letter = "P"
    bbox = draw.textbbox((0, 0), letter, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = int(SIZE * 0.50) - tw // 2
    ty = int(SIZE * 0.47) - th // 2 - int(SIZE * 0.01)
    draw.text((tx, ty), letter, font=font, fill="white")

    img.save(path, "PNG")
    print(f"Master icon saved → {path}")
    return img


def resize_save(master, dest, size):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    icon = master.resize((size, size), Image.LANCZOS)
    # Android needs RGB for JPEG-compatible PNGs; iOS is fine with RGBA
    icon.save(dest, "PNG")


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    master_path = os.path.join(root, "scripts", "icon_master.png")
    master = make_master(master_path)

    # ── iOS ──────────────────────────────────────────────────────────────────
    ios_dir = os.path.join(root, "ios", "PaqueteStickers", "Images.xcassets",
                           "AppIcon.appiconset")
    ios_sizes = [
        ("icon-20@2x.png",   40),
        ("icon-20@3x.png",   60),
        ("icon-29@2x.png",   58),
        ("icon-29@3x.png",   87),
        ("icon-40@2x.png",   80),
        ("icon-40@3x.png",  120),
        ("icon-60@2x.png",  120),
        ("icon-60@3x.png",  180),
        ("icon-1024.png",  1024),
    ]
    for name, sz in ios_sizes:
        resize_save(master, os.path.join(ios_dir, name), sz)
        print(f"  iOS {sz}x{sz} → {name}")

    # Update Contents.json with filenames
    import json
    contents_path = os.path.join(ios_dir, "Contents.json")
    mapping = {
        ("iphone", "2x", "20x20"): "icon-20@2x.png",
        ("iphone", "3x", "20x20"): "icon-20@3x.png",
        ("iphone", "2x", "29x29"): "icon-29@2x.png",
        ("iphone", "3x", "29x29"): "icon-29@3x.png",
        ("iphone", "2x", "40x40"): "icon-40@2x.png",
        ("iphone", "3x", "40x40"): "icon-40@3x.png",
        ("iphone", "2x", "60x60"): "icon-60@2x.png",
        ("iphone", "3x", "60x60"): "icon-60@3x.png",
        ("ios-marketing", "1x", "1024x1024"): "icon-1024.png",
    }
    with open(contents_path) as f:
        contents = json.load(f)
    for entry in contents["images"]:
        key = (entry.get("idiom"), entry.get("scale"), entry.get("size"))
        if key in mapping:
            entry["filename"] = mapping[key]
    with open(contents_path, "w") as f:
        json.dump(contents, f, indent=2)
    print("  iOS Contents.json updated")

    # ── Android ──────────────────────────────────────────────────────────────
    android_base = os.path.join(root, "android", "app", "src", "main", "res")
    android_sizes = [
        ("mipmap-mdpi",    48),
        ("mipmap-hdpi",    72),
        ("mipmap-xhdpi",   96),
        ("mipmap-xxhdpi", 144),
        ("mipmap-xxxhdpi",192),
    ]
    for folder, sz in android_sizes:
        for name in ("ic_launcher.png", "ic_launcher_round.png"):
            dest = os.path.join(android_base, folder, name)
            resize_save(master, dest, sz)
        print(f"  Android {sz}x{sz} → {folder}")

    print("\nAll icons generated ✓")


if __name__ == "__main__":
    main()
