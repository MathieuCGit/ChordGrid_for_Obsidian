/**
 * @file ChordGridParser.ts
 * @description Parser for textual chord grid notation.
 *
 * This parser transforms a chord grid in textual notation into a ChordGrid
 * object structure containing measures, beats, and notes.
 *
 * Responsibilities:
 * - Reading time signature (placed at the beginning of first line, e.g., "4/4")
 * - Parsing measures and rhythmic groups into Measure/Beat/Note structures
 * - Marking line breaks and grouping measures into render lines
 * - Managing beams between notes according to spaces and beats
 * - Managing ties between notes, including cross-measure ties
 * - Validating total duration of each measure against time signature
 *
 * Supported syntax:
 * - Time signature: `4/4`, `3/4`, `6/8`, etc.
 * - Barlines: `|` (single), `||` (double), `||:` (repeat start), `:||` (repeat end)
 * - Chords: standard notation (Am, C, Gmaj7, F#m, Bb7, etc.)
 * - Notes: 1 (whole), 2 (half), 4 (quarter), 8 (eighth), 16 (sixteenth), 32, 64
 * - Dotted notes: add a dot after the number (e.g., `4.`, `8.`)
 * - Rests: prefix `-` before the value (e.g., `-4` for quarter rest)
 * - Ties: underscore `_` to tie notes (e.g., `4_88_` or `[_8]`)
 * - Beams: notes grouped without space are beamed (e.g., `88` = 2 eighths beamed)
 * - Forced beam with tie: `[_]` forces beam to continue despite tie
 *   (e.g., `888[_]88` = tie AND beam, vs `888 _88` = tie WITHOUT beam)
 *
 * @example
 * ```typescript
 * const parser = new ChordGridParser();
 * const result = parser.parse("4/4 ||: Am[88 4 4 88] | C[2 4 4] :||");
 * // result.grid contains the parsed structure
 * // result.errors contains any validation errors
 * ```
 *
 * @see {@link BeamAndTieAnalyzer} for beam and tie analysis
 * @see {@link Measure} for measure structure
 * @see {@link Beat} for beat structure
 * @see {@link Note} for note structure
 */
export class ChordGridParser {

  /**
   * Default ratio table for common tuplets.
   * 
   * Musical convention (compatible with MuseScore):
   * N:M means "N units of baseLen in the time of M units of same value"
   * 
   * baseLen = smallest rhythmic value in the tuplet (reference unit)
   * 
   * Examples:
   * - {8 8 8}3:2 → 3 eighths in the time of 2 eighths (baseLen = 1/8)
   * - {816-16 1616 8 8}5:4 → content equivalent to 5 eighths in the time of 4 eighths (baseLen = 1/16)
   * - {16 16 16}3:2 → 3 sixteenths in the time of 2 sixteenths (baseLen = 1/16)
   * 
   * Applied ratio: actual_duration = cumulative_duration × (M/N)
   * where cumulative_duration is expressed in baseLen units
   * 
   * This table can be extended according to musical needs.
   * To enforce a specific ratio, use syntax {...}N:M
   */
  private static readonly DEFAULT_TUPLET_RATIOS: Record<number, { numerator: number, denominator: number }> = {
    // Tuplets in simple time (most common)
    3: { numerator: 3, denominator: 2 },   // Triplet: 3 notes in the time of 2
    5: { numerator: 5, denominator: 4 },   // Quintuplet: 5 notes in the time of 4
    6: { numerator: 6, denominator: 4 },   // Sextuplet: 6 notes in the time of 4
    7: { numerator: 7, denominator: 4 },   // Septuplet: 7 notes in the time of 4
    9: { numerator: 9, denominator: 8 },   // Nonuplet: 9 notes in the time of 8
    10: { numerator: 10, denominator: 8 }, // Decuplet: 10 notes in the time of 8
    11: { numerator: 11, denominator: 8 }, // 11-tuplet: 11 notes in the time of 8
    12: { numerator: 12, denominator: 8 }, // 12-tuplet: 12 notes in the time of 8
    13: { numerator: 13, denominator: 8 }, // 13-tuplet: 13 notes in the time of 8
    15: { numerator: 15, denominator: 8 }, // 15-tuplet: 15 notes in the time of 8
    
    // Tuplets in compound time (less common but necessary)
    2: { numerator: 2, denominator: 3 },   // Duplet: 2 notes in the time of 3
    4: { numerator: 4, denominator: 3 },   // Quadruplet: 4 notes in the time of 3
    8: { numerator: 8, denominator: 6 },   // Octuplet: 8 notes in the time of 6
  };

  /**
   * Get the default tuplet ratio for a given count.
   * Returns the ratio or undefined if no default exists.
   */
  private getTupletRatio(tupletCount: number): { numerator: number, denominator: number } | undefined {
    return (this.constructor as typeof ChordGridParser).DEFAULT_TUPLET_RATIOS[tupletCount];
  }

  /**
   * Parse volta numbers from different syntaxes.
   * Supports:
   * - Single: "1" -> [1]
   * - Range: "1-3" -> [1, 2, 3]
   * - List: "1,2,3" -> [1, 2, 3]
   * 
   * @param voltaText - Text after the dot (e.g., "1", "1-3", "1,2,3")
   * @returns Array of volta numbers
   */
  private parseVoltaNumbers(voltaText: string): number[] {
    // Check for range syntax (1-3)
    const rangeMatch = /^(\d+)-(\d+)$/.exec(voltaText);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      const numbers: number[] = [];
      for (let i = start; i <= end; i++) {
        numbers.push(i);
      }
      return numbers;
    }
    
    // Check for list syntax (1,2,3)
    if (voltaText.includes(',')) {
      return voltaText.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    }
    
