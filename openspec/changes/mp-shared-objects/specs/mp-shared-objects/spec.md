## ADDED Requirements

### Requirement: Any player can use any placed object

In a server world, any player SHALL be able to open, use and break any placed
object (machines, chests, cooking stations, launch pads, every tech block),
whoever placed it, with the same panels and controls as their own. Their
changes SHALL save through the one save path and reach every other player.

#### Scenario: B takes from A's chest

- **WHEN** A places a chest and puts 16 iron in it, and B opens it and takes 6
- **THEN** B has 6 iron, and A's view of the chest shows 10 iron

### Requirement: Record writes are compare-and-set on a version

The server SHALL give every placed-object record a version and SHALL accept a
client's write of it only when the write names the record's current version
(0 when there is none), answering the writer with an acknowledgement and the
new version; otherwise it SHALL refuse the write and send the writer the
current record and version. A client SHALL keep at most one write per record
in flight and send later changes after the answer, on the acknowledged
version.

#### Scenario: Two players take the same stack at once

- **WHEN** two players each take all 10 iron from one chest on the same version
- **THEN** exactly one write is accepted, and the 10 iron end up with exactly one of them

#### Scenario: A stale write

- **WHEN** a client writes a chest on a version that another player's write has since replaced
- **THEN** the server refuses it and sends the current chest back

### Requirement: A refused change is undone exactly

When a write is refused, the client SHALL rebuild the object from the server's
record and SHALL undo the inventory trade of the refused change(s) - taking
back what the player gained and giving back what they put in, across the
hotbar and the bag - and tell the player. A write not made by a player action
(a machine's own tick) SHALL change no inventory when refused.

#### Scenario: Losing a race for a chest slot

- **WHEN** a player's take from a chest is refused because another player took it first
- **THEN** the items leave that player's inventory again and the chest shows the server's contents

### Requirement: Another player's record updates an open panel in place

A record for an object already in the world that changes only its state
(contents, fuel, progress, jobs) SHALL be applied to that object in place, and
an open panel showing it SHALL redraw without closing and without changing
the viewer's held stack. A record that changes the object's structure SHALL
rebuild it, and a panel showing the removed object SHALL close.

#### Scenario: Watching a chest

- **WHEN** A has a chest open and B takes items from it
- **THEN** A's open panel shows the new contents without closing

### Requirement: One client simulates each planet's machines

Online, only the planet's host (the lowest player id on that planet, the same
client that simulates its animals) SHALL advance furnaces, electric furnaces,
cooking stations, 3D printers and industry machines on that planet, and
publish the results; other clients SHALL apply the records. Offline, the
client SHALL simulate everything as before.

#### Scenario: Two players at a furnace

- **WHEN** two players stand at a furnace smelting ore on the same planet
- **THEN** each ore is smelted once, by the host, and both see the ingots

### Requirement: Players can chat in a server world

In a server world, Enter or T SHALL open a chat box (never E or F); Enter SHALL
send, Esc SHALL cancel, and game keys SHALL NOT fire while typing. The log
SHALL fade lines a few seconds after they arrive and show its scrollback while
the box is open. Join, leave and operator notices SHALL appear in the same log
as system lines. Single player SHALL have no chat.

#### Scenario: Saying hello

- **WHEN** A types "hello" and presses Enter
- **THEN** B's log shows "[hh:mm] A: hello"

#### Scenario: Single player

- **WHEN** the game runs offline
- **THEN** Enter and T open no chat box

### Requirement: The server relays chat safely

The server SHALL relay a chat line to everyone in the same world stamped with
the sender's name and time, strip control and non-ASCII characters, cap its
length, rate-limit each client, and send a joiner the world's last few lines.

#### Scenario: Joining late

- **WHEN** C joins after A and B have chatted
- **THEN** C's log shows the world's last lines

#### Scenario: Spamming

- **WHEN** a client sends more lines than the rate limit allows
- **THEN** the extra lines are dropped
