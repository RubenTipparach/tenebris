# Sequoia: biomes + fauna design

Design doc for making Sequoia (the green sister planet) a real
destination instead of a Tenebris palette-swap. Written to slot into
the machinery that already exists — every section names the system it
extends (per the repo rule: find the feature, grow it, never fork it).

**Planet identity in one line:** an older, wetter, woodier world.
Everything on Sequoia is about wood, water, and growth taken further
than Tenebris — taller trees, denser canopies, fungus where Tenebris
has grass, rivers where Tenebris has ponds, and fauna that stood up on
two legs.

Current state (for contrast): `Tileset::Sequoia` bodies today reuse
the Tenebris biome classifier (`planet_gen.rs` `Biome`) and swap
blocks (`SeqGrass`/`SeqSand`/`SeqSnow`). Trees, scatter, weather, and
fauna tables are the Tenebris ones. The work below replaces that
palette-swap with a per-body biome table.

---

## 1. Biomes

The existing `Biome` enum (`planet_gen.rs`: Fields / Desert / Jungle /
Swamp / Mountains) is a per-COLUMN classification driven by moisture +
altitude + latitude noise. Sequoia adds its own variants to the same
enum and its own classifier branch keyed off `prof.sequoia` — one
classifier, two planet flavours, no parallel biome system.

### 1.1 Redwood Groves (the signature biome — "tall trees, very wood heavy")

The default temperate band of the planet, where Tenebris would have
Fields.

- **Terrain:** gentle rolling hills, deep brown `SeqDirt` under a moss
  layer (`SeqMoss`, new block: dark teal-green, wet sheen).
- **Flora:** THE tall trees. A new procedural tree generator (extend
  the existing tree builder — same call site, new shape parameters in a
  `trees.yaml` section): trunks 3–5x Tenebris height (12–24 blocks),
  bare for the lower 2/3, then a deep conical crown. Trunk thickness 2
  blocks at the base for the giants. Canopy blocks use a darker
  needle-green (`SeqNeedle`).
- **Gameplay:** wood is the planet's export. A felled giant yields
  8–15 logs — the wood-rush economy loop (haul Sequoia timber back to
  Tenebris, or feed the station market via the cargo phase).
- **Ground cover:** ferns + fallen-log scatter pieces (extend
  `scatter.yaml` with per-biome kinds, same instanced path as grass /
  rocks).

### 1.2 Sporewood (the fungus biome)

Replaces Desert in the classifier's dry band — Sequoia is too wet for
sand seas; its "dry" is where the canopy breaks and the fungus takes
over.

- **Terrain:** flat mycelium plains — `SeqMycelium` top block
  (pale grey-lavender, faintly luminous at night via the existing
  emissive-block path the torches use).
- **Flora:** giant mushrooms as the "trees": stem + flat cap generator
  (second shape branch in the same tree builder). Caps in two palettes
  — dusty rose and pale cyan. Small mushroom scatter between the
  giants; harvestable spore-blocks in the caps (new item: Spores —
  future farming / brewing input).
- **Sky/weather:** spore haze — reuse the weather moisture field to
  drive a coloured fog tint (fog config already per-body via
  atmosphere.yaml) so the biome reads pink-grey from inside.
- **Fauna hook:** this is the herbivore heartland (see Gloomhopper,
  Sporeling below).

### 1.3 Alien Jungle (dense, canopy-locked)

Sequoia's equatorial band, replacing Jungle with something denser and
stranger.

- **Terrain:** near-100% canopy closure. Two vegetation layers: an
  understorey of broad-leaf shrubs (scatter) + a 6–10 block canopy of
  tangled `SeqCanopy` blocks on multi-trunk "banyan" trees (third shape
  branch: several thin trunks merging into one crown).
- **Light:** the canopy actually blocks skylight (the world_light bake
  already propagates occlusion — jungle floors sit at dusk levels all
  day, bring a torch or follow the glow-vines).
- **Flora details:** hanging glow-vines (emissive scatter, cyan),
  buttress roots (solid wood blocks flaring from trunk bases),
  parasite blooms on trunks (harvestable dye/alchemy item).
- **Traversal gameplay:** the jungle is deliberately hard to walk and
  easy to get lost in — the canopy hides the sky. Compass/beacon
  items become valuable here.

### 1.4 River Lands (rivers as a real feature)

Not a classifier biome but a TERRAIN CARVER pass (extends
`planet_gen`'s altitude synthesis, the same place mountain uplift
lives): long meandering negative-altitude channels connecting high
ground to the oceans, 3–8 blocks wide, carved below the water table so
they self-fill via the existing `world_water` sea-level fill.

- Rivers cut through Groves and Jungle; crossings are gameplay
  (bridge-building consumes that wood surplus).
- Banks get their own top block (`SeqSilt`) + reed scatter, and are
  the fishing hotspots (fishing.yaml already supports per-water-body
  tables — add river species: Glassfin, Mudwhisker).

### 1.5 Oceans

Sequoia already has water (`has_water: true`); the change is
PROPORTION and CONTENT: raise the sea-level fraction in its body
profile so oceans cover visibly more of the disk than Tenebris
(target ~55–60% from orbit — it should read as an archipelago world,
green islands in dark water).

- Kelp forest scatter (exists — underwater kelp/weeds from task #20,
  denser preset here).
- Ocean fish species table (extends the fishing ecosystem): Sailfin,
  Lanternjaw (night), Reefback (rare, big).

### 1.6 Mountains (kept, re-dressed)

