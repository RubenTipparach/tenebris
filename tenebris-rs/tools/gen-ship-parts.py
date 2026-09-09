#!/usr/bin/env python3
"""Generate the modular-ship part mockups: models, node sidecars, icons.

Baked-asset path (CLAUDE.md static-asset guidelines). For each part this
writes, deterministically and with stdlib + zlib only:

  assets/models/ship_<part>.obj    geometry, one `o` group per sub-piece
  assets/models/ship_<part>.mtl    per-group Kd colours
  assets/models/ship_<part>.json   pivot + ATTACHMENT NODES + stats (the
                                   data the ship part-graph mates on)
  assets/textures/items/<part>.png 32x32 RGBA inventory icon

The icon is RENDERED FROM THE MODEL by the little software rasterizer at
the bottom of this file, using the same shading rule the game's
baked_model.rs applies at load (shade_from_normal: top faces bright,
undersides dark). One source of truth: the icon cannot drift from the
model it depicts.

THESE ARE SPACESHIPS, NOT ROCKETS. The kit is a horizontal airframe -
cockpit up front, a fuselage spine you extend backwards, wings carrying
engine nacelles, a tail fin - flown nose-first like a normal ship. It is
deliberately NOT a vertical stack of tanks with a capsule on top.

Conventions:
  - units are metres
  - +Z is the NOSE (forward, and the main thrust axis), +Y is up,
    +X is starboard. This matches the in-game convention in
    MODULAR_SHIP_PLAN.md section 2.1, so a part's model axes and its
    physics axes are the same axes.
  - a hull module is 3 m long and ~1.8 m across, its aft mating face at
    z = 0 and its nose at z = +len, so the spine grows by translating
    along +Z
  - node 0 is the part's own mating node - the one that meets its parent
    - and its `dir` points AWAY from the part, so mating a child means
    anti-aligning child node 0 with the parent's chosen node

Run from tenebris-rs/:
    python tools/gen-ship-parts.py [--sheet OUT.png] [--json OUT.json]
"""

import base64
import json
import math
import os
import struct
import sys
import zlib

import shipuv

MODELS = os.path.join("assets", "models")
ICONS = os.path.join("assets", "textures", "items")

# ---------------------------------------------------------------------- #
# palette - one entry per usemtl name emitted below                       #
# ---------------------------------------------------------------------- #
MTL = {
    "hull":       (0.74, 0.75, 0.77),
    "hull_dark":  (0.42, 0.45, 0.50),
    "gunmetal":   (0.28, 0.30, 0.34),
    "steel":      (0.55, 0.57, 0.60),
    "bronze":     (0.62, 0.44, 0.22),
    "brass":      (0.78, 0.62, 0.28),
    "black":      (0.10, 0.10, 0.12),
    "glass":      (0.22, 0.34, 0.44),
    "hazard":     (0.86, 0.70, 0.12),
    "orange":     (0.80, 0.42, 0.14),
    "olive":      (0.36, 0.38, 0.24),
    "chrome":     (0.75, 0.78, 0.82),
    "soot":       (0.17, 0.15, 0.15),
    "amber":      (0.90, 0.62, 0.15),
    "cyan":       (0.30, 0.78, 0.85),
    "green_led":  (0.35, 0.85, 0.40),
    "white":      (0.92, 0.92, 0.94),
}


