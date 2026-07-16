#!/usr/bin/env python3
"""Design calculator for the orbital space station (space era Phase 2).

Single source of truth for the station's hex-count and orbital math so
the numbers in station.yaml / core/station.rs / design discussions are
COMPUTED, never fudged. The Rust port pins the same formulas in
core/station.rs tests; when the two disagree, one of them has a bug.

Geometry: a drum built from hexagonal prisms on a hex grid.
  - deck of radius n rings  -> centered hexagonal number 3n(n+1)+1
  - hollow drum shell       -> floor disk + ceiling disk + wall ring
Orbit: circular, on rails, derived purely from the gravity field
  a(r) = g_surf * (R/r)^2 (see planet::orbital_gravity_at), so the
  station's speed is exactly what a coasting rocket needs to match.

Run from tenebris-rs/:  python tools/station-math.py
Stdlib only, deterministic.
"""

import math

# Tenebris constants (crates/tenebris-core/src/planet.rs). The walker/
# space physics share SURFACE_GRAVITY_MPS2_PER_G = 25 m/s^2 at 1 g.
PLANET_RADIUS_M = 300.0
SURFACE_GRAVITY_MPS2 = 25.0
DAY_LENGTH_S = 1920.0  # assets/config/time.yaml

# Station design knobs (assets/config/station.yaml mirrors these).
RADIUS_HEXES = 10
LAYERS = 6
HEIGHT_M = 15.0
ALTITUDE_M = 120.0
HEX_SIZE_M = 2.0  # circumradius (centre -> corner)


# ---------------------------------------------------------------- hexes

def hexes_in_ring(k: int) -> int:
    """Hexes in ring k around the centre hex (k >= 1)."""
    return 6 * k


def hexes_per_deck(n: int) -> int:
    """Centered hexagonal number: full disk of radius n rings."""
    return 3 * n * (n + 1) + 1


def shell_prisms(n: int, layers: int) -> int:
    """Hollow drum: floor + ceiling disks, wall ring on middle layers."""
    return 2 * hexes_per_deck(n) + hexes_in_ring(n) * max(0, layers - 2)


def solid_prisms(n: int, layers: int) -> int:
    """Fully filled drum (for cost comparisons)."""
    return layers * hexes_per_deck(n)


def deck_radius_m(n: int, hex_size_m: float) -> float:
    """Physical radius: adjacent hex centres sit sqrt(3)*a apart."""
    return math.sqrt(3.0) * hex_size_m * n + hex_size_m


# ---------------------------------------------------------------- orbit

def gravity_at_radius(r_m: float) -> float:
    """Field strength a(r) = g_surf * (R/r)^2, m/s^2."""
    return SURFACE_GRAVITY_MPS2 * (PLANET_RADIUS_M / r_m) ** 2


def circular_orbit_speed(r_m: float) -> float:
    """v = sqrt(a(r) * r): centripetal balance in the inverse-square field."""
    return math.sqrt(gravity_at_radius(r_m) * r_m)


def orbital_period_s(r_m: float) -> float:
    """T = 2*pi*r / v = 2*pi*sqrt(r^3 / (g_surf * R^2))."""
    return 2.0 * math.pi * r_m / circular_orbit_speed(r_m)


def angular_rate_rad_s(r_m: float) -> float:
    return circular_orbit_speed(r_m) / r_m


def geostationary_radius_m() -> float:
    """Radius where the orbital period equals one Tenebris day."""
    omega = 2.0 * math.pi / DAY_LENGTH_S
    return (SURFACE_GRAVITY_MPS2 * PLANET_RADIUS_M**2 / omega**2) ** (1.0 / 3.0)


# ----------------------------------------------------------------- main

def main():
    n, ll = RADIUS_HEXES, LAYERS
    r = PLANET_RADIUS_M + ALTITUDE_M
    print("== station geometry ==")
    print(f"deck radius            {n} rings -> {hexes_per_deck(n)} hexes/deck")
    print(f"wall ring              {hexes_in_ring(n)} hexes/layer")
    print(f"layers                 {ll} ({HEIGHT_M/ll:.2f} m prisms for {HEIGHT_M} m)")
    print(f"hollow shell prisms    {shell_prisms(n, ll)}")
    print(f"solid drum prisms      {solid_prisms(n, ll)}")
    print(f"physical deck radius   {deck_radius_m(n, HEX_SIZE_M):.1f} m "
          f"({2*deck_radius_m(n, HEX_SIZE_M):.1f} m across)")
    print()
    print("== orbit ==")
    print(f"orbit radius           {r:.0f} m (surface {PLANET_RADIUS_M:.0f} + alt {ALTITUDE_M:.0f})")
    print(f"gravity at station     {gravity_at_radius(r):.2f} m/s^2")
    print(f"circular speed         {circular_orbit_speed(r):.2f} m/s  <- rocket must match")
    print(f"orbital period         {orbital_period_s(r):.1f} s")
    print(f"angular rate           {angular_rate_rad_s(r):.4f} rad/s")
    print(f"geostationary radius   {geostationary_radius_m():.0f} m "
          f"(alt {geostationary_radius_m()-PLANET_RADIUS_M:.0f} m) - for reference")
    print()
    print("== physics seam (lod.yaml) ==")
    for mult, label in ((1.4, "full-gravity anchor"), (1.8, "is-in-space flip")):
        rm = PLANET_RADIUS_M * mult
        print(f"{label:22} r = {rm:.0f} m (alt {rm-PLANET_RADIUS_M:.0f} m)")


if __name__ == "__main__":
    main()
