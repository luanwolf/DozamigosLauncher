"""Download clean sprite icons into static/elementals/.

fortnite.gg/sprites is behind Cloudflare here, so we pull the same in-game
sprite icons from a public pack that mirrors that catalog, then convert to WebP.
"""

from __future__ import annotations

import os
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "static" / "elementals"
BASE = "https://raw.githubusercontent.com/mrpaulgaming/fnspritelocker/main/assets"
UA = "DozamigosLauncher/0.1.10 (sprite-asset-sync)"

FAMILIES = {
    "klombo": "klombo",
    "crown": "crown",
    "jackrabbit": "jackrabbit",
    "sonic": "sonic",
    "tails": "tails",
    "shadow": "shadow",
    "killswitch": "killswitch",
    "eight-bit": "8bit",
    "adventure": "adventure",
    "bush": "bush",
    "jonesy": "jonesy",
    "storm-scout": "stormscout",
    "x-ray": "xray",
    "onigiri": "onigiri",
    "mega-man": "megaman",
    "overshield": "overshield",
}

VARIANTS = {
    "basic": None,
    "gold": "gold",
    "cheat": "cheat-master",
    "hacker": "loot-hacker",
}


def fetch(url: str) -> bytes:
    req = Request(url, headers={"User-Agent": UA})
    with urlopen(req, timeout=60) as resp:
        return resp.read()


def to_webp(png_bytes: bytes, dest: Path, size: int | None = 512) -> None:
    im = Image.open(BytesIO(png_bytes)).convert("RGBA")
    if size:
        bbox = im.getbbox()
        if bbox:
            im = im.crop(bbox)
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        im.thumbnail((size - 16, size - 16), Image.Resampling.LANCZOS)
        canvas.paste(im, ((size - im.width) // 2, (size - im.height) // 2), im)
        im = canvas
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "WEBP", quality=92, method=4)
    print(f"ok {dest.relative_to(ROOT.parent.parent)} ({dest.stat().st_size})")


def main() -> None:
    for slug, stem in FAMILIES.items():
        for remote_suffix, folder_variant in VARIANTS.items():
            url = f"{BASE}/sprites/{stem}_{remote_suffix}.png"
            try:
                raw = fetch(url)
            except Exception as exc:
                print(f"skip {stem}_{remote_suffix}: {exc}")
                continue
            dest = (
                ROOT / f"{slug}-sprite.webp"
                if folder_variant is None
                else ROOT / "variants" / f"{slug}__{folder_variant}.webp"
            )
            to_webp(raw, dest)

    # Flat mastery badge (readable at card corner size).
    to_webp(fetch(f"{BASE}/ui/mastered.png"), ROOT / "mastery-crown.webp", size=256)
    print("done")


if __name__ == "__main__":
    main()
