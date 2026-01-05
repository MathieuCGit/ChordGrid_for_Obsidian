/**
 * @file SVGRenderer.ts
 * @description SVG rendering of chord grids.
 * 
 * This class orchestrates the complete rendering of a chord grid in SVG,
 * managing the layout of measures across multiple lines and
 * delegating the rendering of individual measures to MeasureRenderer.
 * 
 * Responsibilities:
 * - Calculate the global SVG size based on the number of lines
 * - Position measures on the grid (4 measures per line by default)
 * - Handle explicit line breaks (lineBreak)
 * - Initialize TieManager to handle ties between measures
 * - Create the SVG structure with background and graphic elements
 * 
 * @example
 * ```typescript
 * const renderer = new SVGRenderer();
 * const svgElement = renderer.render(chordGrid);
 * document.body.appendChild(svgElement);
 * ```
 * 
 * @see {@link MeasureRenderer} for rendering an individual measure
 * @see {@link TieManager} for managing ties between measures
 */

import { ChordGrid, Measure } from '../parser/type';
import { Beat } from '../models/Beat';
import { MeasureRenderer } from './MeasureRenderer';
import { TimeSignatureRenderer } from './TimeSignatureRenderer';
import { 
  SVG_NS, 
  LAYOUT, 
  NOTE_SPACING, 
  SEGMENT_WIDTH,
  SVG_VIEWPORT,
  TYPOGRAPHY,
  NOTATION,
  FINGER_PATTERNS
} from './constants';
import { TieManager } from '../utils/TieManager';
import { VoltaManager } from '../utils/VoltaManager';
import { ChordGridParser } from '../parser/ChordGridParser';
import { MusicAnalyzer } from '../analyzer/MusicAnalyzer';
import { drawBeams } from './BeamRenderer';
import { PlaceAndSizeManager } from './PlaceAndSizeManager';
import { ChordRenderer } from './ChordRenderer';
import { StrumPatternRenderer } from './StrumPatternRenderer';
import { CountingRenderer } from './CountingRenderer';

/**
 * Rendering options for SVGRenderer.
 */
export interface RenderOptions {
  /** Stem direction ('up' or 'down'). Default 'up'. */
  stemsDirection?: 'up' | 'down';
  /** Display % symbol for repeated measures instead of full rhythm. Default false. */
  displayRepeatSymbol?: boolean;
  /** Enable pick stroke symbols. Can be boolean or string ('auto', '8', '16', etc). Default false. */
  pickStrokes?: boolean | string;
  /** Fingerstyle mode ('en' for English t/h, 'fr' for French p/m). Default undefined (disabled). */
  fingerMode?: 'en' | 'fr';
  /** Number of measures per line (forces layout). If unspecified, uses automatic mode. */
  measuresPerLine?: number;
  /** Measure numbering configuration (start number and interval). Default undefined (disabled). */
  measureNumbering?: { startNumber: number, interval: number, enabled: boolean };
  /** Enable counting mode for pedagogical beat counting. Default false. */
  countingMode?: boolean;
  /** Enable debug logging for placement and collision detection. Default false. */
  debugPlacement?: boolean;
}

/**
 * Structure representing a calculated render line.
 */
export interface RenderLine {
    measures: Measure[]; // Measures that go on this line
    width: number;       // Total width used by measures
    height: number;      // Line height
    startY: number;      // Starting Y position of the line
}

/**
 * Main class for SVG rendering of chord grids.
 */
export class SVGRenderer {
  // Dynamic spacing limits for readability
  private readonly MIN_SPACING_RATIO = SEGMENT_WIDTH.MIN_SPACING_RATIO;
  private readonly MAX_SPACING_RATIO = SEGMENT_WIDTH.MAX_SPACING_RATIO;

  /**
   * Calculate the minimum spacing for a given rhythmic value.
   */
  private getMinSpacingForValue(v: number): number {
    if (v >= 64) return NOTE_SPACING.SIXTY_FOURTH;
    if (v >= 32) return NOTE_SPACING.THIRTY_SECOND;
    if (v >= 16) return NOTE_SPACING.SIXTEENTH;
    if (v >= 8)  return NOTE_SPACING.EIGHTH;
    return NOTE_SPACING.QUARTER_AND_LONGER;
  }

  /**
   * Calculate the required width for a beat.
   */
  private calculateBeatWidth(beat: any): number {
    const noteCount = beat?.notes?.length || 0;
    if (noteCount <= 1) return SEGMENT_WIDTH.SINGLE_NOTE_BASE + SEGMENT_WIDTH.SINGLE_NOTE_PADDING + SEGMENT_WIDTH.HEAD_HALF_MAX;
    
    const spacing = Math.max(
      ...beat.notes.map((n: any) => {
        const base = this.getMinSpacingForValue(n.value);
        return n.isRest ? base + NOTE_SPACING.REST_EXTRA_SPACING : base;
      })
    );
    return SEGMENT_WIDTH.MULTI_NOTE_LEFT_PADDING + SEGMENT_WIDTH.MULTI_NOTE_RIGHT_PADDING + SEGMENT_WIDTH.HEAD_HALF_MAX + (noteCount - 1) * spacing + SEGMENT_WIDTH.MULTI_NOTE_END_MARGIN;
  }

  /**
   * Calcule la largeur totale requise pour une mesure.
   */
  private calculateMeasureWidth(measure: Measure): number {
    // Empty measures (| |) should have a minimal width
    if ((measure as any).__isEmpty) {
      return LAYOUT.BASE_MEASURE_WIDTH * 0.5; // Half the base width for empty measures
    }
    
    const segments = measure.chordSegments || [{ chord: measure.chord, beats: measure.beats }];
    let width = 0;
    
    segments.forEach((seg: any, idx: number) => {
      if (idx > 0 && seg.leadingSpace) width += LAYOUT.SEPARATOR_WIDTH;
      const beatsWidth = (seg.beats || []).reduce((acc: number, b: any) => acc + this.calculateBeatWidth(b), 0);
      width += beatsWidth + LAYOUT.INNER_PADDING_PER_SEGMENT;
    });
    
    // Add extra width for inline time signature if marked for display
    if ((measure as any).__shouldShowTimeSignature && measure.timeSignature) {
      width += 60; // Space for time signature (approximately 30px wide + 30px padding)
    }
    
    return Math.max(LAYOUT.BASE_MEASURE_WIDTH, Math.ceil(width));
  }

  /**
   * Effective width used for rendering, accounting for the potential compression ratio.
   */
  private getRenderedMeasureWidth(measure: Measure): number {
    const base = this.calculateMeasureWidth(measure);
    const ratio = (measure as any).__spacingRatio;
    return ratio ? base * ratio : base;
  }

  /**
   * Compares two time signatures for equality.
   */
  private timeSignaturesEqual(ts1: any, ts2: any): boolean {
    if (!ts1 || !ts2) return ts1 === ts2;
    return ts1.numerator === ts2.numerator && ts1.denominator === ts2.denominator;
  }

  /**
   * PRE-MARK measures with time signature changes BEFORE layout calculation.
   * This allows calculateMeasureWidth() to reserve space for inline time signatures.
   * Only marks actual changes (not line-starts, which are handled later in markTimeSignatureDisplay).
   */
  private preMarkTimeSignatureChanges(measures: Measure[], globalTimeSignature: any): void {
    let currentTimeSignature = globalTimeSignature;
    
    for (let i = 0; i < measures.length; i++) {
      const measure = measures[i];
      
      // Check if this measure has a different time signature than the previous
      if (measure.timeSignature && !this.timeSignaturesEqual(measure.timeSignature, currentTimeSignature)) {
        // Mark this measure to display its time signature
        (measure as any).__shouldShowTimeSignature = true;
        currentTimeSignature = measure.timeSignature;
      }
    }
  }