class Obj:
    """Geometry builder. Holds structured data (not text) so the OBJ, the
    icon rasterizer and the playground blob all read one source.

    Every primitive is unwrapped analytically: each face is projected into
    its own plane (exact, zero stretch) and the faces of one primitive are
    laid out in a row as a single UV island, so a hull's panel grid runs
    continuously across its flanks. See tools/shipuv.py for why this beats
    an automatic unwrap on procedural geometry."""

    def __init__(self, name):
        self.name = name
        self.verts = []      # [x,y,z]
        self.uvs = []        # (island, u_m, v_m)
        self.faces = []      # (vidx tuple, vtidx tuple, mat, group)
        self.mats = set()
        self.atlas = shipuv.Atlas(MTL)
        self.cur_mat = "hull"
        self.cur_group = "part"

    def group(self, g):
        self.cur_group = g

    def mat(self, m):
        self.mats.add(m)
        self.cur_mat = m

    # -- unwrap helpers ----------------------------------------------------
    @staticmethod
    def _plane_uv(pts):
        """Project one planar face into its own plane. Returns per-corner
        (u,v) in metres with the chart's origin at (0,0)."""
        o = pts[0]
        e1 = [pts[1][i] - o[i] for i in range(3)]
        e2 = [pts[-1][i] - o[i] for i in range(3)]
        n = _norm(_cross(e1, e2))
        u = _norm(e1)
        v = _cross(n, u)
        uv = [((p[0] - o[0]) * u[0] + (p[1] - o[1]) * u[1] + (p[2] - o[2]) * u[2],
               (p[0] - o[0]) * v[0] + (p[1] - o[1]) * v[1] + (p[2] - o[2]) * v[2])
              for p in pts]
        mu = min(a for a, _ in uv)
        mv = min(b for _, b in uv)
        uv = [(a - mu, b - mv) for a, b in uv]
        return uv, max(a for a, _ in uv), max(b for _, b in uv)

    def _emit(self, verts, faces):
        base = len(self.verts)
        self.verts.extend([tuple(v) for v in verts])

        charts = [self._plane_uv([verts[i] for i in f]) for f in faces]
        gap = 0.035
        isl_w = sum(c[1] for c in charts) + gap * (len(charts) + 1)
        isl_h = max(c[2] for c in charts) + 2 * gap
        isl = self.atlas.add(isl_w, isl_h, self.cur_mat, self.cur_group)

        cursor = gap
        for f, (uv, w, h) in zip(faces, charts):
            vt = []
            for (a, b) in uv:
                self.uvs.append((isl, cursor + a, gap + b))
                vt.append(len(self.uvs))          # 1-based
            self.faces.append((tuple(base + i for i in f), tuple(vt),
                               self.cur_mat, self.cur_group))
            cursor += w + gap


    def box(self, c, h, rot=None):
        """Axis-aligned box, optional (axis, degrees) rotation baked in."""
        verts = []
        for dz in (-h[2], h[2]):
            for dy in (-h[1], h[1]):
                for dx in (-h[0], h[0]):
                    p = [dx, dy, dz]
                    if rot:
                        p = _rot(p, rot[0], rot[1])
                    verts.append((c[0] + p[0], c[1] + p[1], c[2] + p[2]))
        self._emit(verts, [(0, 1, 3, 2), (5, 4, 6, 7), (4, 5, 1, 0),
                           (2, 3, 7, 6), (4, 0, 2, 6), (1, 5, 7, 3)])

    def hull(self, z0, z1, r0, r1, sides=6, flat=0.62, caps=True, phase=0.0):
        """Prism / frustum along +Z, squashed vertically by `flat` so the
        cross-section reads as an airframe rather than a rocket tube."""
        ring0, ring1 = [], []
        for i in range(sides):
            a = phase + 2.0 * math.pi * i / sides
            ring0.append((r0 * math.cos(a), r0 * flat * math.sin(a), z0))
            ring1.append((r1 * math.cos(a), r1 * flat * math.sin(a), z1))
        verts = ring0 + ring1
        faces = []
        for i in range(sides):
            j = (i + 1) % sides
            faces.append((i, j, sides + j, sides + i))
        if caps:
            faces.append(tuple(range(sides - 1, -1, -1)))
            faces.append(tuple(range(sides, 2 * sides)))
        self._emit(verts, faces)

    def tube_axis(self, p0, p1, r0, r1, sides=6, caps=True):
        """Prism between two arbitrary points (struts, rails, nozzles)."""
        d = [p1[i] - p0[i] for i in range(3)]
        L = math.sqrt(sum(x * x for x in d)) or 1e-6
        ax = [x / L for x in d]
        tmp = [0.0, 0.0, 1.0] if abs(ax[1]) > 0.9 else [0.0, 1.0, 0.0]
        u = _norm(_cross(ax, tmp))
        w = _cross(ax, u)
        verts = []
        for (base, r) in ((p0, r0), (p1, r1)):
            for i in range(sides):
                a = 2.0 * math.pi * i / sides
                verts.append(tuple(base[k] + r * (math.cos(a) * u[k] + math.sin(a) * w[k])
                                   for k in range(3)))
        faces = []
        for i in range(sides):
            j = (i + 1) % sides
            faces.append((i, j, sides + j, sides + i))
        if caps:
            faces.append(tuple(range(sides - 1, -1, -1)))
            faces.append(tuple(range(sides, 2 * sides)))
        self._emit(verts, faces)

    def wedge(self, pts_lo, pts_hi):
        """Solid between two matching 4-point outlines (a thick wing)."""
        self._emit(list(pts_lo) + list(pts_hi),
                   [(0, 1, 2, 3), (7, 6, 5, 4),
                    (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)])

    # -- outputs -----------------------------------------------------------
    def finish(self, seed):
        """Pack the atlas and paint the texture. Call once, before writing."""
        self.atlas.pack()
        self.tex = shipuv.paint(self.atlas, seed)

    def write(self, path):
        out = ["# generated by tools/gen-ship-parts.py - do not hand-edit",
               "mtllib ship_%s.mtl" % self.name]
        for v in self.verts:
            out.append("v %.5f %.5f %.5f" % v)
        for (isl, um, vm) in self.uvs:
            u, v = self.atlas.uv(isl, um, vm)
            out.append("vt %.6f %.6f" % (u, v))
        grp = mat = None
        for (f, vt, m, g) in self.faces:
            if g != grp:
                out.append("o " + g); grp = g; mat = None
            if m != mat:
                out.append("usemtl " + m); mat = m
            # OBJ indices are 1-BASED. `faces` holds 0-based vertex indices
            # (what the in-process consumers want), so shift here - the vt
            # indices are already 1-based. baked_model.rs drops any index
            # below 1, so an off-by-one here silently eats whole faces.
            out.append("f " + " ".join("%d/%d" % (a + 1, b) for a, b in zip(f, vt)))
        open(path, "w").write("\n".join(out) + "\n")

        mtl = ["# generated by tools/gen-ship-parts.py",
               "# map_Kd is the analytically-unwrapped atlas painted by tools/shipuv.py"]
        for m in sorted(self.mats):
            r, g, b = MTL[m]
            mtl += ["newmtl " + m, "Kd %.4f %.4f %.4f" % (r, g, b),
                    "map_Kd ship_%s.png" % self.name, ""]
        open(path[:-4] + ".mtl", "w").write("\n".join(mtl) + "\n")
        open(path[:-4] + ".png", "wb").write(self.tex.png())


def _cross(a, b):
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]


def _norm(v):
    m = math.sqrt(sum(c * c for c in v)) or 1.0
    return [c / m for c in v]


def _rot(p, axis, deg):
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    x, y, z = p
    if axis == "x":
        return [x, y * c - z * s, y * s + z * c]
    if axis == "y":
        return [x * c + z * s, y, -x * s + z * c]
    return [x * c - y * s, x * s + y * c, z]


def node(pos, dir_, kind):
    return {"pos": [round(v, 4) for v in pos], "dir": [round(v, 4) for v in dir_], "kind": kind}


HULL_R = 0.92     # hull half-width
HULL_L = 3.0      # one spine module
FLAT = 0.62       # vertical squash - the airframe cross-section


# ---------------------------------------------------------------------- #
# the parts. each returns (obj, nodes, label, stats)                      #
# ---------------------------------------------------------------------- #

def cockpit():
    """Forward crew module: tapered nose with a wrap-around canopy."""
    o = Obj("cockpit")
    L = 3.2
    o.group("nose"); o.mat("hull")
    o.hull(0.0, 1.1, HULL_R, HULL_R * 0.94, flat=FLAT)
    o.hull(1.1, 2.4, HULL_R * 0.94, HULL_R * 0.66, flat=FLAT * 0.92)
    o.hull(2.4, L, HULL_R * 0.66, HULL_R * 0.22, flat=FLAT * 0.85)
    o.group("canopy"); o.mat("glass")
    o.box((0.0, HULL_R * FLAT * 0.72, 2.0), (0.46, 0.10, 0.78), rot=("x", -8))
    o.group("frame"); o.mat("gunmetal")
    o.box((0.0, HULL_R * FLAT * 0.74, 1.22), (0.50, 0.08, 0.07))
    for sx in (-1, 1):
        o.box((sx * 0.48, HULL_R * FLAT * 0.70, 2.0), (0.05, 0.10, 0.80))
    o.group("chin"); o.mat("hull_dark")
    o.box((0.0, -HULL_R * FLAT * 0.72, 1.9), (0.42, 0.12, 0.85))
    o.group("lights"); o.mat("white")
    for sx in (-1, 1):
        o.box((sx * 0.55, -HULL_R * FLAT * 0.42, 2.85), (0.08, 0.07, 0.07))
    nodes = [node((0, 0, 0), (0, 0, -1), "Stack")]
    stats = {"role": "Cockpit", "mass_kg": 220, "torque_nm": 7000, "cargo": 3,
             "tier": "T3", "recipe": "copper 4 + iron 3 + circuit 1",
             "blurb": "Crew module and the ship's root part. Every ship needs exactly one."}
    return o, nodes, "Cockpit", stats


