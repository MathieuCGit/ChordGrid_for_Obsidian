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

import { ChordGrid } from '../parser/type';
import { MeasureRenderer } from './MeasureRenderer';
import { SVG_NS } from './constants';
import { TieManager } from '../utils/TieManager';
import { DebugLogger } from '../utils/DebugLogger';

/**
 * Classe principale pour le rendu SVG des grilles d'accords.
 */
export class SVGRenderer {
  /**
   * Rend une grille d'accords en élément SVG.
   * 
   * @param grid - Structure ChordGrid contenant les mesures à rendre
   * @returns Élément SVG prêt à être inséré dans le DOM
   */
  render(grid: ChordGrid): SVGElement {
    return this.createSVG(grid);
  }

  private createSVG(grid: ChordGrid): SVGElement {
    const measuresPerLine = 4;
    const measureWidth = 200;
    const measureHeight = 120;

    DebugLogger.log('📐 Creating SVG layout', { 
      measuresPerLine, 
      measureWidth, 
      measureHeight 
    });

    // Build linear positions honoring line breaks
    let currentLine = 0;
    let measuresInCurrentLine = 0;
    const measurePositions: {measure: any, lineIndex: number, posInLine: number, globalIndex: number}[] = [];
    let globalIndex = 0;

    grid.measures.forEach((measure) => {
      if ((measure as any).isLineBreak) {
        DebugLogger.log('↵ Line break detected');
        currentLine++;
        measuresInCurrentLine = 0;
        return;
      }

      if (measuresInCurrentLine >= measuresPerLine) {
        DebugLogger.log(`↵ Auto line break (${measuresInCurrentLine} measures)`);
        currentLine++;
        measuresInCurrentLine = 0;
      }

      measurePositions.push({ measure, lineIndex: currentLine, posInLine: measuresInCurrentLine, globalIndex: globalIndex++ });
      measuresInCurrentLine++;
    });

    DebugLogger.log('📊 Layout calculated', { 
      totalLines: currentLine + 1, 
      totalMeasures: measurePositions.length 
    });

    const lines = currentLine + 1;
    const width = measuresPerLine * measureWidth + 60;
    const height = lines * (measureHeight + 20) + 20;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('xmlns', SVG_NS);

    // white background
    const bg = document.createElementNS(SVG_NS, 'rect');
    bg.setAttribute('x', '0');
    bg.setAttribute('y', '0');
    bg.setAttribute('width', String(width));
    bg.setAttribute('height', String(height));
    bg.setAttribute('fill', 'white');
    svg.appendChild(bg);

    // time signature text
    const timeSig = `${grid.timeSignature.numerator}/${grid.timeSignature.denominator}`;
    const timeText = this.createText(timeSig, 10, 40, '18px', 'bold');
    svg.appendChild(timeText);

  const notePositions: {x:number,y:number,headLeftX?:number,headRightX?:number,measureIndex:number,chordIndex:number,beatIndex:number,noteIndex:number,tieStart?:boolean,tieEnd?:boolean,tieToVoid?:boolean,tieFromVoid?:boolean,stemTopY?:number,stemBottomY?:number}[] = [];
  const tieManager = new TieManager();

    DebugLogger.log('🎼 Rendering measures');
    measurePositions.forEach(({measure, lineIndex, posInLine, globalIndex}) => {
      const x = posInLine * measureWidth + 40;
      const y = lineIndex * (measureHeight + 20) + 20;
      const mr = new MeasureRenderer(measure, x, y, measureWidth);
      mr.drawMeasure(svg, globalIndex, notePositions, grid);
    });

  DebugLogger.log('🎵 Note positions collected', { count: notePositions.length });
  
  // draw ties using collected notePositions and the TieManager for cross-line ties
  this.detectAndDrawTies(svg, notePositions, width, tieManager);

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
   */
  private detectAndDrawTies(
    svg: SVGElement,
    notePositions: {x:number,y:number,headLeftX?:number,headRightX?:number,measureIndex:number,chordIndex:number,beatIndex:number,noteIndex:number,tieStart?:boolean,tieEnd?:boolean,tieToVoid?:boolean,tieFromVoid?:boolean,stemTopY?:number,stemBottomY?:number}[],
    svgWidth: number,
    tieManager: TieManager
  ) {
    DebugLogger.log('🔗 Starting tie detection and drawing');
    
    const matched = new Set<number>();
    
    // Log all notes with tie markers
    const tieNotes = notePositions.filter(n => n.tieStart || n.tieEnd || n.tieToVoid || n.tieFromVoid);
    DebugLogger.log('Notes with tie markers', { 
      count: tieNotes.length,
      details: tieNotes.map((n, idx) => ({
        index: notePositions.indexOf(n),
        measure: n.measureIndex,
        chord: n.chordIndex,
        beat: n.beatIndex,
        note: n.noteIndex,
        tieStart: n.tieStart,
        tieEnd: n.tieEnd,
        tieToVoid: n.tieToVoid,
        tieFromVoid: n.tieFromVoid,
        position: { x: n.x, y: n.y }
      }))
    });

    const drawCurve = (startX: number, startY: number, endX: number, endY: number, isCross: boolean) => {
      DebugLogger.log('Drawing tie curve', { 
        from: { x: startX, y: startY }, 
        to: { x: endX, y: endY }, 
        crossMeasure: isCross 
      });
      
      const path = document.createElementNS(SVG_NS, 'path');
      const dx = Math.abs(endX - startX);
      const baseAmp = Math.min(40, Math.max(8, dx / 6));
      const controlY = Math.min(startY, endY) - (isCross ? baseAmp + 10 : baseAmp);
      const midX = (startX + endX) / 2;
      const d = `M ${startX} ${startY} Q ${midX} ${controlY} ${endX} ${endY}`;
      path.setAttribute('d', d);
      path.setAttribute('stroke', '#000');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('fill', 'none');
      svg.appendChild(path);
    };

    const drawHalfToMargin = (startX: number, startY: number, svgW: number) => {
      const marginX = svgW - 16;
      DebugLogger.log('Drawing half-tie to margin (tieToVoid)', { 
        from: { x: startX, y: startY }, 
        toMargin: marginX 
      });
      drawCurve(startX, startY, marginX, startY, true);
      return { x: marginX, y: startY };
    };

    // Primary pass: match each tieStart to the next available tieEnd (temporal order)
    DebugLogger.log('🔍 Primary pass: matching tieStart -> tieEnd');
    for (let i = 0; i < notePositions.length; i++) {
      if (matched.has(i)) continue;
      const cur = notePositions[i];

      // compute visual anchor points (prefer head bounds when available)
      const startX = (cur.headRightX !== undefined) ? cur.headRightX : cur.x;
      let startY: number;
      if (cur.headRightX !== undefined) {
        const half = Math.abs(cur.headRightX - cur.x);
        // diamond heads have horizontal left/right at center Y (half >=6), slash heads have tilted endpoints
        startY = half >= 6 ? cur.y : cur.y - half;
      } else {
        startY = cur.y - 8;
      }

      if (cur.tieStart) {
        DebugLogger.log(`Found tieStart at index ${i}`, { 
          measure: cur.measureIndex, 
          chord: cur.chordIndex, 
          beat: cur.beatIndex 
        });
        
        // search for a direct tieEnd after i
        let found = -1;
        for (let j = i + 1; j < notePositions.length; j++) {
          if (matched.has(j)) continue;
          const cand = notePositions[j];
          if (cand.tieEnd) { found = j; break; }
        }

        if (found >= 0) {
          DebugLogger.log(`✅ Matched tieStart[${i}] -> tieEnd[${found}]`);
          const tgt = notePositions[found];
          const endX = (tgt.headLeftX !== undefined) ? tgt.headLeftX : tgt.x;
          let endY: number;
          if (tgt.headLeftX !== undefined) {
            const halfT = Math.abs(tgt.headLeftX - tgt.x);
            endY = halfT >= 6 ? tgt.y : tgt.y + halfT;
          } else {
            endY = tgt.y - 8;
          }
          drawCurve(startX, startY, endX, endY, cur.measureIndex !== tgt.measureIndex);
          matched.add(i);
          matched.add(found);
          continue;
        }

        DebugLogger.log(`No direct tieEnd found for tieStart[${i}], searching for tieFromVoid`);
        
        // no direct tieEnd found -> search for a tieFromVoid later (continuation)
        let foundFromVoid = -1;
        for (let j = i + 1; j < notePositions.length; j++) {
          if (matched.has(j)) continue;
          const cand = notePositions[j];
          if (cand.tieFromVoid) { foundFromVoid = j; break; }
        }

        if (foundFromVoid >= 0) {
          DebugLogger.log(`✅ Matched tieStart[${i}] -> tieFromVoid[${foundFromVoid}]`);
          const tgt = notePositions[foundFromVoid];
          const endX = (tgt.headLeftX !== undefined) ? tgt.headLeftX : tgt.x;
          let endY: number;
          if (tgt.headLeftX !== undefined) {
            const halfT = Math.abs(tgt.headLeftX - tgt.x);
            endY = halfT >= 6 ? tgt.y : tgt.y + halfT;
          } else {
            endY = tgt.y - 8;
          }
          drawCurve(startX, startY, endX, endY, true);
          matched.add(i);
          matched.add(foundFromVoid);
          continue;
        }

        DebugLogger.log(`No tieFromVoid found, checking tieToVoid flag`);
        
        // still no match: if this ties-to-void, draw half-tie to margin and register pending
        if (cur.tieToVoid) {
          DebugLogger.log(`Drawing tieToVoid for index ${i}`);
          const pending = drawHalfToMargin(startX, startY, svgWidth);
          tieManager.addPendingTie(cur.measureIndex, pending.x, pending.y);
          matched.add(i);
          continue;
        }
        
        DebugLogger.warn(`tieStart[${i}] has no match and no tieToVoid flag`);
      }

      // If this note marks the start of a tie from the previous line
      if (cur.tieFromVoid && !matched.has(i)) {
        DebugLogger.log(`Found tieFromVoid at index ${i}`, { 
          measure: cur.measureIndex 
        });
        
        const pending = tieManager.resolvePendingFor(cur.measureIndex);
        let endX = (cur.headLeftX !== undefined) ? cur.headLeftX : cur.x;
        let endY: number;
        if (cur.headLeftX !== undefined) {
          const half = Math.abs(cur.headLeftX - cur.x);
          endY = half >= 6 ? cur.y : cur.y + half;
        } else {
          endY = cur.y - 8;
        }

        if (pending) {
          DebugLogger.log(`✅ Resolved pending tie for tieFromVoid[${i}]`, pending);
          drawCurve(pending.x, pending.y, endX, endY, true);
          matched.add(i);
        } else {
          DebugLogger.log(`⚠️ No pending tie found, drawing from left margin`);
          // nothing to resolve: draw a short half-tie from left margin into the note
          const leftMarginX = 16;
          drawCurve(leftMarginX, endY, endX, endY, true);
          matched.add(i);
        }
      }
    }
    
    DebugLogger.log('🔗 Tie detection completed', { 
      totalMatched: matched.size, 
      totalNotes: notePositions.length 
    });
  }
}