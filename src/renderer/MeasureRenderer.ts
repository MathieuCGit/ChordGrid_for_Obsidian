import { RestRenderer } from './RestRenderer';
import { NoteRenderer, NotePosition } from './NoteRenderer';
import { Beat, Measure, NoteElement, ChordGrid, ChordSegment } from '../parser/type';
import { PlaceAndSizeManager } from './PlaceAndSizeManager';
import { SVG_NS } from './constants';

/**
 * @file MeasureRenderer.ts
 * @description Rendu SVG d'une mesure musicale (staff et barlines).
 * 
 * Ce renderer gère :
 * - Lignes de portée (staff)
 * - Barres de mesure (simples, doubles, reprises)
 * - Compteurs de répétition
 * - Layout et coordonnées de la mesure
 * 
 * Le rendu des notes est délégué à NoteRenderer.
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
    }

    /**
     * Dessine la mesure complète dans le SVG.
     * 
     * Cette méthode orchestre le rendu de tous les éléments de la mesure :
     * 1. Barres de mesure (gauche avec éventuelle reprise)
     * 2. Ligne de portée
     * 3. Segments d'accords avec leurs beats
     * 4. Notes et silences avec ligatures
     * 5. Barre de mesure de fin (avec éventuelle reprise ou double barre)
     * 
     * @param svg - Élément SVG parent
     * @param measureIndex - Index de la mesure dans la grille (pour numérotation)
     * @param notePositions - Tableau collectant les positions de toutes les notes (pour liaisons)
     * @param grid - Grille complète (pour contexte de signature temporelle, etc.)
     */
    public drawMeasure(svg: SVGElement, measureIndex: number, notePositions: NotePosition[], grid: ChordGrid): void {
        const leftBarX = this.x;
        const rightBarX = this.x + this.width - 2;

        // Check for chord-only mode (no rhythm notation)
        if ((this.measure as any).__isChordOnlyMode) {
            this.drawChordOnlyMeasure(svg, measureIndex);
            return;
        }

        // Draw left barline - check for repeat start first
        if ((this.measure as any).isRepeatStart) {
            this.drawBarWithRepeat(svg, leftBarX, this.y, 120, true, measureIndex);
        } else if (measureIndex === 0 || (this.measure as any).__isLineStart) {
            this.drawBar(svg, leftBarX, this.y, 120, measureIndex, 'left');
        }

        const staffLineY = this.y + 80;
        const staffLine = document.createElementNS(SVG_NS, 'line');
        staffLine.setAttribute('x1', (this.x + 10).toString());
        staffLine.setAttribute('y1', staffLineY.toString());
        staffLine.setAttribute('x2', (this.x + this.width - 10).toString());
        staffLine.setAttribute('y2', staffLineY.toString());
        staffLine.setAttribute('stroke', '#000');
        staffLine.setAttribute('stroke-width', '1');
        svg.appendChild(staffLine);

        // Register staff line in PlaceAndSizeManager
        if (this.placeAndSizeManager) {
            this.placeAndSizeManager.registerElement('staff-line', {
                x: this.x + 10,
                y: staffLineY - 1,
                width: this.width - 20,
                height: 2
            }, 0, { 
                exactX: this.x + (this.width / 2), // Center X of the staff line
                exactY: staffLineY,
                measureIndex
            });
        }

        // Check if we should display repeat symbol instead of full rhythm
        if (this.displayRepeatSymbol && this.measure.isRepeat) {
            this.drawRepeatSymbol(svg);
            // Draw chord name at the start of the measure (like normal measures)
            this.drawChordName(svg, this.measure.chord, this.x + 30); // Position at start like first note
            // Draw right barline with ALL barline types (repeat, double bar, simple)
            if ((this.measure as any).isRepeatEnd) {
                this.drawBarWithRepeat(svg, rightBarX, this.y, 120, false, measureIndex);
                // Draw repeat count if present (e.g., x3)
                if ((this.measure as any).repeatCount !== undefined) {
                    this.drawRepeatCount(svg, rightBarX, (this.measure as any).repeatCount);
                }
            } else if (this.measure.barline === '||') {
                this.drawFinalDoubleBar(svg, rightBarX, this.y, 120);
            } else {
                this.drawBar(svg, rightBarX, this.y, 120, measureIndex, 'right');
            }
            return;
        }

    const segments: ChordSegment[] = this.measure.chordSegments || [{ chord: this.measure.chord, beats: this.measure.beats }];
    // Track per-segment note index to map to analyzer references
    const segmentNoteCursor: number[] = new Array(segments.length).fill(0);

        // Layout segments: allocate widths proportional to per-beat required width,
        // but insert a visible separator when a segment has leadingSpace=true.
        const totalBeats = segments.reduce((s, seg) => s + (seg.beats ? seg.beats.length : 0), 0) || 1;
        const separatorWidth = 12; // px gap when source had a space
        const separatorsCount = segments.reduce((cnt, seg, idx) => cnt + ((idx > 0 && seg.leadingSpace) ? 1 : 0), 0);

        const innerPaddingPerSegment = 20; // preserves previous +/-10 per side
        const totalInnerPadding = innerPaddingPerSegment * segments.length;
        const totalSeparatorPixels = separatorsCount * separatorWidth;

    const availableForBeatCells = Math.max(0, this.width - totalInnerPadding - totalSeparatorPixels);
        // Helper spacing functions (must mirror SVGRenderer)
        const headHalfMax = 6;
        const valueMinSpacing = (v: number) => {
            if (v >= 64) return 16;
            if (v >= 32) return 20;
            if (v >= 16) return 26;
            if (v >= 8)  return 24;
            return 20;
        };
        const requiredBeatWidth = (beat: Beat) => {
            const noteCount = beat?.notes?.length || 0;
            if (noteCount <= 1) return 28 + 10 + headHalfMax;
            const spacing = Math.max(
                ...beat.notes.map(n => {
                    const base = valueMinSpacing(n.value);
                    return n.isRest ? base + 4 : base; // rests need a tad more space visually
                })
            );
            return 10 + 10 + headHalfMax + (noteCount - 1) * spacing + 8;
        };

        // iterate segments and place beats
        // Pre-compute required width sums per segment to distribute measure space fairly
        const perSegmentRequired: number[] = segments.map(seg => {
            const reqs = (seg.beats || []).map(b => requiredBeatWidth(b as Beat));
            return reqs.reduce((a, b) => a + b, 0);
        });
        const totalRequiredAcrossSegments = perSegmentRequired.reduce((a, b) => a + b, 0) || 1;

        // Add extra padding if measure starts with repeat barline to avoid collisions
        const extraLeftPadding = (this.measure as any).isRepeatStart ? 15 : 0;
        
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
            const segmentX = currentX + 10; // inner left padding
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
            this.drawBarWithRepeat(svg, rightBarX, this.y, 120, false, measureIndex);
            // Draw repeat count if present (e.g., x3)
            if ((this.measure as any).repeatCount !== undefined) {
                this.drawRepeatCount(svg, rightBarX, (this.measure as any).repeatCount);
            }
        } else if (this.measure.barline === '||') {
            this.drawFinalDoubleBar(svg, rightBarX, this.y, 120);
        } else if (this.measure.barline || measureIndex === (grid.measures.length - 1)) {
            this.drawBar(svg, rightBarX, this.y, 120, measureIndex, 'right');
        }
    }

    /**
     * Dessine le rythme (notes) d'un beat.
     * Délègue le rendu au NoteRenderer.
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
            thickBar.setAttribute('stroke', '#000');
            thickBar.setAttribute('stroke-width', '3');
            svg.appendChild(thickBar);

            const thinBar = document.createElementNS(SVG_NS, 'line');
            thinBar.setAttribute('x1', (x + 6).toString());
            thinBar.setAttribute('y1', y.toString());
            thinBar.setAttribute('x2', (x + 6).toString());
            thinBar.setAttribute('y2', (y + height).toString());
            thinBar.setAttribute('stroke', '#000');
            thinBar.setAttribute('stroke-width', '1.5');
            svg.appendChild(thinBar);
        } else {
            // :|| - Thin line first (left), then thick line (right)
            const thinBar = document.createElementNS(SVG_NS, 'line');
            thinBar.setAttribute('x1', x.toString());
            thinBar.setAttribute('y1', y.toString());
            thinBar.setAttribute('x2', x.toString());
            thinBar.setAttribute('y2', (y + height).toString());
            thinBar.setAttribute('stroke', '#000');
            thinBar.setAttribute('stroke-width', '1.5');
            svg.appendChild(thinBar);

            const thickBar = document.createElementNS(SVG_NS, 'line');
            thickBar.setAttribute('x1', (x + 6).toString());
            thickBar.setAttribute('y1', y.toString());
            thickBar.setAttribute('x2', (x + 6).toString());
            thickBar.setAttribute('y2', (y + height).toString());
            thickBar.setAttribute('stroke', '#000');
            thickBar.setAttribute('stroke-width', '3');
            svg.appendChild(thickBar);
        }

        // Position dots based on start/end repeat
        const dotOffset = isStart ? 12 : -12;
        
        // Position dots centered on the staff line (y + 80)
        const staffLineY = y + 80;
        const dotSpacing = 12; // Spacing above and below staff line
        const dot1Y = staffLineY - dotSpacing;  // Above staff line
        const dot2Y = staffLineY + dotSpacing;  // Below staff line
        
        [dot1Y, dot2Y].forEach(dotY => {
            const circle = document.createElementNS(SVG_NS, 'circle');
            const dotX = x + dotOffset;
            circle.setAttribute('cx', dotX.toString());
            circle.setAttribute('cy', dotY.toString());
            circle.setAttribute('r', '2');
            circle.setAttribute('fill', '#000');
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
        bar1.setAttribute('stroke', '#000');
        bar1.setAttribute('stroke-width', '1.5');
        svg.appendChild(bar1);

        // Thick line (final bar) - as per classical notation, spaced 6px from thin line
        const bar2 = document.createElementNS(SVG_NS, 'line');
        bar2.setAttribute('x1', (x + 6).toString());
        bar2.setAttribute('y1', y.toString());
        bar2.setAttribute('x2', (x + 6).toString());
        bar2.setAttribute('y2', (y + height).toString());
        bar2.setAttribute('stroke', '#000');
        bar2.setAttribute('stroke-width', '5');
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
        const textX = x + 10; // 10px to the right of the barline
        const textY = this.y + 5; // 5px from top (higher than chords)
        const fontSize = 22; // Larger than time signature (18px), same as chords
        
        const text = document.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', textX.toString());
        text.setAttribute('y', textY.toString());
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('font-size', `${fontSize}px`);
        text.setAttribute('font-weight', 'normal');
        text.setAttribute('fill', '#000');
        text.textContent = `x${count}`;
        svg.appendChild(text);
        
        // Register in collision manager for proper SVG bounds calculation
        if (this.placeAndSizeManager) {
            // Approximate text width: "x3" = ~30px at 22px font
            const textWidth = count >= 10 ? 40 : 30; // Extra width for double digits
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
        const y = this.y + 10; // Above the staff
        const hookHeight = 10; // Height of descending hooks
        
        // Horizontal line
        const horizontalLine = document.createElementNS(SVG_NS, 'line');
        horizontalLine.setAttribute('x1', startX.toString());
        horizontalLine.setAttribute('y1', y.toString());
        horizontalLine.setAttribute('x2', endX.toString());
        horizontalLine.setAttribute('y2', y.toString());
        horizontalLine.setAttribute('stroke', '#000');
        horizontalLine.setAttribute('stroke-width', '1.5');
        svg.appendChild(horizontalLine);
        
        // Left descending hook (always present)
        const leftHook = document.createElementNS(SVG_NS, 'line');
        leftHook.setAttribute('x1', startX.toString());
        leftHook.setAttribute('y1', y.toString());
        leftHook.setAttribute('x2', startX.toString());
        leftHook.setAttribute('y2', (y + hookHeight).toString());
        leftHook.setAttribute('stroke', '#000');
        leftHook.setAttribute('stroke-width', '1.5');
        svg.appendChild(leftHook);
        
        // Right descending hook (only if closed)
        if (isClosed) {
            const rightHook = document.createElementNS(SVG_NS, 'line');
            rightHook.setAttribute('x1', endX.toString());
            rightHook.setAttribute('y1', y.toString());
            rightHook.setAttribute('x2', endX.toString());
            rightHook.setAttribute('y2', (y + hookHeight).toString());
            rightHook.setAttribute('stroke', '#000');
            rightHook.setAttribute('stroke-width', '1.5');
            svg.appendChild(rightHook);
        }
        
        // Text label (e.g., "1-3" or "4")
        const voltaText = this.createText(text, startX + 5, y - 2, '14px', 'normal');
        voltaText.setAttribute('text-anchor', 'start');
        svg.appendChild(voltaText);
        
        // Register in collision manager
        if (this.placeAndSizeManager) {
            this.placeAndSizeManager.registerElement('volta-bracket', {
                x: startX,
                y: y - 20, // Include text height
                width: endX - startX,
                height: hookHeight + 20
            }, 1, { text, isClosed }); // Priority 1 - high priority but not absolutely fixed
        }
    }

    /**
     * Draw a chord-only measure (no rhythm notation, just chord symbols centered).
     * Used for simple lead sheets where only chord changes are indicated.
     * 
     * @param svg - SVG container
     * @param measureIndex - Index of the measure
     */
    private drawChordOnlyMeasure(svg: SVGElement, measureIndex: number): void {
        const leftBarX = this.x;
        const rightBarX = this.x + this.width - 2;

        // Draw left barline
        if ((this.measure as any).isRepeatStart) {
            this.drawBarWithRepeat(svg, leftBarX, this.y, 120, true, measureIndex);
        } else if (measureIndex === 0 || (this.measure as any).__isLineStart) {
            this.drawBar(svg, leftBarX, this.y, 120, measureIndex, 'left');
        }

        // Get chord segments
        const segments: ChordSegment[] = this.measure.chordSegments || [];
        const chordCount = segments.length;
        
        if (chordCount === 0) {
            // No chords, just draw barlines
        } else if (chordCount === 1) {
            // Single chord: center it in the measure
            const chord = segments[0].chord;
            const chordX = this.x + this.width / 2;
            const chordY = this.y + 60; // Vertically centered (no staff line)
            const fontSize = 24; // Larger font for chord-only mode
            
            const chordText = this.createText(chord, chordX, chordY, `${fontSize}px`, 'bold');
            chordText.setAttribute('text-anchor', 'middle');
            chordText.setAttribute('font-family', 'Arial, sans-serif');
            svg.appendChild(chordText);
        } else if (chordCount === 2) {
            // Special case: 2 chords with diagonal slash separator
            // Draw diagonal line from bottom-left to top-right
            const slashStartX = leftBarX + 5;
            const slashStartY = this.y + 110; // Near bottom of measure
            const slashEndX = rightBarX - 5;
            const slashEndY = this.y + 10; // Near top of measure
            
            const diagonalLine = document.createElementNS(SVG_NS, 'line');
            diagonalLine.setAttribute('x1', slashStartX.toString());
            diagonalLine.setAttribute('y1', slashStartY.toString());
            diagonalLine.setAttribute('x2', slashEndX.toString());
            diagonalLine.setAttribute('y2', slashEndY.toString());
            diagonalLine.setAttribute('stroke', '#999');
            diagonalLine.setAttribute('stroke-width', '2');
            svg.appendChild(diagonalLine);
            
            // Position chords on either side of the diagonal
            const fontSize = 20;
            
            // First chord: left side, ABOVE the diagonal line (top-left)
            const chord1 = segments[0].chord;
            const chord1X = this.x + this.width * 0.25; // More to the left
            const chord1Y = this.y + 25; // Upper position (above diagonal)
            const chordText1 = this.createText(chord1, chord1X, chord1Y, `${fontSize}px`, 'bold');
            chordText1.setAttribute('text-anchor', 'middle');
            chordText1.setAttribute('font-family', 'Arial, sans-serif');
            svg.appendChild(chordText1);
            
            // Second chord: right side, BELOW the diagonal line (bottom-right)
            const chord2 = segments[1].chord;
            const chord2X = this.x + this.width * 0.75; // More to the right
            const chord2Y = this.y + 95; // Lower position (below diagonal)
            const chordText2 = this.createText(chord2, chord2X, chord2Y, `${fontSize}px`, 'bold');
            chordText2.setAttribute('text-anchor', 'middle');
            chordText2.setAttribute('font-family', 'Arial, sans-serif');
            svg.appendChild(chordText2);
        } else {
            // Multiple chords (3+): distribute them horizontally with small slashes
            const availableWidth = this.width - 20; // margins
            const chordSpacing = availableWidth / chordCount;
            
            segments.forEach((segment, idx) => {
                const chord = segment.chord;
                if (!chord) return;
                
                const chordX = this.x + 10 + chordSpacing * (idx + 0.5);
                const chordY = this.y + 60; // Vertically centered
                const fontSize = 20; // Slightly smaller for multiple chords
                
                const chordText = this.createText(chord, chordX, chordY, `${fontSize}px`, 'bold');
                chordText.setAttribute('text-anchor', 'middle');
                chordText.setAttribute('font-family', 'Arial, sans-serif');
                svg.appendChild(chordText);
                
                // Draw small slash separator between chords (except before first)
                if (idx > 0) {
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
            });
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
     * Draw the repeat symbol (%) in the center of the measure.
     * Uses the official SVG path for a classical measure repeat symbol.
     */
    private drawRepeatSymbol(svg: SVGElement): void {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + 80; // Staff line baseline
        
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
     * Draw chord name above the measure.
     */
    private drawChordName(svg: SVGElement, chord: string, xPosition?: number): void {
        if (!chord) return;
        
        // Use provided position or center of measure
        const chordX = xPosition !== undefined ? xPosition : this.x + this.width / 2;
        const chordY = this.y + 40;
        const fontSize = 22;
        
        const chordText = this.createText(chord, chordX, chordY, `${fontSize}px`, 'bold');
        chordText.setAttribute('text-anchor', 'middle');
        chordText.setAttribute('font-family', 'Arial, sans-serif');
        svg.appendChild(chordText);
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