  /**
   * Marks measures that should display their time signature.
   * This takes into account:
   * - First occurrence of a time signature change
   * - Line breaks (forced with \n or automatic) where the current metric differs from global
   */
  private markTimeSignatureDisplay(renderLines: RenderLine[], globalTimeSignature: any): void {
    let currentTimeSignature = globalTimeSignature;

    renderLines.forEach((line, lineIndex) => {
      line.measures.forEach((measure, posInLine) => {
        const isLineStart = (posInLine === 0);
        const measureTS = measure.timeSignature;
        let shouldShow = false;

        if (measureTS) {
          // This measure has an explicit time signature from the parser
          if (!this.timeSignaturesEqual(measureTS, currentTimeSignature)) {
            // It's different from current -> this is a CHANGE, show it
            shouldShow = true;
            currentTimeSignature = measureTS;
          } else {
            // Parser marked it with same time signature as current (duplicate marking)
            // Don't show it, but keep currentTimeSignature updated
            currentTimeSignature = measureTS;
          }
        } else if (isLineStart && lineIndex > 0) {
          // At line start (not first line), check if current metric differs from global
          if (!this.timeSignaturesEqual(currentTimeSignature, globalTimeSignature)) {
            // Assign current time signature to this measure so it can be displayed
            measure.timeSignature = currentTimeSignature;
            shouldShow = true;
          }
        }

        (measure as any).__shouldShowTimeSignature = shouldShow;
      });
    });
  }

  /**
   * Calculates the layout of measures into lines.
   * 
   * @param measures - Array of all measures
   * @param maxWidth - Maximum width of a line (used in auto mode)
   * @param forcedMeasuresPerLine - If defined, forces exactly N measures per line
   * @returns Array of render lines
   */
  private calculateLayout(measures: Measure[], maxWidth: number, forcedMeasuresPerLine?: number): RenderLine[] {
    const lines: RenderLine[] = [];
    let currentLineMeasures: Measure[] = [];
    let currentLineWidth = 0;
    let currentY = 0;

    for (let i = 0; i < measures.length; i++) {
      const measure = measures[i];
      const measureWidth = this.calculateMeasureWidth(measure);
      
      // Add the measure to the current line first
      currentLineMeasures.push(measure);
      currentLineWidth += measureWidth;
      
      // Line break detection (AFTER adding the measure)
      let shouldBreak = false;

      if (forcedMeasuresPerLine !== undefined) {
        // MODE 3: forced measures-per-line:N
        // Force a break after N measures (unless isLineBreak forces it earlier)
        const currentMeasure = measure;
        const forcedBreakByFlag = currentMeasure.isLineBreak;
        const forcedBreakByCount = currentLineMeasures.length >= forcedMeasuresPerLine;
        
        shouldBreak = forcedBreakByFlag || forcedBreakByCount;
      } else {
        // MODE 1 & 2: Automatic or explicit line breaks (\n)
        // 1. Out of space (unless it's the first measure of the line)
        const isOverflowing = currentLineMeasures.length > 1 && 
                             currentLineWidth > maxWidth;
        
        // 2. Line break forced by current measure (via \n in parser or explicit flag)
        const forcedBreak = measure.isLineBreak || false;

        shouldBreak = isOverflowing || forcedBreak;
      }

      if (shouldBreak) {
        // Finalize the current line
        lines.push({
          measures: currentLineMeasures,
          width: currentLineWidth,
          height: LAYOUT.MEASURE_HEIGHT,
          startY: currentY
        });

        // Prepare the new line
        currentLineMeasures = [];
        currentLineWidth = 0;
        currentY += LAYOUT.MEASURE_HEIGHT + LAYOUT.LINE_VERTICAL_SPACING;
      }
    }

    // Add the last line if it contains measures
    if (currentLineMeasures.length > 0) {
      lines.push({
        measures: currentLineMeasures,
        width: currentLineWidth,
        height: LAYOUT.MEASURE_HEIGHT,
        startY: currentY
      });
    }

    // Apply dynamic spacing adjustment on each line
    this.applyDynamicSpacing(lines, maxWidth, forcedMeasuresPerLine !== undefined);

    return lines;
  }

  /**
   * Dynamically adjusts measure widths on each line
   * based on available space, while respecting readability limits.
   * 
   * @param lines - Render lines to adjust
   * @param maxWidth - Maximum available width
   * @param isForcedLayout - If true, removes limits to force adjustment to frame
   */
  private applyDynamicSpacing(lines: RenderLine[], maxWidth: number, isForcedLayout: boolean = false): void {
    for (const line of lines) {
      if (line.measures.length === 0) continue;
      
      // Calculate the required adjustment ratio
      const currentWidth = line.width;
      let targetRatio = maxWidth / currentWidth;
      
      // In forced mode (measures-per-line), allow extension but prevent excessive compression
      // that would make notes unreadable
      if (isForcedLayout) {
        // Don't compress below 0.7 ratio - if content needs more space, SVG will expand
        if (targetRatio < 0.7) {
          targetRatio = 1.0; // Keep original width, SVG will be wider
        }
      } else {
        // In automatic mode, respect readability limits
        targetRatio = Math.max(this.MIN_SPACING_RATIO, Math.min(this.MAX_SPACING_RATIO, targetRatio));
      }
      
      // Adjust the width of each measure and the total line width
      if (Math.abs(targetRatio - 1.0) > 0.01) { // Minimum threshold to avoid unnecessary adjustments
        for (const measure of line.measures) {
          // Store the adjustment ratio in the measure for later use
          (measure as any).__spacingRatio = targetRatio;
        }
        line.width = currentWidth * targetRatio;
      }
    }
  }

