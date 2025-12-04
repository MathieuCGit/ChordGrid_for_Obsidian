/**
 * @file ChordRenderer.ts
 * @description Manager for rendering chord symbols.
 * 
 * This renderer is responsible for:
 * - Positioning chords above measures
 * - Aligning chords with the first stem of each rhythmic segment
 * - Handling special cases (repeated measures with %, measures without rhythm)
 * - Registering chords in PlaceAndSizeManager with complete metadata
 */

import { Measure } from '../models/Measure';
import { PlaceAndSizeManager, ChordMetadata } from './PlaceAndSizeManager';
import { SVG_NS, TYPOGRAPHY, POSITIONING, LAYOUT, NOTATION } from './constants';

/**
 * Calculated position of a measure in the rendering.
 */
export interface MeasurePosition {
    measure: Measure;
    lineIndex: number;
    posInLine: number;
    globalIndex: number;
    width: number;
    x?: number;
    y?: number;
}

/**
 * Rendering options for chords.
 */
export interface ChordRenderOptions {
    /** Display the % symbol for repeated measures */
    displayRepeatSymbol?: boolean;
    /** Font size for chords */
    fontSize?: number;
    /** Vertical offset above the staff */
    verticalOffset?: number;
}

/**
 * Rendering options for chords in chord-only mode.
 */
interface ChordOnlyRenderOptions {
    /** Measure position */
    measureX: number;
    measureY: number;
    measureWidth: number;
    /** Global measure index */
    measureIndex: number;
}

/**
 * Class responsible for rendering chord symbols.
 */
export class ChordRenderer {
    /**
     * ChordRenderer constructor.
     */
    constructor() {}

    /**
     * Estimates the width of a chord text.
     * 
     * @param text - Chord text
     * @param fontSize - Font size
     * @returns Estimated width in pixels
     */
    private estimateTextWidth(text: string, fontSize: number): number {
        return Math.ceil(text.length * fontSize * TYPOGRAPHY.CHAR_WIDTH_RATIO);
    }

    /**
     * Finds the X position of the start of the first note in a segment.
     * Uses metadata registered in PlaceAndSizeManager.
     * Returns headLeftX (left edge of note head) for optimal visual alignment.
     * 
     * @param placeAndSizeManager - Placement manager
     * @param measureIndex - Measure index
     * @param chordIndex - Segment/chord index
     * @returns X position of the first note's start, or null if not found
     */
    private findFirstNoteX(
        placeAndSizeManager: PlaceAndSizeManager,
        measureIndex: number,
        chordIndex: number
    ): number | null {
        // Get all notes from this measure
        const notes = placeAndSizeManager.getElementsByMeasure(measureIndex)
            .filter(el => el.type === 'note')
            .filter(el => el.metadata?.chordIndex === chordIndex)
            .sort((a, b) => {
                // Sort by beatIndex then noteIndex to find the first
                const beatDiff = (a.metadata!.beatIndex ?? 0) - (b.metadata!.beatIndex ?? 0);
                if (beatDiff !== 0) return beatDiff;
                return (a.metadata!.noteIndex ?? 0) - (b.metadata!.noteIndex ?? 0);
            });

        if (notes.length === 0) {
            return null;
        }

        // Return the x position (left edge) of the first note
        // The bbox.x corresponds to headLeftX of the note
        const firstNote = notes[0];
        return firstNote.bbox.x;
    }

    /**
     * Calculates safe Y position for a chord to avoid collisions with stems.
     * 
     * @param placeAndSizeManager - Placement manager
     * @param measureIndex - Measure index
     * @param staffLineY - Staff line Y position
     * @param baseVerticalOffset - Base vertical offset (minimum)
     * @returns Adjusted Y position to avoid stems
     */
    private calculateSafeChordY(
        placeAndSizeManager: PlaceAndSizeManager,
        measureIndex: number,
        staffLineY: number,
        baseVerticalOffset: number
    ): number {
        // Get all stems from this measure
        const measureElements = placeAndSizeManager.getElementsByMeasure(measureIndex);
        const stems = measureElements.filter(el => el.type === 'stem');
        
        if (stems.length === 0) {
            // No stems: use base offset
            return staffLineY - baseVerticalOffset;
        }
        
        // Find the highest point of all stems (smallest Y value)
        let highestStemY = staffLineY;
        
        stems.forEach(stem => {
            if (stem.metadata?.stem) {
                const { topY, direction } = stem.metadata.stem;
                
                // For upward stems, topY is the highest point
                // For downward stems, we don't consider them (chords go above)
                if (direction === 'up') {
                    highestStemY = Math.min(highestStemY, topY);
                }
            }
        });
        
        // Add minimum clearance above the highest stem
        const stemClearance = POSITIONING.STEM_CLEARANCE;
        
        // Chord position = highest stem - clearance
        // But at least baseVerticalOffset above the staff
        const safeY = Math.min(
            staffLineY - baseVerticalOffset,
            highestStemY - stemClearance
        );
        
        return safeY;
    }

