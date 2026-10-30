# Dotproducer v1

Labels: `ready-for-agent`

This spec uses the vocabulary defined in `CONTEXT.md` (Pattern, Core, Voice, Sound, Muted, Dock, Link, Pulse, Ripple, Ring, Period, Phase, Tempo, Magnet, Free placement) and respects ADR 0001 (Pixi for the scene, HTML for the controls).

## Problem Statement

Making an electronic drum pattern normally means learning a step sequencer: a grid of tiny cells, a transport bar, tracks, menus. That is a lot of interface between a person and a beat, it is hostile on a phone, and it shows rhythm as a spreadsheet rather than as something you can see moving.

A person who just wants to play with rhythm — on a phone or a laptop, with no account, no install and no tutorial — has no tool where the picture *is* the music and where rearranging the picture is the whole act of composing.

## Solution

Dotproducer is a minimalist, motion-driven web app where a rhythm is built by placing dots around a centre.

There is a single Core in the middle of the canvas. The user drags a dot out of the Dock — one dot per Sound (Kick, Snare, Clap, Closed Hat, Open Hat, Tom) — and drops it somewhere around the Core. It becomes a Voice, joined to the Core by a visible Link. A Pulse leaves the Voice and travels along the Link; when it reaches the Core the Sound plays, the Core emits a Ripple, and a new Pulse is born at the Voice.

The geometry is the score:

- **Distance sets the Period.** Five evenly spaced Rings surround the Core, from 1/16 of a bar (nearest) to 1 bar (farthest), each doubling the Period of the previous one. Farther means fewer hits per bar.
- **Angle sets the Phase.** 12 o'clock is on the beat, 6 o'clock is off the beat, with eight angular divisions.
- **The Magnet** snaps drops to Rings and angular divisions so everything locks to the Tempo; turning it off allows Free placement for polyrhythms and drifting patterns.

The music starts with the first Voice dropped. Tapping the Core pauses and resumes; tapping a Voice toggles Muted; dragging a Voice back to the Dock removes it. A single draggable number sets the Tempo. The whole Pattern lives in the URL, so reloading keeps it and copying the link shares it. The app works with a mouse, a finger or a keyboard, and its interface is in English.

## User Stories

### First visit

1. As a first-time visitor, I want to see the Core, the Rings and the Dock on an otherwise empty canvas, so that I understand the whole app at a glance.
2. As a first-time visitor, I want a single short hint line telling me to drag a dot, so that I know the first gesture without a tutorial.
3. As a first-time visitor, I want the hint to fade away on my first drag and never return, so that the canvas stays clean once I know what to do.
4. As a first-time visitor, I want to tap a dot in the Dock and hear its Sound, so that I can learn which dot is which before placing anything.
5. As a first-time visitor, I want each Sound to have its own colour and its own shape or size, so that I can tell them apart even if I cannot distinguish the colours.
6. As a first-time visitor, I want the app to be ready to make sound on my first gesture with no loading screen, so that nothing stands between me and the first hit.

### Creating and removing Voices

7. As a player, I want to drag a dot from the Dock onto the canvas, so that I create a Voice with that Sound.
8. As a player, I want the Dock to be inexhaustible, so that I can place as many Voices of the same Sound as I like.
9. As a player, I want a Link to appear between my new Voice and the Core as soon as I drop it, so that I can see it is connected.
10. As a player, I want a Pulse to start travelling from the Voice to the Core as soon as I drop it, so that I can see when its next hit will happen.
11. As a player, I want the Sound to play exactly when the Pulse reaches the Core, so that what I see and what I hear are the same event.
12. As a player, I want a new Pulse to be born at the Voice every time the previous one arrives, so that the Voice keeps looping without any action from me.
13. As a player, I want to drag a Voice back onto the Dock, so that I can remove it.
14. As a player, I want no upper limit on the number of Voices in a Pattern, so that I can build dense patterns.

### Period and Rings

