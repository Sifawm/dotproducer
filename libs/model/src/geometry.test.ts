import { describe, expect, it } from 'vitest';
import { angle, layout, pointToPosition, positionToPoint, ringDistance } from './index';

const square = { width: 1400, height: 1400 };
const phone = { width: 390, height: 800 };
const landscape = { width: 800, height: 390 };

describe('geometry', () => {
  it('puts the Core at the centre and derives Ring spacing from the smaller dimension', () => {
    expect(layout(square)).toEqual({ core: { x: 700, y: 700 }, ringSpacing: 100 });
    expect(layout(phone).core).toEqual({ x: 195, y: 400 });
    expect(layout(phone).ringSpacing).toBe(layout(landscape).ringSpacing);
  });

  it('keeps the last Ring inside the canvas at any size', () => {
    for (const size of [square, phone, landscape]) {
      const { ringSpacing } = layout(size);
      expect(ringSpacing * 5).toBeLessThan(Math.min(size.width, size.height) / 2);
    }
  });

  it('reads distance in Ring units and angle clockwise from 12 o\'clock', () => {
    expect(pointToPosition({ x: 700, y: 400 }, square)).toEqual({ distance: 3, angle: 0 });
    expect(pointToPosition({ x: 900, y: 700 }, square)).toEqual({ distance: 2, angle: 0.25 });
    expect(pointToPosition({ x: 700, y: 1200 }, square)).toEqual({ distance: 5, angle: 0.5 });
    expect(pointToPosition({ x: 500, y: 700 }, square)).toEqual({ distance: 2, angle: 0.75 });
  });

  it('keeps points inside the first Ring or outside the last one within the Rings', () => {
    expect(pointToPosition({ x: 700, y: 700 }, square).distance).toBe(1);
    expect(pointToPosition({ x: 0, y: 0 }, square).distance).toBe(5);
  });

  it('maps a position to the same relative point at every canvas size', () => {
    const position = { distance: ringDistance(3), angle: angle(0.25) };
    const onSquare = positionToPoint(position, square);
    expect(onSquare.x).toBeCloseTo(1000);
    expect(onSquare.y).toBeCloseTo(700);
    const onPhone = positionToPoint(position, phone);
    expect(onPhone.x).toBeCloseTo(195 + (3 * 390) / 14);
    expect(onPhone.y).toBeCloseTo(400);
  });

  it('round-trips a position through a canvas point', () => {
    for (const size of [square, phone, landscape]) {
      const position = { distance: ringDistance(2.37), angle: angle(0.61) };
      const back = pointToPosition(positionToPoint(position, size), size);
      expect(back.distance).toBeCloseTo(2.37);
      expect(back.angle).toBeCloseTo(0.61);
    }
  });
});