    /**
     * Renders all chords for the given measures.
     * 
     * This method is called AFTER all notes/stems have been rendered
     * and registered in PlaceAndSizeManager, allowing precise alignment
     * with stems.
     * 
     * @param svg - Parent SVG element
     * @param measurePositions - Measure positions
     * @param placeAndSizeManager - Placement manager
     * @param options - Rendering options
     */
    public renderChords(
        svg: SVGElement,
        measurePositions: MeasurePosition[],
        placeAndSizeManager: PlaceAndSizeManager,
        options: ChordRenderOptions = {}
    ): void {
        const fontSize = options.fontSize ?? TYPOGRAPHY.CHORD_FONT_SIZE;
        const baseVerticalOffset = options.verticalOffset ?? POSITIONING.CHORD_VERTICAL_OFFSET;
        const displayRepeatSymbol = options.displayRepeatSymbol ?? false;
        
        // Staff line is at measureY + STAFF_LINE_Y_OFFSET (see MeasureRenderer.ts)
        const STAFF_LINE_OFFSET = NOTATION.STAFF_LINE_Y_OFFSET;

        measurePositions.forEach(mp => {
            if (!mp.x || !mp.y) return;

            const measure = mp.measure as any;
            const measureX = mp.x;
            const measureY = mp.y;
            
            // Handle chord-only measures with special positioning
            // Also handle [%] notation when displayRepeatSymbol is enabled
            const isBracketPercent = displayRepeatSymbol && measure.source?.includes('[%]');
            if (measure.__isChordOnlyMode || isBracketPercent) {
                this.renderChordOnlyMeasure(svg, mp, placeAndSizeManager);
                return;
            }
            
            const staffLineY = measureY + STAFF_LINE_OFFSET;

            // Skip chord rendering for simple % repeat ONLY when show% is enabled
            // When show% is disabled, render chords normally even for repeated measures
            if (displayRepeatSymbol && measure.isRepeat && measure.source === '%') {
                return;
            }

            // Check if the measure has chord segments
            const segments = measure.chordSegments || [{ chord: measure.chord, beats: measure.beats }];

            segments.forEach((segment: any, segmentIndex: number) => {
                const chordSymbol = segment.chord;

                // Ignore segments without chord (or with empty chord)
                if (!chordSymbol || chordSymbol === '') {
                    return;
                }

                // Calculate safe Y position to avoid collisions with stems
                const chordY = this.calculateSafeChordY(
                    placeAndSizeManager,
                    mp.globalIndex,
                    staffLineY,
                    baseVerticalOffset
                );

                // Find the position of the first note in this segment
                const firstNoteX = this.findFirstNoteX(
                    placeAndSizeManager,
                    mp.globalIndex,
                    segmentIndex
                );

                if (firstNoteX !== null) {
                    // Align chord with the start of the first note (text-anchor='start')
                    this.renderChordSymbol(
                        svg,
                        chordSymbol,
                        firstNoteX,
                        chordY,
                        fontSize,
                        'start',
                        placeAndSizeManager,
                        mp.globalIndex,
                        segmentIndex
                    );
                } else {
                    // No note found (measure without rhythm or error)
                    // Fallback behavior: center in segment
                    // NOTE: This case should normally not happen if rhythm is properly defined
                    console.warn(
                        `[ChordRenderer] No note found for chord "${chordSymbol}" ` +
                        `in measure ${mp.globalIndex}, segment ${segmentIndex}. ` +
                        `Using fallback centered position.`
                    );
                    
                    // Calculate approximate position at segment center
                    const segmentWidth = mp.width / segments.length;
                    const segmentX = measureX + segmentIndex * segmentWidth + segmentWidth / 2;
                    
                    this.renderChordSymbol(
                        svg,
                        chordSymbol,
                        segmentX,
                        chordY,
                        fontSize,
                        'middle',
                        placeAndSizeManager,
                        mp.globalIndex,
                        segmentIndex
                    );
                }
            });
        });
    }

