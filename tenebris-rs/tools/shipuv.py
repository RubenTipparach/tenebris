#!/usr/bin/env python3
"""UV unwrapping, atlas packing and procedural texture painting for the
modular-ship parts. Imported by tools/gen-ship-parts.py; stdlib + zlib only.

WHY THIS EXISTS INSTEAD OF A BLENDER UNWRAP
-------------------------------------------
The parts are procedural: every surface comes from a known primitive (a
box, a prism/frustum, a swept wedge, a tube between two points). For that
kind of geometry an analytic unwrap beats an automatic one. Blender's
Smart UV Project has to *infer* seams from face angles, which on a
6-sided hull tube produces arbitrary cuts and uneven texel density; here
the seam is known exactly - a tube unrolls along one edge, a box opens
into a cross - so each island is unwrapped with ZERO stretch and a
uniform, deliberately chosen texel density. That is the same result a
Blender artist gets by marking seams by hand and hitting Unwrap, minus
the hand work and minus the non-determinism.

Every island is laid out in METRES and only converted to pixels at pack
time, so `PPM` below is a single global texel-density knob and every part
in the kit is consistent with every other.

Layout per primitive (the "marked seams"):
  box    - 4 side faces unrolled into a strip, the 2 caps set beside it
  hull   - the n-gon side unrolled into one strip, caps laid out after it
  tube   - same as hull
  wedge  - the two outline faces, then the 4 connecting sides

Painting is per-island and material-driven: base colour, panel lines on
the real-world grid, rivets, edge darkening, wear streaks, and per-material
treatments (hazard chevrons, soot gradients, glass sheen, LED bloom).
"""

import math
import struct
import zlib

PPM = 34          # texels per metre - the global texel density
PAD = 2           # texels of gutter around each island, kills bleed
SIZES = (256, 320, 384, 512, 640, 768)


# ---------------------------------------------------------------- #
# deterministic value noise                                         #
# ---------------------------------------------------------------- #
def _hash(x, y, seed):
    h = (x * 374761393 + y * 668265263 + seed * 2147483647) & 0xFFFFFFFF
    h = (h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFF) / 65535.0


def _noise(x, y, seed, scale):
    """Bilinear value noise in [0,1]."""
    fx, fy = x / scale, y / scale
    ix, iy = int(math.floor(fx)), int(math.floor(fy))
    tx, ty = fx - ix, fy - iy
    tx = tx * tx * (3 - 2 * tx)
    ty = ty * ty * (3 - 2 * ty)
    a = _hash(ix, iy, seed);         b = _hash(ix + 1, iy, seed)
    c = _hash(ix, iy + 1, seed);     d = _hash(ix + 1, iy + 1, seed)
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty


# ---------------------------------------------------------------- #
# island + atlas                                                    #
# ---------------------------------------------------------------- #
class Island:
    """One unwrapped chart. `w`/`h` are METRES; the packer scales to px."""

    __slots__ = ("w", "h", "mat", "kind", "x", "y", "pw", "ph")

    def __init__(self, w, h, mat, kind):
        self.w = max(w, 0.02)
        self.h = max(h, 0.02)
        self.mat = mat
        self.kind = kind
        self.x = self.y = 0
        self.pw = self.ph = 0


