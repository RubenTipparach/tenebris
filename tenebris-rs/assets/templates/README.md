# Station structure templates

Hand-built hex structures for the orbital station, authored in the
Tenebris hex structure editor (the HTML tool) and checked in here as
JSON. The editor caches work-in-progress in browser localStorage;
export when a structure is worth keeping and commit the file to this
directory.

## Format (`*.template.json`)

```json
{
  "format": "tenebris-station-template",
  "version": 1,
  "name": "my-structure",
  "hex_size_m": 2.0,
  "layer_height_m": 1.25,
  "cells": [
    { "q": 0, "r": 0, "layer": 0, "mat": "hull" }
  ]
}
```

- `q`, `r` - pointy-top axial hex coordinates, exactly the grid
  `core/station.rs` uses (`x = sqrt(3)*a*(q + r/2)`, `z = 1.5*a*r`).
- `layer` - vertical prism layer (0 at the keel), `layer_height_m`
  metres per layer.
- `mat` - one of: `hull`, `floor`, `carpet`, `wall`, `neon`,
  `neon_pink`, `neon_gold`, `sign`, `glass`, `slot_machine`,
  `card_table`, `trade_terminal`, `research_console`, `museum_case`,
  `light_fixture`. These map to `station::StationMat`.

## Checked-in templates

- **`stairway.template.json`** - the casino hotel's central stairway
  (user-authored): one full-layer hull tread per layer winding the six
  ring-1 cells around a solid lit core column (floor plating, gold
  band every third layer). `core/station.rs` builds this exact pattern
  into the tower (`STAIR_RING_ORDER` / `STAIR_CORE_GOLD_PERIOD`).
- **`casino-station.template.json`** - the full orbital casino wheel,
  generated from `station::shell(DEFAULT)`. Regenerate after any
  shell() change:

  ```sh
  cargo run -p tenebris-core --example dump-station-template \
      > assets/templates/casino-station.template.json
  ```

Both ship as built-in templates in the tile editor (the Templates
dropdown at https://tenebris-c.fly.dev/admin/tile-editor) - loading
one is a single undoable action, so Ctrl+Z restores your scene.
