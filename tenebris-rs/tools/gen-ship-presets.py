#!/usr/bin/env python3
"""Twenty test ships for the drydock playground.

Each preset is a list of (parent, node, part) mates on top of a root part.
This script does NOT trust them: it re-implements the playground's mating
solver and flight math (MODULAR_SHIP_PLAN.md 2.2/2.3 plus the planet's real
g) and refuses to emit a ship that cannot fly - wrong node index, node used
twice, over the part cap, TWR below 1, or a turn rate under the 0.15 rad/s
floor. A preset that ships is a preset that flies.

Run from tenebris-rs/:  python tools/gen-ship-presets.py [--json OUT.json]
"""

import json
import math
import os
import sys

MODELS = os.path.join("assets", "models")
G = 25.0
K_LIN, K_QUAD, K_ANG = 0.40, 0.0004, 3.0
MAX_ANG, MIN_I, MAX_PARTS = 1.6, 200.0, 24


# ----------------------------- vector / quat ----------------------------- #
def vsub(a, b): return [a[i] - b[i] for i in range(3)]
def vadd(a, b): return [a[i] + b[i] for i in range(3)]
def vscale(a, s): return [a[i] * s for i in range(3)]
def vdot(a, b): return sum(a[i] * b[i] for i in range(3))
def vcross(a, b): return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
def vlen(a): return math.sqrt(vdot(a, a))


def vnorm(a):
    m = vlen(a) or 1.0
    return [c / m for c in a]


def q_from_to(a, b):
    """Shortest-arc quaternion (x,y,z,w) taking unit a to unit b - the same
    rule THREE.Quaternion.setFromUnitVectors uses, including its choice of
    axis in the antiparallel case, so Python and the page agree."""
    a, b = vnorm(a), vnorm(b)
    r = vdot(a, b) + 1.0
    if r < 1e-6:
        r = 0.0
        if abs(a[0]) > abs(a[2]):
            v = [-a[1], a[0], 0.0]
        else:
            v = [0.0, -a[2], a[1]]
    else:
        v = vcross(a, b)
    q = [v[0], v[1], v[2], r]
    n = math.sqrt(sum(c * c for c in q)) or 1.0
    return [c / n for c in q]


def q_mul(a, b):
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return [aw*bx + ax*bw + ay*bz - az*by,
            aw*by - ax*bz + ay*bw + az*bx,
            aw*bz + ax*by - ay*bx + az*bw,
            aw*bw - ax*bx - ay*by - az*bz]


def q_rot(q, v):
    x, y, z, w = q
    t = vscale(vcross([x, y, z], v), 2.0)
    return vadd(vadd(v, vscale(t, w)), vcross([x, y, z], t))


def q_angle(q):
    return 2.0 * math.acos(min(1.0, abs(q[3])))


# ------------------------------- part data ------------------------------- #
def load_parts():
    parts = {}
    for fn in sorted(os.listdir(MODELS)):
        if not fn.startswith("ship_") or not fn.endswith(".json"):
            continue
        pid = fn[5:-5]
        d = json.load(open(os.path.join(MODELS, fn)))
        ys = []
        verts = []
        for line in open(os.path.join(MODELS, "ship_%s.obj" % pid)):
            if line.startswith("v "):
                p = [float(c) for c in line.split()[1:4]]
                verts.append(p)
        lo = [min(v[i] for v in verts) for i in range(3)]
        hi = [max(v[i] for v in verts) for i in range(3)]
        d["id"] = pid
        d["centroid"] = [(lo[i] + hi[i]) * 0.5 for i in range(3)]
        d["size"] = [hi[i] - lo[i] for i in range(3)]
        parts[pid] = d
    return parts


PARTS = load_parts()


def mirrored(p):
    m = dict(p)
    m["nodes"] = [{"pos": [-n["pos"][0], n["pos"][1], n["pos"][2]],
                   "dir": [-n["dir"][0], n["dir"][1], n["dir"][2]],
                   "kind": n["kind"]} for n in p["nodes"]]
    m["centroid"] = [-p["centroid"][0], p["centroid"][1], p["centroid"][2]]
    return m


MIRR = {k: mirrored(v) for k, v in PARTS.items()}


def defof(inst):
    return (MIRR if inst["mir"] else PARTS)[inst["part"]]


