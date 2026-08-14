"""Build a square transparent app icon from the Kevin cube source PNG."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "kevin-cube-source.png"
OUTPUT = ROOT / "app-icon.png"
SIZE = 1024
PADDING_RATIO = 0.08
BLACK_THRESHOLD = 32


def remove_black_background(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r < BLACK_THRESHOLD and g < BLACK_THRESHOLD and b < BLACK_THRESHOLD:
                pixels[x, y] = (r, g, b, 0)
    return img


def crop_to_content(img: Image.Image) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    return img.crop(bbox)


def to_square_icon(img: Image.Image, size: int) -> Image.Image:
    img = crop_to_content(img)
    pad = int(max(img.size) * PADDING_RATIO)
    padded = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    padded.paste(img, (pad, pad), img)

    side = max(padded.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    offset = ((side - padded.width) // 2, (side - padded.height) // 2)
    canvas.paste(padded, offset, padded)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing source image: {SOURCE}")

    icon = to_square_icon(remove_black_background(Image.open(SOURCE)), SIZE)
    icon.save(OUTPUT, format="PNG")
    print(f"Wrote {OUTPUT} ({icon.size[0]}x{icon.size[1]})")


if __name__ == "__main__":
    main()
