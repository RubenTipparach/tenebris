## Purpose

Oil, from the ground to the rocket: a pump jack that draws crude oil from a
pocket, and a refinery that turns it into kerosene and plastic.

## ADDED Requirements

### Requirement: A pump jack draws crude oil

A pump jack placed over an oil pocket SHALL fill its tank with crude oil
while it is powered, at a rate set in config, until the pocket runs dry.
The player SHALL be able to take crude oil out of it into empty buckets.
A pump jack placed where there is no oil below SHALL say so.

#### Scenario: Pumping

- **WHEN** a powered pump jack stands over an oil pocket for a minute
- **THEN** its tank holds crude oil, and filling a bucket from it gives a crude oil bucket

#### Scenario: No oil

- **WHEN** a pump jack is placed where no oil pocket is below
- **THEN** it shows "No oil here" and pumps nothing

### Requirement: A refinery makes kerosene and plastic

A powered refinery SHALL turn crude oil into kerosene and plastic. Kerosene
SHALL refuel a rocket for more fuel units than rocket fuel. Plastic SHALL
be an ingredient of new electronics and battery recipes.

#### Scenario: Refining

- **WHEN** a crude oil bucket is refined
- **THEN** the refinery gives kerosene and plastic, and the empty bucket back

#### Scenario: Kerosene in a rocket

- **WHEN** a rocket is refuelled with kerosene
- **THEN** each kerosene adds more fuel units than a rocket fuel would
