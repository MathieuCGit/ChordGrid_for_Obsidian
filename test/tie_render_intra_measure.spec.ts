import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

/**
 * Visual rendering test: the tie from A[8_] -> [_4] within the same measure must be complete
 * and should not be rendered as a half-tie.
 */
describe('Intra-measure tie rendering', () => {
  const input = '4/4 | D[4.]A[8_] [_4] D[4_] |';

  it('draws a complete curve between A[8_] and [_4]', () => {
    const parser = new ChordGridParser();
    const grid = parser.parse(input).grid;
    const renderer = new SVGRenderer();
    const svg = renderer.render(grid);

    const paths = Array.from(svg.querySelectorAll('path'));
    // Look for paths with both data-start and data-end attributes (complete ties)
    // These represent ties that both start and end within the rendered SVG
    const fullTies = paths.filter(p => p.hasAttribute('data-start') && p.hasAttribute('data-end'));
    const halfTies = paths.filter(p => p.hasAttribute('data-half-tie'));

    // There must be at least one complete tie within this measure
    // The input "D[4._8]" contains a tie from the eighth note to the next note
    expect(fullTies.length).toBeGreaterThan(0);

    // Identify the tie starting from A[8_] (the first eighth note with tieStart after D[4.])
    // data-start format: measure:chord:beat:note
    // We're looking for a tie where both start and end are in measure 0
    // and the noteIndex is > 0 (after the dotted quarter note)
    const candidate = fullTies.find(p => {
      const start = p.getAttribute('data-start')!;
      const end = p.getAttribute('data-end')!;
      // Both measureIndex must be 0 (same measure)
      return start.startsWith('0:') && end.startsWith('0:');
    });
    expect(candidate).toBeDefined();

    // This tie should NOT be marked as a half-tie
    // Half-ties are used for ties that cross measure boundaries
    if (candidate) {
      expect(candidate.hasAttribute('data-half-tie')).toBe(false);
    }

    // No half-tie should originate from the eighth note A within this measure
    // Verify that no half-tie (if present for D[4_]) uses the same start index as the eighth note
    if (candidate) {
      const startRef = candidate.getAttribute('data-start');
      const conflictingHalf = halfTies.find(h => h.getAttribute('data-start') === startRef);
      expect(conflictingHalf).toBeUndefined();
    }
  });
});