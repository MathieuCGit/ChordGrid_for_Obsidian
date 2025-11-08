import { Plugin, MarkdownPostProcessorContext } from 'obsidian';

// Interface definitions for our data structures
interface NoteValue {
  value: number;        // 1,2,4,8,16,32...
  dotted?: boolean;     // whether this specific note is dotted
}

interface Beat {
  notes: NoteValue[]; // List of rhythmic values (8, 4, 2, 1, etc.) with optional dotted flag
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
            chord: token.chord!,
            beats: token.beats!
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
   *
   * Changes: rhythm tokens now parse per-note dotted flags.
   * A token may be like:
   *  - "4" => quarter
   *  - "4." => dotted quarter
   *  - "3232161616" => sequence of small notes (32 32 16 16 16 ...)
   *  - "8.16" or "8. 16" => dotted eighth + sixteenth (we support both forms)
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
      
      // Check for chords - allow dots in rhythm tokens (e.g., 4. for dotted quarter)
      const chordMatch = remaining.match(/^([A-G][#b]?(?:maj|min|m|dim|aug|sus|[0-9])*)\[([0-9.\s]+)\]/);
      if (chordMatch) {
        const chord = chordMatch[1];
        const rhythm = chordMatch[2];
        
        // Parse rhythm into beats
        const beats: Beat[] = [];
        // split tokens on spaces; each token may itself contain multiple numeric elements
        const rhythmTokens = rhythm.split(/\s+/).filter(r => r.length > 0);
        
        for (const token of rhythmTokens) {
          // We will parse the token character by character, allowing for patterns like:
          // "8.", "16", "3232", "8.16", etc.
          // When we encounter a complete note (with optional dot), we close it and start a new beat
          const notes: NoteValue[] = [];
          let i = 0;
          
          while (i < token.length) {
            const ch = token[i];
            // Helper to check ahead safely
            const next = (offset = 1) => token[i + offset] || '';
            
            let noteValue: number | null = null;
            let dotted = false;
            let charsConsumed = 0;
            
            // parse 64 (sixty-fourth note - quadruple croche)
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
            // parse 16 (might be '16' with dot '16.')
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
            } else {
              // skip unexpected characters
              i += 1;
              continue;
            }
            
            if (noteValue !== null) {
              notes.push({ value: noteValue, dotted });
              i += charsConsumed;
            }
          } // end parse token chars

          if (notes.length > 0) {
            // Each rhythm token becomes a Beat. It's possible token included multiple notes.
            beats.push({ notes });
          }
        } // end rhythmTokens loop
        
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
    const beatWidth = beats.length > 0 ? width / beats.length : width;
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
      // Single note — pass the beat and the single note to drawSingleNote so it can render dotted per-note
      const nv = beat.notes[0];
      return this.drawSingleNote(svg, nv, x, staffLineY, width);
    } else {
      // Multiple notes - use proper rhythmic grouping with beams
      return this.drawNoteGroup(svg, beat.notes, x, staffLineY, width);
    }
  }

  /**
   * Draw a single note with slash and stem
   */
  drawSingleNote(svg: SVGElement, nv: NoteValue, x: number, staffLineY: number, width: number): number {
    const centerX = x + width / 2;

    // Draw slash (top-right to bottom-left)
    this.drawSlash(svg, centerX, staffLineY);

    // Draw stem for short notes - ATTACHED TO BOTTOM OF SLASH
    if (nv.value >= 2 && nv.value !== 1) {
      this.drawStem(svg, centerX, staffLineY, 25);
    }

    // Draw flags if needed (for single isolated short notes)
    if (nv.value === 8) {
      this.drawFlag(svg, centerX, staffLineY, 1);
    } else if (nv.value === 16) {
      this.drawFlag(svg, centerX, staffLineY, 2);
    } else if (nv.value === 32) {
      this.drawFlag(svg, centerX, staffLineY, 3);
    } else if (nv.value === 64) {
      this.drawFlag(svg, centerX, staffLineY, 4);
    }

    // If this note is dotted, draw a small dot to the right of the note head
    if (nv.dotted) {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      // position slightly right and vertically aligned to staffLineY
      dot.setAttribute('cx', (centerX + 8).toString());
      dot.setAttribute('cy', (staffLineY).toString());
      dot.setAttribute('r', '2');
      dot.setAttribute('fill', '#000');
      svg.appendChild(dot);
    }

    return centerX;
  }

  /**
   * Draw a group of notes with proper beaming, including nested beam segments for mixed durations
   * notesValues: array of NoteValue objects (e.g., [{value:8},{value:16}])
   *
   * Behavior:
   * - Compute beamCount per note (8->1,16->2,32->3).
   * - Draw stem for each note and store stem positions.
   * - For each beam level, draw continuous beams where notes have beamCount >= level.
   * - For notes that have extra beams (level > neighbor's level), draw a short stub extending left from that stem.
   * - Draw per-note dotted points next to heads.
   */
  drawNoteGroup(svg: SVGElement, notesValues: NoteValue[], x: number, staffLineY: number, width: number): number {
    const noteCount = notesValues.length;
    // Increase spacing only if there are 32nd or 64th notes to avoid overlaps
    const hasSmallNotes = notesValues.some(nv => nv.value >= 32);
    const noteSpacing = noteCount > 0 ? (width / noteCount) * (hasSmallNotes ? 1.2 : 1) : width;
    const stemHeight = 25;

    // Map notes to their drawing info
    const notes: { nv: NoteValue; beamCount: number; centerX: number; stemX?: number; stemTopY?: number; stemBottomY?: number }[] = [];

    for (let i = 0; i < noteCount; i++) {
      const nv = notesValues[i];
      const centerX = x + i * noteSpacing + noteSpacing / 2;
      const beamCount = nv.value === 8 ? 1 : nv.value === 16 ? 2 : nv.value === 32 ? 3 : nv.value === 64 ? 4 : 0;

      // Draw slash for each note
      this.drawSlash(svg, centerX, staffLineY);

      // Draw stem and store positions
      const stemInfo = this.drawStem(svg, centerX, staffLineY, stemHeight);
      notes.push({ nv, beamCount, centerX, stemX: stemInfo.x, stemTopY: stemInfo.topY, stemBottomY: stemInfo.bottomY });

      // Draw per-note dot near head if dotted
      if (nv.dotted) {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', (centerX + 8).toString());
        dot.setAttribute('cy', (staffLineY).toString());
        dot.setAttribute('r', '2');
        dot.setAttribute('fill', '#000');
        svg.appendChild(dot);
      }
    }

    // Determine maximum beam count in this group
    const maxBeamCount = notes.reduce((m, n) => Math.max(m, n.beamCount), 0);
    if (maxBeamCount === 0) return notes.length ? notes[0].centerX : null;

    // beamGap controls vertical gap between stacked beams
    const beamGap = 5;

    // baseStemBottom is the top-most (min) stem bottom Y so beams sit on top of stems
    // Filter out undefined values before computing min
    const validStemBottoms = notes.map(n => n.stemBottomY).filter(y => y !== undefined) as number[];
    const baseStemBottom = validStemBottoms.length > 0 ? Math.min(...validStemBottoms) : staffLineY + 30;

    // For each beam level, draw continuous beams and stubs for isolated higher beams
    for (let level = 1; level <= maxBeamCount; level++) {
      let segStartIndex: number | null = null;

      // First pass: draw continuous beam segments
      for (let i = 0; i < notes.length; i++) {
        const n = notes[i];
        const active = n.beamCount >= level;

        // look at neighbors to find continuous segments
        if (active && segStartIndex === null) {
          // start new segment
          segStartIndex = i;
        } else if ((!active || i === notes.length - 1) && segStartIndex !== null) {
          // closing segment: if we're at end but active, segEnd should be i; otherwise i-1
          const segEnd = (active && i === notes.length - 1) ? i : i - 1;

          // compute beam Y: start from baseStemBottom and go up for higher levels
          const beamY = baseStemBottom - (level - 1) * beamGap;

          // draw continuous beam from segStartIndex to segEnd
          const startX = notes[segStartIndex].stemX!;
          const endX = notes[segEnd].stemX!;
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

      // Second pass: draw stubs for isolated notes at higher beam levels
      // A stub should point in the direction of the beamed group (if any exists)
      // RULE: First note of group cannot have left stub, last note cannot have right stub
      // RHYTHMIC RULE: For dotted notes like 16.32, the stub should point towards the weaker beat
      const stubLength = Math.max(8, noteSpacing * 0.4);
      
      for (let i = 0; i < notes.length; i++) {
        const n = notes[i];
        const hasLevel = n.beamCount >= level;
        
        if (!hasLevel) continue;
        
        const leftBeamCount = (i - 1 >= 0) ? notes[i - 1].beamCount : 0;
        const rightBeamCount = (i + 1 < notes.length) ? notes[i + 1].beamCount : 0;
        
        const leftHasLevel = leftBeamCount >= level;
        const rightHasLevel = rightBeamCount >= level;
        
        // Skip if both neighbors have this level (continuous beam covers it)
        if (leftHasLevel && rightHasLevel) continue;
        
        // For isolated notes at this level
        if (!leftHasLevel && !rightHasLevel) {
          const beamY = baseStemBottom - (level - 1) * beamGap;
          const stemX = n.stemX!;
          
          // Check if left note is dotted and stronger (e.g., 16. in "16.32")
          // In this case, stub should point LEFT (towards the stronger note)
          const leftNote = i > 0 ? notes[i - 1] : null;
          const isAfterDottedStronger = leftNote && leftNote.nv.dotted && leftNote.nv.value < n.nv.value;
          
          // Check if right note will be dotted and current is stronger (e.g., 32 in "3216.")
          // In this case, stub should point RIGHT (towards the weaker note that will be dotted)
          const rightNote = i < notes.length - 1 ? notes[i + 1] : null;
          const isBeforeDottedWeaker = rightNote && rightNote.nv.dotted && n.nv.value < rightNote.nv.value;
          
          if (isAfterDottedStronger && i > 0) {
            // Stub to the LEFT (after a dotted stronger note like 16.)
            const stubX = stemX - stubLength;
            const beam = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            beam.setAttribute('x1', stemX.toString());
            beam.setAttribute('y1', beamY.toString());
            beam.setAttribute('x2', stubX.toString());
            beam.setAttribute('y2', beamY.toString());
            beam.setAttribute('stroke', '#000');
            beam.setAttribute('stroke-width', '2');
            svg.appendChild(beam);
          } else if (i < notes.length - 1) {
            // Stub to the RIGHT (default or before a dotted weaker note)
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
            // Last note: stub to the LEFT
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
        
        // If only left has level: stub to the LEFT (part of group on the left)
        // BUT only if not the first note of the group
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
        
        // If only right has level: stub to the RIGHT (part of group on the right)
        // BUT only if not the last note of the group
        if (!leftHasLevel && rightHasLevel && i < notes.length - 1) {
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
   * Draw flag(s) for a note (for isolated short notes)
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