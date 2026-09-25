#!/usr/bin/env python3
"""Builds every Mokulua Math icon file from one 32 by 32 pixel map.

Run from this folder:  python3 make-icons.py

Writes the same set to this folder (the game) and to legacy-site/ (the
original math-blaster address):
  icon.svg                    scalable browser tab icon
  favicon-32.png              browser tab icon, one pixel per cell
  apple-touch-icon.png        iPhone home screen (180)
  apple-touch-icon-167.png    iPad Pro home screen
  apple-touch-icon-152.png    iPad home screen
  icon-192.png, icon-512.png  installed app icons (manifest.json)

Every size is drawn cell by cell (nearest neighbor), so the pixel art stays
crisp at sizes that are not a multiple of 32. The PNGs have no alpha channel,
which is what home screens and the App Store expect. Change a letter in ICON,
run this again, and every icon updates.
"""
import os
import struct
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIRS = [HERE, os.path.join(HERE, 'legacy-site')]
PNG_SIZES = {
    'favicon-32.png': 32,
    'apple-touch-icon.png': 180,
    'apple-touch-icon-167.png': 167,
    'apple-touch-icon-152.png': 152,
    'icon-192.png': 192,
    'icon-512.png': 512,
}

PAL = {
    '1': '#4fb3e3',
    '2': '#87ceeb',
    '3': '#b4e3f2',
    '4': '#ffecd2',
    '5': '#ffe7a3',
    'Y': '#ffd93d',
    'O': '#ffaa00',
    'W': '#fff4c2',
    'F': '#ffffff',
    'K': '#0f2a14',
    'G': '#1b3326',
    'g': '#2e4f3a',
    'j': '#58795f',
    'm': '#6e8a4c',
    'U': '#ffc861',
    'u': '#b9dd5f',
    'L': '#3b7f34',
    'l': '#5ea443',
    'N': '#136e98',
    'D': '#1a8cba',
    'B': '#40c4dc',
    'C': '#7fdbff',
    'a': '#e8c890',
    'A': '#f4d9a0',
}

# The two Mokes at sunrise over Lanikai: sky and plus sparkles, the islands,
# the sun between them, its light on the water, foam, then sand.
ICON = [
    '11111111111111111111111111111111',
    '1111111111111111111111111YY11111',
    '2222222222222F22222222222FF22222',
    '222222222222FFF22222222YFFFFY222',
    '222222KK22222F222222222YFFFFY222',
    '22222KluK2222222222222222FF22222',
    '2222KLLluK222222222222222YY22222',
    '222KLLLLluK222222222222222222222',
    '222KLLLLluK222222222222222222222',
    '222KLGLLLluK22222222222222222222',
    '22KGLGgLggmK222222222222KK222222',
    '33KGGGgLggmK33333333333KuLK33333',
    '33KGjjgggggmK344444433KulLLK3333',
    '33KGGGgggggmK455555543KuLgLK3333',
    '3KGGGggjjjmUK55YYYY554KUmLGGK333',
    '4KGGGggGGGmUK5YWWYYY5KUmjjGGK444',
    '4KGjjGgggggmUKYWYYYYYKUmGGGGK444',
    'KGGGGggggggmUKYYYYYYYKUmggjjGK44',
    'GGGGGggggggmUKYYYYYYKUmgggGGGK44',
    'NNNNNNNNNNNNNNDWFFWDNNNNNNNNNNDD',
    'DDNNNNNNNNNDDDDDWWDDDDNNNNNNDDDD',
    'DDDBBBDDDDDDDDDDFFDDDDDDDBBBDDDD',
    'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBBWWBBBBBBBBBBBBBB',
    'BBBBBBCCCBBBBBBBBBBBBBCCCBBBBBBB',
    'CCCCCCCCCCCCCCCCWWCCCCCCCCCCCCCC',
    'FFCCFFFFFFCCCFFFFFFFCCCFFFFFFCCF',
    'aFaaaaaaFaaaaaaaaaaFaaaaaaaaaFaa',
    'AAAAAAaAAAAAAAAAAAAAAAaAAAAAAAAA',
    'AAAAAAAAAAAAAaAAAAAAAAAAAAAAAaAA',
    'AAAaAAAAAAAAAAAAAAAAAAAaAAAAAAAA',
    'AAAAAAAAAaAAAAAAAAAAAAAAAAAaAAAA',
]


def png(size):
    """RGB PNG of ICON at size x size, each output pixel taken from its cell."""
    n = len(ICON)
    cols = [x * n // size for x in range(size)]
    rows = []
    for y in range(size):
        line = ICON[y * n // size]
        rows.append(b'\x00' + b''.join(bytes.fromhex(PAL[line[c]][1:]) for c in cols))

    def chunk(kind, data):
        return (struct.pack('>I', len(data)) + kind + data
                + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff))

    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(b''.join(rows), 9))
            + chunk(b'IEND', b''))


def svg():
    """One path per color, built from horizontal runs of equal cells."""
    runs = {}
    for r, line in enumerate(ICON):
        c = 0
        while c < len(line):
            e = c
            while e + 1 < len(line) and line[e + 1] == line[c]:
                e += 1
            runs.setdefault(PAL[line[c]], []).append(f'M{c} {r}h{e - c + 1}v1h-{e - c + 1}z')
            c = e + 1
    body = '\n'.join(f'<path fill="{col}" d="{"".join(d)}"/>' for col, d in runs.items())
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" '
            f'shape-rendering="crispEdges">\n{body}\n</svg>\n')


def main():
    assert len(ICON) == 32 and all(len(row) == 32 for row in ICON), 'ICON must be 32 by 32'
    assert all(ch in PAL for row in ICON for ch in row), 'every ICON letter needs a PAL color'
    for out in OUT_DIRS:
        with open(os.path.join(out, 'icon.svg'), 'w') as f:
            f.write(svg())
        for name, size in PNG_SIZES.items():
            with open(os.path.join(out, name), 'wb') as f:
                f.write(png(size))
    print('wrote', len(PNG_SIZES) + 1, 'icon files to', ', '.join(os.path.relpath(d, HERE) for d in OUT_DIRS))


if __name__ == '__main__':
    main()