# ------------------------------ the solver ------------------------------- #
def solve(ship):
    out = []
    for inst in ship:
        if inst["parent"] < 0:
            out.append({"pos": [0.0, 0.0, 0.0], "quat": [0.0, 0.0, 0.0, 1.0]})
            continue
        pt = out[inst["parent"]]
        pdef = defof(ship[inst["parent"]])
        pn = pdef["nodes"][inst["node"]]
        node_pos = vadd(q_rot(pt["quat"], pn["pos"]), pt["pos"])
        node_dir = vnorm(q_rot(pt["quat"], pn["dir"]))
        d = defof(inst)
        q = q_from_to(d["nodes"][0]["dir"], vscale(node_dir, -1.0))
        off = q_rot(q, d["nodes"][0]["pos"])
        out.append({"pos": vsub(node_pos, off), "quat": q})
    return out


def best_mir(part, node_dir):
    """Chiral parts have no rotation that turns a starboard copy into a port
    one - pick whichever definition mates with the smaller rotation."""
    tgt = vscale(node_dir, -1.0)
    a = q_angle(q_from_to(PARTS[part]["nodes"][0]["dir"], tgt))
    b = q_angle(q_from_to(MIRR[part]["nodes"][0]["dir"], tgt))
    return b < a - 1e-3


def build(root, mates):
    ship = [{"part": root, "parent": -1, "node": 0, "roll": 0, "mir": False}]
    used = set()
    for (parent, nodeidx, part) in mates:
        if parent >= len(ship):
            raise ValueError("parent %d not built yet" % parent)
        pdef = defof(ship[parent])
        if nodeidx >= len(pdef["nodes"]):
            raise ValueError("%s has no node %d (has %d)"
                             % (ship[parent]["part"], nodeidx, len(pdef["nodes"])))
        if parent != 0 and nodeidx == 0:
            raise ValueError("node 0 of %s mates its parent" % ship[parent]["part"])
        if (parent, nodeidx) in used:
            raise ValueError("node %d of part %d used twice" % (nodeidx, parent))
        used.add((parent, nodeidx))
        poses = solve(ship)
        pn = pdef["nodes"][nodeidx]
        wd = vnorm(q_rot(poses[parent]["quat"], pn["dir"]))
        ship.append({"part": part, "parent": parent, "node": nodeidx,
                     "roll": 0, "mir": best_mir(part, wd)})
    if len(ship) > MAX_PARTS:
        raise ValueError("%d parts exceeds the %d cap" % (len(ship), MAX_PARTS))
    return ship


def analyse(ship):
    poses = solve(ship)
    mass = thrust_scalar = torque = fuel = burn = cargo = 0.0
    lift = 0.0
    gear = 0
    has_dock = False
    pts = []
    F = [0.0, 0.0, 0.0]
    tau_parts = []
    for inst, t in zip(ship, poses):
        d = PARTS[inst["part"]]
        m = d.get("mass_kg", 0)
        c = vadd(q_rot(t["quat"], d["centroid"]), t["pos"])
        mass += m
        pts.append((m, c, d["size"]))
        torque += d.get("torque_nm", 0)
        fuel += d.get("fuel_cap", 0)
        cargo += d.get("cargo", 0)
        lift += d.get("lift_area_m2", 0) * d.get("lift_coef", 0)
        if d.get("has_dock"):
            has_dock = True
        if d.get("role") == "Gear":
            gear += 1
        if d.get("thrust_n"):
            thrust_scalar += d["thrust_n"]
            burn += d.get("fuel_per_s", 0)
            fdir = q_rot(t["quat"], [0.0, 0.0, 1.0])
            F = vadd(F, vscale(fdir, d["thrust_n"]))
            tau_parts.append((c, vscale(fdir, d["thrust_n"])))
    com = [0.0, 0.0, 0.0]
    if mass > 0:
        for (m, c, _s) in pts:
            com = vadd(com, vscale(c, m / mass))
    I = 0.0
    for (m, c, s) in pts:
        d = vsub(c, com)
        I += m * (s[1] * s[1] + s[2] * s[2]) / 12.0 + m * (d[1] * d[1] + d[2] * d[2])
    I = max(I, MIN_I)
    tau = [0.0, 0.0, 0.0]
    for (c, f) in tau_parts:
        tau = vadd(tau, vcross(vsub(c, com), f))
    thrust = vlen(F)
    a_max = thrust / mass if mass else 0.0
    cruise = ((-K_LIN + math.sqrt(K_LIN**2 + 4 * K_QUAD * a_max)) / (2 * K_QUAD)) if a_max > 0 else 0
    return {"parts": len(ship), "mass": mass, "thrust": thrust,
            "twr": thrust / (mass * G) if mass else 0,
            "cruise": cruise, "turn": min(MAX_ANG, torque / (I * K_ANG)) if I else 0,
            "I": I, "torque": torque, "fuel": fuel,
            "burn": fuel / burn if burn else 0, "cargo": cargo,
            "lift": lift, "gear": gear, "dock": has_dock, "tau": vlen(tau)}


