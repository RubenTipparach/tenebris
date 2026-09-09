#!/usr/bin/env python3
"""Report coplanar overlapping face pairs across the ship kit.

Two filled faces in the same plane with overlapping area z-fight: the depth
buffer has no basis to order them, so the seam tears into streaks that swim
as the camera moves. The docking collar's hatch was doing exactly that.

HOW TO READ THE OUTPUT. A hit is a HAZARD, not automatically a defect:

  - Pairs on an EXTERIOR surface are real bugs. Fix them by suppressing the
    cap on one side of the joint (hull/tube_axis take a (start, end) pair)
    or by moving one face off the plane.
  - Pairs buried INSIDE a solid are harmless as long as the renderer culls
    back faces. The playground draws the hull with THREE.FrontSide for this
    reason; switch it to DoubleSide and every one of these will shimmer.

So a non-zero count is normal. What matters is that no hit lies on the
outer skin. Same-material pairs are skipped: one primitive's own faces
share planes by construction.

Run from tenebris-rs/:  python tools/check-ship-seams.py
"""
import math, os, sys
from collections import defaultdict

def load(path):
    verts, faces, cur = [], [], "?"
    for line in open(path):
        p = line.split()
        if not p: continue
        if p[0] == "v": verts.append(tuple(float(c) for c in p[1:4]))
        elif p[0] == "g" or p[0] == "o": cur = p[1] if len(p) > 1 else cur
        elif p[0] == "usemtl": cur = p[1]
        elif p[0] == "f":
            idx = [int(t.split("/")[0]) - 1 for t in p[1:]]
            faces.append((idx, cur))
    return verts, faces

def plane(v, idx):
    a, b, c = v[idx[0]], v[idx[1]], v[idx[2]]
    e1 = [b[i]-a[i] for i in range(3)]; e2 = [c[i]-a[i] for i in range(3)]
    n = [e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]]
    m = math.sqrt(sum(x*x for x in n))
    if m < 1e-9: return None
    n = [x/m for x in n]
    # orient canonically so front/back faces of the same plane collide
    if (n[0], n[1], n[2]) < (-n[0], -n[1], -n[2]): n = [-x for x in n]
    d = sum(n[i]*a[i] for i in range(3))
    return (round(n[0],3), round(n[1],3), round(n[2],3), round(d,3))

def centroid(v, idx):
    return [sum(v[i][k] for i in idx)/len(idx) for k in range(3)]

def radius(v, idx, c):
    return max(math.dist(v[i], c) for i in idx)

bad = 0
for fn in sorted(os.listdir("assets/models")):
    if not fn.endswith(".obj"): continue
    v, faces = load(os.path.join("assets/models", fn))
    byplane = defaultdict(list)
    for idx, g in faces:
        pl = plane(v, idx)
        if pl: byplane[pl].append((idx, g))
    for pl, group in byplane.items():
        for i in range(len(group)):
            for j in range(i+1, len(group)):
                ia, ga = group[i]; ib, gb = group[j]
                if ga == gb: continue          # same primitive: shared plane is fine
                ca, cb = centroid(v, ia), centroid(v, ib)
                ra, rb = radius(v, ia, ca), radius(v, ib, cb)
                d = math.dist(ca, cb)
                if d < max(ra, rb) * 0.75:     # centres overlap -> real contest
                    print("  %-26s %s / %s  plane=%s gap=%.3f" % (fn, ga, gb, pl, d))
                    bad += 1
print("coplanar overlapping face pairs:", bad,
      "- see the docstring: interior pairs are culled, exterior ones are bugs")
