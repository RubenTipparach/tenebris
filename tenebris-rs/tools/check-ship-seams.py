#!/usr/bin/env python3
"""Report coplanar overlapping face pairs in the ship kit.

Two filled faces in the same plane with overlapping area z-fight: the depth
buffer has no basis to order them, so the seam tears into streaks that swim
as the camera moves.

TWO PASSES, because the two failure modes are different:

  --parts      (default) within a single model. Catches a part whose own
               primitives butt together badly - the docking collar's hatch
               sat exactly on the seal's cap.
  --assembled  ACROSS parts on the assembled preset ships, using the real
               mating solver. This is where players actually see it: the
               wing and the nacelle each carried a mounting pylon spanning
               the same y range, so an engine hung off a wing fought with
               it. A per-part pass can never see that, because neither
               model is wrong on its own.

The assembled pass also catches parts that INTERPENETRATE - two copies of
one part mounted too close to clear each other (four Heavy Nacelles on a
spar, two Plasma Bores on a mining cab). Those show up as `X <-> X` pairs
and are always real: fix the mount spacing, not the geometry.

HOW TO READ IT. A hit is a hazard, not automatically a defect:

  - Pairs on an EXTERIOR surface are bugs. Fix by suppressing the cap on
    one side of the joint (hull/tube_axis take a (start, end) pair), by
    moving one face off the plane, or by spacing the mounts.
  - Pairs buried INSIDE a solid are harmless while the renderer culls back
    faces. The playground draws hulls with THREE.FrontSide for exactly
    this reason - and that only works because every face is wound outward,
    which tools/check-ship-winding.py is what guarantees.

Faces with opposing normals are skipped: one of the pair is always a back
face, so culling picks a winner. Same-material pairs are skipped in the
per-part pass, since one primitive's own faces share planes by
construction. So a non-zero count is expected; what matters is that no hit
lies on the outer skin.

Run from tenebris-rs/:  python tools/check-ship-seams.py [--parts] [--assembled]
"""

import importlib.util
import math
import os
import sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.join(os.path.dirname(HERE), "assets", "models")


def load_obj(path):
    verts, faces, cur = [], [], "?"
    for line in open(path):
        p = line.split()
        if not p:
            continue
        if p[0] == "v":
            verts.append([float(c) for c in p[1:4]])
        elif p[0] == "usemtl":
            cur = p[1]
        elif p[0] == "f":
            faces.append(([int(t.split("/")[0]) - 1 for t in p[1:]], cur))
    return verts, faces


def plane_of(pts):
    """-> (quantised plane key, unit normal) or (None, None) if degenerate."""
    a, b, c = pts[0], pts[1], pts[2]
    e1 = [b[i] - a[i] for i in range(3)]
    e2 = [c[i] - a[i] for i in range(3)]
    n = [e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]]
    m = math.sqrt(sum(x*x for x in n))
    if m < 1e-9:
        return None, None
    n = [x / m for x in n]
    # canonical orientation so front and back faces of one plane collide
    k = [-x for x in n] if (n[0], n[1], n[2]) < (-n[0], -n[1], -n[2]) else n
    d = sum(k[i] * a[i] for i in range(3))
    return (round(k[0], 2), round(k[1], 2), round(k[2], 2), round(d, 2)), n


def overlaps(pts_a, pts_b, n):
    """Do two coplanar faces actually share area? Project both into the
    plane's own 2D basis and intersect their boxes. A centroid-distance
    test calls two big parallel faces a metre apart a collision."""
    ax = [1.0, 0.0, 0.0] if abs(n[0]) < 0.9 else [0.0, 1.0, 0.0]
    u = [n[1]*ax[2]-n[2]*ax[1], n[2]*ax[0]-n[0]*ax[2], n[0]*ax[1]-n[1]*ax[0]]
    m = math.sqrt(sum(x*x for x in u)) or 1.0
    u = [x / m for x in u]
    w = [n[1]*u[2]-n[2]*u[1], n[2]*u[0]-n[0]*u[2], n[0]*u[1]-n[1]*u[0]]

    def box(pts):
        us = [sum(p[k]*u[k] for k in range(3)) for p in pts]
        ws = [sum(p[k]*w[k] for k in range(3)) for p in pts]
        return min(us), max(us), min(ws), max(ws)

    A, B = box(pts_a), box(pts_b)
    if A[1] <= B[0] + 1e-4 or B[1] <= A[0] + 1e-4:
        return False
    if A[3] <= B[2] + 1e-4 or B[3] <= A[2] + 1e-4:
        return False
    return True


