/**
 * @file MeasureRenderer.ts
 * @description Rendu SVG d'une mesure musicale individuelle.
 * 
 * Cette classe est responsable du rendu graphique d'une mesure complète,
 * incluant :
 * - Les barres de mesure (simples, doubles, reprises)
 * - La ligne de portée
 * - Les accords et leurs changements au sein de la mesure
 * - Les notes et silences avec leurs ligatures
 * - Le positionnement relatif des beats selon l'espace disponible
 * 
 * Le renderer gère également la séparation visuelle entre différents segments
 * d'accords lorsqu'un espace est présent dans la notation source.
 * 
 * @example
 * ```typescript
 * const renderer = new MeasureRenderer(measure, x, y, width);
 * renderer.drawMeasure(svg, measureIndex, notePositions, grid);
 * ```
 */

import { Measure, Beat, NoteElement, ChordGrid, ChordSegment } from '../parser/type';
import { SVG_NS } from './constants';
import { RestRenderer } from './RestRenderer';
import { DebugLogger } from '../utils/DebugLogger';

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
    segmentNoteIndex?: number; // index of the note within its chord segment (for analyzer overlay)
    tieStart?: boolean;
    tieEnd?: boolean;
        globalTimeIndex?: number; // Updated to match Note_Element interface
    tieToVoid?: boolean;
    tieFromVoid?: boolean;
    stemTopY?: number;
    stemBottomY?: number;
}

