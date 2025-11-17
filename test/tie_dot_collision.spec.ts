import { SVGRenderer } from '../src/renderer/SVGRenderer';
import { CollisionManager } from '../src/renderer/CollisionManager';
import { TieManager } from '../src/utils/TieManager';

describe('Tie rendering with dotted notes', () => {
  class FakeElement {
    public attributes: Record<string, string> = {};
    public children: FakeElement[] = [];
    public tagName: string;

    constructor(tagName: string) {
      this.tagName = tagName;
    }

    setAttribute(name: string, value: string) {
      this.attributes[name] = value;
    }

    getAttribute(name: string): string | undefined {
      return this.attributes[name];
    }

    appendChild(child: FakeElement) {
      this.children.push(child);
    }

    querySelectorAll() {
      return [];
    }
  }

  it('raises tie control point to avoid dotted note dot overlap', () => {
    const renderer = new SVGRenderer();
    const collisionManager = new CollisionManager();

    // Simulate a dotted note dot near the tie path
    collisionManager.registerElement('dot', { x: 108, y: 74, width: 4, height: 4 }, 9, { value: 4, dotted: true });

    const fakeSvg = new FakeElement('svg') as unknown as SVGElement & { __dynamicLineStartPadding?: number };
    fakeSvg.__dynamicLineStartPadding = 40;

    const previousDocument = (global as any).document;
    (global as any).document = {
      createElementNS: (_ns: string, tag: string) => new FakeElement(tag)
    };

    const notePositions = [
      {
        x: 100,
        y: 80,
        headLeftX: 95,
        headRightX: 105,
        measureIndex: 0,
        chordIndex: 0,
        beatIndex: 0,
        noteIndex: 0,
        tieStart: true,
        tieEnd: false,
        tieToVoid: false,
        tieFromVoid: false
      },
      {
        x: 140,
        y: 80,
        headLeftX: 135,
        headRightX: 145,
        measureIndex: 0,
        chordIndex: 0,
        beatIndex: 1,
        noteIndex: 0,
        tieStart: false,
        tieEnd: true,
        tieToVoid: false,
        tieFromVoid: false
      }
    ];

    const measurePositions = [
      {
        measure: {},
        lineIndex: 0,
        posInLine: 0,
        globalIndex: 0,
        width: 220
      }
    ];

    const tieManager = new TieManager();

    try {
      (renderer as any).detectAndDrawTies(
        fakeSvg,
        notePositions,
        400,
        tieManager,
        measurePositions,
        collisionManager
      );
    } finally {
      (global as any).document = previousDocument;
    }

    const paths = (fakeSvg as unknown as { children: FakeElement[] }).children.filter(child => child.tagName === 'path');
    expect(paths.length).toBe(1);

    const path = paths[0];
    const d = path.getAttribute('d');
    expect(d).toBeTruthy();

    const parts = d!.split(' ');
    // d format: M startX startY Q midX controlY endX endY
    expect(parts[0]).toBe('M');
    expect(parts[3]).toBe('Q');

    const controlY = parseFloat(parts[5]);

    // Baseline control point without dot avoidance would be min(75, 85) - 8 = 67.
    const expectedRaisedControlY = 61;
    expect(controlY).toBeCloseTo(expectedRaisedControlY, 5);
  });
});
