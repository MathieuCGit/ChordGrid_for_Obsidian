import { Plugin, MarkdownPostProcessorContext } from 'obsidian';

// Interface definitions for our data structures
interface Beat {
  notes: number[]; // List of rhythmic values (8, 4, 2, 1, etc.)
}

interface ChordInMeasure {
  chord: string;
  beats: Beat[];
}

interface Measure {
  chords: ChordInMeasure[];
  isRepeatStart?: boolean;
  isRepeatEnd?: boolean;
  hasBarLine?: boolean;
  isLineBreak?: boolean;
}

interface ChordGrid {
  timeSignature: string;
  measures: Measure[];
}

export default class ChordGridPlugin extends Plugin {
  async onload() {
    console.log('Loading Chord Grid plugin');

    // Register markdown code block processor for 'chordgrid' blocks
    this.registerMarkdownCodeBlockProcessor('chordgrid', (source, el, ctx) => {
      this.renderChordGrid(source, el);
    });
  }

  /**
   * Parse chord grid text into structured data
   */
  parseChordGrid(source: string): ChordGrid {
    const lines = source.trim().split('\n');
    let timeSignature = '4/4';
    const measures: Measure[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Parse time signature (only from first line)
      if (measures.length === 0) {
        const timeSigMatch = trimmed.match(/^(\d+\/\d+)/);
        if (timeSigMatch) {
          timeSignature = timeSigMatch[1];
        }
      }

      // Parse chords into measures based on bar lines
      const tokens = this.tokenizeLine(trimmed);
      let currentMeasure: Measure = { chords: [], hasBarLine: false };
      let isRepeatStart = false;
      let isRepeatEnd = false;

      for (const token of tokens) {
        if (token.type === 'repeatStart') {
          isRepeatStart = true;
        } else if (token.type === 'repeatEnd') {
          isRepeatEnd = true;
        } else if (token.type === 'barLine') {
          // Bar line means we finalize the current measure and start a new one
          if (currentMeasure.chords.length > 0) {
            currentMeasure.hasBarLine = true;
            currentMeasure.isRepeatEnd = isRepeatEnd;
            measures.push(currentMeasure);
            // Start a new measure
            currentMeasure = { 
              chords: [], 
              hasBarLine: false,
              isRepeatStart: false
            };
            isRepeatEnd = false;
          }
        } else if (token.type === 'chord') {
          // Add chord to current measure
          currentMeasure.chords.push({
            chord: token.chord,
            beats: token.beats
          });
        }
      }

      // Don't forget the last measure
      if (currentMeasure.chords.length > 0) {
        currentMeasure.isRepeatEnd = isRepeatEnd;
        measures.push(currentMeasure);
      }

      // Apply repeat start to the FIRST measure if we have one
      if (measures.length > 0 && isRepeatStart) {
        measures[0].isRepeatStart = true;
      }

      // Add line break marker if there are more lines
      if (lines.length > 1 && line !== lines[lines.length - 1]) {
        measures.push({ chords: [], hasBarLine: false, isLineBreak: true });
      }
    }

    return { timeSignature, measures };
  }

