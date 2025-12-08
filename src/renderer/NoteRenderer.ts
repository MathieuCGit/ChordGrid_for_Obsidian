/**
 * @file NoteRenderer.ts
 * @description SVG rendering of musical note elements.
 * 
 * This renderer is responsible for:
 * - Note heads (diamond, slash)
 * - Stems with direction up/down
 * - Flags for isolated notes
 * - Dots for dotted notes
 * - Recording metadata in PlaceAndSizeManager
 */

import { NoteElement, Beat } from '../parser/type';
import { PlaceAndSizeManager } from './PlaceAndSizeManager';
import { RestRenderer } from './RestRenderer';
import { SVG_NS, NOTATION, VISUAL } from './constants';

/**
 * Position of a note with metadata for ties.
 */
export interface NotePosition {
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
    value?: number;
    countingNumber?: number;
    countingLabel?: string;
    countingSize?: 't' | 'm' | 's';
}

/**
 * Class responsible for rendering musical notes.
 */
export class NoteRenderer {
    private restRenderer: RestRenderer;
    private stemsDirection: 'up' | 'down';
    private placeAndSizeManager?: PlaceAndSizeManager;

    constructor(
        stemsDirection: 'up' | 'down' = 'up',
        placeAndSizeManager?: PlaceAndSizeManager
    ) {
        this.stemsDirection = stemsDirection;
        this.placeAndSizeManager = placeAndSizeManager;
        this.restRenderer = new RestRenderer();
    }

    /**
     * Draws a diamond note head.
     */
    private drawDiamondNoteHead(svg: SVGElement, x: number, y: number, hollow: boolean): void {
        const diamond = document.createElementNS(SVG_NS, 'polygon');
        const points = [
            [x, y - NOTATION.DIAMOND_SIZE],
            [x + NOTATION.DIAMOND_SIZE, y],
            [x, y + NOTATION.DIAMOND_SIZE],
            [x - NOTATION.DIAMOND_SIZE, y]
        ];
        diamond.setAttribute('points', points.map(p => `${p[0]},${p[1]}`).join(' '));
        diamond.setAttribute('fill', hollow ? 'white' : 'black');
        diamond.setAttribute('stroke', VISUAL.COLOR_BLACK);
        diamond.setAttribute('stroke-width', String(VISUAL.STROKE_WIDTH_THIN));
        svg.appendChild(diamond);
    }

    /**
     * Draws a slash bar (note head for values >= 4).
     */
    private drawSlash(svg: SVGElement, x: number, y: number): void {
        const slash = document.createElementNS(SVG_NS, 'line');
        slash.setAttribute('x1', (x + NOTATION.SLASH_LENGTH / 2).toString());
        slash.setAttribute('y1', (y - NOTATION.SLASH_LENGTH / 2).toString());
        slash.setAttribute('x2', (x - NOTATION.SLASH_LENGTH / 2).toString());
        slash.setAttribute('y2', (y + NOTATION.SLASH_LENGTH / 2).toString());
        slash.setAttribute('stroke', VISUAL.COLOR_BLACK);
        slash.setAttribute('stroke-width', String(VISUAL.STROKE_WIDTH_EXTRA_THICK));
        svg.appendChild(slash);
    }

    /**
     * Draws a stem oriented according to stemsDirection.
     * 
     * @returns Stem coordinates: x, topY (highest point), bottomY (lowest point)
     */
    private drawStemWithDirection(
        svg: SVGElement,
        x: number,
        y: number,
        height: number,
        direction: 'up' | 'down'
    ): { x: number; topY: number; bottomY: number } {
        // Stem position according to direction (standard music notation)
        // Stems UP: to the right of the note head
        // Stems DOWN: to the left of the note head
        const stemStartX = direction === 'up' ? (x + NOTATION.SLASH_LENGTH / 2) : (x - NOTATION.SLASH_LENGTH / 2);

        let stemStartY: number, stemEndY: number;
        if (direction === 'up') {
            // Stems upward: starts from the TOP of the note head and goes up
            stemStartY = y - NOTATION.SLASH_LENGTH / 2;
            stemEndY = stemStartY - height;
        } else {
            // Stems downward: starts from the BOTTOM of the note head and goes down
            stemStartY = y + NOTATION.SLASH_LENGTH / 2;
            stemEndY = stemStartY + height;
        }

        const stem = document.createElementNS(SVG_NS, 'line');
        stem.setAttribute('x1', stemStartX.toString());
        stem.setAttribute('y1', stemStartY.toString());
        stem.setAttribute('x2', stemStartX.toString());
        stem.setAttribute('y2', stemEndY.toString());
        stem.setAttribute('stroke', VISUAL.COLOR_BLACK);
        stem.setAttribute('stroke-width', String(VISUAL.STEM_STROKE_WIDTH));
        svg.appendChild(stem);

        // Return actual top and bottom values
        return {
            x: stemStartX,
            topY: Math.min(stemStartY, stemEndY),
            bottomY: Math.max(stemStartY, stemEndY)
        };
    }

