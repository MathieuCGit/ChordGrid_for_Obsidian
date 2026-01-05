import { RestRenderer } from './RestRenderer';
import { NoteRenderer, NotePosition } from './NoteRenderer';
import { Beat, Measure, NoteElement, ChordGrid, ChordSegment } from '../parser/type';
import { PlaceAndSizeManager } from './PlaceAndSizeManager';
import { TimeSignatureRenderer } from './TimeSignatureRenderer';
import { 
    SVG_NS, 
    LAYOUT, 
    NOTATION, 
    NOTE_SPACING, 
    SEGMENT_WIDTH,
    VISUAL,
    POSITIONING,
    TYPOGRAPHY
} from './constants';

/**
 * @file MeasureRenderer.ts
 * @description SVG rendering of a musical measure (staff and barlines).
 * 
 * This renderer handles:
 * - Staff lines
 * - Barlines (simple, double, repeats)
 * - Repeat counters
 * - Measure layout and coordinates
 * 
 * Note rendering is delegated to NoteRenderer.
 */
export class MeasureRenderer {
    /**
     * Measure renderer constructor.
     * 
     * @param measure - Measure to render
     * @param x - Starting X position of the measure in the SVG
     * @param y - Starting Y position of the measure in the SVG
     * @param width - Width allocated to the measure
     * @param beamedAtLevel1 - Set of segmentIndex:noteIndex that are in level-1 beam groups
     * @param placeAndSizeManager - Position and size manager to avoid overlaps
     * @param stemsDirection - Stem direction ('up' or 'down')
     * @param displayRepeatSymbol - Display the % symbol for repeated measures
     */
    private readonly restRenderer: RestRenderer;
    private readonly noteRenderer: NoteRenderer;
    private readonly timeSignatureRenderer: TimeSignatureRenderer;
    private readonly stemsDirection: 'up' | 'down';
    private readonly displayRepeatSymbol: boolean;

    constructor(
        private readonly measure: Measure,
        private readonly x: number,
        private readonly y: number,
        private readonly width: number,
        private readonly beamedAtLevel1?: Set<string>,
        private readonly placeAndSizeManager?: PlaceAndSizeManager,
        stemsDirection?: 'up' | 'down',
        displayRepeatSymbol?: boolean
    ) {
        this.stemsDirection = stemsDirection === 'down' ? 'down' : 'up';
        this.displayRepeatSymbol = displayRepeatSymbol ?? false;
        this.restRenderer = new RestRenderer(this.placeAndSizeManager);
        this.noteRenderer = new NoteRenderer(this.stemsDirection, this.placeAndSizeManager);
        this.timeSignatureRenderer = new TimeSignatureRenderer(this.placeAndSizeManager);
    }