  /**
   * Renders a chord grid as an SVG element.
   * 
   * @param grid - ChordGrid structure containing measures to render
   * @returns SVG element ready to be inserted into the DOM
   */
  /**
   * Renders a chord grid as an SVG element.
   * @param grid - ChordGrid structure containing measures to render
   * @param optionsOrStemsDirection - Render options or stem direction (backward compatibility)
   */
  render(grid: ChordGrid, optionsOrStemsDirection?: RenderOptions | 'up' | 'down'): SVGElement {
    // Backward compatibility: if it's a string, it's stemsDirection
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
    const measuresPerLine = LAYOUT.DEFAULT_MEASURES_PER_LINE;
    const baseMeasureWidth = LAYOUT.BASE_MEASURE_WIDTH; // increased fallback minimum width per measure for readability
    const measureHeight = LAYOUT.MEASURE_HEIGHT;

    // Pre-compute dynamic widths per measure based on rhythmic density
    // (Time signature width factored into initial padding later)
    const timeSignatureString = `${grid.timeSignature.numerator}/${grid.timeSignature.denominator}`;
    const timeSigFontSize = TYPOGRAPHY.TIME_SIG_NUMERATOR_SIZE;
    const timeSigAvgCharFactor = TYPOGRAPHY.CHAR_WIDTH_RATIO; // further reduced for tighter spacing
    const timeSigWidthEstimate = Math.ceil(timeSignatureString.length * timeSigFontSize * timeSigAvgCharFactor);
    const baseLeftPadding = LAYOUT.BASE_LEFT_PADDING;
    const dynamicLineStartPadding = baseLeftPadding + timeSigWidthEstimate + LAYOUT.TIME_SIG_MARGIN; // minimal margin after metric
    const separatorWidth = LAYOUT.SEPARATOR_WIDTH;
    const innerPaddingPerSegment = LAYOUT.INNER_PADDING_PER_SEGMENT;
    const headHalfMax = SEGMENT_WIDTH.HEAD_HALF_MAX; // for diamond
    // Minimum horizontal spacing between consecutive note centers based on rhythmic subdivision.
    // Increased values to improve legibility of dense patterns (user request).
    const valueMinSpacing = (v: number) => {
      if (v >= 64) return NOTE_SPACING.SIXTY_FOURTH;   // was 12
      if (v >= 32) return NOTE_SPACING.THIRTY_SECOND;   // was 14
      if (v >= 16) return NOTE_SPACING.SIXTEENTH;   // was 20 (16816 needs more air)
      if (v >= 8)  return NOTE_SPACING.EIGHTH;   // was 20
      return NOTE_SPACING.QUARTER_AND_LONGER;                // was 16 for quarters & longer
    };
    const requiredBeatWidth = (beat: any) => {
      const noteCount = beat?.notes?.length || 0;
      if (noteCount <= 1) return SEGMENT_WIDTH.SINGLE_NOTE_BASE + LAYOUT.BASE_LEFT_PADDING + headHalfMax; // increased minimal single-note width
      const spacing = Math.max(
        ...beat.notes.map((n: any) => {
          const base = valueMinSpacing(n.value);
          return n.isRest ? base + NOTE_SPACING.REST_EXTRA_SPACING : base; // give short rests a bit more room when estimating width
        })
      );
      return LAYOUT.BASE_LEFT_PADDING + LAYOUT.BASE_LEFT_PADDING + headHalfMax + (noteCount - 1) * spacing + LAYOUT.SEGMENT_END_PADDING; // +8 extra breathing room
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
    // In forced mode (measures-per-line), calculate available width to ensure everything fits
    let maxLineWidth: number;
    if (options.measuresPerLine) {
      // Target SVG width (typical for Obsidian) minus margins
      const targetSVGWidth = 1000; // Standard width of an Obsidian block
      const availableWidth = targetSVGWidth - dynamicLineStartPadding - LAYOUT.AVAILABLE_WIDTH_SIDE_MARGIN; // Minus margins
      maxLineWidth = availableWidth; // Full available width for the line
    } else {
      maxLineWidth = measuresPerLine * baseMeasureWidth; // Automatic mode
    }
    
    // PRE-MARK time signature changes BEFORE layout calculation
    // This ensures calculateMeasureWidth() includes space for inline time signatures
    this.preMarkTimeSignatureChanges(grid.measures, grid.timeSignature);
    
    const renderLines = this.calculateLayout(grid.measures, maxLineWidth, options.measuresPerLine);
    this.resolveCrossLineTies(renderLines);

    // Mark which measures should display their time signature (refines pre-marking with line-start logic)
    this.markTimeSignatureDisplay(renderLines, grid.timeSignature);

    // Reconstruct measurePositions for compatibility with existing methods
    const measurePositions: {measure: any, lineIndex: number, posInLine: number, globalIndex: number, width: number, x?: number, y?: number}[] = [];
    let globalIndex = 0;
    
    renderLines.forEach((line, lineIndex) => {
        let currentX = dynamicLineStartPadding;
        line.measures.forEach((measure, posInLine) => {
            const measureWidth = this.getRenderedMeasureWidth(measure);

            // Mark line start for MeasureRenderer
            (measure as any).__isLineStart = (posInLine === 0);
            
            measurePositions.push({
                measure,
                lineIndex,
                posInLine,
                globalIndex,
                width: measureWidth,
                x: currentX,
                y: line.startY + LAYOUT.MEASURE_Y_OFFSET // Y offset to leave space for title/signature if needed
            });
            currentX += measureWidth;
            globalIndex++;
        });
    });

    const lines = renderLines.length;
    
    // Check if any line has a repeat count on its last measure (needs extra space)
    let maxRepeatCountWidth = 0;
    renderLines.forEach(line => {
        const lastMeasure = line.measures[line.measures.length - 1];
        if (lastMeasure && (lastMeasure as any).repeatCount !== undefined) {
            const count = (lastMeasure as any).repeatCount;
            // Calculate width of "xN" text: BASE_LEFT_PADDING (10px) + text width
            const textWidth = count >= 10 ? 40 : LAYOUT.REPEAT_COUNT_WIDTH; // 30px for single digit, 40px for double
            const totalRepeatCountWidth = LAYOUT.BASE_LEFT_PADDING + textWidth;
            maxRepeatCountWidth = Math.max(maxRepeatCountWidth, totalRepeatCountWidth);
        }
    });
    
    // Total width (including initial padding): take the widest line after compression
    const width = Math.max(...renderLines.map(l => l.width + dynamicLineStartPadding), baseMeasureWidth + dynamicLineStartPadding) + LAYOUT.RIGHT_SVG_MARGIN + maxRepeatCountWidth;
    // Actual height: maximum of (startY + height) of lines + bottom margin
    const layoutBottom = renderLines.reduce((max, l) => Math.max(max, l.startY + l.height), 0);
    
    // Calculate additional space needed for counting and fingerstyle annotations
    const isStemDown = options.stemsDirection === 'down';
    let additionalBottomSpace = 0;
    
    // Add space for annotations below staff (stem-up mode) or reserve equivalent space
    if (options.countingMode) {
      additionalBottomSpace += NOTATION.COUNTING_FONT_SIZE_TALL + NOTATION.COUNTING_MARGIN; // 24px
    }
    if (options.fingerMode || options.pickStrokes) {
      additionalBottomSpace += 15; // Space for pick-strokes or fingerstyle patterns
    }
    
    const height = layoutBottom + LAYOUT.BOTTOM_SVG_MARGIN + additionalBottomSpace;
    
    // Add space above for chord symbols (they are rendered at measureY - verticalOffset)
    const topMarginForChords = LAYOUT.TOP_MARGIN_FOR_CHORDS; // Space for chord symbols above staff
    const totalHeight = height + topMarginForChords;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '100%');
  // Remove fixed height to allow CSS to control it - fixes Obsidian margin issues
  // svg.setAttribute('height', totalHeight.toString());
  svg.setAttribute('viewBox', `0 ${-topMarginForChords} ${width} ${totalHeight}`);
  svg.setAttribute('xmlns', SVG_NS);

    // Initialize managers
    const placeAndSizeManager = new PlaceAndSizeManager({ debugMode: false });
    const timeSignatureRenderer = new TimeSignatureRenderer(placeAndSizeManager);
    const tieManager = new TieManager();
    const voltaManager = new VoltaManager();
    const notePositions: {x:number,y:number,headLeftX?:number,headRightX?:number,measureIndex:number,chordIndex:number,beatIndex:number,noteIndex:number,segmentNoteIndex?:number,tieStart?:boolean,tieEnd?:boolean,tieToVoid?:boolean,tieFromVoid?:boolean,stemTopY?:number,stemBottomY?:number,value?:number,countingNumber?:number,countingSize?:'t'|'m'|'s'}[] = [];

  // white background
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('x', '0');
  bg.setAttribute('y', String(-topMarginForChords));
  bg.setAttribute('width', String(width));
  bg.setAttribute('height', String(totalHeight));
  bg.setAttribute('fill', 'white');
  svg.appendChild(bg);

    // Draw global time signature using TimeSignatureRenderer for standard notation
    const timeSigX = baseLeftPadding + timeSigWidthEstimate / 2;
    // Use same Y calculation as inline time signatures: first line Y (20) + staff line offset (80)
    const firstLineY = 20; // Top margin for first line (from line.startY + 20)
    const timeSigY = firstLineY + NOTATION.STAFF_LINE_Y_OFFSET; // = 20 + 80 = 100
    timeSignatureRenderer.render(svg, {
        x: timeSigX,
        y: timeSigY,
        numerator: grid.timeSignature.numerator,
        denominator: grid.timeSignature.denominator,
        measureIndex: 0
    }, true); // true = global time signature (larger)
    
    (svg as any).__dynamicLineStartPadding = dynamicLineStartPadding;
    
    // Note: Time signature is registered in the first line context later if needed, 
    // but since it's static at top left, we can just draw it.
    // If we want it to collide properly on line 1, we should register it inside the loop for line 1.

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
          timeSignature: m.timeSignature || grid.timeSignature,
          barline: (m as any).barline || '|',
          isLineBreak: (m as any).isLineBreak || false,
          source: (m as any).source || ''
        };
        const analyzed = analyzer.analyze(parsedMeasure as any);
        return analyzed;
      });

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
      analyzedMeasures = [];
    }

  // Use dynamic padding instead of fixed 40 to prevent overlap with multi-digit time signatures
  // const lineAccumulated: number[] = new Array(lines).fill(dynamicLineStartPadding);
    
    // ========== LINE-SCOPED ARCHITECTURE ==========
    // We treat each line as a closed universe for collisions
    
    let globalMeasureIndex = 0;

    renderLines.forEach((line, lineIndex) => {
        // 1. SPATIAL CONTEXT RESET
        placeAndSizeManager.clearAll();
        
        // Note: Global time signature is already drawn and registered above
        // No need to re-register it here

        const lineY = line.startY + 20; // Top margin
        let currentX = (svg as any).__dynamicLineStartPadding || 40;

        // 2. LOCAL POSITIONS CONSTRUCTION
        const lineMeasurePositions: any[] = [];
        
        line.measures.forEach((measure, posInLine) => {
            const mWidth = this.getRenderedMeasureWidth(measure);
            (measure as any).__isLineStart = (posInLine === 0);
            
            const mp = {
                measure,
                lineIndex,
                posInLine,
                globalIndex: globalMeasureIndex++,
                width: mWidth,
                x: currentX,
                y: lineY
            };
            lineMeasurePositions.push(mp);
            voltaManager.addMeasurePosition(mp); // Accumulate for volta rendering
            
            currentX += mWidth;
        });

        // 3. LOCAL PLANNING & RESOLUTION
        this.registerBarlines(lineMeasurePositions, placeAndSizeManager);
        this.registerVoltaText(lineMeasurePositions, placeAndSizeManager);
        // NOTE: Chords are now rendered AFTER measures using ChordRenderer
        
        // Register measures themselves for complete geometric tracking
        lineMeasurePositions.forEach((mp) => {
          const measure = mp.measure as any;
          const measureHeight = 120; // Standard staff height
          
          placeAndSizeManager.registerElement('measure', {
            x: mp.x,
            y: mp.y,
            width: mp.width,
            height: measureHeight
          }, 0, {
            measureIndex: mp.globalIndex,
            lineIndex: mp.lineIndex,
            posInLine: mp.posInLine,
            visualStartX: mp.x,
            visualEndX: mp.x + mp.width,
            visualTopY: mp.y,
            visualBottomY: mp.y + measureHeight,
            timeSignature: measure.timeSignature ? `${measure.timeSignature.beats}/${measure.timeSignature.beatValue}` : undefined,
            isLineStart: measure.__isLineStart,
            isRepeatStart: measure.isRepeatStart,
            barlineType: measure.barline,
            hasVoltaStart: !!measure.voltaStart,
            hasVoltaEnd: !!measure.voltaEnd
          });
        });

        const stemsDir = stemsDirection === 'down' ? 'down' : 'up';

        // 4. MEASURE RENDERING
        lineMeasurePositions.forEach((mp) => {
            const {measure, globalIndex, width: mWidth, x, y} = mp;
            
            // Beam preparation (existing logic)
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

            // Draw beams
            if (analyzedMeasures[globalIndex]) {
                drawBeams(svg, analyzedMeasures[globalIndex], globalIndex, notePositions as any, stemsDir);
            }
        });

        // 5. LOCAL DECORATION ELEMENTS DRAWING
        // NOTE: Volta brackets are drawn GLOBALLY after all lines (see below)
        
        // Render chords AFTER all measures are drawn (so stem metadata is available)
        const chordRenderer = new ChordRenderer();
        
        // Calculate chord vertical offset: in stem-down mode with counting and pick-strokes/fingerstyle,
        // add extra space to avoid collision with annotations above the staff
        let chordVerticalOffset = 40;
        if (options.stemsDirection === 'down' && options.countingMode && (options.pickStrokes || options.fingerMode)) {
            // Add minimal space for counting numbers + pick-strokes/fingerstyle
            chordVerticalOffset += 20;
        }
        
        chordRenderer.renderChords(svg, lineMeasurePositions, placeAndSizeManager, {
            displayRepeatSymbol: options.displayRepeatSymbol,
            fontSize: 22,
            verticalOffset: chordVerticalOffset
        });
        
        // Render measure numbers if enabled
        if (options.measureNumbering && lineIndex === 0) {
            // Only on first line for now (line-start mode)
            this.drawMeasureNumber(svg, lineMeasurePositions[0], options.measureNumbering.startNumber);
        } else if (options.measureNumbering && options.measureNumbering.interval === 0) {
            // Line-start mode: draw number on first measure of each line
            this.drawMeasureNumber(svg, lineMeasurePositions[0], options.measureNumbering.startNumber + lineMeasurePositions[0].globalIndex);
        }
        
        // Filter notes from the current line for the following methods
        const currentLineNotes = notePositions.filter(n => 
            lineMeasurePositions.some(mp => mp.globalIndex === n.measureIndex)
        );

        const allowedMeasureIndices = new Set(lineMeasurePositions.map(mp => mp.globalIndex));
        
        // Draw Ties (Current line only) - BEFORE pick-strokes
        this.detectAndDrawTies(svg, notePositions, width, tieManager, measurePositions, placeAndSizeManager, stemsDirection, allowedMeasureIndices);

        // Draw Pick-Strokes (Current line only) - AFTER ties to calculate global offset
        this.drawPickStrokes(svg, grid, notePositions as any, placeAndSizeManager, stemsDirection, options, allowedMeasureIndices);
        
        // Draw Fingerstyle Symbols (Current line only)
        this.drawFingerSymbols(svg, grid, notePositions as any, stemsDirection, options, allowedMeasureIndices);
        
        // Draw Counting Numbers (Current line only) - if counting mode is enabled
        if (options.countingMode) {
          CountingRenderer.drawCountingNumbers(svg, notePositions as any, stemsDirection, allowedMeasureIndices, placeAndSizeManager);
        }
        
        // 6. SAVE BARLINES before PlaceAndSizeManager is cleared
        // (needed for global volta rendering)
        const lineBarlines = placeAndSizeManager.getElements()
            .filter(el => el.type === 'barline' && el.metadata?.exactX !== undefined && el.metadata?.measureIndex !== undefined)
            .map(el => ({
                exactX: el.metadata!.exactX,
                visualStartX: el.metadata!.visualStartX,
                visualEndX: el.metadata!.visualEndX,
                y: el.bbox.y,
                measureIndex: el.metadata!.measureIndex!,
                side: el.metadata!.side
            }));
        voltaManager.addBarlines(lineBarlines);
    });

    // ========== GLOBAL VOLTA RENDERING ==========
    // Draw volta brackets AFTER all lines are processed, so we can see all measures
    // This allows voltas to span multiple lines correctly
    voltaManager.renderVoltas(svg, placeAndSizeManager);

    // Global bounds from PlaceAndSizeManager (note: currently contains only the last line)
    // We use the width/height calculated by layout instead, which covers all lines correctly
    const bounds = placeAndSizeManager.getGlobalBounds();
    
    // Display diagnostic report if debug mode enabled
    if (options.debugPlacement) {
        placeAndSizeManager.logDiagnosticReport();
    }
    
    return svg;
  }

  /**
   * Creates an SVG text element with specified properties.
   * 
   * @param text - Text content
   * @param x - X position
   * @param y - Y position
   * @param size - Font size
   * @param weight - Font weight (normal, bold, etc.)
   * @returns SVG text element
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
   * Detects and draws ties between notes.
   * 
   * This method handles three types of ties:
   * 1. Normal ties between adjacent notes
   * 2. "to void" ties (to a virtual note at the end of a line)
   * 3. "from void" ties (from a virtual note at the start of a line)
   * 
   * Cross-line ties are managed by the TieManager.
   * 
   * @param svg - Parent SVG element
   * @param notePositions - Array of all note positions
   * @param svgWidth - Total SVG width
   * @param tieManager - Cross-line tie manager
   * @param measurePositions - Measure positions and lines (to detect line changes)
   */
  private detectAndDrawTies(
    svg: SVGElement,
    notePositions: {x:number,y:number,headLeftX?:number,headRightX?:number,measureIndex:number,chordIndex:number,beatIndex:number,noteIndex:number,tieStart?:boolean,tieEnd?:boolean,tieToVoid?:boolean,tieFromVoid?:boolean,stemTopY?:number,stemBottomY?:number,value?:number,countingNumber?:number,countingSize?:'t'|'m'|'s'}[],
    svgWidth: number,
    tieManager: TieManager,
    measurePositions: {measure: any, lineIndex: number, posInLine: number, globalIndex: number, width: number}[],
    placeAndSizeManager?: PlaceAndSizeManager,
    stemsDirection?: 'up' | 'down',
    allowedMeasureIndices?: Set<number>
  ) {
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
      
      // Adapted clearance based on orientation and point (start/end)
      let clearance: number;
      if (orientation === 'up') {
        // Stems up: ties below
        // Start (right): get much closer → negative clearance to stick to head
        // End (left): move away → stronger clearance (OK)
        clearance = edge === 'right' ? -1 : 3.5;
      } else {
        // Stems down: ties above
        // Start (right): move away → stronger clearance (OK)
        // End (left): get much closer → negative clearance to stick to head
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
    // Cleanup: debug log removed
      
      const path = document.createElementNS(SVG_NS, 'path');
      const dx = Math.abs(endX - startX);
      const baseAmp = Math.min(40, Math.max(8, dx / 6));
      
      // Curve position based on stem direction
      // Stems UP: ties BELOW notes (larger controlY)
      // Stems DOWN: ties ABOVE notes (smaller controlY)
      let controlY: number;
      if (orientation === 'up') {
        // Ties below
        controlY = Math.max(startY, endY) + (isCross ? baseAmp + 10 : baseAmp);
      } else {
        // Ties above (original behavior)
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
        
        // For a quadratic Bézier curve Q(t) = (1-t)²*P0 + 2(1-t)t*P1 + t²*P2
        // The apex (extremum) in Y is at t = (P0 - P1) / (P0 - 2*P1 + P2)
        // Simplified: the furthest point is NOT controlY but a weighted average
        // At t=0.5 (curve midpoint): Y = 0.25*startY + 0.5*controlY + 0.25*endY
        const midCurveY = 0.25 * startY + 0.5 * controlY + 0.25 * endY;
        
        // Calculate actual curve extrema
        const topY = Math.min(startY, endY, midCurveY, controlY);
        const bottomY = Math.max(startY, endY, midCurveY, controlY);
        
        placeAndSizeManager.registerElement('tie', { 
          x: minX, 
          y: topY, 
          width: maxX - minX, 
          height: bottomY - topY 
        }, 3, { 
          cross: isCross,
          exactX: (startX + endX) / 2,
          exactY: controlY,
          midCurveY: midCurveY,  // Actual midpoint of the Bézier curve
          orientation: orientation  // 'up' or 'down' to know where the curve is
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
    for (let i = 0; i < notePositions.length; i++) {
      if (matched.has(i)) continue;
      const cur = notePositions[i];

      // FILTER: If processing only a specific line, ignore notes from other measures
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
        // Priority: look for a tieEnd in the SAME measure before widening
        for (let j = i + 1; j < notePositions.length; j++) {
          if (matched.has(j)) continue;
          const cand = notePositions[j];
          if (!cand.tieEnd) continue;
          if (cand.measureIndex === cur.measureIndex) { found = j; break; }
        }
        // If not found in the same measure, then search globally
        if (found < 0) {
          for (let j = i + 1; j < notePositions.length; j++) {
            if (matched.has(j)) continue;
            const cand = notePositions[j];
            if (cand.tieEnd) { found = j; break; }
          }
        }

        if (found >= 0) {
          // Cleanup: debug log removed
  // Cleanup: debug log removed
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
      }

      // If this note marks the start of a tie from the previous line
      if (cur.tieFromVoid && !matched.has(i)) {

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
   * Pre-registers barline positions in PlaceAndSizeManager with enriched metadata.
   * This allows volta text and other elements to detect and avoid collisions with barlines.
   * 
   * @param measurePositions - Array of measure positions
   * @param placeAndSizeManager - Collision detection manager
   */
  private registerBarlines(
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
        let barlineWidth = 6;
        let visualStartX = leftBarX; // Default for normal barline (thin line at leftBarX, stroke-width: 1.5)
        let visualEndX = leftBarX; // Normal barlines are visually at the same x (thin line)
        
        if (barlineType === 'repeat-start') {
          // ||: - Thick bar at leftBarX (stroke-width: 3), thin bar at leftBarX+6 (stroke-width: 1.5)
          // Visual extent: leftBarX - 1.5 (left edge of thick bar) to leftBarX + 6 + 0.75 (right edge of thin bar)
          barlineWidth = 10;
          visualStartX = leftBarX - 1.5; // Left edge of thick bar
          visualEndX = leftBarX + 6.75; // Right edge of thin bar (6 + stroke-width/2)
        }
        
        placeAndSizeManager.registerElement('barline', {
          x: leftBarX - 3,
          y: y,
          width: barlineWidth,
          height: height
        }, 0, { 
          exactX: leftBarX, 
          measureIndex: mp.globalIndex, 
          side: 'left', 
          type: barlineType,
          visualStartX,
          visualEndX,
          thinLineX: barlineType === 'repeat-start' ? leftBarX + 6 : leftBarX,
          thickLineX: barlineType === 'repeat-start' ? leftBarX : undefined,
          dotsX: barlineType === 'repeat-start' ? leftBarX + 12 : undefined
        });
      }
      
      // Register right barline (always present)
      let barlineType = 'normal';
      let barlineWidth = 6;
      let visualStartX = rightBarX; // Default for normal barline
      let visualEndX = rightBarX;   // Default for normal barline
      let thinLineX = rightBarX;
      let thickLineX: number | undefined = undefined;
      let dotsX: number | undefined = undefined;
      
      if (measure.barline === ':||' || measure.barline === 'repeat-end') {
        // :|| - Thin bar at rightBarX (stroke-width: 1.5), thick bar at rightBarX+6 (stroke-width: 3)
        // Visual extent: rightBarX - 0.75 (left edge of thin bar) to rightBarX + 6 + 1.5 (right edge of thick bar)
        barlineType = 'repeat-end';
        barlineWidth = 10;
        visualStartX = rightBarX - 0.75; // Left edge of thin bar
        visualEndX = rightBarX + 7.5; // Right edge of thick bar (6 + stroke-width/2)
        thinLineX = rightBarX;
        thickLineX = rightBarX + 6;
        dotsX = rightBarX - 12; // Dots are 12px to the left
      } else if (measure.barline === '||') {
        // || - Two thin lines at rightBarX and rightBarX+6 (both stroke-width: 5)
        // Visual extent: rightBarX - 2.5 to rightBarX + 6 + 2.5
        barlineType = 'final-double';
        barlineWidth = 10;
        visualStartX = rightBarX - 2.5;
        visualEndX = rightBarX + 8.5;
        thinLineX = rightBarX;
        thickLineX = rightBarX + 6;
      }
      
      placeAndSizeManager.registerElement('barline', {
        x: rightBarX - 3,
        y: y,
        width: barlineWidth,
        height: height
      }, 0, { 
        exactX: rightBarX, 
        measureIndex: mp.globalIndex, 
        side: 'right', 
        type: barlineType,
        visualStartX,
        visualEndX,
        thinLineX,
        thickLineX,
        dotsX
      });
    });
  }

  /**
   * Pre-registers volta text positions in PlaceAndSizeManager with enriched metadata.
   * Uses barline visual end positions to avoid collisions.
   * 
   * @param measurePositions - Array of measure positions with x, y coordinates
   * @param placeAndSizeManager - Collision detection manager
   */
  private registerVoltaText(
    measurePositions: Array<{ measure: Measure; lineIndex: number; posInLine: number; globalIndex: number; width: number; x?: number; y?: number }>,
    placeAndSizeManager: PlaceAndSizeManager
  ): void {
    // Barlines are already registered, so we can retrieve their exact positions and widths

    // Find all volta starts and calculate text positions
    for (let i = 0; i < measurePositions.length; i++) {
      const mp = measurePositions[i];
      const measure = mp.measure as any;
      
      if (measure.voltaStart) {
        const startMP = measurePositions[i];
        
        // Only process if x, y are defined
        if (startMP.x !== undefined && startMP.y !== undefined) {
          // Retrieve the left barline of the volta from PlaceAndSizeManager
          let startBarline: any;
          if (i > 0 && measurePositions[i - 1].lineIndex === startMP.lineIndex) {
            // Right barline of the previous measure
            const prevMeasureIndex = measurePositions[i - 1].globalIndex;
            startBarline = placeAndSizeManager.getElements().find(
              el => el.type === 'barline' && 
                    el.metadata?.measureIndex === prevMeasureIndex && 
                    el.metadata?.side === 'right'
            );
          } else {
            // Left barline of the first measure of the line
            startBarline = placeAndSizeManager.getElements().find(
              el => el.type === 'barline' && 
                    el.metadata?.measureIndex === startMP.globalIndex && 
                    el.metadata?.side === 'left'
            );
          }
          
          // startX is the VISUAL RIGHT edge of the barline (so text doesn't overlap)
          // Using visualEndX from metadata (PlaceAndSizeManager as single source of truth)
          const startX = startBarline?.metadata?.visualEndX
            ?? (startBarline ? startBarline.bbox.x + startBarline.bbox.width : undefined)
            ?? ((i > 0 && measurePositions[i - 1].lineIndex === startMP.lineIndex)
              ? measurePositions[i - 1].x! + measurePositions[i - 1].width
              : startMP.x!);
          
          const y = startMP.y;
          const textSize = 14;
          const textOffset = LAYOUT.VOLTA_TEXT_OFFSET;
          const textMargin = LAYOUT.VOLTA_TEXT_MARGIN;
          const leftPadding = LAYOUT.VOLTA_TEXT_LEFT_PADDING; // Extra left padding for collision clearance
          const voltaInfo = measure.voltaStart;
          
          // Calculate initial text position (AFTER the barline)
          const initialTextX = startX + textOffset;
          const textY = y + textSize + 2;
          const estimatedTextWidth = voltaInfo.text.length * (textSize * 0.6);
          
          // Create bbox with extended left padding to ensure proper collision detection with barlines
          // The left padding extends the bbox leftward without moving the text position
          const initialBBox = {
            x: initialTextX - textMargin - leftPadding,
            y: textY - textSize - textMargin,
            width: estimatedTextWidth + (2 * textMargin) + leftPadding,
            height: textSize + (2 * textMargin)
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
          // Store leftPadding in metadata so drawVoltaBrackets can correctly position the text
          placeAndSizeManager.registerElement('volta-text', finalBBox, 5, {
            text: voltaInfo.text,
            exactX: finalBBox.x + textMargin + leftPadding + estimatedTextWidth / 2,
            exactY: textY - textSize / 2,
            textMargin: textMargin,
            leftPadding: leftPadding,
            measureIndex: i  // Add measureIndex so drawVoltaBrackets can find it
          });
        }
      }
    }
  }

  /**
   * Pre-registration of pick-strokes in PlaceAndSizeManager WITHOUT drawing them.
   * This method must be called BEFORE detectAndDrawTies() so that ties
   * can detect and avoid pick-strokes via the layer system.
   * 
   * Calculates the same positions as drawPickStrokes but only registers
   * bounding boxes in PlaceAndSizeManager.
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
    if (!mode) return;

    // Detect the global subdivision (8 or 16) automatically
    const step = this.detectGlobalSubdivision(grid);

    // 2) Build the timeline (same logic as drawPickStrokes)
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

    // Iterate through all measures/segments/beats/notes to build the timeline
    grid.measures.forEach((measure, measureIndex) => {
      const segments = measure.chordSegments || [];
      segments.forEach((segment, chordIndex) => {
        segment.beats.forEach((beat, beatIndex) => {
          beat.notes.forEach((note, noteIndex) => {
            // Calculate how many subdivisions this note occupies
            const noteDuration = note.value; // 1, 2, 4, 8, 16, 32, 64
            const dottedMultiplier = note.dotted ? 1.5 : 1;
            const subdivisionCount = Math.round((step / noteDuration) * dottedMultiplier);
            
            // Register this note in the timeline
            const isAttack = !note.isRest && !note.tieEnd && !note.tieFromVoid;
            notesOnTimeline.push({
              measureIndex,
              chordIndex,
              beatIndex,
              noteIndex,
              subdivisionStart: currentSubdivision,
              isAttack
            });
            
            // Advance the timeline
            currentSubdivision += subdivisionCount;
          });
        });
      });
    });

    // 3) Assign pick-stroke directions to each timeline position
    let isDown = true;
    for (let i = 0; i < currentSubdivision; i++) {
      timeline.push({
        pickDirection: isDown ? 'down' : 'up',
        subdivisionIndex: i
      });
      isDown = !isDown;
    }

    // 4) Identify real attacks with their pick-stroke direction
    const attacksWithPicks = notesOnTimeline
      .filter(n => n.isAttack)
      .map(n => ({
        measureIndex: n.measureIndex,
        chordIndex: n.chordIndex,
        beatIndex: n.beatIndex,
        noteIndex: n.noteIndex,
        pickDirection: timeline[n.subdivisionStart]?.pickDirection || 'down'
      }))

    // 4) Calculate symbol dimensions (same constants as drawPickStrokes)
    const UPBOW_W = 24.2;
    const UPBOW_H = 39.0;
    const DOWNBOW_W = 32;
    const DOWNBOW_H = 33;
    const TARGET_H = 12;
    const MARGIN = 3;
    const NOTE_HEAD_HALF_HEIGHT = 5;

    // 5) Register bounding boxes without drawing
    attacksWithPicks.forEach(attackInfo => {
      // FILTER: If processing only a specific line, ignore other measures
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
   * Rendering of pick-strokes (down/up) using user-provided paths.
   * - Global strict alternation (Down, Up, Down, ...)
   * - Subdivision detected on the ENTIRE block (auto) or forced (8/16)
   * - Placement relative to stems: stems-down => ABOVE; stems-up => BELOW
   * - Collisions managed via PlaceAndSizeManager (vertical first)
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
    if (!mode) return;

    // Detect the global subdivision (8 or 16) automatically
    const step = this.detectGlobalSubdivision(grid);

    // 2) Build a continuous rhythmic TIMELINE based on the subdivision
    // Each note/rest occupies a certain number of subdivision "slots"
    // We iterate through all measures in order to build this timeline
    interface TimelineSlot {
      pickDirection: 'down' | 'up';
      subdivisionIndex: number; // absolute position in the timeline (0, 1, 2, ...)
    }
    interface NoteOnTimeline {
      measureIndex: number;
      chordIndex: number;
      beatIndex: number;
      noteIndex: number;
      subdivisionStart: number; // where this note starts in the timeline
      isAttack: boolean; // true if it's a real attack (not rest, not tieEnd)
    }

    const timeline: TimelineSlot[] = [];
    const notesOnTimeline: NoteOnTimeline[] = [];
    let currentSubdivision = 0;

    // Iterate through all measures/segments/beats/notes to build the timeline
    grid.measures.forEach((measure, measureIndex) => {
      const segments = measure.chordSegments || [];
      segments.forEach((segment, chordIndex) => {
        segment.beats.forEach((beat, beatIndex) => {
          beat.notes.forEach((note, noteIndex) => {
            // Calculate how many subdivisions this note occupies
            const noteDuration = note.value; // 1, 2, 4, 8, 16, 32, 64
            const dottedMultiplier = note.dotted ? 1.5 : 1;
            
            // Number of subdivisions occupied = note duration expressed in 'step' units
            // E.g.: if step=16 and note=8, then 8 occupies 2 subdivisions of 16
            // E.g.: if step=8 and note=8, then 8 occupies 1 subdivision of 8
            const subdivisionCount = Math.round((step / noteDuration) * dottedMultiplier);
            
            // Register this note in the timeline
            const isAttack = !note.isRest && !note.tieEnd && !note.tieFromVoid;
            notesOnTimeline.push({
              measureIndex,
              chordIndex,
              beatIndex,
              noteIndex,
              subdivisionStart: currentSubdivision,
              isAttack
            });
            
            // Advance the timeline by subdivisionCount positions
            currentSubdivision += subdivisionCount;
          });
        });
      });
    });

    // 3) Assign pick-stroke directions (Down/Up) to each timeline position
    let isDown = true; // start with Down
    for (let i = 0; i < currentSubdivision; i++) {
      timeline.push({
        pickDirection: isDown ? 'down' : 'up',
        subdivisionIndex: i
      });
      isDown = !isDown; // alternate
    }

    // 4) Map notes with real attacks to their pick-stroke direction
    // Check if note has forced pickDirection; if not, use automatic alternation
    const attacksWithPicks = notesOnTimeline
      .filter(n => n.isAttack)
      .map(n => {
        const note = grid.measures[n.measureIndex].chordSegments?.[n.chordIndex]?.beats[n.beatIndex]?.notes[n.noteIndex];
        const forcedDirection = note?.pickDirection;
        // Use forced direction if present, otherwise use automatic alternation
        const direction = forcedDirection ? (forcedDirection === 'd' || forcedDirection === 'down' ? 'down' : 'up') : (timeline[n.subdivisionStart]?.pickDirection || 'down');
        return {
          ...n,
          pickDirection: direction
        };
      });

    // Original paths (extracted from provided SVGs - BLACK SHAPE ONLY)
    // Upbow (inverted V) from Music-upbow.svg
    // Path: "M 125.6,4.1 113.3,43.1 101.4,4.1 l 3.3,0 8.6,28.6 9.2,-28.6 z"
    // Original BBox: x ~101.4-125.6 (24.2), y ~4.1-43.1 (39.0)
    const UPBOW_PATH = "M 125.6,4.1 113.3,43.1 101.4,4.1 l 3.3,0 8.6,28.6 9.2,-28.6 z";
    const UPBOW_ORIG_X = 101.4;
    const UPBOW_ORIG_Y = 4.1;
    const UPBOW_W = 24.2;
    const UPBOW_H = 39.0;

    // Downbow (square with opening at bottom) from Music-downbow.svg
    // Path: "m 99,44 -2,0 L 97,11 l 32,0 0,33 L 127,44 127,25 99,25 z"
    // Original BBox: x ~97-129 (32), y ~11-44 (33)
    const DOWNBOW_PATH = "m 99,44 -2,0 L 97,11 l 32,0 0,33 L 127,44 127,25 99,25 z";
    const DOWNBOW_ORIG_X = 97;
    const DOWNBOW_ORIG_Y = 11;
    const DOWNBOW_W = 32;
    const DOWNBOW_H = 33;

    // Target visual size (height) in px
    const TARGET_H = 12; // adjustable
    const MARGIN = 3;    // distance from note head

    // 5) Collision avoidance DISABLED for v2.2.x
    // Pick-strokes always stay at their natural position near notes
    // Even if they overlap with ties - better to see all information
    // TODO v2.3: Implement MuseScore-inspired collision system
    let globalVerticalOffset = 0;

    // 6) Pick-strokes remain at fixed position near notes (no offset)
    //    It's up to other elements (chords, tuplets) to avoid them via the layer system

    // Drawing function for pick-strokes at fixed position (no offset)
    const drawSymbol = (
      isDown: boolean,
      anchorX: number,
      noteHeadEdgeY: number,  // Y of the note head edge (top or bottom depending on stems)
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

      // Position with global offset to avoid ties
      // Calculate extra offset for counting numbers (if enabled)
      let countingOffset = 0;
      if (options.countingMode) {
        // When counting is active, add space for counting numbers
        // Below (stems-up): push pick-strokes down
        // Above (stems-down): push pick-strokes up
        countingOffset = NOTATION.COUNTING_FONT_SIZE_TALL + NOTATION.COUNTING_MARGIN;
      }
      
      // Adjust margin: smaller margin below (stems-up) to bring pick-strokes closer to notes
      // BUT only when counting is active, otherwise keep normal margin
      const effectiveMargin = placeAbove ? MARGIN : (options.countingMode ? (MARGIN - 2) : MARGIN);
      
      // Offset is applied in the same direction as placement (placeAbove)
      const baseY = placeAbove ? (noteHeadEdgeY - effectiveMargin - th - countingOffset) : (noteHeadEdgeY + effectiveMargin + countingOffset);
      const finalY = baseY + globalVerticalOffset;
      const finalX = anchorX - tw / 2;

      const translateX = finalX - origX * scale;
      const translateY = finalY - origY * scale;

      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('transform', `translate(${translateX.toFixed(2)}, ${translateY.toFixed(2)}) scale(${scale.toFixed(4)})`);
      g.setAttribute('data-pick-stroke', 'true');  // Identify pick stroke elements
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', '#000');
      path.setAttribute('stroke', 'none');
      g.appendChild(path);
      svg.appendChild(g);

      // Register for collisions
      const bbox = { x: finalX, y: finalY, width: tw, height: th };
      placeAndSizeManager.registerElement('pick-stroke', bbox, 7, {
        direction: isDown ? 'down' : 'up',
        exactX: anchorX,
        exactY: placeAbove ? (finalY + th) : finalY,
      });
    };

    // 6) Rendering of pick-strokes at fixed position
    attacksWithPicks.forEach(attackInfo => {
      // FILTER: If processing only a specific line, ignore other measures
      if (allowedMeasureIndices && !allowedMeasureIndices.has(attackInfo.measureIndex)) return;

      const notePos = notePositions.find(np =>
        np.measureIndex === attackInfo.measureIndex &&
        np.chordIndex === attackInfo.chordIndex &&
        np.beatIndex === attackInfo.beatIndex &&
        np.noteIndex === attackInfo.noteIndex
      );
      
      if (notePos) {
        // Determine stem direction for THIS specific note
        const hasStem = notePos.stemTopY !== undefined && notePos.stemBottomY !== undefined;
        const stemDirection = hasStem && notePos.stemTopY! < notePos.y ? 'up' : 'down';
        const placeAbove = stemDirection === 'down'; // stems-down → pick above
        
        // Calculate note head edge (top or bottom depending on stem direction)
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
   * Detection of minimum subdivision across the entire block.
   * Rule: if the slightest effective attack corresponds to 16 (or shorter), return 16; otherwise 8.
   */
  private detectGlobalSubdivision(grid: ChordGrid): 8 | 16 {
    // Build a set of tuplets by groupId for each measure to deduce their baseLen
    let hasSixteenth = false;
    for (const measure of grid.measures) {
      // Map groupId -> baseLen (maximum numerical value encountered in the group)
      const groupBase: Record<string, number> = {};
      // First pass: collect baseLen
      for (const seg of (measure.chordSegments || [])) {
        for (const beat of seg.beats) {
          for (const n of beat.notes) {
            if (n.tuplet) {
              const gid = n.tuplet.groupId;
              const prev = groupBase[gid] ?? 0;
              // baseLen = shortest duration => largest number (16 < 8 in duration, but value 16 > 8)
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
   * Translate finger symbol from English to target language if needed.
   * @param symbol - Original symbol (t, tu, h, hu, p, pu, m, mu)
   * @param language - Target language ('en' or 'fr')
   * @returns Translated symbol
   */
  private translateFingerSymbol(symbol: string, language?: 'en' | 'fr'): string {
    if (!language || language === 'en') return symbol;
    
    // French translation
    const translations: Record<string, string> = {
      't': 'p',
      'tu': 'pu',
      'h': 'm',
      'hu': 'mu'
    };
    
    return translations[symbol] || symbol;
  }

  /**
   * Draw fingerstyle symbols on notes.
   * Uses StrumPatternRenderer for pattern logic with 3-level priority:
   * 1. Explicit symbols (user-defined in notation)
   * 2. Predefined patterns (from FINGER_PATTERNS)
   * 3. Automatic alternation (fallback)
   */
  private drawFingerSymbols(
    svg: SVGElement,
    grid: ChordGrid,
    notePositions: Array<{ x: number; y: number; measureIndex: number; chordIndex: number; beatIndex: number; noteIndex: number; tieEnd?: boolean; tieFromVoid?: boolean; value?: number; stemTopY?: number; stemBottomY?: number }>,
    stemsDirection: 'up' | 'down',
    options: RenderOptions,
    allowedMeasureIndices?: Set<number>
  ) {
    const fingerMode = options.fingerMode;
    if (!fingerMode) return;

    // Use StrumPatternRenderer to assign symbols to notes
    const notesWithDirections = StrumPatternRenderer.assignDirections(grid, {
      mode: 'finger',
      language: fingerMode // 'en' or 'fr'
    });

    // Drawing constants from NOTATION
    const LETTER_FONT_SIZE = NOTATION.PATTERN_LETTER_FONT_SIZE;
    const ARROW_FONT_SIZE = NOTATION.PATTERN_ARROW_FONT_SIZE;
    const MARGIN = NOTATION.PATTERN_MARGIN;
    const NOTE_HEAD_HALF_HEIGHT = NOTATION.PATTERN_NOTE_HEAD_HALF_HEIGHT;

    // Draw each note with its assigned symbol
    notesWithDirections.forEach(noteInfo => {
      // Filter by line if needed
      if (allowedMeasureIndices && !allowedMeasureIndices.has(noteInfo.measureIndex)) return;

      // Find the corresponding note position
      const notePos = notePositions.find(np =>
        np.measureIndex === noteInfo.measureIndex &&
        np.chordIndex === noteInfo.chordIndex &&
        np.beatIndex === noteInfo.beatIndex &&
        np.noteIndex === noteInfo.noteIndex
      );

      if (!notePos || !noteInfo.assignedSymbol) return;

      // Determine placement (above or below note)
      const hasStem = notePos.stemTopY !== undefined && notePos.stemBottomY !== undefined;
      const stemDirection = hasStem && notePos.stemTopY! < notePos.y ? 'up' : 'down';
      const placeAbove = stemDirection === 'down'; // stems-down → symbol above

      const noteHeadTop = notePos.y - NOTE_HEAD_HALF_HEIGHT;
      const noteHeadBottom = notePos.y + NOTE_HEAD_HALF_HEIGHT;
      const noteHeadEdgeY = placeAbove ? noteHeadTop : noteHeadBottom;

      // Convert symbol to display format: separate letter and arrow
      // Symbols ending with 'u' (tu, pu, hu, mu) → letter + ↑
      // Symbols ending with 'd' (td, pd, hd, md) → letter + ↓
      const symbol = noteInfo.assignedSymbol;
      let letter: string;
      let arrow: string;
      
      if (symbol.endsWith('u')) {
        // Remove 'u' and add up arrow
        letter = symbol.slice(0, -1);
        arrow = '↑';
      } else if (symbol.endsWith('d')) {
        // Remove 'd' and add down arrow
        letter = symbol.slice(0, -1);
        arrow = '↓';
      } else {
        // Fallback: just use the symbol as-is (shouldn't happen with normalized symbols)
        letter = symbol;
        arrow = '';
      }

      // Calculate extra offset for counting numbers (if enabled)
      let countingOffset = 0;
      if (options.countingMode) {
        // When counting is active, add space for counting numbers
        // Below (stems-up): push fingerstyle down
        // Above (stems-down): push fingerstyle up
        countingOffset = NOTATION.COUNTING_FONT_SIZE_TALL + NOTATION.COUNTING_MARGIN;
      }
      
      // Adjust margin: smaller margin below (stems-up) to bring fingerstyle closer to notes
      const effectiveMargin = placeAbove ? MARGIN : -5;
      
      // Calculate Y position (use larger arrow size for spacing)
      const textY = placeAbove 
        ? (noteHeadEdgeY - effectiveMargin - countingOffset)
        : (noteHeadEdgeY + effectiveMargin + ARROW_FONT_SIZE + countingOffset);

      // Calculate horizontal spacing
      // Letter width approximation: ~0.6 * font size for 'p' or 'm'
      const letterWidth = LETTER_FONT_SIZE * 0.6;
      const spacing = 1; // Small gap between letter and arrow
      
      // Position letter slightly to the left
      const letterX = notePos.x - (letterWidth / 2) - (spacing / 2);
      // Position arrow slightly to the right
      const arrowX = notePos.x + (letterWidth / 2) + (spacing / 2);

      // Create text element for letter (p, m)
      const letterText = document.createElementNS(SVG_NS, 'text');
      letterText.setAttribute('x', letterX.toFixed(2));
      letterText.setAttribute('y', textY.toFixed(2));
      letterText.setAttribute('font-family', TYPOGRAPHY.DEFAULT_FONT_FAMILY);
      letterText.setAttribute('font-size', LETTER_FONT_SIZE.toString());
      letterText.setAttribute('font-weight', TYPOGRAPHY.DEFAULT_FONT_WEIGHT_BOLD);
      letterText.setAttribute('text-anchor', 'middle');
      letterText.setAttribute('fill', '#000');
      letterText.setAttribute('data-finger-symbol', 'letter');
      letterText.textContent = letter;
      
      svg.appendChild(letterText);

      // Create text element for arrow (↑, ↓) if present
      if (arrow) {
        const arrowText = document.createElementNS(SVG_NS, 'text');
        arrowText.setAttribute('x', arrowX.toFixed(2));
        arrowText.setAttribute('y', textY.toFixed(2));
        arrowText.setAttribute('font-family', TYPOGRAPHY.DEFAULT_FONT_FAMILY);
        arrowText.setAttribute('font-size', ARROW_FONT_SIZE.toString());
        arrowText.setAttribute('font-weight', TYPOGRAPHY.DEFAULT_FONT_WEIGHT_BOLD);
        arrowText.setAttribute('text-anchor', 'middle');
        arrowText.setAttribute('fill', '#000');
        arrowText.setAttribute('data-finger-symbol', 'arrow');
        arrowText.textContent = arrow;
        
        svg.appendChild(arrowText);
      }
    });
  }

  /**
   * Draw a measure number at the top-left of a measure.
   * Used for measure numbering display.
   * 
   * @param svg - Parent SVG element
   * @param measurePosition - Position info for the measure
   * @param number - Measure number to display
   */
  private drawMeasureNumber(svg: SVGElement, measurePosition: any, number: number): void {
    const x = measurePosition.x + LAYOUT.BASE_LEFT_PADDING + NOTATION.MEASURE_NUMBER_X_OFFSET;
    const y = measurePosition.y + NOTATION.MEASURE_NUMBER_Y_OFFSET;
    
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', x.toString());
    text.setAttribute('y', y.toString());
    text.setAttribute('font-size', NOTATION.MEASURE_NUMBER_FONT_SIZE.toString());
    text.setAttribute('font-family', TYPOGRAPHY.DEFAULT_FONT_FAMILY);
    text.setAttribute('font-weight', TYPOGRAPHY.DEFAULT_FONT_WEIGHT_BOLD);
    text.setAttribute('fill', NOTATION.MEASURE_NUMBER_COLOR);
    text.textContent = number.toString();
    
    svg.appendChild(text);
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
                    // Found! Check for line change
                    if (current.lineIndex !== target.lineIndex) {
                        current.note.tieToVoid = true;
                        target.note.tieFromVoid = true;
                    }
                    break; // Found target, stop searching for this tieStart
                }
            }
        }
    }
  }
}
