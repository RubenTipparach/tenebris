# Proposal: avatar-anims - other players look and swing like players

## Why

The owner, multiplayer, watching OTHER players:

1. "player head should tilt, not whole player body" - with a screenshot of a
   remote avatar pitched forward as one rigid block. The pose frame carries
   the walker's full camera orientation (yaw AND pitch) and
   `Multiplayer.update` slerps the whole avatar group onto it, so looking
   down tips the body over.
2. "digging animation not playing for other players, or placing animation,
   or interacting animation" - the pose frame carries only `planet, p, q`,
   so a remote avatar has no idea its player is mining, placing or opening a
   machine. It only ever plays idle / walk.

## What Changes

- **Body upright, head pitched.** A remote avatar's body takes only the
  yaw of the reported orientation, stood up on the local surface normal of
  the planet it is on; the look pitch goes to the head pivot, clamped to
  `AvatarConfig.HEAD_PITCH_LIMIT_DEG`. Derived on the receiver from the
  `q` that is already on the wire, so poses from old clients render upright
  too. One pure function (`avatarTransforms`) computes both.
- **The player's action rides the pose frame.** The existing `pose`
  message gains one compact optional field `a: [loop, shotKind, shotSeq,
  held]`: the continuous action (idle / mine), the kind of the last
  one-shot action (place / interact / a single swing), a wrapping counter
  of one-shots, and the held item id. A receiver plays a one-shot when the
  counter changes, so a dropped or coalesced frame never loses a swing and
  never plays one twice.
- **Baked arm clips.** `scripts/gen-fauna-anims.py` bakes three new player
  clips into `public/animations/player.anim.json` (the file the avatar
  already uses): `mine` (looping chop), `place` (one forward push),
  `interact` (one reach). The avatar overlays them on the arm tracks.
- **Held item in hand.** The avatar shows the held item's texture (from
  `ITEM_DATA`) as a small block or flat icon in the right hand.
- **Local action source.** `PlanetBlockInteraction` records its own action:
  mining whenever mining progress is shown (the single `updateMiningUI`
  choke point, every target kind), and a one-shot at every right-click
  action (the single cooldown point, now one helper) and every animal hit.
- **Server relays `a`.** `server-js` validates `a` (four small integers) and
  forwards it with the pose; an invalid `a` is dropped, never the pose.

## Back-compat

Old clients ignore `a`. A pose without `a` (old client, or an old server
that strips it) decodes to idle, empty hand. The `q` field is unchanged.

## Out of scope

- A third-person view of your own avatar (the JS client has none; the
  character creator preview keeps idle / walk).
- Per-tool swing styles (pickaxe vs axe vs shovel share the chop).
