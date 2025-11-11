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
    tieStart?: boolean;
    tieEnd?: boolean;
        globalTimeIndex?: number; // Updated to match Note_Element interface
    tieToVoid?: boolean;
    tieFromVoid?: boolean;
    stemTopY?: number;
    stemBottomY?: number;
}

/**
 * Note avec informations de ligature pour le rendu groupé.
 */
interface BeamNote {
    nv: NoteElement;
    beamCount: number;
    centerX: number;
    stemX?: number;
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
        private readonly width: number
    ) {}

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

        if (measureIndex === 0) {
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
                const firstNoteX = this.drawRhythm(svg, beat, beatX, staffLineY, beatWidth, measureIndex, segmentIndex, beatIndex, notePositions);

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
        notePositions: NotePosition[]
    ): number | null {
        const beats = [beat];
        const beatWidth = width;
        let currentX = x;
        let firstNoteX: number | null = null;

        const first = this.drawBeat(svg, beat, currentX, staffLineY, beatWidth, measureIndex, chordIndex, beatIndex, notePositions);
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
        notePositions: NotePosition[]
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

        if (hasBeamableNotes && beat.notes.length > 1) {
            DebugLogger.log(`✅ Drawing note group with beams`);
            const firstNoteX = this.drawNoteGroup(svg, beat.notes, x + 10, staffLineY, width);
            const noteCount = beat.notes.length;
            const hasSmallNotes = beat.notes.some(nv => nv.value >= 32);
            const noteSpacing = noteCount > 0 ? (width / noteCount) * (hasSmallNotes ? 1.2 : 1) : width;
            beat.notes.forEach((nv, noteIndex) => {
                const noteX = x + 10 + noteIndex * noteSpacing + noteSpacing / 2;
                let headLeftX: number;
                let headRightX: number;
                if (nv.value === 1 || nv.value === 2) {
                    const diamondSize = 6;
                    headLeftX = noteX - diamondSize;
                    headRightX = noteX + diamondSize;
                } else {
                    const slashHalf = 10 / 2; // matches drawSlash
                    headLeftX = noteX - slashHalf;
                    headRightX = noteX + slashHalf;
                }
                // estimate stem extents when a stem exists (value >= 2)
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
                    tieStart: !!nv.tieStart,
                    tieEnd: !!nv.tieEnd,
                    tieToVoid: !!nv.tieToVoid,
                    tieFromVoid: !!nv.tieFromVoid,
                    globalTimeIndex: measureIndex * 1000000 + chordIndex * 10000 + beatIndex * 100 + noteIndex,
                    stemTopY,
                    stemBottomY
                });
            });
            return firstNoteX;
        } else {
            const nv = beat.notes[0];
            const noteX = this.drawSingleNote(svg, nv, x + 10, staffLineY, width);
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
                noteIndex: 0,
                tieStart: !!nv.tieStart,
                tieEnd: !!nv.tieEnd,
                tieToVoid: !!nv.tieToVoid,
                tieFromVoid: !!nv.tieFromVoid,
                globalTimeIndex: measureIndex * 1000000 + chordIndex * 10000 + beatIndex * 100,
                stemTopY,
                stemBottomY
            });
            return noteX;
        }
    }

    private drawSingleNote(svg: SVGElement, nv: NoteElement, x: number, staffLineY: number, width: number): number {
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
            dot.setAttribute('cx', (centerX + 8).toString());
            dot.setAttribute('cy', staffLineY.toString());
            dot.setAttribute('r', '2');
            dot.setAttribute('fill', '#000');
            svg.appendChild(dot);
        }

        return centerX;
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

    private drawNoteGroup(svg: SVGElement, notesValues: NoteElement[], x: number, staffLineY: number, width: number): number | null {
        const noteCount = notesValues.length;
        if (noteCount === 0) return null;
        
        DebugLogger.log('🎨 drawNoteGroup called', {
            noteCount,
            notes: notesValues.map(n => ({ value: n.value, dotted: n.dotted, isRest: n.isRest })),
            x,
            staffLineY,
            width
        });
        
        const hasSmallNotes = notesValues.some(nv => nv.value >= 32);
        const noteSpacing = noteCount > 0 ? (width / noteCount) * (hasSmallNotes ? 1.2 : 1) : width;
        const stemHeight = 25;
        
        if (noteCount === 1 && notesValues[0].value >= 8) {
            const centerX = x + noteSpacing / 2;
            this.drawSlash(svg, centerX, staffLineY);
            const stem = this.drawStem(svg, centerX, staffLineY, stemHeight);
            const value = notesValues[0].value;
            this.drawFlag(svg, centerX, staffLineY, value === 8 ? 1 : value === 16 ? 2 : value === 32 ? 3 : value === 64 ? 4 : 0);
            return centerX;
        }

        const notes: BeamNote[] = [];
        for (let i = 0; i < noteCount; i++) {
            const nv = notesValues[i];
            const centerX = x + i * noteSpacing + noteSpacing / 2;
            if (nv.value === 1) {
                this.drawDiamondNoteHead(svg, centerX, staffLineY, true);
                notes.push({ nv, beamCount: 0, centerX });
            } else if (nv.value === 2) {
                this.drawDiamondNoteHead(svg, centerX, staffLineY, true);
                const stemInfo = this.drawStem(svg, centerX, staffLineY, stemHeight);
                notes.push({ nv, beamCount: 0, centerX, stemX: stemInfo.x, stemTopY: stemInfo.topY, stemBottomY: stemInfo.bottomY });
            } else {
                this.drawSlash(svg, centerX, staffLineY);
                const stemInfo = this.drawStem(svg, centerX, staffLineY, stemHeight);
                const prevNote = i > 0 ? notesValues[i - 1] : null;
                const nextNote = i < notesValues.length - 1 ? notesValues[i + 1] : null;
                const needsFlag = nv.value >= 8 && (!prevNote || prevNote.value < 8) && (!nextNote || nextNote.value < 8);
                
                if (needsFlag) {
                    if (nv.value === 8) this.drawFlag(svg, centerX, staffLineY, 1);
                    else if (nv.value === 16) this.drawFlag(svg, centerX, staffLineY, 2);
                    else if (nv.value === 32) this.drawFlag(svg, centerX, staffLineY, 3);
                    else if (nv.value === 64) this.drawFlag(svg, centerX, staffLineY, 4);
                }
                
                const beamCount = nv.value === 8 ? 1 : nv.value === 16 ? 2 : nv.value === 32 ? 3 : nv.value === 64 ? 4 : 0;
                notes.push({ nv, beamCount, centerX, stemX: stemInfo.x, stemTopY: stemInfo.topY, stemBottomY: stemInfo.bottomY });
            }

            if (nv.dotted) {
                const dot = document.createElementNS(SVG_NS, 'circle');
                dot.setAttribute('cx', (centerX + 8).toString());
                dot.setAttribute('cy', staffLineY.toString());
                dot.setAttribute('r', '2');
                dot.setAttribute('fill', '#000');
                svg.appendChild(dot);
            }
        }

        const beamedNotes = notes.filter(n => n.beamCount > 0);
        
        DebugLogger.log('🎵 Notes prepared for beaming', {
            totalNotes: notes.length,
            beamedNotesCount: beamedNotes.length,
            beamedNotes: beamedNotes.map(n => ({ 
                value: n.nv.value, 
                beamCount: n.beamCount, 
                centerX: n.centerX,
                stemX: n.stemX,
                stemBottomY: n.stemBottomY
            }))
        });
        
        if (beamedNotes.length === 0) return notes.length ? notes[0].centerX : null;

        const maxBeamCount = Math.max(...beamedNotes.map(n => n.beamCount));
        if (maxBeamCount === 0) return notes.length ? notes[0].centerX : null;

        DebugLogger.log('🔨 Starting beam drawing', { maxBeamCount });

        const beamGap = 5;
        const validStemBottoms = beamedNotes.map(n => n.stemBottomY).filter(y => y !== undefined) as number[];
        const baseStemBottom = validStemBottoms.length > 0 ? Math.min(...validStemBottoms) : staffLineY + 30;

        DebugLogger.log('Beam baseline calculated', { baseStemBottom, validStemBottoms });

        for (let level = 1; level <= maxBeamCount; level++) {
            DebugLogger.log(`Drawing beam level ${level}`);
            let segStartIndex: number | null = null;
            
            for (let i = 0; i <= beamedNotes.length; i++) {
                // On va jusqu'à beamedNotes.length pour forcer le traitement du dernier segment
                const n = i < beamedNotes.length ? beamedNotes[i] : null;
                const active = n ? n.beamCount >= level : false;
                
                if (active && segStartIndex === null) {
                    // Début d'un nouveau segment
                    segStartIndex = i;
                } else if (!active && segStartIndex !== null) {
                    // Fin d'un segment (la note courante n'est pas active)
                    const segEnd = i - 1;
                    const beamY = baseStemBottom - (level - 1) * beamGap;
                    const startX = beamedNotes[segStartIndex].stemX!;
                    const endX = beamedNotes[segEnd].stemX!;
                    
                    // Si c'est une note isolée (segment d'une seule note), dessiner un beamlet (demi-barre)
                    if (segStartIndex === segEnd) {
                        const beamletLength = 8; // longueur de la demi-barre
                        
                        // Règle musicale pour les beamlets :
                        // - Si la note précédente est pointée → cette note complète le groupe → beamlet vers la GAUCHE
                        // - Si la note suivante est pointée → cette note démarre le groupe → beamlet vers la DROITE
                        // - Sinon : première moitié du groupe → DROITE, seconde moitié → GAUCHE
                        
                        const currentNote = beamedNotes[segStartIndex].nv;
                        const prevNote = segStartIndex > 0 ? beamedNotes[segStartIndex - 1].nv : null;
                        const nextNote = segStartIndex < beamedNotes.length - 1 ? beamedNotes[segStartIndex + 1].nv : null;
                        
                        let beamletEndX: number;
                        let direction: string;
                        
                        if (prevNote && prevNote.dotted) {
                            // Note précédente pointée → beamlet vers la gauche (fin de groupe)
                            beamletEndX = startX - beamletLength;
                            direction = 'left (after dotted note)';
                        } else if (nextNote && nextNote.dotted) {
                            // Note suivante pointée → beamlet vers la droite (début de groupe)
                            beamletEndX = startX + beamletLength;
                            direction = 'right (before dotted note)';
                        } else {
                            // Règle par défaut : pointer vers le centre du groupe
                            const groupCenter = (beamedNotes.length - 1) / 2;
                            const isInFirstHalf = segStartIndex < groupCenter;
                            
                            if (isInFirstHalf) {
                                beamletEndX = startX + beamletLength;
                                direction = 'right (first half)';
                            } else {
                                beamletEndX = startX - beamletLength;
                                direction = 'left (second half)';
                            }
                        }
                        
                        DebugLogger.log(`✏️ Drawing beamlet (partial beam)`, {
                            level,
                            from: { x: startX, y: beamY },
                            to: { x: beamletEndX, y: beamY },
                            noteIndex: segStartIndex,
                            direction,
                            prevDotted: prevNote?.dotted,
                            nextDotted: nextNote?.dotted
                        });
                        
                        const beamlet = document.createElementNS(SVG_NS, 'line');
                        beamlet.setAttribute('x1', startX.toString());
                        beamlet.setAttribute('y1', beamY.toString());
                        beamlet.setAttribute('x2', beamletEndX.toString());
                        beamlet.setAttribute('y2', beamY.toString());
                        beamlet.setAttribute('stroke', '#000');
                        beamlet.setAttribute('stroke-width', '2');
                        svg.appendChild(beamlet);
                    } else {
                        // Segment normal avec plusieurs notes
                        DebugLogger.log(`✏️ Drawing beam segment`, {
                            level,
                            from: { x: startX, y: beamY },
                            to: { x: endX, y: beamY },
                            segStartIndex,
                            segEnd
                        });
                        
                        const beam = document.createElementNS(SVG_NS, 'line');
                        beam.setAttribute('x1', startX.toString());
                        beam.setAttribute('y1', beamY.toString());
                        beam.setAttribute('x2', endX.toString());
                        beam.setAttribute('y2', beamY.toString());
                        beam.setAttribute('stroke', '#000');
                        beam.setAttribute('stroke-width', '2');
                        svg.appendChild(beam);
                    }
                    
                    segStartIndex = null;
                }
            }
        }

        return notes.length ? notes[0].centerX : null;
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