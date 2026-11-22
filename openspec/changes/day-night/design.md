# Design: day-night

## Context

`navigation-and-orbits` made the bodies move. Each body goes round its parent
on a circle (`src/world/Orbits.ts`, `positionAt`). The body the player is on
is the fixed frame: `framePositionAt(id, ref, t) = pos(id, t) - pos(ref, t) +
pos(ref, 0)`. `mainPlanet.applyOrbitPositions` places the Sun, every planet,
their atmospheres, flora and the gas giants with that function each frame.
It also hands every planet its sun direction. Orientation was never part of
it, so a planet's only day was its year.

The owner put it this way: "the world rotates around the planet really,
because of your frame of reference system". That is the model used here.

## Goals / Non-Goals

**Goals:**
- A real day/night cycle on every world, minutes long, set per body in
  config.
- One place that applies the turn, so the Sun, sunlight, the other bodies,
  the gas giants, the stars, rocket gravity sources and multiplayer all
  agree.
- Terrain, placed objects, saves, launch pads and the station rule stay
  untouched. The body you are on never moves.
- Flight stays sane in orbit, between bodies and at frame changes.

**Non-Goals:**
- Axial tilt and seasons. Compass north is +Y on every body
  (`src/nav/compass.ts`, `NORTH`). A tilted spin axis would have to move
  that north with it, so it is left for later.
- Visibly spinning bodies seen from afar. A body that is not the reference
  is drawn in its own axes. Its terminator follows the Sun direction in our
  frame, so it is lit correctly, but its surface features do not turn. The
  terrain shaders use the raw mesh normal, so turning the mesh would break
  their lighting.
- Tidal locking. See decision 1.

## Decisions

### 1. Spin: one axis, retrograde, the day comes from config

Every body turns about +Y. The orbits turn about -Y: the angle grows from +X
towards +Z. The compass rule says the Sun's daily path turns about -Y, which
gives north = +Y and a sunrise in the east. A prograde spin faster than the
orbit would reverse the Sun's daily path. Then the Sun would rise in the west,
or north would have to flip to -Y on every body, breaking the compass, the
map, waypoints and the nav tests. So the spin is **retrograde** (Venus-like).
The daily path and the yearly drift then turn the same way, and

    1 / solar day = 1 / sidereal + 1 / year

Config gives the **solar day**, `dayMin`, because that is what a player lives
by: sunrise to sunrise. `Orbits.buildSpins` works out the sidereal period
from it as `1/P = 1/day - 1/year`. For a moon, the year is its planet's. Its
own small orbit of the planet adds a parallax wobble to the Sun direction,
so a moon's day is that length "about". A body with no `dayMin` takes
`ORBIT_CONFIG.DAY_MIN[type]`: a planet 24 minutes, a moon 18, an asteroid 6.
The Sun does not turn.

A retrograde spin cannot be tidally locked, since locking is a prograde spin
at the orbital rate. A locked Moon's day would also be about 90 minutes,
and the owner's complaint was that the Moon's day is too long. So no body is
locked.

| body | day (min) | sidereal (min) | why |
|---|---|---|---|
| Earth | 20 | 22.5 | a Minecraft-length day |
| Moon | 24 | 27.7 | its own day, a little longer than Earth's |
| Sequoia | 30 | 44.7 | a big world, a long day |
| Metropole (ferrum) | 24 | 32.6 | |
| Cinder | 16 | 16.7 | small and hot |
| Vesper | 36 | 49.4 | the biggest rock world |
| Halcyon | 18 | 18.8 | |
| Tessaly | 28 | 29.4 | |
| Nerith | 14 | 14.6 | |
| Kessel | 12 | 12.6 | the smallest planet, the quickest |
| Umbra | 40 | 63.8 | the dark world: long nights |
| Verdance / Mirewood | 22 / 26 | 22.4 / 27.4 | jungle moons |
| other moons | 18 | 18-22 | default |
| asteroids | 6 | ~6 | default: tumbling rocks |

The spin angle is `2 pi (t mod P) / P`. It is pure, in [0, 2 pi), and on the
same clock as the orbits (the save's clock, or the server's world clock
online), so every player in a world sees the same sky.

### 2. The frame turns with the body near it and is held out in space

A frame is `{ body, yaw? }`. Every position is

    framePositionAt(id, frame, t) = C_body + Ry(-yaw) (pos(id, t) - pos(body, t))

`yaw` is the body's live spin when it is omitted (a turning frame), or a fixed
angle (a held frame). This is the **one place** the turn is applied. The Sun
position, and with it every planet's sun direction, every other body's
centre, the gas giants, rocket gravity sources (`setPlanetCenter`) and the
multiplayer frame offset all come from it. The starfield turns by
`frameYawAt(frame, t)`, the same angle: `GameEngine.setSkyYaw` turns the
sphere, and `skybox.vert` now reads the sky direction in the sphere's own
space. The gas giants' bands and rings turn by it too
(`SolarSystemMockup.setFrameYaw`).

