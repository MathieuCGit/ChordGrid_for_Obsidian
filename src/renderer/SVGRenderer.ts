/**
 * @file SVGRenderer.ts
 * @description Rendu SVG des grilles d'accords.
 * 
 * Cette classe orchestre le rendu complet d'une grille d'accords en SVG,
 * en gérant la disposition des mesures sur plusieurs lignes et en
 * déléguant le rendu des mesures individuelles à MeasureRenderer.
 * 
 * Responsabilités :
 * - Calculer la taille globale du SVG en fonction du nombre de lignes
 * - Positionner les mesures sur la grille (4 mesures par ligne par défaut)
 * - Gérer les sauts de ligne explicites (lineBreak)
 * - Initialiser le TieManager pour gérer les liaisons entre mesures
 * - Créer la structure SVG avec fond et éléments graphiques
 * 
 * @example
 * ```typescript
 * const renderer = new SVGRenderer();
 * const svgElement = renderer.render(chordGrid);
 * document.body.appendChild(svgElement);
 * ```
 * 
 * @see {@link MeasureRenderer} pour le rendu d'une mesure individuelle
 * @see {@link TieManager} pour la gestion des liaisons entre mesures
 */

import { ChordGrid } from '../parser/type';
import { MeasureRenderer } from './MeasureRenderer';
import { SVG_NS } from './constants';
import { TieManager } from '../utils/TieManager';
import { ChordGridParser } from '../parser/ChordGridParser';
import { MusicAnalyzer } from '../analyzer/MusicAnalyzer';
import { drawAnalyzerBeams } from './AnalyzerBeamOverlay';
import { DebugLogger } from '../utils/DebugLogger';

/**
 * Classe principale pour le rendu SVG des grilles d'accords.
 */
export class SVGRenderer {
  /**
   * Rend une grille d'accords en élément SVG.
   * 
   * @param grid - Structure ChordGrid contenant les mesures à rendre
   * @returns Élément SVG prêt à être inséré dans le DOM
   */
  render(grid: ChordGrid): SVGElement {
    return this.createSVG(grid);
  }