15. As a player, I want a Voice placed farther from the Core to hit less often, so that distance reads as slowness.
16. As a player, I want five Rings corresponding to 1/16, 1/8, 1/4, 1/2 and 1 bar, so that I get the subdivisions electronic music is built from.
17. As a player, I want the Rings evenly spaced on screen, so that all of them are comfortably reachable on a phone.
18. As a player, I want the Pulse of a far Voice to travel visibly slower than the Pulse of a near one, so that the picture conveys each Voice's pace.
19. As a player, I want a Voice dropped closer to the Core than the first Ring to settle on the first Ring's distance, so that I never create an unplayably fast Voice.
20. As a player, I want a Voice dropped beyond the last Ring to settle on the last Ring's distance, so that every Voice stays inside the visible canvas.

### Phase and angle

21. As a player, I want the angle of a Voice around the Core to set its Phase, so that I can offset Voices against each other.
22. As a player, I want 12 o'clock to mean on the beat and 6 o'clock to mean off the beat on every Ring, so that the same angle always means the same musical thing.
23. As a player, I want eight angular divisions, so that I can place off-beats and their halves with a finger.
24. As a player, I want to place a Kick at 12 o'clock and a Snare at 6 o'clock on the same Ring and hear them alternate, so that I can build a basic backbeat.

### Magnet and Free placement

25. As a player, I want Voices to snap to the nearest Ring and angular division when I drop them, so that everything locks to the Tempo by default.
26. As a player, I want a single Magnet control that turns snapping on and off, so that I can choose Free placement on a phone as well as on a desktop.
27. As a desktop player, I want to hold Alt while dragging to temporarily invert the Magnet, so that I can place one Voice freely without toggling the control.
28. As a player, I want the Rings to look dimmer when the Magnet is off, so that I can see which mode I am in.
29. As a player, I want a Voice in Free placement between two Rings to get a Period smoothly in between theirs, so that I can create polyrhythms and triplet feels.
30. As a player, I want a Voice in Free placement to keep its exact distance and angle when I toggle the Magnet back on, so that changing mode never moves what I already placed.

### Moving Voices

31. As a player, I want to drag an existing Voice to a new position while the music plays, so that I can reshape the Pattern live.
32. As a player, I want a Voice to keep sounding from where it was and lose its Pulse while I am holding it, so that moving it leaves no gap and I do not hear erratic hits as its distance changes.
33. As a player, I want the Link to follow the Voice faintly while I drag it, so that I keep seeing its connection to the Core.
34. As a player, I want the Ring and angular division where the Voice would land to be highlighted while I drag, so that I know the result before I let go.
35. As a player, I want a dropped Voice's Pulse to appear already at the position that matches the global time, so that the Voice enters in time rather than restarting from zero.
36. As a player, I want the rest of the Pattern to keep playing undisturbed while I drag one Voice, so that the groove never stops.

### Coinciding Voices

37. As a player, I want Voices of different Sounds that share the same position to fan out slightly on screen, so that I can see and grab each one.
38. As a player, I want fanned-out Voices to still hit at exactly the same time, so that the fan is only visual.
39. As a player, I want a Voice dropped onto another Voice of the same Sound at the same position to merge into one, so that I do not get an accidental doubled hit.

### Muting

40. As a player, I want to tap a Voice without dragging to toggle Muted, so that I can pull an element out of the mix without losing its position.
41. As a player, I want a Muted Voice's Link to dim and its Pulse to keep travelling as a ghost, so that I can see it is still in time.
42. As a player, I want a Muted Voice to come back exactly in time when I unmute it, so that I can build and break down a pattern live.

### Transport and Tempo

43. As a player, I want the music to start by itself when I drop the first Voice, so that there is no play button to find.
44. As a player, I want to tap the Core to pause everything, so that I can stop the sound instantly.
45. As a player, I want every Pulse to freeze in place when paused, so that I can see where the Pattern stopped.
46. As a player, I want tapping the Core again to resume from where it stopped, so that Pulses do not jump.
47. As a player, I want a single discreet Tempo number that I drag up or down, so that I can set the speed with a mouse or a finger.
48. As a player, I want the Tempo to range from 60 to 180 BPM and start at 120, so that I can cover slow and fast styles.
49. As a player, I want all Pulses to speed up or slow down smoothly when I change the Tempo, so that nothing jumps or glitches.

### Motion and feedback

