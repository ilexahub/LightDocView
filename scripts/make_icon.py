"""Generate a 1024x1024 PNG app icon (no third-party deps)."""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

SIZE = 1024
OUT = Path(__file__).resolve().parents[1] / "app-icon.png"


def px(r: int, g: int, b: int, a: int = 255) -> bytes:
    return bytes((r, g, b, a))


def write_png(path: Path, width: int, height: int, pixels: bytes) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    raw = b"".join(b"\x00" + pixels[y * width * 4 : (y + 1) * width * 4] for y in range(height))
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.write_bytes(png)


def inside_round_rect(x: int, y: int, left: int, top: int, right: int, bottom: int, radius: int) -> bool:
    if x < left or x > right or y < top or y > bottom:
        return False
    cx = left + radius if x < left + radius else right - radius if x > right - radius else x
    cy = top + radius if y < top + radius else bottom - radius if y > bottom - radius else y
    if cx == x or cy == y:
        return True
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius**2


def main() -> None:
    pixels = bytearray(SIZE * SIZE * 4)
    for y in range(SIZE):
        for x in range(SIZE):
            i = (y * SIZE + x) * 4
            if not inside_round_rect(x, y, 48, 48, 975, 975, 140):
                pixels[i : i + 4] = px(0, 0, 0, 0)
                continue
            # slate body
            pixels[i : i + 4] = px(36, 48, 60)
            # paper
            if inside_round_rect(x, y, 220, 160, 800, 860, 36):
                pixels[i : i + 4] = px(255, 253, 248)
            # folded corner
            if 640 <= x <= 800 and 160 <= y <= 320 and (x - 640) + (y - 160) > 160:
                pixels[i : i + 4] = px(241, 211, 191)
            # table lines
            if 300 <= x <= 720 and 420 <= y <= 760:
                if (y - 420) % 56 < 6 or (x - 300) % 140 < 6:
                    pixels[i : i + 4] = px(196, 92, 38)
    write_png(OUT, SIZE, SIZE, bytes(pixels))
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
