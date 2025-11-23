/**
 * @file NoteRenderer.ts
 * @description Rendu SVG des éléments liés aux notes musicales.
 * 
 * Ce renderer est responsable de :
 * - Têtes de notes (diamond, slash)
 * - Hampes (stems) avec direction up/down
 * - Crochets (flags) pour notes isolées
 * - Points (dots) pour notes pointées
 * - Enregistrement des métadonnées dans PlaceAndSizeManager
 */

import { NoteElement, Beat } from '../parser/type';
import { PlaceAndSizeManager } from './PlaceAndSizeManager';
import { RestRenderer } from './RestRenderer';
import { SVG_NS } from './constants';

/**
 * Position d'une note avec ses métadonnées pour les liaisons.
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
}

/**
 * Classe responsable du rendu des notes musicales.
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
     * Dessine une tête de note en losange (diamond).
     */
    private drawDiamondNoteHead(svg: SVGElement, x: number, y: number, hollow: boolean): void {
        const diamondSize = 6;
        const diamond = document.createElementNS(SVG_NS, 'polygon');
        const points = [
            [x, y - diamondSize],
            [x + diamondSize, y],
            [x, y + diamondSize],
            [x - diamondSize, y]
        ];
        diamond.setAttribute('points', points.map(p => `${p[0]},${p[1]}`).join(' '));
        diamond.setAttribute('fill', hollow ? 'white' : 'black');
        diamond.setAttribute('stroke', '#000');
        diamond.setAttribute('stroke-width', '1');
        svg.appendChild(diamond);
    }

    /**
     * Dessine une barre de slash (tête de note pour valeurs >= 4).
     */
    private drawSlash(svg: SVGElement, x: number, y: number): void {
        const slashLength = 10;
        const slash = document.createElementNS(SVG_NS, 'line');
        slash.setAttribute('x1', (x + slashLength / 2).toString());
        slash.setAttribute('y1', (y - slashLength / 2).toString());
        slash.setAttribute('x2', (x - slashLength / 2).toString());
        slash.setAttribute('y2', (y + slashLength / 2).toString());
        slash.setAttribute('stroke', '#000');
        slash.setAttribute('stroke-width', '3');
        svg.appendChild(slash);
    }

    /**
     * Dessine une hampe orientée selon stemsDirection.
     * 
     * @returns Coordonnées de la hampe : x, topY (point le plus haut), bottomY (point le plus bas)
     */
    private drawStemWithDirection(
        svg: SVGElement,
        x: number,
        y: number,
        height: number,
        direction: 'up' | 'down'
    ): { x: number; topY: number; bottomY: number } {
        const slashLength = 10;
        
        // Position de la hampe selon la direction (notation musicale standard)
        // Hampes UP : à droite de la note head
        // Hampes DOWN : à gauche de la note head
        const stemStartX = direction === 'up' ? (x + slashLength / 2) : (x - slashLength / 2);

        let stemStartY: number, stemEndY: number;
        if (direction === 'up') {
            // Hampes vers le haut : part du HAUT de la tête de note et monte
            stemStartY = y - slashLength / 2;
            stemEndY = stemStartY - height;
        } else {
            // Hampes vers le bas : part du BAS de la tête de note et descend
            stemStartY = y + slashLength / 2;
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

        // Retourner les vraies valeurs top et bottom
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
            this.restRenderer.drawRest(svg, nv, x, staffLineY);
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
            stemInfo = this.drawStemWithDirection(svg, x, staffLineY, 25, this.stemsDirection);
        }
        // Notes ligaturables (>= 8) : slash + hampe (+ flags si isolée)
        else {
            this.drawSlash(svg, x, staffLineY);
            stemInfo = this.drawStemWithDirection(svg, x, staffLineY, 25, this.stemsDirection);

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
                this.restRenderer.drawRest(svg, nv, noteX, staffLineY);
                segmentNoteCursor[chordIndex]++;
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
                value: nv.value
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

        return firstNoteX;
    }
}