    // Single number
    const num = parseInt(voltaText, 10);
    return isNaN(num) ? [] : [num];
  }

  /**
   * Parse a chord grid in textual notation.
   * 
   * @param input - String containing the chord grid in textual notation
   * @returns ParseResult object containing:
   *   - grid: the parsed ChordGrid structure
   *   - errors: array of validation errors (malformed measures)
   *   - measures: array of all measures
   */
  parse(input: string): ParseResult {
    const lines = input.trim().split('\n');
    
    // Detect directives on initial lines (can span multiple lines or be on same line)
    let stemsDirection: 'up' | 'down' = 'up';
    let displayRepeatSymbol = false;
    let pickMode: boolean | undefined = undefined;
    let fingerMode: 'en' | 'fr' | undefined = undefined;
    let measuresPerLine: number | undefined = undefined;
    let measureNumbering: { startNumber: number, interval: number, enabled: boolean } | undefined = undefined;
    let transposeSettings: { semitones: number, accidental?: '#' | 'b' } | undefined = undefined;
    let countingMode: boolean | undefined = undefined;
    let groupingModeDirective: GroupingMode | undefined = undefined;
    let zoomPercent: number | undefined = undefined;
    
    // Scan initial lines for directives (stop when we find time signature or barline)
    let lineIndex = 0;
    
    while (lineIndex < lines.length) {
      let line = lines[lineIndex].trim();
      
      // Skip empty lines
      if (line === '') {
        lineIndex++;
        continue;
      }
      
      // Process all directives on this line (may be multiple space-separated)
      let hasAnyDirective = false;
      
      // Check for stems keywords
      if (/(stems?-down|stem-down)/i.test(line)) {
        stemsDirection = 'down';
        line = line.replace(/(stems?-down|stem-down)\s*/i, '');
        hasAnyDirective = true;
      } else if (/(stems?-up|stem-up)/i.test(line)) {
        stemsDirection = 'up';
        line = line.replace(/(stems?-up|stem-up)\s*/i, '');
        hasAnyDirective = true;
      }
      
      // Check for show% keyword
      if (/show%/i.test(line)) {
        displayRepeatSymbol = true;
        line = line.replace(/show%\s*/i, '');
        hasAnyDirective = true;
      }
      
      // Check for pick directive
      if (/(picks?-auto|picks?|pick)(?!\w)/i.test(line)) {
        pickMode = true;
        line = line.replace(/(picks?-auto|picks?|pick)(?!\w)\s*/i, '');
        hasAnyDirective = true;
      }
      
      // Check for finger directive
      const fingerMatch = /(fingers?)(:\s*(en|fr))?/i.exec(line);
      if (fingerMatch) {
        const lang = fingerMatch[3]?.toLowerCase();
        fingerMode = (lang === 'fr') ? 'fr' : 'en';
        line = line.replace(/(fingers?)(:\s*(en|fr))?\s*/i, '');
        hasAnyDirective = true;
      }
      
      // Check for measures-per-line directive
      const measuresPerLineMatch = /measures-per-line:\s*(\d+)/i.exec(line);
      if (measuresPerLineMatch) {
        const count = parseInt(measuresPerLineMatch[1], 10);
        if (count > 0) {
          measuresPerLine = count;
        }
        line = line.replace(/measures-per-line:\s*\d+\s*/i, '');
        hasAnyDirective = true;
      }
      
      // Check for measure-num directive
      // Syntax: measure-num (default: start at 1, display at line starts only)
      //         measure-num: 5 (start at 5, display at line starts)
      //         measure-num: 1,4 (start at 1, display every 4 measures)
      //         measure-num: 5-8 (start at 5, display every 8 measures)
      const measureNumMatch = /measure-num(?::\s*(\d+)(?:[,\-](\d+))?)?/i.exec(line);
      if (measureNumMatch) {
        const startNum = measureNumMatch[1] ? parseInt(measureNumMatch[1], 10) : 1; // Default to 1
        const intervalOrFreq = measureNumMatch[2] ? parseInt(measureNumMatch[2], 10) : 0;
        
        // Store in result object (will be created later)
        measureNumbering = {
          startNumber: startNum,
          interval: intervalOrFreq, // 0 = line starts only, >0 = every N measures
          enabled: true
        };
        
        line = line.replace(/measure-num(?::\s*\d+(?:[,\-]\d+)?)?\s*/i, '');
        hasAnyDirective = true;
      }
      
      // Check for transpose directive
      // Syntax: transpose: +N or transpose: -N or transpose: +N, # or transpose: -N, b
      const transposeMatch = /transpose:\s*([+-]\d+)(?:\s*,\s*([#b]))?/i.exec(line);
      if (transposeMatch) {
        const semitones = parseInt(transposeMatch[1], 10);
        const accidental = transposeMatch[2] as '#' | 'b' | undefined;
        
        transposeSettings = {
          semitones,
          accidental
        };
        
        line = line.replace(/transpose:\s*[+-]\d+(?:\s*,\s*[#b])?\s*/i, '');
        hasAnyDirective = true;
      }
      
      // Parse counting directive
      if (/\b(count|counting)\b/i.test(line)) {
        countingMode = true;
        line = line.replace(/\b(count|counting)\b\s*/i, '');
        hasAnyDirective = true;
      }
      
      // Check for zoom directive
      // Syntax: zoom:50% or zoom:75% or zoom:150%
      const zoomMatch = /zoom:\s*(\d+)%?/i.exec(line);
      if (zoomMatch) {
        const percent = parseInt(zoomMatch[1], 10);
        if (percent > 0 && percent <= 500) { // Limit to reasonable values (1% to 500%)
          zoomPercent = percent;
        }
        line = line.replace(/zoom:\s*\d+%?\s*/i, '');
        hasAnyDirective = true;
      }
      
      // Parse grouping mode directive (auto-beam, auto-beams, binary, ternary)
      // Note: 'auto' and 'noauto' are deprecated but handled with warnings
      // Only match if NOT preceded by a time signature pattern (to avoid matching "4/4 binary" in measures)
      // This directive should be standalone or after other directives, not after time signatures
      if (/^(?!.*\d+\/\d+)\s*(auto-beams?|binary|ternary|auto|noauto)\b/i.test(line)) {
        const modeMatch = /^(?!.*\d+\/\d+)\s*(auto-beams?|binary|ternary|auto|noauto)\b/i.exec(line);
        if (modeMatch) {
          const rawMode = modeMatch[1].toLowerCase();
          // Handle deprecated directives
          if (rawMode === 'auto') {
            console.warn('[ChordGrid] Directive "auto" is deprecated. Use "auto-beam" instead. Converting automatically.');
            groupingModeDirective = 'auto-beam';
          } else if (rawMode === 'noauto') {
            console.warn('[ChordGrid] Directive "noauto" is deprecated and ignored (space-based is now the default behavior).');
            groupingModeDirective = undefined; // Ignore, let default apply
          } else if (rawMode === 'auto-beams') {
            groupingModeDirective = 'auto-beam'; // Alias: auto-beams → auto-beam
          } else {
            groupingModeDirective = rawMode as GroupingMode;
          }
          line = line.replace(/^\s*(auto-beams?|binary|ternary|auto|noauto)\b\s*/i, '');
          hasAnyDirective = true;
        }
      }
      
      // After removing all directives, check what remains
      line = line.trim();
      
      // If line still has content, check if it's a time signature or musical content
      if (line !== '') {
        // If it starts with time signature (N/M), keep it and stop
        if (/^\d+\/\d+/.test(line)) {
          lines[lineIndex] = line; // Update with remaining content
          break;
        }
        // If it contains barline, it's musical content - stop
        if (/\|/.test(line)) {
          lines[lineIndex] = line; // Update with remaining content
          break;
        }
        // Otherwise, if we found directives, this might be leftover - consume line
        if (hasAnyDirective) {
          lineIndex++;
          continue;
        }
        // If no directive found and not empty, stop (unknown content)
        break;
      }
      
      // Line was fully consumed by directives or was empty
      lineIndex++;
    }
    
    // Remove all consumed directive lines
    lines.splice(0, lineIndex);
    
    // Now lines[0] should be the time signature line
    let timeSignatureLine = lines[0] || '';

    // Parse the time signature
    const timeSignature = this.parseTimeSignature(timeSignatureLine);
    
    // Apply grouping mode directive if specified and no explicit mode in time signature
    if (groupingModeDirective && timeSignature.groupingMode === 'space-based') {
      timeSignature.groupingMode = groupingModeDirective;
    }

    // Remove the "N/M" or "N/M mode" pattern from the first line
    // to avoid parsing it as a measure
    // Does NOT consume barlines to allow proper barline parsing
    timeSignatureLine = timeSignatureLine.replace(/^\s*\d+\/\d+(?:\s+(?:auto-beams?|binary|ternary|auto|noauto))?\s*/, '');
    lines[0] = timeSignatureLine;
    
  // Parse all measures
  const allMeasures: Measure[] = [];
  let lastExplicitMeasure: Measure | null = null;
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const result = this.parseLine(line, lineIndex === 0, measuresPerLine, lastExplicitMeasure, timeSignature, pickMode, fingerMode);
      const measures = result.measures;
      lastExplicitMeasure = result.lastExplicitMeasure; // Preserve for next line
      
      // Mark the last measure of each line
      if (measures.length > 0 && lineIndex < lines.length - 1) {
        measures[measures.length - 1].isLineBreak = true;
      }
      
      allMeasures.push(...measures);
    }
    
    // POST-PROCESSING: Determine volta spanning (voltaEnd)
    // Must be done AFTER all lines are parsed, not per-line
    // A volta spans from where it starts until:
    // - An explicit |. end marker is encountered
    // - The next volta starts (different volta)  
    // - A repeat start barline is encountered (||:)
    // - End of measures
    // Note: A volta CAN include the measure with :|| (repeat end)
    
    for (let i = 0; i < allMeasures.length; i++) {
      const measure = allMeasures[i] as any;
      if (measure.voltaStart) {
        const voltaInfo = measure.voltaStart;
        
        // Find the end of this volta
        let endIndex = i;
        let foundExplicitEnd = false;
        
        // Always search for explicit end marker, even for open voltas
        for (let j = i + 1; j < allMeasures.length; j++) {
          const nextMeasure = allMeasures[j] as any;
          
          // Check for explicit end marker (|.) - has highest priority
          if (nextMeasure.voltaEndMarker) {
            endIndex = j;
            foundExplicitEnd = true;
            delete nextMeasure.voltaEndMarker; // Clean up marker
            break;
          }
          
          // For open voltas (isClosed = false), only look for explicit markers
          // Don't auto-extend to following measures
          if (!voltaInfo.isClosed) {
            continue; // Keep searching for |. marker
          }
          
          // For closed voltas (isClosed = true), auto-extend with normal rules
          // Stop BEFORE a new volta or repeat start
          if (nextMeasure.voltaStart || nextMeasure.isRepeatStart) {
            break;
          }
          endIndex = j;
          
          // Stop AFTER a repeat end (include it in the volta)
          if (nextMeasure.isRepeatEnd) {
            break;
          }
        }
        
        // Mark the end measure with voltaEnd (same volta info)
        (allMeasures[endIndex] as any).voltaEnd = voltaInfo;
      }
    }
    
    // Grouper en lignes de 4 mesures pour le rendu
    const renderedLines = this.groupIntoLines(allMeasures, 4);

    const grid: ChordGrid = {
      timeSignature,
      measures: allMeasures,
      lines: renderedLines
    };

    // Validate measure durations against the time signature
    const errors: ValidationError[] = [];

    // Track current time signature through the sequence of measures
    let validationTimeSignature = timeSignature; // Start with global

    for (let mi = 0; mi < allMeasures.length; mi++) {
      const measure = allMeasures[mi];
      
      // Update current time signature if this measure has an explicit change
      // (do this BEFORE skipping validation, so chord-only measures update the tracker)
      if (measure.timeSignature) {
        validationTimeSignature = measure.timeSignature;
      }
      
      // Skip validation for chord-only measures (no rhythm notation)
      if ((measure as any).__isChordOnlyMode) {
        continue;
      }
      
      // Skip validation for empty measures (created with measures-per-line)
      if ((measure as any).__isEmpty) {
        continue;
      }
      
      // Use current time signature for validation
      const effectiveTimeSignature = validationTimeSignature;
      const expectedQuarterNotes = effectiveTimeSignature.numerator * (4 / effectiveTimeSignature.denominator);
      
      let foundQuarterNotes = 0;
      
      // Track tuplets we've already counted to avoid double-counting
      const countedTuplets = new Set<string>();
      
      for (const beat of measure.beats) {
        for (const n of beat.notes) {
          if (!n.value) continue;
          
          // Handle tuplets specially
          if (n.tuplet && !countedTuplets.has(n.tuplet.groupId)) {
            countedTuplets.add(n.tuplet.groupId);
            
            // Step 1: Find baseLen (smallest note value in the tuplet) and collect all notes
            let baseLen = Infinity;
            const tupletNotes: { value: number, dotted: boolean }[] = [];
            
            for (const tupletBeat of measure.beats) {
              for (const tupletNote of tupletBeat.notes) {
                if (tupletNote.tuplet && tupletNote.tuplet.groupId === n.tuplet.groupId) {
                  tupletNotes.push({ value: tupletNote.value, dotted: tupletNote.dotted });
                  // Find smallest note value (highest numeric value = shortest duration)
                  if (tupletNote.value > baseLen) {
                    baseLen = tupletNote.value;
                  }
                }
              }
            }
            
            // If no valid notes found, default to quarter note
            if (!isFinite(baseLen)) {
              baseLen = 4;
            }
            
            // Step 2: Calculate cumulative duration in units of baseLen
            let cumulativeUnits = 0;
            for (const tupletNote of tupletNotes) {
              const dottedMultiplier = tupletNote.dotted ? 1.5 : 1;
              // Convert to units of baseLen
              // Example: if baseLen = 16 and noteValue = 8, then 8 = 2 units of 16
              const unitsOfBaseLen = (baseLen / tupletNote.value) * dottedMultiplier;
              cumulativeUnits += unitsOfBaseLen;
            }
            
            // Step 3: Calculate tuplet ratio
            // Priority: 1) explicit ratio from {...}N:M syntax
            //           2) default ratio from table for common cases
            //           3) automatic calculation as fallback
            //
            // Musical convention (MuseScore-compatible):
            // N:M means "N units of baseLen in the time of M units of the same value"
            // Example: {816-16 1616 8 8}5:4 = 5 eighths in the time of 4 eighths
            //          where N=5 represents the normalized cumulative duration (10 sixteenths = 5 eighths)
            // Calculation: actual_duration = (cumulativeDuration / N) × M
            let tupletRatio: number;
            
            if (n.tuplet.ratio) {
              // Use explicit ratio (e.g., {816-16 1616 8 8}5:4)
              // actualDuration = (cumulativeDuration / N) × M
              tupletRatio = n.tuplet.ratio.denominator / n.tuplet.ratio.numerator;
            } else {
              // Check default ratio table (uses tuplet.count)
              const defaultRatio = ChordGridParser.DEFAULT_TUPLET_RATIOS[n.tuplet.count];
              if (defaultRatio) {
                tupletRatio = defaultRatio.denominator / defaultRatio.numerator;
              } else {
                // Fallback to automatic calculation based on note count
                // For a triplet (3 notes in the time of 2): ratio = 2/3
                // General formula: N notes take the time of (power-of-2 ≤ N) notes of same value
                const normalCount = Math.pow(2, Math.floor(Math.log2(tupletNotes.length)));
                tupletRatio = normalCount / tupletNotes.length;
              }
            }
            
            // Step 4: Calculate actual duration
            // Convert cumulative units back to whole note fraction using baseLen
            const cumulativeDuration = cumulativeUnits / baseLen;
            const actualDuration = cumulativeDuration * tupletRatio;
            foundQuarterNotes += actualDuration * 4; // convert to quarter-note units
          } else if (!n.tuplet) {
            // Regular note (not in a tuplet)
            const baseWhole = 1 / n.value; // fraction of whole note
            const dottedMultiplier = n.dotted ? 1.5 : 1;
            const whole = baseWhole * dottedMultiplier;
            foundQuarterNotes += whole * 4; // convert to quarter-note units
          }
          // Skip notes already counted as part of a tuplet
        }
      }

      // Skip rhythm validation for chord-only measures
      // A measure is "chord-only" if it has no rhythm (beats are empty or have no notes)
      const hasRhythm = measure.beats.some(beat => beat.notes && beat.notes.length > 0);
      
      if (hasRhythm) {
        // Allow a small epsilon for fp rounding
        const diff = Math.abs(foundQuarterNotes - expectedQuarterNotes);
        if (diff > 1e-6) {
          errors.push({
            measureIndex: mi,
            measureSource: measure.source,
            expectedQuarterNotes,
            foundQuarterNotes,
            message: `Measure ${mi + 1}: expected ${expectedQuarterNotes} quarter-notes (${effectiveTimeSignature.numerator}/${effectiveTimeSignature.denominator}), found ${foundQuarterNotes.toFixed(3)} (diff ${diff.toFixed(3)})`
          });
        }
      }
      // Chord-only measures (e.g., "Dm", "C / G", or "%" copying a chord-only measure) 
      // are implicitly valid and don't need rhythm validation

    }
    // End of for loop over all measures
    if (transposeSettings) {
      this.applyTransposition(allMeasures, transposeSettings.semitones, transposeSettings.accidental);
    }

    return { grid, errors, measures: allMeasures, stemsDirection, displayRepeatSymbol, pickMode, fingerMode, measuresPerLine, measureNumbering, countingMode, zoomPercent };
  }


  private applyTransposition(measures: Measure[], semitones: number, forceAccidental?: '#' | 'b'): void {
    const allChords: string[] = [];
    const chordToSegments: Map<string, ChordSegment[]> = new Map();
    for (const measure of measures) {
      if (measure.chordSegments) {
        for (const segment of measure.chordSegments) {
          if (segment.chord && segment.chord.trim() !== '') {
            if (segment.chord === '%' || segment.chord === '[%]') continue;
            if (!chordToSegments.has(segment.chord)) {
              allChords.push(segment.chord);
              chordToSegments.set(segment.chord, []);
            }
            chordToSegments.get(segment.chord)!.push(segment);
          }
        }
      }
    }
    if (allChords.length > 0) {
      const transposedChords = Transposer.transposeChords(allChords, semitones, forceAccidental);
      for (let i = 0; i < allChords.length; i++) {
        const segments = chordToSegments.get(allChords[i]);
        if (segments) {
          for (const segment of segments) {
            segment.chord = transposedChords[i];
          }
        }
      }
    }
  }
  /**
   * Produce simplified syntactic measures for the new analyzer layer (v2.0.0).
   * This ignores any beam grouping and only preserves the raw note sequence per chord segment.
   *
   * Contract:
   * - Returns an array of ParsedMeasure (analyzer-types)
   * - Each measure contains segments with flat notes (ParsedNote)
   * - leadingSpace is propagated from segment parsing
   */
  public parseForAnalyzer(input: string): {
    timeSignature: TimeSignature;
    measures: AnalyzerParsedMeasure[];
  } {
    const result = this.parse(input);
    const measures: AnalyzerParsedMeasure[] = result.measures.map((m) => {
      const segments: AnalyzerParsedSegment[] = (m.chordSegments || []).map((seg) => {
        const flatNotes: AnalyzerParsedNote[] = [];
        seg.beats.forEach((beat, beatIndex) => {
          for (const n of beat.notes) {
            flatNotes.push({
              value: n.value,
              dotted: !!n.dotted,
              isRest: !!n.isRest,
              tieStart: n.tieStart || false,
              tieEnd: n.tieEnd || false,
              tieToVoid: n.tieToVoid || false,
              tieFromVoid: n.tieFromVoid || false,
              beatIndex,  // Preserve beat index to break beams at beat boundaries
              tuplet: n.tuplet, // Preserve tuplet information
                hasLeadingSpace: n.hasLeadingSpace, // Preserve spacing flag for tuplet subgroups
                forcedBeamThroughTie: n.forcedBeamThroughTie, // Preserve [_] syntax
            });
          }
        });
        return {
          chord: seg.chord,
          notes: flatNotes,
          leadingSpace: !!seg.leadingSpace,
        } as AnalyzerParsedSegment;
      });

      return {
        segments,
        timeSignature: m.timeSignature || result.grid.timeSignature,
        barline: m.barline,
        isLineBreak: m.isLineBreak,
        source: m.source,
      } as AnalyzerParsedMeasure;
    });

    return { timeSignature: result.grid.timeSignature, measures };
  }
  
  private parseLine(line: string, isFirstLine: boolean, measuresPerLine?: number, lastExplicitMeasureFromPreviousLine?: Measure | null, globalTimeSignature?: TimeSignature, pickMode?: boolean, fingerMode?: 'en' | 'fr'): { measures: Measure[], lastExplicitMeasure: Measure | null } {
    // Skip time signature on first line
    if (isFirstLine) {
      line = line.replace(/^\d+\/\d+\s*/, '');
    }
    
    const measures: Measure[] = [];

    // Tokenize by barlines while keeping the barline token
    // Accept barlines: ||:, :||, ||, | (with optional repeat count like :||x3 or volta like |.1-3)
    // IMPORTANT: Order matters! Test longest patterns first to avoid partial matches
    const tokens: Array<{bar: string; content: string; repeatCount?: number; volta?: string}> = [];
    // Regex to split while capturing barlines (ordered by length: longest first)
    // Capture :||x\d+ as a single token to extract repeat count
    // Capture volta notation: |.1 or :||.4 or |.1-3 or |.1,2,3 or |. (end marker)
    // IMPORTANT: Order in regex: test :|| before || to avoid partial match
    const re = /(\|\|:(?:\.[\d,-]+)?|:\|\|(?:x\d+)?(?:\.[\d,-]+)?|\|\|(?:x\d+)?(?:\.[\d,-]+)?|\|(?:\.[\d,-]*)?)/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    const parts: {sep: string | null, text: string}[] = [];
    while ((m = re.exec(line)) !== null) {
      const sep = m[0];
      // preserve original spacing inside the measure content (do not trim)
      const text = line.slice(lastIndex, m.index);
      parts.push({sep: null, text});
      parts.push({sep, text: ''});
      lastIndex = re.lastIndex;
    }
    // trailing (preserve spacing)
    const trailing = line.slice(lastIndex);
    if (trailing.length > 0) parts.push({sep: null, text: trailing});

    // Build measure tokens by concatenating raw text pieces (preserve internal spaces)
    let currentText = '';
    for (const p of parts) {
      if (p.sep === null) {
        // append raw text (may include spaces) without injecting extra spaces
        currentText += p.text || '';
      } else {
        // separator encountered -> emit measure with this barline (keep raw content)
        // Extract repeat count from :||x3 pattern
        let barline = p.sep;
        let repeatCount: number | undefined;
        let volta: string | undefined;
        
        // Extract repeat count (e.g., :||x3)
        const repeatMatch = /^(:?\|\|)x(\d+)/.exec(barline);
        if (repeatMatch) {
          barline = barline.replace(/x\d+/, ''); // Remove x3 part
          repeatCount = parseInt(repeatMatch[2], 10);
        }
        
        // Extract volta notation (e.g., |.1-3 or :||.4 or |. to end volta)
        const voltaMatch = /^(.+?)\.(\d+(?:-\d+)?(?:,\d+)*)?$/.exec(barline);
        if (voltaMatch && voltaMatch[0].includes('.')) {
          barline = voltaMatch[1]; // Extract || or :|| or |
          volta = voltaMatch[2] || 'END';   // Extract "1-3" or "4" or "1,2,3" or "END" if just |.
        }
        
        tokens.push({bar: barline, content: currentText, repeatCount, volta});
        currentText = '';
      }
    }
    // any remaining content without trailing bar -> assume single barline |
    if (currentText.length > 0 && currentText.trim().length > 0) {
      tokens.push({bar: '|', content: currentText});
    }

    // Helper: parse a single measure text like "Am[88 4 4 88]"
    const measureRe = /^\s*([^\[]+?)?\s*(?:\[([^\]]*)\])?\s*$/;
    const analyzer = new BeamAndTieAnalyzer();

    // A token's content may contain multiple chord[rhythm] groups (e.g. "Am[88 4] G[4 88]").
    // For each token (i.e. text between barlines) we extract all chord[rhythm] segments
    // and concatenate their beats into a single Measure (since a single bar may contain
    // multiple chord changes). The token's barline marks the measure boundary.
    // Capture aussi les espaces entre les groupes
    const segmentRe = /(\s*)([^\[\]\s]+)?\s*\[([^\]]*)\]/g;

    // Don't filter out empty tokens yet - we need to know if they're at the start
    // to correctly determine isFirstMeasureOfLine for tie logic

    // Track the last explicit measure (non-%) for repeat notation
    // Initialize with value from previous line (if any)
    let lastExplicitMeasure: Measure | null = lastExplicitMeasureFromPreviousLine || null;
    
    // Track pending start repeat barline (||:) that should apply to next measure
    let pendingStartBarline: string | null = null;
    
    // Track pending volta that should apply to next measure
    let pendingVolta: string | undefined = undefined;
    
    // Track if the pending volta comes AFTER a :|| (for determining open vs closed bracket)
    let pendingVoltaIsAfterRepeatEnd = false;
    
    // Track if next measure should be marked as volta end (from |. marker)
    let pendingVoltaEndMarker = false;

    for (let ti = 0; ti < tokens.length; ti++) {
      const t = tokens[ti];
      const bar = t.bar as BarlineType;
      
      // Check if this is a start repeat marker (||:) with no content
      if (t.content.trim().length === 0 && t.bar === '||:') {
        // Store it to apply to the next measure
        pendingStartBarline = '||:';
        // Also check for volta on this barline
        if (t.volta) {
          pendingVolta = t.volta;
        }
        continue;
      }
      
      // Skip other empty tokens but don't add them as measures
      // EXCEPT when the content contains at least a space (intentional empty measure "| |")
      // (to distinguish intentional empty measures from leading empty tokens on first line)
      if (t.content.trim().length === 0) {
        // But check for volta that should apply to next measure
        if (t.volta) {
          pendingVolta = t.volta;
        }
        
        // Create empty measure if:
        // 1. The content has at least one space (intentional empty measure "| |")
        // 2. OR it's not the first token (to avoid the leading space after time signature)
        // 3. OR measures-per-line is specified (forced layout mode)
        const isIntentionalEmpty = t.content.length > 0 && /\s/.test(t.content);
        const isNotFirstToken = ti > 0;
        
        if (isIntentionalEmpty || (measuresPerLine !== undefined && isNotFirstToken)) {
          // Create an empty measure (no chords, no rhythm)
          const emptyMeasure: Measure = {
            beats: [],
            chord: '',
            chordSegments: [],
            barline: bar,
            isLineBreak: false,
            source: '(empty)',
            timeSignature: undefined
          };
          
          // Mark it as empty for special rendering
          (emptyMeasure as any).__isEmpty = true;
          
          // Apply pending start barline if any
          if (pendingStartBarline === '||:') {
            (emptyMeasure as any).isRepeatStart = true;
            pendingStartBarline = null;
          }
          
          // Apply pending volta if any
          if (pendingVolta) {
            const voltaNumbers = this.parseVoltaNumbers(pendingVolta);
            const voltaText = pendingVolta;
            const isClosed = !pendingVoltaIsAfterRepeatEnd;
            (emptyMeasure as any).voltaStart = {
              numbers: voltaNumbers,
              text: voltaText,
              isClosed: isClosed
            };
            pendingVolta = undefined;
            pendingVoltaIsAfterRepeatEnd = false;
          }
          
          // Apply pending volta end marker
          if (pendingVoltaEndMarker) {
            (emptyMeasure as any).voltaEnd = true;
            pendingVoltaEndMarker = false;
          }
          
          // Handle repeat count on the barline (:||x3)
          if (bar === ':||' && t.repeatCount) {
            (emptyMeasure as any).repeatEndCount = t.repeatCount;
          }
          
          measures.push(emptyMeasure);
        }
        
        continue;
      }
      
      let text = t.content;

      // TIME SIGNATURE CHANGE DETECTION
      // Check if this measure starts with a time signature (e.g., "3/4 Am[4 4 4]" or "2/4 Em[2]")
      let measureTimeSignature: TimeSignature | undefined;
      const timeSignaturePattern = /^(\s*)(\d+\/\d+)(?:\s+(auto-beams?|binary|ternary|auto|noauto))?\s+/;
      const tsMatch = timeSignaturePattern.exec(text);
      if (tsMatch) {
        // Extract time signature from captured groups (skip leading space)
        const tsText = tsMatch[2] + (tsMatch[3] ? ' ' + tsMatch[3] : '');
        measureTimeSignature = this.parseTimeSignature(tsText);
        
        // If no explicit groupingMode in the inline time signature, inherit from global
        if (measureTimeSignature.groupingMode === 'space-based' && globalTimeSignature && globalTimeSignature.groupingMode !== 'space-based') {
          measureTimeSignature.groupingMode = globalTimeSignature.groupingMode;
        }
        
        // Remove time signature from content, keep leading space
        text = tsMatch[1] + text.slice(tsMatch[0].length);
      }

      // REPEAT NOTATION DETECTION
      // Check for '%' (repeat entire previous measure)
      if (text.trim() === '%') {
        if (!lastExplicitMeasure) {
          console.warn("Cannot use '%' repeat notation on first measure");
          continue;
        }
        const clonedMeasure = this.cloneMeasure(lastExplicitMeasure, bar, t.repeatCount);
        
        // Mark this measure as a simple % repeat (for chord rendering logic)
        clonedMeasure.source = '%';
        
        // Apply pending start barline if any
        if (pendingStartBarline === '||:') {
          (clonedMeasure as any).isRepeatStart = true;
          pendingStartBarline = null;
        }
        
        // Apply pending volta from previous token
        if (pendingVolta) {
          const voltaNumbers = this.parseVoltaNumbers(pendingVolta);
          const voltaText = pendingVolta;
          const isClosed = !pendingVoltaIsAfterRepeatEnd;
          (clonedMeasure as any).voltaStart = {
            numbers: voltaNumbers,
            text: voltaText,
            isClosed: isClosed
          };
          pendingVolta = undefined;
          pendingVoltaIsAfterRepeatEnd = false;
        }
        
        measures.push(clonedMeasure);
        
        // After creating the measure, check if this token's barline has a volta
        if (t.volta) {
          pendingVolta = t.volta;
          pendingVoltaIsAfterRepeatEnd = (bar === ':||');
        }
        
        // Update reference: % becomes new reference for next %
        lastExplicitMeasure = clonedMeasure;
        continue;
      }

      // Check for 'Chord[%]' (repeat rhythm with new chord)
      const repeatMatch = /^\s*([^\[\]\s]+)\s*\[%\]\s*$/.exec(text);
      if (repeatMatch) {
        if (!lastExplicitMeasure) {
          console.warn("Cannot use '[%]' repeat notation on first measure");
          continue;
        }
        const newChord = repeatMatch[1].trim();
        const clonedMeasure = this.cloneMeasureWithNewChord(lastExplicitMeasure, newChord, bar);
        
        // Apply pending start barline if any
        if (pendingStartBarline === '||:') {
          (clonedMeasure as any).isRepeatStart = true;
          pendingStartBarline = null;
        }
        
        // Apply pending volta from previous token
        if (pendingVolta) {
          const voltaNumbers = this.parseVoltaNumbers(pendingVolta);
          const voltaText = pendingVolta;
          const isClosed = !pendingVoltaIsAfterRepeatEnd;
          (clonedMeasure as any).voltaStart = {
            numbers: voltaNumbers,
            text: voltaText,
            isClosed: isClosed
          };
          pendingVolta = undefined;
          pendingVoltaIsAfterRepeatEnd = false;
        }
        
        measures.push(clonedMeasure);
        
        // After creating the measure, check if this token's barline has a volta
        if (t.volta) {
          pendingVolta = t.volta;
          pendingVoltaIsAfterRepeatEnd = (bar === ':||');
        }
        lastExplicitMeasure = clonedMeasure;
        continue;
      }

      const beats: Beat[] = [];
      let firstChord = '';
      let anySource = '';
      let isChordOnlyMode = false; // Track if this measure is chord-only mode

      let m2: RegExpExecArray | null;
      // Determine whether this measure is first/last on the line for tie logic
      // Check if all previous tokens were empty (leading barlines)
      const isFirstMeasureOfLine = tokens.slice(0, ti).every(prev => prev.content.trim().length === 0);
      // Check if all following tokens are empty (trailing barlines)
      const isLastMeasureOfLine = tokens.slice(ti + 1).every(next => next.content.trim().length === 0);

      const chordSegments: ChordSegment[] = [];
      
      // PREPROCESSING: Replace [_] with temporary placeholder to avoid bracket conflicts
      const FORCED_BEAM_PLACEHOLDER = '\u0001'; // Use control character as placeholder
      const processedText = text.replace(/\[_\]/g, FORCED_BEAM_PLACEHOLDER);
      
      // Check if text contains brackets (chord[rhythm] syntax)
      if (processedText.includes('[')) {
        // Pre-scan all segments to find the last one with rhythm
        const allSegments: { leadingSpace: string; chord: string; rhythm: string; source: string }[] = [];
        let tempMatch: RegExpExecArray | null;
        const tempRe = new RegExp(segmentRe.source, segmentRe.flags); // Create new regex to avoid state
        while ((tempMatch = tempRe.exec(processedText)) !== null) {
          const leadingSpaceCapture = tempMatch[1] || '';
          const chord = (tempMatch[2] || '').trim();
          let rhythm = (tempMatch[3] || '').trim();
          rhythm = rhythm.replace(new RegExp(FORCED_BEAM_PLACEHOLDER, 'g'), '[_]');
          allSegments.push({ leadingSpace: leadingSpaceCapture, chord, rhythm, source: tempMatch[0] });
        }
        
        // Find index of last segment with non-empty rhythm
        const lastSegmentWithRhythmIndex = allSegments.reduce((lastIdx, seg, idx) => 
          seg.rhythm.length > 0 ? idx : lastIdx, -1);
        
        // Use bracket-based parsing
        let segmentIndex = 0;
        while ((m2 = segmentRe.exec(processedText)) !== null) {
          const leadingSpaceCapture = m2[1] || '';
          const chord = (m2[2] || '').trim();
          let rhythm = (m2[3] || '').trim();
          
          // Restore [_] from placeholder in rhythm string
          rhythm = rhythm.replace(new RegExp(FORCED_BEAM_PLACEHOLDER, 'g'), '[_]');
          
          const sourceText = m2[0];
          if (!firstChord && chord) firstChord = chord;
          anySource += (anySource ? ' ' : '') + sourceText;

          if (rhythm.length > 0) {
            // Determine whether there was explicit whitespace before THIS segment
            // Use the capture group from the segment regex which preserves leading spaces
            const hasSignificantSpace = (leadingSpaceCapture || '').length > 0;
            const isLastSegment = (segmentIndex === lastSegmentWithRhythmIndex);
            const effectiveTS = measureTimeSignature || globalTimeSignature;

            const parsedBeats = analyzer.analyzeRhythmGroup(rhythm, chord, isFirstMeasureOfLine, isLastMeasureOfLine, hasSignificantSpace, isLastSegment, effectiveTS, pickMode, fingerMode);
            
            // Create a segment for each chord/rhythm group
            chordSegments.push({
              chord: chord,  // use the current chord
              beats: parsedBeats,
              leadingSpace: hasSignificantSpace
            });
            
            beats.push(...parsedBeats); // keep compatibility with the rest of the code
          }
          segmentIndex++;
        }
      } else {
        // No brackets: could be either:
        // 1. Chord-only mode: just chord symbols (e.g., "C" or "Em / G")
        // 2. Rhythm-only mode: rhythm without chord (e.g., "88 4 4")
        
        const trimmedText = text.trim();
        anySource = text;
        
        // Detect chord-only mode: text contains chord names separated by / or space, no digits
        // Chord pattern: comprehensive support for all standard chord notations
        // Examples: C, Am, Cmaj7, G7sus4, F#m7b5, Bb/D, Gmaj7/B, FM7, CM9, FM7(#11)/A
        // Pattern breakdown:
        // - Root: A-G with optional # or b (or unicode ♯/♭)
        // - Quality: M, m, maj, min, major, minor, dim, aug, ø, o, +, - (optional)
        // - Extensions: any combination of numbers (2,4,5,6,7,9,11,13)
        // - Alterations: b5, #5, b9, #9, #11, b13, etc. with optional parentheses
        // - Suspensions: sus, sus2, sus4
        // - Additions: add + number with optional alteration
        // - Bass note: /[root] at the end
        
        // Build a more permissive pattern that captures real-world chord notation
        const rootPattern = '[A-G][#b♯♭]?';
        // Quality: include mM, mMaj, mmaj (minor with major 7th) - longer patterns first
        const qualityPattern = '(?:mMaj|mmaj|mM|Mmaj|major|minor|maj|min|dim|aug|M|m|ø|o|\\+|\\-)?';
        const extensionPattern = '[0-9]+';
        // Alterations can be in parentheses or not: b5, #11, (b9), (#11), etc.
        const alterationPattern = '(?:\\([#b♯♭]?[0-9]+\\)|[#b♯♭][0-9]+)';
        // Suspensions and additions: with optional parentheses
        // Examples: sus4, sus2, add9, (sus4), (add9), add#11, (add#11)
        const susPattern = '(?:\\((?:sus[24]?|add[#b♯♭]?[0-9]+)\\)|sus[24]?|add[#b♯♭]?[0-9]+)';
        
        // A chord is: root + quality + (extension/alteration/sus)* + optional bass
        // Allow multiple alterations, extensions, etc. in any order
        const singleChordPattern = `${rootPattern}${qualityPattern}(?:${extensionPattern}|${alterationPattern}|${susPattern})*(?:/${rootPattern})?`;
        
        // Full pattern: one or more chords separated by " / " (with spaces)
        const chordPattern = new RegExp(`^${singleChordPattern}(?:\\s+\\/\\s+${singleChordPattern})*$`);
        const isChordOnly = chordPattern.test(trimmedText);
        
        if (isChordOnly && trimmedText.length > 0) {
          // Chord-only mode: parse chord symbols
          // Two cases:
          // 1. "Em / G" (with spaces) = two separate chords
          // 2. "Fmaj7/A" (no spaces) = one chord with bass note
          
          const chords: string[] = [];
          
          // Split by " / " (with spaces) first to get chord groups
          const slashWithSpaceParts = trimmedText.split(/\s+\/\s+/);
          
          // Each part is either a simple chord or might contain bass notes (/)
          for (const part of slashWithSpaceParts) {
            if (part.trim().length > 0) {
              chords.push(part.trim());
            }
          }
          
          if (!firstChord && chords.length > 0) firstChord = chords[0];
          
          // Create segments for each chord (no beats/rhythm)
          chords.forEach((chord, idx) => {
            chordSegments.push({
              chord: chord,
              beats: [], // No rhythm in chord-only mode
              leadingSpace: idx > 0 // All chords after first have logical spacing
            });
          });
          
          isChordOnlyMode = true;
        } else if (trimmedText.length > 0) {
          // Rhythm-only mode: parse as rhythm without chord
          const rhythm = trimmedText;
          const effectiveTS = measureTimeSignature || globalTimeSignature;
          const parsedBeats = analyzer.analyzeRhythmGroup(rhythm, '', isFirstMeasureOfLine, isLastMeasureOfLine, false, true, effectiveTS, pickMode, fingerMode);
          
          chordSegments.push({
            chord: '',
            beats: parsedBeats,
            leadingSpace: false
          });
          
          beats.push(...parsedBeats);
        }
      }

      const newMeasure: Measure = {
        beats,
        chord: firstChord,  // keep for compatibility
        chordSegments,     // new property for all chords
        barline: bar,
        isLineBreak: false,
        source: anySource || text,
        timeSignature: measureTimeSignature
      };
      
      // Mark chord-only mode if detected
      if (isChordOnlyMode) {
        (newMeasure as any).__isChordOnlyMode = true;
      }

      // Add repeat bar properties based on barline type
      // Check if there's a pending start barline from previous token
      if (pendingStartBarline === '||:') {
        (newMeasure as any).isRepeatStart = true;
        pendingStartBarline = null; // Clear after applying
      } else if (bar === '||:') {
        (newMeasure as any).isRepeatStart = true;
      }
      
      if (bar === ':||') {
        (newMeasure as any).isRepeatEnd = true;
      }

      // Add repeat count if present (e.g., :||x3)
      if (t.repeatCount !== undefined) {
        (newMeasure as any).repeatCount = t.repeatCount;
      }

      // Apply pending volta from previous token (e.g., the barline before this measure had |.1-3)
      if (pendingVolta) {
        const voltaNumbers = this.parseVoltaNumbers(pendingVolta);
        const voltaText = pendingVolta; // Keep original text (e.g., "1-3", "4", "1,2,3")
        
        // Determine if bracket should be closed or open
        // isClosed = false if volta comes AFTER :|| (we continue, no loop back)
        // isClosed = true if volta comes BEFORE :|| (we loop back)
        const isClosed = !pendingVoltaIsAfterRepeatEnd;
        
        const voltaInfo: VoltaInfo = {
          numbers: voltaNumbers,
          text: voltaText,
          isClosed: isClosed
        };
        
        // Mark this measure as having a volta start
        (newMeasure as any).voltaStart = voltaInfo;
        
        // Clear the pending volta
        pendingVolta = undefined;
        pendingVoltaIsAfterRepeatEnd = false;
      }
      
      // Apply pending volta end marker from previous barline (|.)
      if (pendingVoltaEndMarker) {
        (newMeasure as any).voltaEndMarker = true;
        pendingVoltaEndMarker = false;
      }

      measures.push(newMeasure);
      
      // After creating the measure, check if this token's barline has a volta
      // If so, store it for the NEXT measure
      if (t.volta) {
        // Special case: |. (volta = 'END') marks the end of the current volta
        if (t.volta === 'END') {
          // Mark that the NEXT measure should be marked as volta end
          pendingVoltaEndMarker = true;
        } else {
          pendingVolta = t.volta;
          // Check if this volta comes after a :|| barline
          pendingVoltaIsAfterRepeatEnd = (bar === ':||');
        }
      }
      
      // Update reference to last explicit measure (for % notation)
      lastExplicitMeasure = newMeasure;
    }

    return { measures, lastExplicitMeasure };
  }

  /**
   * Parse the time signature from the first line.
   * 
   * @param line - First line containing the time signature (e.g., "4/4 ||: C[4 4 4 4]")
   * @returns TimeSignature object with numerator and denominator
   * @default { numerator: 4, denominator: 4 } if no signature is found
   */
  /**
   * Parse the time signature and optional grouping mode.
   * 
   * Syntax: "4/4" or "4/4 binary" or "6/8 ternary" or "4/4 auto-beam"
   * 
   * @param line - First line containing the time signature
   * @returns TimeSignature object with numerator, denominator, and groupingMode
   */
  private parseTimeSignature(line: string): TimeSignature {
    // Match: "4/4" optionally followed by grouping mode
    const m = /^\s*(\d+)\/(\d+)(?:\s+(auto-beams?|binary|ternary|auto|noauto))?/.exec(line);
    if (m) {
      const numerator = parseInt(m[1], 10);
      const denominator = parseInt(m[2], 10);
      let groupingMode: GroupingMode = 'space-based'; // NEW default
      
      if (m[3]) {
        const rawMode = m[3].toLowerCase();
        // Handle deprecated modes
        if (rawMode === 'auto') {
          console.warn('[ChordGrid] Mode "auto" is deprecated. Use "auto-beam" instead.');
          groupingMode = 'auto-beam';
        } else if (rawMode === 'noauto') {
          console.warn('[ChordGrid] Mode "noauto" is deprecated (space-based is now default).');
          groupingMode = 'space-based';
        } else if (rawMode === 'auto-beams') {
          groupingMode = 'auto-beam';
        } else {
          groupingMode = rawMode as GroupingMode;
        }
      }
      
      return {
        numerator,
        denominator,
        beatsPerMeasure: numerator,
        beatUnit: denominator,
        groupingMode
      };
    }
    // Fallback default
    return { 
      numerator: 4, 
      denominator: 4, 
      beatsPerMeasure: 4, 
      beatUnit: 4,
      groupingMode: 'space-based' // NEW default
    };
  }

  /**
   * Clone a measure completely (used for '%' notation).
   * Removes tie flags at measure boundaries to prevent cross-measure ties.
   * 
   * @param source - The measure to clone
   * @param barline - The barline type for the new measure
   * @returns A deep clone of the measure with cleared boundary ties
   */
  private cloneMeasure(source: Measure, barline: BarlineType, repeatCount?: number): Measure {
    // Deep clone beats and notes
    const clonedBeats: Beat[] = source.beats.map(beat => ({
      ...beat,
      notes: beat.notes.map(note => ({ ...note })),
      beamGroups: beat.beamGroups ? beat.beamGroups.map(bg => ({ ...bg })) : []
    }));

    // Deep clone chord segments
    const clonedSegments: ChordSegment[] = source.chordSegments.map(segment => ({
      chord: segment.chord,
      leadingSpace: segment.leadingSpace,
      beats: segment.beats.map(beat => ({
        ...beat,
        notes: beat.notes.map(note => ({ ...note })),
        beamGroups: beat.beamGroups ? beat.beamGroups.map(bg => ({ ...bg })) : []
      }))
    }));

    // Remove tie flags at measure boundaries
    this.clearMeasureBoundaryTies(clonedBeats, clonedSegments);

    const cloned: Measure = {
      beats: clonedBeats,
      chord: source.chord,
      chordSegments: clonedSegments,
      barline: barline,
      isLineBreak: false,
      source: source.source,
      isRepeat: true,
      timeSignature: source.timeSignature  // Copy time signature if present
    };

    // Copy chord-only mode flag if present
    if ((source as any).__isChordOnlyMode) {
      (cloned as any).__isChordOnlyMode = true;
    }

    // Add repeat bar properties based on barline type
    if (barline === '||:') {
      (cloned as any).isRepeatStart = true;
    } else if (barline === ':||') {
      (cloned as any).isRepeatEnd = true;
    }

    // Add repeat count if provided
    if (repeatCount !== undefined) {
      (cloned as any).repeatCount = repeatCount;
    }

    return cloned;
  }

  /**
   * Clone a measure with a new chord (used for 'G[%]' notation).
   * Keeps the rhythm but replaces the chord.
   * 
   * @param source - The measure to clone
   * @param newChord - The new chord to apply
   * @param barline - The barline type for the new measure
   * @returns A deep clone of the measure with new chord and cleared boundary ties
   */
  private cloneMeasureWithNewChord(source: Measure, newChord: string, barline: BarlineType): Measure {
    const cloned = this.cloneMeasure(source, barline);
    
    // Replace chord in all segments
    cloned.chord = newChord;
    cloned.chordSegments = cloned.chordSegments.map(segment => ({
      ...segment,
      chord: newChord
    }));
    
    cloned.source = `${newChord}[%]`;
    
    // NOTE: Do NOT mark as __isChordOnlyMode here
    // The renderer will decide based on displayRepeatSymbol option
    
    return cloned;
  }

  /**
   * Clear tie flags at the start and end of a measure to prevent
   * ties from crossing measure boundaries in repeated measures.
   * 
   * @param beats - The beats array to modify
   * @param segments - The chord segments array to modify
   */
  private clearMeasureBoundaryTies(beats: Beat[], segments: ChordSegment[]): void {
    if (beats.length === 0) return;

    // Clear tieStart flags on last notes of measure
    const lastBeat = beats[beats.length - 1];
    if (lastBeat.notes.length > 0) {
      const lastNote = lastBeat.notes[lastBeat.notes.length - 1];
      lastNote.tieStart = false;
      lastNote.tieToVoid = false;
    }

    // Clear tieEnd flags on first notes of measure
    const firstBeat = beats[0];
    if (firstBeat.notes.length > 0) {
      const firstNote = firstBeat.notes[0];
      firstNote.tieEnd = false;
      firstNote.tieFromVoid = false;
    }

    // Also clear in segments
    if (segments.length > 0) {
      const firstSegment = segments[0];
      if (firstSegment.beats.length > 0 && firstSegment.beats[0].notes.length > 0) {
        firstSegment.beats[0].notes[0].tieEnd = false;
        firstSegment.beats[0].notes[0].tieFromVoid = false;
      }

      const lastSegment = segments[segments.length - 1];
      if (lastSegment.beats.length > 0) {
        const lastBeat = lastSegment.beats[lastSegment.beats.length - 1];
        if (lastBeat.notes.length > 0) {
          const lastNote = lastBeat.notes[lastBeat.notes.length - 1];
          lastNote.tieStart = false;
          lastNote.tieToVoid = false;
        }
      }
    }
  }

  /**
   * Group measures into lines for rendering.
   * 
   * @param measures - Array of all measures
   * @param perLine - Number of measures per line (typically 4)
   * @returns Array of lines, each line containing an array of measures
   */
  private groupIntoLines(measures: Measure[], perLine: number): Measure[][] {
    const lines: Measure[][] = [];
    for (let i = 0; i < measures.length; i += perLine) {
      lines.push(measures.slice(i, i + perLine));
    }
    return lines;
  }
}

/**
 * @class BeamAndTieAnalyzer
 * @description Analyzer for beams and ties in rhythmic notation.
 * 
 * This class is responsible for:
 * - Analyzing rhythmic groups and determining which notes should be beamed together
 * - Managing ties between notes (ties), including cross-measure and cross-line ties
 * - Parsing individual note values (with dots and rests)
 * - Creating Beat structures with appropriate beam information
 * 
 * Beam rules:
 * - Notes without space between them are grouped in the same beat and beamed
 * - A space separates beats and therefore beam groups
 * - Rests break beams
 * - A space before a chord can break the beam between segments
 * 
 * Tie rules:
 * - The underscore `_` marks the start of a tie
 * - A tie can cross measure boundaries
 * - A "to void" tie marks a note that ties to a virtual note at end of line
 * - A "from void" tie marks a note that receives a tie from a virtual note
 */
class BeamAndTieAnalyzer {
  
  private tieContext: {
    lastNote: NoteElement | null;
    crossMeasure: boolean;
    crossLine: boolean;      // NEW
    pendingTieToVoid: boolean; // NEW
  };

  // Keep context of the last note group to detect
  // whether two segments should be beamed or separated
  private rhythmContext: {
    lastGroupTime: number;
    lastGroupHasSpace: boolean;
    lastBeamableNotes: NoteElement[];
  };

  constructor() {
    this.tieContext = {
      lastNote: null,
      crossMeasure: false,
      crossLine: false,
      pendingTieToVoid: false
    };
    
    this.rhythmContext = {
      lastGroupTime: 0,
      lastGroupHasSpace: false,
      lastBeamableNotes: []
    };
  }
  
  analyzeRhythmGroup(
    rhythmStr: string, 
    chord: string,
    isFirstMeasureOfLine: boolean,
    isLastMeasureOfLine: boolean,
    hasSignificantSpace: boolean = false,
    isLastSegment: boolean = true,
    effectiveTimeSignature?: TimeSignature,
    pickMode?: boolean,
    fingerMode?: 'en' | 'fr'
  ): Beat[] {
    // NOTE: we should NOT overwrite lastGroupHasSpace here because the
    // continuity decision in createBeat must use the *previous* group's
    // spacing flag. We'll update lastGroupHasSpace at the end of this
    // function so the next group can observe it.
  const beats: Beat[] = [];
  let currentBeat: NoteElement[] = [];
  // Track a reference to the cloned last note of the previous beat (as stored in beats) to support ties across spaces
  let lastBeatLastNoteRef: NoteElement | null = null;
    let i = 0;
    
    let pendingTieFromVoid = false;
    
    while (i < rhythmStr.length) {
      // Tuplet detection: { ... }N
      if (rhythmStr[i] === '{') {
        // Find the closing '}'
        const closeIdx = rhythmStr.indexOf('}', i);
        if (closeIdx > i) {
          // Find the tuplet number and optional ratio after '}'
          // Format: }N or }N:M
          let numStr = '';
          let j = closeIdx + 1;
          while (j < rhythmStr.length && /\d/.test(rhythmStr[j])) {
            numStr += rhythmStr[j];
            j++;
          }
          
          // Check if an explicit ratio is provided (:M)
          let explicitRatio: { numerator: number, denominator: number } | undefined;
          let hasExplicitRatio = false;  // Track whether user explicitly wrote the ratio
          if (j < rhythmStr.length && rhythmStr[j] === ':') {
            j++; // Skip the ':'
            let ratioStr = '';
            while (j < rhythmStr.length && /\d/.test(rhythmStr[j])) {
              ratioStr += rhythmStr[j];
              j++;
            }
            const denominatorValue = parseInt(ratioStr, 10);
            if (denominatorValue > 0 && numStr) {
              explicitRatio = {
                numerator: parseInt(numStr, 10),
                denominator: denominatorValue
              };
              hasExplicitRatio = true;  // User explicitly wrote }N:M
            }
          }
          
          const tupletCount = parseInt(numStr, 10);
          if (tupletCount > 0) {
            // Calculate ratio: use explicit ratio if provided, otherwise use default table or fallback
            let finalRatio: { numerator: number, denominator: number };
            if (explicitRatio) {
              finalRatio = explicitRatio;
            } else {
              // Check default ratio table (access via class name since we're in inner class)
              const defaultRatio = (ChordGridParser as any).DEFAULT_TUPLET_RATIOS[tupletCount];
              if (defaultRatio) {
                finalRatio = defaultRatio;
              } else {
                // Fallback: N notes in the time of (power-of-2 ≤ N) notes
                // For example: 3 notes → 2 (triplet: 3 in time of 2)
                const normalCount = Math.pow(2, Math.floor(Math.log2(tupletCount)));
                finalRatio = {
                  numerator: tupletCount,
                  denominator: normalCount
                };
              }
            }
            
            // Extract the content between { }
            const inner = rhythmStr.slice(i + 1, closeIdx);
            // Split by space to handle sub-groups
            const subGroups = inner.split(' ');
            let tupletNoteIndex = 0;
            
            for (let g = 0; g < subGroups.length; g++) {
              const group = subGroups[g];
              let k = 0;
              let isFirstNoteOfThisSubGroup = true;
              let pendingTieFromPrevious = false;
              
              while (k < group.length) {
                // Handle underscores (ties) in tuplets
                if (group[k] === '_') {
                  if (k === 0) {
                    // Underscore at the start of the sub-group
                    // The previous note must be tied to the next one
                    pendingTieFromPrevious = true;
                  } else {
                    // Underscore after a note: mark the tie
                    if (currentBeat.length > 0) {
                      this.markTieStart(currentBeat);
                    }
                  }
                  k++;
                  continue;
                }
                
                // Parse chaque note du sous-groupe
                let note: NoteElement;
                if (group[k] === '-') {
                  note = this.parseNote(group, k + 1, pickMode, fingerMode);
                  note.isRest = true;
                  k += (note.length ?? 0) + 1;
                } else {
                  note = this.parseNote(group, k, pickMode, fingerMode);
                  k += (note.length ?? 0);
                }
                
                // If an underscore preceded this note
                if (pendingTieFromPrevious) {
                  note.tieEnd = true;
                  pendingTieFromPrevious = false;
                }
                
                // Check if previous note had tieStart (from markTieStart)
                if (this.tieContext.lastNote?.tieStart) {
                  note.tieEnd = true;
                  this.tieContext.lastNote = null;
                }
                
                // Add tuplet property (use tupletCount from annotation and calculated ratio)
                note.tuplet = {
                  count: tupletCount,
                  groupId: `T${i}_${closeIdx}`,
                  position:
                    tupletNoteIndex === 0 ? 'start' :
                    tupletNoteIndex === tupletCount - 1 ? 'end' : 'middle',
                  ratio: finalRatio,
                  explicitRatio: hasExplicitRatio  // true only if user wrote }3:2, false for }3
                };
                // Mark first note of each subgroup after the first with leading space flag
                if (g > 0 && isFirstNoteOfThisSubGroup) {
                  note.hasLeadingSpace = true;
                  isFirstNoteOfThisSubGroup = false;
                }
                currentBeat.push(note);
                tupletNoteIndex++;
              }
            }
            i = j;
            continue;
          }
        }
      }
      
      // Handle [_] forced beam syntax (checked BEFORE standalone _)
      if (rhythmStr[i] === '[' && i + 2 < rhythmStr.length && 
          rhythmStr[i + 1] === '_' && rhythmStr[i + 2] === ']') {
        // Mark last note with forced beam through tie
        if (currentBeat.length > 0) {
          const lastNote = currentBeat[currentBeat.length - 1];
          lastNote.forcedBeamThroughTie = true;
          lastNote.tieStart = true;
          this.tieContext.lastNote = lastNote;
        }
        i += 3; // Skip [_]
        continue;
      }
      
      // Handle underscores (ties)
      if (rhythmStr[i] === '_') {
        if (i === rhythmStr.length - 1) {
          // Underscore at end of rhythmStr segment.
          // If this is the last segment of the measure AND it's the last measure of the line,
          // mark as tieToVoid (cross-line tie). Otherwise, use normal tieStart (intra-measure tie).
          if (isLastSegment && isLastMeasureOfLine) {
            this.markTieToVoid(currentBeat);
          } else {
            this.markTieStart(currentBeat);
          }
        } else if (i === 0 && isFirstMeasureOfLine) {
          // Underscore at very start of the *line* normally means tieFromVoid.
          // But if we already have a tieStart pending from a previous chord segment
          // within the same measure (e.g. A[8_] [_4]) we should treat this as a
          // continuation and NOT as a tie from void. In that case, we simply keep
          // tieContext.lastNote so the next parsed note becomes tieEnd.
          if (this.tieContext.lastNote?.tieStart) {
            // Continuation: do nothing, allow next note to receive tieEnd
          } else {
            pendingTieFromVoid = true;
            this.tieContext.pendingTieToVoid = false;
          }
        } else if (currentBeat.length === 0 && lastBeatLastNoteRef) {
          // Underscore immediately after a space: tie should start from the cloned last note of the PREVIOUS beat
          lastBeatLastNoteRef.tieStart = true;
          this.tieContext.lastNote = lastBeatLastNoteRef;
        } else {
          // Normal case inside a beat: mark tie start on last note of the current beat
          this.markTieStart(currentBeat);
        }
        i++;
        continue;
      }
      // Handle spaces
      if (rhythmStr[i] === ' ') {
        if (currentBeat.length > 0) {
          // Close current beat and remember a reference to its cloned last note for cross-space ties
          const lastIdx = currentBeat.length - 1;
          beats.push(this.createBeat(currentBeat));
          lastBeatLastNoteRef = beats[beats.length - 1].notes[lastIdx] || null;
          currentBeat = [];
        }
        i++;
        continue;
      }
      // Handle rests (-) - let parseNote handle the '-' prefix
      if (rhythmStr[i] === '-') {
        const note = this.parseNote(rhythmStr, i, pickMode, fingerMode);
        currentBeat.push(note);
        i += (note.length ?? 0);
        continue;
      }
      // Read a note value
      const note = this.parseNote(rhythmStr, i, pickMode, fingerMode);
      if (pendingTieFromVoid) {
        note.tieFromVoid = true;
        pendingTieFromVoid = false;
      }
      if (this.tieContext.lastNote?.tieStart) {
        note.tieEnd = true;
        this.tieContext.lastNote = null;
      }
      currentBeat.push(note);
      i += (note.length ?? 0);
    }
    
      if (currentBeat.length > 0) {
      beats.push(this.createBeat(currentBeat));
    }

      // Now update the context to reflect whether THIS group had a leading space
      // so that the next call to analyzeRhythmGroup will see the correct value.
      this.rhythmContext.lastGroupHasSpace = hasSignificantSpace;

      return beats;
  }
  
  private markTieToVoid(notes: NoteElement[]) {
    if (notes.length > 0) {
      const lastNote = notes[notes.length - 1];
      lastNote.tieStart = true;
      lastNote.tieToVoid = true;
      this.tieContext.pendingTieToVoid = true;
    }
  }
  
  private parseNote(rhythmStr: string, startIndex: number, pickMode?: boolean, fingerMode?: 'en' | 'fr'): NoteElement {
    // Check for rest prefix '-'
    let isRest = false;
    let offset = startIndex;
    if (rhythmStr[startIndex] === '-') {
      isRest = true;
      offset += 1;
    }

    // Match only valid note values. For concatenated numbers (e.g. "323216"),
    // prefer the longest match from the allowed set: 64,32,16,8,4,2,1
    const VALID = ['64','32','16','8','4','2','1'];
    for (const v of VALID) {
      if (rhythmStr.startsWith(v, offset)) {
        let len = v.length;
        let dotted = false;
        if (offset + len < rhythmStr.length && rhythmStr[offset + len] === '.') {
          dotted = true;
          len += 1;
        }

        // Check for ghost note 'x' (after value and optional dot, but NOT for rests)
        let isGhost = false;
        if (!isRest && offset + len < rhythmStr.length && rhythmStr[offset + len] === 'x') {
          isGhost = true;
          len += 1;
        }

        // Check for finger symbol or pick direction suffix (after value, dot, and ghost marker)
        let fingerSymbol: string | undefined;
        let pickDirection: 'd' | 'u' | undefined;
        
        const afterValue = rhythmStr.substring(offset + len);
        // Context-aware parsing based on pickMode and fingerMode
        if (pickMode) {
          // PICK MODE: accept d/u and also normalize complex suffixes (md/mu/pd/pu/hd/hu/td/tu → d/u)
          // This allows using finger notation in pick mode without rewriting
          const pickMatch = /^(td|pd|tu|pu|hd|hu|md|mu|d|u)/.exec(afterValue);
          if (pickMatch) {
            let sym = pickMatch[1];
            // Normalize all "up" suffixes to 'u', all "down" suffixes to 'd'
            if (sym.endsWith('u')) {
              pickDirection = 'u';
            } else if (sym.endsWith('d') || sym === 'd') {
              pickDirection = 'd';
            }
            len += pickMatch[0].length;
          }
        } else if (fingerMode) {
          // FINGER MODE: accept d/u/td/pd/tu/pu/hd/hu/md/mu as fingerSymbol
          // Match longest first: td, pd, tu, pu, hd, hu, md, mu (2 chars), then d, u (1 char shortcuts)
          const fingerMatch = /^(td|pd|tu|pu|hd|hu|md|mu|d|u)/.exec(afterValue);
          if (fingerMatch) {
            let sym = fingerMatch[1];
            // Normalize shortcuts: d→td, u→tu in finger mode
            if (sym === 'd') {
              sym = 'td';
            } else if (sym === 'u') {
              sym = 'tu';
            }
            // Normalize French/English: pd→td, pu→tu, md→hd, mu→hu
            if (sym === 'pd') {
              sym = 'td';
            } else if (sym === 'pu') {
              sym = 'tu';
            } else if (sym === 'md') {
              sym = 'hd';
            } else if (sym === 'mu') {
              sym = 'hu';
            }
            fingerSymbol = sym;
            len += fingerMatch[0].length;
          }
        } else {
          // NO MODE: keep old behavior for backward compatibility
          // Match: tu, hu, pu, mu first (2 chars), then t, h, p, m, d, u (1 char)
          const symbolMatch = /^(tu|hu|pu|mu|t|h|p|m|d|u)/.exec(afterValue);
          if (symbolMatch) {
            const sym = symbolMatch[1];
            if (sym === 'd' || sym === 'u') {
              pickDirection = sym;
            } else {
              fingerSymbol = sym;
            }
            len += symbolMatch[0].length;
          }
        }

        // Total length includes the optional '-' prefix
        const totalLen = (offset - startIndex) + len;
        return {
          value: parseInt(v) as NoteValue,
          dotted,
          isGhost,
          fingerSymbol,
          pickDirection,
          tieStart: false,
          tieEnd: false,
          tieToVoid: false,
          tieFromVoid: false,
          isRest,
          position: startIndex,
          length: totalLen
        } as NoteElement;
      }
    }

    // No valid numeric note was found at this position. Consume one character
    // to avoid infinite loops and return a default quarter note placeholder so
    // the parser can continue. This should be rare; ideally callers validate input.
    return {
      value: 4 as NoteValue,
      dotted: false,
      isGhost: false,
      tieStart: false,
      tieEnd: false,
      tieToVoid: false,
      tieFromVoid: false,
      isRest: false,
      position: startIndex,
      length: 1
    } as NoteElement;
  }

  private markTieStart(notes: NoteElement[]) {
    if (notes.length === 0) return;
    const last = notes[notes.length - 1];
    last.tieStart = true;
    this.tieContext.lastNote = last;
    this.tieContext.crossMeasure = true;
  }

  private createBeat(notes: NoteElement[]): Beat {
    // Copier les notes
    const beatNotes = notes.map(n => ({ ...n }));
    
    // Analyze notes for beam group creation
    const beamGroups: BeamGroup[] = [];
    let hasBeam = false;
    
    // Identify notes that can be beamed (eighths and shorter)
    const beamableNotes = beatNotes.filter(n => n.value >= 8 && !n.isRest);
    
    if (beamableNotes.length > 0) {
      // If this group starts with an incoming tie
      const hasIncomingTie = beamableNotes[0].tieEnd || beamableNotes[0].tieFromVoid;
      
      // Significant spaces force a group break
      // If the current group is attached to the previous one (lastGroupHasSpace === false)
      // and the previous contained beamable notes, we must continue the beam
      // even without an explicit underscore (rule: if no space before a note, beams apply for notes >4).
      const prevBeamableCount = this.rhythmContext.lastBeamableNotes.length;
      if (!this.rhythmContext.lastGroupHasSpace && (hasIncomingTie || prevBeamableCount > 0)) {
        // Continue the previous group
        beamGroups.push({
          startIndex: 0,
          endIndex: beamableNotes.length - 1,
          noteCount: prevBeamableCount + beamableNotes.length
        });
        hasBeam = true;
      } else {
        // New independent group
        beamGroups.push({
          startIndex: 0,
          endIndex: beamableNotes.length - 1,
          noteCount: beamableNotes.length
        });
        hasBeam = beamableNotes.length > 1;
      }
    }
    
    // Update context for the next group
    this.rhythmContext.lastBeamableNotes = beamableNotes;
    
    return {
      notes: beatNotes,
      hasBeam,
      beamGroups,
    } as Beat;
  }

  // ...existing code...
}
import { Transposer } from '../utils/Transposer';
import { CountingAnalyzer } from '../analyzer/CountingAnalyzer';
import {
  NoteValue,
  NoteElement,
  Beat,
  Measure,
  BarlineType,
  TimeSignature,
  GroupingMode,
  ChordGrid,
  ValidationError,
  ParseResult,
  BeamGroup,
  ChordSegment,
  VoltaInfo
} from './type';
import {
  ParsedMeasure as AnalyzerParsedMeasure,
  ParsedSegment as AnalyzerParsedSegment,
  ParsedNote as AnalyzerParsedNote,
} from '../analyzer/analyzer-types';
