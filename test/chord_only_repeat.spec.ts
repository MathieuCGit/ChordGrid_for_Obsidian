/**
 * @file chord_only_repeat.spec.ts
 * @description Tests for chord-only measures with repeat notation (%)
 * 
 * Feature: Chord-only repeat measures should display chords correctly
 * - Without show%: repeated measures display their chords
 * - With show%: repeated measures show % symbol instead of chords
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Chord-Only Repeat Measures', () => {
  let parser: ChordGridParser;
  let renderer: SVGRenderer;

  beforeEach(() => {
    parser = new ChordGridParser();
    renderer = new SVGRenderer();
  });

  describe('Without show% directive', () => {
    test('should render chords in repeated single-chord measures', () => {
      const input = '4/4 | C | % |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(2);

      // Both measures are chord-only
      expect((result.measures[0] as any).__isChordOnlyMode).toBe(true);
      expect((result.measures[1] as any).__isChordOnlyMode).toBe(true);

      // Second measure is a repeat
      expect((result.measures[1] as any).isRepeat).toBe(true);
      expect(result.measures[1].source).toBe('%');

      // Render and check that chords appear in both measures
      const svg = renderer.render(result.grid);
      const svgString = svg.outerHTML;

      // Should contain "C" text elements (at least 2 times for both measures)
      const cMatches = svgString.match(/class="chord-symbol">C</g);
      expect(cMatches).not.toBeNull();
      expect(cMatches!.length).toBeGreaterThanOrEqual(2);
    });

    test('should render chords in repeated two-chord measures', () => {
      const input = '4/4 | Em / D | % |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(2);

      // Both measures have 2 chord segments
      expect(result.measures[0].chordSegments).toHaveLength(2);
      expect(result.measures[1].chordSegments).toHaveLength(2);

      // Second measure is a repeat
      expect((result.measures[1] as any).isRepeat).toBe(true);

      // Render and check for both chords in both measures
      const svg = renderer.render(result.grid);
      const svgString = svg.outerHTML;

      // Should contain Em (split as E + <tspan>m</tspan>)
      const eMatches = svgString.match(/class="chord-symbol">E</g);
      expect(eMatches).not.toBeNull();
      expect(eMatches!.length).toBeGreaterThanOrEqual(2); // At least once per measure

      // Should contain D
      const dMatches = svgString.match(/class="chord-symbol">D</g);
      expect(dMatches).not.toBeNull();
      expect(dMatches!.length).toBeGreaterThanOrEqual(2); // At least once per measure

      // Should have diagonal slash lines (one per measure)
      const slashMatches = svgString.match(/<line[^>]*stroke="#999"[^>]*stroke-width="2"/g);
      expect(slashMatches).not.toBeNull();
      expect(slashMatches!.length).toBe(2);
    });

    test('should render chords in consecutive repeated measures', () => {
      const input = '4/4 | G | % | % |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(3);

      // All measures are chord-only with chord "G"
      result.measures.forEach((m, idx) => {
        expect((m as any).__isChordOnlyMode).toBe(true);
        expect(m.chord).toBe('G');
        if (idx > 0) {
          expect((m as any).isRepeat).toBe(true);
        }
      });

      const svg = renderer.render(result.grid);
      const svgString = svg.outerHTML;

      // Should contain "G" for all 3 measures
      const gMatches = svgString.match(/class="chord-symbol">G</g);
      expect(gMatches).not.toBeNull();
      expect(gMatches!.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('With show% directive', () => {
    test('should hide chords and show % symbol in repeated measures', () => {
      const input = 'show% 4/4 | C | % |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.displayRepeatSymbol).toBe(true);
      expect(result.measures).toHaveLength(2);

      // Render with show% enabled
      const svg = renderer.render(result.grid, { displayRepeatSymbol: true });
      const svgString = svg.outerHTML;

      // Should contain % symbol (repeat symbol SVG group)
      expect(svgString).toContain('data-repeat-symbol="true"');

      // First measure should have "C" chord
      const cMatches = svgString.match(/class="chord-symbol">C</g);
      expect(cMatches).not.toBeNull();
      expect(cMatches!.length).toBe(1); // Only in first measure

      // Second measure should NOT have chord text (hidden by show%)
      // The % symbol replaces the chord display
    });

    test('should hide chords in repeated two-chord measures with show%', () => {
      const input = 'show% 4/4 | Am / G | % |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.displayRepeatSymbol).toBe(true);

      const svg = renderer.render(result.grid, { displayRepeatSymbol: true });
      const svgString = svg.outerHTML;

      // Should contain % symbol (repeat symbol SVG group)
      expect(svgString).toContain('data-repeat-symbol="true"');

      // First measure has both chords
      expect(svgString).toContain('>A<');
      expect(svgString).toContain('>G<');

      // Diagonal slash should appear only in first measure
      const slashMatches = svgString.match(/<line[^>]*stroke="#999"[^>]*stroke-width="2"/g);
      expect(slashMatches).not.toBeNull();
      expect(slashMatches!.length).toBe(1); // Only first measure, not the repeat
    });
  });

  describe('Mixed chord-only and rhythm repeat measures', () => {
    test('should handle alternating chord-only and rhythm measures with repeats', () => {
      const input = '4/4 | C | % | Am[4 4 4 4] | % |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(4);

      // Measures 0 and 1: chord-only
      expect((result.measures[0] as any).__isChordOnlyMode).toBe(true);
      expect((result.measures[1] as any).__isChordOnlyMode).toBe(true);

      // Measures 2 and 3: rhythm notation
      expect((result.measures[2] as any).__isChordOnlyMode).toBeUndefined();
      expect((result.measures[3] as any).__isChordOnlyMode).toBeUndefined();

      const svg = renderer.render(result.grid);
      const svgString = svg.outerHTML;

      // Should have chords for all measures (no show%)
      expect(svgString).toContain('>C<');
      expect(svgString).toContain('>A<'); // From Am
    });
  });

  describe('Edge cases', () => {
    test('should handle D[%] notation (chord change with rhythm repeat)', () => {
      const input = '4/4 | C | D[%] |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(2);

      // Second measure should have chord "D" but is chord-only (bracket with %)
      expect(result.measures[1].chord).toBe('D');
      expect((result.measures[1] as any).__isChordOnlyMode).toBe(true);

      const svg = renderer.render(result.grid);
      const svgString = svg.outerHTML;

      // Both C and D should appear
      expect(svgString).toContain('>C<');
      expect(svgString).toContain('>D<');
    });

    test('should handle repeat with three chords', () => {
      const input = '4/4 | C / Am / G | % |';
      const result = parser.parse(input);

      expect(result.errors).toHaveLength(0);
      expect(result.measures).toHaveLength(2);

      // Both measures should have 3 chord segments
      expect(result.measures[0].chordSegments).toHaveLength(3);
      expect(result.measures[1].chordSegments).toHaveLength(3);

      const svg = renderer.render(result.grid);
      const svgString = svg.outerHTML;

      // All three chords should appear in both measures
      const cMatches = svgString.match(/class="chord-symbol">C</g);
      expect(cMatches).not.toBeNull();
      expect(cMatches!.length).toBe(2); // Once per measure

      // Should have small slash separators for 3+ chords (2 per measure)
      const smallSlashMatches = svgString.match(/<line[^>]*stroke="#999"[^>]*stroke-width="1.5"/g);
      expect(smallSlashMatches).not.toBeNull();
      expect(smallSlashMatches!.length).toBeGreaterThanOrEqual(4); // At least 2 per measure
    });
  });
});