class Atlas:
    def __init__(self, palette):
        self.islands = []
        self.palette = palette
        self.size = 0

    def add(self, w, h, mat, kind):
        self.islands.append(Island(w, h, mat, kind))
        return len(self.islands) - 1

    def pack(self):
        """Shelf-pack tallest-first, growing the atlas until everything fits."""
        for size in SIZES:
            for isl in self.islands:
                isl.pw = max(2, int(math.ceil(isl.w * PPM)))
                isl.ph = max(2, int(math.ceil(isl.h * PPM)))
                # a single island may not exceed the sheet
                isl.pw = min(isl.pw, size - 2 * PAD)
                isl.ph = min(isl.ph, size - 2 * PAD)
            order = sorted(range(len(self.islands)),
                           key=lambda i: -self.islands[i].ph)
            x = y = shelf = 0
            ok = True
            for i in order:
                isl = self.islands[i]
                w, h = isl.pw + 2 * PAD, isl.ph + 2 * PAD
                if x + w > size:
                    x = 0
                    y += shelf
                    shelf = 0
                if y + h > size:
                    ok = False
                    break
                isl.x, isl.y = x + PAD, y + PAD
                x += w
                shelf = max(shelf, h)
            if ok:
                self.size = size
                return size
        raise RuntimeError("UV atlas overflow - raise SIZES or lower PPM")

    def px(self, island, u_m, v_m):
        """Island-local metres -> texture pixel coords, top-left origin.
        The rasterizer samples with these directly, so it never has to undo
        the GL v-flip that `uv` applies."""
        isl = self.islands[island]
        return (isl.x + min(max(u_m / isl.w, 0.0), 1.0) * isl.pw,
                isl.y + min(max(v_m / isl.h, 0.0), 1.0) * isl.ph)

    def uv(self, island, u_m, v_m):
        """Island-local metres -> normalised atlas UV."""
        isl = self.islands[island]
        u = (isl.x + min(max(u_m / isl.w, 0.0), 1.0) * isl.pw) / self.size
        v = (isl.y + min(max(v_m / isl.h, 0.0), 1.0) * isl.ph) / self.size
        return (u, 1.0 - v)          # OBJ/GL sample from the bottom up


