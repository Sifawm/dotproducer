import {
  RING_COUNT,
  SOUNDS,
  displayAngles,
  emptyPattern,
  hitsInWindow,
  layout,
  place,
  pointToPosition,
  positionToPoint,
  pulseProgress,
  removeVoice,
  ringDistance,
  type Beats,
  type Point,
  type Size,
  type Sound,
  type Voice,
  type VoiceId,
} from '@dotproducer/model';
import { Application, Graphics } from 'pixi.js';
import type { Scene, SceneIntent, SceneState } from './scene';
import type { SceneTheme, VoiceShape } from './theme';

/** What the pointer went down on, and whether it has moved far enough to be a drag. */
type Gesture = {
  readonly pointerId: number;
  readonly target:
    | { readonly kind: 'dock'; readonly sound: Sound }
    | { readonly kind: 'voice'; readonly voiceId: VoiceId }
    | { readonly kind: 'core' };
  readonly start: Point;
  point: Point;
  alt: boolean;
  dragging: boolean;
};

interface Ripple {
  readonly sound: Sound;
  readonly bornAt: number;
}

const DRAG_THRESHOLD = 6;
const MIN_TOUCH_RADIUS = 22;
/** A jump this long on the timeline is a restore, not playback: no Ripples for it. */
const MAX_FRAME_BEATS = 4;

const distanceBetween = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
const easeOut = (t: number): number => 1 - (1 - t) ** 3;

const paintShape = (
  g: Graphics,
  shape: VoiceShape,
  { x, y }: Point,
  r: number,
  color: string,
  alpha: number,
): void => {
  const fill = { color, alpha };
  switch (shape) {
    case 'circle':
      g.circle(x, y, r).fill(fill);
      break;
    case 'ring':
      g.circle(x, y, r * 0.78).stroke({ width: r * 0.45, color, alpha });
      break;
    case 'square':
      g.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7).fill(fill);
      break;
    case 'triangle':
      g.poly([x, y - r * 1.1, x + r, y + r * 0.75, x - r, y + r * 0.75]).fill(fill);
      break;
    case 'diamond':
      g.poly([x, y - r * 1.15, x + r * 1.15, y, x, y + r * 1.15, x - r * 1.15, y]).fill(fill);
      break;
    case 'hexagon':
      g.regularPoly(x, y, r * 1.05, 6).fill(fill);
      break;
  }
};

/** The Dock runs along the bottom edge in portrait and along the left edge in landscape. */
const dockOf = (size: Size) => {
  const { core, ringSpacing } = layout(size);
  const portrait = size.height >= size.width;
  const gap = Math.min((portrait ? size.width : size.height) / (SOUNDS.length + 1), ringSpacing * 2.2);
  const along = (index: number): number => (index - (SOUNDS.length - 1) / 2) * gap;
  return {
    dot: (sound: Sound): Point => {
      const offset = along(SOUNDS.indexOf(sound));
      return portrait
        ? { x: core.x + offset, y: size.height - ringSpacing }
        : { x: ringSpacing, y: core.y + offset };
    },
    contains: (point: Point): boolean =>
      portrait ? point.y > size.height - ringSpacing * 2 : point.x < ringSpacing * 2,
  };
};

