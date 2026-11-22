#!/usr/bin/env python3
"""Bake the fauna animation clips: public/animations/<species>.anim.json.

Every species has two looping clips, played by src/planet/Fauna.ts on the
GPU (one InstancedMesh per species, each vertex tagged with its part):

  idle  grazing / looking round / gliding / bobbing
  move  the walk, hop, flap or swim cycle

A clip is FRAMES evenly spaced keyframes over `duration` seconds. Each track
is one part (named as in src/planet/FaunaModels.ts) and holds, per frame,
[angle, dx, dy, dz]: a rotation (radians) about the part's own axis round
its own pivot, then an offset in model units. Parts with no track rest.
The runtime blends idle -> move by speed and layers procedural tweaks
(height following, hover bob) on top; the base motion is all here.

Model space: +Z forward, +Y up. Legs swing about +X (+angle = foot back),
heads nod about +X (+angle = head down), wings flap about their own axis
(+angle = wing up), tails wag about +Y.

Deterministic, stdlib only. Run from the repo root:
    python3 scripts/gen-fauna-anims.py
"""
import json
import math
import os

FRAMES = 8
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'animations')


def f_(i):
    """Cycle position of frame i, 0..1."""
    return i / FRAMES


def wave(amp, phase=0.0, mult=1, off=0.0):
    return [off + amp * math.sin(2 * math.pi * (mult * f_(i) + phase)) for i in range(FRAMES)]


def arc(amp):
    """0 -> amp -> 0 over the cycle (a hop)."""
    return [amp * math.sin(math.pi * f_(i)) for i in range(FRAMES)]


def bounce(amp, mult=2):
    """|sin|: a step bob, `mult` steps per cycle."""
    return [amp * abs(math.sin(math.pi * mult * f_(i))) for i in range(FRAMES)]


def seq(values):
    assert len(values) == FRAMES
    return list(values)


def track(rot=None, dx=None, dy=None, dz=None):
    z = [0.0] * FRAMES
    rot, dx, dy, dz = rot or z, dx or z, dy or z, dz or z
    return [[round(rot[i], 4), round(dx[i], 4), round(dy[i], 4), round(dz[i], 4)] for i in range(FRAMES)]


def neg(v):
    return [-x for x in v]


def quad_walk(amp, bob, head=0.0):
    """Diagonal-pair gait for four legs."""
    s = wave(amp)
    return {
        'body': track(dy=bounce(bob)),
        'head': track(rot=wave(head, mult=2)),
        'legFL': track(rot=s), 'legBR': track(rot=s),
        'legFR': track(rot=neg(s)), 'legBL': track(rot=neg(s)),
    }


def biped_walk(amp, bob):
    s = wave(amp)
    return {'body': track(dy=bounce(bob)), 'legL': track(rot=s), 'legR': track(rot=neg(s))}


