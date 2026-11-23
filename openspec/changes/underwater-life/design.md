# Design: underwater life

1. **Wavy plants (one sway path).** The sea-flora vertex shader keeps
   computing sway. A species look gains two more knobs:
   - `wave`: the sway phase lags by `wave * y` (y runs root to tip, 0 to 1).
     The bend then travels up the plant as an S-curve, and still grows with
     y squared, so the tip moves most.
   - `flutter`: anemones' tentacles open and close radially and wave round
     the ring. The phase comes from the vertex's angle about the plant's
     axis times `SEA_FLORA.FLUTTER_LOBES`, plus the plant's phase.
   - A tall plant uses `reach` (a fraction of the water column), as kelp
     does. A short plant uses a fixed height.
2. **Anemones cluster on rock.**
   - A look's `cluster` makes a tile's plants share one spot (a corner and
     a spread), each standing within `cluster` metres of it: a clump.
   - A zone marked `rocky` grows only on a rocky bed (`rockyBed`, pure). A
     bed is rocky when it is one of the world's `rock` blocks (`seabedOf`
     now returns the bed's block), or when it is a step in the bed: a
     neighbour's bed is at least `SEA_FLORA.LEDGE_STEP` higher or lower (a
     ledge or its foot), or a neighbour is dry land (a bank). Earth's
     seabed is dirt and clay, so on Earth the steps do the work.
   - Each world lists its anemone zone twice:
     - first on rocky beds;
     - then on any bed, behind a high patch threshold, so a few grow away
       from rock.
3. **Schools as one record (boids).** A species with `school` set (the
   fishing-table fish whose largest herd is at least `FISH_FAUNA.minSchool`,
   and the lantern squid) spawns one `Creature`, the anchor, which holds
   `boids`.
   - **The anchor** runs the solo-swimmer step unchanged: wander, flee,
     shore turn and depth clamp. It flees when any of its fish is inside
     the flee radius.
   - **The flock** (`src/planet/Schooling.ts`, pure) works on offsets from
     the anchor and velocities relative to the anchor's own velocity:
     - cohesion toward the flock centroid, with a soft leash past the
       school radius;
     - alignment with neighbours, damped toward the school's velocity;
     - separation inside a personal distance;
     - flight from the nearest player;
     - a little wander;
     - vertical motion flattened, so the school stays a lens, not a ball.
   - **Water clamp:** Fauna clamps each fish into the water column of the
     tile it is over (`swimRadius`). A fish over land or too-shallow water
     is pulled back toward the anchor.
   - **Drawing:** a fish faces its world velocity, eased. All of a species'
     fish go into its one InstancedMesh.
4. **Multiplayer.** A snapshot tuple gains one field, the boid count (0 for
   everything else). A school is one record. A non-host client spawns that
   many fish round the anchor and runs the same `stepSchool` each frame
   round the anchor it eases toward the host's. Fish positions are
   cosmetic, so clients needn't agree on each fish.
5. **Rosters.** Sea flora species stay in the `seaFlora` tables, checked by
   `assertFloraRostersDisjoint`. The sprat sits in `FISH_ROSTERS.sequoia`,
   so the derived fauna and the fishing table stay one roster.
