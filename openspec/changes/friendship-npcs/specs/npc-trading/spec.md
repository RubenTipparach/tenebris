# Spec Delta

## Purpose

Travelling traders: where they are, what they offer, how a barter works,
and how trades stay honest in multiplayer.

## ADDED Requirements

### Requirement: Traders travel between inhabited worlds

Traders SHALL move along a route of inhabited worlds, staying on each for a
configured time before moving on. A trader moves on only while time is
advancing for the world it is on (someone is there, or the catch-up on
arrival). The trader's current world SHALL be shown on the system map once
the player has met that trader.

#### Scenario: Trader moves on
- **WHEN** a trader has stayed on Sequoia for its full stay while players were there
- **THEN** it leaves Sequoia for the next world on its route

#### Scenario: Map shows a met trader
- **WHEN** the player has met the trader Vell and opens the system map
- **THEN** the map marks the world Vell is on now

### Requirement: Barter offers

A trader SHALL offer a small set of barters, each giving items for items
(there is no currency), shown as icon slots: what the player gives and what
they get. Offers SHALL include goods from worlds on the trader's route
(including body-only resources and other worlds' foods), so a trader can
bring a player things from worlds they have not reached.

#### Scenario: Goods from elsewhere
- **WHEN** a trader who came from Halcyon is met on Sequoia
- **THEN** at least one of its offers gives an item from Halcyon

### Requirement: A barter is all or nothing

A barter SHALL go through only if the player holds everything it asks for
(hotbar and bag together); it takes those items and gives the offered ones,
which go to the hotbar first, then the bag, and overflow into a sack at the
player's feet. A barter the player cannot pay SHALL be shown as unavailable.

#### Scenario: Paying from hotbar and bag
- **WHEN** an offer asks 6 resin and the player holds 4 on the hotbar and 2 in the bag
- **THEN** the trade goes through, taking all 6

#### Scenario: Not enough
- **WHEN** the player holds 5 of the 6 resin asked
- **THEN** the offer is shown unavailable and nothing is taken

### Requirement: Limited stock, shared in multiplayer

Each offer SHALL have a stock that trades use up and that renews over the
trader's stay. In multiplayer the stock is shared; two players taking the
last unit at once SHALL NOT both get it - the refused trade is undone and
the player keeps what they gave.

#### Scenario: Last unit race
- **WHEN** A and B take the last unit of an offer at the same moment
- **THEN** one trade goes through, and the other player's items are returned

### Requirement: Friendship improves offers

A player's friendship level with the village a trader is visiting SHALL
improve that trader's offers for that player (better rates, and extra
offers at higher levels), as configured per level.

#### Scenario: Better rate for a friend
- **WHEN** a player at the village's second friendship level views an offer
- **THEN** it asks for fewer items than it does of a player at the first level
