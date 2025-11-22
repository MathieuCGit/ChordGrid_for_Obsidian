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
  /** Mode des coups de médiator ('off', 'auto', '8', '16'). Par défaut 'off'. */
  pickStrokes?: 'off' | 'auto' | '8' | '16';
}

/**
 * Structure représentant une ligne de rendu calculée.
 */
export interface RenderLine {
    measures: Measure[]; // Les mesures qui vont sur cette ligne
    width: number;       // Largeur totale utilisée par les mesures
    height: number;      // Hauteur de la ligne
    startY: number;      // Position Y de départ de la ligne
}

/**
 * Classe principale pour le rendu SVG des grilles d'accords.
 */
export class SVGRenderer {
  // Constantes pour le calcul de layout
  private readonly BASE_MEASURE_WIDTH = 240;
  private readonly SEPARATOR_WIDTH = 12;
  private readonly INNER_PADDING_PER_SEGMENT = 20;
  private readonly HEAD_HALF_MAX = 6;
  private readonly MEASURE_HEIGHT = 120;
  private readonly LINE_VERTICAL_SPACING = 20; // Espace entre les lignes

  /**
   * Calcule l'espacement minimum pour une valeur rythmique donnée.
   */
  private getMinSpacingForValue(v: number): number {
    if (v >= 64) return 16;
    if (v >= 32) return 20;
    if (v >= 16) return 26;
    if (v >= 8)  return 24;
    return 20;
  }

  /**
   * Calcule la largeur requise pour un temps (beat).
   */
  private calculateBeatWidth(beat: any): number {
    const noteCount = beat?.notes?.length || 0;
    if (noteCount <= 1) return 28 + 10 + this.HEAD_HALF_MAX;
    
    const spacing = Math.max(
      ...beat.notes.map((n: any) => {
        const base = this.getMinSpacingForValue(n.value);
        return n.isRest ? base + 4 : base;
      })
    );
    return 10 + 10 + this.HEAD_HALF_MAX + (noteCount - 1) * spacing + 8;
  }

  /**
   * Calcule la largeur totale requise pour une mesure.
   */
  private calculateMeasureWidth(measure: Measure): number {
    const segments = measure.chordSegments || [{ chord: measure.chord, beats: measure.beats }];
    let width = 0;
    
    segments.forEach((seg: any, idx: number) => {
      if (idx > 0 && seg.leadingSpace) width += this.SEPARATOR_WIDTH;
      const beatsWidth = (seg.beats || []).reduce((acc: number, b: any) => acc + this.calculateBeatWidth(b), 0);
      width += beatsWidth + this.INNER_PADDING_PER_SEGMENT;
    });
    
    return Math.max(this.BASE_MEASURE_WIDTH, Math.ceil(width));
  }

  /**
   * Calcule la mise en page (layout) des mesures en lignes.
   */
  private calculateLayout(measures: Measure[], maxWidth: number): RenderLine[] {
    const lines: RenderLine[] = [];
    let currentLineMeasures: Measure[] = [];
    let currentLineWidth = 0;
    let currentY = 0;

    for (const measure of measures) {
      const measureWidth = this.calculateMeasureWidth(measure);
      
      // Détection du saut de ligne
      // 1. Manque de place (sauf si c'est la première mesure de la ligne)
      const isOverflowing = currentLineMeasures.length > 0 && 
                           (currentLineWidth + measureWidth) > maxWidth;
      
      // 2. Saut de ligne forcé (futur flag utilisateur)
      const forceBreak = false; // measure.flags?.forceLineBreak;

      if (isOverflowing || forceBreak) {
        // Finaliser la ligne courante
        lines.push({
          measures: currentLineMeasures,
          width: currentLineWidth,
          height: this.MEASURE_HEIGHT,
          startY: currentY
        });

        // Préparer la nouvelle ligne
        currentLineMeasures = [];
        currentLineWidth = 0;
        currentY += this.MEASURE_HEIGHT + this.LINE_VERTICAL_SPACING;
      }

      currentLineMeasures.push(measure);
      currentLineWidth += measureWidth;
    }

    // Ajouter la dernière ligne si elle contient des mesures
    if (currentLineMeasures.length > 0) {
      lines.push({
        measures: currentLineMeasures,
        width: currentLineWidth,
        height: this.MEASURE_HEIGHT,
        startY: currentY
      });
    }

    return lines;
  }

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
    const dynamicMeasureWidths = grid.measures.map(m => this.calculateMeasureWidth(m));

    // Build linear positions honoring line breaks and available line width budget
    const maxLineWidth = measuresPerLine * baseMeasureWidth; // budget per line (before margins)
    const renderLines = this.calculateLayout(grid.measures, maxLineWidth);
    this.resolveCrossLineTies(renderLines);

    // Reconstruct measurePositions for compatibility with existing methods
    const measurePositions: {measure: any, lineIndex: number, posInLine: number, globalIndex: number, width: number, x?: number, y?: number}[] = [];
    let globalIndex = 0;
    
    renderLines.forEach((line, lineIndex) => {
        line.measures.forEach((measure, posInLine) => {
            // Mark line start for MeasureRenderer
            (measure as any).__isLineStart = (posInLine === 0);
            
            measurePositions.push({
                measure,
                lineIndex,
                posInLine,
                globalIndex: globalIndex++,
                width: this.calculateMeasureWidth(measure)
            });
        });
    });

