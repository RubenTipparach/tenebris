#!/usr/bin/env python3
"""Draw every block the game can put on screen: its top, side and bottom texture.

After Pale Blue Dot's tools/block_audit.py. The tables are READ from the
source, never retyped, so the sheet cannot describe a game other than the
one that ships:
  - block names and ids: the HexBlockType enum   (src/shared/blockTypes.ts)
  - which material each face uses: BLOCK_FACES   (src/shared/blockTypes.ts)
  - which texture each material loads: the fixed materials and
    BIOME_TEXTURES in src/planet/HexBlock.ts, resolved through the tilesets
    in src/config/SolarSystemConfig.ts
A face whose texture can't be resolved shows a red "?" - that is the audit
failing, not the sheet.

    python3 scripts/block-audit.py <out.html>

Open the HTML (or screenshot it) and look: a moss block showing snow, or a
biome that is the same texture as another, is the bug.
"""
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
read = lambda p: open(os.path.join(ROOT, p)).read()
BLOCKS = read('src/shared/blockTypes.ts')
HEX = read('src/planet/HexBlock.ts')
SOLAR = read('src/config/SolarSystemConfig.ts')


def tileset(name):
    body = re.search(r'export const %s: TilesetConfig = \{(.*?)\n\};' % name, SOLAR, re.S).group(1)
    return dict(re.findall(r"(\w+): '([^']+)'", body))


SETS = {'e': tileset('EARTH_TILESET'), 'q': tileset('SEQUOIA_TILESET'), 'MOON_TILESET': tileset('MOON_TILESET')}

# material key -> texture path
TEX = {}
for key, var, field in re.findall(r"materials\.set\('(\w+)', createTerrainMaterial\((?:\w+ \?\? )?await loadFixed\((\w+)\.(\w+)\)\)\)", HEX):
    TEX[key] = SETS[var][field]
for var, field in re.findall(r"const (\w+) = await loadFixed\(e\.(\w+)\);", HEX):
    for key in re.findall(r"materials\.set\('(\w+)', createTerrainMaterial\(%s\)\)" % var, HEX):
        TEX[key] = SETS['e'][field]
for key, file in re.findall(r"\['(\w+)', '([\w]+)'\]", re.search(r'BIOME_TEXTURES[^=]*= \[(.*?)\];', HEX, re.S).group(1)):
    TEX[key] = f'/textures/biomes/{file}.png'
# Earth's own tileset keys (loaded through the planet's tileset on Earth)
for key, field in [('top', 'grass'), ('side', 'dirt'), ('grassSide', 'dirtGrass'), ('stone', 'stone'),
                   ('wood', 'wood'), ('sand', 'sand'), ('snow', 'snow'), ('dirtSnow', 'dirtSnow'),
                   ('snowSide', 'dirtSnow'), ('ice', 'ice'), ('glass', 'glass')]:
    TEX.setdefault(key, SETS['e'][field])
for key in re.findall(r"materials\.set\('(ore\w+)'", HEX):
    mineral = key[3:].lower().replace('lithium', 'lythium')
    TEX.setdefault(key, f"{SETS['e']['mineralsPath']}/rocks_{mineral}.png")

enum = re.search(r'export enum HexBlockType \{(.*?)\n\}', BLOCKS, re.S).group(1)
names = re.findall(r'(\w+) = (\d+)', enum)
faces = {}
for name, body in re.findall(r'\[HexBlockType\.(\w+)\]: (\{[^}]*\}|sameFaces\(\'\w+\'\))', BLOCKS):
    m = re.match(r"sameFaces\('(\w+)'\)", body)
    if m:
        faces[name] = (m.group(1),) * 3
    else:
        f = dict(re.findall(r"(\w+): '(\w+)'", body))
        faces[name] = (f['top'], f['side'], f['bottom'])


def cell(key):
    path = TEX.get(key)
    full = os.path.join(ROOT, 'public' + path) if path else None
    if not full or not os.path.exists(full):
        return f'<figure class="bad"><div class="q">?</div><figcaption>{key}</figcaption></figure>'
    return f'<figure><img src="file://{os.path.abspath(full)}"><figcaption>{key}<br><small>{path}</small></figcaption></figure>'


rows = []
for name, num in names:
    if name == 'AIR' or name not in faces:
        continue
    t, s, b = faces[name]
    rows.append(f'<tr><th>{name}<br><small>{num}</small></th><td>{cell(t)}</td><td>{cell(s)}</td><td>{cell(b)}</td></tr>')
html = f"""<!doctype html><meta charset=utf-8><title>Block audit</title>
<style>body{{font:12px monospace;background:#1b1b22;color:#ddd;margin:16px}}table{{border-collapse:collapse}}
th{{text-align:left;padding:4px 10px;vertical-align:middle}}td{{padding:4px}}
img{{width:64px;height:64px;image-rendering:pixelated;display:block}}figure{{margin:0;display:flex;gap:6px;align-items:center}}
figcaption{{width:190px;overflow-wrap:anywhere}}small{{color:#888}}.q{{width:64px;height:64px;background:#600;color:#fff;font-size:40px;text-align:center}}
tr:nth-child(odd){{background:#24242c}}</style>
<h1>Blocks: top / side / bottom</h1><table><tr><th>block</th><th>top</th><th>side</th><th>bottom</th></tr>{''.join(rows)}</table>"""
out = sys.argv[1] if len(sys.argv) > 1 else 'block-audit.html'
open(out, 'w').write(html)
print(f'wrote {out}: {len(rows)} blocks, {sum(r.count("class=\"bad\"") for r in rows)} unresolved faces')
