/**
 * @file AnalyzerBeamOverlay.ts
 * @description Draws beams using the new analyzer (v2.0.0) on top of existing note rendering.
 */
import { SVG_NS } from './constants';
import { BeamGroup, AnalyzedMeasure } from '../analyzer/analyzer-types';

export interface NotePositionRef {
  x: number;
  y: number;
  measureIndex: number;
  chordIndex: number; // segment index
  segmentNoteIndex?: number; // set by MeasureRenderer
  stemTopY?: number;
  stemBottomY?: number;
  stemsDirection?: 'up' | 'down'; // Direction des hampes
}

export function drawAnalyzerBeams(
  svg: SVGElement,
  analyzed: AnalyzedMeasure,
  measureIndex: number,
  notePositions: NotePositionRef[],
  stemsDirection: 'up' | 'down' = 'up' // Par défaut hampes vers le haut
) {
  const beamGap = 5;

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

    // Calculer la position des ligatures en fonction de la direction des hampes
    let beamY: number;
    if (stemsDirection === 'up') {
      // Hampes vers le haut : ligatures au sommet (stemTopY, valeur y la plus petite)
      const stemTops = valid.map(v => v.pos!.stemTopY || (v.pos!.y - 30));
      const baseStemTop = stemTops.length ? Math.min(...stemTops) : (valid[0].pos!.y - 30);
      beamY = baseStemTop + (level - 1) * beamGap;
    } else {
      // Hampes vers le bas : ligatures au bas (stemBottomY, valeur y la plus grande)
      const stemBottoms = valid.map(v => v.pos!.stemBottomY || (v.pos!.y + 30));
      const baseStemBottom = stemBottoms.length ? Math.max(...stemBottoms) : (valid[0].pos!.y + 30);
      beamY = baseStemBottom - (level - 1) * beamGap;
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
      // Position de la hampe selon la direction (cohérent avec MeasureRenderer)
      const slashLength = 10;
      const startX = stemsDirection === 'up' ? (p.x + slashLength/2) : (p.x - slashLength/2);
      const beamletLength = 8;
      const endX = group.direction === 'right' ? (startX + beamletLength) : (startX - beamletLength);

      const beamlet = document.createElementNS(SVG_NS, 'line');
      beamlet.setAttribute('x1', String(startX));
      beamlet.setAttribute('y1', String(beamY));
      beamlet.setAttribute('x2', String(endX));
      beamlet.setAttribute('y2', String(beamY));
      beamlet.setAttribute('stroke', '#000');
      beamlet.setAttribute('stroke-width', '2');
      svg.appendChild(beamlet);
    } else {
      // Full beam: line between first and last
      const first = valid[0].pos!;
      const last = valid[valid.length - 1].pos!;
      const slashLength = 10;
      const startX = stemsDirection === 'up' ? (first.x + slashLength/2) : (first.x - slashLength/2);
      const endX = stemsDirection === 'up' ? (last.x + slashLength/2) : (last.x - slashLength/2);

      const beam = document.createElementNS(SVG_NS, 'line');
      beam.setAttribute('x1', String(startX));
      beam.setAttribute('y1', String(beamY));
      beam.setAttribute('x2', String(endX));
      beam.setAttribute('y2', String(beamY));
      beam.setAttribute('stroke', '#000');
      beam.setAttribute('stroke-width', '2');
      svg.appendChild(beam);
    }
  }

  // Flags for isolated notes are now drawn by MeasureRenderer when analyzer is active.
}
