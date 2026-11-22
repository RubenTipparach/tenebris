# Proposal: gas giant rings, shadows and atmospheres

## Why

The owner, 2026-11-22, with a screenshot of Brontes's flat beige ring band:
"can we get some better ring shaders, and have planet cast shadow over the
rings? also gas giants have atmospheres too, so some atmosphere shader as
well".

## What Changes

- **Rings:** a ring shader replaces the flat band.
  - **Structure:** ringlets of varied width and density, a broad dark gap,
    soft inner and outer edges, and fine grain, coloured from the giant's
    palette.
  - **Lighting:** lit on the sunward face. Against the sun they glow by
    forward scatter, and the unlit face passes a little light.
- **Shadows both ways:**
  - the planet's shadow falls on the rings (the ray to the sun meets the
    planet, with a soft edge);
  - the rings' shadow falls on the cloud tops.
  - One ring-density function drives both, so the shadow matches the rings.
- **Atmospheres:**
  - a haze shell round each giant, in its own tint by day, warming along the
    day/night line and gone on the night side;
  - on the disc itself, limb darkening and haze over the limb.
- **Numbers:** they sit in `GIANT_LOOK` in `src/mockups/SolarSystemMockup.ts`.
