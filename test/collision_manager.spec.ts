import { PlaceAndSizeManager, BoundingBox } from '../src/renderer/PlaceAndSizeManager';

describe('PlaceAndSizeManager basic behavior', () => {
  test('registerElement and getStats', () => {
    const cm = new PlaceAndSizeManager();
    cm.registerElement('chord', { x: 10, y: 10, width: 30, height: 15 }, 5);
    cm.registerElement('tuplet-number', { x: 15, y: 5, width: 20, height: 10 }, 7);
    const stats = cm.getStats();
    expect(stats.total).toBe(2);
    expect(stats.byType['chord']).toBe(1);
    expect(stats.byType['tuplet-number']).toBe(1);
  });

  test('hasCollision positive and negative cases', () => {
    const cm = new PlaceAndSizeManager();
    cm.registerElement('chord', { x: 100, y: 40, width: 40, height: 20 }, 5);
    // Overlapping vertically
    expect(cm.hasCollision({ x: 110, y: 45, width: 10, height: 10 })).toBe(true);
    // Far away
    expect(cm.hasCollision({ x: 200, y: 200, width: 10, height: 10 })).toBe(false);
  });

  test('findFreePosition vertical avoidance', () => {
    const cm = new PlaceAndSizeManager({ minSpacing: 2 });
    cm.registerElement('chord', { x: 50, y: 50, width: 30, height: 20 }, 5);
    const request: BoundingBox = { x: 55, y: 55, width: 20, height: 10 };
    // Initial collides
    expect(cm.hasCollision(request)).toBe(true);
    const free = cm.findFreePosition(request, 'vertical');
    expect(free).not.toBeNull();
    if (free) {
      expect(cm.hasCollision(free)).toBe(false);
      // Should move either up or down from original y
      expect(free.y).not.toBe(55);
    }
  });

  test('findFreePosition horizontal avoidance', () => {
    const cm = new PlaceAndSizeManager({ minSpacing: 2 });
    cm.registerElement('chord', { x: 50, y: 50, width: 30, height: 20 }, 5);
    const request: BoundingBox = { x: 55, y: 55, width: 20, height: 10 };
    const free = cm.findFreePosition(request, 'horizontal');
    expect(free).not.toBeNull();
    if (free) {
      expect(cm.hasCollision(free)).toBe(false);
      expect(free.x).not.toBe(55);
    }
  });

  test('excludeTypes prevents considering certain collisions', () => {
    const cm = new PlaceAndSizeManager();
    cm.registerElement('chord', { x: 0, y: 0, width: 20, height: 20 }, 5);
    const box = { x: 5, y: 5, width: 5, height: 5 };
    expect(cm.hasCollision(box)).toBe(true);
    expect(cm.hasCollision(box, ['chord'])).toBe(false);
  });

  test('suggestVerticalOffset for tuplet-number above chord', () => {
    const cm = new PlaceAndSizeManager({ chordTupletVerticalSpacing: 10 });
    cm.registerElement('chord', { x: 100, y: 40, width: 30, height: 20 }, 5);
    const defaultY = 45; // inside chord vertical span (40..60)
    const adjusted = cm.suggestVerticalOffset('tuplet-number', 'chord', defaultY);
    // For tuplet-number vs chord rule, we subtract spacing from defaultY
    expect(adjusted).toBe(defaultY - 10);
  });

  test('clearType removes only specified elements', () => {
    const cm = new PlaceAndSizeManager();
    cm.registerElement('chord', { x: 0, y: 0, width: 10, height: 10 }, 5);
    cm.registerElement('note', { x: 20, y: 0, width: 10, height: 10 }, 5);
    cm.clearType('chord');
    const stats = cm.getStats();
    expect(stats.total).toBe(1);
    expect(stats.byType['note']).toBe(1);
    expect(stats.byType['chord']).toBeUndefined();
  });
});