# ---------------------------------------------------------------- #
# painting                                                          #
# ---------------------------------------------------------------- #
class Tex:
    def __init__(self, size, bg=(18, 20, 24)):
        self.n = size
        self.buf = bytearray(bg * (size * size))

    def put(self, x, y, rgb):
        if 0 <= x < self.n and 0 <= y < self.n:
            i = (y * self.n + x) * 3
            self.buf[i] = max(0, min(255, int(rgb[0])))
            self.buf[i + 1] = max(0, min(255, int(rgb[1])))
            self.buf[i + 2] = max(0, min(255, int(rgb[2])))

    def get(self, x, y):
        i = (y * self.n + x) * 3
        return (self.buf[i], self.buf[i + 1], self.buf[i + 2])

    def png(self):
        raw = bytearray()
        for y in range(self.n):
            raw.append(0)
            raw += self.buf[y * self.n * 3:(y + 1) * self.n * 3]

        def chunk(tag, d):
            return (struct.pack(">I", len(d)) + tag + d
                    + struct.pack(">I", zlib.crc32(tag + d) & 0xFFFFFFFF))

        return (b"\x89PNG\r\n\x1a\n"
                + chunk(b"IHDR", struct.pack(">IIBBBBB", self.n, self.n, 8, 2, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
                + chunk(b"IEND", b""))


def _mix(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def paint(atlas, seed):
    """Paint every island. Detail is keyed off the island's material and its
    REAL size, so a 3 m hull flank gets a believable number of panels and a
    20 cm thruster block does not get the same grid crammed into it."""
    tex = Tex(atlas.size)
    for idx, isl in enumerate(atlas.islands):
        base = tuple(c * 255 for c in atlas.palette[isl.mat])
        mat, kind = isl.mat, isl.kind
        x0, y0, pw, ph = isl.x, isl.y, isl.pw, isl.ph
        mpp_x = isl.w / max(pw, 1)          # metres per pixel
        mpp_y = isl.h / max(ph, 1)
        s = seed + idx * 977

        # panel pitch in metres: big flat surfaces get bigger plates
        pitch = 0.62 if max(isl.w, isl.h) > 1.6 else 0.30

        for py in range(ph):
            vm = py * mpp_y
            for px_ in range(pw):
                um = px_ * mpp_x
                c = base

                # --- broad tonal variation so flats are never dead ------
                n = _noise(px_, py, s, 26.0)
                c = _mix(c, (c[0] * 1.16, c[1] * 1.16, c[2] * 1.18), (n - 0.5) * 0.34)

                # --- fine grain -----------------------------------------
                g = _hash(px_ >> 1, py >> 1, s + 5)
                c = tuple(v * (0.978 + 0.042 * g) for v in c)

                if mat in ("hull", "hull_dark", "steel", "gunmetal", "olive", "orange", "white"):
                    # --- panel seams on the real-world grid -------------
                    du = um % pitch
                    dv = vm % pitch
                    seam = min(du, pitch - du) < mpp_x * 0.85 or \
                           min(dv, pitch - dv) < mpp_y * 0.85
                    if seam:
                        c = _mix(c, (0, 0, 0), 0.34)
                    # a lighter scribe line just inboard reads as a lip
                    elif min(du, pitch - du) < mpp_x * 2.0 or \
                         min(dv, pitch - dv) < mpp_y * 2.0:
                        c = _mix(c, (255, 255, 255), 0.055)

                    # --- rivets along the seams -------------------------
                    ru = round(um / pitch) * pitch
                    rv = (vm % (pitch * 0.5))
                    if abs(um - ru) < mpp_x * 1.6 and abs(rv - pitch * 0.25) < mpp_y * 1.6:
                        c = _mix(c, (255, 255, 255), 0.22)

                    # --- streaked wear running down the surface ---------
                    w = _noise(px_ * 3, py, s + 31, 9.0)
                    if w > 0.74:
                        c = _mix(c, (0, 0, 0), (w - 0.74) * 0.85)

                elif mat == "glass":
                    t = 1.0 - (py / max(ph - 1, 1))
                    c = _mix(base, (150, 190, 225), t * 0.75)
                    if abs((px_ * 0.7 + py) % 34 - 17) < 2.0:
                        c = _mix(c, (235, 245, 255), 0.40)   # sheen streak

                elif mat == "hazard":
                    band = ((px_ + py) // 9) % 2
                    c = base if band else (24, 22, 18)

                elif mat == "soot":
                    t = py / max(ph - 1, 1)
                    c = _mix((70, 62, 58), (18, 16, 16), t * 0.9)
                    c = _mix(c, (0, 0, 0), _noise(px_, py, s + 7, 6.0) * 0.5)

                elif mat in ("amber", "cyan", "green_led"):
                    # emissive-ish: bright core, darker bezel
                    ex = abs(px_ / max(pw - 1, 1) - 0.5) * 2
                    ey = abs(py / max(ph - 1, 1) - 0.5) * 2
                    e = max(ex, ey)
                    c = _mix((255, 255, 240), base, min(1.0, e * 1.5))

                elif mat in ("bronze", "brass", "chrome", "nickel"):
                    # anisotropic brushing along the island's long axis
                    b = _noise(px_ * 6, py, s + 11, 3.5)
                    c = _mix(c, (255, 250, 235), b * 0.20)
                    c = _mix(c, (0, 0, 0), (1 - b) * 0.10)

                # --- contact shading at the island edges ---------------
                e = min(px_, py, pw - 1 - px_, ph - 1 - py)
                if e < 3:
                    c = _mix(c, (0, 0, 0), (3 - e) * 0.085)

                tex.put(x0 + px_, y0 + py, c)

        # --- gutter: bleed the border outwards so mips never sample bg --
        for d in range(1, PAD + 1):
            for px_ in range(-d, pw + d):
                sx = min(max(px_, 0), pw - 1)
                for (sy, ty) in ((0, -d), (ph - 1, ph - 1 + d)):
                    tex.put(x0 + px_, y0 + ty, tex.get(x0 + sx, y0 + sy))
            for py in range(-d, ph + d):
                sy = min(max(py, 0), ph - 1)
                for (sx, tx) in ((0, -d), (pw - 1, pw - 1 + d)):
                    tex.put(x0 + tx, y0 + py, tex.get(x0 + sx, y0 + sy))
    return tex
