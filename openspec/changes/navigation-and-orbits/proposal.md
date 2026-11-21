# Proposal: maps, compass, waypoints, live orbits and missions

## Why

The owner, 2026-11-21: "when pressing E, can i get a map button, and
missions button?" A player in a twelve-planet system has no way to see the
world they are on, where the other worlds are, which way they are facing, or
what to do next. The bodies also stand still: "I want to make orbits live,
the moon orbits around earth once every 1 hour, and the earth orbits the sun
once every 3 hours, extrapolate that orbit to all other bodies."

## What Changes

- **The inventory panel (E) gets two buttons, Map and Missions**, each
  opening its own panel in the same window.
- **A planet map.** Each world drawn flat, one hexagon per tile, coloured by
  the block on top of it. It follows the player's edits (dig a lake, the map
  shows water) and shows the player, other players and waypoints. Any
  planet can be picked to view, not only the one underfoot.
- **A solar system map.** Every body seen from above at its live position,
  with its orbit drawn, the player's position, and other players. Picking a
  body opens its planet map.
- **Live orbits.** The Moon goes round Earth once an hour and Earth round the
  Sun once every three hours. Every other body follows from those two by
  Kepler's third law: a planet's period grows with its distance from the Sun
  to the power 1.5, and a moon's with its distance from its planet, adjusted
  for the planet's mass. The layout at time zero is today's.
- **A compass bar** at the top of the screen on a planet, as in Pale Blue
  Dot and Skyrim. It shows N, E, S and W with ticks, scrolls as the view
  turns, and marks waypoints on this planet at their bearing and distance.
- **Waypoints**, up to four, set from the map on this planet or any other.
  A right click adds one, a fifth removes the oldest, and a click on one
  removes it. This is Pale Blue Dot's rule (`starter-missions` G3). They are
  saved with the world.
- **Missions.** A list of short goals that walk a player through the game,
  from gathering wood to landing on the Moon, counted from things the game
  already does. Done missions are ticked off, and the next one opens.

## Capabilities

### New Capabilities
- `world-map`: the flat hex map of any planet, coloured by its top blocks and
  kept in step with edits, with the player, other players and waypoints on
  it.
- `system-map`: the top-down solar system map with live body positions,
  orbits and where the players are.
- `orbital-motion`: the bodies' motion on their orbits in time, the one
  clock it runs on, and the sunlight that follows from it.
- `compass`: the heading bar, and which way north is on a planet.
- `waypoints`: up to four marks the player places on any planet, and how
  they are shown and kept.
- `missions`: the mission chain, its objectives, and the Missions panel.

### Modified Capabilities
- None. The repository has no specs yet; this is its first change.

## Impact

- **UI:** `src/player/CraftingSystem.ts` (the E panel), new panels next to
  it, a HUD compass element, and `index.html` styles.
- **World:** a new orbit model beside `src/config/SolarSystemConfig.ts`, read
  by every system that uses a body's position or the Sun's direction (about
  160 places read `planet.center` today: see design, decision 4).
- **Data:**
  - `Planet` gives the map its tiles' top blocks, and tells it about edits;
  - `GameStorage` keeps the waypoints and mission progress;
  - multiplayer shares the orbit clock (the server's world clock already
    exists) and, through records, each player's waypoints.
- **Rocket balance:** distances between planets now change with time, so
  trip costs vary. This is a feature, launch windows, but the rocket tech
  report has to cover it.
