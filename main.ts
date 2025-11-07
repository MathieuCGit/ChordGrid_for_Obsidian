import { Plugin, MarkdownPostProcessorContext } from 'obsidian';

interface Beat {
  notes: number[]; // Liste des valeurs rythmiques (8, 4, 2, 1, etc.)
}

interface Measure {
  chord: string;
  beats: Beat[];
  isRepeatStart?: boolean;
  isRepeatEnd?: boolean;
}

interface ChordGrid {
  timeSignature: string;
  measures: Measure[];
}

export default class ChordGridPlugin extends Plugin {
  async onload() {
    console.log('Chargement du plugin Chord Grid');

    this.registerMarkdownCodeBlockProcessor('chordgrid', (source, el, ctx) => {
      this.renderChordGrid(source, el);
    });
  }

  parseChordGrid(source: string): ChordGrid {
    const lines = source.trim().split('\n');
    let timeSignature = '4/4';
    const measures: Measure[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Parser la signature temporelle
      const timeSigMatch = trimmed.match(/^(\d+\/\d+)/);
      if (timeSigMatch) {
        timeSignature = timeSigMatch[1];
      }

      // Parser les mesures
      const measurePattern = /(\|\|:|\|:|\|\||\|)?([A-G][#b]?(?:maj|min|m|dim|aug|sus|[0-9])*)\[([0-9\s]+)\](\:\|\||\|\||\|)?/g;
      let match;

      while ((match = measurePattern.exec(trimmed)) !== null) {
        const startBar = match[1] || '';
        const chord = match[2];
        const rhythm = match[3];
        const endBar = match[4] || '';

        // Parser le rythme en beats
        const beats: Beat[] = [];
        const rhythmTokens = rhythm.split(/\s+/);
        
        for (const token of rhythmTokens) {
          const notes: number[] = [];
          for (const char of token) {
            const value = parseInt(char);
            if (!isNaN(value)) {
              notes.push(value);
            }
          }
          if (notes.length > 0) {
            beats.push({ notes });
          }
        }

        measures.push({
          chord,
          beats,
          isRepeatStart: startBar.includes(':'),
          isRepeatEnd: endBar.includes(':')
        });
      }
    }

    return { timeSignature, measures };
  }

  renderChordGrid(source: string, container: HTMLElement) {
    const grid = this.parseChordGrid(source);
    
    const svg = this.createSVG(grid);
    container.empty();
    container.appendChild(svg);
  }

  createSVG(grid: ChordGrid): SVGElement {
    const measuresPerLine = 4;
    const measureWidth = 200;
    const measureHeight = 120;
    const lines = Math.ceil(grid.measures.length / measuresPerLine);
    
    const width = measuresPerLine * measureWidth + 40;
    const height = lines * (measureHeight + 20) + 20;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.background = '#ffffff';

    // Dessiner la signature temporelle au début
    const timeSigText = this.createText(grid.timeSignature, 10, 40, '18px', 'bold');
    svg.appendChild(timeSigText);

    // Dessiner les mesures
    grid.measures.forEach((measure, index) => {
      const lineIndex = Math.floor(index / measuresPerLine);
      const posInLine = index % measuresPerLine;
      
      const x = posInLine * measureWidth + 40;
      const y = lineIndex * (measureHeight + 20) + 20;

      this.drawMeasure(svg, measure, x, y, measureWidth, measureHeight);
    });

    return svg;
  }

  drawMeasure(svg: SVGElement, measure: Measure, x: number, y: number, width: number, height: number) {
    // Dessiner la barre de mesure gauche
    if (measure.isRepeatStart) {
      this.drawRepeatBar(svg, x, y, height, true);
    } else {
      this.drawBar(svg, x, y, height);
    }

    // Dessiner l'accord
    const chordText = this.createText(measure.chord, x + width / 2, y + 40, '24px', 'bold');
    chordText.setAttribute('text-anchor', 'middle');
    svg.appendChild(chordText);

    // Dessiner le rythme
    this.drawRhythm(svg, measure.beats, x + 10, y + 70, width - 20);

    // Dessiner la barre de mesure droite
    if (measure.isRepeatEnd) {
      this.drawRepeatBar(svg, x + width, y, height, false);
    } else {
      this.drawBar(svg, x + width, y, height);
    }
  }

  drawBar(svg: SVGElement, x: number, y: number, height: number) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x.toString());
    line.setAttribute('y1', y.toString());
    line.setAttribute('x2', x.toString());
    line.setAttribute('y2', (y + height).toString());
    line.setAttribute('stroke', '#000');
    line.setAttribute('stroke-width', '2');
    svg.appendChild(line);
  }

