"""Replace static/elementals icons with the ones shown on fortnite.gg/sprites.

The filenames are Epic's internal ids (Adventure is Dwarf, Pond is WinnerA,
Crash's bounty hunter is labeled Body Slam). They are listed in
fortnite-gg-sprite-icons.json, copied from that page. Cloudflare blocks this
download from a plain script; when it does, the files already in
static/elementals stay as they are.
"""

from __future__ import annotations

import json
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1] / "static" / "elementals"
MAP = Path(__file__).with_name("fortnite-gg-sprite-icons.json")
ORIGIN = "https://fortnite.gg"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"


def dest_for(slug: str, variant: str) -> Path:
    if variant == "base":
        return ROOT / f"{slug}-sprite.webp"
    return ROOT / "variants" / f"{slug}__{variant}.webp"


def fetch(path: str) -> bytes:
    req = Request(
        ORIGIN + path,
        headers={"User-Agent": UA, "Referer": ORIGIN + "/sprites"},
    )
    with urlopen(req, timeout=60) as resp:
        return resp.read()


def main() -> None:
    icons: dict[str, dict[str, str]] = json.loads(MAP.read_text(encoding="utf-8"))
    wrote = 0
    for slug, variants in icons.items():
        for variant, path in variants.items():
            dest = dest_for(slug, variant)
            try:
                raw = fetch(path)
            except HTTPError as exc:
                raise SystemExit(
                    f"fortnite.gg returned {exc.code} for {path}. "
                    "The site blocks scripted downloads; icons already in static/elementals were left in place."
                ) from exc
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(raw)
            wrote += 1
            print(f"ok {dest.relative_to(ROOT.parent.parent)}")
    print(f"done {wrote}")


if __name__ == "__main__":
    main()
