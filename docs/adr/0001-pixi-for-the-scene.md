# Pixi (WebGL) for the scene, HTML for the controls

The spatial scene (Core, Rings, Links, Voices, Pulses, Ripples and Dock) is drawn with Pixi in a single canvas, and only the non-spatial controls (Tempo and Magnet) are overlaid HTML. At v1 scale (tens of elements, flat dots and lines) SVG + Motion would have been crisper, more accessible and less work, but we chose Pixi because later versions are expected to add particles and effects, and the number of Voices per Pattern is uncapped.

## Considered Options

- **SVG + Motion**: rejected despite being the best fit for v1; it does not scale to particles or an unlimited number of elements, and migrating later would mean rewriting the entire drawing and dragging layer.
- **Everything in Pixi**: rejected because the Tempo text and the keyboard focus of the controls would be worse and would have to be reimplemented.

## Consequences

- Scene accessibility is not free: anything inside the canvas needs explicit work to be reachable without a pointer.
- Scene colours and styles live in code, not CSS; they must derive from the same source as the HTML controls' tokens so the two do not diverge.
- The Pixi scene is driven imperatively from its own module (no `@pixi/react`); React owns the Pattern and passes it in.