50. As a player, I want the Core to beat and emit a Ripple every time a Pulse arrives, so that I can see the rhythm as well as hear it.
51. As a player, I want each Ripple to carry the colour and character of its Sound (broad and slow for a Kick, thin and fast for a Closed Hat), so that I can tell what just played.
52. As a player, I want the Voice to give a tiny visual cue when a new Pulse is born, so that I can follow the loop.
53. As a player, I want the Rings and Links to stay still while the music plays, so that the canvas stays calm even with fast patterns.
54. As a player, I want hits to stay rhythmically tight even when the animation drops frames, so that the music never stumbles because of the graphics.
55. As a player who has "reduce motion" enabled, I want Ripples replaced by a brief colour change on the Core, so that I can use the app without expanding animations.
56. As a player, I want a dropped Voice to settle into place with a short, natural motion, so that the Magnet feels physical.

### Persistence and sharing

57. As a player, I want my Pattern to still be there after I reload the page, so that an accidental refresh does not destroy my work.
58. As a player, I want to copy the address bar and send it to someone, so that I can share a Pattern with no account and no save button.
59. As a player, I want the browser's back button to undo my last change, so that I can recover from a mistake.
60. As a player, I want one back step to undo one complete move rather than every frame of a drag, so that undo is predictable.
61. As a recipient of a shared link, I want to see the Pattern drawn as soon as the page opens, so that I know what I am about to hear.
62. As a recipient of a shared link, I want to tap the Core to start it playing, so that I can hear it despite the browser blocking audio until I interact.
63. As a recipient of a shared link, I want the Pattern to sound identical to what the sender heard, so that sharing is faithful.
64. As a recipient of a damaged or tampered link, I want the app to open with whatever valid part of the Pattern it can read, or an empty canvas, so that a bad link never breaks the app.
65. As a recipient of a shared link, I want Muted Voices and the Tempo to be preserved, so that I get the full state of the Pattern.

### Mobile

66. As a phone user, I want every gesture (drag, tap) to work with a finger, so that the app is a first-class experience on mobile.
67. As a phone user, I want the whole Pattern visible without zooming or scrolling, so that I can read it at a glance.
68. As a phone user, I want Voices and Dock dots to have a touch target larger than their visible size, so that I can grab them reliably.
69. As a phone user, I want dragging a Voice not to scroll the page or open a context menu, so that gestures are not hijacked by the browser.
70. As a user rotating or resizing my screen, I want the Pattern to rescale to the new size and sound the same, so that layout never changes the music.

### Keyboard and assistive technology

71. As a keyboard user, I want to Tab through the Dock, the Voices, the Core, the Tempo and the Magnet, so that I can reach everything without a pointer.
72. As a keyboard user, I want to press Enter on a Dock dot to create a Voice at a default position, so that I can add Voices.
73. As a keyboard user, I want the up and down arrows to move the focused Voice between Rings, so that I can change its Period.
74. As a keyboard user, I want the left and right arrows to move the focused Voice between angular divisions, so that I can change its Phase.
75. As a keyboard user, I want Enter to toggle Muted on the focused Voice, so that I can mute without a pointer.
76. As a keyboard user, I want Delete to remove the focused Voice, so that I can delete without dragging.
77. As a keyboard user, I want Space or Enter on the Core to pause and resume, so that I control the transport.
78. As a keyboard user, I want to change the Tempo with the arrow keys when it is focused, so that I do not need to drag.
79. As a keyboard user, I want a visible focus indicator on the canvas for the focused Voice, so that I can see what I am acting on.
80. As a screen reader user, I want each Voice announced with its Sound, its Ring and its Phase (for example "Kick, Ring 3, off the beat"), so that I can understand the Pattern without seeing it.
81. As a screen reader user, I want changes I make (move, mute, remove) to be announced, so that I get confirmation of each action.

## Implementation Decisions

### Workspace and modules