    /**
     * Draw the complete measure in the SVG.
     * 
     * This method orchestrates rendering of all measure elements:
     * 1. Barlines (left with possible repeat)
     * 2. Staff line
     * 3. Chord segments with their beats
     * 4. Notes and rests with beams
     * 5. Right barline (with possible repeat or double bar)
     * 
     * @param svg - Parent SVG element
     * @param measureIndex - Measure index in the grid (for numbering)
     * @param notePositions - Array collecting positions of all notes (for ties)
     * @param grid - Complete grid (for time signature context, etc.)
     */
    public drawMeasure(svg: SVGElement, measureIndex: number, notePositions: NotePosition[], grid: ChordGrid): void {
        const leftBarX = this.x;
        const rightBarX = this.x + this.width - VISUAL.STROKE_WIDTH_THIN * 2;

        // Check for empty measure (forced by measures-per-line)
        if ((this.measure as any).__isEmpty) {
            this.drawEmptyMeasure(svg, measureIndex);
            return;
        }

        // Check if we should display repeat symbol
        // Three cases to handle:
        // 1. Simple % repeat: show % symbol WITHOUT staff line (just like chord-only)
        // 2. Chord[%] notation: show % symbol WITHOUT staff line
        // 3. Rhythm measure with complex repeat: show % symbol WITH staff line (rare case)
        if (this.displayRepeatSymbol && this.measure.isRepeat) {
            const isChordOnly = (this.measure as any).__isChordOnlyMode;
            const isSimpleRepeat = this.measure.source === '%';
            const isBracketPercent = this.measure.source?.includes('[%]');
            
            if (isChordOnly || isSimpleRepeat || isBracketPercent) {
                // Chord-only repeat, simple % repeat, or [%] repeat: draw % symbol without staff line
                this.drawChordOnlyRepeatMeasure(svg, measureIndex);
            } else {
                // Rhythm repeat with notation: draw % symbol with staff line
                this.drawRhythmRepeatMeasure(svg, measureIndex);
            }
            return;
        }

        // Check for chord-only mode (no rhythm notation)
        if ((this.measure as any).__isChordOnlyMode) {
            this.drawChordOnlyMeasure(svg, measureIndex);
            return;
        }

        // Draw left barline - check for repeat start first
        if ((this.measure as any).isRepeatStart) {
            this.drawBarWithRepeat(svg, leftBarX, this.y, LAYOUT.MEASURE_HEIGHT, true, measureIndex);
        } else if (measureIndex === 0 || (this.measure as any).__isLineStart) {
            this.drawBar(svg, leftBarX, this.y, LAYOUT.MEASURE_HEIGHT, measureIndex, 'left');
        }

        // Draw time signature if marked for display (either changed or line start with different metric)
        if ((this.measure as any).__shouldShowTimeSignature && this.measure.timeSignature) {
            this.drawTimeSignature(svg, this.measure.timeSignature, measureIndex);
        }

        const staffLineY = this.y + NOTATION.STAFF_LINE_Y_OFFSET;
        const staffLine = document.createElementNS(SVG_NS, 'line');
        staffLine.setAttribute('x1', (this.x + LAYOUT.BASE_LEFT_PADDING).toString());
        staffLine.setAttribute('y1', staffLineY.toString());
        staffLine.setAttribute('x2', (this.x + this.width - LAYOUT.BASE_LEFT_PADDING).toString());
        staffLine.setAttribute('y2', staffLineY.toString());
        staffLine.setAttribute('stroke', VISUAL.COLOR_BLACK);
        staffLine.setAttribute('stroke-width', VISUAL.STROKE_WIDTH_THIN.toString());
        svg.appendChild(staffLine);

        // Register staff line in PlaceAndSizeManager
        if (this.placeAndSizeManager) {
            this.placeAndSizeManager.registerElement('staff-line', {
                x: this.x + LAYOUT.BASE_LEFT_PADDING,
                y: staffLineY - VISUAL.STROKE_WIDTH_THIN,
                width: this.width - (LAYOUT.BASE_LEFT_PADDING * 2),
                height: VISUAL.STROKE_WIDTH_THIN * 2
            }, 0, { 
                exactX: this.x + (this.width / 2), // Center X of the staff line
                exactY: staffLineY,
                measureIndex
            });
        }

        // Render measure content (rhythm notation)
        const segments: ChordSegment[] = this.measure.chordSegments || [{ chord: this.measure.chord, beats: this.measure.beats }];
    // Track per-segment note index to map to analyzer references
    const segmentNoteCursor: number[] = new Array(segments.length).fill(0);

        // Layout segments: allocate widths proportional to per-beat required width,
        // but insert a visible separator when a segment has leadingSpace=true.
        const totalBeats = segments.reduce((s, seg) => s + (seg.beats ? seg.beats.length : 0), 0) || 1;
        const separatorWidth = LAYOUT.SEPARATOR_WIDTH; // px gap when source had a space
        const separatorsCount = segments.reduce((cnt, seg, idx) => cnt + ((idx > 0 && seg.leadingSpace) ? 1 : 0), 0);

        const innerPaddingPerSegment = LAYOUT.INNER_PADDING_PER_SEGMENT; // preserves previous +/-10 per side
        const totalInnerPadding = innerPaddingPerSegment * segments.length;
        const totalSeparatorPixels = separatorsCount * separatorWidth;

        // Add extra padding if measure starts with repeat barline to avoid collisions
        let extraLeftPadding = (this.measure as any).isRepeatStart ? LAYOUT.EXTRA_LEFT_PADDING_REPEAT : 0;
        
        // Add extra padding for inline time signature to avoid note collision
        if ((this.measure as any).__shouldShowTimeSignature && this.measure.timeSignature) {
            extraLeftPadding += 50; // Space for time signature (about 30px wide + 20px breathing room)
        }

        const availableForBeatCells = Math.max(0, this.width - totalInnerPadding - totalSeparatorPixels - extraLeftPadding);
        // Helper spacing functions (must mirror SVGRenderer)
        const headHalfMax = SEGMENT_WIDTH.HEAD_HALF_MAX;
        const valueMinSpacing = (v: number) => {
            if (v >= 64) return NOTE_SPACING.SIXTY_FOURTH;
            if (v >= 32) return NOTE_SPACING.THIRTY_SECOND;
            if (v >= 16) return NOTE_SPACING.SIXTEENTH;
            if (v >= 8)  return NOTE_SPACING.EIGHTH;
            return NOTE_SPACING.QUARTER_AND_LONGER;
        };
        const requiredBeatWidth = (beat: Beat) => {
            const noteCount = beat?.notes?.length || 0;
            if (noteCount <= 1) return SEGMENT_WIDTH.SINGLE_NOTE_BASE + LAYOUT.BASE_LEFT_PADDING + headHalfMax;
            const spacing = Math.max(
                ...beat.notes.map(n => {
                    const base = valueMinSpacing(n.value);
                    return n.isRest ? base + 4 : base; // rests need a tad more space visually
                })
            );
            return LAYOUT.BASE_LEFT_PADDING + LAYOUT.BASE_LEFT_PADDING + headHalfMax + (noteCount - 1) * spacing + 8;
        };

        // iterate segments and place beats
        // Pre-compute required width sums per segment to distribute measure space fairly
        const perSegmentRequired: number[] = segments.map(seg => {
            const reqs = (seg.beats || []).map(b => requiredBeatWidth(b as Beat));
            return reqs.reduce((a, b) => a + b, 0);
        });
        const totalRequiredAcrossSegments = perSegmentRequired.reduce((a, b) => a + b, 0) || 1;

        let currentX = this.x + extraLeftPadding; // segment left
        for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
            const segment = segments[segmentIndex];

            // if this segment has a leading space (and it's not the first), insert separator gap
            if (segmentIndex > 0 && segment.leadingSpace) {
                currentX += separatorWidth;
            }

            const segBeatCount = segment.beats.length || 1;
            // Determine required width per beat for this segment
            const reqPerBeat = segment.beats.map(b => requiredBeatWidth(b));
            const reqSum = reqPerBeat.reduce((a, b) => a + b, 0) || 1;
            // Allocate segment width proportionally to this segment's requirement within the measure
            const segmentBeatsWidth = availableForBeatCells * (perSegmentRequired[segmentIndex] / totalRequiredAcrossSegments);
            const segmentWidth = segmentBeatsWidth + innerPaddingPerSegment;
            const segmentX = currentX + LAYOUT.BASE_LEFT_PADDING; // inner left padding
            const beatsWidth = segmentWidth - innerPaddingPerSegment;

            // Prefix-sum to place each beat proportionally
            let beatCursorX = segmentX;
            segment.beats.forEach((beat: Beat, beatIndex: number) => {
                const beatWidth = (reqPerBeat[beatIndex] / reqSum) * beatsWidth;
                const beatX = beatCursorX;
                const firstNoteX = this.drawRhythm(svg, beat, beatX, staffLineY, beatWidth, measureIndex, segmentIndex, beatIndex, notePositions, segmentNoteCursor);

                // NOTE: Chord rendering is now handled by ChordRenderer after all measures are drawn
                // This ensures proper alignment with stem metadata
                
                beatCursorX += beatWidth;
            });

            currentX += segmentWidth;
        }

