/**
 * @file ChordGridParser.ts
 * @description Parser pour la notation textuelle des grilles d'accords.
 *
 * Ce parser transforme une grille d'accords en notation textuelle en une structure
 * d'objets ChordGrid contenant des mesures, des beats et des notes.
 *
 * Responsabilités :
 * - Lecture de la signature temporelle (placée au début de la première ligne, ex: "4/4")
 * - Parsing des mesures et des groupes rythmiques en structures Measure/Beat/Note
 * - Marquage des sauts de ligne et regroupement des mesures en lignes de rendu
 * - Gestion des ligatures (beams) entre notes selon les espaces et les beats
 * - Gestion des liaisons (ties) entre notes, y compris entre mesures
 * - Validation de la durée totale de chaque mesure par rapport à la signature temporelle
 *
 * Syntaxe supportée :
 * - Signature temporelle : `4/4`, `3/4`, `6/8`, etc.
 * - Barres de mesure : `|` (simple), `||` (double), `||:` (début de reprise), `:||` (fin de reprise)
 * - Accords : notation standard (Am, C, Gmaj7, F#m, Bb7, etc.)
 * - Notes : 1 (ronde), 2 (blanche), 4 (noire), 8 (croche), 16 (double-croche), 32, 64
 * - Notes pointées : ajout d'un point après le chiffre (ex: `4.`, `8.`)
 * - Silences : préfixe `-` devant la valeur (ex: `-4` pour un soupir)
 * - Liaisons : underscore `_` pour lier des notes (ex: `4_88_` ou `[_8]`)
 * - Ligatures : notes groupées sans espace sont liées par une ligature (ex: `88` = 2 croches liées)
 * - Ligature forcée avec liaison : `[_]` force la ligature à continuer malgré la liaison
 *   (ex: `888[_]88` = liaison ET ligature, vs `888 _88` = liaison SANS ligature)
 *
 * @example
 * ```typescript
 * const parser = new ChordGridParser();
 * const result = parser.parse("4/4 ||: Am[88 4 4 88] | C[2 4 4] :||");
 * // result.grid contient la structure parsée
 * // result.errors contient les erreurs de validation éventuelles
 * ```
 *
 * @see {@link BeamAndTieAnalyzer} pour l'analyse des ligatures et liaisons
 * @see {@link Measure} pour la structure d'une mesure
 * @see {@link Beat} pour la structure d'un beat
 * @see {@link Note} pour la structure d'une note
 */
export class ChordGridParser {