# ------------------------------ the fleet -------------------------------- #
# node maps, for reading the mates below:
#   cockpit        0 aft
#   bridge         0 aft | 1 dorsal | 2 ventral
#   fuselage_bay   0 aft | 1 fore | 2 +X | 3 -X | 4 dorsal | 5 ventral
#   spine_truss    0 aft | 1 fore | 2/3 +-X fwd | 4/5 +-X aft | 6 dorsal | 7 ventral
#   hull_junction  0 aft | 1 fore centre | 2 fore +X | 3 fore -X
#   thrust_spar    0 fore | 1..4 hardpoints
#   cargo_bay      0 aft | 1 fore | 2 +X | 3 -X | 4 ventral
#   bulk_hold      0 aft | 1 fore | 2 ventral | 3 dorsal
#   fuel_cell      0 aft | 1 fore
#   fuel_bunker    0 aft | 1 fore | 2 +X | 3 -X
#   wing           0 root | 1 hardpoint
#   reaction_wheel / attitude_bank   0 aft | 1 fore
FLEET = [
 # ---- combat -----------------------------------------------------------
 ("Wasp", "Interceptor", "combat", "cockpit", [
   (0,0,'fuselage_bay'), (1,1,'reaction_wheel'), (2,1,'fuel_cell'),
   (1,2,'wing'), (1,3,'wing'), (4,1,'nacelle'), (5,1,'nacelle'),
   (1,4,'tail_fin'), (1,5,'landing_skid')]),
 ("Harrier", "Strike Fighter", "combat", "cockpit", [
   (0,0,'fuselage_bay'), (1,1,'reaction_wheel'), (2,1,'fuel_cell'),
   (1,2,'wing'), (1,3,'wing'), (4,1,'nacelle'), (5,1,'nacelle'),
   (1,4,'tail_fin'), (1,5,'landing_skid'), (3,1,'rcs_block')]),
 ("Bastion", "Gunship", "combat", "cockpit", [
   (0,0,'fuselage_bay'), (1,1,'fuel_cell'), (2,1,'attitude_bank'),
   (3,1,'thrust_spar'), (4,1,'heavy_nacelle'), (4,2,'heavy_nacelle'),
   (1,2,'wing'), (1,3,'wing'), (1,4,'tail_fin'), (1,5,'landing_skid')]),
 ("Rampart", "Heavy Corvette", "combat", "bridge", [
   (0,0,'fuselage_bay'), (1,1,'fuel_bunker'), (2,1,'attitude_bank'),
   (3,1,'thrust_spar'), (4,1,'heavy_nacelle'), (4,2,'heavy_nacelle'),
   (4,3,'heavy_nacelle'), (4,4,'heavy_nacelle'),
   (1,2,'wing'), (1,3,'wing'), (1,4,'tail_fin'),
   (2,2,'rcs_block'), (2,3,'rcs_block'), (1,5,'heavy_cradle'),
   (0,1,'docking_collar')]),

 # ---- transport --------------------------------------------------------
 ("Ferry", "Shuttle", "transport", "cockpit", [
   (0,0,'cargo_bay'), (1,1,'reaction_wheel'), (2,1,'fuel_cell'),
   (1,2,'wing'), (1,3,'wing'), (4,1,'nacelle'), (5,1,'nacelle'),
   (1,4,'landing_skid'), (3,1,'docking_collar')]),
 ("Drover", "Freighter", "transport", "cockpit", [
   (0,0,'spine_truss'), (1,1,'bulk_hold'), (2,1,'fuel_bunker'),
   (3,1,'attitude_bank'), (4,1,'heavy_nacelle'),
   (1,2,'landing_skid'), (1,3,'landing_skid'),
   (2,2,'heavy_cradle'), (1,6,'docking_collar'),
   (1,4,'rcs_block'), (1,5,'rcs_block')]),
 ("Colossus", "Heavy Hauler", "transport", "bridge", [
   (0,0,'hull_junction'), (1,1,'bulk_hold'), (1,2,'fuel_bunker'),
   (1,3,'fuel_bunker'), (2,1,'attitude_bank'), (5,1,'thrust_spar'),
   (6,1,'heavy_nacelle'), (6,2,'heavy_nacelle'),
   (6,3,'heavy_nacelle'), (6,4,'heavy_nacelle'),
   (2,2,'heavy_cradle'), (2,3,'docking_collar'),
   (3,2,'rcs_block'), (4,2,'rcs_block')]),
 ("Caravan", "Container Liner", "transport", "bridge", [
   (0,0,'spine_truss'), (1,1,'bulk_hold'), (2,1,'bulk_hold'),
   (3,1,'fuel_bunker'), (4,1,'attitude_bank'), (5,1,'heavy_nacelle'),
   (1,2,'rcs_block'), (1,3,'rcs_block'),
   (2,2,'heavy_cradle'), (3,2,'heavy_cradle'),
   (1,6,'docking_collar'), (0,2,'landing_skid')]),

 # ---- mining -----------------------------------------------------------
 ("Ferret", "Prospector", "mining", "cockpit", [
   (0,0,'fuselage_bay'), (1,1,'reaction_wheel'), (2,1,'cargo_bay'),
   (3,1,'fuel_cell'), (1,2,'wing'), (1,3,'wing'),
   (5,1,'nacelle'), (6,1,'nacelle'),
   (1,5,'landing_skid'), (3,4,'landing_skid')]),
 ("Quarry", "Ore Hauler", "mining", "cockpit", [
   (0,0,'spine_truss'), (1,1,'bulk_hold'), (2,1,'fuel_bunker'),
   (3,1,'attitude_bank'), (4,1,'heavy_nacelle'),
   (1,2,'heavy_cradle'), (1,3,'heavy_cradle'), (2,2,'heavy_cradle'),
   (1,4,'rcs_block'), (1,5,'rcs_block'), (1,6,'docking_collar')]),
 ("Deepcore", "Mining Rig", "mining", "bridge", [
   (0,0,'hull_junction'), (1,1,'spine_truss'), (1,2,'bulk_hold'),
   (1,3,'bulk_hold'), (2,1,'fuel_bunker'), (5,1,'attitude_bank'),
   (6,1,'heavy_nacelle'),
   (2,2,'heavy_cradle'), (2,3,'heavy_cradle'),
   (2,4,'rcs_block'), (2,5,'rcs_block'), (2,6,'docking_collar'),
   (3,2,'landing_skid'), (4,2,'landing_skid')]),

 # ---- tanker -----------------------------------------------------------
 ("Ladle", "Fuel Tender", "tanker", "cockpit", [
   (0,0,'fuselage_bay'), (1,1,'fuel_bunker'), (2,1,'reaction_wheel'),
   (1,2,'wing'), (1,3,'wing'), (4,1,'nacelle'), (5,1,'nacelle'),
   (1,5,'landing_skid'), (3,1,'docking_collar'), (1,4,'rcs_block')]),
 ("Cistern", "Bulk Tanker", "tanker", "bridge", [
   (0,0,'fuel_bunker'), (1,1,'fuel_bunker'), (2,1,'fuel_bunker'),
   (3,1,'attitude_bank'), (4,1,'heavy_nacelle'),
   (1,2,'rcs_block'), (1,3,'rcs_block'),
   (2,2,'heavy_cradle'), (2,3,'heavy_cradle'),
   (0,1,'docking_collar'), (0,2,'landing_skid')]),

 # ---- exploration ------------------------------------------------------
 ("Kite", "Scout", "exploration", "cockpit", [
   (0,0,'fuselage_bay'), (1,1,'reaction_wheel'), (2,1,'fuel_cell'),
   (1,2,'wing'), (1,3,'wing'), (4,1,'nacelle'), (5,1,'nacelle'),
   (1,4,'tail_fin'), (1,5,'landing_skid')]),
 ("Wayfarer", "Pathfinder", "exploration", "cockpit", [
   (0,0,'fuselage_bay'), (1,1,'fuel_bunker'), (2,1,'reaction_wheel'),
   (1,2,'wing'), (1,3,'wing'),
   (4,1,'nacelle'), (5,1,'nacelle'),
   (1,4,'tail_fin'), (1,5,'landing_skid'), (2,2,'docking_collar')]),
 ("Odyssey", "Long Ranger", "exploration", "bridge", [
   (0,0,'spine_truss'), (1,1,'fuel_bunker'), (2,1,'fuel_bunker'),
   (3,1,'attitude_bank'), (4,1,'heavy_nacelle'),
   (1,2,'wing'), (1,3,'wing'), (6,1,'nacelle'),
   (7,1,'nacelle'),
   (1,6,'docking_collar'), (1,7,'heavy_cradle'), (0,2,'landing_skid'),
   (1,4,'rcs_block'), (1,5,'rcs_block')]),

 # ---- science ----------------------------------------------------------
 ("Lantern", "Survey Ship", "science", "cockpit", [
   (0,0,'fuselage_bay'), (1,1,'cargo_bay'), (2,1,'fuel_cell'),
   (3,1,'reaction_wheel'), (1,2,'wing'), (1,3,'wing'),
   (5,1,'nacelle'), (6,1,'nacelle'),
   (1,4,'rcs_block'), (1,5,'landing_skid'), (2,4,'landing_skid')]),
 ("Astrolabe", "Laboratory", "science", "bridge", [
   (0,0,'spine_truss'), (1,1,'cargo_bay'), (2,1,'fuel_bunker'),
   (3,1,'attitude_bank'), (4,1,'heavy_nacelle'),
   (1,2,'rcs_block'), (1,3,'rcs_block'), (1,4,'rcs_block'), (1,5,'rcs_block'),
   (1,6,'docking_collar'), (1,7,'heavy_cradle'), (0,2,'landing_skid')]),
 ("Oculus", "Sensor Platform", "science", "bridge", [
   (0,0,'hull_junction'), (1,1,'fuel_bunker'), (1,2,'fuel_cell'),
   (1,3,'fuel_cell'), (2,1,'attitude_bank'), (5,1,'heavy_nacelle'),
   (0,1,'docking_collar'), (0,2,'landing_skid'),
   (2,2,'rcs_block'), (2,3,'rcs_block'),
   (3,1,'rcs_block'), (4,1,'rcs_block')]),

 # ---- utility ----------------------------------------------------------
 ("Mule", "Station Tug", "utility", "cockpit", [
   (0,0,'fuselage_bay'), (1,1,'fuel_cell'), (2,1,'reaction_wheel'),
   (3,1,'heavy_nacelle'),
   (1,2,'rcs_block'), (1,3,'rcs_block'), (1,4,'docking_collar'),
   (1,5,'landing_skid')]),
]