def fuselage_bay():
    """Spine module: the part that makes a ship LONG and gives it flanks."""
    o = Obj("fuselage_bay")
    o.group("shell"); o.mat("hull")
    o.hull(0.0, HULL_L, HULL_R, HULL_R, flat=FLAT)
    o.group("frames"); o.mat("hull_dark")
    for z in (0.55, 1.5, 2.45):
        o.hull(z, z + 0.10, HULL_R * 1.03, HULL_R * 1.03, flat=FLAT, caps=False)
    o.group("spine"); o.mat("gunmetal")
    o.box((0.0, HULL_R * FLAT * 0.95, HULL_L * 0.5), (0.16, 0.07, HULL_L * 0.44))
    o.group("vents"); o.mat("black")
    for sx in (-1, 1):
        o.box((sx * HULL_R * 0.86, 0.0, 2.1), (0.06, 0.16, 0.42))
    nodes = [
        node((0, 0, 0), (0, 0, -1), "Stack"),
        node((0, 0, HULL_L), (0, 0, 1), "Stack"),
        node((HULL_R, 0, HULL_L * 0.5), (1, 0, 0), "Radial"),
        node((-HULL_R, 0, HULL_L * 0.5), (-1, 0, 0), "Radial"),
        node((0, HULL_R * FLAT, HULL_L * 0.55), (0, 1, 0), "Radial"),
        node((0, -HULL_R * FLAT, HULL_L * 0.45), (0, -1, 0), "Radial"),
    ]
    stats = {"role": "Structure", "mass_kg": 90, "tier": "T2",
             "recipe": "iron 4 + bronze 1",
             "blurb": "Hull spine. Extends the ship and carries the wing / gear mounts."}
    return o, nodes, "Fuselage Bay", stats


def cargo_bay():
    """Wider spine module with clamshell doors."""
    o = Obj("cargo_bay")
    R = HULL_R * 1.16
    o.group("shell"); o.mat("olive")
    o.hull(0.0, HULL_L, R, R, flat=FLAT * 0.95)
    o.group("door"); o.mat("hull_dark")
    o.box((0.0, R * FLAT * 0.86, HULL_L * 0.5), (R * 0.60, 0.07, HULL_L * 0.34))
    o.group("door_seam"); o.mat("hazard")
    o.box((0.0, R * FLAT * 0.90, HULL_L * 0.5), (0.04, 0.05, HULL_L * 0.34))
    o.group("locks"); o.mat("black")
    for sz in (0.42, 2.58):
        for sx in (-1, 1):
            o.box((sx * R * 0.80, R * FLAT * 0.55, sz), (0.10, 0.10, 0.10))
    nodes = [
        node((0, 0, 0), (0, 0, -1), "Stack"),
        node((0, 0, HULL_L), (0, 0, 1), "Stack"),
        node((R, 0, HULL_L * 0.5), (1, 0, 0), "Radial"),
        node((-R, 0, HULL_L * 0.5), (-1, 0, 0), "Radial"),
        node((0, -R * FLAT, HULL_L * 0.5), (0, -1, 0), "Radial"),
    ]
    stats = {"role": "Cargo", "mass_kg": 130, "cargo": 9, "tier": "T3",
             "recipe": "iron 5 + bronze 3",
             "blurb": "Nine slots of hold. Cargo mass counts against your thrust."}
    return o, nodes, "Cargo Bay", stats


def fuel_cell():
    """Internal propellant module - a spine segment, not a strapped-on tank."""
    o = Obj("fuel_cell")
    L = 2.2
    o.group("shell"); o.mat("hull_dark")
    o.hull(0.0, L, HULL_R * 0.98, HULL_R * 0.98, flat=FLAT)
    o.group("cells"); o.mat("orange")
    for sx in (-1, 1):
        o.box((sx * HULL_R * 0.52, 0.0, L * 0.5), (0.26, HULL_R * FLAT * 0.72, L * 0.40))
    o.group("plumbing"); o.mat("bronze")
    o.tube_axis((0.0, HULL_R * FLAT * 0.70, 0.25), (0.0, HULL_R * FLAT * 0.70, L - 0.25),
                0.055, 0.055, 5)
    o.group("gauge"); o.mat("amber")
    o.box((0.0, HULL_R * FLAT * 0.86, L * 0.5), (0.13, 0.05, 0.30))
    nodes = [node((0, 0, 0), (0, 0, -1), "Stack"), node((0, 0, L), (0, 0, 1), "Stack")]
    stats = {"role": "Tank", "mass_kg": 480, "dry_mass_kg": 60, "fuel_cap": 100,
             "tier": "T2", "recipe": "iron 5",
             "blurb": "100 units of propellant, drawn from one ship-wide pool."}
    return o, nodes, "Fuel Cell", stats


def wing():
    """Swept wing with an under-slung hardpoint for a nacelle."""
    o = Obj("wing")
    span, root_c, tip_c = 2.6, 2.3, 1.0
    o.group("root"); o.mat("gunmetal")
    o.box((0.10, 0.0, root_c * 0.5), (0.12, 0.20, root_c * 0.42))
    o.group("skin"); o.mat("hull")
    lo = [(0.20, -0.10, 0.05), (0.20, -0.10, root_c), (span, -0.05, root_c * 0.72),
          (span, -0.05, root_c * 0.72 - tip_c)]
    hi = [(0.20, 0.10, 0.05), (0.20, 0.10, root_c), (span, 0.05, root_c * 0.72),
          (span, 0.05, root_c * 0.72 - tip_c)]
    o.wedge(lo, hi)
    o.group("leading_edge"); o.mat("bronze")
    o.tube_axis((0.20, 0.0, root_c), (span, 0.0, root_c * 0.72), 0.07, 0.045, 4)
    o.group("hardpoint"); o.mat("steel")
    o.box((span * 0.62, -0.16, root_c * 0.52), (0.20, 0.08, 0.24))
    o.group("tip_light"); o.mat("green_led")
    o.box((span - 0.04, 0.0, root_c * 0.30), (0.07, 0.06, 0.10))
    nodes = [
        node((0, 0, root_c * 0.5), (-1, 0, 0), "Radial"),
        node((span * 0.62, -0.24, root_c * 0.52), (0, -1, 0), "Hardpoint"),
    ]
    stats = {"role": "Aero", "mass_kg": 70, "lift_area_m2": 3.0, "lift_coef": 0.9,
             "tier": "T2", "recipe": "iron 2 + bronze 1",
             "blurb": "Lift in atmosphere, a nacelle hardpoint everywhere. Mirrors in symmetry mode."}
    return o, nodes, "Wing", stats


def nacelle():
    """Main drive pod. Mounts under a wing or straight onto the hull."""
    o = Obj("nacelle")
    L = 2.6
    o.group("pylon"); o.mat("gunmetal")
    o.box((0.0, 0.26, L * 0.42), (0.11, 0.26, 0.34))
    o.group("body"); o.mat("hull")
    o.hull(0.20, L - 0.55, 0.40, 0.46, sides=8, flat=1.0)
    o.group("intake"); o.mat("black")
    o.hull(L - 0.55, L - 0.42, 0.46, 0.44, sides=8, flat=1.0)
    o.group("cowl"); o.mat("hull_dark")
    o.hull(L - 0.42, L, 0.44, 0.34, sides=8, flat=1.0)
    o.group("bell"); o.mat("soot")
    o.hull(0.0, 0.20, 0.52, 0.40, sides=8, flat=1.0)
    o.group("glow"); o.mat("cyan")
    o.hull(-0.03, 0.02, 0.44, 0.44, sides=8, flat=1.0, caps=False)
    o.group("rails"); o.mat("bronze")
    for sx in (-1, 1):
        o.tube_axis((sx * 0.42, 0.0, 0.4), (sx * 0.42, 0.0, L - 0.7), 0.045, 0.045, 4)
    nodes = [node((0, 0.52, L * 0.42), (0, 1, 0), "Hardpoint")]
    stats = {"role": "Engine", "mass_kg": 140, "thrust_n": 90000, "fuel_per_s": 9,
             "tier": "T2", "recipe": "bronze 3 + iron 2",
             "blurb": "90 kN of thrust. Off-centre nacelles torque the ship - keep them balanced."}
    return o, nodes, "Engine Nacelle", stats