def pass_parts():
    print("-- per part --")
    total = 0
    for fn in sorted(os.listdir(MODELS)):
        if not (fn.startswith("ship_") and fn.endswith(".obj")):
            continue
        verts, faces = load_obj(os.path.join(MODELS, fn))
        byplane = defaultdict(list)
        for idx, mat in faces:
            pts = [verts[i] for i in idx]
            pl, n = plane_of(pts)
            if pl:
                byplane[pl].append((mat, pts, n))
        for pl, grp in byplane.items():
            for i in range(len(grp)):
                for j in range(i + 1, len(grp)):
                    ma, pa, na = grp[i]
                    mb, pb, nb = grp[j]
                    if ma == mb:
                        continue
                    if sum(na[k]*nb[k] for k in range(3)) < -0.5:
                        continue
                    if not overlaps(pa, pb, na):
                        continue
                    print("  %-26s %s / %s  plane=%s" % (fn, ma, mb, pl))
                    total += 1
    print("  coplanar pairs within a part:", total)
    return total


def pass_assembled():
    print("-- assembled ships --")
    spec = importlib.util.spec_from_file_location(
        "gen_ship_presets", os.path.join(HERE, "gen-ship-presets.py"))
    gsp = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gsp)

    geo = {}
    total, seen = 0, set()
    for (name, klass, role, root, mates) in gsp.FLEET:
        try:
            ship = gsp.build(root, mates)
        except Exception as e:
            print("  (skipped %s: %s)" % (name, e))
            continue
        poses = gsp.solve(ship)
        byplane = defaultdict(list)
        for i, inst in enumerate(ship):
            pid = inst["part"]
            if pid not in geo:
                geo[pid] = load_obj(os.path.join(MODELS, "ship_%s.obj" % pid))
            verts, faces = geo[pid]
            t = poses[i]
            wv = [gsp.vadd(gsp.q_rot(t["quat"],
                                     [-v[0], v[1], v[2]] if inst["mir"] else v),
                           t["pos"]) for v in verts]
            for idx, mat in faces:
                pts = [wv[k] for k in idx]
                pl, n = plane_of(pts)
                if pl:
                    byplane[pl].append((i, pid, mat, pts, n))
        for pl, grp in byplane.items():
            for a in range(len(grp)):
                for b in range(a + 1, len(grp)):
                    ia, pa, ma, fa, na = grp[a]
                    ib, pb, mb, fb, nb = grp[b]
                    if ia == ib:
                        continue                  # same instance: --parts covers it
                    if sum(na[k]*nb[k] for k in range(3)) < -0.5:
                        continue
                    if not overlaps(fa, fb, na):
                        continue
                    key = tuple(sorted([pa + "/" + ma, pb + "/" + mb]))
                    if key in seen:
                        continue
                    seen.add(key)
                    same = " (INTERPENETRATING)" if pa == pb else ""
                    print("  %-12s %-22s <-> %-22s plane=%s%s"
                          % (name, key[0], key[1], pl, same))
                    total += 1
    print("  coplanar pairs between parts:", total)
    return total


def main():
    want_parts = "--parts" in sys.argv or "--assembled" not in sys.argv
    want_asm = "--assembled" in sys.argv or "--parts" not in sys.argv
    if want_parts:
        pass_parts()
    if want_asm:
        pass_assembled()
    print("see the docstring: interior pairs are culled, exterior ones are bugs")


if __name__ == "__main__":
    main()