- The repository is an Nx workspace using pnpm, with a single React + TypeScript application built with Vite, and four libraries with dependency boundaries enforced by Nx: **model**, **audio**, **scene** and **ui**.
- Dependencies point inwards towards **model**. **model** depends on nothing else in the workspace and on no rendering, audio or UI framework. **audio**, **scene** and **ui** depend on **model** and not on each other. The application is the composition root: it is the only place that knows the concrete audio engine and scene and wires them together.
- All code, identifiers, comments, tests, commit messages, UI strings and repository documentation are in English.
- The code follows SOLID. In particular: each library has one reason to change; the audio engine and the scene are consumed through small interfaces (dependency inversion) so that either can be replaced or faked; interfaces are segregated by consumer rather than merged into one wide surface.
- TypeScript runs in strict mode with no use of `any`. Glossary concepts are distinct types (Pattern, Voice, Sound, Ring, Period, Phase, Tempo), and quantities that are easy to confuse — distance versus angle, a time in beats versus a time in seconds — are distinguished at the type level so they cannot be passed in each other's place.

### model

- **model** is a deep module of pure functions and immutable values. It owns:
  - The Pattern: a Tempo plus a collection of Voices. A Voice has an identity, a Sound, a distance from the Core, an angle, and a Muted flag. Distance is expressed in Ring units (1 to 5, fractional when in Free placement), never in pixels, so a Pattern is independent of screen size.
  - Pattern operations: add a Voice, move a Voice, remove a Voice, toggle Muted, set the Tempo. Each returns a new Pattern.
  - Placement rules: with the Magnet on, a drop snaps to the nearest Ring and the nearest of eight angular divisions; with it off, distance and angle are kept as given. In both cases distance is clamped to the range between the first and last Ring. Adding or moving a Voice onto a Voice of the same Sound at the same position merges them into one.
  - Geometry: converting a point in a canvas of a given size into a distance and angle around the Core, and back.
  - Timing: the Period of a Voice as a function of its distance and the Tempo. On Ring *n* the Period is 1/16 of a bar doubled *n − 1* times; between Rings it is interpolated exponentially. The Phase of a Voice as a fraction of its own Period, derived from its angle, with 12 o'clock as zero.
  - Playback as a pure function of time: given a Pattern and a position on the musical timeline, where each Pulse is along its Link; and given a window of the musical timeline, which hits (Voice, Sound, instant) fall inside it. Muted Voices still have Pulses but yield no hits.
  - Fan-out: given a Pattern, the on-screen display angle of each Voice so that Voices sharing a position are separated, without changing their Phase.
  - The URL codec: encoding a Pattern into a compact string and decoding it back. Decoding is total: it never throws, drops Voices it cannot interpret, clamps out-of-range values, and yields an empty Pattern for unreadable input. The encoding carries a version marker so the format can evolve.
- The musical timeline is measured in beats, not seconds, so that pausing and Tempo changes do not make Pulses jump: the timeline position advances at a rate set by the Tempo and stops while paused.
- The six Sounds are a closed set known to **model**. Their timbre lives in **audio** and their look in **scene**.

### audio

- **audio** exposes a small interface with roughly these capabilities: unlock audio in response to a user gesture; play a given Sound at a given instant; play a Sound immediately (for auditioning from the Dock); report the current audio time; start, pause and resume the transport; set the Tempo.
- The concrete implementation uses Tone.js. Kick, Snare and Tom are Tone synths; Clap, Closed Hat and Open Hat are samples. Samples must be CC0-licensed and are preloaded while the user is looking at the empty canvas, so no loading state is shown.
- Hits are scheduled ahead of time against the audio clock, never triggered from the animation frame, so rhythm stays tight when frames drop.
- The six Sounds are balanced with a fixed mix; there is no per-Voice volume.
- A Voice that is being dragged stays scheduled at the position it was picked up from; it takes its new position on drop.

### scene

- **scene** exposes a small interface with roughly these capabilities: mount into and unmount from a host element; receive the current Pattern, Magnet state and focused Voice; advance to a given timeline position; emit user intents (a Dock dot was auditioned, a Voice was dropped at a canvas point, a Voice was tapped, a Voice was dropped on the Dock, the Core was tapped).
- The concrete implementation uses Pixi, driven imperatively, without a React binding for Pixi (ADR 0001). It draws the Core, Rings, Links, Voices, Pulses, Ripples and the Dock in a single canvas.
- The scene holds no musical state of its own: Pulse positions come from **model** given the timeline position read from the audio clock each frame. Ripples are triggered by the same hits that are scheduled for audio, so sight and sound share one source of truth.
- The scene emits intents and never mutates the Pattern; the application applies the intent through **model** and passes the new Pattern back.
- The scene rescales to its host element's size; Ring spacing is derived from the smaller dimension so the whole Pattern is always visible.
- Touch targets are larger than the visible dots. Dragging suppresses page scroll and context menus.
- When the system requests reduced motion, Ripples are replaced by a brief colour change on the Core.
- Colours, sizes, durations and easing curves come from a single set of design tokens shared with the HTML controls, so the canvas and the CSS cannot diverge.

