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
  `card_table`. These map to `station::StationMat` (the machines are
  reserved for the Phase 5 casino interior pass).

A loader that builds a checked-in template into the station shell is
the follow-up once the first real template lands here.