    /**
     * Dessine des crochets (flags) sur une hampe pour les notes isolées.
     */
    private drawFlag(
        svg: SVGElement,
        stem: { x: number; topY: number; bottomY: number },
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

    /**
     * Dessine un point pour une note pointée.
     */
    private drawDot(svg: SVGElement, x: number, y: number, nv: NoteElement): void {
        const dot = document.createElementNS(SVG_NS, 'circle');
        dot.setAttribute('cx', (x + 10).toString());
        dot.setAttribute('cy', (y - 4).toString());
        dot.setAttribute('r', '1.5');
        dot.setAttribute('fill', '#000');
        dot.setAttribute('data-cg-dot', '1');
        svg.appendChild(dot);

        if (this.placeAndSizeManager) {
            const cx = x + 10;
            const cy = y - 4;
            this.placeAndSizeManager.registerElement('dot', {
                x: cx - 2,
                y: cy - 2,
                width: 4,
                height: 4
            }, 9, {
                value: nv.value,
                dotted: true,
                exactX: cx,
                exactY: cy
            });
        }
    }

    /**
     * Dessine une note unique sans ligature (pour path analyzer).
     * Les ligatures sont gérées par BeamRenderer.
     * 
     * @returns Coordonnées de la hampe si elle existe
     */
    public drawSingleNoteWithoutBeam(
        svg: SVGElement,
        nv: NoteElement,
        x: number,
        staffLineY: number,
        drawFlagsForIsolated: boolean = false
    ): { stemTopY?: number; stemBottomY?: number; stemX?: number } {
        // Silences gérés par RestRenderer
        if (nv.isRest) {
            this.restRenderer.drawRest(svg, nv, x, staffLineY, this.stemsDirection);
            return {};
        }

        let stemInfo: { x: number; topY: number; bottomY: number } | undefined;

        // Ronde (valeur 1) : diamond creux sans hampe
        if (nv.value === 1) {
            this.drawDiamondNoteHead(svg, x, staffLineY, true);
        }
        // Blanche (valeur 2) : diamond creux avec hampe
        else if (nv.value === 2) {
            this.drawDiamondNoteHead(svg, x, staffLineY, true);
            stemInfo = this.drawStemWithDirection(svg, x, staffLineY, 30, this.stemsDirection);
        }
        // Notes ligaturables (>= 8) : slash + hampe (+ flags si isolée)
        else {
            this.drawSlash(svg, x, staffLineY);
            stemInfo = this.drawStemWithDirection(svg, x, staffLineY, 30, this.stemsDirection);

            // Crochets pour notes isolées (non ligaturées)
            if (drawFlagsForIsolated) {
                const level = nv.value >= 64 ? 4 :
                             nv.value >= 32 ? 3 :
                             nv.value >= 16 ? 2 :
                             nv.value >= 8 ? 1 : 0;
                if (level > 0 && stemInfo) {
                    this.drawFlag(svg, stemInfo, level, this.stemsDirection);
                }
            }
        }

        // Point pour note pointée
        if (nv.dotted) {
            this.drawDot(svg, x, staffLineY, nv);
        }

        return stemInfo ? {
            stemTopY: stemInfo.topY,
            stemBottomY: stemInfo.bottomY,
            stemX: stemInfo.x
        } : {};
    }

    /**
     * Dessine un temps (beat) complet avec toutes ses notes.
     * 
     * @param svg - Élément SVG parent
     * @param beat - Temps à dessiner
     * @param beatX - Position X du début du temps
     * @param staffLineY - Position Y de la ligne de portée
     * @param beatWidth - Largeur allouée au temps
     * @param measureIndex - Index de la mesure
     * @param chordIndex - Index du segment d'accord
     * @param beatIndex - Index du temps
     * @param notePositions - Tableau pour collecter les positions des notes
     * @param segmentNoteCursor - Compteurs de notes par segment
     * @param beamedAtLevel1 - Set des notes en ligature niveau 1
     * @returns Position X de la première note, ou null si aucune
     */
    public drawBeat(
        svg: SVGElement,
        beat: Beat,
        beatX: number,
        staffLineY: number,
        beatWidth: number,
        measureIndex: number,
        chordIndex: number,
        beatIndex: number,
        notePositions: NotePosition[],
        segmentNoteCursor: number[],
        beamedAtLevel1?: Set<string>
    ): number | null {
        const noteCount = beat.notes.length;
        if (noteCount === 0) return null;

        const innerLeft = 10;
        const innerRight = 10;
        const startX = beatX + innerLeft;
        const endX = beatX + beatWidth - innerRight;
        const availableWidth = endX - startX;

        // Positionnement des notes avec espacement tuplet-aware
        const notePositionsX: number[] = [];
        let firstNoteX: number | null = null;

        // Calcul des espacements désirés
        const gapCount = noteCount - 1;
        const desiredGaps: number[] = [];
        
        for (let i = 0; i < gapCount; i++) {
            const currentNote = beat.notes[i];
            const nextNote = beat.notes[i + 1];
            const currentIsRest = currentNote.isRest;
            const nextIsRest = nextNote.isRest;
            const minGap = 20;
            let gap = currentIsRest || nextIsRest ? minGap + 4 : minGap;
            desiredGaps.push(gap);
        }

        const totalDesiredGap = desiredGaps.reduce((a, b) => a + b, 0);
        const scale = gapCount > 0 ? Math.min(1, availableWidth / totalDesiredGap) : 1;
        const finalGaps = desiredGaps.map(g => g * scale);

        let cursorX = startX;
        for (let i = 0; i < noteCount; i++) {
            notePositionsX.push(cursorX);
            if (i < gapCount) cursorX += finalGaps[i];
        }

        // Rendu de chaque note
        beat.notes.forEach((nv, noteIndex) => {
            let noteX: number;
            
            // Cas spécial : pause de ronde centrée
            if (noteCount === 1 && nv.isRest && nv.value === 1) {
                noteX = beatX + beatWidth / 2;
            } else {
                noteX = notePositionsX[noteIndex];
            }

            // Silences
            if (nv.isRest) {
                this.restRenderer.drawRest(svg, nv, noteX, staffLineY, this.stemsDirection);
                
                // Enregistrer la position du silence pour le système de counting
                notePositions.push({
                    x: noteX,
                    y: staffLineY,
                    measureIndex,
                    chordIndex,
                    beatIndex,
                    noteIndex,
                    segmentNoteIndex: segmentNoteCursor[chordIndex]++,
                    value: nv.value,
                    countingNumber: nv.countingNumber,
                    countingLabel: nv.countingLabel,
                    countingSize: nv.countingSize
                });
                
                if (firstNoteX === null) firstNoteX = noteX;
                return;
            }

            // Notes avec éventuelle ligature niveau 1
            const localIndexInSegment = segmentNoteCursor[chordIndex];
            const isInPrimaryBeam = beamedAtLevel1?.has(`${chordIndex}:${localIndexInSegment}`) ?? false;
            const needsFlag = nv.value >= 8 && !isInPrimaryBeam;

            const stemCoords = this.drawSingleNoteWithoutBeam(svg, nv, noteX, staffLineY, needsFlag);
            if (firstNoteX === null) firstNoteX = noteX;

            // Calcul des bords de la tête de note
            let headLeftX: number, headRightX: number;
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
            const stemX = stemCoords.stemX;

            // Enregistrement de la position de la note
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
                value: nv.value,
                countingNumber: nv.countingNumber,
                countingLabel: nv.countingLabel,
                countingSize: nv.countingSize
            });

            // Enregistrement dans PlaceAndSizeManager
            if (this.placeAndSizeManager) {
                // Tête de note
                const noteHeadBBox = {
                    x: headLeftX,
                    y: staffLineY - 12,
                    width: headRightX - headLeftX,
                    height: 24
                };
                this.placeAndSizeManager.registerElement('note', noteHeadBBox, 6, {
                    value: nv.value,
                    dotted: nv.dotted,
                    measureIndex,
                    chordIndex,
                    beatIndex,
                    noteIndex,
                    exactX: noteX,
                    exactY: staffLineY
                });

                // Hampe
                if (hasStem && stemTopY !== undefined && stemBottomY !== undefined && stemX !== undefined) {
                    const stemBBox = {
                        x: stemX - 1.5,
                        y: stemTopY,
                        width: 3,
                        height: stemBottomY - stemTopY
                    };

                    this.placeAndSizeManager.registerElement('stem', stemBBox, 5, {
                        measureIndex,
                        chordIndex,
                        beatIndex,
                        noteIndex,
                        canCollide: true,
                        stem: {
                            centerX: stemX,
                            centerY: (stemTopY + stemBottomY) / 2,
                            topY: stemTopY,
                            bottomY: stemBottomY,
                            direction: this.stemsDirection
                        }
                    });
                }
            }
        });

