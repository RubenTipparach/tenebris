#!/usr/bin/env python3
"""Find faces wound the wrong way round in the ship kit.

WHY IT MATTERS. The playground draws hulls with THREE.FrontSide so that
backface culling removes the coincident interior faces that would otherwise
z-fight (see check-ship-seams.py). Culling only works if every face is wound
counter-clockwise seen from OUTSIDE. A face wound the other way is invisible
from outside and visible from inside: the model reads as holed, or as an
inside-out shell. Under the old DoubleSide draw this was hidden - both bugs
were, which is why they surfaced together.

THE TEST. Winding is only meaningful per primitive, so faces are grouped by
the _emit that produced them. For each primitive take the centroid C of its
own vertices; a face with outward winding has its normal pointing away from
C, i.e. dot(n, F - C) > 0 for the face centroid F. Exact for the convex
primitives the kit is built from (box, prism/frustum, tube, wedge).

Run from tenebris-rs/:  python tools/check-ship-winding.py
Exit status is non-zero if anything is inverted.
"""

import importlib.util
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location(
    "gen_ship_parts", os.path.join(HERE, "gen-ship-parts.py"))
gsp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gsp)


def sub(a, b):
    return [a[i] - b[i] for i in range(3)]


def cross(a, b):
    return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]


def dot(a, b):
    return sum(a[i]*b[i] for i in range(3))


def main():
    total = 0
    for fn in gsp.PARTS:
        obj = fn()[0]
        verts = obj.verts
        bad = {}
        for pr in obj.prims:
            vs = verts[pr["vert0"]:pr["vert0"] + pr["nverts"]]
            if len(vs) < 3:
                continue
            c = [sum(v[k] for v in vs) / len(vs) for k in range(3)]
            for fi in range(pr["face0"], pr["face0"] + pr["nfaces"]):
                idx = obj.faces[fi][0]
                a, b, d = verts[idx[0]], verts[idx[1]], verts[idx[2]]
                n = cross(sub(b, a), sub(d, a))
                if math.sqrt(dot(n, n)) < 1e-12:
                    continue
                f = [sum(verts[i][k] for i in idx) / len(idx) for k in range(3)]
                out = sub(f, c)
                if math.sqrt(dot(out, out)) < 1e-9:
                    continue          # face centroid at the solid's centre
                if dot(n, out) < 0:
                    key = (pr["group"], pr["mat"])
                    bad[key] = bad.get(key, 0) + 1
        if bad:
            n = sum(bad.values())
            total += n
            print("  %-26s %3d inverted faces: %s" % (
                obj.name, n,
                ", ".join("%s/%s x%d" % (g, m, c) for (g, m), c in sorted(bad.items()))))
    print("inverted faces:", total)
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