  private createSVG(grid: ChordGrid): SVGElement {
  const measuresPerLine = 4;
  const baseMeasureWidth = 240; // increased fallback minimum width per measure for readability
  const measureHeight = 120;

    DebugLogger.log('📐 Creating SVG layout', { 
      measuresPerLine, 
      baseMeasureWidth, 
      measureHeight 
    });

    // Pre-compute dynamic widths per measure based on rhythmic density
    const separatorWidth = 12;
    const innerPaddingPerSegment = 20;
    const headHalfMax = 6; // for diamond
    // Minimum horizontal spacing between consecutive note centers based on rhythmic subdivision.
    // Increased values to improve legibility of dense patterns (user request).
    const valueMinSpacing = (v: number) => {
      if (v >= 64) return 16;   // was 12
      if (v >= 32) return 20;   // was 14
      if (v >= 16) return 26;   // was 20 (16816 needs more air)
      if (v >= 8)  return 24;   // was 20
      return 20;                // was 16 for quarters & longer
    };
    const requiredBeatWidth = (beat: any) => {
      const noteCount = beat?.notes?.length || 0;
      if (noteCount <= 1) return 28 + 10 + headHalfMax; // increased minimal single-note width
      const spacing = Math.max(
        ...beat.notes.map((n: any) => {
          const base = valueMinSpacing(n.value);
          return n.isRest ? base + 4 : base; // give short rests a bit more room when estimating width
        })
      );
      return 10 + 10 + headHalfMax + (noteCount - 1) * spacing + 8; // +8 extra breathing room
    };
    const requiredMeasureWidth = (measure: any) => {
      const segments = measure.chordSegments || [{ chord: measure.chord, beats: measure.beats }];
      let width = 0;
      segments.forEach((seg: any, idx: number) => {
        if (idx > 0 && seg.leadingSpace) width += separatorWidth;
        const beatsWidth = (seg.beats || []).reduce((acc: number, b: any) => acc + requiredBeatWidth(b), 0);
        width += beatsWidth + innerPaddingPerSegment; // include inner padding for segment
      });
      // Ensure a sensible minimum
      return Math.max(baseMeasureWidth, Math.ceil(width));
    };
    const dynamicMeasureWidths = grid.measures.map(m => requiredMeasureWidth(m));

    // Build linear positions honoring line breaks and available line width budget
    let currentLine = 0;
    let measuresInCurrentLine = 0;
    const measurePositions: {measure: any, lineIndex: number, posInLine: number, globalIndex: number, width: number}[] = [];
    let globalIndex = 0;
    const maxLineWidth = measuresPerLine * baseMeasureWidth; // budget per line (before margins)
    let currentLineWidth = 0;

    grid.measures.forEach((measure, mi) => {
      const mWidth = dynamicMeasureWidths[mi];

      // wrap if adding this measure would exceed budget
      if (measuresInCurrentLine > 0 && (currentLineWidth + mWidth) > maxLineWidth) {
        DebugLogger.log(`↵ Auto line break (${measuresInCurrentLine} measures)`);
        currentLine++;
        measuresInCurrentLine = 0;
        currentLineWidth = 0;
      }

      // Always render the measure first
      const isLineStart = measuresInCurrentLine === 0;
      // mark on the measure so MeasureRenderer can draw a left bar when first in line
      (measure as any).__isLineStart = isLineStart;
      measurePositions.push({ measure, lineIndex: currentLine, posInLine: measuresInCurrentLine, globalIndex: globalIndex++, width: mWidth });
      measuresInCurrentLine++;
      currentLineWidth += mWidth;

      // Then, if this measure is marked as an explicit line break, move to next line
      if ((measure as any).isLineBreak) {
        DebugLogger.log('↵ Line break detected');
        currentLine++;
        measuresInCurrentLine = 0;
        currentLineWidth = 0;
      }
    });

    DebugLogger.log('📊 Layout calculated', { 
      totalLines: currentLine + 1, 
      totalMeasures: measurePositions.length 
    });

    const lines = currentLine + 1;
    // Compute SVG width as max line accumulation plus margins
    const linesWidths: number[] = new Array(lines).fill(0);
    measurePositions.forEach(p => {
      linesWidths[p.lineIndex] += p.width;
    });
    const width = Math.max(...linesWidths, baseMeasureWidth) + 60;
    const height = lines * (measureHeight + 20) + 20;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('xmlns', SVG_NS);

    // white background
    const bg = document.createElementNS(SVG_NS, 'rect');
    bg.setAttribute('x', '0');
    bg.setAttribute('y', '0');
    bg.setAttribute('width', String(width));
    bg.setAttribute('height', String(height));
    bg.setAttribute('fill', 'white');
    svg.appendChild(bg);

    // time signature text
    const timeSig = `${grid.timeSignature.numerator}/${grid.timeSignature.denominator}`;
    const timeText = this.createText(timeSig, 10, 40, '18px', 'bold');
    svg.appendChild(timeText);

  const notePositions: {x:number,y:number,headLeftX?:number,headRightX?:number,measureIndex:number,chordIndex:number,beatIndex:number,noteIndex:number,segmentNoteIndex?:number,tieStart?:boolean,tieEnd?:boolean,tieToVoid?:boolean,tieFromVoid?:boolean,stemTopY?:number,stemBottomY?:number}[] = [];
  const tieManager = new TieManager();

    DebugLogger.log('🎼 Rendering measures');
    // Prepare analyzed measures for beam rendering
    let analyzedMeasures: any[] = [];
    let level1BeamSet: Set<string> | undefined;
    try {
      const parser = new ChordGridParser();
      const analyzer = new MusicAnalyzer();
      // rebuild text source from grid? we keep existing grid measures
      analyzedMeasures = grid.measures.map(m => {
        // Map existing measure into analyzer ParsedMeasure shape
        const segments = (m.chordSegments || [{ chord: m.chord, beats: m.beats }]).map(seg => {
          const notes: any[] = [];
          seg.beats.forEach((beat, beatIndex) => {
            beat.notes.forEach(n => {
              notes.push({
                value: n.value,
                dotted: n.dotted,
                isRest: n.isRest,
                tieStart: n.tieStart || false,
                tieEnd: n.tieEnd || false,
                tieToVoid: n.tieToVoid || false,
                tieFromVoid: n.tieFromVoid || false,
                beatIndex,  // Preserve beat index for beam breaking
                tuplet: n.tuplet,  // Preserve tuplet information
                hasLeadingSpace: n.hasLeadingSpace  // Preserve spacing flag for tuplet subgroups
              });
            });
          });
          return {
            chord: seg.chord,
            leadingSpace: !!seg.leadingSpace,
            notes
          };
        });
        const parsedMeasure = {
          segments,
          timeSignature: grid.timeSignature,
          barline: (m as any).barline || '|',
          isLineBreak: (m as any).isLineBreak || false,
          source: (m as any).source || ''
        };
        const analyzed = analyzer.analyze(parsedMeasure as any);
        return analyzed;
      });
      DebugLogger.log('✅ Analyzer measures prepared', { count: analyzedMeasures.length });
      // Build global set of notes in level-1 beams of length >=2 per measure
      level1BeamSet = new Set<string>();
      analyzedMeasures.forEach((am: any, mi: number) => {
        am.beamGroups?.forEach((g: any) => {
          if (g.level === 1 && !g.isPartial && g.notes.length >= 2) {
            g.notes.forEach((r: any) => {
              level1BeamSet!.add(`${mi}:${r.segmentIndex}:${r.noteIndex}`);
            });
          }
        });
      });
    } catch (e) {
      DebugLogger.error('Analyzer preparation failed', e);
      analyzedMeasures = [];
    }

    const lineAccumulated: number[] = new Array(lines).fill(40);
    measurePositions.forEach(({measure, lineIndex, posInLine, globalIndex, width: mWidth}) => {
      const x = lineAccumulated[lineIndex];
      const y = lineIndex * (measureHeight + 20) + 20;
      // Build a per-measure subset for MeasureRenderer: only segmentIndex:noteIndex entries in this measure
      let perMeasureBeamSet: Set<string> | undefined;
      if (level1BeamSet) {
        perMeasureBeamSet = new Set<string>();
        analyzedMeasures[globalIndex]?.beamGroups?.forEach((g: any) => {
          if (g.level === 1 && !g.isPartial && g.notes.length >= 2) {
            g.notes.forEach((r: any) => {
              const key = `${r.segmentIndex}:${r.noteIndex}`;
              perMeasureBeamSet!.add(key);
            });
          }
        });
      }
      const mr = new MeasureRenderer(measure, x, y, mWidth, perMeasureBeamSet);
      mr.drawMeasure(svg, globalIndex, notePositions, grid);

      // Draw analyzer beams overlay
      if (analyzedMeasures[globalIndex]) {
        drawAnalyzerBeams(svg, analyzedMeasures[globalIndex], globalIndex, notePositions as any);
      }
      lineAccumulated[lineIndex] += mWidth;
    });

  DebugLogger.log('🎵 Note positions collected', { count: notePositions.length });
  
  // draw ties using collected notePositions and the TieManager for cross-line ties
  this.detectAndDrawTies(svg, notePositions, width, tieManager, measurePositions);

    return svg;
  }

