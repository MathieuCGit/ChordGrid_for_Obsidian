/**
 * Position d'une note dans le SVG avec métadonnées pour les liaisons.
 */
interface NotePosition {
    x: number;
    y: number;
    headLeftX?: number;
    headRightX?: number;
    measureIndex: number;
    chordIndex: number;
    beatIndex: number;
    noteIndex: number;
    segmentNoteIndex?: number;
    tieStart?: boolean;
    tieEnd?: boolean;
    globalTimeIndex?: number;
    tieToVoid?: boolean;
    tieFromVoid?: boolean;
    stemTopY?: number;
    stemBottomY?: number;
    value?: number; // Note value: 1=whole, 2=half, 4=quarter, 8=eighth, etc.
}
import { RestRenderer } from './RestRenderer';
import { Beat, Measure, NoteElement, ChordGrid, ChordSegment } from '../parser/type';
import { PlaceAndSizeManager } from './PlaceAndSizeManager';
import { SVG_NS } from './constants';

/**
 * @file MeasureRenderer.ts
 * @description Rendu SVG d'une mesure musicale individuelle.
 *
 * Cette classe est responsable du rendu graphique d'une mesure complète :
 * barres, portée, accords, notes et ligatures.
 */
export class MeasureRenderer {
    /**
     * Constructeur du renderer de mesure.
     * 
     * @param measure - Mesure à rendre
     * @param x - Position X de départ de la mesure dans le SVG
     * @param y - Position Y de départ de la mesure dans le SVG
     * @param width - Largeur allouée à la mesure
     * @param beamedAtLevel1 - Set of segmentIndex:noteIndex that are in level-1 beam groups
     * @param placeAndSizeManager - Gestionnaire de position et taille pour éviter les chevauchements
     * @param stemsDirection - Direction des hampes ('up' ou 'down')
     * @param displayRepeatSymbol - Afficher le symbole % pour les mesures répétées
     */
    private readonly restRenderer: RestRenderer;
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

                if (firstNoteX !== null && beatIndex === 0 && segment.chord) {
                    const chordX = firstNoteX;
                    const chordY = this.y + 40;
                    const fontSize = 22;
                    
                    // Estimate chord text width (rough approximation: 0.6 * fontSize per character)
                    const chordWidth = segment.chord.length * fontSize * 0.6;
                    
                    // Check for collisions and adjust position if needed
                    let finalY = chordY;
                    let finalX = chordX;
                    if (this.placeAndSizeManager) {
                        const chordBBox = {
                            x: chordX - chordWidth / 2,
                            y: chordY - fontSize,
                            width: chordWidth,
                            height: fontSize + 4
                        };
                        
                        // Check if there's a collision (especially with barlines at priority 0)
                        if (this.placeAndSizeManager.hasCollision(chordBBox)) {
                            // First try horizontal adjustment (for left barlines like ||:)
                            const adjustedPosH = this.placeAndSizeManager.findFreePosition(
                                chordBBox,
                                'horizontal',
                                ['chord']
                            );
                            
                            if (adjustedPosH) {
                                finalX = adjustedPosH.x + chordWidth / 2; // Convert back to center
                                // Update bbox with new X
                                chordBBox.x = adjustedPosH.x;
                            }
                            
                            // Then check vertical if still needed
                            if (this.placeAndSizeManager.hasCollision(chordBBox)) {
                                const adjustedPosV = this.placeAndSizeManager.findFreePosition(
                                    chordBBox,
                                    'vertical',
                                    ['chord']
                                );
                                if (adjustedPosV) {
                                    finalY = adjustedPosV.y + fontSize; // Convert back to baseline
                                }
                            }
                        }
                        
                        // Register the chord element with final position
                        this.placeAndSizeManager.registerElement('chord', {
                            x: finalX - chordWidth / 2,
                            y: finalY - fontSize,
                            width: chordWidth,
                            height: fontSize + 4
                        }, 5, { chord: segment.chord, measureIndex, segmentIndex });
                    }
                    
                    const chordText = this.createText(segment.chord, finalX, finalY, '22px', 'bold');
                    chordText.setAttribute('text-anchor', 'middle');
                    chordText.setAttribute('font-family', 'Arial, sans-serif');
                    svg.appendChild(chordText);
                }
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
        const beats = [beat];
        const beatWidth = width;
        let currentX = x;
        let firstNoteX: number | null = null;