  drawRepeatBar(svg: SVGElement, x: number, y: number, height: number, isStart: boolean) {
    // Double barre
    const offset = isStart ? 0 : -6;
    this.drawBar(svg, x + offset, y, height);
    this.drawBar(svg, x + offset + 4, y, height);

    // Points de reprise
    const dotOffset = isStart ? 10 : -10;
    const dot1Y = y + height * 0.35;
    const dot2Y = y + height * 0.65;

    [dot1Y, dot2Y].forEach(dotY => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', (x + dotOffset).toString());
      circle.setAttribute('cy', dotY.toString());
      circle.setAttribute('r', '3');
      circle.setAttribute('fill', '#000');
      svg.appendChild(circle);
    });
  }

  drawRhythm(svg: SVGElement, beats: Beat[], x: number, y: number, width: number) {
    const beatWidth = width / beats.length;
    let currentX = x;

    beats.forEach((beat) => {
      this.drawBeat(svg, beat, currentX, y, beatWidth);
      currentX += beatWidth;
    });
  }

  drawBeat(svg: SVGElement, beat: Beat, x: number, y: number, width: number) {
    const noteSpacing = width / beat.notes.length;
    let currentX = x;

    // Vérifier si toutes les notes sont des croches (8) ou doubles (16)
    const allEighths = beat.notes.every(n => n === 8);
    const allSixteenths = beat.notes.every(n => n === 16);

    if (allEighths && beat.notes.length > 1) {
      // Dessiner les croches avec hampe liée
      this.drawBeamedNotes(svg, beat.notes, x, y, width, 1);
    } else if (allSixteenths && beat.notes.length > 1) {
      // Dessiner les doubles croches avec hampes liées
      this.drawBeamedNotes(svg, beat.notes, x, y, width, 2);
    } else {
      // Dessiner les notes individuellement
      beat.notes.forEach((note) => {
        this.drawNote(svg, note, currentX, y);
        currentX += noteSpacing;
      });
    }
  }

  drawBeamedNotes(svg: SVGElement, notes: number[], x: number, y: number, width: number, beamCount: number) {
    const noteSpacing = width / notes.length;
    const stemHeight = 25;

    // Dessiner les têtes de notes
    notes.forEach((_, index) => {
      const noteX = x + index * noteSpacing + noteSpacing / 2;
      const head = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      head.setAttribute('cx', noteX.toString());
      head.setAttribute('cy', y.toString());
      head.setAttribute('rx', '4');
      head.setAttribute('ry', '3');
      head.setAttribute('fill', '#000');
      svg.appendChild(head);

      // Hampe
      const stem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      stem.setAttribute('x1', (noteX + 4).toString());
      stem.setAttribute('y1', y.toString());
      stem.setAttribute('x2', (noteX + 4).toString());
      stem.setAttribute('y2', (y - stemHeight).toString());
      stem.setAttribute('stroke', '#000');
      stem.setAttribute('stroke-width', '1.5');
      svg.appendChild(stem);
    });

    // Dessiner les barres horizontales
    const startX = x + noteSpacing / 2 + 4;
    const endX = x + (notes.length - 1) * noteSpacing + noteSpacing / 2 + 4;
    
    for (let i = 0; i < beamCount; i++) {
      const beamY = y - stemHeight + i * 3;
      const beam = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      beam.setAttribute('x1', startX.toString());
      beam.setAttribute('y1', beamY.toString());
      beam.setAttribute('x2', endX.toString());
      beam.setAttribute('y2', beamY.toString());
      beam.setAttribute('stroke', '#000');
      beam.setAttribute('stroke-width', '3');
      svg.appendChild(beam);
    }
  }

  drawNote(svg: SVGElement, value: number, x: number, y: number) {
    const stemHeight = 25;

    // Tête de note
    const head = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    head.setAttribute('cx', x.toString());
    head.setAttribute('cy', y.toString());
    head.setAttribute('rx', '4');
    head.setAttribute('ry', '3');
    
    // Remplissage selon la valeur
    if (value >= 4) {
      head.setAttribute('fill', '#000');
    } else {
      head.setAttribute('fill', 'none');
      head.setAttribute('stroke', '#000');
      head.setAttribute('stroke-width', '1.5');
    }
    svg.appendChild(head);

    // Hampe pour les notes plus courtes qu'une ronde
    if (value >= 2) {
      const stem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      stem.setAttribute('x1', (x + 4).toString());
      stem.setAttribute('y1', y.toString());
      stem.setAttribute('x2', (x + 4).toString());
      stem.setAttribute('y2', (y - stemHeight).toString());
      stem.setAttribute('stroke', '#000');
      stem.setAttribute('stroke-width', '1.5');
      svg.appendChild(stem);
    }

    // Crochets pour croches et doubles croches individuelles
    if (value === 8) {
      this.drawFlag(svg, x + 4, y - stemHeight, 1);
    } else if (value === 16) {
      this.drawFlag(svg, x + 4, y - stemHeight, 2);
    }
  }

  drawFlag(svg: SVGElement, x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const flagY = y + i * 3;
      path.setAttribute('d', `M ${x} ${flagY} Q ${x + 8} ${flagY + 3} ${x + 6} ${flagY + 8}`);
      path.setAttribute('stroke', '#000');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('fill', 'none');
      svg.appendChild(path);
    }
  }

  createText(text: string, x: number, y: number, size: string, weight: string = 'normal'): SVGTextElement {
    const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textEl.setAttribute('x', x.toString());
    textEl.setAttribute('y', y.toString());
    textEl.setAttribute('font-family', 'Arial, sans-serif');
    textEl.setAttribute('font-size', size);
    textEl.setAttribute('font-weight', weight);
    textEl.setAttribute('fill', '#000');
    textEl.textContent = text;
    return textEl;
  }

  onunload() {
    console.log('Déchargement du plugin Chord Grid');
  }
}