SPECIES = {
    # ---- Earth ---------------------------------------------------------
    'deer': {
        'idle': (3.2, {
            'head': track(rot=seq([1.45, 1.55, 1.45, 1.55, 0.8, 0.0, 0.0, 0.8])),
            'tail': track(rot=wave(0.35, mult=2)),
            'body': track(dy=wave(0.01)),
        }),
        'move': (0.8, {**quad_walk(0.55, 0.05, 0.08), 'tail': track(rot=wave(0.15, mult=2))}),
    },
    'rabbit': {
        'idle': (2.0, {
            'ears': track(rot=seq([0, 0, 0.3, 0, 0, 0, 0.22, 0])),
            'head': track(rot=wave(0.08, mult=3)),
            'body': track(dy=wave(0.006, mult=2)),
        }),
        'move': (0.55, {
            'body': track(rot=wave(-0.22), dy=arc(0.32)),
            'legB': track(rot=arc(0.9)),
            'legF': track(rot=neg(arc(0.6))),
            'ears': track(rot=arc(0.35)),
        }),
    },
    'sheep': {
        'idle': (4.2, {
            'head': track(rot=seq([1.1, 1.2, 1.1, 1.2, 1.1, 0.5, 0.0, 0.5])),
            'tail': track(rot=wave(0.3, mult=3)),
            'body': track(dy=wave(0.008)),
        }),
        'move': (0.9, {**quad_walk(0.45, 0.03, 0.06), 'tail': track(rot=wave(0.2, mult=2))}),
    },
    'cow': {
        'idle': (5.0, {
            'head': track(rot=seq([0.9, 1.0, 0.9, 1.0, 0.9, 1.0, 0.4, 0.0])),
            'tail': track(rot=wave(0.35)),
            'body': track(dy=wave(0.008)),
        }),
        'move': (1.2, {**quad_walk(0.4, 0.03, 0.05), 'tail': track(rot=wave(0.15, mult=2))}),
    },
    'swallow': {
        'idle': (1.6, {
            'wingL': track(rot=wave(0.18, off=0.05)), 'wingR': track(rot=wave(0.18, off=0.05)),
            'tail': track(rot=wave(0.1, phase=0.25)),
        }),
        'move': (0.34, {
            'wingL': track(rot=wave(0.95, off=0.1)), 'wingR': track(rot=wave(0.95, off=0.1)),
            'body': track(dy=wave(-0.05)),
            'tail': track(rot=wave(0.12, phase=0.25)),
        }),
    },
    # ---- Sequoia -------------------------------------------------------
    'sparkit': {
        'idle': (1.2, {
            'tail': track(rot=wave(0.55)),
            'head': track(rot=wave(0.12, mult=2)),
            'body': track(dy=bounce(0.02)),
        }),
        'move': (0.42, {**biped_walk(0.8, 0.12), 'tail': track(rot=wave(0.4, mult=2))}),
    },
    'shellkin': {
        'idle': (4.0, {
            'head': track(rot=seq([0.1, 0.3, 0.35, 0.3, 0.1, 0, -0.1, 0]),
                          dz=seq([0.05, 0.1, 0.1, 0.05, 0, -0.12, -0.12, 0])),
            'body': track(dy=wave(0.01)),
        }),
        'move': (1.4, {**quad_walk(0.35, 0.02, 0.06), 'body': track(rot=wave(0.05), dy=bounce(0.02))}),
    },
    'crane': {
        'idle': (3.0, {
            'neck': track(rot=seq([0, 0.35, 0.95, 1.15, 1.15, 0.95, 0.35, 0])),
            'wingL': track(rot=wave(0.05)), 'wingR': track(rot=wave(0.05)),
        }),
        'move': (1.1, {**biped_walk(0.45, 0.05), 'neck': track(rot=wave(0.15, mult=2))}),
    },
    'raptor': {
        'idle': (1.8, {
            'head': track(rot=seq([0, 0.1, 0.2, 0.1, 0, -0.15, -0.15, 0])),
            'tail': track(rot=wave(0.22)),
            'body': track(dy=wave(0.015)),
            'arms': track(rot=wave(0.15, mult=2)),
        }),
        'move': (0.5, {
            **biped_walk(0.85, 0.09),
            'body': track(rot=[0.12] * FRAMES, dy=bounce(0.09)),
            'tail': track(rot=wave(0.18, mult=2)),
            'head': track(rot=[-0.12] * FRAMES),
            'arms': track(rot=[0.5] * FRAMES),
        }),
    },
    # ---- Cinder --------------------------------------------------------
    'emberBeetle': {
        'idle': (2.2, {
            'head': track(rot=wave(0.08, mult=2)),
            'legsA': track(rot=wave(0.05)), 'legsB': track(rot=wave(-0.05)),
            'body': track(dy=wave(0.006)),
        }),
        'move': (0.4, {
            'legsA': track(rot=wave(0.45)), 'legsB': track(rot=wave(-0.45)),
            'body': track(dy=bounce(0.015)),
            'head': track(rot=wave(0.05, mult=2)),
        }),
    },
    # ---- Vesper --------------------------------------------------------
    'duneSkimmer': {
        'idle': (2.4, {
            'wingL': track(rot=wave(0.25)), 'wingR': track(rot=wave(0.25)),
            'tail': track(rot=wave(0.3, phase=0.25)),
        }),
        'move': (1.0, {
            'wingL': track(rot=wave(0.5)), 'wingR': track(rot=wave(0.5)),
            'tail': track(rot=wave(0.4, phase=0.25)),
            'body': track(dy=wave(0.06)),
        }),
    },
    # ---- Halcyon -------------------------------------------------------
    'crystalGrazer': {
        'idle': (3.6, {
            'head': track(rot=seq([1.0, 1.1, 1.0, 1.1, 1.0, 0.4, 0.0, 0.4])),
            'crystals': track(dy=wave(0.03, mult=2)),
            'body': track(dy=wave(0.012)),
        }),
        'move': (0.95, {**quad_walk(0.42, 0.04, 0.06), 'crystals': track(dy=bounce(0.03))}),
    },
    # ---- Tessaly -------------------------------------------------------
    'frostMoth': {
        'idle': (0.9, {
            'wingL': track(rot=wave(0.5, off=0.35)), 'wingR': track(rot=wave(0.5, off=0.35)),
            'antennae': track(rot=wave(0.1, mult=2)),
            'body': track(dy=wave(0.05)),
        }),
        'move': (0.32, {
            'wingL': track(rot=wave(1.0, off=0.2)), 'wingR': track(rot=wave(1.0, off=0.2)),
            'body': track(dy=wave(-0.08)),
        }),
    },
    # ---- Umbra ---------------------------------------------------------
    'glowJelly': {
        'idle': (3.0, {
            'body': track(dy=wave(0.14)),
            'tentA': track(rot=wave(0.28, phase=0.1)),
            'tentB': track(rot=wave(-0.28, phase=0.2)),
        }),
        'move': (2.0, {
            'body': track(dy=wave(0.22)),
            'tentA': track(rot=wave(0.45, phase=0.15)),
            'tentB': track(rot=wave(-0.45, phase=0.3)),
        }),
    },
    # ---- Verdance (jungle moon of Brontes) ----------------------------
    'canopyGlider': {
        'idle': (2.2, {
            'wingL': track(rot=wave(0.12)), 'wingR': track(rot=wave(0.12)),
            'tail': track(rot=wave(0.25, phase=0.25)),
            'head': track(rot=wave(0.1, mult=2)),
        }),
        'move': (0.9, {
            'wingL': track(rot=wave(0.4, off=0.05)), 'wingR': track(rot=wave(0.4, off=0.05)),
            'tail': track(rot=wave(0.35, phase=0.25)),
            'body': track(dy=wave(-0.06)),
        }),
    },
    'vineMonkey': {
        'idle': (1.8, {
            'head': track(rot=seq([0, 0.15, 0.15, 0, -0.2, -0.2, 0, 0])),
            'tail': track(rot=wave(0.45)),
            'legF': track(rot=wave(0.15, mult=2)),
            'body': track(dy=bounce(0.02)),
        }),
        'move': (0.5, {
            'body': track(rot=wave(0.2), dy=arc(0.4)),
            'legB': track(rot=arc(0.9)),
            'legF': track(rot=neg(arc(1.1))),
            'tail': track(rot=wave(0.5)),
        }),
    },
    # ---- Mirewood (jungle moon of Aurelia) ----------------------------
    'swampWader': {
        'idle': (3.4, {
            'neck': track(rot=seq([0, 0.4, 1.0, 1.2, 1.2, 1.0, 0.4, 0])),
            'tail': track(rot=wave(0.15)),
        }),
        'move': (1.2, {**biped_walk(0.5, 0.06), 'neck': track(rot=wave(0.2, mult=2)), 'tail': track(rot=wave(0.2, mult=2))}),
    },
    'mireToad': {
        'idle': (2.6, {
            'sac': track(dz=seq([0, 0.04, 0.08, 0.04, 0, 0, 0, 0]), dy=seq([0, -0.02, -0.04, -0.02, 0, 0, 0, 0])),
            'body': track(dy=wave(0.01)),
        }),
        'move': (0.7, {
            'body': track(rot=wave(-0.25), dy=arc(0.35)),
            'legB': track(rot=arc(1.0)),
            'legF': track(rot=neg(arc(0.5))),
        }),
    },
    # ---- Players (the multiplayer avatar, src/net/Avatar.ts) -----------
    # Not fauna, but the same rig format: arms swing opposite the legs
    'player': {
        'idle': (3.0, {
            'body': track(dy=wave(0.012)),
            'head': track(rot=seq([0, 0, 0.06, 0.06, 0, 0, -0.04, 0])),
            'armL': track(rot=wave(0.04)), 'armR': track(rot=wave(-0.04)),
        }),
        'move': (0.7, {
            **biped_walk(0.7, 0.05),
            'armL': track(rot=neg(wave(0.55))), 'armR': track(rot=wave(0.55)),
            'head': track(rot=wave(0.03, mult=2)),
        }),
    },
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, clips in SPECIES.items():
        data = {
            'species': name,
            'frames': FRAMES,
            'clips': {clip: {'duration': dur, 'tracks': tracks} for clip, (dur, tracks) in clips.items()},
        }
        path = os.path.join(OUT, f'{name}.anim.json')
        with open(path, 'w') as f:
            json.dump(data, f, separators=(',', ':'))
            f.write('\n')
        print('wrote', os.path.relpath(path))


if __name__ == '__main__':
    main()
