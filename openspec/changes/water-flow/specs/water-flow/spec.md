## ADDED Requirements

### Requirement: Water flows by the Luanti rule on the hex columns

Water SHALL move by one rule, `src/water/Liquid.ts`: Luanti's liquid
transform as Pale Blue Dot ported it to hex. A cell is air, solid, flowing
(level 0..7 and a falling flag) or a source. Each tick SHALL process the
cells queued by edits and by the previous tick, upper before same level
before lower, at most once each. No other code SHALL move water.

#### Scenario: A source spreads and stops

- **WHEN** a source is placed on flat ground and the water settles
- **THEN** the cells k steps away hold level 8 - k for k = 1..8 and the cells beyond are dry

#### Scenario: Water falls off a ledge

- **WHEN** a source sits on a terrace beside a drop
- **THEN** the cells down the drop hold falling water and the water spreads over the ground below

#### Scenario: Scooping the source drains the flow

- **WHEN** the only source of a flow is removed
- **THEN** every flowing cell it fed dries within the following ticks

#### Scenario: Three sources renew

- **WHEN** an air cell has three source neighbours (sides and above)
- **THEN** it becomes a source; with two it holds level 7 flowing water

### Requirement: Flowing water is derived; only edits persist and sync

Sources SHALL be `WATER` blocks. Flowing water SHALL be held by the liquid
beside the blocks and SHALL NOT be saved or sent to other players. Every
edit that changes a cell (placing or scooping a source, digging or placing a
block) SHALL persist and sync the same frame through the existing paths and
SHALL queue the cell and its eight neighbours. Loading terrain SHALL queue
the cells its saved edits changed. The same edits SHALL give the same water.

#### Scenario: Same edits, same water

- **WHEN** two clients apply the same edits in the same order and tick to rest
- **THEN** both hold identical blocks and flowing levels

#### Scenario: Digging beside the sea

- **WHEN** a block beside the sea is dug out
- **THEN** only AIR is saved, and the cell refills as sea on the next ticks

### Requirement: The ocean stays at rest

Cells no edit has queued SHALL never be processed, so an untouched sea costs
nothing per tick.

#### Scenario: An untouched sea

- **WHEN** a tick runs with no edit near the sea
- **THEN** no sea cell is processed

### Requirement: Flowing water has a sloped shape

All water SHALL be meshed by `src/water/LiquidMesh.ts`. A flowing cell's top
SHALL be sloped, each corner at the level of the cells sharing it (full by a
source or water above, at the floor where two or more are air, else the mean
of the flowing levels). Sides SHALL be drawn only over air. A cell with water
on it SHALL have no top and full-height sides. Sources SHALL stay flat at the
existing sheet height. The water material's look SHALL NOT change.

#### Scenario: A slope down from a source

- **WHEN** a flowing cell lies between a source and dry ground
- **THEN** its top corners differ in height, highest toward the source

#### Scenario: Surrounded by water

- **WHEN** every neighbour of a flowing cell holds water
- **THEN** the cell is drawn with a top and no sides

### Requirement: Water remeshes alone, as it stands

The water mesh SHALL show the water as the current tick left it (no
between-tick smoothing; owner: "animation not necessary if you are
submitting drawcalls/recalculate every frame"). A tick that changes water
SHALL rebuild only the water mesh of each chunk it touched; the chunk's
terrain meshes SHALL be left alone (the terrain mesher sees water as open,
so water never changes them). Block edits still rebuild the whole chunk.

#### Scenario: Water flows near the player

- **WHEN** a tick changes cells in a chunk with its own meshes
- **THEN** that chunk's water mesh is rebuilt the same frame and its terrain meshes are untouched

#### Scenario: A fall meets lower water

- **WHEN** a cell with water on it borders water that is not full
- **THEN** its side is drawn from that water's sheet up to its top, so no slit shows between the fall and the pool

### Requirement: Under water means below the drawn surface

The camera and the swimmer SHALL count as under water only below the drawn
surface of the cell they are in: the sheet of a source, the top of a cell
with water on it, the sloped top of a flowing cell under them. While under
water the view SHALL fade into the underwater fog colour: nothing past the
fog's far distance is drawn and the background is the fog colour.

#### Scenario: Just above the sea

- **WHEN** the camera is 5 cm above the drawn sea surface
- **THEN** it is not under water

#### Scenario: Inside a shallow sheet

- **WHEN** the camera is inside a flowing cell, below its sloped surface
- **THEN** it is under water, and above that surface it is not

### Requirement: Water is tinted by its thickness along the view

Looking through water, the depth tint SHALL follow the distance the view ray
travels in water (to the terrain behind it or the water's own far side),
measured per fragment, the same at every camera height.

#### Scenario: Close over the sea

- **WHEN** the camera is 0.3 m and then 3 m above a sea 5 m deep, looking down
- **THEN** the bed shows through with the same tint in both

#### Scenario: A sheet on a slope against the sky

- **WHEN** a flowing cell is seen side-on with only sky behind it
- **THEN** it is tinted by its own width, not drawn opaque

### Requirement: Water carries Pale Blue Dot's flow texture

Over its own shading, colours, depth tint and fog, water SHALL draw
Tenebris's water tile as Pale Blue Dot's water mockup does: on a top the
tile pans along that cell's flow (the downhill slope of its corner heights)
and stands still where the top is flat; on a flowing cell's side it stands
vertical and pans down with froth; on a source's side it stands still. The
tile SHALL fade out with distance and at grazing angles, and SHALL not change
the view from under water.

#### Scenario: A top on a slope

- **WHEN** flowing water runs down a slope from a source
- **THEN** each sloped top's tile pans downhill, and the source's top and the sea stand still

#### Scenario: A fall

- **WHEN** water falls off a ledge
- **THEN** its sides show standing streaks panning down, frothed water blue

#### Scenario: The sea from afar

- **WHEN** the sea is seen from high up or at a grazing angle
- **THEN** the tile has faded to the water's plain colour, with no sparkle

