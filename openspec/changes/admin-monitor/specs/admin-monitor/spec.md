## ADDED Requirements

### Requirement: Clients report their items and missions to the server

A client online in a server world SHALL send a status frame through NetSync
holding its hotbar, bag and toolbox (item id, count, wear), its suit, whether
it rides a rocket, and its mission progress (done mission ids, the current
mission and its objective counts). It SHALL send it on joining and whenever
it changes. The server SHALL keep the latest frame per connected player in
memory and SHALL NOT relay it.

#### Scenario: Picking up logs

- **WHEN** an online player picks up four logs
- **THEN** within the check interval the server's copy of their items shows four logs

#### Scenario: Another player never sees it

- **WHEN** a player sends a status frame
- **THEN** no other client receives it

### Requirement: Clients upload maps of the planets they stand on

A client on a planet SHALL render that planet's map with the game's map
renderer, scaled to the configured size, and upload it when the server has
none, or one older than the configured age, or after the configured number
of edits. The server SHALL accept it only from a connected player of that
world with the connection's key, store it per world and planet on its data
volume, and drop a world's maps when the world is reset or deleted.

#### Scenario: First visit

- **WHEN** the first player of a world lands on Vesper
- **THEN** the server soon holds a map of Vesper for that world

#### Scenario: A stranger posts a map

- **WHEN** an upload arrives without a connected player's key
- **THEN** the server refuses it

### Requirement: The admin portal lists players with their items and missions

The portal SHALL show every online player per world with their name, look
colours, planet, latitude / longitude / altitude or "in rocket" / "in
space", online-for and last-seen; their items as an icon grid (the name when
an icon is missing); missions done of total and the current mission's
objective bars.

#### Scenario: A player with a pickaxe

- **WHEN** an online player holds a rock pickaxe
- **THEN** their row shows the rock pickaxe icon with its wear

### Requirement: The admin portal maps the system and the planets

The portal SHALL show a static top-down diagram of every body with player
counts over the bodies they are on, where a click opens that body's map, and
each planet's map with player markers at their latitude / longitude, or
"no map yet - nobody has been there".

#### Scenario: Clicking Vesper in the diagram

- **WHEN** the operator clicks Vesper in the solar system diagram
- **THEN** the planet map tab opens on Vesper with its players marked

### Requirement: The portal's game data comes from the game's config

Item names and icons, mission titles and objectives, and the body layout
SHALL come from one file generated from the game's config at build time, and
a test SHALL fail when the shipped file differs from the config.

#### Scenario: A new item

- **WHEN** an item is added to ITEM_DATA and the data file is not regenerated
- **THEN** the drift test fails