  /**
   * Tokenize a line into meaningful tokens
   */
  tokenizeLine(line: string): Array<{type: string, chord?: string, beats?: Beat[]}> {
    const tokens: Array<{type: string, chord?: string, beats?: Beat[]}> = [];
    let remaining = line.replace(/^\d+\/\d+\s*/, ''); // Remove time signature
    
    while (remaining.length > 0) {
      remaining = remaining.trim();
      
      // Check for repeat markers
      if (remaining.startsWith('||:')) {
        tokens.push({ type: 'repeatStart' });
        remaining = remaining.substring(3);
        continue;
      } else if (remaining.startsWith('|:')) {
        tokens.push({ type: 'repeatStart' });
        remaining = remaining.substring(2);
        continue;
      } else if (remaining.startsWith(':||')) {
        tokens.push({ type: 'repeatEnd' });
        remaining = remaining.substring(3);
        continue;
      }
      
      // Check for bar lines
      if (remaining.startsWith('||')) {
        tokens.push({ type: 'barLine' });
        remaining = remaining.substring(2);
        continue;
      } else if (remaining.startsWith('|')) {
        tokens.push({ type: 'barLine' });
        remaining = remaining.substring(1);
        continue;
      }
      
      // Check for chords
      const chordMatch = remaining.match(/^([A-G][#b]?(?:maj|min|m|dim|aug|sus|[0-9])*)\[([0-9\s]+)\]/);
      if (chordMatch) {
        const chord = chordMatch[1];
        const rhythm = chordMatch[2];
        
        // Parse rhythm into beats
        const beats: Beat[] = [];
        const rhythmTokens = rhythm.split(/\s+/);
        
        for (const token of rhythmTokens) {
          const notes: number[] = [];
          
          // Parse notes correctly
          let i = 0;
          while (i < token.length) {
            const char = token[i];
            
            if (char === '1') {
              if (i + 1 < token.length && token[i + 1] === '6') {
                notes.push(16);
                i += 2;
              } else {
                notes.push(1);
                i += 1;
              }
            }
            else if (char === '2') {
              notes.push(2);
              i += 1;
            }
            else if (char === '4') {
              notes.push(4);
              i += 1;
            }
            else if (char === '8') {
              notes.push(8);
              i += 1;
            }
            else if (char === '3' && i + 1 < token.length && token[i + 1] === '2') {
              notes.push(32);
              i += 2;
            }
            else {
              i += 1;
            }
          }
          
          if (notes.length > 0) {
            beats.push({ notes });
          }
        }
        
        tokens.push({ type: 'chord', chord, beats });
        remaining = remaining.substring(chordMatch[0].length);
        continue;
      }
      
      // Skip unknown characters
      remaining = remaining.substring(1);
    }
    
    return tokens;
  }

  /**
   * Render chord grid from source text into container element
   */
  renderChordGrid(source: string, container: HTMLElement) {
    const grid = this.parseChordGrid(source);
    
    const svg = this.createSVG(grid);
    container.empty();
    container.appendChild(svg);
  }

  /**
   * Create SVG element for the entire chord grid
   */
  createSVG(grid: ChordGrid): SVGElement {
    const measuresPerLine = 4;
    const measureWidth = 200;
    const measureHeight = 120;
    
    // Calculate lines considering line breaks
    let currentLine = 0;
    let measuresInCurrentLine = 0;
    const measurePositions: {measure: Measure, lineIndex: number, posInLine: number}[] = [];
    
    grid.measures.forEach((measure, index) => {
      if (measure.isLineBreak) {
        currentLine++;
        measuresInCurrentLine = 0;
        return;
      }
      
      if (measuresInCurrentLine >= measuresPerLine) {
        currentLine++;
        measuresInCurrentLine = 0;
      }
      
      measurePositions.push({
        measure,
        lineIndex: currentLine,
        posInLine: measuresInCurrentLine
      });
      
      measuresInCurrentLine++;
    });

    const lines = currentLine + 1;
    const width = measuresPerLine * measureWidth + 60;
    const height = lines * (measureHeight + 20) + 20;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.background = '#ffffff';

    // Draw time signature at the beginning
    const timeSigText = this.createText(grid.timeSignature, 10, 40, '18px', 'bold');
    svg.appendChild(timeSigText);

    // Draw all measures
    measurePositions.forEach(({measure, lineIndex, posInLine}) => {
      const x = posInLine * measureWidth + 40;
      const y = lineIndex * (measureHeight + 20) + 20;

      this.drawMeasure(svg, measure, x, y, measureWidth, measureHeight);
    });

    return svg;
  }

  /**
   * Draw a single measure with chord, rhythm, and bar lines
   */
  drawMeasure(svg: SVGElement, measure: Measure, x: number, y: number, width: number, height: number) {
    // Draw left bar line
    if (measure.isRepeatStart) {
      this.drawRepeatBar(svg, x, y, height, true);
    } else {
      this.drawBar(svg, x, y, height);
    }

    // Draw single staff line
    const staffLineY = y + 80;
    const staffLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    staffLine.setAttribute('x1', (x + 10).toString());
    staffLine.setAttribute('y1', staffLineY.toString());
    staffLine.setAttribute('x2', (x + width - 10).toString());
    staffLine.setAttribute('y2', staffLineY.toString());
    staffLine.setAttribute('stroke', '#000');
    staffLine.setAttribute('stroke-width', '1');
    svg.appendChild(staffLine);

    // Draw all chords in the measure
    const chordWidth = width / measure.chords.length;
    measure.chords.forEach((chordData, chordIndex) => {
      const chordX = x + (chordIndex * chordWidth) + 10;
      
      // Draw rhythm notation for this chord
      const firstNoteX = this.drawRhythm(svg, chordData, chordX, staffLineY, chordWidth - 20);

      // Draw chord name above the first note
      if (firstNoteX !== null) {
        const chordText = this.createText(chordData.chord, firstNoteX, y + 40, '24px', 'bold');
        chordText.setAttribute('text-anchor', 'middle');
        svg.appendChild(chordText);
      }
    });

    // Draw right bar line ONLY if hasBarLine is true or it's a repeat end
    const rightBarX = x + width - 2;
    if (measure.hasBarLine || measure.isRepeatEnd) {
      if (measure.isRepeatEnd) {
        this.drawRepeatBar(svg, rightBarX, y, height, false);
      } else {
        this.drawBar(svg, rightBarX, y, height);
      }
    }
  }

  /**
   * Draw a simple bar line
   */
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

  /**
   * Draw repeat bar with dots
   */
  drawRepeatBar(svg: SVGElement, x: number, y: number, height: number, isStart: boolean) {
    const offset = isStart ? 0 : -6;
    const barX = x + offset;
    this.drawBar(svg, barX, y, height);
    this.drawBar(svg, barX + 4, y, height);

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

  /**
   * Draw rhythm pattern for a chord and return the x position of the first note
   */
  drawRhythm(svg: SVGElement, chordData: ChordInMeasure, x: number, staffLineY: number, width: number): number | null {
    const beats = chordData.beats;
    const beatWidth = width / beats.length;
    let currentX = x;
    let firstNoteX: number | null = null;

    beats.forEach((beat, beatIndex) => {
      const firstNoteInBeatX = this.drawBeat(svg, beat, currentX, staffLineY, beatWidth);
      
      if (beatIndex === 0 && firstNoteInBeatX !== null) {
        firstNoteX = firstNoteInBeatX;
      }
      
      currentX += beatWidth;
    });

    return firstNoteX;
  }

  /**
   * Draw a single beat - handles both single notes and beamed groups
   * Returns the x position of the first note in this beat
   */
  drawBeat(svg: SVGElement, beat: Beat, x: number, staffLineY: number, width: number): number | null {
    if (beat.notes.length === 1) {
      // Single note
      return this.drawSingleNote(svg, beat.notes[0], x, staffLineY, width);
    } else {
      // Multiple notes - use proper rhythmic grouping with beams
      return this.drawNoteGroup(svg, beat.notes, x, staffLineY, width);
    }
  }

  /**
   * Draw a single note with slash and stem
   */
  drawSingleNote(svg: SVGElement, value: number, x: number, staffLineY: number, width: number): number {
    const centerX = x + width / 2;

    // Draw slash (top-right to bottom-left)
    this.drawSlash(svg, centerX, staffLineY);

    // Draw stem for short notes - ATTACHED TO BOTTOM OF SLASH
    if (value >= 2 && value !== 1) {
      // We don't need the stem position here for beams, but draw it anyway
      this.drawStem(svg, centerX, staffLineY, 25);
    }

    // Draw flags if needed
    if (value === 8) {
      this.drawFlag(svg, centerX, staffLineY, 1);
    } else if (value === 16) {
      this.drawFlag(svg, centerX, staffLineY, 2);
    } else if (value === 32) {
      this.drawFlag(svg, centerX, staffLineY, 3);
    }

    return centerX;
  }

  /**
   * Draw a group of notes with proper beaming (sans crochets individuels)
   */
  drawNoteGroup(svg: SVGElement, notes: number[], x: number, staffLineY: number, width: number): number {
    const noteSpacing = width / notes.length;
    const stemHeight = 25;
    
    // Determine beam count based on shortest note value
    const minNoteValue = Math.min(...notes);
    const beamCount = minNoteValue === 8 ? 1 : minNoteValue === 16 ? 2 : minNoteValue === 32 ? 3 : 0;

    let firstNoteX: number = 0;
    const stemPositions: number[] = [];
    const stemBottomYs: number[] = [];

    // Draw notes and collect stem positions
    notes.forEach((note, index) => {
      const noteX = x + index * noteSpacing + noteSpacing / 2;
      
      if (index === 0) {
        firstNoteX = noteX;
      }
      
      // Draw slash
      this.drawSlash(svg, noteX, staffLineY);
      
      // Draw stem and store its X position AND bottom Y for beam alignment
      const stemInfo = this.drawStem(svg, noteX, staffLineY, stemHeight);
      stemPositions.push(stemInfo.x);
      stemBottomYs.push(stemInfo.bottomY);
    });

    // Draw connecting beams ONLY for beamed notes (pas de crochets individuels)
    if (beamCount > 0 && stemPositions.length > 1) {
      // Use the exact stem positions for ligatures
      const startX = stemPositions[0];
      const endX = stemPositions[stemPositions.length - 1];

      // Attach beams at the BOTTOM of the stems (for downward stems), then stack upwards
      // Compute a suitable base Y using the shallowest bottom among stems (to avoid drawing below any stem)
      const beamBaseY = Math.min(...stemBottomYs);

      for (let i = 0; i < beamCount; i++) {
        // Position Y des ligatures : COMMENCER À LA BASE DE LA HAMPE et remonter pour chaque ligature
        const beamY = beamBaseY - i * 5; // stack beams upwards (towards the note)
        const beam = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        beam.setAttribute('x1', startX.toString());
        beam.setAttribute('y1', beamY.toString());
        beam.setAttribute('x2', endX.toString());
        beam.setAttribute('y2', beamY.toString());
        beam.setAttribute('stroke', '#000');
        beam.setAttribute('stroke-width', '2');
        svg.appendChild(beam);
      }
    }

    return firstNoteX;
  }

  /**
   * Draw a slash at 45° angle (top-RIGHT to bottom-LEFT - proper slash direction)
   * with stem attached to the bottom
   */
  drawSlash(svg: SVGElement, x: number, y: number) {
    const slashLength = 10;
    // 45° slash from top-RIGHT to bottom-LEFT (proper slash direction)
    const slash = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    slash.setAttribute('x1', (x + slashLength/2).toString());
    slash.setAttribute('y1', (y - slashLength/2).toString());
    slash.setAttribute('x2', (x - slashLength/2).toString());
    slash.setAttribute('y2', (y + slashLength/2).toString());
    slash.setAttribute('stroke', '#000');
    slash.setAttribute('stroke-width', '3');
    svg.appendChild(slash);
  }

  /**
   * Draw a stem for a note - ATTACHED TO BOTTOM OF SLASH
   * Returns the X position of the stem and the bottom Y for proper beam alignment
   */
  drawStem(svg: SVGElement, x: number, y: number, height: number): {x: number, topY: number, bottomY: number} {
    // Calculate the bottom point of the slash (where stem should attach)
    const slashLength = 10;
    const stemStartX = x - slashLength/2 + 2; // Bottom-left of slash + offset
    const stemStartY = y + slashLength/2;     // Bottom of slash
    
    const stem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    stem.setAttribute('x1', stemStartX.toString());
    stem.setAttribute('y1', stemStartY.toString());
    stem.setAttribute('x2', stemStartX.toString());
    stem.setAttribute('y2', (stemStartY + height).toString());
    stem.setAttribute('stroke', '#000');
    stem.setAttribute('stroke-width', '2');
    svg.appendChild(stem);

    return { x: stemStartX, topY: stemStartY, bottomY: stemStartY + height };
  }

  /**
   * Draw flag(s) for a note
   */
  drawFlag(svg: SVGElement, x: number, staffLineY: number, count: number) {
    const slashLength = 10;
    const stemStartX = x - slashLength/2 + 2;
    const stemBottomY = staffLineY + slashLength/2 + 25;

    for (let i = 0; i < count; i++) {
      const flag = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const flagY = stemBottomY - i * 10;
      
      flag.setAttribute('d', `M ${stemStartX} ${flagY} Q ${stemStartX - 10} ${flagY - 5} ${stemStartX - 8} ${flagY - 12}`);
      flag.setAttribute('stroke', '#000');
      flag.setAttribute('stroke-width', '2');
      flag.setAttribute('fill', 'none');
      svg.appendChild(flag);
    }
  }

  /**
   * Utility function to create text elements
   */
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
    console.log('Unloading Chord Grid plugin');
  }
}