def tail_fin():
    """Vertical stabiliser - the silhouette that says 'ship', not 'rocket'."""
    o = Obj("tail_fin")
    h, root_c, tip_c = 1.9, 1.9, 0.85
    o.group("root"); o.mat("gunmetal")
    o.box((0.0, 0.12, root_c * 0.5), (0.16, 0.14, root_c * 0.42))
    o.group("skin"); o.mat("hull")
    lo = [(-0.08, 0.20, 0.05), (-0.08, 0.20, root_c), (-0.05, h, root_c * 0.66),
          (-0.05, h, root_c * 0.66 - tip_c)]
    hi = [(0.08, 0.20, 0.05), (0.08, 0.20, root_c), (0.05, h, root_c * 0.66),
          (0.05, h, root_c * 0.66 - tip_c)]
    o.wedge(lo, hi)
    o.group("leading_edge"); o.mat("bronze")
    o.tube_axis((0.0, 0.20, root_c), (0.0, h, root_c * 0.66), 0.06, 0.04, 4)
    o.group("beacon"); o.mat("amber")
    o.box((0.0, h - 0.06, root_c * 0.30), (0.07, 0.08, 0.10))
    nodes = [node((0, 0, root_c * 0.5), (0, -1, 0), "Radial")]
    stats = {"role": "Aero", "mass_kg": 45, "lift_area_m2": 1.4, "lift_coef": 0.7,
             "tier": "T2", "recipe": "iron 2",
             "blurb": "Yaw damping in atmosphere. Mostly it makes the ship read as a ship."}
    return o, nodes, "Tail Fin", stats


def rcs_block():
    """Maneuvering thruster block - torque scales with distance from CoM."""
    o = Obj("rcs_block")
    s = 0.19
    o.group("body"); o.mat("white")
    o.box((0.0, s, 0.0), (s, s, s))
    o.group("band"); o.mat("hazard")
    o.box((0.0, 0.035, 0.0), (s * 1.01, 0.035, s * 1.01))
    o.group("nozzles"); o.mat("black")
    for (dx, dz) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        o.tube_axis((dx * s, s, dz * s), (dx * (s + 0.12), s, dz * (s + 0.12)),
                    0.042, 0.078, 6)
    nodes = [node((0, 0, 0), (0, -1, 0), "Radial")]
    stats = {"role": "Rcs", "mass_kg": 22, "torque_nm": 3000, "fuel_per_s": 0.15,
             "tier": "T3", "recipe": "bronze 2 + wire 2",
             "blurb": "Attitude authority. Mount them far from the centre of mass."}
    return o, nodes, "RCS Block", stats


def reaction_wheel():
    """Internal gyro: torque with no fuel, the fix for a heavy hull."""
    o = Obj("reaction_wheel")
    L = 1.0
    o.group("case"); o.mat("gunmetal")
    o.hull(0.0, L, HULL_R * 0.92, HULL_R * 0.92, flat=FLAT)
    o.group("window"); o.mat("black")
    for sx in (-1, 1):
        o.box((sx * HULL_R * 0.80, 0.0, L * 0.5), (0.06, 0.26, 0.30))
    o.group("wheel"); o.mat("brass")
    seg, rr = 14, 0.42
    for i in range(seg):
        a0 = 2.0 * math.pi * i / seg
        a1 = 2.0 * math.pi * (i + 1) / seg
        o.tube_axis((rr * math.cos(a0), rr * math.sin(a0) * 0.9, L * 0.5),
                    (rr * math.cos(a1), rr * math.sin(a1) * 0.9, L * 0.5), 0.075, 0.075, 4)
    o.group("status"); o.mat("amber")
    o.box((0.0, HULL_R * FLAT * 0.84, 0.2), (0.10, 0.05, 0.07))
    nodes = [node((0, 0, 0), (0, 0, -1), "Stack"), node((0, 0, L), (0, 0, 1), "Stack")]
    stats = {"role": "Gyro", "mass_kg": 85, "torque_nm": 40000, "tier": "T3",
             "recipe": "iron 4 + copper 3 + circuit 2",
             "blurb": "40 kN-m on every axis and it burns no fuel. Heavy hulls need one."}
    return o, nodes, "Reaction Wheel", stats


def landing_skid():
    """Belly gear. Supplies the contact points the ship lands on."""
    o = Obj("landing_skid")
    o.group("boss"); o.mat("bronze")
    o.box((0.0, -0.06, 0.0), (0.17, 0.10, 0.24))
    o.group("legs"); o.mat("steel")
    for dz in (-0.22, 0.22):
        o.tube_axis((0.0, -0.12, dz), (0.34, -1.10, dz), 0.06, 0.05, 5)
    o.group("damper"); o.mat("chrome")
    o.tube_axis((0.0, -0.14, 0.0), (0.19, -0.62, 0.0), 0.055, 0.055, 5)
    o.group("skid"); o.mat("black")
    o.box((0.34, -1.16, 0.0), (0.13, 0.07, 0.42))
    nodes = [node((0, 0, 0), (0, -1, 0), "Radial")]
    stats = {"role": "Gear", "mass_kg": 50, "impact_tolerance_mps": 12, "tier": "T2",
             "recipe": "iron 3 + bronze 1",
             "blurb": "Three or more give a stable stance. Without gear you land on the hull."}
    return o, nodes, "Landing Skid", stats


def docking_collar():
    """Androgynous ring. Gates station capture in the plan's frame handoff."""
    o = Obj("docking_collar")
    L = 0.34
    o.group("collar"); o.mat("steel")
    o.hull(0.0, L, 0.74, 0.74, sides=8, flat=1.0)
    o.group("seal"); o.mat("black")
    o.hull(L, L + 0.06, 0.72, 0.66, sides=8, flat=1.0)
    o.group("bore"); o.mat("gunmetal")
    o.hull(0.0, L + 0.06, 0.42, 0.42, sides=8, flat=1.0)
    o.group("hooks"); o.mat("chrome")
    for i in range(3):
        a = 2.0 * math.pi * i / 3
        o.tube_axis((0.56 * math.cos(a), 0.56 * math.sin(a), L + 0.02),
                    (0.34 * math.cos(a), 0.34 * math.sin(a), L + 0.20), 0.065, 0.042, 4)
    o.group("leds"); o.mat("green_led")
    for i in range(8):
        a = 2.0 * math.pi * i / 8
        o.box((0.80 * math.cos(a), 0.80 * math.sin(a), L * 0.5), (0.05, 0.05, 0.05))
    nodes = [node((0, 0, 0), (0, 0, -1), "Stack")]
    stats = {"role": "Dock", "mass_kg": 65, "has_dock": True, "tier": "T3",
             "recipe": "iron 3 + copper 2 + circuit 1",
             "blurb": "Required to dock at the station. Green ring means capture."}
    return o, nodes, "Docking Collar", stats