### ui

- **ui** contains the React pieces that are HTML rather than canvas: the Tempo control, the Magnet control, the first-visit hint, and the keyboard mirror.
- The keyboard mirror is a visually hidden but focusable layer with one control per Dock dot, per Voice and for the Core, kept in sync with the Pattern. It carries the accessible names and live announcements, and translates key presses into the same intents the scene emits. Keyboard movement operates on the Magnet grid only (five Rings by eight angular divisions); Free placement by keyboard is not supported.
- The Tempo control is a draggable number (pointer) and a spin button (keyboard), 60 to 180 BPM.
- The Magnet control is a toggle. On desktop, holding Alt during a drag inverts it for that drag.

### Application

- The application owns the Pattern and the Magnet state in React, applies intents through **model**, and passes the result to the scene, the audio engine and the keyboard mirror.
- The Pattern is written to the URL fragment whenever a change is committed (a drop, a mute toggle, a removal, a Tempo change on release), as a new history entry, so the back button undoes one committed change. Navigating history restores the Pattern from the URL.
- On load, the Pattern is decoded from the URL. If it contains Voices, the app shows them silently and the first tap on the Core unlocks audio and starts playback. If it is empty, the first drop unlocks audio and starts playback.
- The first-visit hint is shown only when the Pattern is empty and disappears on the first drag.
- The interface is in English only; there is no translation infrastructure.

### Audio export

- An **Export** control sits next to Magnet and Clear. Like Clear, it is always shown and is disabled (native `disabled`, reduced opacity, out of the tab order) while the Pattern has no Voices.
- It opens a native modal `<dialog>`, restyled with the shared tokens including its `::backdrop`, with a labelled format choice (WAV, selected by default and not remembered between openings, or MP3), Cancel and Download. Escape and Cancel close it without rendering, and focus returns to Export.
- Rendering is done in the browser, offline and faster than real time, on an `OfflineAudioContext` at 48 kHz stereo, with no backend. Real-time recording was rejected as slow, glitch-prone and WebM-only.
- An export is always 4 bars at the current Tempo. One pre-roll bar is rendered first and discarded, so the file starts with the tails of the bar before it and loops seamlessly. **model** provides the exported hits as a pure function next to the hits in a window: the first five bars of playback on a timeline where the first exported bar starts at 0, Muted Voices excluded.
- The Sound kit is built by one factory that receives its audio context and destination. The live engine and the offline render each get their own kit, so the Sounds are identical in both and an export can run while the Pattern plays without disturbing it.
- The level is not normalised: samples are clipped to full scale when encoded. WAV is 24-bit PCM, encoded by a small dependency-free function in **audio**. MP3 is 192 kbps CBR at 48 kHz stereo, encoded by LAME (WASM, in a worker) through `mediabunny` and `@mediabunny/mp3-encoder`. Both are loaded with a dynamic `import()` only when MP3 is exported, so they ship as separate chunks and never weigh on the first load; a failed load is reported like any other export failure.
- The audio engine interface gains one operation: render and encode a Pattern in a format, resolving to a `Blob` with the right MIME type. The application turns it into a download named `dotproducer-<tempo>bpm-<YYYY-MM-DD>.<extension>` on the local date.
- While rendering, Download is disabled and reads "Rendering…". On success the dialog closes; on failure a short error is shown inline, the dialog stays open and Download can be retried.

### Delivery order

