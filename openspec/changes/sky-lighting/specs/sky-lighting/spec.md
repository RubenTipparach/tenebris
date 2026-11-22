## ADDED Requirements

### Requirement: The ground is lit by the sky it shows

Every lit surface on a planet SHALL take its fill light from that planet's
sky: the displayed sky averaged over the upper hemisphere, for the sun's
height at that spot. Its direct light SHALL be the sun's light through the
same atmosphere. Both SHALL equal the old intensities at noon.

#### Scenario: Dusk
- **WHEN** the sun is just below the horizon and the sky still glows
- **THEN** the ground, trees, grass and animals are lit blue by that sky, not black

#### Scenario: Night
- **WHEN** it is deep night on Earth
- **THEN** the sky over the player is dark and the ground is lit only by the starlight floor

#### Scenario: Sunset
- **WHEN** the sun is low
- **THEN** its light on the ground is warmer and dimmer than at noon

### Requirement: The sky darkens when the sun has set behind the ground

The sky shader SHALL shade the air from the sun with the planet's ground
(sea level), so the air over the night side is dark.

#### Scenario: Midnight
- **WHEN** the player looks straight up at midnight
- **THEN** the sky is dark, not glowing

### Requirement: Airless worlds have no sky light

A body with no atmosphere SHALL light its surfaces with a clear sun and a
small ground-bounce fill by day, and starlight by night.

#### Scenario: The Moon's shade
- **WHEN** the player stands in shade on the Moon by day
- **THEN** it is darker than shade on Earth at the same sun height