# ---------------------------------------------------------------------- #
# heavy kit - the parts that make BIG ships possible                      #
#                                                                         #
# What actually gates size here is not room, it is the 24-part cap, mass  #
# against torque authority, and the thrust line. So each of these does a  #
# lot per part, and three of them exist specifically to beat a gate:      #
# Attitude Bank (a heavy hull cannot turn on a 40 kN-m wheel), Thrust     #
# Spar (mounts engines wide but ON the thrust axis, so they stop pitching #
# the nose), and Hull Junction (lets a hull branch instead of only        #
# growing longer).                                                        #
# ---------------------------------------------------------------------- #

def spine_truss():
    """6 m open lattice - the cheapest way to make a ship long."""
    o = Obj("spine_truss")
    L, R = 6.0, 0.72
    o.group("collars"); o.mat("bronze")
    o.hull(0.0, 0.14, R + 0.08, R + 0.08, sides=4, flat=0.8, caps=False, phase=0.785)
    o.hull(L - 0.14, L, R + 0.08, R + 0.08, sides=4, flat=0.8, caps=False, phase=0.785)
    o.group("longerons"); o.mat("gunmetal")
    corners = []
    for i in range(4):
        a = 0.785 + math.pi * i / 2
        p = (R * math.cos(a), R * 0.8 * math.sin(a))
        corners.append(p)
        o.tube_axis((p[0], p[1], 0.08), (p[0], p[1], L - 0.08), 0.055, 0.055, 4)
    o.group("bracing"); o.mat("steel")
    for i in range(4):
        p, q = corners[i], corners[(i + 1) % 4]
        for k in range(3):
            z0 = 0.3 + k * 1.85
            z1 = z0 + 1.75
            o.tube_axis((p[0], p[1], z0), (q[0], q[1], z1), 0.030, 0.030, 3)
            o.tube_axis((q[0], q[1], z0), (p[0], p[1], z1), 0.030, 0.030, 3)
    o.group("conduit"); o.mat("hull_dark")
    o.tube_axis((0.0, R * 0.8, 0.2), (0.0, R * 0.8, L - 0.2), 0.075, 0.075, 5)
    nodes = [node((0, 0, 0), (0, 0, -1), "Stack"), node((0, 0, L), (0, 0, 1), "Stack")]
    for z in (1.6, 4.4):
        nodes.append(node((R, 0, z), (1, 0, 0), "Radial"))
        nodes.append(node((-R, 0, z), (-1, 0, 0), "Radial"))
    nodes.append(node((0, R * 0.8, 3.0), (0, 1, 0), "Radial"))
    nodes.append(node((0, -R * 0.8, 3.0), (0, -1, 0), "Radial"))
    stats = {"role": "Structure", "mass_kg": 140, "tier": "T3",
             "recipe": "iron 6 + bronze 3",
             "blurb": "Six metres of hull for 140 kg and one part slot - the cheapest length you can buy."}
    return o, nodes, "Spine Truss", stats


def hull_junction():
    """A hull that BRANCHES: one spine in, three out. Catamarans, outriggers."""
    o = Obj("hull_junction")
    L = 1.8
    o.group("body"); o.mat("hull")
    o.hull(0.0, L, HULL_R, HULL_R * 1.9, flat=FLAT * 0.86)
    o.group("mounts"); o.mat("steel")
    for dx in (-1.28, 0.0, 1.28):
        o.box((dx, 0.0, L - 0.06), (0.60, HULL_R * FLAT * 0.86, 0.10))
    o.group("ribs"); o.mat("gunmetal")
    for sx in (-1, 1):
        o.tube_axis((sx * 0.35, 0.0, 0.1), (sx * 1.28, 0.0, L - 0.16), 0.09, 0.07, 4)
    o.group("marker"); o.mat("hazard")
    o.box((0.0, HULL_R * FLAT * 0.9, L * 0.5), (0.34, 0.05, 0.12))
    nodes = [node((0, 0, 0), (0, 0, -1), "Stack")]
    for dx in (0.0, 1.28, -1.28):
        nodes.append(node((dx, 0, L), (0, 0, 1), "Stack"))
    stats = {"role": "Structure", "mass_kg": 160, "tier": "T3",
             "recipe": "iron 8 + bronze 4",
             "blurb": "Splits one spine into three. The only part that lets a hull grow sideways."}
    return o, nodes, "Hull Junction", stats


def thrust_spar():
    """Carries engines WIDE but at hull-axis height, so they stop pitching
    the nose. The direct answer to off-axis thrust torque."""
    o = Obj("thrust_spar")
    span = 2.9
    o.group("root"); o.mat("gunmetal")
    o.box((0.0, 0.0, 0.0), (0.30, 0.26, 0.34))
    o.group("spar"); o.mat("hull")
    o.tube_axis((-span, 0.0, 0.0), (span, 0.0, 0.0), 0.20, 0.20, 6)
    o.group("caps"); o.mat("hull_dark")
    for sx in (-1, 1):
        o.tube_axis((sx * span, 0.0, 0.0), (sx * (span + 0.16), 0.0, 0.0), 0.21, 0.15, 6)
    o.group("hardpoints"); o.mat("steel")
    for sx in (-1, 1):
        for f in (0.52, 1.0):
            o.box((sx * span * f, -0.24, 0.0), (0.20, 0.10, 0.22))
    o.group("stripe"); o.mat("hazard")
    for sx in (-1, 1):
        o.tube_axis((sx * span * 0.74, 0.0, 0.0), (sx * span * 0.80, 0.0, 0.0), 0.205, 0.205, 6)
    nodes = [node((0, 0, 0.34), (0, 0, 1), "Stack")]
    for sx in (-1, 1):
        for f in (0.52, 1.0):
            nodes.append(node((sx * span * f, -0.34, 0.0), (0, -1, 0), "Hardpoint"))
    stats = {"role": "Structure", "mass_kg": 180, "tier": "T3",
             "recipe": "iron 7 + bronze 3",
             "blurb": "Four hardpoints spread wide at hull-axis height - engines here push straight, not up."}
    return o, nodes, "Thrust Spar", stats