// ponytail: the whole scene is one Graphics redrawn every frame. Fine for tens of
// Voices; move to retained display objects per Voice if dense Patterns drop frames.
export const createPixiScene = (theme: SceneTheme): Scene => {
  const listeners = new Set<(intent: SceneIntent) => void>();
  const emit = (intent: SceneIntent): void => listeners.forEach((listener) => listener(intent));

  let state: SceneState = {
    pattern: emptyPattern,
    magnet: true,
    playing: false,
    focusedVoiceId: null,
  };
  let mountCount = 0;
  let mounted: { readonly app: Application; readonly graphics: Graphics; dispose(): void } | null =
    null;

  let gesture: Gesture | null = null;
  let lastPosition: Beats | null = null;
  let lastFrameAt = 0;
  let ripples: Ripple[] = [];
  let dropPoint: Point | null = null;
  const shownAt = new Map<VoiceId, Point>();
  const cuedAt = new Map<VoiceId, number>();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const sizeOf = (app: Application): Size => ({
    width: app.screen.width,
    height: app.screen.height,
  });
  const baseRadius = (size: Size): number =>
    Math.min(Math.max(layout(size).ringSpacing * 0.3, 8), 16);
  const draggedVoiceId = (): VoiceId | null =>
    gesture?.dragging && gesture.target.kind === 'voice' ? gesture.target.voiceId : null;

  const hitTest = (point: Point, size: Size): Gesture['target'] | null => {
    const touch = Math.max(MIN_TOUCH_RADIUS, baseRadius(size) * 1.6);
    let nearest: { voice: Voice; distance: number } | null = null;
    for (const voice of state.pattern.voices) {
      const shown = shownAt.get(voice.id);
      if (!shown) continue;
      const distance = distanceBetween(point, shown);
      if (distance <= touch && (!nearest || distance < nearest.distance)) {
        nearest = { voice, distance };
      }
    }
    if (nearest) return { kind: 'voice', voiceId: nearest.voice.id };
    const dock = dockOf(size);
    const sound = SOUNDS.find((candidate) => distanceBetween(point, dock.dot(candidate)) <= touch);
    if (sound) return { kind: 'dock', sound };
    if (distanceBetween(point, layout(size).core) <= touch) return { kind: 'core' };
    return null;
  };

  const attachPointer = (app: Application): (() => void) => {
    const canvas = app.canvas;
    const local = (event: PointerEvent): Point => {
      const bounds = canvas.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };
    const down = (event: PointerEvent): void => {
      if (gesture) return;
      const point = local(event);
      const target = hitTest(point, sizeOf(app));
      if (!target) return;
      canvas.setPointerCapture(event.pointerId);
      gesture = {
        pointerId: event.pointerId,
        target,
        start: point,
        point,
        alt: event.altKey,
        dragging: false,
      };
    };
    const move = (event: PointerEvent): void => {
      if (gesture?.pointerId !== event.pointerId) return;
      gesture.point = local(event);
      gesture.alt = event.altKey;
      if (
        !gesture.dragging &&
        gesture.target.kind !== 'core' &&
        distanceBetween(gesture.point, gesture.start) > DRAG_THRESHOLD
      ) {
        gesture.dragging = true;
        emit({
          type: 'dragStarted',
          voiceId: gesture.target.kind === 'voice' ? gesture.target.voiceId : null,
        });
      }
    };
    const up = (event: PointerEvent): void => {
      if (gesture?.pointerId !== event.pointerId) return;
      const { target, dragging } = gesture;
      const point = local(event);
      const canvasSize = sizeOf(app);
      gesture = null;
      if (!dragging) {
        if (target.kind === 'dock') emit({ type: 'dockAuditioned', sound: target.sound });
        else if (target.kind === 'voice') emit({ type: 'voiceTapped', voiceId: target.voiceId });
        else emit({ type: 'coreTapped' });
        return;
      }
      const drop = { point, canvas: canvasSize, invertMagnet: event.altKey };
      const onDock = dockOf(canvasSize).contains(point);
      if (target.kind === 'voice') {
        emit(
          onDock
            ? { type: 'voiceDroppedOnDock', voiceId: target.voiceId }
            : { type: 'voiceDropped', voiceId: target.voiceId, ...drop },
        );
      } else if (target.kind === 'dock' && !onDock) {
        dropPoint = point;
        emit({ type: 'soundDropped', sound: target.sound, ...drop });
      } else {
        emit({ type: 'dragCancelled' });
      }
    };
    const cancel = (event: PointerEvent): void => {
      if (gesture?.pointerId !== event.pointerId) return;
      const wasDragging = gesture.dragging;
      gesture = null;
      if (wasDragging) emit({ type: 'dragCancelled' });
    };
    const blockMenu = (event: Event): void => event.preventDefault();

    canvas.style.touchAction = 'none';
    canvas.style.display = 'block';
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', cancel);
    canvas.addEventListener('contextmenu', blockMenu);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', cancel);
      canvas.removeEventListener('contextmenu', blockMenu);
    };
  };

  const draw = (app: Application, g: Graphics, position: Beats): void => {
    const now = performance.now();
    const elapsed = Math.min((now - lastFrameAt) / 1000, 0.1);
    lastFrameAt = now;
    const still = reducedMotion.matches;
    const size = sizeOf(app);
    const { core, ringSpacing } = layout(size);
    const radius = baseRadius(size);
    const { ink, sounds, motion } = theme;
    const heldId = draggedVoiceId();

    // Ripples and cues come from the same hits that are scheduled for audio.
    if (lastPosition !== null && position > lastPosition && position - lastPosition < MAX_FRAME_BEATS) {
      const audible = heldId === null ? state.pattern : removeVoice(state.pattern, heldId);
      for (const hit of hitsInWindow(audible, lastPosition, position)) {
        ripples.push({ sound: hit.sound, bornAt: now });
        cuedAt.set(hit.voiceId, now);
      }
    }
    lastPosition = position;
    ripples = ripples.filter(
      (ripple) => now - ripple.bornAt < sounds[ripple.sound].ripple.seconds * 1000,
    );
    const lastRipple = ripples[ripples.length - 1];
    const cue = (since: number | undefined): number =>
      since === undefined ? 0 : Math.max(0, 1 - (now - since) / (motion.cueSeconds * 1000));

    // Where the dragged dot would land.
    const magnet = gesture?.dragging ? state.magnet !== gesture.alt : state.magnet;
    const landing =
      gesture?.dragging && !dockOf(size).contains(gesture.point)
        ? place(pointToPosition(gesture.point, size), magnet)
        : null;

    g.clear();

    for (let ring = 1; ring <= RING_COUNT; ring++) {
      const lit = landing !== null && magnet && landing.distance === ring;
      g.circle(core.x, core.y, ring * ringSpacing).stroke({
        width: 1,
        color: ink,
        alpha: lit ? 0.7 : state.magnet ? 0.22 : 0.08,
      });
    }
    if (landing) {
      const spot = positionToPoint(landing, size);
      if (magnet) {
        const edge = positionToPoint({ ...landing, distance: ringDistance(RING_COUNT) }, size);
        g.moveTo(core.x, core.y)
          .lineTo(edge.x, edge.y)
          .stroke({ width: 1, color: ink, alpha: 0.25 });
      }
      g.circle(spot.x, spot.y, radius * 1.5).stroke({ width: 1.5, color: ink, alpha: 0.7 });
    }

    // Voices ease towards their place; a dragged one follows the pointer.
    const angles = displayAngles(state.pattern);
    const ease = still ? 1 : 1 - Math.exp((-elapsed * 4) / motion.settleSeconds);
    const live = new Set<VoiceId>();
    for (const voice of state.pattern.voices) {
      live.add(voice.id);
      const target = positionToPoint(
        { distance: voice.distance, angle: angles.get(voice.id) ?? voice.angle },
        size,
      );
      const from = shownAt.get(voice.id) ?? dropPoint ?? target;
      const shown =
        voice.id === heldId && gesture
          ? gesture.point
          : { x: from.x + (target.x - from.x) * ease, y: from.y + (target.y - from.y) * ease };
      shownAt.set(voice.id, shown);

      const look = sounds[voice.sound];
      const held = voice.id === heldId;
      g.moveTo(shown.x, shown.y)
        .lineTo(core.x, core.y)
        .stroke({ width: 1, color: ink, alpha: held || voice.muted ? 0.1 : 0.3 });
      if (!held) {
        const progress = pulseProgress(voice, position);
        g.circle(
          shown.x + (core.x - shown.x) * progress,
          shown.y + (core.y - shown.y) * progress,
          radius * 0.35,
        ).fill({ color: look.color, alpha: voice.muted ? 0.3 : 1 });
      }
    }
    dropPoint = null;
    for (const id of shownAt.keys()) if (!live.has(id)) shownAt.delete(id);
    for (const id of cuedAt.keys()) if (!live.has(id)) cuedAt.delete(id);

    if (!still) {
      for (const ripple of ripples) {
        const look = sounds[ripple.sound];
        const age = (now - ripple.bornAt) / (look.ripple.seconds * 1000);
        g.circle(core.x, core.y, radius + look.ripple.reach * ringSpacing * easeOut(age)).stroke({
          width: Math.max(look.ripple.width * (1 - age), 0.5),
          color: look.color,
          alpha: 0.8 * (1 - age),
        });
      }
    }

    // The Core beats on every hit; with reduced motion it only changes colour.
    const beat = cue(lastRipple?.bornAt);
    const coreRadius = radius * (still ? 1 : 1 + 0.25 * beat);
    const coreColor = still && lastRipple && beat > 0 ? sounds[lastRipple.sound].color : ink;
    if (state.playing) g.circle(core.x, core.y, coreRadius).fill({ color: coreColor });
    else g.circle(core.x, core.y, coreRadius - 1.5).stroke({ width: 3, color: coreColor });

    for (const voice of state.pattern.voices) {
      const shown = shownAt.get(voice.id);
      if (!shown) continue;
      const look = sounds[voice.sound];
      const pop = still ? 1 : 1 + 0.3 * cue(cuedAt.get(voice.id));
      paintShape(g, look.shape, shown, radius * look.size * pop, look.color, voice.muted ? 0.35 : 1);
      if (voice.id === state.focusedVoiceId) {
        g.circle(shown.x, shown.y, radius * look.size + 6).stroke({ width: 2, color: ink });
      }
    }

    const dock = dockOf(size);
    for (const sound of SOUNDS) {
      const look = sounds[sound];
      paintShape(g, look.shape, dock.dot(sound), radius * look.size, look.color, 1);
    }
    if (gesture?.dragging && gesture.target.kind === 'dock') {
      const look = sounds[gesture.target.sound];
      paintShape(g, look.shape, gesture.point, radius * look.size, look.color, 0.9);
    }

    app.render();
  };

  return {
    mount(host) {
      const mount = ++mountCount;
      const app = new Application();
      void app
        .init({
          resizeTo: host,
          antialias: true,
          autoDensity: true,
          autoStart: false,
          backgroundAlpha: 0,
          resolution: window.devicePixelRatio,
        })
        .then(() => {
          // Unmounted (or remounted) while Pixi was still starting.
          if (mount !== mountCount) return app.destroy(true);
          host.appendChild(app.canvas);
          const graphics = app.stage.addChild(new Graphics());
          mounted = { app, graphics, dispose: attachPointer(app) };
        });
    },
    unmount() {
      mountCount++;
      mounted?.dispose();
      mounted?.app.destroy(true, { children: true });
      mounted = null;
      gesture = null;
    },
    update(next) {
      state = next;
    },
    advance(position) {
      if (mounted) draw(mounted.app, mounted.graphics, position);
    },
    onIntent(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};
