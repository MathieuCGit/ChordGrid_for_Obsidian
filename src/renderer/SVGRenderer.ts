import { ChordGrid } from '../parser/type';
import { MeasureRenderer } from './MeasureRenderer';
import { SVG_NS } from './constants';

export class SVGRenderer {
  render(grid: ChordGrid): SVGElement {
    return this.createSVG(grid);
  }

  private createSVG(grid: ChordGrid): SVGElement {
    const measuresPerLine = 4;
    const measureWidth = 200;
    const measureHeight = 120;

    // Build linear positions honoring line breaks
    let currentLine = 0;
    let measuresInCurrentLine = 0;
    const measurePositions: {measure: any, lineIndex: number, posInLine: number, globalIndex: number}[] = [];
    let globalIndex = 0;

    grid.measures.forEach((measure) => {
      if ((measure as any).isLineBreak) {
        currentLine++;
        measuresInCurrentLine = 0;
        return;
      }

      if (measuresInCurrentLine >= measuresPerLine) {
        currentLine++;
        measuresInCurrentLine = 0;
      }

      measurePositions.push({ measure, lineIndex: currentLine, posInLine: measuresInCurrentLine, globalIndex: globalIndex++ });
      measuresInCurrentLine++;
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

    const notePositions: {x:number,y:number,measureIndex:number,chordIndex:number,beatIndex:number,noteIndex:number,tied:boolean}[] = [];

    measurePositions.forEach(({measure, lineIndex, posInLine, globalIndex}) => {
      const x = posInLine * measureWidth + 40;
      const y = lineIndex * (measureHeight + 20) + 20;
      const mr = new MeasureRenderer(measure, x, y, measureWidth);
      mr.drawMeasure(svg, globalIndex, notePositions, grid);
    });

    // draw ties using collected notePositions
    this.detectAndDrawTies(svg, notePositions);

    return svg;
  }

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

  private detectAndDrawTies(svg: SVGElement, notePositions: {x:number,y:number,measureIndex:number,chordIndex:number,beatIndex:number,noteIndex:number,tied:boolean}[]) {
    const ties: {startX:number,startY:number,endX:number,endY:number,isCrossMeasure?:boolean}[] = [];

    // 1. Liaisons intra-mesure
    for (let i = 0; i < notePositions.length - 1; i++) {
      const current = notePositions[i];
      const next = notePositions[i+1];
      if (current.tied && current.measureIndex === next.measureIndex) {
        // Même mesure - lier les notes adjacentes
        ties.push({ 
          startX: current.x, 
          startY: current.y - 8, 
          endX: next.x, 
          endY: next.y - 8 
        });
      }
    }

    // 2. Liaisons inter-mesures
    for (let i = 0; i < notePositions.length; i++) {
      const current = notePositions[i];
      // Chercher la dernière note d'une mesure avec tieStart
      if (current.tied) {
        const isLastInMeasure = !notePositions[i+1] || notePositions[i+1].measureIndex > current.measureIndex;
        if (isLastInMeasure) {
          // Chercher la première note de la mesure suivante
          for (let j = 0; j < notePositions.length; j++) {
            const target = notePositions[j];
            if (target.measureIndex === current.measureIndex + 1) {
              // Première note de la mesure suivante
              ties.push({ 
                startX: current.x, 
                startY: current.y - 8,
                endX: target.x, 
                endY: target.y - 8,
                isCrossMeasure: true 
              });
              break;
            }
          }
        }
      }
    }

    // Dessiner toutes les liaisons
    for (const t of ties) {
      const path = document.createElementNS(SVG_NS, 'path');
      const controlY = t.startY - (t.isCrossMeasure ? 15 : 5); // Plus haute pour les liaisons inter-mesures
      const midX = (t.startX + t.endX) / 2;
      let d;
      if (t.isCrossMeasure) {
        // Liaison inter-mesure : courbe plus ample
        d = `M ${t.startX} ${t.startY} C ${t.startX + 30} ${controlY}, ${t.endX - 30} ${controlY}, ${t.endX} ${t.endY}`;
      } else {
        // Liaison intra-mesure : courbe simple
        d = `M ${t.startX} ${t.startY} Q ${midX} ${controlY} ${t.endX} ${t.endY}`;
      }
      path.setAttribute('d', d);
      path.setAttribute('stroke', '#000');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('fill', 'none');
      svg.appendChild(path);
    }
  }
}