def bridge():
    """Command deck. The cockpit for a ship too big for a canopy."""
    o = Obj("bridge")
    L, R = 4.2, HULL_R * 1.5
    o.group("hull"); o.mat("hull")
    o.hull(0.0, 1.5, R, R * 0.96, flat=FLAT * 0.9)
    o.hull(1.5, 3.2, R * 0.96, R * 0.72, flat=FLAT * 0.86)
    o.hull(3.2, L, R * 0.72, R * 0.30, flat=FLAT * 0.8)
    o.group("viewband"); o.mat("glass")
    o.box((0.0, R * FLAT * 0.62, 2.6), (R * 0.66, 0.16, 0.62), rot=("x", -6))
    o.group("mullions"); o.mat("gunmetal")
    for sx in (-2, -1, 0, 1, 2):
        o.box((sx * 0.30, R * FLAT * 0.62, 2.6), (0.035, 0.17, 0.63))
    o.group("deck"); o.mat("hull_dark")
    o.box((0.0, -R * FLAT * 0.74, 2.2), (R * 0.62, 0.14, 1.1))
    o.group("masts"); o.mat("steel")
    for sx in (-1, 1):
        o.tube_axis((sx * R * 0.5, R * FLAT * 0.8, 0.9), (sx * R * 0.62, R * FLAT * 1.5, 0.7),
                    0.05, 0.03, 4)
    o.group("beacons"); o.mat("amber")
    for sx in (-1, 1):
        o.box((sx * R * 0.62, R * FLAT * 1.52, 0.7), (0.07, 0.07, 0.07))
    nodes = [node((0, 0, 0), (0, 0, -1), "Stack"),
             node((0, R * FLAT * 0.9, 1.0), (0, 1, 0), "Radial"),
             node((0, -R * FLAT * 0.9, 1.1), (0, -1, 0), "Radial")]
    stats = {"role": "Cockpit", "mass_kg": 480, "torque_nm": 22000, "cargo": 6,
             "tier": "T4", "recipe": "copper 8 + iron 6 + circuit 3 + wire 4",
             "blurb": "Heavy crew module: three times the torque of a cockpit, and it looks like a ship's bridge."}
    return o, nodes, "Bridge", stats


def heavy_nacelle():
    """Main drive for a freighter. Stack-mounted, so it sits ON the axis."""
    o = Obj("heavy_nacelle")
    L = 3.4
    o.group("bell"); o.mat("soot")
    o.hull(0.0, 0.34, 0.92, 0.70, sides=8, flat=1.0)
    o.group("glow"); o.mat("cyan")
    o.hull(-0.04, 0.03, 0.80, 0.80, sides=8, flat=1.0, caps=False)
    o.group("body"); o.mat("hull")
    o.hull(0.34, L - 0.7, 0.70, 0.78, sides=8, flat=1.0)
    o.group("bands"); o.mat("bronze")
    for z in (1.0, 1.7, 2.4):
        o.hull(z, z + 0.09, 0.80, 0.80, sides=8, flat=1.0, caps=False)
    o.group("intake"); o.mat("black")
    o.hull(L - 0.7, L - 0.5, 0.78, 0.74, sides=8, flat=1.0)
    o.group("mount"); o.mat("gunmetal")
    o.hull(L - 0.5, L, 0.74, HULL_R * 0.92, sides=8, flat=1.0)
    o.group("pumps"); o.mat("steel")
    for i in range(4):
        a = math.pi / 4 + math.pi * i / 2
        o.tube_axis((0.86 * math.cos(a), 0.86 * math.sin(a), 0.6),
                    (0.86 * math.cos(a), 0.86 * math.sin(a), 2.6), 0.075, 0.075, 4)
    nodes = [node((0, 0, L), (0, 0, 1), "Stack")]
    stats = {"role": "Engine", "mass_kg": 420, "thrust_n": 280000, "fuel_per_s": 26,
             "tier": "T3", "recipe": "bronze 8 + iron 6 + circuit 1",
             "blurb": "280 kN on the centreline. Stack it behind the hull and it pushes straight."}
    return o, nodes, "Heavy Nacelle", stats


def attitude_bank():
    """Twin counter-rotating gyros. Without one, a big hull will not turn."""
    o = Obj("attitude_bank")
    L, R = 1.7, HULL_R * 0.96
    o.group("case"); o.mat("gunmetal")
    o.hull(0.0, L, R, R, flat=FLAT)
    o.group("windows"); o.mat("black")
    for sx in (-1, 1):
        for z in (0.48, 1.22):
            o.box((sx * R * 0.82, 0.0, z), (0.06, 0.24, 0.26))
    o.group("wheels"); o.mat("brass")
    for z in (0.48, 1.22):
        seg, rr = 14, 0.44
        for i in range(seg):
            a0 = 2.0 * math.pi * i / seg
            a1 = 2.0 * math.pi * (i + 1) / seg
            o.tube_axis((rr * math.cos(a0), rr * math.sin(a0) * 0.88, z),
                        (rr * math.cos(a1), rr * math.sin(a1) * 0.88, z), 0.08, 0.08, 4)
    o.group("spine"); o.mat("steel")
    o.tube_axis((0.0, 0.0, 0.1), (0.0, 0.0, L - 0.1), 0.10, 0.10, 5)
    o.group("status"); o.mat("green_led")
    for z in (0.48, 1.22):
        o.box((0.0, R * FLAT * 0.88, z), (0.09, 0.05, 0.07))
    nodes = [node((0, 0, 0), (0, 0, -1), "Stack"), node((0, 0, L), (0, 0, 1), "Stack")]
    stats = {"role": "Gyro", "mass_kg": 260, "torque_nm": 180000, "tier": "T4",
             "recipe": "iron 10 + copper 8 + circuit 4",
             "blurb": "180 kN-m, no fuel. A 6-tonne hull turns at 0.6 rad/s with one and 0.14 without."}
    return o, nodes, "Attitude Bank", stats


def fuel_bunker():
    """Four cells in one slot - the part-cap-efficient way to carry range."""
    o = Obj("fuel_bunker")
    L, R = 4.0, HULL_R * 1.08
    o.group("shell"); o.mat("hull_dark")
    o.hull(0.0, L, R, R, flat=FLAT)
    o.group("cells"); o.mat("orange")
    for sx in (-1, 1):
        for z in (0.95, 3.05):
            o.box((sx * R * 0.54, 0.0, z), (0.30, R * FLAT * 0.74, 0.85))
    o.group("straps"); o.mat("gunmetal")
    for z in (0.5, 2.0, 3.5):
        o.hull(z, z + 0.11, R * 1.03, R * 1.03, flat=FLAT, caps=False)
    o.group("manifold"); o.mat("bronze")
    o.tube_axis((0.0, R * FLAT * 0.78, 0.3), (0.0, R * FLAT * 0.78, L - 0.3), 0.075, 0.075, 5)
    o.group("gauges"); o.mat("amber")
    for z in (0.95, 3.05):
        o.box((0.0, R * FLAT * 0.9, z), (0.12, 0.05, 0.24))
    nodes = [node((0, 0, 0), (0, 0, -1), "Stack"), node((0, 0, L), (0, 0, 1), "Stack"),
             node((R, 0, L * 0.5), (1, 0, 0), "Radial"),
             node((-R, 0, L * 0.5), (-1, 0, 0), "Radial")]
    stats = {"role": "Tank", "mass_kg": 1500, "dry_mass_kg": 220, "fuel_cap": 320,
             "tier": "T3", "recipe": "iron 12 + bronze 4",
             "blurb": "320 units in one slot. Three Fuel Cells cost three slots and carry less."}
    return o, nodes, "Fuel Bunker", stats