    const first = this.drawBeat(svg, beat, currentX, staffLineY, beatWidth, measureIndex, chordIndex, beatIndex, notePositions, segmentNoteCursor);
        if (first !== null) firstNoteX = first;

        return firstNoteX;
    }

    private drawBeat(
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
        if (!beat || beat.notes.length === 0) return null;

        // DebugLogger supprimé : Drawing beat

        const hasBeamableNotes = beat.notes.some(n => n.value >= 8 || n.tieStart || n.tieEnd || n.tieToVoid || n.tieFromVoid);

        // DebugLogger supprimé : Beam detection

        // Draw notes without beams; analyzer overlay will handle beams later
        // Position notes left-aligned within the beat area but clamp spacing to avoid overflow
        const noteCount = beat.notes.length;
        let firstNoteX: number | null = null;

        // Geometry constants (match stem/head geometry)
        const innerLeft = 10;
        const innerRight = 10;
        const headHalfMax = 6; // worst case (diamond)
        const startX = x + innerLeft;
        const endLimit = x + width - innerRight - headHalfMax; // last note center must be <= this

        // Detect tuplet groups in this beat
        const tupletGroups: Array<{startIndex: number, endIndex: number, count: number, groupId: string, ratio?: {numerator: number, denominator: number}}> = [];
        const seenTupletGroups = new Set<string>();
        beat.notes.forEach((note, i) => {
            if (note.tuplet && !seenTupletGroups.has(note.tuplet.groupId)) {
                seenTupletGroups.add(note.tuplet.groupId);
                const groupNotes = beat.notes.filter(n => n.tuplet && n.tuplet.groupId === note.tuplet!.groupId);
                const startIdx = beat.notes.findIndex(n => n.tuplet && n.tuplet.groupId === note.tuplet!.groupId);
                tupletGroups.push({
                    startIndex: startIdx,
                    endIndex: startIdx + groupNotes.length - 1,
                    count: note.tuplet.count,
                    groupId: note.tuplet.groupId,
                    ratio: note.tuplet.ratio
                });
            }
        });

        // Calculate individual note positions with adaptive spacing and clamping to beat width
        const notePositionsX: number[] = [];
        // Determine ideal base spacing from densest note value
        const densestSpacing = Math.max(...beat.notes.map(n => {
            if (n.isRest) return 20; // rests: neutral spacing
            const v = n.value;
            if (v >= 64) return 16;
            if (v >= 32) return 20;
            if (v >= 16) return 26;
            if (v >= 8)  return 24;
            return 20;
        }));
        const availableSpan = Math.max(0, endLimit - startX);
        // Build per-gap factors: compress tuplet-internal gaps slightly
        const gapCount = Math.max(0, noteCount - 1);
        const gapFactors: number[] = [];
        for (let g = 0; g < gapCount; g++) {
            const inSameTuplet = tupletGroups.some(T => g >= T.startIndex && g + 1 <= T.endIndex);
            gapFactors.push(inSameTuplet ? 0.85 : 1.0);
        }
        const desiredGaps = gapFactors.map(f => densestSpacing * f);
        const desiredTotal = desiredGaps.reduce((a, b) => a + b, 0);
        const scale = desiredTotal > 0 ? Math.min(1, availableSpan / desiredTotal) : 1;
        const finalGaps = desiredGaps.map(g => g * scale);

        let cursorX = startX;
        for (let i = 0; i < noteCount; i++) {
            notePositionsX.push(cursorX);
            if (i < gapCount) cursorX += finalGaps[i];
        }

        beat.notes.forEach((nv, noteIndex) => {
            // Calculate note position using precalculated positions
            let noteX: number;
            if (noteCount === 1 && nv.isRest && nv.value === 1) {
                // Center the whole rest in the beat area
                noteX = x + width / 2;
            } else {
                // Use precalculated position with tuplet spacing
                noteX = notePositionsX[noteIndex];
            }
            
            // Render rests properly
            if (nv.isRest) {
                // Draw the rest glyph at noteX
                this.restRenderer.drawRest(svg, nv, noteX, staffLineY);
                // Maintain analyzer segment index progression to stay in sync with overlay references
                segmentNoteCursor[chordIndex]++;
                // Rests do not participate in ties; don't push into notePositions
                if (firstNoteX === null) firstNoteX = noteX;
                return;
            }
            // Determine if this note belongs to a primary (level-1) beam group
            const localIndexInSegment = segmentNoteCursor[chordIndex];
            const isInPrimaryBeam = !!this.beamedAtLevel1?.has(`${chordIndex}:${localIndexInSegment}`);
            const needsFlag = nv.value >= 8 && !isInPrimaryBeam;
            const stemCoords = this.drawSingleNoteWithoutBeam(svg, nv, noteX, staffLineY, needsFlag);
            if (firstNoteX === null) firstNoteX = noteX;

            let headLeftX: number;
            let headRightX: number;
            if (nv.value === 1 || nv.value === 2) {
                const diamondSize = 6;
                headLeftX = noteX - diamondSize;
                headRightX = noteX + diamondSize;
            } else {
                const slashHalf = 10 / 2;
                headLeftX = noteX - slashHalf;
                headRightX = noteX + slashHalf;
            }
            const hasStem = nv.value >= 2;
            const stemTopY = stemCoords.stemTopY;
            const stemBottomY = stemCoords.stemBottomY;

            notePositions.push({
                x: noteX,
                y: staffLineY,
                headLeftX,
                headRightX,
                measureIndex,
                chordIndex,
                beatIndex,
                noteIndex,
                segmentNoteIndex: segmentNoteCursor[chordIndex]++,
                tieStart: !!nv.tieStart,
                tieEnd: !!nv.tieEnd,
                tieToVoid: !!nv.tieToVoid,
                tieFromVoid: !!nv.tieFromVoid,
                globalTimeIndex: measureIndex * 1000000 + chordIndex * 10000 + beatIndex * 100 + noteIndex,
                stemTopY,
                stemBottomY,
                value: nv.value
            });

            // Register note head & stem for collision management
            if (this.placeAndSizeManager) {
                const noteHeadBBox = {
                    x: headLeftX,
                    y: staffLineY - 12,
                    width: headRightX - headLeftX,
                    height: 24
                };
                this.placeAndSizeManager.registerElement('note', noteHeadBBox, 6, { value: nv.value, dotted: nv.dotted, measureIndex, chordIndex, beatIndex, noteIndex });
                if (hasStem && stemTopY !== undefined && stemBottomY !== undefined) {
                    const stemBBox = {
                        x: noteX - 3, // approximate stem x based on drawStem logic
                        y: stemTopY,
                        width: 3,
                        height: stemBottomY - stemTopY
                    };
                    this.placeAndSizeManager.registerElement('stem', stemBBox, 5, { measureIndex, chordIndex, beatIndex, noteIndex });
                }
            }
        });
        
        // Draw tuplet brackets if any
        tupletGroups.forEach(tupletGroup => {
            const tupletStartX = notePositionsX[tupletGroup.startIndex];
            const tupletEndX = notePositionsX[tupletGroup.endIndex];
            // Position bracket above staff line (stems go DOWN from staffLineY + 5)
            // Place bracket above the note heads at a comfortable distance
            const bracketY = staffLineY - 15; // Above note heads, below where beams would be
            
            // Horizontal line
            const bracket = document.createElementNS(SVG_NS, 'line');
            bracket.setAttribute('x1', String(tupletStartX));
            bracket.setAttribute('y1', String(bracketY));
            bracket.setAttribute('x2', String(tupletEndX));
            bracket.setAttribute('y2', String(bracketY));
            bracket.setAttribute('stroke', '#000');
            bracket.setAttribute('stroke-width', '1');
            svg.appendChild(bracket);
            
            // Left vertical bar (pointing down)
            const leftBar = document.createElementNS(SVG_NS, 'line');
            leftBar.setAttribute('x1', String(tupletStartX));
            leftBar.setAttribute('y1', String(bracketY));
            leftBar.setAttribute('x2', String(tupletStartX));
            leftBar.setAttribute('y2', String(bracketY + 5));
            leftBar.setAttribute('stroke', '#000');
            leftBar.setAttribute('stroke-width', '1');
            svg.appendChild(leftBar);
            
            // Right vertical bar (pointing down)
            const rightBar = document.createElementNS(SVG_NS, 'line');
            rightBar.setAttribute('x1', String(tupletEndX));
            rightBar.setAttribute('y1', String(bracketY));
            rightBar.setAttribute('x2', String(tupletEndX));
            rightBar.setAttribute('y2', String(bracketY + 5));
            rightBar.setAttribute('stroke', '#000');
            rightBar.setAttribute('stroke-width', '1');
            svg.appendChild(rightBar);

            // Register tuplet bracket bounding box (approx width & height)
            if (this.placeAndSizeManager) {
                const bracketBBox = {
                    x: tupletStartX,
                    y: bracketY - 6,
                    width: tupletEndX - tupletStartX,
                    height: 12
                };
                this.placeAndSizeManager.registerElement('tuplet-bracket', bracketBBox, 4, { measureIndex, chordIndex, beatIndex });
            }
            
            // Tuplet number or ratio centered above the bracket
            const centerX = (tupletStartX + tupletEndX) / 2;
            let tupletTextY = bracketY - 3;
            const text = document.createElementNS(SVG_NS, 'text');
            text.setAttribute('x', String(centerX));
            text.setAttribute('y', String(tupletTextY));
            text.setAttribute('font-size', '10');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('text-anchor', 'middle');
            // Display ratio if explicitly provided, otherwise just count
            if (tupletGroup.ratio) {
                text.textContent = `${tupletGroup.ratio.numerator}:${tupletGroup.ratio.denominator}`;
            } else {
                text.textContent = String(tupletGroup.count);
            }
            // Collision adjust for tuplet number against chords or other elements
            if (this.placeAndSizeManager) {
                const textWidth = (text.textContent || '').length * 6; // rough monospace approximation
                let numberBBox = {
                    x: centerX - textWidth / 2,
                    y: tupletTextY - 10,
                    width: textWidth,
                    height: 12
                };
                if (this.placeAndSizeManager.hasCollision(numberBBox, ['tuplet-bracket','tuplet-number'])) {
                    const adjusted = this.placeAndSizeManager.findFreePosition(numberBBox, 'vertical', ['tuplet-number']);
                    if (adjusted) {
                        tupletTextY = adjusted.y + 10; // baseline correction
                        text.setAttribute('y', String(tupletTextY));
                        numberBBox = { ...numberBBox, y: adjusted.y };
                    }
                }
                this.placeAndSizeManager.registerElement('tuplet-number', numberBBox, 7, { text: text.textContent, measureIndex, chordIndex, beatIndex });
            }
            svg.appendChild(text);
        });
        
        return firstNoteX;
    }

    private drawSingleNote(svg: SVGElement, nv: NoteElement, x: number, staffLineY: number, width: number): number {
        if (nv.isRest) {
            this.restRenderer.drawRest(svg, nv, x, staffLineY);
            return x;
        }
        const centerX = x;
        let stemInfo: { x: number; topY: number; bottomY: number; } | undefined;
        if (nv.value === 1) {
            this.drawDiamondNoteHead(svg, centerX, staffLineY, true);
        } else if (nv.value === 2) {
            this.drawDiamondNoteHead(svg, centerX, staffLineY, true);
            stemInfo = this.drawStemWithDirection(svg, centerX, staffLineY, 25, this.stemsDirection);
        } else {
            this.drawSlash(svg, centerX, staffLineY);
            stemInfo = this.drawStemWithDirection(svg, centerX, staffLineY, 25, this.stemsDirection);
            const level = nv.value >= 64 ? 4 : nv.value >= 32 ? 3 : nv.value >= 16 ? 2 : nv.value >= 8 ? 1 : 0;
            if (level > 0 && stemInfo) {
                this.drawFlag(svg, stemInfo, level, this.stemsDirection);
            }
        }

        if (nv.dotted) {
            const dot = document.createElementNS(SVG_NS, 'circle');
            dot.setAttribute('cx', (centerX + 10).toString());
            dot.setAttribute('cy', (staffLineY - 4).toString());
            dot.setAttribute('r', '1.5');
            dot.setAttribute('fill', '#000');
            // Tag for later collision adjustment (we don't have measureIndex here; defer to parent context if needed)
            dot.setAttribute('data-cg-dot', '1');
            svg.appendChild(dot);
            if (this.placeAndSizeManager) {
                const cx = centerX + 10;
                const cy = staffLineY - 4;
                this.placeAndSizeManager.registerElement('dot', { x: cx - 2, y: cy - 2, width: 4, height: 4 }, 9, { value: nv.value, dotted: true });
            }
        }

        return centerX;
    }

    /**
     * Draw a single note without beams or flags (for analyzer path).
     * Analyzer overlay will handle beams; this just draws head and stem.
     * Retourne les coordonnées de la hampe si elle existe.
     */
    private drawSingleNoteWithoutBeam(svg: SVGElement, nv: NoteElement, x: number, staffLineY: number, drawFlagsForIsolated: boolean = false): { stemTopY?: number; stemBottomY?: number; } {
        if (nv.isRest) {
            this.restRenderer.drawRest(svg, nv, x, staffLineY);
            return {};
        }
    let stemInfo: { x: number; topY: number; bottomY: number; } | undefined;
        if (nv.value === 1) {
            this.drawDiamondNoteHead(svg, x, staffLineY, true);
        } else if (nv.value === 2) {
            this.drawDiamondNoteHead(svg, x, staffLineY, true);
            stemInfo = this.drawStemWithDirection(svg, x, staffLineY, 25, this.stemsDirection);
        } else {
            // For beamable notes (>=8), draw slash + stem but no flag (analyzer overlay draws beams)
            this.drawSlash(svg, x, staffLineY);
            stemInfo = this.drawStemWithDirection(svg, x, staffLineY, 25, this.stemsDirection);
            // If not part of a primary beam group, render flags directly here
            if (drawFlagsForIsolated) {
                const level = nv.value >= 64 ? 4 : nv.value >= 32 ? 3 : nv.value >= 16 ? 2 : nv.value >= 8 ? 1 : 0;
                if (level > 0 && stemInfo) {
                    this.drawFlag(svg, stemInfo, level, this.stemsDirection);
                }
            }
        }
        if (nv.dotted) {
            const dot = document.createElementNS(SVG_NS, 'circle');
            dot.setAttribute('cx', (x + 10).toString());
            dot.setAttribute('cy', (staffLineY - 4).toString());
            dot.setAttribute('r', '1.5');
            dot.setAttribute('fill', '#000');
            dot.setAttribute('data-cg-dot', '1');
            svg.appendChild(dot);
            if (this.placeAndSizeManager) {
                const cx = x + 10;
                const cy = staffLineY - 4;
                this.placeAndSizeManager.registerElement('dot', { x: cx - 2, y: cy - 2, width: 4, height: 4 }, 9, { value: nv.value, dotted: true });
            }
        }
    return stemInfo ? { stemTopY: stemInfo.topY, stemBottomY: stemInfo.bottomY } : {};
    }

    /**
     * Dessine une hampe orientée selon stemsDirection ('up' ou 'down').
     * Retourne les coordonnées de la hampe : x, topY (point le plus haut), bottomY (point le plus bas)
     */
    private drawStemWithDirection(svg: SVGElement, x: number, y: number, height: number, direction: 'up' | 'down'): { x: number; topY: number; bottomY: number; } {
        const slashLength = 10;
        // Position de la hampe selon la direction (notation musicale standard)
        // Hampes UP : à droite de la note head
        // Hampes DOWN : à gauche de la note head
        const stemStartX = direction === 'up' ? (x + slashLength/2) : (x - slashLength/2);
        
        let stemStartY: number, stemEndY: number;
        if (direction === 'up') {
            // Hampes vers le haut : part du HAUT de la tête de note et monte
            stemStartY = y - slashLength/2;  // Haut de la tête de note
            stemEndY = stemStartY - height;
        } else {
            // Hampes vers le bas : part du BAS de la tête de note et descend
            stemStartY = y + slashLength/2;  // Bas de la tête de note
            stemEndY = stemStartY + height;
        }
        const stem = document.createElementNS(SVG_NS, 'line');
        stem.setAttribute('x1', stemStartX.toString());
        stem.setAttribute('y1', stemStartY.toString());
        stem.setAttribute('x2', stemStartX.toString());
        stem.setAttribute('y2', stemEndY.toString());
        stem.setAttribute('stroke', '#000');
        stem.setAttribute('stroke-width', '2');
        svg.appendChild(stem);
        // Retourner les vraies valeurs top et bottom (le plus petit y est le top, le plus grand y est le bottom)
        return { 
            x: stemStartX, 
            topY: Math.min(stemStartY, stemEndY), 
            bottomY: Math.max(stemStartY, stemEndY) 
        };
    }

    private drawDiamondNoteHead(svg: SVGElement, x: number, y: number, hollow: boolean): void {
        const diamondSize = 6;
        const diamond = document.createElementNS(SVG_NS, 'polygon');
        const points = [ [x, y - diamondSize], [x + diamondSize, y], [x, y + diamondSize], [x - diamondSize, y] ];
        diamond.setAttribute('points', points.map(p => `${p[0]},${p[1]}`).join(' '));
        diamond.setAttribute('fill', hollow ? 'white' : 'black');
        diamond.setAttribute('stroke', '#000');
        diamond.setAttribute('stroke-width', '1');
        svg.appendChild(diamond);
    }

    private drawSlash(svg: SVGElement, x: number, y: number): void {
        const slashLength = 10;
        const slash = document.createElementNS(SVG_NS, 'line');
        slash.setAttribute('x1', (x + slashLength/2).toString());
        slash.setAttribute('y1', (y - slashLength/2).toString());
        slash.setAttribute('x2', (x - slashLength/2).toString());
        slash.setAttribute('y2', (y + slashLength/2).toString());
        slash.setAttribute('stroke', '#000');
        slash.setAttribute('stroke-width', '3');
        svg.appendChild(slash);
    }

    private drawStem(svg: SVGElement, x: number, y: number, height: number): { x: number; topY: number; bottomY: number; } {
        const slashLength = 10;
        const stemStartX = x - slashLength/2 + 2;
        const stemStartY = y + slashLength/2;
        const stem = document.createElementNS(SVG_NS, 'line');
        stem.setAttribute('x1', stemStartX.toString());
        stem.setAttribute('y1', stemStartY.toString());
        stem.setAttribute('x2', stemStartX.toString());
        stem.setAttribute('y2', (stemStartY + height).toString());
        stem.setAttribute('stroke', '#000');
        stem.setAttribute('stroke-width', '2');
        svg.appendChild(stem);
        return { x: stemStartX, topY: stemStartY, bottomY: stemStartY + height };
    }

    private drawFlag(
        svg: SVGElement,
        stem: { x: number; topY: number; bottomY: number; },
        count: number,
        direction: 'up' | 'down'
    ): void {
        const flagSpacing = 10;
        for (let i = 0; i < count; i++) {
            const flag = document.createElementNS(SVG_NS, 'path');
            if (direction === 'up') {
                const attachY = stem.topY + i * flagSpacing;
                flag.setAttribute('d', `M ${stem.x} ${attachY} Q ${stem.x + 10} ${attachY + 5} ${stem.x + 8} ${attachY + 12}`);
            } else {
                const attachY = stem.bottomY - i * flagSpacing;
                flag.setAttribute('d', `M ${stem.x} ${attachY} Q ${stem.x - 10} ${attachY - 5} ${stem.x - 8} ${attachY - 12}`);
            }
            flag.setAttribute('stroke', '#000');
            flag.setAttribute('stroke-width', '2');
            flag.setAttribute('fill', 'none');
            svg.appendChild(flag);
        }
    }

    private drawBar(svg: SVGElement, x: number, y: number, height: number, measureIndex?: number, side?: 'left' | 'right'): void {
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', x.toString());
        line.setAttribute('y1', y.toString());
        line.setAttribute('x2', x.toString());
        line.setAttribute('y2', (y + height).toString());
        line.setAttribute('stroke', '#000');
        line.setAttribute('stroke-width', '1.5');
        svg.appendChild(line);

        // Register barline in PlaceAndSizeManager for accurate bounds calculation
        if (this.placeAndSizeManager) {
            this.placeAndSizeManager.registerElement('barline', {
                x: x - 3,  // Extra margin to prevent collisions
                y: y,
                width: 6,  // Wider bbox to ensure no overlap
                height: height
            }, 0, { exactX: x, measureIndex, side });  // Store exact X position for volta alignment
        }
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
            
            // Register repeat dots for collision detection
            if (this.placeAndSizeManager) {
                this.placeAndSizeManager.registerElement('dot', {
                    x: dotX - 4,  // Larger collision box to ensure no overlap
                    y: dotY - 4,
                    width: 8,
                    height: 8
                }, 0, { type: 'repeat-barline' });  // Priority 0 - dots are part of barline, absolutely fixed
            }
        });

        // Register the repeat barline itself including dots area (extends 12px for dots)
        if (this.placeAndSizeManager) {
            // The dots extend 12px from the barline, we need to protect that space
            const bboxX = isStart ? x - 3 : x - 15;  // Start: protect right side, End: protect left side with dots
            const bboxWidth = isStart ? 20 : 20;  // 6px bars + 12px dots + margins
            
            this.placeAndSizeManager.registerElement('barline', {
                x: bboxX,
                y: y,
                width: bboxWidth,
                height: height
            }, 0, { 
                type: isStart ? 'repeat-start' : 'repeat-end',
                exactX: x,  // The exact X position of the first line of the barline
                measureIndex,
                side: isStart ? 'left' : 'right'
            });
        }
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

        // Register the final double barline (two lines span from x to x+6+2.5)
        if (this.placeAndSizeManager) {
            this.placeAndSizeManager.registerElement('barline', {
                x: x - 3,  // Extra margin for safety
                y: y,
                width: 12,  // 6px spacing + 5px thick stroke + margins
                height: height
            }, 0, { type: 'final-double' });  // Priority 0 - absolutely fixed
        }
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
            }, 5, { count });
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
