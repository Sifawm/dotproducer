# Dotproducer

A small music-making app where rhythmic patterns emerge from placing dots around a centre: the geometry is the score.

## Language

**Pattern**:
The complete set of Voices around the Core together with the Tempo; it is what gets preserved and shared. The same Pattern always sounds the same.
_Avoid_: Song, project, loop, beat

**Core**:
The single central dot that every Pulse travels towards; a sound is produced when a Pulse reaches it.
_Avoid_: Centre, central dot, hub

**Voice**:
A dot placed around the Core, associated with exactly one Sound.
_Avoid_: Dot, node, instrument, musical element

**Sound**:
One of the six available percussion timbres: Kick, Snare, Clap, Closed Hat, Open Hat and Tom. It has no pitch; each one is identified by its own colour.
_Avoid_: Instrument, sample, musical element

**Muted**:
The state of a Voice whose Pulse keeps travelling but produces no sound when it reaches the Core.
_Avoid_: Disabled, off, paused

**Dock**:
The inexhaustible row of dots, one per Sound, from which a Voice is dragged to create it and to which a Voice is returned to remove it.
_Avoid_: Palette, toolbar, menu

**Link**:
The visible connection between a Voice and the Core.
_Avoid_: Edge, wire, connection

**Pulse**:
The dot that travels along a Link from the Voice to the Core; on arrival it triggers the Voice's Sound and a new Pulse is born at the Voice.
_Avoid_: Travelling dot, particle, note

**Ripple**:
The circular wave the Core emits when a Pulse reaches it, carrying the colour and character of the Sound that played.
_Avoid_: Wave, explosion, flash

**Ring**:
Each of the concentric distances from the Core that a Voice snaps to; each Ring corresponds to a subdivision of the Tempo and doubles the Period of the previous Ring (from 1/16 of a bar for the nearest to 1 bar for the farthest).
_Avoid_: Orbit, grid, circle

**Period**:
The time a Pulse takes to travel its Link; it is determined by the Voice's distance from the Core. Farther means a longer Period and therefore fewer hits per bar.
_Avoid_: Speed, frequency

**Phase**:
The offset of a Voice within its own Period, expressed as a fraction of it; it is determined by the Voice's angle around the Core (12 o'clock = on the beat, 6 o'clock = off the beat).
_Avoid_: Offset, swing, delay

**Tempo**:
The global beat (BPM) against which the Rings define their subdivisions.

**Magnet**:
The global state that decides whether Voices snap to Rings and angular divisions when dropped; when off, every placement is a Free placement.
_Avoid_: Snap, grid, free mode

**Free placement**:
Placing a Voice at an arbitrary distance or angle, without snapping to Rings or angular divisions, with a Period or Phase not aligned to the Tempo.
_Avoid_: Free mode, unsnapped