/**
 * Classe de rendu d'une mesure musicale.
 * 
 * Gère le positionnement et le rendu de tous les éléments d'une mesure :
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
     */
    constructor(
        private readonly measure: Measure,
        private readonly x: number,
        private readonly y: number,
        private readonly width: number,
        // Optional: set of `${segmentIndex}:${noteIndexInSegment}` that are in a level-1 beam group (length >=2)
        private readonly beamedAtLevel1?: Set<string>
    ) {}

    private readonly restRenderer = new RestRenderer();

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

        if (measureIndex === 0 || (this.measure as any).__isLineStart) {
            this.drawBar(svg, leftBarX, this.y, 120);
        } else if ((this.measure as any).isRepeatStart) {
            this.drawBarWithRepeat(svg, leftBarX, this.y, 120, true);
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

    const segments: ChordSegment[] = this.measure.chordSegments || [{ chord: this.measure.chord, beats: this.measure.beats }];
    // Track per-segment note index to map to analyzer references
    const segmentNoteCursor: number[] = new Array(segments.length).fill(0);

        // Layout segments: allocate widths proportional to number of beats, but
        // insert a visible separator when a segment has leadingSpace=true.
        const totalBeats = segments.reduce((s, seg) => s + (seg.beats ? seg.beats.length : 0), 0) || 1;
        const separatorWidth = 12; // px gap when source had a space
        const separatorsCount = segments.reduce((cnt, seg, idx) => cnt + ((idx > 0 && seg.leadingSpace) ? 1 : 0), 0);

        const innerPaddingPerSegment = 20; // preserves previous +/-10 per side
        const totalInnerPadding = innerPaddingPerSegment * segments.length;
        const totalSeparatorPixels = separatorsCount * separatorWidth;

        const availableForBeatCells = Math.max(0, this.width - totalInnerPadding - totalSeparatorPixels);
        const beatCellWidth = availableForBeatCells / totalBeats;

        // iterate segments and place beats
        let currentX = this.x; // segment left
        for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
            const segment = segments[segmentIndex];

            // if this segment has a leading space (and it's not the first), insert separator gap
            if (segmentIndex > 0 && segment.leadingSpace) {
                currentX += separatorWidth;
            }

            const segBeatCount = segment.beats.length || 1;
            const segmentWidth = segBeatCount * beatCellWidth + innerPaddingPerSegment;
            const segmentX = currentX + 10; // inner left padding
            const beatsWidth = segmentWidth - innerPaddingPerSegment;
            const beatWidth = beatsWidth / segBeatCount;

            segment.beats.forEach((beat: Beat, beatIndex: number) => {
                const beatX = segmentX + (beatIndex * beatWidth);
                const firstNoteX = this.drawRhythm(svg, beat, beatX, staffLineY, beatWidth, measureIndex, segmentIndex, beatIndex, notePositions, segmentNoteCursor);

                if (firstNoteX !== null && beatIndex === 0 && segment.chord) {
                    const chordText = this.createText(segment.chord, firstNoteX, this.y + 40, '22px', 'bold');
                    chordText.setAttribute('text-anchor', 'middle');
                    chordText.setAttribute('font-family', 'Arial, sans-serif');
                    svg.appendChild(chordText);
                }
            });

            currentX += segmentWidth;
        }

        if ((this.measure as any).isRepeatEnd) {
            this.drawBarWithRepeat(svg, rightBarX, this.y, 120, false);
        } else if ((this.measure as any).barline || measureIndex === (grid.measures.length - 1)) {
            this.drawBar(svg, rightBarX, this.y, 120);
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

        DebugLogger.log(`🎼 Drawing beat ${beatIndex}`, {
            measureIndex,
            chordIndex,
            beatIndex,
            notesCount: beat.notes.length,
            notes: beat.notes.map(n => ({ value: n.value, isRest: n.isRest })),
            hasBeam: beat.hasBeam,
            beamGroups: beat.beamGroups
        });

        const hasBeamableNotes = beat.notes.some(n => n.value >= 8 || n.tieStart || n.tieEnd || n.tieToVoid || n.tieFromVoid);

        DebugLogger.log(`Beam detection`, {
            hasBeamableNotes,
            multipleNotes: beat.notes.length > 1,
            willDrawGroup: hasBeamableNotes && beat.notes.length > 1
        });

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
        const tupletGroups: Array<{startIndex: number, endIndex: number, count: number, groupId: string}> = [];
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
                    groupId: note.tuplet.groupId
                });
            }
        });

        // Calculate individual note positions, accounting for tuplet spacing
        const notePositionsX: number[] = [];
        let currentX = startX;
        const baseSpacing = 20;
        
        for (let i = 0; i < noteCount; i++) {
            const isInTuplet = tupletGroups.some(g => i >= g.startIndex && i <= g.endIndex);
            const spacing = isInTuplet ? baseSpacing * 0.75 : baseSpacing;
            notePositionsX.push(currentX);
            if (i < noteCount - 1) {
                currentX += spacing;
            }
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
            this.drawSingleNoteWithoutBeam(svg, nv, noteX, staffLineY, needsFlag);
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
            const stemTopY = hasStem ? staffLineY + 5 : undefined;
            const stemBottomY = hasStem ? staffLineY + 30 : undefined;

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
                stemBottomY
            });
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
            
            // Tuplet number centered above the bracket
            const centerX = (tupletStartX + tupletEndX) / 2;
            const text = document.createElementNS(SVG_NS, 'text');
            text.setAttribute('x', String(centerX));
            text.setAttribute('y', String(bracketY - 3));
            text.setAttribute('font-size', '10');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('text-anchor', 'middle');
            text.textContent = String(tupletGroup.count);
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
        if (nv.value === 1) {
            this.drawDiamondNoteHead(svg, centerX, staffLineY, true);
        } else if (nv.value === 2) {
            this.drawDiamondNoteHead(svg, centerX, staffLineY, true);
            this.drawStem(svg, centerX, staffLineY, 25);
        } else {
            this.drawSlash(svg, centerX, staffLineY);
            this.drawStem(svg, centerX, staffLineY, 25);
            if (nv.value === 8) this.drawFlag(svg, centerX, staffLineY, 1);
            else if (nv.value === 16) this.drawFlag(svg, centerX, staffLineY, 2);
            else if (nv.value === 32) this.drawFlag(svg, centerX, staffLineY, 3);
            else if (nv.value === 64) this.drawFlag(svg, centerX, staffLineY, 4);
        }

        if (nv.dotted) {
            const dot = document.createElementNS(SVG_NS, 'circle');
            dot.setAttribute('cx', (centerX + 10).toString());
            dot.setAttribute('cy', (staffLineY - 4).toString());
            dot.setAttribute('r', '1.5');
            dot.setAttribute('fill', '#000');
            svg.appendChild(dot);
        }

        return centerX;
    }

    /**
     * Draw a single note without beams or flags (for analyzer path).
     * Analyzer overlay will handle beams; this just draws head and stem.
     */
    private drawSingleNoteWithoutBeam(svg: SVGElement, nv: NoteElement, x: number, staffLineY: number, drawFlagsForIsolated: boolean = false): void {
        if (nv.isRest) {
            this.restRenderer.drawRest(svg, nv, x, staffLineY);
            return;
        }
        if (nv.value === 1) {
            this.drawDiamondNoteHead(svg, x, staffLineY, true);
        } else if (nv.value === 2) {
            this.drawDiamondNoteHead(svg, x, staffLineY, true);
            this.drawStem(svg, x, staffLineY, 25);
        } else {
            // For beamable notes (>=8), draw slash + stem but no flag (analyzer overlay draws beams)
            this.drawSlash(svg, x, staffLineY);
            this.drawStem(svg, x, staffLineY, 25);
            // If not part of a primary beam group, render flags directly here
            if (drawFlagsForIsolated) {
                const level = nv.value >= 64 ? 4 : nv.value >= 32 ? 3 : nv.value >= 16 ? 2 : nv.value >= 8 ? 1 : 0;
                if (level > 0) {
                    this.drawFlag(svg, x, staffLineY, level);
                }
            }
        }

        if (nv.dotted) {
            const dot = document.createElementNS(SVG_NS, 'circle');
            dot.setAttribute('cx', (x + 10).toString());
            dot.setAttribute('cy', (staffLineY - 4).toString());
            dot.setAttribute('r', '1.5');
            dot.setAttribute('fill', '#000');
            svg.appendChild(dot);
        }
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

    private drawFlag(svg: SVGElement, x: number, staffLineY: number, count: number): void {
        const slashLength = 10;
        const stemStartX = x - slashLength/2 + 2;
        const stemBottomY = staffLineY + slashLength/2 + 25;
        for (let i = 0; i < count; i++) {
            const flag = document.createElementNS(SVG_NS, 'path');
            const flagY = stemBottomY - i * 10;
            flag.setAttribute('d', `M ${stemStartX} ${flagY} Q ${stemStartX - 10} ${flagY - 5} ${stemStartX - 8} ${flagY - 12}`);
            flag.setAttribute('stroke', '#000');
            flag.setAttribute('stroke-width', '2');
            flag.setAttribute('fill', 'none');
            svg.appendChild(flag);
        }
    }

    private drawBar(svg: SVGElement, x: number, y: number, height: number): void {
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', x.toString());
        line.setAttribute('y1', y.toString());
        line.setAttribute('x2', x.toString());
        line.setAttribute('y2', (y + height).toString());
        line.setAttribute('stroke', '#000');
        line.setAttribute('stroke-width', '1.5');
        svg.appendChild(line);
    }

    private drawBarWithRepeat(svg: SVGElement, x: number, y: number, height: number, isStart: boolean): void {
        this.drawDoubleBar(svg, x, y, height);
        const dotOffset = isStart ? 12 : -12;
        const dot1Y = y + height * 0.35;
        const dot2Y = y + height * 0.65;
        [dot1Y, dot2Y].forEach(dotY => {
            const circle = document.createElementNS(SVG_NS, 'circle');
            circle.setAttribute('cx', (x + dotOffset).toString());
            circle.setAttribute('cy', dotY.toString());
            circle.setAttribute('r', '2');
            circle.setAttribute('fill', '#000');
            svg.appendChild(circle);
        });
    }

    private drawDoubleBar(svg: SVGElement, x: number, y: number, height: number): void {
        const bar1 = document.createElementNS(SVG_NS, 'line');
        bar1.setAttribute('x1', x.toString());
        bar1.setAttribute('y1', y.toString());
        bar1.setAttribute('x2', x.toString());
        bar1.setAttribute('y2', (y + height).toString());
        bar1.setAttribute('stroke', '#000');
        bar1.setAttribute('stroke-width', '1.5');
        svg.appendChild(bar1);

        const bar2 = document.createElementNS(SVG_NS, 'line');
        bar2.setAttribute('x1', (x + 6).toString());
        bar2.setAttribute('y1', y.toString());
        bar2.setAttribute('x2', (x + 6).toString());
        bar2.setAttribute('y2', (y + height).toString());
        bar2.setAttribute('stroke', '#000');
        bar2.setAttribute('stroke-width', '1.5');
        svg.appendChild(bar2);
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