  /**
   * Crée un élément texte SVG avec les propriétés spécifiées.
   * 
   * @param text - Contenu du texte
   * @param x - Position X
   * @param y - Position Y
   * @param size - Taille de la police
   * @param weight - Poids de la police (normal, bold, etc.)
   * @returns Élément SVG text
   */
  private createText(text: string, x: number, y: number, size: string, weight: string = 'normal'): SVGTextElement {
    const textEl = document.createElementNS(SVG_NS, 'text');
    textEl.setAttribute('x', String(x));
    textEl.setAttribute('y', String(y));
    textEl.setAttribute('font-family', 'Arial, sans-serif');
    textEl.setAttribute('font-size', size);
    textEl.setAttribute('font-weight', weight);
    textEl.setAttribute('fill', '#000');
    textEl.textContent = text;
    return textEl;
  }

  /**
   * Détecte et dessine les liaisons (ties) entre notes.
   * 
   * Cette méthode gère trois types de liaisons :
   * 1. Liaisons normales entre notes adjacentes
   * 2. Liaisons "to void" (vers une note virtuelle en fin de ligne)
   * 3. Liaisons "from void" (depuis une note virtuelle en début de ligne)
   * 
   * Les liaisons entre lignes sont gérées par le TieManager.
   * 
   * @param svg - Élément SVG parent
   * @param notePositions - Tableau des positions de toutes les notes
   * @param svgWidth - Largeur totale du SVG
   * @param tieManager - Gestionnaire de liaisons entre lignes
   * @param measurePositions - Positions et lignes des mesures (pour détecter les changements de ligne)
   */
  private detectAndDrawTies(
    svg: SVGElement,
    notePositions: {x:number,y:number,headLeftX?:number,headRightX?:number,measureIndex:number,chordIndex:number,beatIndex:number,noteIndex:number,tieStart?:boolean,tieEnd?:boolean,tieToVoid?:boolean,tieFromVoid?:boolean,stemTopY?:number,stemBottomY?:number}[],
    svgWidth: number,
    tieManager: TieManager,
    measurePositions: {measure: any, lineIndex: number, posInLine: number, globalIndex: number, width: number}[]
  ) {
    DebugLogger.log('🔗 Starting tie detection and drawing');
    // Precompute visual X bounds for each measure to draw half-ties to the measure edge
    const lineStartPadding = 40; // must match createSVG lineAccumulated init
    const maxLineIndex = Math.max(0, ...measurePositions.map(m => m.lineIndex));
    const lineOffsets: number[] = new Array(maxLineIndex + 1).fill(lineStartPadding);
    const measureXB: Record<number, { xStart: number; xEnd: number; y: number }> = {};
    measurePositions
      .sort((a, b) => a.globalIndex - b.globalIndex)
      .forEach(mp => {
        const xStart = lineOffsets[mp.lineIndex];
        const xEnd = xStart + mp.width;
        const y = mp.lineIndex * (120 + 20) + 20; // measureHeight(120) + v-gap(20) + top(20)
        measureXB[mp.globalIndex] = { xStart, xEnd, y };
        lineOffsets[mp.lineIndex] += mp.width;
      });
    
    // POST-PROCESSING: Detect ties crossing line boundaries
    // The parser marks tieStart/tieEnd (or tieFromVoid) based on syntax.
    // For explicit line breaks (\n), the user writes "4_" and "_4" so parser already sets tieFromVoid.
    // For automatic wraps, we need to transform tieStart->tieEnd pairs into tieToVoid->tieFromVoid.
    DebugLogger.log('🔧 Post-processing ties for line breaks');
    
    for (let i = 0; i < notePositions.length; i++) {
      const cur = notePositions[i];
      
      // Only process notes with tieStart that haven't been marked as tieToVoid yet
      if (cur.tieStart && !cur.tieToVoid) {
        // Find the line index of this note's measure
        const curMeasurePos = measurePositions.find(mp => mp.globalIndex === cur.measureIndex);
        if (!curMeasurePos) continue;
        
        // Search for the matching tieEnd or tieFromVoid
        for (let j = i + 1; j < notePositions.length; j++) {
          const target = notePositions[j];
          
          // Match either tieEnd (normal) or tieFromVoid (explicit cross-line)
          if (target.tieEnd || target.tieFromVoid) {
            // Found the matching target - check if it's on a different line
            const targetMeasurePos = measurePositions.find(mp => mp.globalIndex === target.measureIndex);
            
            if (targetMeasurePos && targetMeasurePos.lineIndex !== curMeasurePos.lineIndex) {
              // This tie crosses a line boundary!
              DebugLogger.log(`🔧 Converting cross-line tie: note ${i} (measure ${cur.measureIndex}, line ${curMeasurePos.lineIndex}) -> note ${j} (measure ${target.measureIndex}, line ${targetMeasurePos.lineIndex})`);
              
              // Mark the start note as tieToVoid
              cur.tieToVoid = true;
              // If target already has tieFromVoid, keep it; otherwise set it
              if (!target.tieFromVoid) {
                target.tieFromVoid = true;
              }
              // Clear the normal tieStart flag to avoid double drawing
              cur.tieStart = false;
            }
            break; // Found the matching target, stop searching
          }
        }
      }
    }
    
    const matched = new Set<number>();
    
    // Log all notes with tie markers
    const tieNotes = notePositions.filter(n => n.tieStart || n.tieEnd || n.tieToVoid || n.tieFromVoid);
    DebugLogger.log('Notes with tie markers', { 
      count: tieNotes.length,
      details: tieNotes.map((n, idx) => ({
        index: notePositions.indexOf(n),
        measure: n.measureIndex,
        chord: n.chordIndex,
        beat: n.beatIndex,
        note: n.noteIndex,
        tieStart: n.tieStart,
        tieEnd: n.tieEnd,
        tieToVoid: n.tieToVoid,
        tieFromVoid: n.tieFromVoid,
        position: { x: n.x, y: n.y }
      }))
    });

    const drawCurve = (startX: number, startY: number, endX: number, endY: number, isCross: boolean) => {
      DebugLogger.log('Drawing tie curve', { 
        from: { x: startX, y: startY }, 
        to: { x: endX, y: endY }, 
        crossMeasure: isCross 
      });
      
      const path = document.createElementNS(SVG_NS, 'path');
      const dx = Math.abs(endX - startX);
      const baseAmp = Math.min(40, Math.max(8, dx / 6));
      const controlY = Math.min(startY, endY) - (isCross ? baseAmp + 10 : baseAmp);
      const midX = (startX + endX) / 2;
      const d = `M ${startX} ${startY} Q ${midX} ${controlY} ${endX} ${endY}`;
      path.setAttribute('d', d);
      path.setAttribute('stroke', '#000');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('fill', 'none');
      svg.appendChild(path);
    };

    const drawHalfToMeasureRight = (measureIdx: number, startX: number, startY: number) => {
      const bounds = measureXB[measureIdx];
      const marginX = bounds ? bounds.xEnd - 8 : (svgWidth - 16);
      DebugLogger.log('Drawing half-tie to measure right edge (tieToVoid)', {
        from: { x: startX, y: startY },
        to: { x: marginX, y: startY },
        measureIdx
      });
      drawCurve(startX, startY, marginX, startY, true);
      return { x: marginX, y: startY };
    };

    const drawHalfFromMeasureLeft = (measureIdx: number, endX: number, endY: number) => {
      const bounds = measureXB[measureIdx];
      // Slightly reduce the inset to start closer to the left barline
      const startX = bounds ? bounds.xStart + 4 : 16;
      DebugLogger.log('Drawing half-tie from measure left edge (tieFromVoid)', {
        from: { x: startX, y: endY },
        to: { x: endX, y: endY },
        measureIdx
      });
      drawCurve(startX, endY, endX, endY, true);
    };

    // Primary pass: match each tieStart to the next available tieEnd (temporal order)
    DebugLogger.log('🔍 Primary pass: matching tieStart -> tieEnd');
    for (let i = 0; i < notePositions.length; i++) {
      if (matched.has(i)) continue;
      const cur = notePositions[i];

      // compute visual anchor points (prefer head bounds when available)
      const startX = (cur.headRightX !== undefined) ? cur.headRightX : cur.x;
      let startY: number;
      if (cur.headRightX !== undefined) {
        const half = Math.abs(cur.headRightX - cur.x);
        // diamond heads have horizontal left/right at center Y (half >=6), slash heads have tilted endpoints
        startY = half >= 6 ? cur.y : cur.y - half;
      } else {
        startY = cur.y - 8;
      }

      if (cur.tieStart || cur.tieToVoid) {
        DebugLogger.log(`Found tieStart/tieToVoid at index ${i}`, { 
          measure: cur.measureIndex, 
          chord: cur.chordIndex, 
          beat: cur.beatIndex,
          tieStart: cur.tieStart,
          tieToVoid: cur.tieToVoid
        });
        
        // If already marked as tieToVoid by post-processing, draw half-tie immediately
        if (cur.tieToVoid) {
          DebugLogger.log(`Drawing tieToVoid for index ${i} (post-processed)`);
          const pending = drawHalfToMeasureRight(cur.measureIndex, startX, startY);
          tieManager.addPendingTie(cur.measureIndex, pending.x, pending.y);
          matched.add(i);
          continue;
        }
        
        // Otherwise, it's a normal tieStart - search for matching tieEnd
        
        // search for a direct tieEnd after i
        let found = -1;
        for (let j = i + 1; j < notePositions.length; j++) {
          if (matched.has(j)) continue;
          const cand = notePositions[j];
          if (cand.tieEnd) { found = j; break; }
        }

        if (found >= 0) {
          DebugLogger.log(`✅ Matched tieStart[${i}] -> tieEnd[${found}]`);
          const tgt = notePositions[found];
          const endX = (tgt.headLeftX !== undefined) ? tgt.headLeftX : tgt.x;
          let endY: number;
          if (tgt.headLeftX !== undefined) {
            const halfT = Math.abs(tgt.headLeftX - tgt.x);
            endY = halfT >= 6 ? tgt.y : tgt.y + halfT;
          } else {
            endY = tgt.y - 8;
          }
          drawCurve(startX, startY, endX, endY, cur.measureIndex !== tgt.measureIndex);
          matched.add(i);
          matched.add(found);
          continue;
        }

        DebugLogger.log(`No direct tieEnd found for tieStart[${i}], searching for tieFromVoid`);
        
        // no direct tieEnd found -> search for a tieFromVoid later (continuation)
        let foundFromVoid = -1;
        for (let j = i + 1; j < notePositions.length; j++) {
          if (matched.has(j)) continue;
          const cand = notePositions[j];
          if (cand.tieFromVoid) { foundFromVoid = j; break; }
        }

        if (foundFromVoid >= 0) {
          const tgt = notePositions[foundFromVoid];
          // Determine if this pair crosses a visual line
          const curMP = measurePositions.find(mp => mp.globalIndex === cur.measureIndex);
          const tgtMP = measurePositions.find(mp => mp.globalIndex === tgt.measureIndex);
          const crossesLine = !!(curMP && tgtMP && curMP.lineIndex !== tgtMP.lineIndex);

          if (crossesLine) {
            DebugLogger.log(`✅ Matched cross-line tieStart[${i}] -> tieFromVoid[${foundFromVoid}] — split into two halves`);
            const pending = drawHalfToMeasureRight(cur.measureIndex, startX, startY);
            tieManager.addPendingTie(cur.measureIndex, pending.x, pending.y);
            matched.add(i);
            // Don't mark the target to allow the start-of-line branch to draw the second half
          } else {
            DebugLogger.log(`✅ Matched same-line tieStart[${i}] -> tieFromVoid[${foundFromVoid}] — drawing full curve`);
            const endX = (tgt.headLeftX !== undefined) ? tgt.headLeftX : tgt.x;
            let endY: number;
            if (tgt.headLeftX !== undefined) {
              const halfT = Math.abs(tgt.headLeftX - tgt.x);
              endY = halfT >= 6 ? tgt.y : tgt.y + halfT;
            } else {
              endY = tgt.y - 8;
            }
            drawCurve(startX, startY, endX, endY, false);
            matched.add(i);
            matched.add(foundFromVoid);
          }
          continue;
        }

        DebugLogger.log(`No tieFromVoid found, already handled or no match`);
      }

      // If this note marks the start of a tie from the previous line
      if (cur.tieFromVoid && !matched.has(i)) {
        DebugLogger.log(`Found tieFromVoid at index ${i}`, { 
          measure: cur.measureIndex 
        });

        let endX = (cur.headLeftX !== undefined) ? cur.headLeftX : cur.x;
        let endY: number;
        if (cur.headLeftX !== undefined) {
          const half = Math.abs(cur.headLeftX - cur.x);
          endY = half >= 6 ? cur.y : cur.y + half;
        } else {
          endY = cur.y - 8;
        }

        // Always draw the start-of-line half from measure left edge into the note.
        drawHalfFromMeasureLeft(cur.measureIndex, endX, endY);
        matched.add(i);
      }
    }
    
    DebugLogger.log('🔗 Tie detection completed', { 
      totalMatched: matched.size, 
      totalNotes: notePositions.length 
    });
  }
}