        if ((this.measure as any).isRepeatEnd) {
            this.drawBarWithRepeat(svg, rightBarX, this.y, LAYOUT.MEASURE_HEIGHT, false, measureIndex);
            // Draw repeat count if present (e.g., x3)
            if ((this.measure as any).repeatCount !== undefined) {
                this.drawRepeatCount(svg, rightBarX, (this.measure as any).repeatCount);
            }
        } else if (this.measure.barline === '||') {
            this.drawFinalDoubleBar(svg, rightBarX, this.y, LAYOUT.MEASURE_HEIGHT);
        } else if (this.measure.barline || measureIndex === (grid.measures.length - 1)) {
            this.drawBar(svg, rightBarX, this.y, LAYOUT.MEASURE_HEIGHT, measureIndex, 'right');
        }
    }

    /**
     * Draw the rhythm (notes) of a beat.
     * Delegates rendering to NoteRenderer.
     */
    private drawRhythm(
        svg: SVGElement,
        beat: Beat,
        x: number,
        staffLineY: number,
        width: number,
        measureIndex: number,
        chordIndex: number,
        beatIndex: number,
        notePositions: NotePosition[],
        segmentNoteCursor: number[]
    ): number | null {
        return this.noteRenderer.drawBeat(
            svg,
            beat,
            x,
            staffLineY,
            width,
            measureIndex,
            chordIndex,
            beatIndex,
            notePositions,
            segmentNoteCursor,
            this.beamedAtLevel1
        );
    }

    /**
     * Dessine une barre de mesure simple.
     */
    private drawBar(svg: SVGElement, x: number, y: number, height: number, measureIndex?: number, side?: 'left' | 'right'): void {
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', x.toString());
        line.setAttribute('y1', y.toString());
        line.setAttribute('x2', x.toString());
        line.setAttribute('y2', (y + height).toString());
        line.setAttribute('stroke', '#000');
        line.setAttribute('stroke-width', '1.5');
        svg.appendChild(line);

        // Note: Barline registration is done in SVGRenderer.preRegisterBarlines()
        // to avoid double registration and ensure consistent collision detection
    }

    private drawBarWithRepeat(svg: SVGElement, x: number, y: number, height: number, isStart: boolean, measureIndex?: number): void {
        // For ||: (start repeat): thick line on left (inside), thin on right
        // For :|| (end repeat): thin line on left, thick on right (inside)
        // Repeat barlines use 3px thick line (vs 5px for final double bar)
        
        if (isStart) {
            // ||: - Thick line first (left), then thin line (right)
            const thickBar = document.createElementNS(SVG_NS, 'line');
            thickBar.setAttribute('x1', x.toString());
            thickBar.setAttribute('y1', y.toString());
            thickBar.setAttribute('x2', x.toString());
            thickBar.setAttribute('y2', (y + height).toString());
            thickBar.setAttribute('stroke', VISUAL.COLOR_BLACK);
            thickBar.setAttribute('stroke-width', VISUAL.STROKE_WIDTH_THICK.toString());
            svg.appendChild(thickBar);

            const thinBar = document.createElementNS(SVG_NS, 'line');
            thinBar.setAttribute('x1', (x + LAYOUT.DOUBLE_BAR_SPACING).toString());
            thinBar.setAttribute('y1', y.toString());
            thinBar.setAttribute('x2', (x + LAYOUT.DOUBLE_BAR_SPACING).toString());
            thinBar.setAttribute('y2', (y + height).toString());
            thinBar.setAttribute('stroke', VISUAL.COLOR_BLACK);
            thinBar.setAttribute('stroke-width', VISUAL.STROKE_WIDTH_MEDIUM.toString());
            svg.appendChild(thinBar);
        } else {
            // :|| - Thin line first (left), then thick line (right)
            const thinBar = document.createElementNS(SVG_NS, 'line');
            thinBar.setAttribute('x1', x.toString());
            thinBar.setAttribute('y1', y.toString());
            thinBar.setAttribute('x2', x.toString());
            thinBar.setAttribute('y2', (y + height).toString());
            thinBar.setAttribute('stroke', VISUAL.COLOR_BLACK);
            thinBar.setAttribute('stroke-width', VISUAL.STROKE_WIDTH_MEDIUM.toString());
            svg.appendChild(thinBar);

            const thickBar = document.createElementNS(SVG_NS, 'line');
            thickBar.setAttribute('x1', (x + LAYOUT.DOUBLE_BAR_SPACING).toString());
            thickBar.setAttribute('y1', y.toString());
            thickBar.setAttribute('x2', (x + LAYOUT.DOUBLE_BAR_SPACING).toString());
            thickBar.setAttribute('y2', (y + height).toString());
            thickBar.setAttribute('stroke', VISUAL.COLOR_BLACK);
            thickBar.setAttribute('stroke-width', VISUAL.STROKE_WIDTH_THICK.toString());
            svg.appendChild(thickBar);
        }

        // Position dots based on start/end repeat
        const dotOffset = isStart ? NOTATION.REPEAT_DOT_OFFSET : -NOTATION.REPEAT_DOT_OFFSET;
        
        // Position dots centered on the staff line (y + 80)
        const staffLineY = y + NOTATION.STAFF_LINE_Y_OFFSET;
        const dotSpacing = NOTATION.REPEAT_DOT_OFFSET; // Spacing above and below staff line
        const dot1Y = staffLineY - dotSpacing;  // Above staff line
        const dot2Y = staffLineY + dotSpacing;  // Below staff line
        
        [dot1Y, dot2Y].forEach(dotY => {
            const circle = document.createElementNS(SVG_NS, 'circle');
            const dotX = x + dotOffset;
            circle.setAttribute('cx', dotX.toString());
            circle.setAttribute('cy', dotY.toString());
            circle.setAttribute('r', NOTATION.REPEAT_DOT_RADIUS.toString());
            circle.setAttribute('fill', VISUAL.COLOR_BLACK);
            svg.appendChild(circle);
            
            // Note: Repeat dots registration is done in SVGRenderer.preRegisterBarlines()
            // to avoid double registration
        });

        // Note: Repeat barline registration is done in SVGRenderer.preRegisterBarlines()
        // to ensure consistent collision detection with accurate dimensions
    }

    private drawFinalDoubleBar(svg: SVGElement, x: number, y: number, height: number): void {
        // Thin line (first bar)
        const bar1 = document.createElementNS(SVG_NS, 'line');
        bar1.setAttribute('x1', x.toString());
        bar1.setAttribute('y1', y.toString());
        bar1.setAttribute('x2', x.toString());
        bar1.setAttribute('y2', (y + height).toString());
        bar1.setAttribute('stroke', VISUAL.COLOR_BLACK);
        bar1.setAttribute('stroke-width', VISUAL.STROKE_WIDTH_MEDIUM.toString());
        svg.appendChild(bar1);

        // Thick line (final bar) - as per classical notation, spaced 6px from thin line
        const bar2 = document.createElementNS(SVG_NS, 'line');
        bar2.setAttribute('x1', (x + LAYOUT.DOUBLE_BAR_SPACING).toString());
        bar2.setAttribute('y1', y.toString());
        bar2.setAttribute('x2', (x + LAYOUT.DOUBLE_BAR_SPACING).toString());
        bar2.setAttribute('y2', (y + height).toString());
        bar2.setAttribute('stroke', VISUAL.COLOR_BLACK);
        bar2.setAttribute('stroke-width', VISUAL.STROKE_WIDTH_FINAL.toString());
        svg.appendChild(bar2);

        // Note: Final double barline registration is done in SVGRenderer.preRegisterBarlines()
        // to ensure consistent collision detection
    }

    /**
     * Draw the repeat count (e.g., "x3") after a repeat end barline.
     * @param svg - SVG parent element
     * @param x - X position of the barline
     * @param count - Number of repeats
     */
    private drawRepeatCount(svg: SVGElement, x: number, count: number): void {
        const textX = x + LAYOUT.BASE_LEFT_PADDING; // 10px to the right of the barline
        const textY = this.y + 5; // 5px from top (higher than chords)
        const fontSize = LAYOUT.REPEAT_COUNT_FONT_SIZE; // Larger than time signature (18px), same as chords
        
        const text = document.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', textX.toString());
        text.setAttribute('y', textY.toString());
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('font-size', `${fontSize}px`);
        text.setAttribute('font-weight', 'normal');
        text.setAttribute('fill', VISUAL.COLOR_BLACK);
        text.textContent = `x${count}`;
        svg.appendChild(text);
        
        // Register in collision manager for proper SVG bounds calculation
        if (this.placeAndSizeManager) {
            // Approximate text width: "x3" = ~30px at 22px font
            const textWidth = count >= 10 ? 40 : LAYOUT.REPEAT_COUNT_WIDTH; // Extra width for double digits
            this.placeAndSizeManager.registerElement('repeat-count', {
                x: textX,
                y: textY - fontSize, // Text baseline is at textY, so top is textY - fontSize
                width: textWidth,
                height: fontSize
            }, 5, { 
                count,
                exactX: textX + textWidth / 2,
                exactY: textY
            });
        }
    }

    /**
     * Draw a volta bracket above the staff.
     * 
     * Volta brackets indicate different endings for repeats:
     * - isClosed=true: bracket with right hook ┌─1,2,3────┐ (before :||, loop back)
     * - isClosed=false: bracket without right hook ┌─4───── (after :||, continue)
     * 
     * @param svg - SVG parent element
     * @param startX - Left X position of the bracket
     * @param endX - Right X position of the bracket
     * @param text - Text to display (e.g., "1-3", "4", "1,2,3")
     * @param isClosed - Whether to draw the right hook (closed bracket)
     */
    private drawVoltaBracket(svg: SVGElement, startX: number, endX: number, text: string, isClosed: boolean): void {
        const y = this.y + LAYOUT.BASE_LEFT_PADDING; // Above the staff
        const hookHeight = NOTATION.HOOK_HEIGHT; // Height of descending hooks
        
        // Horizontal line
        const horizontalLine = document.createElementNS(SVG_NS, 'line');
        horizontalLine.setAttribute('x1', startX.toString());
        horizontalLine.setAttribute('y1', y.toString());
        horizontalLine.setAttribute('x2', endX.toString());
        horizontalLine.setAttribute('y2', y.toString());
        horizontalLine.setAttribute('stroke', VISUAL.COLOR_BLACK);
        horizontalLine.setAttribute('stroke-width', VISUAL.STROKE_WIDTH_MEDIUM.toString());
        svg.appendChild(horizontalLine);
        
        // Left descending hook (always present)
        const leftHook = document.createElementNS(SVG_NS, 'line');
        leftHook.setAttribute('x1', startX.toString());
        leftHook.setAttribute('y1', y.toString());
        leftHook.setAttribute('x2', startX.toString());
        leftHook.setAttribute('y2', (y + hookHeight).toString());
        leftHook.setAttribute('stroke', VISUAL.COLOR_BLACK);
        leftHook.setAttribute('stroke-width', VISUAL.STROKE_WIDTH_MEDIUM.toString());
        svg.appendChild(leftHook);
        
        // Right descending hook (only if closed)
        if (isClosed) {
            const rightHook = document.createElementNS(SVG_NS, 'line');
            rightHook.setAttribute('x1', endX.toString());
            rightHook.setAttribute('y1', y.toString());
            rightHook.setAttribute('x2', endX.toString());
            rightHook.setAttribute('y2', (y + hookHeight).toString());
            rightHook.setAttribute('stroke', VISUAL.COLOR_BLACK);
            rightHook.setAttribute('stroke-width', VISUAL.STROKE_WIDTH_MEDIUM.toString());
            svg.appendChild(rightHook);
        }
        
        // Text label (e.g., "1-3" or "4")
        const voltaText = this.createText(text, startX + 5, y - VISUAL.STROKE_WIDTH_THIN * 2, '14px', 'normal');
        voltaText.setAttribute('text-anchor', 'start');
        svg.appendChild(voltaText);
        
        // Register in collision manager
        if (this.placeAndSizeManager) {
            this.placeAndSizeManager.registerElement('volta-bracket', {
                x: startX,
                y: y - LAYOUT.INNER_PADDING_PER_SEGMENT, // Include text height
                width: endX - startX,
                height: hookHeight + LAYOUT.INNER_PADDING_PER_SEGMENT
            }, 1, { text, isClosed }); // Priority 1 - high priority but not absolutely fixed
        }
    }

    /**
     * Draw a chord-only measure (no rhythm notation).
     * Draws only the visual separators (diagonal slash for 2 chords, small slashes for 3+).
     * The actual chord rendering is handled by ChordRenderer.
     * 
     * @param svg - SVG container
     * @param measureIndex - Index of the measure
     */
    /**
     * Draw an empty measure (only barlines, no staff line, no content).
     * Used when measures-per-line is specified to force empty measures to be rendered.
     */
    private drawEmptyMeasure(svg: SVGElement, measureIndex: number): void {
        const leftBarX = this.x;
        const rightBarX = this.x + this.width - VISUAL.STROKE_WIDTH_THIN * 2;

        // Draw left barline
        if ((this.measure as any).isRepeatStart) {
            this.drawBarWithRepeat(svg, leftBarX, this.y, LAYOUT.MEASURE_HEIGHT, true, measureIndex);
        } else if (measureIndex === 0 || (this.measure as any).__isLineStart) {
            this.drawBar(svg, leftBarX, this.y, LAYOUT.MEASURE_HEIGHT, measureIndex, 'left');
        }

        // Draw time signature if marked for display (either changed or line start with different metric)
        if ((this.measure as any).__shouldShowTimeSignature && this.measure.timeSignature) {
            this.drawTimeSignature(svg, this.measure.timeSignature, measureIndex);
        }

        // NO staff line for empty measures - they are truly empty

        // Draw right barline
        if ((this.measure as any).isRepeatEnd) {
            this.drawBarWithRepeat(svg, rightBarX, this.y, LAYOUT.MEASURE_HEIGHT, false, measureIndex);
            if ((this.measure as any).repeatCount !== undefined) {
                this.drawRepeatCount(svg, rightBarX, (this.measure as any).repeatCount);
            }
        } else if (this.measure.barline === '||') {
            this.drawFinalDoubleBar(svg, rightBarX, this.y, LAYOUT.MEASURE_HEIGHT);
        } else {
            this.drawBar(svg, rightBarX, this.y, LAYOUT.MEASURE_HEIGHT, measureIndex, 'right');
        }
    }

    private drawChordOnlyMeasure(svg: SVGElement, measureIndex: number): void {
        const leftBarX = this.x;
        const rightBarX = this.x + this.width - VISUAL.STROKE_WIDTH_THIN * 2;

        // Draw left barline
        if ((this.measure as any).isRepeatStart) {
            this.drawBarWithRepeat(svg, leftBarX, this.y, LAYOUT.MEASURE_HEIGHT, true, measureIndex);
        } else if (measureIndex === 0 || (this.measure as any).__isLineStart) {
            this.drawBar(svg, leftBarX, this.y, LAYOUT.MEASURE_HEIGHT, measureIndex, 'left');
        }

        // Draw time signature if marked for display (either changed or line start with different metric)
        if ((this.measure as any).__shouldShowTimeSignature && this.measure.timeSignature) {
            this.drawTimeSignature(svg, this.measure.timeSignature, measureIndex);
        }

        // Get chord segments for visual separators
        const segments: ChordSegment[] = this.measure.chordSegments || [];
        const chordCount = segments.length;
        
        if (chordCount === 2) {
            // Special case: 2 chords with diagonal slash separator
            // Draw diagonal line from bottom-left to top-right
            // If there's an inline time signature, start the slash after it to avoid collision
            let slashStartX = leftBarX + 5;
            const hasInlineTimeSignature = (this.measure as any).__shouldShowTimeSignature && this.measure.timeSignature;
            
            if (hasInlineTimeSignature) {
                // Time signature is positioned at: this.x + BASE_LEFT_PADDING + 20
                // Add approximately 40px for the time signature width (about 30px) + 10px margin
                slashStartX = leftBarX + LAYOUT.BASE_LEFT_PADDING + 20 + 40;
            }
            
            const slashStartY = this.y + 110; // Near bottom of measure
            const slashEndX = rightBarX - 5;
            const slashEndY = this.y + LAYOUT.BASE_LEFT_PADDING; // Near top of measure
            
            const diagonalLine = document.createElementNS(SVG_NS, 'line');
            diagonalLine.setAttribute('x1', slashStartX.toString());
            diagonalLine.setAttribute('y1', slashStartY.toString());
            diagonalLine.setAttribute('x2', slashEndX.toString());
            diagonalLine.setAttribute('y2', slashEndY.toString());
            diagonalLine.setAttribute('stroke', '#999');
            diagonalLine.setAttribute('stroke-width', '2');
            svg.appendChild(diagonalLine);
        } else if (chordCount > 2) {
            // Multiple chords (3+): draw small slash separators between them
            const availableWidth = this.width - 20; // margins
            const chordSpacing = availableWidth / chordCount;
            
            for (let idx = 1; idx < chordCount; idx++) {
                const slashX = this.x + 10 + chordSpacing * idx;
                const slashLine = document.createElementNS(SVG_NS, 'line');
                slashLine.setAttribute('x1', slashX.toString());
                slashLine.setAttribute('y1', (this.y + 30).toString());
                slashLine.setAttribute('x2', (slashX + 10).toString());
                slashLine.setAttribute('y2', (this.y + 90).toString());
                slashLine.setAttribute('stroke', '#999');
                slashLine.setAttribute('stroke-width', '1.5');
                svg.appendChild(slashLine);
            }
        }

        // Draw right barline
        if ((this.measure as any).isRepeatEnd) {
            this.drawBarWithRepeat(svg, rightBarX, this.y, 120, false, measureIndex);
            if ((this.measure as any).repeatCount !== undefined) {
                this.drawRepeatCount(svg, rightBarX, (this.measure as any).repeatCount);
            }
        } else if (this.measure.barline === '||') {
            this.drawFinalDoubleBar(svg, rightBarX, this.y, 120);
        } else {
            this.drawBar(svg, rightBarX, this.y, 120, measureIndex, 'right');
        }
    }

    /**
     * Draw a chord-only measure with repeat symbol (%).
     * Used when show% is enabled for chord-only repeated measures.
     * Draws the % symbol without staff line (cleaner look for chord-only context).
     */
    private drawChordOnlyRepeatMeasure(svg: SVGElement, measureIndex: number): void {
        const leftBarX = this.x;
        const rightBarX = this.x + this.width - VISUAL.STROKE_WIDTH_THIN * 2;

        // Draw left barline
        if ((this.measure as any).isRepeatStart) {
            this.drawBarWithRepeat(svg, leftBarX, this.y, LAYOUT.MEASURE_HEIGHT, true, measureIndex);
        } else if (measureIndex === 0 || (this.measure as any).__isLineStart) {
            this.drawBar(svg, leftBarX, this.y, LAYOUT.MEASURE_HEIGHT, measureIndex, 'left');
        }

        // Draw time signature if marked for display (either changed or line start with different metric)
        if ((this.measure as any).__shouldShowTimeSignature && this.measure.timeSignature) {
            this.drawTimeSignature(svg, this.measure.timeSignature, measureIndex);
        }

        // Draw % symbol centered (no staff line for chord-only)
        this.drawRepeatSymbol(svg);
        
        // Mark as having repeat symbol for ChordRenderer
        (this.measure as any).__hasRepeatSymbol = true;

        // Draw right barline
        if ((this.measure as any).isRepeatEnd) {
            this.drawBarWithRepeat(svg, rightBarX, this.y, LAYOUT.MEASURE_HEIGHT, false, measureIndex);
            if ((this.measure as any).repeatCount !== undefined) {
                this.drawRepeatCount(svg, rightBarX, (this.measure as any).repeatCount);
            }
        } else if (this.measure.barline === '||') {
            this.drawFinalDoubleBar(svg, rightBarX, this.y, LAYOUT.MEASURE_HEIGHT);
        } else {
            this.drawBar(svg, rightBarX, this.y, LAYOUT.MEASURE_HEIGHT, measureIndex, 'right');
        }
    }

    /**
     * Draw a rhythm measure with repeat symbol (%).
     * Used when show% is enabled for rhythm repeated measures.
     * Draws the % symbol WITH staff line (standard rhythm notation).
     */
    private drawRhythmRepeatMeasure(svg: SVGElement, measureIndex: number): void {
        const leftBarX = this.x;
        const rightBarX = this.x + this.width - VISUAL.STROKE_WIDTH_THIN * 2;
        
        // Draw left barline
        if ((this.measure as any).isRepeatStart) {
            this.drawBarWithRepeat(svg, leftBarX, this.y, LAYOUT.MEASURE_HEIGHT, true, measureIndex);
        } else if (measureIndex === 0 || (this.measure as any).__isLineStart) {
            this.drawBar(svg, leftBarX, this.y, LAYOUT.MEASURE_HEIGHT, measureIndex, 'left');
        }
        
        // Draw time signature if marked for display (either changed or line start with different metric)
        if ((this.measure as any).__shouldShowTimeSignature && this.measure.timeSignature) {
            this.drawTimeSignature(svg, this.measure.timeSignature, measureIndex);
        }
        
        // Draw staff line for repeat symbol
        const staffLineY = this.y + NOTATION.STAFF_LINE_Y_OFFSET;
        const staffLine = document.createElementNS(SVG_NS, 'line');
        staffLine.setAttribute('x1', (this.x + LAYOUT.BASE_LEFT_PADDING).toString());
        staffLine.setAttribute('y1', staffLineY.toString());
        staffLine.setAttribute('x2', (this.x + this.width - LAYOUT.BASE_LEFT_PADDING).toString());
        staffLine.setAttribute('y2', staffLineY.toString());
        staffLine.setAttribute('stroke', VISUAL.COLOR_BLACK);
        staffLine.setAttribute('stroke-width', VISUAL.STROKE_WIDTH_THIN.toString());
        svg.appendChild(staffLine);
        
        // Mark measure as having repeat symbol for ChordRenderer
        (this.measure as any).__hasRepeatSymbol = true;
        
        this.drawRepeatSymbol(svg);
        
        // Draw right barline
        if ((this.measure as any).isRepeatEnd) {
            this.drawBarWithRepeat(svg, rightBarX, this.y, LAYOUT.MEASURE_HEIGHT, false, measureIndex);
            if ((this.measure as any).repeatCount !== undefined) {
                this.drawRepeatCount(svg, rightBarX, (this.measure as any).repeatCount);
            }
        } else if (this.measure.barline === '||') {
            this.drawFinalDoubleBar(svg, rightBarX, this.y, LAYOUT.MEASURE_HEIGHT);
        } else {
            this.drawBar(svg, rightBarX, this.y, LAYOUT.MEASURE_HEIGHT, measureIndex, 'right');
        }
    }

    /**
     * Draw the repeat symbol (%) in the center of the measure.
     * Uses the official SVG path for a classical measure repeat symbol.
     */
    private drawRepeatSymbol(svg: SVGElement): void {
        const centerX = this.x + this.width / 2;
        // Position at staff line height (center of where the staff would be)
        const centerY = this.y + NOTATION.STAFF_LINE_Y_OFFSET;
        
        // SVG path provided by user (original viewBox: 188x178)
        const targetHeight = 30;
        const originalHeight = 178;
        const originalWidth = 188;
        const scale = targetHeight / originalHeight;
        const symbolWidth = originalWidth * scale;
        const symbolHeight = targetHeight;
        const translateX = centerX - symbolWidth / 2;
        const translateY = centerY - symbolHeight / 2 - 2; // slight upward tweak
        
        const group = document.createElementNS(SVG_NS, 'g');
        group.setAttribute('data-repeat-symbol', 'true');
        group.setAttribute('transform', `translate(${translateX.toFixed(2)},${translateY.toFixed(2)}) scale(${scale.toFixed(4)})`);
        
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', 'M 0.29640036,177.3364 35.741505,135.44902 71.186609,93.561637 82.730763,80.33404 116.29431,40.651251 149.85784,0.96846227 h 37.46642 L 153.76072,40.651251 120.19718,80.33404 108.65303,93.561637 73.207926,135.44902 37.762822,177.3364 Z M 131.5485,152.77085 c -3.23819,-3.81078 -5.88759,-10.61356 -5.88759,-15.11723 0,-4.50368 2.6494,-11.30646 5.88759,-15.11724 3.23814,-3.81083 9.01868,-6.92875 12.84561,-6.92875 3.82693,0 9.60748,3.11792 12.84563,6.92875 3.23818,3.81078 5.88758,10.61356 5.88758,15.11724 0,4.50367 -2.6494,11.30645 -5.88758,15.11723 -3.23815,3.81083 -9.0187,6.92875 -12.84563,6.92875 -3.82693,0 -9.60747,-3.11792 -12.84561,-6.92875 z M 34.135803,51.359299 C 30.897632,47.548517 28.24822,40.74574 28.24822,36.242052 c 0,-4.503687 2.649412,-11.306465 5.887583,-15.117246 11.362479,-13.3718214 31.57884,-3.693983 31.57884,15.117246 0,4.503688 -2.649413,11.306465 -5.887583,15.117247 -3.238167,3.810826 -9.018699,6.928747 -12.845629,6.928747 -3.826929,0 -9.607461,-3.117921 -12.845628,-6.928747 z');
        path.setAttribute('fill', '#444');
        
        group.appendChild(path);
        svg.appendChild(group);

        // Register repeat symbol in PlaceAndSizeManager
        if (this.placeAndSizeManager) {
            this.placeAndSizeManager.registerElement('repeat-symbol', {
                x: translateX,
                y: translateY,
                width: symbolWidth,
                height: symbolHeight
            }, 5, {
                exactX: centerX,
                exactY: centerY,
                measureIndex: -1 // Will be set by caller if needed
            });
        }
    }

    /**
     * Draw the right barline of the measure.
     */
    private drawRightBarline(svg: SVGElement, x: number, y: number, height: number): void {
        if ((this.measure as any).isRepeatEnd) {
            this.drawBarWithRepeat(svg, x, y, height, false);
        } else {
            this.drawBar(svg, x, y, height);
        }
    }

    /**
     * Draw a time signature at the start of this measure.
     * Used for inline time signature changes (e.g., 4/4 -> 3/4).
     * Uses TimeSignatureRenderer for standard stacked notation.
     * 
     * @param svg - Parent SVG element
     * @param timeSignature - Time signature to display
     * @param measureIndex - Measure index (for PlaceAndSizeManager)
     */
    private drawTimeSignature(svg: SVGElement, timeSignature: any, measureIndex: number): void {
        // Position: just after the left barline, centered on staff line
        const timeSignatureX = this.x + LAYOUT.BASE_LEFT_PADDING + 20; // 20px from barline for better spacing
        // CRITICAL FIX: Use staffLineY (measure's line Y + staff offset) for proper vertical centering
        // This ensures numerator appears above and denominator below the staff line
        const staffLineY = this.y + NOTATION.STAFF_LINE_Y_OFFSET;
        
        // Use TimeSignatureRenderer for standard notation
        this.timeSignatureRenderer.render(svg, {
            x: timeSignatureX,
            y: staffLineY,
            numerator: timeSignature.numerator || timeSignature.beatsPerMeasure,
            denominator: timeSignature.denominator || timeSignature.beatUnit,
            measureIndex: measureIndex
        }, false); // false = inline time signature (same size as global now)
    }

    private createText(text: string, x: number, y: number, size: string, weight: string = 'normal'): SVGTextElement {
        const textEl = document.createElementNS(SVG_NS, 'text');
        textEl.setAttribute('x', x.toString());
        textEl.setAttribute('y', y.toString());
        textEl.setAttribute('font-family', 'Arial, sans-serif');
        textEl.setAttribute('font-size', size);
        textEl.setAttribute('font-weight', weight);
        textEl.setAttribute('fill', '#000');
        textEl.textContent = text;
        return textEl;
    }
}