    /**
     * Renders a chord symbol at the given position.
     * 
     * @param svg - Parent SVG element
     * @param chordSymbol - Chord symbol (e.g., "C", "Am7", "G/B")
     * @param x - X position
     * @param y - Y position (baseline)
     * @param fontSize - Font size
     * @param textAnchor - Text anchor mode
     * @param placeAndSizeManager - Placement manager
     * @param measureIndex - Measure index
     * @param chordIndex - Segment index
     */
    private renderChordSymbol(
        svg: SVGElement,
        chordSymbol: string,
        x: number,
        y: number,
        fontSize: number,
        textAnchor: 'start' | 'middle' | 'end',
        placeAndSizeManager: PlaceAndSizeManager,
        measureIndex: number,
        chordIndex: number
    ): void {
        // Replace # and b with proper music symbols ♯ and ♭
        let processedChord = chordSymbol.replace(/#/g, '♯').replace(/\bb\b/g, '♭');
        // Also handle 'b' when followed by a number (like b9, b5) or at end of quality (like Cmb5)
        processedChord = processedChord.replace(/b([0-9])/g, '♭$1');
        processedChord = processedChord.replace(/([A-G])b([^0-9]|$)/g, '$1♭$2');
        
        const chordText = document.createElementNS(SVG_NS, 'text');
        chordText.setAttribute('x', x.toString());
        chordText.setAttribute('y', y.toString());
        chordText.setAttribute('font-family', 'Arial, sans-serif');
        chordText.setAttribute('font-size', `${fontSize}px`);
        chordText.setAttribute('font-weight', 'bold');
        chordText.setAttribute('fill', '#000');
        chordText.setAttribute('text-anchor', textAnchor);
        chordText.setAttribute('class', 'chord-symbol');
        
        // Parse chord structure: Root + Quality + Superstructures + Bass
        // Root: A-G with optional ♯/♭ (always at start)
        // Quality: M, m, maj, min, dim, aug, etc. (immediately after root)
        // Superstructures: 7, 9, 11, 13, sus, add, (b9), etc. (render smaller)
        // Bass: /Note (render smaller)
        
        const rootMatch = processedChord.match(/^[A-G][♯♭]?/);
        if (!rootMatch) {
            // Fallback: render as-is if parsing fails
            chordText.textContent = processedChord;
            svg.appendChild(chordText);
            const textWidth = this.estimateTextWidth(processedChord, fontSize);
            this.registerChordBBox(chordText, x, y, textWidth, fontSize, textAnchor, placeAndSizeManager, measureIndex, chordIndex, processedChord);
            return;
        }
        
        const root = rootMatch[0];
        let remaining = processedChord.substring(root.length);
        
        // Extract quality - including mM (minor with major 7th), mmaj, mMaj, Mmaj, etc.
        // Order matters: check longer patterns first (mMaj, mmaj) before shorter ones (M, m, maj, min)
        // Quality will be rendered with superstructures (smaller size)
        const qualityMatch = remaining.match(/^(mMaj|mmaj|mM|Mmaj|major|minor|maj|min|dim|aug|M|m|ø|o|\+|\-)/);
        const quality = qualityMatch ? qualityMatch[0] : '';
        remaining = remaining.substring(quality.length);
        
        // Extract bass note (everything after last /)
        let bass = '';
        const lastSlashIndex = remaining.lastIndexOf('/');
        if (lastSlashIndex !== -1) {
            bass = remaining.substring(lastSlashIndex); // includes the "/"
            remaining = remaining.substring(0, lastSlashIndex);
        }
        
        // Everything else is superstructures (7, 9, sus4, add9, (b9), etc.)
        const superstructures = remaining;
        
        // Render: root only (normal size) - just the note letter and accidental
        const mainNode = document.createTextNode(root);
        chordText.appendChild(mainNode);
        
        // Render: quality + superstructures (smaller, 75% of main size)
        // Special handling: if multiple parentheses groups exist, stack them vertically
        const qualityAndSuper = quality + superstructures;
        if (qualityAndSuper.length > 0) {
            // Check if there are multiple parentheses groups: (xxx)(yyy)
            const parenGroups = qualityAndSuper.match(/\([^)]+\)/g);
            
            if (parenGroups && parenGroups.length > 1) {
                // Multiple parentheses: stack them vertically to the right
                // Extract the part before first parenthesis (quality + base extensions like "7")
                const firstParenIndex = qualityAndSuper.indexOf('(');
                const beforeParens = qualityAndSuper.substring(0, firstParenIndex);
                
                // Render: quality + base extensions (before parentheses) - normal superstructure size
                if (beforeParens.length > 0) {
                    const beforeSpan = document.createElementNS(SVG_NS, 'tspan');
                    beforeSpan.setAttribute('font-size', `${Math.round(fontSize * 0.75)}px`);
                    beforeSpan.textContent = beforeParens;
                    chordText.appendChild(beforeSpan);
                }
                
                // Calculate x position for stacked parentheses (to the right of main chord with spacing)
                const mainTextWidth = this.estimateTextWidth(root + beforeParens, fontSize * TYPOGRAPHY.SUPERSTRUCTURE_SIZE_RATIO);
                const stackX = x + mainTextWidth + POSITIONING.CHORD_PARENTHESES_SPACING;
                
                // Render each parenthesis group stacked vertically, small but readable
                parenGroups.forEach((group, index) => {
                    const parenSpan = document.createElementNS(SVG_NS, 'tspan');
                    parenSpan.setAttribute('font-size', `${Math.round(fontSize * TYPOGRAPHY.PARENTHESES_SIZE_RATIO)}px`);
                    parenSpan.setAttribute('x', stackX.toString()); // Align all at same x
                    
                    // Vertical positioning: first one slightly above baseline, second below
                    if (index === 0) {
                        parenSpan.setAttribute('dy', '-0.5em'); // First parenthesis goes up
                    } else {
                        parenSpan.setAttribute('dy', '1.2em'); // Next ones go down relative to previous
                    }
                    
                    parenSpan.textContent = group;
                    chordText.appendChild(parenSpan);
                });
            } else {
                // Single or no parentheses: render normally
                const superSpan = document.createElementNS(SVG_NS, 'tspan');
                superSpan.setAttribute('font-size', `${Math.round(fontSize * TYPOGRAPHY.SUPERSTRUCTURE_SIZE_RATIO)}px`);
                superSpan.textContent = qualityAndSuper;
                chordText.appendChild(superSpan);
            }
        }
        
        // Render: bass note (smaller, 83% of main size)
        if (bass.length > 0) {
            const bassSpan = document.createElementNS(SVG_NS, 'tspan');
            bassSpan.setAttribute('font-size', `${Math.round(fontSize * TYPOGRAPHY.BASS_NOTE_SIZE_RATIO)}px`);
            bassSpan.textContent = bass;
            chordText.appendChild(bassSpan);
        }
        
        svg.appendChild(chordText);

        // Calculate estimated text width (approximation with mixed sizes)
        const textWidth = this.estimateTextWidth(processedChord, fontSize);
        this.registerChordBBox(chordText, x, y, textWidth, fontSize, textAnchor, placeAndSizeManager, measureIndex, chordIndex, processedChord);
    }
    