The Mountains classifier stays, but above the treeline Sequoia rock is
`SeqSlate` (blue-grey) with moss patches instead of snow until the very
peaks — the planet is warmer than Tenebris; snow only above ~85% of the
altitude band.

### Biome layout summary

| Band (by moisture x altitude) | Tenebris | Sequoia |
| --- | --- | --- |
| temperate default | Fields | **Redwood Groves** |
| dry | Desert | **Sporewood** |
| wet equatorial | Jungle | **Alien Jungle** |
| lowland wet | Swamp | **River Lands** (carver + silt banks) |
| high altitude | Mountains | **Mountains (slate + moss)** |
| water | ocean | **bigger oceans** (~55–60% cover) |

---

## 2. Fauna: the bipeds

Sequoia's headline difference: its animal line evolved WALKING ON TWO
FEET. Most Sequoia species are bipeds; a few quadrupeds fill the
niches bipeds can't. Inspiration level: think the *silhouette
language* of Pokemon-style bipedal creature design — compact body,
big head/eyes, short arms, expressive stance — but every creature
below is an original design (no names, shapes, or markings borrowed;
inspiration only, the repo ships nothing derivative).

### 2.1 Engine work (extends, never forks)

- `fauna.rs` `AnimalKind` grows the new species; the per-biome spawn
  table gains a per-BODY dimension (body id -> biome -> kinds), same
  shape as the fishing tables.
- **Biped locomotion:** the existing animal walk cycle animates 4
  limbs; bipeds reuse the same skeleton with the front pair re-tagged
  as ARMS (idle sway, no ground contact). One new gait clip
  (`biped_walk.anim.json`, baked per the animation asset rule): hip
  sway + counter-swinging arms. Hop-gait species reuse the existing
  frog jump arc with a taller pose.
- **Textures:** per-species columns in the existing animal atlas
  (`assets/textures/animals.png` pipeline, 8-bit PNG, gen script under
  `tools/`).

### 2.2 The bipeds

| Species | Biome | Size | Design (original) | Behaviour |
| --- | --- | --- | --- | --- |
| **Gloomhopper** | Sporewood | small | round-bodied hopper, huge amber eyes, stubby arms, mushroom-cap-coloured back | grazes spore blocks; hops in bursts; night-active (glows faintly) |
| **Sporeling** | Sporewood | tiny | walking puffball on two twig legs | flocks of 4–6; pops a harmless spore cloud when startled (visual) |
| **Barkstrider** | Redwood Groves | medium | upright lanky browser, bark-brown plated back, two-toed feet | walks tree to tree stripping low branches; drops Wood Chips when it feeds |
| **Fernwhistle** | Redwood Groves | small | plump biped, leaf-green crest it raises to whistle | the planet's "chicken" — flees players, lays eggs near ferns |
| **Canopyclaw** | Alien Jungle | medium | hook-armed climber, dark violet, luminous wrist spots | climbs trunks (reuses bird vertical logic); territorial screech, not hostile |
| **Mirefoot** | River Lands | medium | heron-legged wader with a shovel jaw | stands in rivers scooping fish; competes with the player's fishing |
| **Duskstalker** | Jungle/Groves night | large | the apex: tall lean biped, sickle arms, eyeshine | Sequoia's stalker-equivalent — night predator, hunts Fernwhistles and players |

### 2.3 The quadrupeds (the exceptions)

| Species | Biome | Size | Design | Behaviour |
| --- | --- | --- | --- | --- |
| **Mossback** | Redwood Groves | huge | slow six-legged (quad rig + 2 dummy legs) grazer, moss garden growing on its shell | neutral; blocks paths like a walking hill; sheds Moss blocks |
| **Silthog** | River Lands | medium | rooting quadruped, paddle snout | churns riverbanks (visual particle dig); truffle-hunts — leads players to buried Spores |
| **Slatehorn** | Mountains | medium | sure-footed cliff quadruped, slate-grey coat | herds on ridges; skittish; drops Wool-equivalent (Slatehorn Hair) |

### 2.4 Ecosystem rules

- Prey/predator: Duskstalker hunts Fernwhistle + Gloomhopper (reuses
  the stalker target-seek). Mirefoot eats river fish (fishing sim
  hook). Everything else grazes flora.
- Spawn density mirrors the Tenebris tables but shifted: more herd
  spawns (Fernwhistle 4–6, Sporeling flocks), fewer solitary spawns.
- Day/night split: Sporewood wakes at night (Gloomhopper + glow
  mycelium), Groves are day-active — so the planet always has a live
  band.

---

## 3. Sequencing (when this gets built)

1. **Blocks + palette** — new Seq* blocks, atlas columns, icons (item
   rule: icon ships with the block).
2. **Classifier split** — Sequoia branch in the biome decision +
   bigger ocean fraction; verify from orbit with the LOD capture tool
   (the disk should read: green islands, dark ocean, pink Sporewood
   patches).
3. **Tree/mushroom/banyan generators** — one builder, three shape
   branches, params in trees.yaml.
4. **River carver** — altitude-synthesis pass + silt banks + reed
   scatter.
5. **Biped rig + first three species** (Fernwhistle, Gloomhopper,
   Barkstrider) — proves the gait + atlas pipeline.
6. **Remaining fauna + ecosystem rules** (Duskstalker last; it needs
   prey populations live first).

Each step lands as its own PR with in-game verification; biome visuals
get LOD-capture before/afters, fauna gets close-up screenshots.
