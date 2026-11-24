# Spec Delta

## Purpose

What villages ask for - food, building materials, art from other worlds -
how players deliver it, alone or together, and how a village's needs change
over time.

## ADDED Requirements

### Requirement: Open requests per village

Each village SHALL keep a configured number of open requests, each from one
of three families: supply (food toward the village food store), build
(materials toward a named structure) and collect (another world's art
piece). Each request names its items, the amount needed and the friendship
it gives. Requests SHALL be drawn deterministically from the village's
state, so all players see the same requests.

#### Scenario: A village shows its requests
- **WHEN** a player opens the elder's panel in a village with three open requests
- **THEN** all three requests are shown with their items, amounts still needed and friendship reward

### Requirement: Delivering

A player SHALL be able to deliver items toward an open request from their
hotbar and bag, up to the amount still needed. Items delivered SHALL leave
the player's inventory and count toward the request at once; a delivery is a
world edit and SHALL be saved the same frame.

#### Scenario: Partial delivery
- **WHEN** a request needs 12 cooked fish and the player delivers 5
- **THEN** the player has 5 fewer cooked fish and the request needs 7

#### Scenario: No over-delivery
- **WHEN** a request needs 3 bricks and the player offers 10
- **THEN** only 3 bricks are taken

### Requirement: Shared requests, personal credit

In multiplayer a village's requests SHALL be shared: any player can deliver
toward them and every player sees the same remaining amount. Each player
SHALL be credited friendship for what they themselves delivered. Two
players delivering toward the last of a request at once SHALL NOT both
spend items past what was needed; the one refused gets their items back.

#### Scenario: Two players fill one request
- **WHEN** A delivers 8 and B delivers 4 toward a 12-brick request
- **THEN** the request completes, and A and B are each credited for their own share

#### Scenario: Race for the last items
- **WHEN** A and B each deliver the last 3 bricks of a request at the same moment
- **THEN** one delivery is taken, and the other player keeps their 3 bricks

### Requirement: Completing a request

When a request's amount is met it SHALL complete: the village applies its
effect (food added to the store, the structure's progress advanced or
built, the art piece put on display), and the village opens a new request
in its place after a configured delay.

#### Scenario: Build request completes
- **WHEN** the last girders for the village hall are delivered
- **THEN** the hall's next stage appears in the village and a new request opens after the delay

### Requirement: Village food store is used up over time

Each village SHALL keep a food store that is used up at a configured rate
while its world is occupied (and by the catch-up when a player returns).
When the store runs low the village SHALL open a supply request if it has
none open.

#### Scenario: Hunger brings a request
- **WHEN** a village's food store falls below its low mark with no supply request open
- **THEN** a supply request for food opens

### Requirement: Art pieces come only from their world

Each inhabited world SHALL have its own art piece item, with its own icon,
that can be found only on that world (given by its villages or found at its
sites). Collect requests SHALL ask for another world's piece, never the
asking village's own.

#### Scenario: Art from elsewhere
- **WHEN** a village on Halcyon opens a collect request
- **THEN** it asks for a piece from a world other than Halcyon

#### Scenario: Art is only found at home
- **WHEN** a player searches Vesper
- **THEN** no world's art piece but Vesper's can be obtained there

### Requirement: Built structures show in the world

A structure a village completes SHALL appear in that village for every
player, persist with the world, and be rebuilt on load like any placed
object.

#### Scenario: The hall stays
- **WHEN** a village hall was completed and the server restarts
- **THEN** the hall is still standing in the village