  /**
   * Table des ratios par défaut pour les tuplets courants.
   * 
   * Convention musicale (compatible MuseScore) :
   * N:M signifie "N unités de baseLen dans le temps de M unités de même valeur"
   * 
   * baseLen = la plus petite valeur rythmique du tuplet (unité de référence)
   * 
   * Exemples :
   * - {8 8 8}3:2 → 3 croches dans le temps de 2 croches (baseLen = 1/8)
   * - {816-16 1616 8 8}5:4 → contenu équivalent à 5 croches dans le temps de 4 croches (baseLen = 1/16)
   * - {16 16 16}3:2 → 3 doubles-croches dans le temps de 2 doubles-croches (baseLen = 1/16)
   * 
   * Le ratio appliqué est : durée_réelle = durée_cumulative × (M/N)
   * où durée_cumulative est exprimée en unités de baseLen
   * 
   * Cette table peut être étendue selon les besoins musicaux.
   * Pour imposer un ratio spécifique, utiliser la syntaxe {...}N:M
   */
  private static readonly DEFAULT_TUPLET_RATIOS: Record<number, { numerator: number, denominator: number }> = {
    // Tuplets en temps simple (les plus courants)
    3: { numerator: 3, denominator: 2 },   // Triplet : 3 notes dans le temps de 2
    5: { numerator: 5, denominator: 4 },   // Quintuplet : 5 notes dans le temps de 4
    6: { numerator: 6, denominator: 4 },   // Sextuplet : 6 notes dans le temps de 4
    7: { numerator: 7, denominator: 4 },   // Septuplet : 7 notes dans le temps de 4
    9: { numerator: 9, denominator: 8 },   // Nonuplet : 9 notes dans le temps de 8
    10: { numerator: 10, denominator: 8 }, // Décuplet : 10 notes dans le temps de 8
    11: { numerator: 11, denominator: 8 }, // 11-uplet : 11 notes dans le temps de 8
    12: { numerator: 12, denominator: 8 }, // 12-uplet : 12 notes dans le temps de 8
    13: { numerator: 13, denominator: 8 }, // 13-uplet : 13 notes dans le temps de 8
    15: { numerator: 15, denominator: 8 }, // 15-uplet : 15 notes dans le temps de 8
    
    // Tuplets en temps composé (moins courants, mais nécessaires)
    2: { numerator: 2, denominator: 3 },   // Duplet : 2 notes dans le temps de 3
    4: { numerator: 4, denominator: 3 },   // Quadruplet : 4 notes dans le temps de 3
    8: { numerator: 8, denominator: 6 },   // Octuplet : 8 notes dans le temps de 6
  };

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
   * Parse une grille d'accords en notation textuelle.
   * 
   * @param input - Chaîne contenant la grille d'accords en notation textuelle
   * @returns Objet ParseResult contenant :
   *   - grid : la structure ChordGrid parsée
   *   - errors : tableau d'erreurs de validation (mesures mal formées)
   *   - measures : tableau de toutes les mesures
   */
  parse(input: string): ParseResult {
    const lines = input.trim().split('\n');
    
    // Détection des mots-clés stems-up/down et show% sur la première ligne (dans n'importe quel ordre)
    let stemsDirection: 'up' | 'down' = 'up';
    let displayRepeatSymbol = false;
    let timeSignatureLine = lines[0];
    
    // Check for stems keywords (anywhere in the line)
    if (/stems-down/i.test(timeSignatureLine)) {
      stemsDirection = 'down';
      timeSignatureLine = timeSignatureLine.replace(/stems-down\s*/i, '');
    } else if (/stems-up/i.test(timeSignatureLine)) {
      stemsDirection = 'up';
      timeSignatureLine = timeSignatureLine.replace(/stems-up\s*/i, '');
    }
    
    // Check for show% keyword (anywhere in the line)
    if (/show%/i.test(timeSignatureLine)) {
      displayRepeatSymbol = true;
      timeSignatureLine = timeSignatureLine.replace(/show%\s*/i, '');
    }
    
    // Remove leading whitespace after removing directives
    timeSignatureLine = timeSignatureLine.trim();
    
    // Si après avoir retiré les directives la ligne est vide, utiliser la ligne suivante pour la signature
    if (timeSignatureLine === '' && lines.length > 1) {
      timeSignatureLine = lines[1];
      // Reconstruire lines en supprimant la première ligne vide et en utilisant la deuxième
      lines.splice(0, 2, timeSignatureLine);
    } else {
      // Mettre à jour la première ligne
      lines[0] = timeSignatureLine;
    }

    // Parser la signature temporelle
    const timeSignature = this.parseTimeSignature(timeSignatureLine);

    // Retirer le motif "N/M" ou "N/M binary/ternary/noauto" de la première ligne
    // pour éviter qu'il soit parsé comme mesure
    // Ne consomme PAS les barlines pour permettre leur parsing correct
    timeSignatureLine = timeSignatureLine.replace(/^\s*\d+\/\d+(?:\s+(?:binary|ternary|noauto))?\s*/, '');
    lines[0] = timeSignatureLine;
    
  // Parser toutes les mesures
  const allMeasures: Measure[] = [];
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const measures = this.parseLine(line, lineIndex === 0);
      
      // Marquer la dernière mesure de chaque ligne
      if (measures.length > 0 && lineIndex < lines.length - 1) {
        measures[measures.length - 1].isLineBreak = true;
      }
      
      allMeasures.push(...measures);
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
    const expectedQuarterNotes = timeSignature.numerator * (4 / timeSignature.denominator);

    for (let mi = 0; mi < allMeasures.length; mi++) {
      const measure = allMeasures[mi];
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
            // Convention musicale (compatible MuseScore) :
            // N:M signifie "N unités de baseLen dans le temps de M unités de même valeur"
            // Exemple : {816-16 1616 8 8}5:4 = 5 croches dans le temps de 4 croches
            //           où N=5 représente la durée cumulative normalisée (10 doubles-croches = 5 croches)
            // Calcul : durée_réelle = (cumulativeDuration / N) × M
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

      // Allow a small epsilon for fp rounding
      const diff = Math.abs(foundQuarterNotes - expectedQuarterNotes);
      if (diff > 1e-6) {
        errors.push({
          measureIndex: mi,
          measureSource: measure.source,
          expectedQuarterNotes,
          foundQuarterNotes,
          message: `Measure ${mi + 1}: expected ${expectedQuarterNotes} quarter-notes, found ${foundQuarterNotes.toFixed(3)} (diff ${diff.toFixed(3)})`
        });
      }
    }

  return { grid, errors, measures: allMeasures, stemsDirection, displayRepeatSymbol };
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
        timeSignature: result.grid.timeSignature,
        barline: m.barline,
        isLineBreak: m.isLineBreak,
        source: m.source,
      } as AnalyzerParsedMeasure;
    });

    return { timeSignature: result.grid.timeSignature, measures };
  }
  
  private parseLine(line: string, isFirstLine: boolean): Measure[] {
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
    // Capture volta notation: |.1 or :||.4 or |.1-3 or |.1,2,3
    const re = /(\|\|:(?:\.[\d,-]+)?|:?\|\|(?:x\d+)?(?:\.[\d,-]+)?|\|(?:\.[\d,-]+)?)/g;
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
        
        // Extract volta notation (e.g., |.1-3 or :||.4)
        const voltaMatch = /^(.+?)\.(\d+(?:-\d+)?(?:,\d+)*)$/.exec(barline);
        if (voltaMatch) {
          barline = voltaMatch[1]; // Extract || or :|| or |
          volta = voltaMatch[2];   // Extract "1-3" or "4" or "1,2,3"
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
    let lastExplicitMeasure: Measure | null = null;
    
    // Track pending start repeat barline (||:) that should apply to next measure
    let pendingStartBarline: string | null = null;
    
    // Track pending volta that should apply to next measure
    let pendingVolta: string | undefined = undefined;
    
    // Track if the pending volta comes AFTER a :|| (for determining open vs closed bracket)
    let pendingVoltaIsAfterRepeatEnd = false;

    for (let ti = 0; ti < tokens.length; ti++) {
      const t = tokens[ti];
      
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
      if (t.content.trim().length === 0) {
        // But check for volta that should apply to next measure
        if (t.volta) {
          pendingVolta = t.volta;
        }
        continue;
      }
      
      const text = t.content;
      const bar = t.bar as BarlineType;

      // REPEAT NOTATION DETECTION
      // Check for '%' (repeat entire previous measure)
      if (text.trim() === '%') {
        if (!lastExplicitMeasure) {
          console.warn("Cannot use '%' repeat notation on first measure");
          continue;
        }
        const clonedMeasure = this.cloneMeasure(lastExplicitMeasure, bar, t.repeatCount);
        
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

            const parsedBeats = analyzer.analyzeRhythmGroup(rhythm, chord, isFirstMeasureOfLine, isLastMeasureOfLine, hasSignificantSpace, isLastSegment);
            
            // Créer un segment pour chaque groupe accord/rythme
            chordSegments.push({
              chord: chord,  // utiliser l'accord actuel
              beats: parsedBeats,
              leadingSpace: hasSignificantSpace
            });
            
            beats.push(...parsedBeats); // garder la compatibilité avec le reste du code
          }
          segmentIndex++;
        }
      } else {
        // No brackets: treat entire content as rhythm group without chord
        const rhythm = text.trim();
        anySource = text;
        
        if (rhythm.length > 0) {
          const parsedBeats = analyzer.analyzeRhythmGroup(rhythm, '', isFirstMeasureOfLine, isLastMeasureOfLine, false, true);
          
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
        chord: firstChord,  // garder pour compatibilité
        chordSegments,     // nouvelle propriété pour tous les accords
        barline: bar,
        isLineBreak: false,
        source: anySource || text
      };

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

      measures.push(newMeasure);
      
      // After creating the measure, check if this token's barline has a volta
      // If so, store it for the NEXT measure
      if (t.volta) {
        pendingVolta = t.volta;
        // Check if this volta comes after a :|| barline
        pendingVoltaIsAfterRepeatEnd = (bar === ':||');
      }
      
      // Update reference to last explicit measure (for % notation)
      lastExplicitMeasure = newMeasure;
    }

    // POST-PROCESSING: Determine volta spanning (voltaEnd)
    // A volta spans from where it starts until:
    // - The next volta starts (different volta)  
    // - A repeat start barline is encountered (||:)
    // - End of measures
    // Note: A volta CAN include the measure with :|| (repeat end)
    for (let i = 0; i < measures.length; i++) {
      const measure = measures[i] as any;
      if (measure.voltaStart) {
        // Find the end of this volta
        let endIndex = i;
        for (let j = i + 1; j < measures.length; j++) {
          const nextMeasure = measures[j] as any;
          // Stop BEFORE a new volta or repeat start
          if (nextMeasure.voltaStart || nextMeasure.isRepeatStart) {
            break;
          }
          endIndex = j;
          // But stop AFTER a repeat end (include it in the volta)
          if (nextMeasure.isRepeatEnd) {
            break;
          }
        }
        
        // Mark the end measure with voltaEnd (same volta info)
        if (endIndex > i) {
          (measures[endIndex] as any).voltaEnd = measure.voltaStart;
        } else {
          // Single measure volta - both start and end on same measure
          (measures[i] as any).voltaEnd = measure.voltaStart;
        }
      }
    }

    return measures;
  }

  /**
   * Parse la signature temporelle depuis la première ligne.
   * 
   * @param line - Première ligne contenant la signature temporelle (ex: "4/4 ||: C[4 4 4 4]")
   * @returns Objet TimeSignature avec numérateur et dénominateur
   * @default { numerator: 4, denominator: 4 } si aucune signature n'est trouvée
   */
  /**
   * Parse la signature temporelle et le mode de groupement optionnel.
   * 
   * Syntaxe : "4/4" ou "4/4 binary" ou "6/8 ternary"
   * 
   * @param line - Première ligne contenant la signature temporelle
   * @returns Objet TimeSignature avec numerator, denominator et groupingMode
   */
  private parseTimeSignature(line: string): TimeSignature {
    // Match: "4/4" optionally followed by "binary", "ternary", or "noauto"
    const m = /^\s*(\d+)\/(\d+)(?:\s+(binary|ternary|noauto))?/.exec(line);
    if (m) {
      const numerator = parseInt(m[1], 10);
      const denominator = parseInt(m[2], 10);
      const groupingMode = (m[3] as GroupingMode) || 'auto';
      
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
      groupingMode: 'auto'
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
      isRepeat: true
    };

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
   * Regroupe les mesures en lignes pour le rendu.
   * 
   * @param measures - Tableau de toutes les mesures
   * @param perLine - Nombre de mesures par ligne (généralement 4)
   * @returns Tableau de lignes, chaque ligne contenant un tableau de mesures
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
 * @description Analyseur de ligatures (beams) et de liaisons (ties) pour la notation rythmique.
 * 
 * Cette classe est responsable de :
 * - Analyser les groupes rythmiques et déterminer quelles notes doivent être liées par des ligatures
 * - Gérer les liaisons entre notes (ties), y compris entre mesures et lignes
 * - Parser les valeurs de notes individuelles (avec points et silences)
 * - Créer les structures Beat avec les informations de ligature appropriées
 * 
 * Règles de ligature :
 * - Les notes sans espace entre elles sont groupées dans le même beat et liées
 * - Un espace sépare les beats et donc les groupes de ligature
 * - Les silences brisent les ligatures
 * - Un espace avant un accord peut briser la ligature entre segments
 * 
 * Règles de liaison :
 * - L'underscore `_` marque le début d'une liaison
 * - Une liaison peut traverser les limites de mesure
 * - Une liaison "to void" marque une note qui se lie à une note virtuelle en fin de ligne
 * - Une liaison "from void" marque une note qui reçoit une liaison depuis une note virtuelle
 */
class BeamAndTieAnalyzer {
  
  private tieContext: {
    lastNote: NoteElement | null;
    crossMeasure: boolean;
    crossLine: boolean;      // NEW
    pendingTieToVoid: boolean; // NEW
  };

  // Garder le contexte du dernier groupe de notes pour détecter
  // si deux segments doivent être liés ou séparés
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
    isLastSegment: boolean = true
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
      // Détection d'un tuplet : { ... }N
      if (rhythmStr[i] === '{') {
        // Chercher la fermeture '}'
        const closeIdx = rhythmStr.indexOf('}', i);
        if (closeIdx > i) {
          // Chercher le chiffre du tuplet et le ratio optionnel après '}'
          // Format: }N ou }N:M
          let numStr = '';
          let j = closeIdx + 1;
          while (j < rhythmStr.length && /\d/.test(rhythmStr[j])) {
            numStr += rhythmStr[j];
            j++;
          }
          
          // Vérifier si un ratio explicite est fourni (:M)
          let explicitRatio: { numerator: number, denominator: number } | undefined;
          if (j < rhythmStr.length && rhythmStr[j] === ':') {
            j++; // Passer le ':'
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
            }
          }
          
          const tupletCount = parseInt(numStr, 10);
          if (tupletCount > 0) {
            // Extraire le contenu entre { }
            const inner = rhythmStr.slice(i + 1, closeIdx);
            // Split par espace pour gérer les sous-groupes
            const subGroups = inner.split(' ');
            let tupletNoteIndex = 0;
            
            for (let g = 0; g < subGroups.length; g++) {
              const group = subGroups[g];
              let k = 0;
              let isFirstNoteOfThisSubGroup = true;
              let pendingTieFromPrevious = false;
              
              while (k < group.length) {
                // Gestion des underscores (liaisons) dans les tuplets
                if (group[k] === '_') {
                  if (k === 0) {
                    // Underscore au début du sous-groupe
                    // La note précédente doit être liée à la suivante
                    pendingTieFromPrevious = true;
                  } else {
                    // Underscore après une note : marquer la liaison
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
                  note = this.parseNote(group, k + 1);
                  note.isRest = true;
                  k += (note.length ?? 0) + 1;
                } else {
                  note = this.parseNote(group, k);
                  k += (note.length ?? 0);
                }
                
                // Si un underscore précédait cette note
                if (pendingTieFromPrevious) {
                  note.tieEnd = true;
                  pendingTieFromPrevious = false;
                }
                
                // Check if previous note had tieStart (from markTieStart)
                if (this.tieContext.lastNote?.tieStart) {
                  note.tieEnd = true;
                  this.tieContext.lastNote = null;
                }
                
                // Ajout propriété tuplet (use tupletCount from annotation)
                note.tuplet = {
                  count: tupletCount,
                  groupId: `T${i}_${closeIdx}`,
                  position:
                    tupletNoteIndex === 0 ? 'start' :
                    tupletNoteIndex === tupletCount - 1 ? 'end' : 'middle',
                  ...(explicitRatio && { ratio: explicitRatio })
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
      
      // Gestion des [_] forced beam syntax (checked BEFORE standalone _)
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
      
      // Gestion des underscores (liaisons)
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
      // Gestion des espaces
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
      // Gestion des silences (-)
      if (rhythmStr[i] === '-') {
        i++;
        const note = this.parseNote(rhythmStr, i);
        note.isRest = true;
        currentBeat.push(note);
        i += (note.length ?? 0);
        continue;
      }
      // Lecture d'une valeur de note
      const note = this.parseNote(rhythmStr, i);
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
  
  private parseNote(rhythmStr: string, startIndex: number): NoteElement {
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
        // Total length includes the optional '-' prefix
        const totalLen = (offset - startIndex) + len;
        return {
          value: parseInt(v) as NoteValue,
          dotted,
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
    
    // Analyser les notes pour la création de groupes de ligature
    const beamGroups: BeamGroup[] = [];
    let hasBeam = false;
    
    // Identifier les notes qui peuvent être liées (croches et plus courtes)
    const beamableNotes = beatNotes.filter(n => n.value >= 8 && !n.isRest);
    
    if (beamableNotes.length > 0) {
      // Si ce groupe commence par une liaison entrante
      const hasIncomingTie = beamableNotes[0].tieEnd || beamableNotes[0].tieFromVoid;
      
      // Les espaces significatifs forcent une rupture de groupe
      // Si le groupe courant est collé au précédent (lastGroupHasSpace === false)
      // et que le précédent contenait des notes beameables, on doit continuer la ligature
      // même sans underscore explicite (règle: si pas d'espace avant une note, liaisons s'appliquent pour notes >4).
      const prevBeamableCount = this.rhythmContext.lastBeamableNotes.length;
      if (!this.rhythmContext.lastGroupHasSpace && (hasIncomingTie || prevBeamableCount > 0)) {
        // Continuer le groupe précédent
        beamGroups.push({
          startIndex: 0,
          endIndex: beamableNotes.length - 1,
          noteCount: prevBeamableCount + beamableNotes.length
        });
        hasBeam = true;
      } else {
        // Nouveau groupe indépendant
        beamGroups.push({
          startIndex: 0,
          endIndex: beamableNotes.length - 1,
          noteCount: beamableNotes.length
        });
        hasBeam = beamableNotes.length > 1;
      }
    }
    
    // Mettre à jour le contexte pour le prochain groupe
    this.rhythmContext.lastBeamableNotes = beamableNotes;
    
    return {
      notes: beatNotes,
      hasBeam,
      beamGroups,
    } as Beat;
  }

  // ...existing code...
}
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