def bulk_hold():
    """A freighter's reason to exist."""
    o = Obj("bulk_hold")
    L, R = 5.0, HULL_R * 1.34
    o.group("shell"); o.mat("olive")
    o.hull(0.0, L, R, R, flat=FLAT * 0.98)
    o.group("ribs"); o.mat("gunmetal")
    for f in (0.16, 0.38, 0.62, 0.84):
        o.hull(L * f, L * f + 0.12, R + 0.04, R + 0.04, flat=FLAT * 0.98, caps=False)
    o.group("doors"); o.mat("hull_dark")
    for sx in (-1, 1):
        o.box((sx * R * 0.86, 0.0, L * 0.5), (0.07, R * FLAT * 0.62, L * 0.30))
    o.group("stencil"); o.mat("white")
    o.box((0.0, R * FLAT * 0.96, L * 0.5), (R * 0.46, 0.04, 0.34))
    o.group("chevrons"); o.mat("hazard")
    for sx in (-1, 1):
        o.box((sx * R * 0.88, 0.0, L * 0.5), (0.045, 0.14, L * 0.31))
    o.group("locks"); o.mat("black")
    for i in range(6):
        a = 2.0 * math.pi * i / 6
        for z in (0.28, L - 0.28):
            o.box((R * 0.94 * math.cos(a), R * FLAT * 0.94 * math.sin(a), z), (0.10, 0.10, 0.10))
    nodes = [node((0, 0, 0), (0, 0, -1), "Stack"), node((0, 0, L), (0, 0, 1), "Stack"),
             node((0, -R * FLAT, L * 0.5), (0, -1, 0), "Radial"),
             node((0, R * FLAT, L * 0.5), (0, 1, 0), "Radial")]
    stats = {"role": "Cargo", "mass_kg": 420, "cargo": 24, "tier": "T4",
             "recipe": "iron 14 + bronze 8",
             "blurb": "Twenty-four slots. Fill it and watch your thrust-to-weight collapse."}
    return o, nodes, "Bulk Hold", stats


def heavy_cradle():
    """Landing gear rated for a freighter."""
    o = Obj("heavy_cradle")
    o.group("boss"); o.mat("bronze")
    o.box((0.0, -0.08, 0.0), (0.26, 0.14, 0.40))
    o.group("legs"); o.mat("steel")
    for dz in (-0.34, 0.34):
        for sx in (0.0, 0.62):
            o.tube_axis((sx * 0.3, -0.16, dz), (0.62, -1.55, dz * 1.25), 0.085, 0.07, 5)
    o.group("damper"); o.mat("chrome")
    o.tube_axis((0.0, -0.18, 0.0), (0.40, -0.92, 0.0), 0.085, 0.085, 6)
    o.group("pad"); o.mat("black")
    o.box((0.62, -1.64, 0.0), (0.26, 0.10, 0.62))
    o.group("tread"); o.mat("hazard")
    o.box((0.62, -1.53, 0.0), (0.20, 0.03, 0.50))
    nodes = [node((0, 0, 0), (0, -1, 0), "Radial")]
    stats = {"role": "Gear", "mass_kg": 140, "impact_tolerance_mps": 9, "tier": "T3",
             "recipe": "iron 7 + bronze 3",
             "blurb": "Rated for a loaded freighter, but it lands slower - 9 m/s, not 12."}
    return o, nodes, "Heavy Cradle", stats


PARTS = [cockpit, bridge, fuselage_bay, spine_truss, hull_junction, thrust_spar,
         cargo_bay, bulk_hold, fuel_cell, fuel_bunker, wing, nacelle,
         heavy_nacelle, tail_fin, rcs_block, reaction_wheel, attitude_bank,
         landing_skid, heavy_cradle, docking_collar]

# Per-part camera yaw for the icon / sheet. Flat and radial parts read as
# slivers at the default three-quarter angle, so they get their own view.
YAW = {"wing": 0.95, "tail_fin": 1.30, "landing_skid": 1.25,
       "rcs_block": 0.85, "docking_collar": 0.70, "heavy_cradle": 1.25,
       "thrust_spar": 1.05, "hull_junction": 0.55}


# ---------------------------------------------------------------------- #
# software rasterizer - icons render FROM the model, so they can't drift  #
# ---------------------------------------------------------------------- #

def tris_of(obj):
    """Triangles with per-corner texture pixel coords, read from the same
    structured geometry the OBJ is written from."""
    tris = []
    for (f, vt, m, _g) in obj.faces:
        col = MTL[m]
        for k in range(1, len(f) - 1):
            idx = (0, k, k + 1)
            tris.append((
                tuple(obj.verts[f[i]] for i in idx),
                tuple(obj.atlas.px(*obj.uvs[vt[i] - 1]) for i in idx),
                col))
    return tris


