# Design: avatar-anims

## 1. Body vs head from one orientation

The wire `q` is the walker orientation turned half a revolution about up
(`mainPlanet` `AVATAR_FROM_WALKER`), so in avatar space the look is
`q * -Z` and the camera right is `q * +X`. The walker camera never rolls
(`WalkerLook`: right = heading x up), so the camera right is horizontal and

    heading = normalize(project(up x right))

is well defined at ANY pitch, including straight up / down (no `lookAt`
degeneracy). If the right vector is degenerate against the surface up
(only possible off-planet), the projected look is the fallback, then the
projected camera up.

`up` is the receiver's radial at the avatar: `normalize(avatarPos -
planet.center)`, both in the receiver's frame. Body basis:
`X = heading x up, Y = up, Z = -heading`. Head pitch =
`asin(look . up)`, clamped to `+-HEAD_PITCH_LIMIT_DEG`; the rig nods with
`+angle = head down`, so the head pivot turns by `-pitch` on top of the
idle / walk clip.

`avatarTransforms(q, up)` in `src/net/AvatarPose.ts` is pure (three.js
maths only) and is the only place this is computed.

## 2. The action field

`a = [loop, shotKind, shotSeq, held]`, all non-negative integers:

| idx | meaning | range |
|---|---|---|
| 0 | continuous action: 0 idle, 1 mine | enum |
| 1 | kind of the latest one-shot: 1 swing, 2 place, 3 interact (0 none yet) | enum |
| 2 | one-shot counter, wraps at `AvatarConfig.SHOT_SEQ_MOD` | 0..255 |
| 3 | held `ItemType` id (0 = empty hand) | 0..65535 |

A counter, not an edge flag: the sender bumps it per one-shot and keeps
sending the latest value in every pose frame. The receiver keeps the last
counter it saw per remote (`OneShotTracker`): a changed counter plays the
latest kind once. The first frame from a remote only primes the tracker
(joining mid-session must not replay an old swing). Several one-shots
between two frames play once (the avatar would only be mid-swing anyway).

Mining is reported as a continuous state, not a counter: the local player
is mining while mining progress was shown within
`AvatarConfig.MINE_GRACE_S` (mining progress resets to zero for a frame
when a block breaks; the grace stops the swing stuttering). At a low frame
rate the grace stretches to two wall-clock frame gaps, so a slow client
never reads as "not mining" between its own frames.

## 3. Clips

Baked like the walk: `scripts/gen-fauna-anims.py` -> `player.anim.json`,
same rig format (`[angle, dx, dy, dz]` per frame, 8 frames). New clips:

- `mine` (loop): right arm raised up / forward, then chopped down.
- `place` (one-shot): right arm pushed forward and back.
- `interact` (one-shot): right arm reaches forward, holds, returns.
- A one-shot swing (animal hit) plays one cycle of `mine`.

The avatar blends the action clip over the idle / walk result on the parts
the clip has tracks for, with a weight eased at
`AvatarConfig.ACTION_BLEND_RATE`. A one-shot outranks the mine loop.

## 4. Held item

`Avatar.setHeldItem(texture, atlasRegion?)`: a flat double-sided icon for
`/textures/icons/` art, a small cube for block textures. Textures are
cached per path and shared by all avatars (nearest filtering, pixel art).
`Multiplayer` resolves the id through `ITEM_DATA`; unknown ids show
nothing.

## 5. Wire and server

`Multiplayer.update` adds `a` to the existing pose send (from the
`getPose` callback, which now also returns the action). The server
validates `a` (array of 4 integers, each `0..65535`), relays it with the
pose and keeps it on the player for the `welcome` list. No new message
type, no new channel.