    // DebugLogger.log('📊 Layout calculated', { 
    //   totalLines: renderLines.length, 
    //   totalMeasures: grid.measures.length 
    // });

    const lines = renderLines.length;
    // Compute SVG width as max line accumulation plus margins
    const width = Math.max(...renderLines.map(l => l.width), baseMeasureWidth) + 60;
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
    
    // Note: Time signature is registered in the first line context later if needed, 
    // but since it's static at top left, we can just draw it.
    // If we want it to collide properly on line 1, we should register it inside the loop for line 1.

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
  // const lineAccumulated: number[] = new Array(lines).fill(dynamicLineStartPadding);
    
    // ========== ARCHITECTURE LINE-SCOPED ==========
    // On traite chaque ligne comme un univers clos pour les collisions
    
    let globalMeasureIndex = 0;

    renderLines.forEach((line, lineIndex) => {
        // 1. RESET DU CONTEXTE SPATIAL
        placeAndSizeManager.clearAll();
        
        // Register time signature on first line to avoid collision
        if (lineIndex === 0) {
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
        }

        const lineY = line.startY + 20; // Marge top
        let currentX = (svg as any).__dynamicLineStartPadding || 40;

        // 2. CONSTRUCTION DES POSITIONS LOCALES
        const lineMeasurePositions: any[] = [];
        
        line.measures.forEach((measure, posInLine) => {
            const mWidth = this.calculateMeasureWidth(measure);
            (measure as any).__isLineStart = (posInLine === 0);
            
            lineMeasurePositions.push({
                measure,
                lineIndex,
                posInLine,
                globalIndex: globalMeasureIndex++,
                width: mWidth,
                x: currentX,
                y: lineY
            });
            
            currentX += mWidth;
        });

        // 3. PLANIFICATION & RÉSOLUTION LOCALE
        this.planBarlines(lineMeasurePositions, placeAndSizeManager);
        this.planVoltaText(lineMeasurePositions, placeAndSizeManager);
        placeAndSizeManager.resolveAllCollisions();

        const stemsDir = stemsDirection === 'down' ? 'down' : 'up';

        // 4. RENDU DES MESURES
        lineMeasurePositions.forEach((mp) => {
            const {measure, globalIndex, width: mWidth, x, y} = mp;
            
            // Préparation des beams (logique existante)
            let perMeasureBeamSet: Set<string> | undefined;
            if (level1BeamSet) {
                perMeasureBeamSet = new Set<string>();
                analyzedMeasures[globalIndex]?.beamGroups?.forEach((g: any) => {
                    if (g.level === 1 && !g.isPartial && g.notes.length >= 2) {
                        g.notes.forEach((r: any) => {
                            perMeasureBeamSet!.add(`${r.segmentIndex}:${r.noteIndex}`);
                        });
                    }
                });
            }

            const mr = new MeasureRenderer(measure, x, y, mWidth, perMeasureBeamSet, placeAndSizeManager, stemsDir ?? 'up', options.displayRepeatSymbol ?? false);
            mr.drawMeasure(svg, globalIndex, notePositions, grid);

            // Draw analyzer beams overlay
            if (analyzedMeasures[globalIndex]) {
                drawAnalyzerBeams(svg, analyzedMeasures[globalIndex], globalIndex, notePositions as any, stemsDir);
            }
        });

        // 5. DESSIN DES ÉLÉMENTS DE DÉCORATION LOCAUX
        this.drawVoltaBrackets(svg, lineMeasurePositions, placeAndSizeManager);
        
        // Filtrer les notes de la ligne courante pour les méthodes suivantes
        const currentLineNotes = notePositions.filter(n => 
            lineMeasurePositions.some(mp => mp.globalIndex === n.measureIndex)
        );

        const allowedMeasureIndices = new Set(lineMeasurePositions.map(mp => mp.globalIndex));

        // Enregistrement des Pick-Strokes (Ligne courante uniquement)
        this.preRegisterPickStrokes(grid, notePositions as any, placeAndSizeManager, stemsDirection, options, allowedMeasureIndices);
        
        // Dessin des Liaisons (Ligne courante uniquement)
        this.detectAndDrawTies(svg, notePositions, width, tieManager, measurePositions, placeAndSizeManager, stemsDirection, allowedMeasureIndices);

        // Dessin des Pick-Strokes (Ligne courante uniquement)
        this.drawPickStrokes(svg, grid, notePositions as any, placeAndSizeManager, stemsDirection, options, allowedMeasureIndices);
    });

    // Adjust viewBox based on actual rendered elements bounds (handles repeat counts, etc.)
    const bounds = placeAndSizeManager.getGlobalBounds(); // Attention: ne contient que la dernière ligne !
    // TODO: Il faudra calculer les bounds globaux différemment ou accumuler
    
    // Pour l'instant on garde le width/height calculé par le layout
    // const margin = 10;
    // svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    
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
    stemsDirection?: 'up' | 'down',
    allowedMeasureIndices?: Set<number>
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
      // Hampes DOWN : liaisons AU-DESSUS des notes (controlY plus petit)
      let controlY: number;
      if (orientation === 'up') {
        // Liaisons en dessous
        controlY = Math.max(startY, endY) + (isCross ? baseAmp + 10 : baseAmp);
      } else {
        // Liaisons au-dessus (comportement original)
        controlY = Math.min(startY, endY) - (isCross ? baseAmp + 10 : baseAmp);
      }
      
