/**
 * @file CountingRenderer.ts
 * @description Renderer for pedagogical beat counting numbers.
 * 
 * This module displays sequential counting numbers (1, 2, 3, 4...) on notes
 * for pedagogical rhythm learning purposes.
 * 
 * Position hierarchy (stems-up mode):
 * 1. Staff line (y = 80)
 * 2. Note head (y = 80 +/- offset)
 * 3. Counting numbers (this layer) ← Between note and pick/finger
 * 4. Pick strokes / Finger patterns (if enabled)
 * 
 * Visual properties:
 * - Tall (t): 14px bold - for beat starts
 * - Medium (m): 12px normal - for subdivisions
 * - Small (s): 10px normal gray - for rests
 * 
 * Positioning:
 * - Stems-up: numbers BELOW note head (5px margin)
 * - Stems-down: numbers ABOVE note head (5px margin)
 * - If pick/finger mode active: counting placed between note and symbol
 * 
 * @version 2.2.0
 */

import { SVG_NS, NOTATION } from './constants';
import type { PlaceAndSizeManager } from './PlaceAndSizeManager';

/**
 * Note position with counting metadata
 */
interface NotePosition {
  x: number;
  y: number;
  measureIndex: number;
  chordIndex: number;
  beatIndex: number;
  noteIndex: number;
  countingNumber?: number;
  countingLabel?: string;
  countingSize?: 't' | 'm' | 's';
  stemTopY?: number;
  stemBottomY?: number;
  value?: number;
}

/**
 * Main class for counting number rendering
 */
export class CountingRenderer {
  /**
   * Draw counting numbers on notes.
   * 
   * This method renders sequential counting numbers (1, 2, 3...) below or above
   * note heads depending on stem direction. Numbers are styled according to their
   * countingSize property:
   * - 't' (tall): Bold, larger font - for beat starts
   * - 'm' (medium): Normal weight, medium font - for subdivisions
   * - 's' (small): Normal weight, small font, gray - for rests
   * 
   * Position logic:
   * - Stems-up: numbers placed BELOW note head (default)
   * - Stems-down: numbers placed ABOVE note head
   * - Spacing: 5px from note head edge (closer than pick/finger symbols)
   * 
   * @param svg - Parent SVG element to append counting numbers to
   * @param notePositions - Array of note positions with counting metadata
   * @param stemsDirection - Global stem direction ('up' or 'down')
   * @param allowedMeasureIndices - Optional filter to render only specific measures (line-based rendering)
   * @param placeAndSizeManager - Optional collision detection manager for future enhancements
   */
  public static drawCountingNumbers(
    svg: SVGElement,
    notePositions: NotePosition[],
    stemsDirection: 'up' | 'down',
    allowedMeasureIndices?: Set<number>,
    placeAndSizeManager?: PlaceAndSizeManager
  ): void {
    // Constants from constants.ts
    const FONT_SIZE_TALL = NOTATION.COUNTING_FONT_SIZE_TALL;
    const FONT_SIZE_MEDIUM = NOTATION.COUNTING_FONT_SIZE_MEDIUM;
    const FONT_SIZE_SMALL = NOTATION.COUNTING_FONT_SIZE_SMALL;
    const MARGIN = NOTATION.COUNTING_MARGIN;
    const FONT_WEIGHT_TALL = NOTATION.COUNTING_FONT_WEIGHT_TALL;
    const FONT_WEIGHT_NORMAL = NOTATION.COUNTING_FONT_WEIGHT_NORMAL;
    const COLOR_REST = NOTATION.COUNTING_COLOR_REST;
    const COLOR_NORMAL = NOTATION.COUNTING_COLOR_NORMAL;
    const NOTE_HEAD_HALF_HEIGHT = NOTATION.PATTERN_NOTE_HEAD_HALF_HEIGHT;

    // Iterate through all note positions
    notePositions.forEach(notePos => {
      // Filter by allowed measures if specified (for line-based rendering)
      if (allowedMeasureIndices && !allowedMeasureIndices.has(notePos.measureIndex)) {
        return;
      }

      // Skip notes without counting information
      if (notePos.countingLabel === undefined || notePos.countingSize === undefined) {
        return;
      }
      
      // Skip empty labels
      if (notePos.countingLabel === '') {
        return;
      }

      // Determine stem direction for this specific note
      // For rests (no stem), use the global stem direction
      const hasStem = notePos.stemTopY !== undefined && notePos.stemBottomY !== undefined;
      const noteStemDirection = hasStem 
        ? (notePos.stemTopY! < notePos.y ? 'up' : 'down')
        : stemsDirection; // Use global direction for rests
      const placeBelow = noteStemDirection === 'up'; // stems-up → counting below

      // Calculate note head edge (top or bottom depending on stem direction)
      const noteHeadTop = notePos.y - NOTE_HEAD_HALF_HEIGHT;
      const noteHeadBottom = notePos.y + NOTE_HEAD_HALF_HEIGHT;
      const noteHeadEdgeY = placeBelow ? noteHeadBottom : noteHeadTop;

      // Determine font properties based on countingSize
      let fontSize: number;
      let fontWeight: string;
      let color: string;

      switch (notePos.countingSize) {
        case 't': // Tall - beat starts
          fontSize = FONT_SIZE_TALL;
          fontWeight = FONT_WEIGHT_TALL;
          color = COLOR_NORMAL;
          break;
        case 'm': // Medium - subdivisions
          fontSize = FONT_SIZE_MEDIUM;
          fontWeight = FONT_WEIGHT_NORMAL;
          color = COLOR_NORMAL;
          break;
        case 's': // Small - rests
          fontSize = FONT_SIZE_SMALL;
          fontWeight = FONT_WEIGHT_NORMAL;
          color = COLOR_REST;
          break;
        default:
          fontSize = FONT_SIZE_MEDIUM;
          fontWeight = FONT_WEIGHT_NORMAL;
          color = COLOR_NORMAL;
      }

      // Calculate Y position with margin
      // For text elements, y represents the baseline, so we need to account for that
      const textY = placeBelow
        ? noteHeadEdgeY + MARGIN + fontSize * 0.75 // Below: add margin + text height
        : noteHeadEdgeY - MARGIN; // Above: subtract margin (baseline is already above)

      // Create text element
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', notePos.x.toString());
      text.setAttribute('y', textY.toString());
      text.setAttribute('text-anchor', 'middle'); // Center horizontally on note
      text.setAttribute('font-family', 'Arial, sans-serif');
      text.setAttribute('font-size', `${fontSize}px`);
      text.setAttribute('font-weight', fontWeight);
      text.setAttribute('fill', color);
      text.setAttribute('data-counting', 'true'); // Attribute for identification in tests
      text.setAttribute('data-counting-size', notePos.countingSize);
      text.textContent = notePos.countingLabel;

      svg.appendChild(text);

      // Register in PlaceAndSizeManager for future collision detection
      if (placeAndSizeManager) {
        const estimatedWidth = fontSize * 0.6 * notePos.countingLabel.length;
        const bbox = {
          x: notePos.x - estimatedWidth / 2,
          y: placeBelow ? noteHeadEdgeY + MARGIN : (textY - fontSize),
          width: estimatedWidth,
          height: fontSize
        };
        
        placeAndSizeManager.registerElement('counting', bbox, 6, {
          label: notePos.countingLabel,
          size: notePos.countingSize,
          exactX: notePos.x,
          exactY: textY
        });
      }
    });
  }
}
