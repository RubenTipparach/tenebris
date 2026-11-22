# Design: ocean life

1. **One roster per planet, extended, not forked.**
   - **Fish:** the fishing table `FISH_ROSTERS` stays the authority. The
     visible schools on a planet are its own roster's species, drawn from
     the fish's icon colours as small low-poly fish.
   - **Other water animals:** they join `FAUNA_SPECIES` with a `planet` field
     like the land ones, and `validateFaunaRosters` keeps them on that planet.
   - **New fish for the jungle moons:** ItemTypes with drawn 16 px icons in
     the fish icon style.
2. **Swimming (`motion: 'swim'`):** the target depth stays between seabed + a
   margin and the surface - a margin, and the animal never leaves the water.
   - Fish move as a school: shared heading, small offsets.
   - Jellyfish drift slowly with a bob.
   - Crawlers use `walk` on submerged ground.
   - Spawns come from the fauna spawner's water path, on water tiles near the
     player, with each body's numbers in config.
3. **Sea flora:** an instanced scatter like GroundClutter, on seabed tiles
   under water near the player.
   - **Choosing a plant:** each planet's sea-flora table picks a species by
     depth band (shallow, mid) and, on Earth, by latitude: coral where it is
     warm, kelp where it is cool, seagrass in the shallows.
   - **Look:** procedural meshes that sway in the vertex shader, lit by the
     sky light table and darkened with depth like the underwater terrain.
   - **Placement:** deterministic from the seed and the tile, so nothing is
     saved.
4. **Multiplayer:** water animals ride the existing fauna live frames.
   Sea flora is derived from the seed, so every client draws the same plants.