    /**
     * Helper method to register chord bounding box in PlaceAndSizeManager
     */
    private registerChordBBox(
        chordText: SVGTextElement,
        x: number,
        y: number,
        textWidth: number,
        fontSize: number,
        textAnchor: 'start' | 'middle' | 'end',
        placeAndSizeManager: PlaceAndSizeManager,
        measureIndex: number,
        chordIndex: number,
        chordSymbol: string
    ): void {
        // Calculate bbox according to anchor
        let bboxX: number;
        if (textAnchor === 'start') {
            bboxX = x;
        } else if (textAnchor === 'middle') {
            bboxX = x - textWidth / 2;
        } else { // 'end'
            bboxX = x - textWidth;
        }

        // Register with complete metadata
        placeAndSizeManager.registerElement('chord', {
            x: bboxX,
            y: y - fontSize,
            width: textWidth,
            height: fontSize + 4
        }, 5, {
            measureIndex,
            chordIndex,
            canCollide: true,
            chord: {
                symbol: chordSymbol,
                textX: x,
                textY: y,
                textAnchor: textAnchor,
                textWidth: textWidth,
                fontSize: fontSize
            }
        });
    }

    /**
     * Renders chords for a chord-only measure (no rhythm notation).
     * Uses special positioning logic based on the number of chord segments.
     * 
     * @param svg - Parent SVG element
     * @param measurePosition - Measure position info
     * @param placeAndSizeManager - Placement manager
     */
    private renderChordOnlyMeasure(
        svg: SVGElement,
        measurePosition: MeasurePosition,
        placeAndSizeManager: PlaceAndSizeManager
    ): void {
        const measure = measurePosition.measure as any;
        
        // Skip rendering chord if it's a simple % repeat (not D[%])
        // Simple % repeats the entire measure including chord, so we only show the % symbol
        // D[%] repeats rhythm but changes chord, so we show both chord name and % symbol
        const isSimpleRepeat = measure.isRepeat && measure.source === '%';
        if (isSimpleRepeat) {
            return;
        }
        
        const measureX = measurePosition.x!;
        const measureY = measurePosition.y!;
        const measureWidth = measurePosition.width;
        const measureIndex = measurePosition.globalIndex;

        const segments = measure.chordSegments || [];
        const chordCount = segments.length;

        if (chordCount === 0) {
            // No chords to render
            return;
        } else if (chordCount === 1) {
            // Single chord
            const chord = segments[0].chord;
            
            // For [%] notation, position chord at rhythm height (above staff line position)
            // and align to the left like in rhythm measures
            // For simple chord-only, center it vertically and horizontally
            const isRepeatWithChord = measure.source?.includes('[%]');
            let chordX: number;
            let chordY: number;
            let textAnchor: 'start' | 'middle';
            
            if (isRepeatWithChord) {
                // Position like a rhythm measure chord (left-aligned, above staff line)
                chordX = measureX + LAYOUT.BASE_LEFT_PADDING + 5; // Small padding from left barline
                const staffLineY = measureY + NOTATION.STAFF_LINE_Y_OFFSET;
                chordY = staffLineY - POSITIONING.CHORD_VERTICAL_OFFSET;
                textAnchor = 'start';
            } else {
                // Standard chord-only positioning (centered both horizontally and vertically)
                chordX = measureX + measureWidth / 2;
                chordY = measureY + POSITIONING.CHORD_ONLY_Y_CENTER;
                textAnchor = 'middle';
            }
            
            const fontSize = TYPOGRAPHY.CHORD_ONLY_FONT_SIZE;
            
            this.renderChordSymbol(
                svg,
                chord,
                chordX,
                chordY,
                fontSize,
                textAnchor,
                placeAndSizeManager,
                measureIndex,
                0
            );
        } else if (chordCount === 2) {
            // Special case: 2 chords with diagonal positioning
            const fontSize = TYPOGRAPHY.CHORD_ONLY_FONT_SIZE;
            
            // First chord: left side, ABOVE the diagonal line (top-left)
            // Use 0.35 instead of 0.25 to avoid collision with left barline for complex chords
            const chord1 = segments[0].chord;
            const chord1X = measureX + measureWidth * POSITIONING.CHORD_ONLY_2_FIRST_X;
            const chord1Y = measureY + POSITIONING.CHORD_ONLY_2_FIRST_Y;
            
            this.renderChordSymbol(
                svg,
                chord1,
                chord1X,
                chord1Y,
                fontSize,
                'middle',
                placeAndSizeManager,
                measureIndex,
                0
            );
            
            // Second chord: right side, BELOW the diagonal line (bottom-right)
            // Use 0.65 instead of 0.75 to avoid collision with right barline for complex chords
            const chord2 = segments[1].chord;
            const chord2X = measureX + measureWidth * POSITIONING.CHORD_ONLY_2_SECOND_X;
            const chord2Y = measureY + POSITIONING.CHORD_ONLY_2_SECOND_Y;
            
            this.renderChordSymbol(
                svg,
                chord2,
                chord2X,
                chord2Y,
                fontSize,
                'middle',
                placeAndSizeManager,
                measureIndex,
                1
            );
        } else {
            // Multiple chords (3+): distribute them horizontally
            const availableWidth = measureWidth - LAYOUT.BASE_LEFT_PADDING - LAYOUT.BASE_RIGHT_PADDING;
            const chordSpacing = availableWidth / chordCount;
            const fontSize = TYPOGRAPHY.CHORD_ONLY_FONT_SIZE;
            
            segments.forEach((segment: any, idx: number) => {
                const chord = segment.chord;
                if (!chord) return;
                
                const chordX = measureX + LAYOUT.BASE_LEFT_PADDING + chordSpacing * (idx + 0.5);
                const chordY = measureY + POSITIONING.CHORD_ONLY_Y_CENTER;
                
                this.renderChordSymbol(
                    svg,
                    chord,
                    chordX,
                    chordY,
                    fontSize,
                    'middle',
                    placeAndSizeManager,
                    measureIndex,
                    idx
                );
            });
        }
    }

}
