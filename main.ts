import { Plugin, MarkdownPostProcessorContext } from 'obsidian';

// Interface definitions for our data structures
interface NoteValue {
  value: number;        // 1,2,4,8,16,32...
  dotted?: boolean;     // whether this specific note is dotted
  tied?: boolean;       // whether this note is tied to the previous one
}

interface Beat {
  notes: NoteValue[]; // List of rhythmic values (8, 4, 2, 1, etc.) with optional dotted flag
}

interface ChordInMeasure {
  chord: string;
  beats: Beat[];
  rawRhythm: string; // Store original rhythm string for tie detection
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

interface TiePosition {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  type: 'internal' | 'cross-measure';
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
              isRepeatStart: isRepeatStart
            };
            isRepeatEnd = false;
            isRepeatStart = false;
          }
        } else if (token.type === 'chord') {
          // Add chord to current measure
          currentMeasure.chords.push({
            chord: token.chord!,
            beats: token.beats!,
            rawRhythm: token.rhythm!
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
   * Tokenize a line into meaningful tokens with proper tie handling
   */
  tokenizeLine(line: string): Array<{type: string, chord?: string, beats?: Beat[], rhythm?: string}> {
    const tokens: Array<{type: string, chord?: string, beats?: Beat[], rhythm?: string}> = [];
    let remaining = line.replace(/^\d+\/\d+\s*/, ''); // Remove time signature
    
    while (remaining.length > 0) {
      remaining = remaining.trim();
      
      // Check for repeat markers
      if (remaining.startsWith(':||')) {
        tokens.push({ type: 'repeatEnd' });
        remaining = remaining.substring(3);
        continue;
      } else if (remaining.startsWith('||:')) {
        tokens.push({ type: 'repeatStart' });
        remaining = remaining.substring(3);
        continue;
      } else if (remaining.startsWith('|:')) {
        tokens.push({ type: 'repeatStart' });
        remaining = remaining.substring(2);
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
      
      // CORRECTION : Accepter les rythmes sans accord [4 4 4 4]
      // Pattern 1: Accord avec rythme - C[4 4 4 4]
      const chordWithRhythmMatch = remaining.match(/^([A-G][#b]?(?:maj|min|m|dim|aug|sus|[0-9])*)\[([0-9._\s]+)\]/);
      if (chordWithRhythmMatch) {
        const chord = chordWithRhythmMatch[1];
        const rhythm = chordWithRhythmMatch[2];
        
        // Parse rhythm into beats with tie detection (méthode existante)
        const beats = this.parseRhythm(rhythm);
        tokens.push({ type: 'chord', chord, beats, rhythm });
        remaining = remaining.substring(chordWithRhythmMatch[0].length);
        continue;
      }
      
      // CORRECTION : Pattern 2: Rythme seul - [4 4 4 4]
      const rhythmOnlyMatch = remaining.match(/^\[([0-9._\s]+)\]/);
      if (rhythmOnlyMatch) {
        const rhythm = rhythmOnlyMatch[1];
        // UTILISER LA MÊME MÉTHODE parseRhythm pour la cohérence
        const beats = this.parseRhythm(rhythm);
        tokens.push({ type: 'chord', chord: '', beats, rhythm });
        remaining = remaining.substring(rhythmOnlyMatch[0].length);
        continue;
      }
      
      // Skip unknown characters
      remaining = remaining.substring(1);
    }
    
    return tokens;
  }

  /**
   * Parse rhythm string into beats - VERSION ORIGINALE (avec ligatures)
   */
  parseRhythm(rhythm: string): Beat[] {
    const beats: Beat[] = [];
    const rhythmTokens = rhythm.split(/\s+/).filter(r => r.length > 0);
    
    for (const token of rhythmTokens) {
      const notes: NoteValue[] = [];
      let i = 0;
      let isTied = false;
      
      while (i < token.length) {
        const ch = token[i];
        
        // Check for tie marker at start of token
        if (ch === '_' && notes.length === 0) {
          isTied = true;
          i++;
          continue;
        }
        
        const next = (offset = 1) => token[i + offset] || '';

        let noteValue: number | null = null;
        let dotted = false;
        let charsConsumed = 0;
        
        // parse 64
        if (ch === '6' && next(1) === '4') {
          noteValue = 64;
          charsConsumed = 2;
          if (token[i+2] === '.') {
            dotted = true;
            charsConsumed = 3;
          }
        }
        // parse 32
        else if (ch === '3' && next(1) === '2') {
          noteValue = 32;
          charsConsumed = 2;
          if (token[i+2] === '.') {
            dotted = true;
            charsConsumed = 3;
          }
        }
        // parse 16
        else if (ch === '1' && next(1) === '6') {
          noteValue = 16;
          charsConsumed = 2;
          if (token[i+2] === '.') {
            dotted = true;
            charsConsumed = 3;
          }
        }
        // parse single-digit values: 8,4,2,1
        else if (ch === '8' || ch === '4' || ch === '2' || ch === '1') {
          noteValue = parseInt(ch, 10);
          charsConsumed = 1;
          if (token[i+1] === '.') {
            dotted = true;
            charsConsumed = 2;
          }
        } else if (ch === '_') {
          // Internal tie marker - mark the previous note as tied
          if (notes.length > 0) {
            notes[notes.length - 1].tied = true;
          }
          i++;
          continue;
        } else {
          // skip unexpected characters
          i += 1;
          continue;
        }
        
        if (noteValue !== null) {
          notes.push({ value: noteValue, dotted, tied: isTied });
          isTied = false;
          i += charsConsumed;
        }
      }

      if (notes.length > 0) {
        beats.push({ notes });
      }
    }
    
    return beats;
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
    const measurePositions: {measure: Measure, lineIndex: number, posInLine: number, globalIndex: number}[] = [];
    let globalIndex = 0;
    
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
        posInLine: measuresInCurrentLine,
        globalIndex: globalIndex++
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

    // Store note positions for tie detection
    const notePositions: {x: number, y: number, measureIndex: number, chordIndex: number, beatIndex: number, noteIndex: number, tied: boolean}[] = [];

    // Draw all measures and collect note positions
    measurePositions.forEach(({measure, lineIndex, posInLine, globalIndex}) => {
      const x = posInLine * measureWidth + 40;
      const y = lineIndex * (measureHeight + 20) + 20;

      this.drawMeasure(svg, measure, x, y, measureWidth, measureHeight, globalIndex, notePositions, grid);
    });

    // Detect and draw ties based on note positions
    this.detectAndDrawTies(svg, notePositions, grid);

    return svg;
  }

  /**
   * Detect and draw ties based on note positions and grid structure
   */
  detectAndDrawTies(svg: SVGElement, notePositions: {x: number, y: number, measureIndex: number, chordIndex: number, beatIndex: number, noteIndex: number, tied: boolean}[], grid: ChordGrid) {
    const ties: TiePosition[] = [];

    // Detect internal ties (within same measure)
    for (let i = 0; i < notePositions.length - 1; i++) {
      const currentNote = notePositions[i];
      const nextNote = notePositions[i + 1];
      
      if (currentNote.tied && 
          currentNote.measureIndex === nextNote.measureIndex &&
          currentNote.chordIndex === nextNote.chordIndex) {
        // Internal tie within same chord
        ties.push({
          startX: currentNote.x,
          startY: currentNote.y - 8,
          endX: nextNote.x,
          endY: nextNote.y - 8,
          type: 'internal'
        });
      }
    }

    // Detect cross-measure ties
    for (let i = 0; i < notePositions.length - 1; i++) {
      const currentNote = notePositions[i];
      const nextNote = notePositions[i + 1];
      
      if (currentNote.tied && 
          currentNote.measureIndex !== nextNote.measureIndex &&
          nextNote.measureIndex === currentNote.measureIndex + 1) {
        // Cross-measure tie
        ties.push({
          startX: currentNote.x,
          startY: currentNote.y - 8,
          endX: nextNote.x,
          endY: nextNote.y - 8,
          type: 'cross-measure'
        });
      }
    }

    // Draw all detected ties
    ties.forEach(tie => {
      this.drawTie(svg, tie);
    });
  }

  /**
   * Draw a tie
   */
  drawTie(svg: SVGElement, tie: TiePosition) {
    const tieElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const controlY = tie.startY - 5;
    
    tieElement.setAttribute('d', `M ${tie.startX} ${tie.startY} Q ${(tie.startX + tie.endX) / 2} ${controlY} ${tie.endX} ${tie.endY}`);
    tieElement.setAttribute('stroke', '#000');
    tieElement.setAttribute('stroke-width', '1.5');
    tieElement.setAttribute('fill', 'none');
    svg.appendChild(tieElement);
  }

  /**
   * Draw a single measure with chord, rhythm, and bar lines
   */
  drawMeasure(svg: SVGElement, measure: Measure, x: number, y: number, width: number, height: number, measureIndex: number, notePositions: {x: number, y: number, measureIndex: number, chordIndex: number, beatIndex: number, noteIndex: number, tied: boolean}[], grid: ChordGrid) {
    const leftBarX = x;
    const rightBarX = x + width - 2;

    // BARRE GAUCHE
    if (measureIndex === 0) {
      this.drawBar(svg, leftBarX, y, height);
    } else if (measure.isRepeatStart) {
      this.drawBar(svg, leftBarX, y, height);
      this.drawBarWithRepeat(svg, leftBarX, y, height, true);
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
    const chordWidth = width / Math.max(measure.chords.length, 1);
    
    measure.chords.forEach((chordData, chordIndex) => {
      const chordX = x + (chordIndex * chordWidth) + 10;
      
      const firstNoteX = this.drawRhythm(svg, chordData, chordX, staffLineY, chordWidth - 20, measureIndex, chordIndex, notePositions);

      // CORRECTION : Ne dessiner le nom d'accord que s'il n'est pas vide
      if (firstNoteX !== null && chordData.chord && chordData.chord.trim() !== '') {
        const chordText = this.createText(chordData.chord, firstNoteX, y + 40, '24px', 'bold');
        chordText.setAttribute('text-anchor', 'middle');
        svg.appendChild(chordText);
      }
    });

    // BARRE DROITE
    if (measure.isRepeatEnd) {
      this.drawBarWithRepeat(svg, rightBarX, y, height, false);
      this.drawBar(svg, rightBarX, y, height);
      this.drawBar(svg, rightBarX + 6, y, height);
    } else if (measure.hasBarLine || measureIndex === grid.measures.length - 1) {
      this.drawBar(svg, rightBarX, y, height);
    }
  }

  /**
   * Draw a bar with repeat symbols - UNE barre supplémentaire avec points
   */
  drawBarWithRepeat(svg: SVGElement, x: number, y: number, height: number, isStart: boolean) {
    // Points seulement (la barre est dessinée séparément)
    const dotOffset = isStart ? 12 : -12;
    const dot1Y = y + height * 0.35;
    const dot2Y = y + height * 0.65;

    [dot1Y, dot2Y].forEach(dotY => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', (x + dotOffset).toString());
      circle.setAttribute('cy', dotY.toString());
      circle.setAttribute('r', '2');
      circle.setAttribute('fill', '#000');
      svg.appendChild(circle);
    });
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
    line.setAttribute('stroke-width', '1.5');
    svg.appendChild(line);
  }

  /**
   * Draw rhythm pattern for a chord and return the x position of the first note
   */
  drawRhythm(svg: SVGElement, chordData: ChordInMeasure, x: number, staffLineY: number, width: number, measureIndex: number, chordIndex: number, notePositions: {x: number, y: number, measureIndex: number, chordIndex: number, beatIndex: number, noteIndex: number, tied: boolean}[]): number | null {
    const beats = chordData.beats;
    const beatWidth = beats.length > 0 ? width / beats.length : width;
    let currentX = x;
    let firstNoteX: number | null = null;

    beats.forEach((beat, beatIndex) => {
      const firstNoteInBeatX = this.drawBeat(svg, beat, currentX, staffLineY, beatWidth, measureIndex, chordIndex, beatIndex, notePositions);
      
      if (beatIndex === 0 && firstNoteInBeatX !== null) {
        firstNoteX = firstNoteInBeatX;
      }
      
      currentX += beatWidth;
    });

    return firstNoteX;
  }

  /**
   * Draw a single beat - handles both single notes and beamed groups
   */
  drawBeat(svg: SVGElement, beat: Beat, x: number, staffLineY: number, width: number, measureIndex: number, chordIndex: number, beatIndex: number, notePositions: {x: number, y: number, measureIndex: number, chordIndex: number, beatIndex: number, noteIndex: number, tied: boolean}[]): number | null {
    if (beat.notes.length === 1) {
      const nv = beat.notes[0];
      const noteX = this.drawSingleNote(svg, nv, x + 10, staffLineY, width);
      
      notePositions.push({
        x: noteX,
        y: staffLineY,
        measureIndex,
        chordIndex,
        beatIndex,
        noteIndex: 0,
        tied: nv.tied || false
      });
      
      return noteX;
    } else {
      const firstNoteX = this.drawNoteGroup(svg, beat.notes, x + 10, staffLineY, width);
      
      beat.notes.forEach((nv, noteIndex) => {
        const noteX = x + 10 + (noteIndex * (width / beat.notes.length)) + (width / beat.notes.length) / 2;
        notePositions.push({
          x: noteX,
          y: staffLineY,
          measureIndex,
          chordIndex,
          beatIndex,
          noteIndex,
          tied: nv.tied || false
        });
      });
      
      return firstNoteX;
    }
  }

  /**
   * Draw a single note with proper note heads for different durations
   */
  drawSingleNote(svg: SVGElement, nv: NoteValue, x: number, staffLineY: number, width: number): number {
    const centerX = x;

    if (nv.value === 1) {
      this.drawDiamondNoteHead(svg, centerX, staffLineY, true);
    } else if (nv.value === 2) {
      this.drawDiamondNoteHead(svg, centerX, staffLineY, true);
      this.drawStem(svg, centerX, staffLineY, 25);
    } else {
      this.drawSlash(svg, centerX, staffLineY);
      this.drawStem(svg, centerX, staffLineY, 25);

      if (nv.value === 8) {
        this.drawFlag(svg, centerX, staffLineY, 1);
      } else if (nv.value === 16) {
        this.drawFlag(svg, centerX, staffLineY, 2);
      } else if (nv.value === 32) {
        this.drawFlag(svg, centerX, staffLineY, 3);
      } else if (nv.value === 64) {
        this.drawFlag(svg, centerX, staffLineY, 4);
      }
    }

    if (nv.dotted) {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', (centerX + 8).toString());
      dot.setAttribute('cy', (staffLineY).toString());
      dot.setAttribute('r', '2');
      dot.setAttribute('fill', '#000');
      svg.appendChild(dot);
    }

    return centerX;
  }

  /**
   * Draw a diamond note head for whole and half notes
   */
  drawDiamondNoteHead(svg: SVGElement, x: number, y: number, hollow: boolean) {
    const diamondSize = 6;
    
    const diamond = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
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
   * Draw a group of notes with proper beaming (avec ligatures)
   */
  drawNoteGroup(svg: SVGElement, notesValues: NoteValue[], x: number, staffLineY: number, width: number): number | null {
    const noteCount = notesValues.length;
    if (noteCount === 0) return null;
    
    const hasSmallNotes = notesValues.some(nv => nv.value >= 32);
    const noteSpacing = noteCount > 0 ? (width / noteCount) * (hasSmallNotes ? 1.2 : 1) : width;
    const stemHeight = 25;

    const notes: { nv: NoteValue; beamCount: number; centerX: number; stemX?: number; stemTopY?: number; stemBottomY?: number }[] = [];

    for (let i = 0; i < noteCount; i++) {
      const nv = notesValues[i];
      const centerX = x + i * noteSpacing;
      
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
        const beamCount = nv.value === 8 ? 1 : nv.value === 16 ? 2 : nv.value === 32 ? 3 : nv.value === 64 ? 4 : 0;
        notes.push({ nv, beamCount, centerX, stemX: stemInfo.x, stemTopY: stemInfo.topY, stemBottomY: stemInfo.bottomY });
      }

      if (nv.dotted) {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', (centerX + 8).toString());
        dot.setAttribute('cy', (staffLineY).toString());
        dot.setAttribute('r', '2');
        dot.setAttribute('fill', '#000');
        svg.appendChild(dot);
      }
    }

    // Beaming logic avec gestion des ligatures
    const beamedNotes = notes.filter(n => n.beamCount > 0);
    if (beamedNotes.length === 0) return notes.length ? notes[0].centerX : null;

    const maxBeamCount = beamedNotes.reduce((m, n) => Math.max(m, n.beamCount), 0);
    if (maxBeamCount === 0) return notes.length ? notes[0].centerX : null;

    const beamGap = 5;
    const validStemBottoms = beamedNotes.map(n => n.stemBottomY).filter(y => y !== undefined) as number[];
    const baseStemBottom = validStemBottoms.length > 0 ? Math.min(...validStemBottoms) : staffLineY + 30;

    for (let level = 1; level <= maxBeamCount; level++) {
      let segStartIndex: number | null = null;

      for (let i = 0; i < beamedNotes.length; i++) {
        const n = beamedNotes[i];
        const active = n.beamCount >= level;

        if (active && segStartIndex === null) {
          segStartIndex = i;
        } else if ((!active || i === beamedNotes.length - 1) && segStartIndex !== null) {
          const segEnd = (active && i === beamedNotes.length - 1) ? i : i - 1;
          const beamY = baseStemBottom - (level - 1) * beamGap;

          const startX = beamedNotes[segStartIndex].stemX!;
          const endX = beamedNotes[segEnd].stemX!;
          const beam = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          beam.setAttribute('x1', startX.toString());
          beam.setAttribute('y1', beamY.toString());
          beam.setAttribute('x2', endX.toString());
          beam.setAttribute('y2', beamY.toString());
          beam.setAttribute('stroke', '#000');
          beam.setAttribute('stroke-width', '2');
          svg.appendChild(beam);

          segStartIndex = null;
        }
      }

      const stubLength = Math.max(8, noteSpacing * 0.4);
      
      for (let i = 0; i < beamedNotes.length; i++) {
        const n = beamedNotes[i];
        const hasLevel = n.beamCount >= level;
        
        if (!hasLevel) continue;
        
        const leftBeamCount = (i - 1 >= 0) ? beamedNotes[i - 1].beamCount : 0;
        const rightBeamCount = (i + 1 < beamedNotes.length) ? beamedNotes[i + 1].beamCount : 0;
        
        const leftHasLevel = leftBeamCount >= level;
        const rightHasLevel = rightBeamCount >= level;
        
        if (leftHasLevel && rightHasLevel) continue;
        
        if (!leftHasLevel && !rightHasLevel) {
          const beamY = baseStemBottom - (level - 1) * beamGap;
          const stemX = n.stemX!;
          
          const leftNote = i > 0 ? beamedNotes[i - 1] : null;
          const isAfterDottedStronger = leftNote && leftNote.nv.dotted && leftNote.nv.value < n.nv.value;
          
          const rightNote = i < beamedNotes.length - 1 ? beamedNotes[i + 1] : null;
          const isBeforeDottedWeaker = rightNote && rightNote.nv.dotted && n.nv.value < rightNote.nv.value;
          
          if (isAfterDottedStronger && i > 0) {
            const stubX = stemX - stubLength;
            const beam = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            beam.setAttribute('x1', stemX.toString());
            beam.setAttribute('y1', beamY.toString());
            beam.setAttribute('x2', stubX.toString());
            beam.setAttribute('y2', beamY.toString());
            beam.setAttribute('stroke', '#000');
            beam.setAttribute('stroke-width', '2');
            svg.appendChild(beam);
          } else if (i < beamedNotes.length - 1) {
            const stubX = stemX + stubLength;
            const beam = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            beam.setAttribute('x1', stemX.toString());
            beam.setAttribute('y1', beamY.toString());
            beam.setAttribute('x2', stubX.toString());
            beam.setAttribute('y2', beamY.toString());
            beam.setAttribute('stroke', '#000');
            beam.setAttribute('stroke-width', '2');
            svg.appendChild(beam);
          } else if (i > 0) {
            const stubX = stemX - stubLength;
            const beam = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            beam.setAttribute('x1', stemX.toString());
            beam.setAttribute('y1', beamY.toString());
            beam.setAttribute('x2', stubX.toString());
            beam.setAttribute('y2', beamY.toString());
            beam.setAttribute('stroke', '#000');
            beam.setAttribute('stroke-width', '2');
            svg.appendChild(beam);
          }
          continue;
        }
        
        const beamY = baseStemBottom - (level - 1) * beamGap;
        const stemX = n.stemX!;
        
        if (leftHasLevel && !rightHasLevel && i > 0) {
          const stubX = stemX - stubLength;
          const beam = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          beam.setAttribute('x1', stemX.toString());
          beam.setAttribute('y1', beamY.toString());
          beam.setAttribute('x2', stubX.toString());
          beam.setAttribute('y2', beamY.toString());
          beam.setAttribute('stroke', '#000');
          beam.setAttribute('stroke-width', '2');
          svg.appendChild(beam);
        }
        
        if (!leftHasLevel && rightHasLevel && i < beamedNotes.length - 1) {
          const stubX = stemX + stubLength;
          const beam = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          beam.setAttribute('x1', stemX.toString());
          beam.setAttribute('y1', beamY.toString());
          beam.setAttribute('x2', stubX.toString());
          beam.setAttribute('y2', beamY.toString());
          beam.setAttribute('stroke', '#000');
          beam.setAttribute('stroke-width', '2');
          svg.appendChild(beam);
        }
      }
    }

    return notes.length ? notes[0].centerX : null;
  }

  /**
   * Draw a slash at 45° angle
   */
  drawSlash(svg: SVGElement, x: number, y: number) {
    const slashLength = 10;
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
   * Draw a stem for a note
   */
  drawStem(svg: SVGElement, x: number, y: number, height: number): {x: number, topY: number, bottomY: number} {
    const slashLength = 10;
    const stemStartX = x - slashLength/2 + 2;
    const stemStartY = y + slashLength/2;
    
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