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

import { ChordGrid, Measure } from '../parser/type';
import { MeasureRenderer } from './MeasureRenderer';
import { SVG_NS } from './constants';
import { TieManager } from '../utils/TieManager';
import { ChordGridParser } from '../parser/ChordGridParser';
import { MusicAnalyzer } from '../analyzer/MusicAnalyzer';
import { drawAnalyzerBeams } from './AnalyzerBeamOverlay';
// DebugLogger supprimé pour release utilisateur
import { PlaceAndSizeManager } from './PlaceAndSizeManager';

/**
 * Options de rendu pour le SVGRenderer.
 */
export interface RenderOptions {
  /** Direction des hampes ('up' ou 'down'). Par défaut 'up'. */
  stemsDirection?: 'up' | 'down';
  /** Afficher le symbole % pour les mesures répétées au lieu du rythme complet. Par défaut false. */
  displayRepeatSymbol?: boolean;
}

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
  /**
   * Rend une grille d'accords en élément SVG.
   * @param grid - Structure ChordGrid contenant les mesures à rendre
   * @param optionsOrStemsDirection - Options de rendu ou direction des hampes (rétro-compatibilité)
   */
  render(grid: ChordGrid, optionsOrStemsDirection?: RenderOptions | 'up' | 'down'): SVGElement {
    // Rétro-compatibilité : si c'est une string, c'est stemsDirection
    let options: RenderOptions;
    if (typeof optionsOrStemsDirection === 'string') {
      options = { stemsDirection: optionsOrStemsDirection };
    } else {
      options = optionsOrStemsDirection || {};
    }
    
    const stemsDir = options.stemsDirection === 'down' ? 'down' : 'up';
    return this.createSVG(grid, stemsDir, options);
  }

  private createSVG(grid: ChordGrid, stemsDirection: 'up' | 'down', options: RenderOptions): SVGElement {
  const measuresPerLine = 4;
  const baseMeasureWidth = 240; // increased fallback minimum width per measure for readability
  const measureHeight = 120;

    // DebugLogger.log('📐 Creating SVG layout', { 
    //   measuresPerLine, 
    //   baseMeasureWidth, 
    //   measureHeight 
    // });

  // Pre-compute dynamic widths per measure based on rhythmic density
  // (Time signature width factored into initial padding later)
  const timeSignatureString = `${grid.timeSignature.numerator}/${grid.timeSignature.denominator}`;
  const timeSigFontSize = 18;
  const timeSigAvgCharFactor = 0.53; // further reduced for tighter spacing
  const timeSigWidthEstimate = Math.ceil(timeSignatureString.length * timeSigFontSize * timeSigAvgCharFactor);
  const baseLeftPadding = 10;
  const dynamicLineStartPadding = baseLeftPadding + timeSigWidthEstimate + 4; // minimal margin after metric
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
    const measurePositions: {measure: any, lineIndex: number, posInLine: number, globalIndex: number, width: number, x?: number, y?: number}[] = [];
    let globalIndex = 0;
    const maxLineWidth = measuresPerLine * baseMeasureWidth; // budget per line (before margins)
    let currentLineWidth = 0;

    grid.measures.forEach((measure, mi) => {
      const mWidth = dynamicMeasureWidths[mi];

      // wrap if adding this measure would exceed budget
      if (measuresInCurrentLine > 0 && (currentLineWidth + mWidth) > maxLineWidth) {
        // DebugLogger.log(`↵ Auto line break (${measuresInCurrentLine} measures)`);
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
        // DebugLogger.log('↵ Line break detected');
        currentLine++;
        measuresInCurrentLine = 0;
        currentLineWidth = 0;
      }
    });

    // DebugLogger.log('📊 Layout calculated', { 
    //   totalLines: currentLine + 1, 
    //   totalMeasures: measurePositions.length 
    // });

    const lines = currentLine + 1;
    // Compute SVG width as max line accumulation plus margins
    const linesWidths: number[] = new Array(lines).fill(0);
    measurePositions.forEach(p => {
      linesWidths[p.lineIndex] += p.width;
    });
    const width = Math.max(...linesWidths, baseMeasureWidth) + 60;
    const height = lines * (measureHeight + 20) + 20;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', 'auto');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('xmlns', SVG_NS);

    // Initialize managers
    const placeAndSizeManager = new PlaceAndSizeManager();
    const tieManager = new TieManager();
    const notePositions: {x:number,y:number,headLeftX?:number,headRightX?:number,measureIndex:number,chordIndex:number,beatIndex:number,noteIndex:number,segmentNoteIndex?:number,tieStart?:boolean,tieEnd?:boolean,tieToVoid?:boolean,tieFromVoid?:boolean,stemTopY?:number,stemBottomY?:number,value?:number}[] = [];

  // white background
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('x', '0');
  bg.setAttribute('y', '0');
  bg.setAttribute('width', String(width));
  bg.setAttribute('height', String(height));
  bg.setAttribute('fill', 'white');
  svg.appendChild(bg);

    // time signature text (already measured before layout)
    const timeSigBaselineY = 40;
    const timeText = this.createText(timeSignatureString, baseLeftPadding, timeSigBaselineY, `${timeSigFontSize}px`, 'bold');
    svg.appendChild(timeText);
    (svg as any).__dynamicLineStartPadding = dynamicLineStartPadding;
    placeAndSizeManager.registerElement('time-signature', {
      x: baseLeftPadding,
      y: timeSigBaselineY - timeSigFontSize,
      width: timeSigWidthEstimate,
      height: timeSigFontSize + 4
    }, 0, { 
      text: timeSignatureString, 
      widthEstimate: timeSigWidthEstimate,
      exactX: baseLeftPadding + timeSigWidthEstimate / 2,
      exactY: timeSigBaselineY
    });

  // DebugLogger.log('🎼 Rendering measures');
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
  // DebugLogger.log('✅ Analyzer measures prepared', { count: analyzedMeasures.length });
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
  // DebugLogger.error('Analyzer preparation failed', e);
      analyzedMeasures = [];
    }

  // Use dynamic padding instead of fixed 40 to prevent overlap with multi-digit time signatures
  const lineAccumulated: number[] = new Array(lines).fill(dynamicLineStartPadding);
    
    measurePositions.forEach((mp) => {
      const x = lineAccumulated[mp.lineIndex];
      const y = mp.lineIndex * (measureHeight + 20) + 20;
      // Store actual x,y in measurePositions for later use (volta brackets, etc.)
      mp.x = x;
      mp.y = y;
      const {measure, lineIndex, width: mWidth, globalIndex} = mp;
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
  // Toujours forcer 'up' par défaut si non précisé
  const stemsDir = stemsDirection === 'down' ? 'down' : 'up';
  const mr = new MeasureRenderer(measure, x, y, mWidth, perMeasureBeamSet, placeAndSizeManager, stemsDir ?? 'up', options.displayRepeatSymbol ?? false);
  mr.drawMeasure(svg, globalIndex, notePositions, grid);

      // Draw analyzer beams overlay
      if (analyzedMeasures[globalIndex]) {
        drawAnalyzerBeams(svg, analyzedMeasures[globalIndex], globalIndex, notePositions as any, stemsDir);
      }
      lineAccumulated[lineIndex] += mWidth;
    });

    // Draw volta brackets (after all measures are rendered)
    this.drawVoltaBrackets(svg, measurePositions, placeAndSizeManager);

  // DebugLogger supprimé
  
  // draw ties using collected notePositions and the TieManager for cross-line ties
  this.detectAndDrawTies(svg, notePositions, width, tieManager, measurePositions, placeAndSizeManager, stemsDirection);

    // Adjust viewBox based on actual rendered elements bounds (handles repeat counts, etc.)
    const bounds = placeAndSizeManager.getGlobalBounds();
    if (bounds) {
      // Uniform margins on all sides now that all elements (including barlines) are registered
      const margin = 10;
      
      const adjustedX = Math.max(0, bounds.minX - margin);
      const adjustedY = Math.max(0, bounds.minY - margin);
      const adjustedWidth = bounds.maxX - bounds.minX + margin * 2;
      const adjustedHeight = bounds.maxY - bounds.minY + margin * 2;
      
      svg.setAttribute('viewBox', `${adjustedX} ${adjustedY} ${adjustedWidth} ${adjustedHeight}`);
      
      // Also update background rect to match new viewBox
      const bg = svg.querySelector('rect[fill="white"]');
      if (bg) {
        bg.setAttribute('x', adjustedX.toString());
        bg.setAttribute('y', adjustedY.toString());
        bg.setAttribute('width', adjustedWidth.toString());
        bg.setAttribute('height', adjustedHeight.toString());
      }
    }

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
    notePositions: {x:number,y:number,headLeftX?:number,headRightX?:number,measureIndex:number,chordIndex:number,beatIndex:number,noteIndex:number,tieStart?:boolean,tieEnd?:boolean,tieToVoid?:boolean,tieFromVoid?:boolean,stemTopY?:number,stemBottomY?:number,value?:number}[],
    svgWidth: number,
    tieManager: TieManager,
    measurePositions: {measure: any, lineIndex: number, posInLine: number, globalIndex: number, width: number}[],
    placeAndSizeManager?: PlaceAndSizeManager,
    stemsDirection?: 'up' | 'down'
  ) {
  // DebugLogger supprimé
    // Precompute visual X bounds for each measure to draw half-ties to the measure edge
  // Use same dynamic padding as measure start to align tie rendering
  const lineStartPadding = (svg as any).__dynamicLineStartPadding ?? 40;
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
  // DebugLogger supprimé
    
    for (let i = 0; i < notePositions.length; i++) {
      const cur = notePositions[i];
      
      // Only process notes with tieStart that haven't been marked as tieToVoid yet
      if (cur.tieStart && !cur.tieToVoid) {
        // Find the line index of this note's measure
        const curMeasurePos = measurePositions.find(mp => mp.globalIndex === cur.measureIndex);
        if (!curMeasurePos) continue;
        
        // Search for the matching tieEnd or tieFromVoid
        // Improved search: prefer a tieEnd on the SAME line first. Only if none exists
        // and a cross-line target is found do we convert to tieToVoid.
        let sameLineTarget: typeof notePositions[0] | null = null;
        let crossLineTarget: typeof notePositions[0] | null = null;
        for (let j = i + 1; j < notePositions.length; j++) {
          const target = notePositions[j];
          if (!(target.tieEnd || target.tieFromVoid)) continue;
          const targetMeasurePos = measurePositions.find(mp => mp.globalIndex === target.measureIndex);
          if (!targetMeasurePos) continue;
          // BUGFIX: Check both measureIndex AND lineIndex to distinguish same-measure vs cross-line
          // If same measure, definitely keep as normal tie (not tieToVoid)
          if (target.measureIndex === cur.measureIndex) {
            sameLineTarget = target;
            break; // found intra-measure target, stop
          } else if (targetMeasurePos.lineIndex === curMeasurePos.lineIndex) {
            // Different measure but same line: also normal tie
            sameLineTarget = target;
            break;
          } else if (!crossLineTarget) {
            crossLineTarget = target; // keep first cross-line candidate while we continue searching for same-line
          }
        }
        if (!sameLineTarget && crossLineTarget) {
          cur.tieToVoid = true;
          if (!crossLineTarget.tieFromVoid) crossLineTarget.tieFromVoid = true;
          cur.tieStart = false; // avoid normal tie rendering pass
        }
      }
    }
    
    const matched = new Set<number>();

    // Nettoyage : suppression du log des notes avec tie markers

    const dotsForCollisions = placeAndSizeManager ? placeAndSizeManager.getElements().filter(e => e.type === 'dot') : [];
    const fallbackStemsOrientation: 'up' | 'down' = stemsDirection ?? 'down';
    const inferStemsOrientation = (
      note: { y: number; stemTopY?: number; stemBottomY?: number }
    ): 'up' | 'down' => {
      if (note.stemTopY !== undefined && note.stemBottomY !== undefined) {
        return note.stemTopY <= note.y ? 'up' : 'down';
      }
      return fallbackStemsOrientation;
    };
    const resolveAnchorY = (
      note: { y: number; stemTopY?: number; stemBottomY?: number; headLeftX?: number; headRightX?: number; x: number; value?: number; },
      edge: 'left' | 'right',
      orientation: 'up' | 'down'
    ): number => {
      const stemCandidate = orientation === 'up' ? note.stemBottomY : note.stemTopY;
      const headEdge = edge === 'right' ? note.headRightX : note.headLeftX;
      const horizontalHalf = headEdge !== undefined ? Math.abs(headEdge - note.x) : 0;
      const baselineOffset = Math.max(3, Math.min(5, horizontalHalf > 0 ? horizontalHalf * 0.6 : 3));
      let anchor = stemCandidate;
      if (anchor === undefined || (orientation === 'up' ? anchor <= note.y : anchor >= note.y)) {
        anchor = note.y + (orientation === 'up' ? baselineOffset : -baselineOffset);
      }
      
      // Clearance adapté selon l'orientation et le point (départ/arrivée)
      let clearance: number;
      if (orientation === 'up') {
        // Stems up: liaisons en dessous
        // Start (right): rapprocher BEAUCOUP plus → clearance négative pour coller à la tête
        // End (left): décoller → clearance plus forte (OK)
        clearance = edge === 'right' ? -1 : 3.5;
      } else {
        // Stems down: liaisons au-dessus
        // Start (right): décoller → clearance plus forte (OK)
        // End (left): rapprocher BEAUCOUP plus → clearance négative pour coller à la tête
        clearance = edge === 'right' ? 3.5 : -1;
      }
      
      return anchor + (orientation === 'up' ? clearance : -clearance);
    };

    const drawCurve = (
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      isCross: boolean,
      orientation: 'up' | 'down',
      meta?: { start?: { measureIndex:number; chordIndex:number; beatIndex:number; noteIndex:number }; end?: { measureIndex:number; chordIndex:number; beatIndex:number; noteIndex:number }; half?: boolean }
    ) => {
    // Nettoyage : suppression du log debug
      
      const path = document.createElementNS(SVG_NS, 'path');
      const dx = Math.abs(endX - startX);
      const baseAmp = Math.min(40, Math.max(8, dx / 6));
      
      // Position de la courbe selon la direction des hampes
      // Hampes UP : liaisons EN DESSOUS des notes (controlY plus grand)
      // Hampes DOWN : liaisons AU DESSUS des notes (controlY plus petit)
      let controlY: number;
      if (orientation === 'up') {
        // Liaisons en dessous
        controlY = Math.max(startY, endY) + (isCross ? baseAmp + 10 : baseAmp);
      } else {
        // Liaisons au-dessus (comportement original)
        controlY = Math.min(startY, endY) - (isCross ? baseAmp + 10 : baseAmp);
      }
      
      // Collision avoidance: adjust curve if any dot overlaps
      if (placeAndSizeManager) {
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const preliminaryTopY = orientation === 'up' ? Math.min(startY, endY) : controlY;
        const preliminaryBottomY = orientation === 'up' ? controlY : Math.max(startY, endY);
        const overlappingDot = dotsForCollisions.find(d => {
          const db = d.bbox;
          const horiz = db.x < maxX && (db.x + db.width) > minX;
          const vert = db.y + db.height >= preliminaryTopY && db.y <= preliminaryBottomY;
          return horiz && vert;
        });
        if (overlappingDot) {
          const adjust = Math.max(6, baseAmp * 0.6);
          controlY += orientation === 'up' ? adjust : -adjust;
        }
      }
      const midX = (startX + endX) / 2;
      const d = `M ${startX} ${startY} Q ${midX} ${controlY} ${endX} ${endY}`;
      path.setAttribute('d', d);
      path.setAttribute('stroke', '#000');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('fill', 'none');
      if (meta?.half) {
        path.setAttribute('data-half-tie', '1');
      }
      if (meta?.start) {
        const s = meta.start;
        path.setAttribute('data-start', `${s.measureIndex}:${s.chordIndex}:${s.beatIndex}:${s.noteIndex}`);
      }
      if (meta?.end) {
        const e = meta.end;
        path.setAttribute('data-end', `${e.measureIndex}:${e.chordIndex}:${e.beatIndex}:${e.noteIndex}`);
      }
      svg.appendChild(path);
      // Register tie bounding box approximation
      if (placeAndSizeManager) {
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const topY = Math.min(controlY, startY, endY);
        const bottomY = Math.max(controlY, startY, endY);
        placeAndSizeManager.registerElement('tie', { 
          x: minX, 
          y: topY, 
          width: maxX - minX, 
          height: bottomY - topY 
        }, 3, { 
          cross: isCross,
          exactX: (startX + endX) / 2,
          exactY: controlY
        });
      }
    };

    const drawHalfToMeasureRight = (measureIdx: number, startX: number, startY: number, orientation: 'up' | 'down', startMeta?: { measureIndex:number; chordIndex:number; beatIndex:number; noteIndex:number }) => {
      const bounds = measureXB[measureIdx];
      const marginX = bounds ? bounds.xEnd - 8 : (svgWidth - 16);
      drawCurve(startX, startY, marginX, startY, true, orientation, { start: startMeta, half: true });
      return { x: marginX, y: startY };
    };

    const drawHalfFromMeasureLeft = (measureIdx: number, endX: number, endY: number, orientation: 'up' | 'down', endMeta?: { measureIndex:number; chordIndex:number; beatIndex:number; noteIndex:number }) => {
      const bounds = measureXB[measureIdx];
      // Slightly reduce the inset to start closer to the left barline
      const startX = bounds ? bounds.xStart + 4 : 16;
      drawCurve(startX, endY, endX, endY, true, orientation, { end: endMeta, half: true });
    };

    // Primary pass: match each tieStart to the next available tieEnd (temporal order)
  // DebugLogger supprimé
    for (let i = 0; i < notePositions.length; i++) {
      if (matched.has(i)) continue;
      const cur = notePositions[i];

      // compute visual anchor points (prefer head bounds when available)
      const orientation = inferStemsOrientation(cur);
      
      // Check if this is a diamond-shaped note head (whole or half note)
      const isDiamond = cur.value === 1 || cur.value === 2;
      
      let startX: number;
      if (isDiamond) {
        // Diamond notes: tie anchors at center X (on the diamond's tip)
        startX = cur.x;
      } else {
        // Slash notes: tie anchors at edge depending on stem direction
        // Stems up: start from left edge of note head
        // Stems down: start from right edge of note head
        startX = orientation === 'up' 
          ? ((cur.headLeftX !== undefined) ? cur.headLeftX : cur.x)
          : ((cur.headRightX !== undefined) ? cur.headRightX : cur.x);
      }
      const startY = resolveAnchorY(cur, orientation === 'up' ? 'left' : 'right', orientation);

      if (cur.tieStart || cur.tieToVoid) {
  // Nettoyage : suppression du log debug
        
        // If already marked as tieToVoid by post-processing, draw half-tie immediately
        if (cur.tieToVoid) {
          // Nettoyage : suppression du log debug
          const pending = drawHalfToMeasureRight(cur.measureIndex, startX, startY, orientation);
          tieManager.addPendingTie(cur.measureIndex, pending.x, pending.y);
          matched.add(i);
          continue;
        }
        
        // Otherwise, it's a normal tieStart - search for matching tieEnd
        
        // search for a direct tieEnd after i
        let found = -1;
        // Prioritaire : chercher un tieEnd dans la MÊME mesure avant d'élargir
        for (let j = i + 1; j < notePositions.length; j++) {
          if (matched.has(j)) continue;
          const cand = notePositions[j];
          if (!cand.tieEnd) continue;
          if (cand.measureIndex === cur.measureIndex) { found = j; break; }
        }
        // Si pas trouvé dans la même mesure, chercher globalement ensuite
        if (found < 0) {
          for (let j = i + 1; j < notePositions.length; j++) {
            if (matched.has(j)) continue;
            const cand = notePositions[j];
            if (cand.tieEnd) { found = j; break; }
          }
        }

        if (found >= 0) {
          // Nettoyage : suppression du log debug
  // Nettoyage : suppression du log debug
          const tgt = notePositions[found];
          const targetOrientation = inferStemsOrientation(tgt);
          
          // Check if this is a diamond-shaped note head (whole or half note)
          const isTargetDiamond = tgt.value === 1 || tgt.value === 2;
          
          let endX: number;
          if (isTargetDiamond) {
            // Diamond notes: tie anchors at center X (on the diamond's tip)
            endX = tgt.x;
          } else {
            // Slash notes: tie anchors at edge depending on stem direction
            // Stems up: end at left edge of note head
            // Stems down: end at right edge of note head
            endX = targetOrientation === 'up'
              ? ((tgt.headLeftX !== undefined) ? tgt.headLeftX : tgt.x)
              : ((tgt.headRightX !== undefined) ? tgt.headRightX : tgt.x);
          }
          const endY = resolveAnchorY(tgt, targetOrientation === 'up' ? 'left' : 'right', targetOrientation);
          drawCurve(startX, startY, endX, endY, cur.measureIndex !== tgt.measureIndex, targetOrientation, {
            start: { measureIndex: cur.measureIndex, chordIndex: cur.chordIndex, beatIndex: cur.beatIndex, noteIndex: cur.noteIndex },
            end: { measureIndex: tgt.measureIndex, chordIndex: tgt.chordIndex, beatIndex: tgt.beatIndex, noteIndex: tgt.noteIndex }
          });
          matched.add(i);
          matched.add(found);
          continue;
        }

  // DebugLogger supprimé
        
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
            // Nettoyage : suppression du log debug
            const pending = drawHalfToMeasureRight(cur.measureIndex, startX, startY, orientation);
            tieManager.addPendingTie(cur.measureIndex, pending.x, pending.y);
            matched.add(i);
            // Don't mark the target to allow the start-of-line branch to draw the second half
          } else {
            // Nettoyage : suppression du log debug
  // Nettoyage : suppression du log debug
            const targetOrientation = inferStemsOrientation(tgt);
            
            // Check if this is a diamond-shaped note head (whole or half note)
            const isTargetDiamond = tgt.value === 1 || tgt.value === 2;
            
            let endX: number;
            if (isTargetDiamond) {
              // Diamond notes: tie anchors at center X (on the diamond's tip)
              endX = tgt.x;
            } else {
              // Slash notes: tie anchors at edge depending on stem direction
              // Stems up: end at left edge of note head
              // Stems down: end at right edge of note head
              endX = targetOrientation === 'up'
                ? ((tgt.headLeftX !== undefined) ? tgt.headLeftX : tgt.x)
                : ((tgt.headRightX !== undefined) ? tgt.headRightX : tgt.x);
            }
            const endY = resolveAnchorY(tgt, targetOrientation === 'up' ? 'left' : 'right', targetOrientation);
            drawCurve(startX, startY, endX, endY, false, targetOrientation, {
              start: { measureIndex: cur.measureIndex, chordIndex: cur.chordIndex, beatIndex: cur.beatIndex, noteIndex: cur.noteIndex },
              end: { measureIndex: tgt.measureIndex, chordIndex: tgt.chordIndex, beatIndex: tgt.beatIndex, noteIndex: tgt.noteIndex }
            });
            matched.add(i);
            matched.add(foundFromVoid);
          }
          continue;
        }

  // DebugLogger supprimé
      }

      // If this note marks the start of a tie from the previous line
      if (cur.tieFromVoid && !matched.has(i)) {
  // Nettoyage : suppression du log debug
  // Nettoyage : suppression du log debug

        let endX = (cur.headLeftX !== undefined) ? cur.headLeftX : cur.x;
        const orientation = inferStemsOrientation(cur);
        let endY = resolveAnchorY(cur, 'left', orientation);

        // Always draw the start-of-line half from measure left edge into the note.
  drawHalfFromMeasureLeft(cur.measureIndex, endX, endY, orientation, { measureIndex: cur.measureIndex, chordIndex: cur.chordIndex, beatIndex: cur.beatIndex, noteIndex: cur.noteIndex });
        matched.add(i);
      }
    }
    
    // Nettoyage : suppression du bloc orphelin

    // Tie curves already adjusted during drawing if collision with dots detected.
  }

  /**
   * Draw volta brackets above measures.
   * 
   * Scans all measures for voltaStart/voltaEnd properties and draws brackets
   * spanning the appropriate measures.
   * 
   * @param svg - SVG parent element
   * @param measurePositions - Array of measure positions with coordinates
   * @param placeAndSizeManager - Manager for registering collision boxes
   */
  private drawVoltaBrackets(
    svg: SVGElement,
    measurePositions: Array<{ measure: Measure; lineIndex: number; posInLine: number; globalIndex: number; width: number; x?: number; y?: number }>,
    placeAndSizeManager: PlaceAndSizeManager
  ): void {
    // Get all barlines from PlaceAndSizeManager instead of recalculating positions
    const allBarlines = placeAndSizeManager.getElements()
      .filter(el => el.type === 'barline' && el.metadata?.exactX !== undefined)
      .map(el => ({
        exactX: el.metadata.exactX,
        y: el.bbox.y,
        measureIndex: el.metadata.measureIndex,
        side: el.metadata.side,
        type: el.metadata.type
      }));

    // Find all volta starts
    for (let i = 0; i < measurePositions.length; i++) {
      const mp = measurePositions[i];
      const measure = mp.measure as any;
      
      if (measure.voltaStart) {
        // Find the corresponding end measure
        let endMeasureIndex = i;
        for (let j = i; j < measurePositions.length; j++) {
          const endMeasure = measurePositions[j].measure as any;
          // Compare volta info by text value since voltaEnd is a copy of voltaStart
          if (endMeasure.voltaEnd && endMeasure.voltaEnd.text === measure.voltaStart.text) {
            endMeasureIndex = j;
            break;
          }
        }
        
        const startMP = measurePositions[i];
        const endMP = measurePositions[endMeasureIndex];
        
        // Only draw volta if start and end are on the same line
        if (startMP.lineIndex === endMP.lineIndex && startMP.x !== undefined && endMP.x !== undefined && startMP.y !== undefined) {
          // Find the barlines for exact positioning
          // Volta left hook: right barline of previous measure (or left barline of first measure if no previous)
          let startX: number;
          let startBarline: any;
          if (i > 0 && measurePositions[i - 1].lineIndex === startMP.lineIndex) {
            // Previous measure exists on same line - use its right barline
            const prevMeasureIndex = measurePositions[i - 1].globalIndex;
            startBarline = allBarlines.find(
              bl => bl.measureIndex === prevMeasureIndex && bl.side === 'right'
            );
            startX = startBarline?.exactX ?? (startMP.x! + startMP.width - 2);
          } else {
            // First measure of line - use its left barline
            startBarline = allBarlines.find(
              bl => bl.measureIndex === startMP.globalIndex && bl.side === 'left'
            );
            startX = startBarline?.exactX ?? startMP.x!;
          }
          
          // Volta right hook: right barline of last measure in volta
          const endRightBarline = allBarlines.find(
            bl => bl.measureIndex === endMP.globalIndex && bl.side === 'right'
          );
          let endX = endRightBarline?.exactX ?? (endMP.x! + endMP.width - 2);
          
          // Adjust endX to reach the rightmost visible part of double barlines
          if (endRightBarline?.type === 'repeat-end') {
            // :|| has thin line at x, thick line (stroke-width: 3) at x+6
            // Thick line extends to x+6+1.5 = x+7.5
            endX += 7.5;
          } else if (endRightBarline?.type === 'final-double') {
            // || has thin line at x, thick line (stroke-width: 5) at x+6
            // Thick line extends to x+6+2.5 = x+8.5
            endX += 8.5;
          }
          
          // Position volta horizontal line at the TOP of the barline
          // The volta line forms a right angle with the top of the barline
          const y = startBarline?.y ?? startMP.y;
          const hookHeight = 15; // Height of descending hooks
          const textSize = 14; // Font size for volta numbers
          const estimatedTextHeight = textSize + 4; // Text height with some padding
          
          const voltaInfo = measure.voltaStart;
          
          // Draw horizontal line
          const horizontalLine = document.createElementNS(SVG_NS, 'line');
          horizontalLine.setAttribute('x1', startX.toString());
          horizontalLine.setAttribute('y1', y.toString());
          horizontalLine.setAttribute('x2', endX.toString());
          horizontalLine.setAttribute('y2', y.toString());
          horizontalLine.setAttribute('stroke', '#000');
          horizontalLine.setAttribute('stroke-width', '1.5');
          svg.appendChild(horizontalLine);
          
          // Draw left descending hook (always present) - aligned with barline
          const leftHook = document.createElementNS(SVG_NS, 'line');
          leftHook.setAttribute('x1', startX.toString());
          leftHook.setAttribute('y1', y.toString());
          leftHook.setAttribute('x2', startX.toString());
          leftHook.setAttribute('y2', (y + hookHeight).toString());
          leftHook.setAttribute('stroke', '#000');
          leftHook.setAttribute('stroke-width', '1.5');
          svg.appendChild(leftHook);
          
          // Draw right descending hook (only if closed)
          if (voltaInfo.isClosed) {
            const rightHook = document.createElementNS(SVG_NS, 'line');
            rightHook.setAttribute('x1', endX.toString());
            rightHook.setAttribute('y1', y.toString());
            rightHook.setAttribute('x2', endX.toString());
            rightHook.setAttribute('y2', (y + hookHeight).toString());
            rightHook.setAttribute('stroke', '#000');
            rightHook.setAttribute('stroke-width', '1.5');
            svg.appendChild(rightHook);
          }
          
          // Draw text label BELOW the bracket line (instead of above)
          // Check if the start barline is a repeat-start to add extra spacing
          const isAfterRepeatStart = startBarline?.type === 'repeat-start';
          const textOffset = isAfterRepeatStart ? 15 : 5; // More space after ||: to avoid collision with dots
          
          const voltaText = document.createElementNS(SVG_NS, 'text');
          voltaText.setAttribute('x', (startX + textOffset).toString());
          voltaText.setAttribute('y', (y + textSize + 2).toString()); // BELOW: y + textSize + gap
          voltaText.setAttribute('font-family', 'Arial, sans-serif');
          voltaText.setAttribute('font-size', `${textSize}px`);
          voltaText.setAttribute('font-weight', 'normal');
          voltaText.setAttribute('fill', '#000');
          voltaText.setAttribute('text-anchor', 'start');
          voltaText.textContent = voltaInfo.text;
          svg.appendChild(voltaText);
          
          // Register in collision manager with proper dimensions
          // Volta is above staff: line at y, hooks descend DOWN, text is BELOW the line
          placeAndSizeManager.registerElement('volta-bracket', {
            x: startX,
            y: y, // Top is the horizontal line
            width: endX - startX,
            height: hookHeight + estimatedTextHeight // hooks + text below
          }, 1, { 
            text: voltaInfo.text, 
            isClosed: voltaInfo.isClosed,
            exactX: (startX + endX) / 2,
            exactY: y + hookHeight / 2
          });
        }
      }
    }
  }
}
