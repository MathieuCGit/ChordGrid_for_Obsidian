/**
 * @file BeamRenderer.ts
 * @description SVG rendering of beams between musical notes.
 * 
 * This renderer is responsible for:
 * - Drawing beam bars between notes
 * - Managing multi-level beams (8th, 16th, 32nd, 64th)
 * - Managing partial beams (beamlets)
 * - Adapting position according to stem direction
 */
import { SVG_NS, NOTATION, VISUAL } from './constants';
import { BeamGroup, AnalyzedMeasure } from '../analyzer/analyzer-types';

export interface NotePositionRef {
  x: number;
  y: number;
  measureIndex: number;
  chordIndex: number; // segment index
  segmentNoteIndex?: number; // set by MeasureRenderer
  stemTopY?: number;
  stemBottomY?: number;
  stemsDirection?: 'up' | 'down'; // Stem direction
}

/**
 * Draws beams for an analyzed measure.
 * 
 * @param svg - Parent SVG element
 * @param analyzed - Analyzed measure with beam groups
 * @param measureIndex - Measure index
 * @param notePositions - Note positions with stem metadata
 * @param stemsDirection - Stem direction ('up' or 'down')
 */
export function drawBeams(
  svg: SVGElement,
  analyzed: AnalyzedMeasure,
  measureIndex: number,
  notePositions: NotePositionRef[],
  stemsDirection: 'up' | 'down'
) {
  // Build a set of notes that are connected by a primary (level 1) beam of length >= 2
  const level1Beamed = new Set<string>();
  for (const g of analyzed.beamGroups) {
    if (g.level === 1 && !g.isPartial && g.notes.length >= 2) {
      for (const r of g.notes) {
        level1Beamed.add(`${r.segmentIndex}:${r.noteIndex}`);
      }
    }
  }

  for (const group of analyzed.beamGroups) {
    const level = group.level;

    // Resolve positions for referenced notes
    const refs = group.notes.map(ref => {
      const pos = notePositions.find(p =>
        p.measureIndex === measureIndex &&
        p.chordIndex === ref.segmentIndex &&
        p.segmentNoteIndex === ref.noteIndex
      );
      return { ref, pos } as { ref: typeof ref; pos?: NotePositionRef };
    });

    const valid = refs.filter(r => r.pos);
    if (valid.length === 0) continue;

    // Calculate beam position based on stem direction
    let beamY: number;
    if (stemsDirection === 'up') {
      // Stems up: beams at the top (stemTopY, smallest y value)
      const stemTops = valid.map(v => v.pos!.stemTopY || (v.pos!.y - NOTATION.STEM_HEIGHT));
      const baseStemTop = stemTops.length ? Math.min(...stemTops) : (valid[0].pos!.y - NOTATION.STEM_HEIGHT);
      beamY = baseStemTop + (level - 1) * NOTATION.BEAM_GAP;
    } else {
      // Stems down: beams at the bottom (stemBottomY, largest y value)
      const stemBottoms = valid.map(v => v.pos!.stemBottomY || (v.pos!.y + NOTATION.STEM_HEIGHT));
      const baseStemBottom = stemBottoms.length ? Math.max(...stemBottoms) : (valid[0].pos!.y + NOTATION.STEM_HEIGHT);
      beamY = baseStemBottom - (level - 1) * NOTATION.BEAM_GAP;
    }

    if (group.isPartial) {
      // Beamlet: draw short segment from stemX towards direction
      const p = valid[0].pos!;
      // If this is a higher-level beamlet for a note not in any level-1 group,
      // skip drawing it (isolated notes should use flags instead of beamlets).
      if (group.level > 1) {
        const r = group.notes[0];
        const key = `${r.segmentIndex}:${r.noteIndex}`;
        if (!level1Beamed.has(key)) {
          return; // skip beamlet; flags will be drawn later
        }
      }
      // Stem position according to direction (consistent with NoteRenderer)
      const startX = stemsDirection === 'up' ? (p.x + NOTATION.SLASH_LENGTH / 2) : (p.x - NOTATION.SLASH_LENGTH / 2);
      const endX = group.direction === 'right' ? (startX + NOTATION.BEAMLET_LENGTH) : (startX - NOTATION.BEAMLET_LENGTH);

      // Level 1 (eighth notes) beams are thicker (3px instead of 2px)
      const strokeWidth = (level === 1) ? 3 : VISUAL.BEAM_STROKE_WIDTH;

      const beamlet = document.createElementNS(SVG_NS, 'line');
      beamlet.setAttribute('x1', String(startX));
      beamlet.setAttribute('y1', String(beamY));
      beamlet.setAttribute('x2', String(endX));
      beamlet.setAttribute('y2', String(beamY));
      beamlet.setAttribute('stroke', '#000');
      beamlet.setAttribute('stroke-width', String(strokeWidth));
      svg.appendChild(beamlet);
    } else {
      // Full beam: line between first and last
      const first = valid[0].pos!;
      const last = valid[valid.length - 1].pos!;
      const startX = stemsDirection === 'up' ? (first.x + NOTATION.SLASH_LENGTH / 2) : (first.x - NOTATION.SLASH_LENGTH / 2);
      const endX = stemsDirection === 'up' ? (last.x + NOTATION.SLASH_LENGTH / 2) : (last.x - NOTATION.SLASH_LENGTH / 2);

      // Level 1 (eighth notes) beams are thicker (3px instead of 2px)
      const strokeWidth = (level === 1) ? 3 : VISUAL.BEAM_STROKE_WIDTH;

      const beam = document.createElementNS(SVG_NS, 'line');
      beam.setAttribute('x1', String(startX));
      beam.setAttribute('y1', String(beamY));
      beam.setAttribute('x2', String(endX));
      beam.setAttribute('y2', String(beamY));
      beam.setAttribute('stroke', '#000');
      beam.setAttribute('stroke-width', String(strokeWidth));
      svg.appendChild(beam);
    }
  }

  // Flags for isolated notes are drawn by NoteRenderer.
}