      // Éviter les collisions avec les pick-strokes (layer decoration)
      // Scanner tous les pick-strokes dans la zone horizontale ET verticale pertinente
      if (placeAndSizeManager) {
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const decorationElements = placeAndSizeManager.getElements().filter(e => e.type === 'pick-stroke');
        
        // Déterminer la zone verticale où la liaison sera tracée
        const tieReferenceY = orientation === 'up' ? Math.max(startY, endY) : Math.min(startY, endY);
        
        // Trouver les limites verticales des pick-strokes dans cette zone
        let decorationTop = Infinity;
        let decorationBottom = -Infinity;
        let hasRelevantPickStroke = false;
        
        decorationElements.forEach((elem) => {
          const db = elem.bbox;
          
          // Vérifier si le pick-stroke est dans la zone horizontale de la tie
          const horizOverlap = db.x < maxX && (db.x + db.width) > minX;
          if (!horizOverlap) return;
          
          // Vérifier si le pick-stroke est dans la bonne zone verticale
          // - Pour orientation 'up' (liaisons en dessous) : pick-stroke doit être en dessous des notes
          // - Pour orientation 'down' (liaisons au-dessus) : pick-stroke doit être au-dessus des notes
          const pickStrokeCenterY = db.y + db.height / 2;
          
          // Plus besoin de MAX_VERTICAL_DISTANCE car PlaceAndSizeManager est scopé à la ligne
          const isInRelevantVerticalZone = orientation === 'up' 
            ? (pickStrokeCenterY > tieReferenceY) // pick-stroke en dessous
            : (pickStrokeCenterY < tieReferenceY); // pick-stroke au-dessus
          
          if (isInRelevantVerticalZone) {
            decorationTop = Math.min(decorationTop, db.y);
            decorationBottom = Math.max(decorationBottom, db.y + db.height);
            hasRelevantPickStroke = true;
          }
        });
        
        // Ajuster controlY si conflit avec un pick-stroke pertinent
        if (hasRelevantPickStroke && decorationTop !== Infinity) {
          const clearance = 4; // Marge de sécurité
          const oldControlY = controlY;
          if (orientation === 'up') {
            // Liaisons en dessous : si controlY entre dans la zone decoration, repousser vers le bas
            if (controlY < decorationBottom + clearance) {
              controlY = decorationBottom + clearance;
            }
          } else {
            // Liaisons au-dessus : si controlY entre dans la zone decoration, repousser vers le haut
            if (controlY > decorationTop - clearance) {
              controlY = decorationTop - clearance;
            }
          }
          console.log(`controlY adjusted: ${oldControlY.toFixed(2)} → ${controlY.toFixed(2)}`);
        } else {
          console.log('No relevant pick-stroke found, controlY unchanged');
        }
        console.log('=================\n');
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

      // FILTRE: Si on ne traite qu'une ligne spécifique, ignorer les notes des autres mesures
      if (allowedMeasureIndices && !allowedMeasureIndices.has(cur.measureIndex)) continue;

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
   * PHASE 1: Planifie les positions des barlines sans les dessiner.
   * 
   * @param measurePositions - Array of measure positions
   * @param placeAndSizeManager - Collision detection manager
   */
  private planBarlines(
    measurePositions: Array<{ measure: Measure; lineIndex: number; posInLine: number; globalIndex: number; width: number; x?: number; y?: number }>,
    placeAndSizeManager: PlaceAndSizeManager
  ): void {
    measurePositions.forEach((mp, i) => {
      if (mp.x === undefined || mp.y === undefined) return;
      
      const measure = mp.measure as any;
      const leftBarX = mp.x;
      const rightBarX = mp.x + mp.width - 2;
      const y = mp.y;
      const height = 120;
      
      // Plan left barline (for first measure or repeat-start)
      if (i === 0 || measure.__isLineStart || measure.isRepeatStart) {
        const barlineType = measure.isRepeatStart ? 'repeat-start' : 'normal';
        placeAndSizeManager.planElement('barline', {
          x: leftBarX - 3,
          y: y,
          width: 6,
          height: height
        }, 100, // High priority - barlines are fixed
        { exactX: leftBarX, measureIndex: mp.globalIndex, side: 'left', type: barlineType },
        { exactX: leftBarX, measureIndex: mp.globalIndex, side: 'left', type: barlineType });
      }
      
      // Plan right barline (always present)
      let barlineType = 'normal';
      if (measure.barline === ':||' || measure.barline === 'repeat-end') {
        barlineType = 'repeat-end';
      } else if (measure.barline === '||') {
        barlineType = 'final-double';
      }
      
      placeAndSizeManager.planElement('barline', {
        x: rightBarX - 3,
        y: y,
        width: 6,
        height: height
      }, 100, // High priority - barlines are fixed
      { exactX: rightBarX, measureIndex: mp.globalIndex, side: 'right', type: barlineType },
      { exactX: rightBarX, measureIndex: mp.globalIndex, side: 'right', type: barlineType });
    });
  }

  /**
   * PHASE 1: Planifie les positions des volta text sans les dessiner.
   * 
   * @param measurePositions - Array of measure positions with x, y coordinates
   * @param placeAndSizeManager - Collision detection manager
   */
  private planVoltaText(
    measurePositions: Array<{ measure: Measure; lineIndex: number; posInLine: number; globalIndex: number; width: number; x?: number; y?: number }>,
    placeAndSizeManager: PlaceAndSizeManager
  ): void {
    // Find all volta starts and plan text positions
    for (let i = 0; i < measurePositions.length; i++) {
      const mp = measurePositions[i];
      const measure = mp.measure as any;
      
      if (measure.voltaStart) {
        const startMP = measurePositions[i];
        
        // Only process if x, y are defined
        if (startMP.x !== undefined && startMP.y !== undefined) {
          // Calculate startX - position de la barline de gauche du volta
          let startX: number;
          if (i > 0 && measurePositions[i - 1].lineIndex === startMP.lineIndex) {
            // Barline droite de la mesure précédente
            startX = measurePositions[i - 1].x! + measurePositions[i - 1].width - 2;
          } else {
            // Barline gauche de la première mesure de la ligne
            startX = startMP.x!;
          }
          
          const y = startMP.y;
          const textSize = 14;
          const textOffset = 5;
          const voltaInfo = measure.voltaStart;
          
          // Calculate initial text position
          const initialTextX = startX + textOffset;
          const textY = y + textSize + 2;
          const estimatedTextWidth = voltaInfo.text.length * (textSize * 0.6);
          
          const initialBBox = {
            x: initialTextX,
            y: textY - textSize,
            width: estimatedTextWidth,
            height: textSize
          };
          
          // Plan with lower priority than barlines (will be adjusted if collision)
          placeAndSizeManager.planElement(
            'volta-text',
            initialBBox,
            50, // Medium priority - can be adjusted
            {
              text: voltaInfo.text,
              x: initialTextX,
              y: textY,
              fontSize: textSize,
              measureIndex: i
            },
            { voltaInfo, measureIndex: i }
          );
        }
      }
    }
  }

  /**
   * Pré-enregistre les positions des barlines dans PlaceAndSizeManager.
   * Cela permet aux volta text de détecter et éviter les collisions avec les barlines.
   * 
   * @param measurePositions - Array of measure positions
   * @param placeAndSizeManager - Collision detection manager
   */
  private preRegisterBarlines(
    measurePositions: Array<{ measure: Measure; lineIndex: number; posInLine: number; globalIndex: number; width: number; x?: number; y?: number }>,
    placeAndSizeManager: PlaceAndSizeManager
  ): void {
    measurePositions.forEach((mp, i) => {
      if (mp.x === undefined || mp.y === undefined) return;
      
      const measure = mp.measure as any;
      const leftBarX = mp.x;
      const rightBarX = mp.x + mp.width - 2;
      const y = mp.y;
      const height = 120;
      
      // Register left barline (for first measure or repeat-start)
      if (i === 0 || measure.__isLineStart || measure.isRepeatStart) {
        const barlineType = measure.isRepeatStart ? 'repeat-start' : 'normal';
        placeAndSizeManager.registerElement('barline', {
          x: leftBarX - 3,
          y: y,
          width: 6,
          height: height
        }, 0, { exactX: leftBarX, measureIndex: mp.globalIndex, side: 'left', type: barlineType });
      }
      
      // Register right barline (always present)
      let barlineType = 'normal';
      if (measure.barline === ':||' || measure.barline === 'repeat-end') {
        barlineType = 'repeat-end';
      } else if (measure.barline === '||') {
        barlineType = 'final-double';
      }
      
      placeAndSizeManager.registerElement('barline', {
        x: rightBarX - 3,
        y: y,
        width: 6,
        height: height
      }, 0, { exactX: rightBarX, measureIndex: mp.globalIndex, side: 'right', type: barlineType });
    });
  }

  /**
   * PHASE 1: Planifie les positions des volta text sans les dessiner.
   * 
   * @param measurePositions - Array of measure positions with x, y coordinates
   * @param placeAndSizeManager - Collision detection manager
   */
  private preRegisterVoltaTextPositions(
    measurePositions: Array<{ measure: Measure; lineIndex: number; posInLine: number; globalIndex: number; width: number; x?: number; y?: number }>,
    placeAndSizeManager: PlaceAndSizeManager
  ): void {
    // Barlines are already pre-registered, so findFreePosition will detect them

    // Find all volta starts and calculate text positions
    for (let i = 0; i < measurePositions.length; i++) {
      const mp = measurePositions[i];
      const measure = mp.measure as any;
      
      if (measure.voltaStart) {
        const startMP = measurePositions[i];
        
        // Only process if x, y are defined
        if (startMP.x !== undefined && startMP.y !== undefined) {
          // Calculate startX - position de la barline de gauche du volta
          let startX: number;
          if (i > 0 && measurePositions[i - 1].lineIndex === startMP.lineIndex) {
            // Barline droite de la mesure précédente
            startX = measurePositions[i - 1].x! + measurePositions[i - 1].width - 2;
          } else {
            // Barline gauche de la première mesure de la ligne
            startX = startMP.x!;
          }
          
          const y = startMP.y;
          const textSize = 14;
          const textOffset = 5;
          const voltaInfo = measure.voltaStart;
          
          // Calculate initial text position
          const initialTextX = startX + textOffset;
          const textY = y + textSize + 2;
          const estimatedTextWidth = voltaInfo.text.length * (textSize * 0.6);
          
          const initialBBox = {
            x: initialTextX,
            y: textY - textSize,
            width: estimatedTextWidth,
            height: textSize
          };
          
          // Use PlaceAndSizeManager to find a collision-free position
          // The pre-registered barlines will be detected automatically
          const adjustedBBox = placeAndSizeManager.findFreePosition(
            initialBBox,
            'volta-text',      // Type of element (for layer-based collision checking)
            'horizontal',       // Adjust horizontally only
            ['volta-text', 'volta-bracket'],  // Exclude self-collision
            10                  // Max 10 attempts
          );
          
          const finalBBox = adjustedBBox || initialBBox;
          
          // Register in collision manager (priority 5 = movable)
          // Volta-text has horizontalMargin=3px (defined in getHorizontalMargin)
          placeAndSizeManager.registerElement('volta-text', finalBBox, 5, {
            text: voltaInfo.text,
            exactX: finalBBox.x + estimatedTextWidth / 2,
            exactY: textY - textSize / 2
          });
        }
      }
    }
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
          
          // Draw text label BELOW the bracket line
          // Retrieve the adjusted position from PlannedElements
          const textY = y + textSize + 2;
          
          // Find the planned volta-text element for this volta
          const plannedTexts = placeAndSizeManager.getPlannedElements().filter(el => 
            el.type === 'volta-text' && 
            el.renderData?.measureIndex === i
          );
          
          const plannedText = plannedTexts[0];
          const textX = plannedText?.adjustedBBox?.x ?? (startX + 5); // Use adjusted position or fallback
          
          const voltaText = document.createElementNS(SVG_NS, 'text');
          voltaText.setAttribute('x', textX.toString());
          voltaText.setAttribute('y', textY.toString());
          voltaText.setAttribute('font-family', 'Arial, sans-serif');
          voltaText.setAttribute('font-size', `${textSize}px`);
          voltaText.setAttribute('font-weight', 'normal');
          voltaText.setAttribute('fill', '#000');
          voltaText.setAttribute('text-anchor', 'start');
          voltaText.textContent = voltaInfo.text;
          svg.appendChild(voltaText);
          
          // Register volta-text in collision manager after drawing
          if (plannedText?.adjustedBBox) {
            placeAndSizeManager.registerElement('volta-text', plannedText.adjustedBBox, 5, {
              text: voltaInfo.text,
              exactX: plannedText.adjustedBBox.x,
              exactY: textY
            });
          }
          
          // Register volta bracket (the graphical bracket, not the text) in collision manager
          // Volta is above staff: line at y, hooks descend DOWN
          const estimatedTextWidth = voltaInfo.text.length * (textSize * 0.6);
          const estimatedTextHeight = textSize + 4;
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

  /**
   * Pré-enregistrement des pick-strokes dans PlaceAndSizeManager SANS les dessiner.
   * Cette méthode doit être appelée AVANT detectAndDrawTies() pour que les ties
   * puissent détecter et éviter les pick-strokes via le système de layers.
   * 
   * Calcule les mêmes positions que drawPickStrokes mais enregistre uniquement
   * les bounding boxes dans PlaceAndSizeManager.
   */
  private preRegisterPickStrokes(
    grid: ChordGrid,
    notePositions: Array<{ x: number; y: number; measureIndex: number; chordIndex: number; beatIndex: number; noteIndex: number; tieEnd?: boolean; tieFromVoid?: boolean; value?: number; stemTopY?: number; stemBottomY?: number }>,
    placeAndSizeManager: PlaceAndSizeManager,
    stemsDirection: 'up' | 'down',
    options: RenderOptions,
    allowedMeasureIndices?: Set<number>
  ) {
    const mode = options.pickStrokes;
    if (!mode || mode === 'off') return;

    // 1) Déterminer le débit (8 ou 16) sur l'ENSEMBLE du bloc si auto
    const forcedStep = mode === '8' ? 8 : mode === '16' ? 16 : undefined;
    const step = forcedStep ?? this.detectGlobalSubdivision(grid);

    // 2) Construire la timeline (même logique que drawPickStrokes)
    interface TimelineSlot {
      pickDirection: 'down' | 'up';
      subdivisionIndex: number;
    }
    interface NoteOnTimeline {
      measureIndex: number;
      chordIndex: number;
      beatIndex: number;
      noteIndex: number;
      subdivisionStart: number;
      isAttack: boolean;
    }

    const timeline: TimelineSlot[] = [];
    const notesOnTimeline: NoteOnTimeline[] = [];
    let currentSubdivision = 0;

    // Parcourir toutes les mesures/segments/beats/notes pour construire la timeline
    grid.measures.forEach((measure, measureIndex) => {
      const segments = measure.chordSegments || [];
      segments.forEach((segment, chordIndex) => {
        segment.beats.forEach((beat, beatIndex) => {
          beat.notes.forEach((note, noteIndex) => {
            // Calculer combien de subdivisions occupe cette note
            const noteDuration = note.value; // 1, 2, 4, 8, 16, 32, 64
            const dottedMultiplier = note.dotted ? 1.5 : 1;
            const subdivisionCount = Math.round((step / noteDuration) * dottedMultiplier);
            
            // Enregistrer cette note dans la timeline
            const isAttack = !note.isRest && !note.tieEnd && !note.tieFromVoid;
            notesOnTimeline.push({
              measureIndex,
              chordIndex,
              beatIndex,
              noteIndex,
              subdivisionStart: currentSubdivision,
              isAttack
            });
            
            // Avancer la timeline
            currentSubdivision += subdivisionCount;
          });
        });
      });
    });

    // 3) Assigner les coups de médiator à chaque position de la timeline
    let isDown = true;
    for (let i = 0; i < currentSubdivision; i++) {
      timeline.push({
        pickDirection: isDown ? 'down' : 'up',
        subdivisionIndex: i
      });
      isDown = !isDown;
    }

    // 4) Identifier les attaques réelles avec leur coup de médiator
    const attacksWithPicks = notesOnTimeline
      .filter(n => n.isAttack)
      .map(n => ({
        measureIndex: n.measureIndex,
        chordIndex: n.chordIndex,
        beatIndex: n.beatIndex,
        noteIndex: n.noteIndex,
        pickDirection: timeline[n.subdivisionStart]?.pickDirection || 'down'
      }))

    // 4) Calculer les dimensions des symboles (mêmes constantes que drawPickStrokes)
    const UPBOW_W = 24.2;
    const UPBOW_H = 39.0;
    const DOWNBOW_W = 32;
    const DOWNBOW_H = 33;
    const TARGET_H = 12;
    const MARGIN = 3;
    const NOTE_HEAD_HALF_HEIGHT = 5;

    // 5) Enregistrer les bounding boxes sans dessiner
    attacksWithPicks.forEach(attackInfo => {
      // FILTRE: Si on ne traite qu'une ligne spécifique, ignorer les autres mesures
      if (allowedMeasureIndices && !allowedMeasureIndices.has(attackInfo.measureIndex)) return;

      const notePos = notePositions.find(np =>
        np.measureIndex === attackInfo.measureIndex &&
        np.chordIndex === attackInfo.chordIndex &&
        np.beatIndex === attackInfo.beatIndex &&
        np.noteIndex === attackInfo.noteIndex
      );
      
      if (notePos) {
        const hasStem = notePos.stemTopY !== undefined && notePos.stemBottomY !== undefined;
        const stemDirection = hasStem && notePos.stemTopY! < notePos.y ? 'up' : 'down';
        const placeAbove = stemDirection === 'down';
        
        const noteHeadTop = notePos.y - NOTE_HEAD_HALF_HEIGHT;
        const noteHeadBottom = notePos.y + NOTE_HEAD_HALF_HEIGHT;
        const noteHeadEdgeY = placeAbove ? noteHeadTop : noteHeadBottom;
        
        const isDown = attackInfo.pickDirection === 'down';
        const oh = isDown ? DOWNBOW_H : UPBOW_H;
        const ow = isDown ? DOWNBOW_W : UPBOW_W;
        const scale = TARGET_H / oh;
        const tw = ow * scale;
        const th = oh * scale;
        
        const finalY = placeAbove ? (noteHeadEdgeY - MARGIN - th) : (noteHeadEdgeY + MARGIN);
        const finalX = notePos.x - tw / 2;
        
        // Enregistrer uniquement (pas de dessin)
        const bbox = { x: finalX, y: finalY, width: tw, height: th };
        placeAndSizeManager.registerElement('pick-stroke', bbox, 7, {
          direction: isDown ? 'down' : 'up',
          exactX: notePos.x,
          exactY: placeAbove ? (finalY + th) : finalY,
        });
      }
    });
  }

  /**
   * Rendu des coups de médiator (down/up) utilisant les paths fournis par l'utilisateur.
   * - Alternance stricte globale (Down, Up, Down, ...)
   * - Débit détecté sur l'ENSEMBLE du bloc (auto) ou forcé (8/16)
   * - Placement relatif aux hampes: stems-down => AU-DESSUS; stems-up => AU-DESSOUS
   * - Collisions gérées via PlaceAndSizeManager (vertical d'abord)
   */
  private drawPickStrokes(
    svg: SVGElement,
    grid: ChordGrid,
    notePositions: Array<{ x: number; y: number; measureIndex: number; chordIndex: number; beatIndex: number; noteIndex: number; tieEnd?: boolean; tieFromVoid?: boolean; value?: number; stemTopY?: number; stemBottomY?: number }>,
    placeAndSizeManager: PlaceAndSizeManager,
    stemsDirection: 'up' | 'down',
    options: RenderOptions,
    allowedMeasureIndices?: Set<number>
  ) {
    const mode = options.pickStrokes;
    if (!mode || mode === 'off') return;

    // 1) Déterminer le débit (8 ou 16) sur l'ENSEMBLE du bloc si auto
    const forcedStep = mode === '8' ? 8 : mode === '16' ? 16 : undefined;
    const step = forcedStep ?? this.detectGlobalSubdivision(grid);

    // 2) Construire une TIMELINE rythmique continue basée sur la subdivision
    // Chaque note/silence occupe un certain nombre de "slots" de subdivision
    // On parcourt toutes les mesures dans l'ordre pour construire cette timeline
    interface TimelineSlot {
      pickDirection: 'down' | 'up';
      subdivisionIndex: number; // position absolue dans la timeline (0, 1, 2, ...)
    }
    interface NoteOnTimeline {
      measureIndex: number;
      chordIndex: number;
      beatIndex: number;
      noteIndex: number;
      subdivisionStart: number; // où commence cette note dans la timeline
      isAttack: boolean; // true si c'est une vraie attaque (pas rest, pas tieEnd)
    }

    const timeline: TimelineSlot[] = [];
    const notesOnTimeline: NoteOnTimeline[] = [];
    let currentSubdivision = 0;

    // Parcourir toutes les mesures/segments/beats/notes pour construire la timeline
    grid.measures.forEach((measure, measureIndex) => {
      const segments = measure.chordSegments || [];
      segments.forEach((segment, chordIndex) => {
        segment.beats.forEach((beat, beatIndex) => {
          beat.notes.forEach((note, noteIndex) => {
            // Calculer combien de subdivisions occupe cette note
            const noteDuration = note.value; // 1, 2, 4, 8, 16, 32, 64
            const dottedMultiplier = note.dotted ? 1.5 : 1;
            
            // Nombre de subdivisions occupées = durée de la note exprimée en unités de 'step'
            // Ex: si step=16 et note=8, alors 8 occupe 2 subdivisions de 16
            // Ex: si step=8 et note=8, alors 8 occupe 1 subdivision de 8
            const subdivisionCount = Math.round((step / noteDuration) * dottedMultiplier);
            
            // Enregistrer cette note dans la timeline
            const isAttack = !note.isRest && !note.tieEnd && !note.tieFromVoid;
            notesOnTimeline.push({
              measureIndex,
              chordIndex,
              beatIndex,
              noteIndex,
              subdivisionStart: currentSubdivision,
              isAttack
            });
            
            // Avancer la timeline de subdivisionCount positions
            currentSubdivision += subdivisionCount;
          });
        });
      });
    });

    // 3) Assigner les coups de médiator (Down/Up) à chaque position de la timeline
    let isDown = true; // commence par Down
    for (let i = 0; i < currentSubdivision; i++) {
      timeline.push({
        pickDirection: isDown ? 'down' : 'up',
        subdivisionIndex: i
      });
      isDown = !isDown; // alterner
    }

    // 4) Mapper les notes ayant des attaques réelles à leur coup de médiator
    const attacksWithPicks = notesOnTimeline
      .filter(n => n.isAttack)
      .map(n => ({
        ...n,
        pickDirection: timeline[n.subdivisionStart]?.pickDirection || 'down'
      }));

    // Paths d'origine (extraits des SVG fournis - FORME NOIRE UNIQUEMENT)
    // Upbow (V inversé) d'après Music-upbow.svg
    // Path: "M 125.6,4.1 113.3,43.1 101.4,4.1 l 3.3,0 8.6,28.6 9.2,-28.6 z"
    // BBox original: x ~101.4-125.6 (24.2), y ~4.1-43.1 (39.0)
    const UPBOW_PATH = "M 125.6,4.1 113.3,43.1 101.4,4.1 l 3.3,0 8.6,28.6 9.2,-28.6 z";
    const UPBOW_ORIG_X = 101.4;
    const UPBOW_ORIG_Y = 4.1;
    const UPBOW_W = 24.2;
    const UPBOW_H = 39.0;

    // Downbow (carré avec ouverture en bas) d'après Music-downbow.svg
    // Path: "m 99,44 -2,0 L 97,11 l 32,0 0,33 L 127,44 127,25 99,25 z"
    // BBox original: x ~97-129 (32), y ~11-44 (33)
    const DOWNBOW_PATH = "m 99,44 -2,0 L 97,11 l 32,0 0,33 L 127,44 127,25 99,25 z";
    const DOWNBOW_ORIG_X = 97;
    const DOWNBOW_ORIG_Y = 11;
    const DOWNBOW_W = 32;
    const DOWNBOW_H = 33;

    // Taille visuelle cible (hauteur) en px
    const TARGET_H = 12; // ajustable
    const MARGIN = 3;    // écart par rapport à la tête

    // 5) Les pick-strokes restent à position fixe près des notes
    //    C'est aux autres éléments (chords, tuplets) de les éviter via le layer system

    // Fonction de dessin des pick-strokes à position fixe
    const drawSymbol = (
      isDown: boolean,
      anchorX: number,
      noteHeadEdgeY: number,  // Y du bord de la tête de note (haut ou bas selon stems)
      placeAbove: boolean
    ) => {
      const d = isDown ? DOWNBOW_PATH : UPBOW_PATH;
      const ow = isDown ? DOWNBOW_W : UPBOW_W;
      const oh = isDown ? DOWNBOW_H : UPBOW_H;
      const origX = isDown ? DOWNBOW_ORIG_X : UPBOW_ORIG_X;
      const origY = isDown ? DOWNBOW_ORIG_Y : UPBOW_ORIG_Y;

      const scale = TARGET_H / oh;
      const tw = ow * scale;
      const th = oh * scale;

      // Position fixe - pas de décalage (verticalOffset supprimé)
      const finalY = placeAbove ? (noteHeadEdgeY - MARGIN - th) : (noteHeadEdgeY + MARGIN);
      const finalX = anchorX - tw / 2;

      const translateX = finalX - origX * scale;
      const translateY = finalY - origY * scale;

      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('transform', `translate(${translateX.toFixed(2)}, ${translateY.toFixed(2)}) scale(${scale.toFixed(4)})`);
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', '#000');
      path.setAttribute('stroke', 'none');
      g.appendChild(path);
      svg.appendChild(g);

      // Enregistrer pour collisions
      const bbox = { x: finalX, y: finalY, width: tw, height: th };
      placeAndSizeManager.registerElement('pick-stroke', bbox, 7, {
        direction: isDown ? 'down' : 'up',
        exactX: anchorX,
        exactY: placeAbove ? (finalY + th) : finalY,
      });
    };

    // 6) Rendu des pick-strokes à position fixe
    attacksWithPicks.forEach(attackInfo => {
      // FILTRE: Si on ne traite qu'une ligne spécifique, ignorer les autres mesures
      if (allowedMeasureIndices && !allowedMeasureIndices.has(attackInfo.measureIndex)) return;

      const notePos = notePositions.find(np =>
        np.measureIndex === attackInfo.measureIndex &&
        np.chordIndex === attackInfo.chordIndex &&
        np.beatIndex === attackInfo.beatIndex &&
        np.noteIndex === attackInfo.noteIndex
      );
      
      if (notePos) {
        // Déterminer la direction de la hampe pour CETTE note spécifique
        const hasStem = notePos.stemTopY !== undefined && notePos.stemBottomY !== undefined;
        const stemDirection = hasStem && notePos.stemTopY! < notePos.y ? 'up' : 'down';
        const placeAbove = stemDirection === 'down'; // stems-down → pick au-dessus
        
        // Calculer le bord de la tête de note (haut ou bas selon direction de hampe)
        const NOTE_HEAD_HALF_HEIGHT = 5;
        const noteHeadTop = notePos.y - NOTE_HEAD_HALF_HEIGHT;
        const noteHeadBottom = notePos.y + NOTE_HEAD_HALF_HEIGHT;
        const noteHeadEdgeY = placeAbove ? noteHeadTop : noteHeadBottom;
        
        const isDown = attackInfo.pickDirection === 'down';
        drawSymbol(isDown, notePos.x, noteHeadEdgeY, placeAbove);
      }
    });
  }

  /**
   * Détection de la subdivision minimale sur l'ensemble du bloc.
   * Règle: si la moindre attaque effective correspond à 16 (ou plus court), retourner 16; sinon 8.
   */
  private detectGlobalSubdivision(grid: ChordGrid): 8 | 16 {
    // Construire un set des tuplets par groupId pour chaque mesure afin d'en déduire leur baseLen
    let hasSixteenth = false;
    for (const measure of grid.measures) {
      // Map groupId -> baseLen (valeur numérique max rencontrée dans le groupe)
      const groupBase: Record<string, number> = {};
      // Première passe: collecter baseLen
      for (const seg of (measure.chordSegments || [])) {
        for (const beat of seg.beats) {
          for (const n of beat.notes) {
            if (n.tuplet) {
              const gid = n.tuplet.groupId;
              const prev = groupBase[gid] ?? 0;
              // baseLen = plus petite durée => plus grand nombre (16 < 8 en durée, mais valeur 16 > 8)
              groupBase[gid] = Math.max(prev, n.value);
            }
          }
        }
      }
      // Seconde passe: inspecter les attaques
      for (const seg of (measure.chordSegments || [])) {
        for (const beat of seg.beats) {
          for (const n of beat.notes) {
            if (n.isRest || n.tieEnd || n.tieFromVoid) continue; // pas une attaque
            let eff: number = n.value;
            if (n.tuplet) {
              const gid = n.tuplet.groupId;
              const base = groupBase[gid] || n.value;
              eff = Math.max(eff, base);
            }
            if (eff >= 16) { hasSixteenth = true; break; }
          }
          if (hasSixteenth) break;
        }
        if (hasSixteenth) break;
      }
      if (hasSixteenth) break;
    }
    return hasSixteenth ? 16 : 8;
  }

  /**
   * Résout les liaisons qui traversent les lignes (cross-line ties).
   * Marque les notes avec tieToVoid/tieFromVoid pour un rendu correct ligne par ligne.
   */
  private resolveCrossLineTies(renderLines: RenderLine[]) {
    // 1. Construire une liste plate de toutes les notes avec leur position (ligne)
    const allNotes: { note: any, lineIndex: number }[] = [];
    
    renderLines.forEach((line, lineIndex) => {
        line.measures.forEach((measure) => {
            const segments = measure.chordSegments || [{beats: measure.beats}];
            segments.forEach((seg: any) => {
                seg.beats.forEach((beat: any) => {
                    beat.notes.forEach((note: any) => {
                        allNotes.push({ note, lineIndex });
                    });
                });
            });
        });
    });

    // 2. Parcourir pour lier start -> end
    for (let i = 0; i < allNotes.length; i++) {
        const current = allNotes[i];
        if (current.note.tieStart) {
            // Chercher le prochain tieEnd
            for (let j = i + 1; j < allNotes.length; j++) {
                const target = allNotes[j];
                if (target.note.tieEnd) {
                    // Trouvé ! Vérifier si changement de ligne
                    if (current.lineIndex !== target.lineIndex) {
                        current.note.tieToVoid = true;
                        target.note.tieFromVoid = true;
                    }
                    break; // On a trouvé la cible, on arrête de chercher pour ce tieStart
                }
            }
        }
    }
  }
}
