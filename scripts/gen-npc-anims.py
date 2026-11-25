#!/usr/bin/env python3
"""Bake the NPC animation clips: public/animations/npc_<species>.anim.json.

Every NPC species (openspec friendship-npcs, task 3.2) has three looping
clips, played on the GPU by the fauna's SpeciesRender (src/npc/NpcRenderer.ts):

  idle  breathing, a slow look round, arms at rest
  move  the walk cycle (arms swing against the legs)
  talk  nodding and gesturing - layered over idle / move by its own weight

The format is the fauna's (scripts/gen-fauna-anims.py): FRAMES keyframes per
clip, tracks per part [angle, dx, dy, dz]. Parts are named as in
src/npc/NpcModels.ts: body, head, armL/armR, arm2L/arm2R (a second pair),
legL/legR, and wingL/wingR for a winged species. Which parts a species has
(arm pairs, wings) is read from src/config/NpcConfig.ts, so the clips can
never name a part the model lacks.

Deterministic, stdlib only. Run from the repo root:
    python3 scripts/gen-npc-anims.py
"""
import json
import math
import os
import re

FRAMES = 8
ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'public', 'animations')
CONFIG = os.path.join(ROOT, 'src', 'config', 'NpcConfig.ts')


def f_(i):
    return i / FRAMES


def wave(amp, phase=0.0, mult=1, off=0.0):
    return [off + amp * math.sin(2 * math.pi * (mult * f_(i) + phase)) for i in range(FRAMES)]


def bounce(amp, mult=2):
    return [amp * abs(math.sin(math.pi * mult * f_(i))) for i in range(FRAMES)]


def track(rot=None, dx=None, dy=None, dz=None):
    z = [0.0] * FRAMES
    rot, dx, dy, dz = rot or z, dx or z, dy or z, dz or z
    return [[round(rot[i], 4), round(dx[i], 4), round(dy[i], 4), round(dz[i], 4)] for i in range(FRAMES)]


def neg(v):
    return [-x for x in v]


def species_list():
    """(id, arm pairs, feature, height) for every NPC species in NpcConfig.ts."""
    lines = open(CONFIG, encoding='utf-8').read().splitlines()
    out = []
    for i, line in enumerate(lines):
        m = re.search(r"\bid: '([a-z]+)', name: '[^']+',\s*$", line)
        if not m:
            continue
        # a species entry: its look follows within the next lines
        for nxt in lines[i + 1:i + 4]:
            k = re.search(r"look: \{ heightM: ([\d.]+),.*?arms: (\d+),.*?feature: '([a-z]+)'", nxt)
            if k:
                out.append((m.group(1), int(k.group(2)), k.group(3), float(k.group(1))))
                break
    assert out, 'no NPC species found in NpcConfig.ts'
    return out


def clips_for(arms, feature, height):
    # Arm swings are angles (scale free); bobs scale with the height
    bob = 0.02 * height
    stride = 0.5 if feature != 'stilts' else 0.32  # stilt legs take shorter swings
    pairs = ['arm'] + (['arm2'] if arms > 1 else [])
    wings = feature == 'wings'

    idle = {'body': track(dy=wave(bob * 0.4, mult=1)), 'head': track(rot=wave(0.08, mult=1, phase=0.25))}
    for p in pairs:
        idle[p + 'L'] = track(rot=wave(0.05, mult=1))
        idle[p + 'R'] = track(rot=wave(0.05, mult=1, phase=0.5))
    if wings:
        idle['wingL'] = track(rot=wave(0.12, mult=1))
        idle['wingR'] = track(rot=wave(0.12, mult=1))

    s = wave(stride)
    move = {'body': track(dy=bounce(bob)), 'head': track(rot=wave(0.05, mult=2)),
            'legL': track(rot=s), 'legR': track(rot=neg(s))}
    for i, p in enumerate(pairs):
        a = wave(stride * (0.8 - 0.3 * i))
        move[p + 'L'] = track(rot=neg(a))   # arms swing against the legs
        move[p + 'R'] = track(rot=a)
    if wings:
        move['wingL'] = track(rot=wave(0.35, mult=2))
        move['wingR'] = track(rot=wave(0.35, mult=2))

    # talk: nods and a raised, gesturing right arm (a second pair waves too)
    talk = {'body': track(dy=wave(bob * 0.3, mult=2)), 'head': track(rot=wave(0.18, mult=2, off=0.05))}
    talk['armR'] = track(rot=wave(0.35, mult=1, off=-1.0))
    talk['armL'] = track(rot=wave(0.08, mult=1, off=-0.15))
    if arms > 1:
        talk['arm2L'] = track(rot=wave(0.3, mult=1, phase=0.5, off=-0.6))
        talk['arm2R'] = track(rot=wave(0.1, mult=1))
    if wings:
        talk['wingL'] = track(rot=wave(0.2, mult=2))
        talk['wingR'] = track(rot=wave(0.2, mult=2))

    return {
        'idle': {'duration': 3.0, 'tracks': idle},
        'move': {'duration': 0.9 if feature != 'stilts' else 1.2, 'tracks': move},
        'talk': {'duration': 1.6, 'tracks': talk},
    }


def main():
    os.makedirs(OUT, exist_ok=True)
    for sid, arms, feature, height in species_list():
        data = {'species': 'npc_' + sid, 'frames': FRAMES, 'clips': clips_for(arms, feature, height)}
        path = os.path.join(OUT, 'npc_%s.anim.json' % sid)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, separators=(',', ':'))
            f.write('\n')
        print('wrote', os.path.relpath(path, ROOT))


if __name__ == '__main__':
    main()