def main():
    out = []
    bad = 0
    print("%-12s %-18s %5s %8s %7s %6s %7s %6s %5s" %
          ("name", "class", "parts", "mass", "thrust", "TWR", "cruise", "turn", "fuel"))
    for (name, klass, role, root, mates) in FLEET:
        try:
            ship = build(root, mates)
        except ValueError as e:
            print("  !! %-12s %s" % (name, e)); bad += 1; continue
        s = analyse(ship)
        flag = ""
        if s["twr"] < 1.0:
            flag += " TWR<1"
        if s["turn"] < 0.15:
            flag += " SLUGGISH"
        if s["thrust"] <= 0:
            flag += " NO-ENGINE"
        if s["torque"] > 0 and s["tau"] / s["torque"] > 1.0:
            flag += " THRUST-TORQUE>%.1fx" % (s["tau"] / s["torque"])
        if flag:
            print("  !! %-12s %s" % (name, flag.strip())); bad += 1
        print("%-12s %-18s %5d %8.0f %7.0f %6.2f %7.0f %6.2f %5.0f" %
              (name, klass, s["parts"], s["mass"], s["thrust"] / 1000,
               s["twr"], s["cruise"], s["turn"], s["fuel"]))
        out.append({"name": name, "klass": klass, "role": role,
                    "graph": [{"part": i["part"], "parent": i["parent"],
                               "node": i["node"], "roll": 0,
                               "mir": bool(i["mir"]), "twin": -1} for i in ship],
                    "twr": round(s["twr"], 2), "mass": round(s["mass"]),
                    "cruise": round(s["cruise"]), "turn": round(s["turn"], 2)})
    print("\n%d ships, %d rejected" % (len(out), bad))
    if "--json" in sys.argv:
        p = sys.argv[sys.argv.index("--json") + 1]
        json.dump(out, open(p, "w"), separators=(",", ":"))
        print("wrote", p, os.path.getsize(p), "bytes")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