        // Render tuplet brackets if any
        const tupletGroups = this.detectTupletGroups(beat);
        tupletGroups.forEach(tupletGroup => {
            this.drawTupletBracket(svg, tupletGroup, beat, notePositions, measureIndex, chordIndex, beatIndex);
        });

        return firstNoteX;
    }

    /**
     * Détecte tous les groupes de tuplets dans le beat.
     * Retourne un tableau de groupes avec startIndex, endIndex, count et ratio.
     */
    private detectTupletGroups(beat: Beat): Array<{
        startIndex: number,
        endIndex: number,
        count: number,
        groupId: string,
        ratio?: {numerator: number, denominator: number},
        explicitRatio?: boolean
    }> {
        const groups: Array<{
            startIndex: number,
            endIndex: number,
            count: number,
            groupId: string,
            ratio?: {numerator: number, denominator: number},
            explicitRatio?: boolean
        }> = [];
        const seenGroups = new Set<string>();

        beat.notes.forEach((note, i) => {
            if (note.tuplet && !seenGroups.has(note.tuplet.groupId)) {
                seenGroups.add(note.tuplet.groupId);

                // Trouver le début et la fin du groupe
                const groupNotes = beat.notes.filter((n, idx) =>
                    n.tuplet && n.tuplet.groupId === note.tuplet!.groupId
                );

                const startIndex = beat.notes.findIndex(n =>
                    n.tuplet && n.tuplet.groupId === note.tuplet!.groupId
                );
                const endIndex = startIndex + groupNotes.length - 1;

                groups.push({
                    startIndex,
                    endIndex,
                    count: note.tuplet.count,
                    groupId: note.tuplet.groupId,
                    ratio: note.tuplet.ratio,
                    explicitRatio: note.tuplet.explicitRatio
                });
            }
        });

        return groups;
    }

    /**
     * Dessine le bracket de tuplet avec son chiffre au-dessus du groupe de notes.
     * Si un ratio explicite est fourni (N:M), il sera affiché au lieu du simple count.
     */
    private drawTupletBracket(
        svg: SVGElement,
        tupletGroup: {
            startIndex: number,
            endIndex: number,
            count: number,
            ratio?: {numerator: number, denominator: number},
            explicitRatio?: boolean
        },
        beat: Beat,
        notePositions: NotePosition[],
        measureIndex: number,
        chordIndex: number,
        beatIndex: number
    ) {
        // Find the actual note positions for this tuplet group
        const groupNotePositions: NotePosition[] = [];
        for (let i = tupletGroup.startIndex; i <= tupletGroup.endIndex; i++) {
            const notePos = notePositions.find(np =>
                np.measureIndex === measureIndex &&
                np.chordIndex === chordIndex &&
                np.beatIndex === beatIndex &&
                np.noteIndex === i
            );
            if (notePos) {
                groupNotePositions.push(notePos);
            }
        }

        if (groupNotePositions.length === 0) return;

        const firstNote = groupNotePositions[0];
        const lastNote = groupNotePositions[groupNotePositions.length - 1];

        // Use stem positions if available, otherwise use note center
        const startX = firstNote.stemTopY !== undefined ? (firstNote.x + NOTATION.SLASH_LENGTH / 2) : firstNote.x;
        const endX = lastNote.stemTopY !== undefined ? (lastNote.x + NOTATION.SLASH_LENGTH / 2) : lastNote.x;

        // Find the highest stem top (lowest Y value since Y increases downward)
        const highestStemTop = Math.min(...groupNotePositions
            .filter(np => np.stemTopY !== undefined)
            .map(np => np.stemTopY!));

        // Position bracket above the highest stem with clearance
        const bracketY = highestStemTop - 9;

        // Ligne horizontale du bracket
        const bracket = document.createElementNS(SVG_NS, 'line');
        bracket.setAttribute('x1', String(startX));
        bracket.setAttribute('y1', String(bracketY));
        bracket.setAttribute('x2', String(endX));
        bracket.setAttribute('y2', String(bracketY));
        bracket.setAttribute('stroke', '#000');
        bracket.setAttribute('stroke-width', '1');
        svg.appendChild(bracket);

        // Petites barres verticales aux extrémités
        const leftBar = document.createElementNS(SVG_NS, 'line');
        leftBar.setAttribute('x1', String(startX));
        leftBar.setAttribute('y1', String(bracketY));
        leftBar.setAttribute('x2', String(startX));
        leftBar.setAttribute('y2', String(bracketY + 5));
        leftBar.setAttribute('stroke', '#000');
        leftBar.setAttribute('stroke-width', '1');
        svg.appendChild(leftBar);

        const rightBar = document.createElementNS(SVG_NS, 'line');
        rightBar.setAttribute('x1', String(endX));
        rightBar.setAttribute('y1', String(bracketY));
        rightBar.setAttribute('x2', String(endX));
        rightBar.setAttribute('y2', String(bracketY + 5));
        rightBar.setAttribute('stroke', '#000');
        rightBar.setAttribute('stroke-width', '1');
        svg.appendChild(rightBar);

        // Register tuplet bracket in collision manager
        if (this.placeAndSizeManager) {
            this.placeAndSizeManager.registerElement(
                'tuplet-bracket',
                {
                    x: startX,
                    y: bracketY,
                    width: endX - startX,
                    height: 5
                },
                10, // High priority (fixed element)
                {
                    measureIndex,
                    chordIndex,
                    beatIndex,
                    tuplet: {
                        topY: bracketY,
                        bottomY: bracketY + 5
                    }
                }
            );
        }

        // Si un ratio explicite est fourni (ex: 5:4), l'afficher au lieu du count
        const centerX = (startX + endX) / 2;
        const text = document.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', String(centerX));
        text.setAttribute('y', String(bracketY - 3));
        text.setAttribute('font-size', '12');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('text-anchor', 'middle');

        let textContent: string;
        if (tupletGroup.explicitRatio && tupletGroup.ratio) {
            // Afficher le ratio explicite N:M seulement si l'utilisateur l'a écrit
            textContent = `${tupletGroup.ratio.numerator}:${tupletGroup.ratio.denominator}`;
        } else {
            // Afficher seulement le count (comportement par défaut)
            textContent = String(tupletGroup.count);
        }
        text.textContent = textContent;

        svg.appendChild(text);

        // Register tuplet number/text in collision manager (this is the critical one for chord collision)
        if (this.placeAndSizeManager) {
            // Estimate text width based on content length
            const charWidth = 7; // Approximate width per character at font-size 12
            const estimatedWidth = textContent.length * charWidth;
            const textHeight = 12; // Font size
            
            this.placeAndSizeManager.registerElement(
                'tuplet-number',
                {
                    x: centerX - estimatedWidth / 2,
                    y: bracketY - 3 - textHeight, // y is baseline, so subtract height for top
                    width: estimatedWidth,
                    height: textHeight
                },
                10, // High priority (fixed element)
                {
                    measureIndex,
                    chordIndex,
                    beatIndex,
                    tuplet: {
                        centerX,
                        topY: bracketY - 3 - textHeight,
                        text: textContent
                    }
                }
            );
        }
    }
}
