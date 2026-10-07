import type { Position } from './pattern';
import { RING_COUNT, angle, ringDistance } from './units';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Layout {
  readonly core: Point;
  /** Canvas distance between two consecutive Rings (and between the Core and the first one). */
  readonly ringSpacing: number;
}

// The last Ring spans 5/7 of the smaller half-dimension, leaving a margin for the Dock.
const SPACINGS_PER_SMALLER_DIMENSION = 2 * (RING_COUNT + 2);

export const layout = (size: Size): Layout => ({
  core: { x: size.width / 2, y: size.height / 2 },
  ringSpacing: Math.min(size.width, size.height) / SPACINGS_PER_SMALLER_DIMENSION,
});

/** The position a canvas point stands for, kept within the Rings and not snapped. */
export const pointToPosition = (point: Point, size: Size): Position => {
  const { core, ringSpacing } = layout(size);
  const dx = point.x - core.x;
  const dy = point.y - core.y;
  return {
    distance: ringDistance(Math.hypot(dx, dy) / ringSpacing),
    angle: angle(Math.atan2(dx, -dy) / (2 * Math.PI)),
  };
};

export const positionToPoint = (position: Position, size: Size): Point => {
  const { core, ringSpacing } = layout(size);
  const radius = position.distance * ringSpacing;
  const radians = position.angle * 2 * Math.PI;
  return { x: core.x + radius * Math.sin(radians), y: core.y - radius * Math.cos(radians) };
};