**Flight in a turning frame.** The frame turns, but physics in it is
integrated as if it did not. There are no Coriolis or centrifugal terms. This
is the station rule in CLAUDE.md ("the local frame is treated as inertial").
It is also the owner's model, read literally: the planet is not really
spinning, the universe turns round it. Consequences:
- On and near the ground, everything is as players expect. A rocket at rest
  above the pad stays above the pad, and launches get no free eastward boost.
- An orbit round the reference body is still a clean Kepler orbit, because
  its gravity is central and does not care how the frame is turned.
- What changes is the other bodies. They move across the turning sky at
  their orbital rate plus the wheel. The Moon, at 400 units from Earth,
  moves about 2.6 units/s instead of 0.7. That is small against rocket
  speeds, and the frame change subtracts it (decision 3).

**Out in space the frame is held** (`nextFrame`). Far from the body, the
wheel would carry a target planet thousands of units away round Earth at
15-25 units/s, and the Sun and stars would swing past the cockpit. So once
the traveller is past the spin reach, the frame is frozen at the angle it
had at that moment. The reach is `max(SPIN_FRAME_RADII x radius, sphere of
influence)` and the leaving distance is that times `SPIN_FRAME_HYSTERESIS`.
Freezing is continuous: every position is the same at that instant, and from
then on the sky only moves with the orbits. Coming back inside the reach,
the frame turns with the body again. Its sky snaps to the body's real time
of day, because the body went on turning while the traveller was away. That
snap is the one unavoidable jump, and it happens in space, where it reads as
the sky catching up. The 10% hysteresis stops a rocket hovering at the edge
from flipping the frame back and forth.

Other designs were considered:
- **Turn only the Sun and stars**, leaving other bodies on the orbits alone.
  Then the Moon would hang still in Earth's sky while the stars wheel, and
  its phase would not match. That is two truths for one sky.
- **A turning frame everywhere.** Interplanetary targets would whirl round
  the departure planet.
- **A frame that turns only on the surface.** It would switch modes during
  every launch, with a jump each time.
- **Turning frames that differ per body, with the rocket turned on
  handoff.** See decision 3.

### 3. Changing reference body: translation only, the sky takes the turn

At a sphere-of-influence handoff (`setReferenceBody`) the old frame and the
new one differ by a translation and by the difference of their yaws. The
handoff keeps the traveller's pose relative to the body they arrive at. That
body is drawn in its own axes in both frames, as are its terrain, its landing
site and its placed objects. So the traveller is moved by
`C_new - framePositionAt(new, old, t)` and loses `frameVelocityAt(new, old,
t)`. That is the body's velocity in the old frame, a turning frame's wheel
included. This is the code path that was already there; it now differentiates
the turned frame. The yaw difference goes to the sky: at that moment the Sun,
the stars and the other bodies jump round by it.

The alternative was to turn the rocket, its velocity and its attitude by the
yaw difference about the new body. That keeps the sky continuous, but then
the destination's surface jumps under the rocket. The site being aimed at
moves, and so do the trajectory relative to the ground and the parked
objects. For flight the destination matters more than the sky, so the sky
takes the jump. Most handoffs happen from a held frame, deep in space, where
the jump is a re-orientation of a still sky.

The same convention covers multiplayer. A remote player's pose is in their
body's own axes. It is drawn translated to where that body is in our frame
(`Multiplayer.setFrameOffset`, unchanged), just as that body's terrain and
objects are. Two players on one body share a frame exactly, because the yaw
comes from the shared clock.

### 4. What reads the Sun keeps working

- Every planet, its atmosphere, its flora, Earth's clouds, the block
  interaction (machines, launch pads, torches) and the fauna get their sun
  direction from the turned Sun position in `applyOrbitPositions`.
- `SUN_DIRECTION_EPSILON` (1e-4 rad) still gates the uniform updates. At
  Earth's day the Sun moves 8.7e-5 rad a frame at 60 fps, so updates land
  every second frame, steps of 0.01 deg. The fastest day, an asteroid's 6
  minutes, moves 0.017 deg a frame and updates every frame. The test checks
  both.
- The daytime-sky fade, the directional light and the Sun mesh read the same
  `sunPosition`.
- The system map draws `positionAt`, the non-turning heliocentric view from
  above, so it does not change. Nothing on the maps or the compass shows day
  and night. The compass's north and east are unchanged (decision 1).
- Rocket solar charging: there is no `updateSolar` in this tree yet. When it
  lands it must take the same `sunPosition` the flight manager is handed,
  which is already turned.

## Risks / Trade-offs

- **A jump at handoffs and on returning into the spin reach.** → It is
  bounded to the sky, happens in space, and keeps the destination steady
  (decision 3).
- **Non-reference bodies do not visibly spin.** → They are lit from the
  correct side. Their features do not turn, which is invisible from afar.
- **A ship saved in a held frame.** → The held yaw is not saved. On load the
  frame starts turning and is held again at once, at that moment's angle.
  The ship's pose against the body is exact, but the sky's angle round it
  may differ from before the save.
- **Moons' days wobble** by their orbit's parallax. → The days are given
  "about". Earth's, the one players time, is exact.

## Migration Plan

Nothing to migrate. Saves keep world coordinates with the reference body at
its configured position, as before. The spin angle comes from the saved
game time, so a reload is exact. Old saves load at whatever time of day
their clock gives.