- Work starts with a thin vertical slice: the Core, one Voice, its Pulse and its hit, with a provisional look. This validates early that the Pixi Pulse and the Tone hit coincide, which is the main technical risk.
- An impeccable design session then fixes the visual and motion direction on that moving slice and produces the shared design tokens (colours and shapes per Sound, Ripple character per Sound, motion curves, typography, light or dark ground, placement of Dock, Tempo and Magnet on mobile and desktop).
- The remaining features are built against those tokens, followed by a final impeccable critique and polish pass on the real app.

## Testing Decisions

- A good test here exercises behaviour a player could observe or a caller could rely on — "a Voice dropped between Ring 2 and Ring 3 with the Magnet on lands on the nearer one", "a Pattern survives a round trip through the URL" — and never asserts on internal structure, private helpers or call order between collaborators. Tests should keep passing through any refactor that preserves behaviour.
- Tests are written with Vitest. There is no prior art in the repository; these are the first tests and set the conventions.
- There are two test seams.
  - **The public interface of model** (the primary seam). Pure functions, tested without any test doubles. It covers: Pattern operations; Magnet snapping, clamping and merging; conversion between canvas points and distance/angle at several canvas sizes; Period and Phase for each Ring and for Free placement between Rings; Pulse positions at given timeline positions; hits within timeline windows, including windows that span several Periods, Muted Voices, and Tempo changes; fan-out of coinciding Voices; and the URL codec, including round trips, clamping of out-of-range values and tolerance of corrupt or truncated input. Property-style tests are appropriate for the codec round trip and for the invariant that placement always yields a distance within range.
  - **The application rendered with a fake audio engine, a fake scene and a controllable clock, driven through the HTML surface** (keyboard mirror, Tempo and Magnet controls). It covers the wiring end to end: creating, moving, muting and removing Voices by keyboard; the accessible names and announcements; which hits reach the audio engine and when; pause and resume through the Core; Tempo changes; the URL after each committed change; restoring from history; a shared link opening silently and starting on the first interaction; a corrupt link opening an empty canvas; and the first-visit hint appearing and disappearing.
- The fakes implement the same interfaces as the real audio engine and scene, so the seam is the real dependency-inversion boundary and not a test-only hook. The fake scene also lets tests emit pointer intents (a drop at a canvas point, a tap on a Voice) without a canvas.
- Not covered by automated tests, deliberately: the Tone adapter (whether the Sounds are good) and the Pixi adapter (whether drawing, motion and pointer dragging look and feel right). Both are thin layers behind interfaces and are verified by hand and during the impeccable sessions. The logic behind dragging — which position a canvas point maps to — is covered at the model seam.
- Synchrony between Pulse arrival and audible hit is verified by hand on the thin slice, on desktop and on a real phone, before the rest is built.

## Out of Scope

- Per-Voice volume, accents or velocity.
- Pitched or tonal Sounds (bass, synth notes) and any control for choosing pitch.
- Interchangeable kits or user-supplied samples.
- More than one Core, or a movable Core.
- Zooming or panning the canvas.
- Free placement by keyboard.
- Accounts, a gallery of Patterns, saving with names, or any backend.
- Recording a live performance, configurable export length or quality, mastering of the export, and export formats other than those listed under Audio export.
- Particles, trails, glow or shader effects (anticipated for later versions; see ADR 0001).
- Translations; the interface is English only.
- A cap on the number of Voices, and any handling of audio polyphony limits beyond what Tone.js does by default.
- The choice of hosting and deployment; the app is a static site and any static host will do.

## Further Notes

- The single most important property of the design is that a Pattern is a pure function of geometry and time: the same drawing always sounds the same. Any feature that would make sound depend on when or in what order things were placed breaks sharing by URL and should be rejected or redesigned.
- Colour must never be the only way to tell Sounds apart; shape or size carries the same information.
- Minimalism is a hard requirement: the only persistent interface elements are the Dock, the Tempo number and the Magnet, Clear and Export controls. New features should be expressed through the canvas and its gestures before adding any control.
- Visual and motion details (palette, typography, exact Ripple shapes, easing, layout of the Magnet, Clear and Export controls, light or dark ground) are intentionally left to the impeccable session and are not decided by this spec.
- The CC0 samples for Clap, Closed Hat and Open Hat still need to be sourced; if a suitable Clap cannot be found, a synthesised one is an acceptable fallback behind the same audio interface.
