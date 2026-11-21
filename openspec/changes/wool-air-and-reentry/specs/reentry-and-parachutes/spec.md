## ADDED Requirements

### Requirement: Re-entry heats a returning rocket

A rocket that has left every atmosphere since launch and then enters one
SHALL heat up while it moves faster than a safe speed there, and cool
otherwise. Past a damage level heat SHALL wear its health, and at the
maximum it SHALL burn up. The HUD SHALL show its heat, and the rocket SHALL
glow with it.

#### Scenario: A fast return
- **WHEN** a rocket comes back from space into Earth's atmosphere well above the safe speed
- **THEN** its HEAT gauge rises and it glows, and it burns up if it does not slow down

#### Scenario: Leaving only
- **WHEN** a rocket launches from Earth and climbs out
- **THEN** it gains no re-entry heat

### Requirement: A parachute lands a rocket safely

A rocket with a parachute part SHALL be able to open it inside an
atmosphere, by key or by itself below a set height while falling. Open, it
SHALL slow the rocket to a landing speed under the damage threshold. It
SHALL NOT open in vacuum, and SHALL tear if opened too fast. It SHALL be
packed again on the next launch from a pad.

#### Scenario: A chute landing
- **WHEN** a falling rocket with a parachute drops below the deploy height in Earth's atmosphere
- **THEN** the canopy opens, the rocket slows and lands without damage

#### Scenario: Vacuum
- **WHEN** the player presses the parachute key above the Moon
- **THEN** nothing opens and the HUD says there is no air