def render(tris, w, h, yaw=0.62, pitch=0.30, ss=3, bg=None, tex=None):
    W, H = w * ss, h * ss
    pts = [v for t in tris for v in t[0]]
    lo = [min(p[i] for p in pts) for i in range(3)]
    hi = [max(p[i] for p in pts) for i in range(3)]
    ctr = [(lo[i] + hi[i]) * 0.5 for i in range(3)]
    rad = max(max(hi[i] - lo[i] for i in range(3)) * 0.5, 1e-4)
    dist = rad * 3.0
    cy, sy = math.cos(yaw), math.sin(yaw)
    cp, sp = math.cos(pitch), math.sin(pitch)
    eye = (ctr[0] + dist * cp * sy, ctr[1] + dist * sp, ctr[2] + dist * cp * cy)
    fwd = _norm([ctr[i] - eye[i] for i in range(3)])
    right = _norm([fwd[2], 0.0, -fwd[0]])
    # cross(fwd, right), NOT cross(right, fwd) - the latter yields -Y and
    # renders every model upside down.
    up = _norm(_cross(fwd, right))
    fl = 1.55 * min(W, H) * 0.5
    light = _norm([-0.45, 0.80, 0.40])
    zb = [[1e30] * W for _ in range(H)]
    px = [[(0, 0, 0, 0)] * W for _ in range(H)]

    def proj(p):
        d = [p[i] - eye[i] for i in range(3)]
        z = sum(d[i] * fwd[i] for i in range(3))
        if z <= 1e-5:
            return None
        return (W * 0.5 + fl * sum(d[i] * right[i] for i in range(3)) / z,
                H * 0.5 - fl * sum(d[i] * up[i] for i in range(3)) / z, z)

    for (tri, uvtri, col) in tris:
        a, b, c = tri
        e1 = [b[i] - a[i] for i in range(3)]
        e2 = [c[i] - a[i] for i in range(3)]
        n = _norm(_cross(e1, e2))
        shade = 0.55 + 0.45 * (0.5 + 0.5 * max(-1.0, min(1.0, n[1])))
        key = max(0.0, sum(n[i] * light[i] for i in range(3)))
        lit = min(1.0, shade * (0.70 + 0.58 * key))
        P = [proj(v) for v in (a, b, c)]
        if any(p is None for p in P):
            continue
        x0 = max(0, int(min(p[0] for p in P)))
        x1 = min(W - 1, int(max(p[0] for p in P)) + 1)
        y0 = max(0, int(min(p[1] for p in P)))
        y1 = min(H - 1, int(max(p[1] for p in P)) + 1)
        det = ((P[1][0] - P[0][0]) * (P[2][1] - P[0][1])
               - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1]))
        if abs(det) < 1e-9:
            continue
        for yy in range(y0, y1 + 1):
            for xx in range(x0, x1 + 1):
                sx, sy_ = xx + 0.5, yy + 0.5
                w0 = ((P[1][0] - sx) * (P[2][1] - sy_) - (P[2][0] - sx) * (P[1][1] - sy_)) / det
                w1 = ((P[2][0] - sx) * (P[0][1] - sy_) - (P[0][0] - sx) * (P[2][1] - sy_)) / det
                if w0 < 0 or w1 < 0 or 1.0 - w0 - w1 < 0:
                    continue
                z = w0 * P[0][2] + w1 * P[1][2] + (1 - w0 - w1) * P[2][2]
                if z < zb[yy][xx]:
                    zb[yy][xx] = z
                    w2 = 1 - w0 - w1
                    if tex is not None:
                        tu = w0 * uvtri[0][0] + w1 * uvtri[1][0] + w2 * uvtri[2][0]
                        tv = w0 * uvtri[0][1] + w1 * uvtri[1][1] + w2 * uvtri[2][1]
                        base = tex.get(max(0, min(tex.n - 1, int(tu))),
                                       max(0, min(tex.n - 1, int(tv))))
                        base = tuple(v / 255.0 for v in base)
                    else:
                        base = col
                    px[yy][xx] = tuple(
                        int(max(0, min(255, 255 * base[i] * lit))) for i in range(3)) + (255,)
    out = []
    for y in range(h):
        row = []
        for x in range(w):
            acc = [0, 0, 0, 0]
            for dy in range(ss):
                for dx in range(ss):
                    p = px[y * ss + dy][x * ss + dx]
                    if p[3]:
                        acc[0] += p[0]; acc[1] += p[1]; acc[2] += p[2]
                    acc[3] += p[3]
            cov = acc[3] // 255
            if cov == 0:
                row.append(bg + (255,) if bg else (0, 0, 0, 0))
            else:
                a = acc[3] // (ss * ss)
                col = (acc[0] // cov, acc[1] // cov, acc[2] // cov)
                if bg:
                    f = a / 255.0
                    row.append(tuple(int(col[i] * f + bg[i] * (1 - f)) for i in range(3)) + (255,))
                else:
                    row.append(col + (a,))
        out.append(row)
    return out


def write_png(path, rows):
    h, w = len(rows), len(rows[0])
    raw = bytearray()
    for r in rows:
        raw.append(0)
        for p in r:
            raw.extend(p)

    def chunk(tag, d):
        return struct.pack(">I", len(d)) + tag + d + struct.pack(">I", zlib.crc32(tag + d) & 0xFFFFFFFF)

    open(path, "wb").write(b"\x89PNG\r\n\x1a\n"
                           + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
                           + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
                           + chunk(b"IEND", b""))


def mesh_of(obj):
    """Flat vertex / uv / face arrays for the HTML playground."""
    verts = [[round(c, 3) for c in v] for v in obj.verts]
    uvs = []
    for (isl, um, vm) in obj.uvs:
        u, v = obj.atlas.uv(isl, um, vm)
        uvs.append([round(u, 4), round(v, 4)])
    faces = []
    for (f, vt, m, _g) in obj.faces:
        r, g, b = MTL[m]
        col = "#%02x%02x%02x" % (int(r * 255), int(g * 255), int(b * 255))
        for k in range(1, len(f) - 1):
            faces.append([f[0], f[k], f[k + 1],
                          vt[0] - 1, vt[k] - 1, vt[k + 1] - 1, col])
    return {"v": verts, "t": uvs, "f": faces}


def main():
    os.makedirs(MODELS, exist_ok=True)
    os.makedirs(ICONS, exist_ok=True)
    sheet_path = sys.argv[sys.argv.index("--sheet") + 1] if "--sheet" in sys.argv else None
    json_path = sys.argv[sys.argv.index("--json") + 1] if "--json" in sys.argv else None

    cells, blob = [], []
    for pi, fn in enumerate(PARTS):
        obj, nodes, label, stats = fn()
        obj.finish(seed=1000 + pi * 37)          # pack the atlas + paint it
        stem = os.path.join(MODELS, "ship_%s.obj" % obj.name)
        obj.write(stem)                          # .obj + .mtl + .png
        side = dict(stats)
        side.update({"label": label, "pivot": [0.0, 0.0, 0.0], "nodes": nodes,
                     "texture": "ship_%s.png" % obj.name,
                     "atlas_px": obj.atlas.size, "uv_islands": len(obj.atlas.islands)})
        json.dump(side, open(stem[:-4] + ".json", "w"), indent=1)

        tris = tris_of(obj)
        yaw = YAW.get(obj.name, 0.62)
        write_png(os.path.join(ICONS, "%s.png" % obj.name),
                  render(tris, 32, 32, yaw=yaw, ss=4, tex=obj.tex))
        print("wrote ship_%-16s %4d tris  %d nodes  atlas %dpx / %d islands"
              % (obj.name, len(tris), len(nodes), obj.atlas.size, len(obj.atlas.islands)))
        if json_path:
            entry = {"id": obj.name, "label": label, "nodes": nodes}
            entry.update(stats)
            entry["mesh"] = mesh_of(obj)
            entry["tex"] = "data:image/png;base64," + base64.b64encode(obj.tex.png()).decode()
            blob.append(entry)
        if sheet_path:
            cells.append(render(tris, 300, 300, yaw=yaw, ss=2, bg=(24, 27, 34), tex=obj.tex))

    if json_path:
        json.dump(blob, open(json_path, "w"), separators=(",", ":"))
        print("wrote", json_path, os.path.getsize(json_path), "bytes")

    if sheet_path:
        cols, S = 4, 300
        rows_n = (len(cells) + cols - 1) // cols
        sheet = [[(24, 27, 34, 255)] * (cols * S) for _ in range(rows_n * S)]
        for i, cell in enumerate(cells):
            ox, oy = (i % cols) * S, (i // cols) * S
            for y in range(S):
                sheet[oy + y][ox:ox + S] = cell[y]
        write_png(sheet_path, sheet)
        print("wrote", sheet_path)


if __name__ == "__main__":
    main()
