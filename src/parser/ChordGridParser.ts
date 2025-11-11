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
    const firstLine = lines[0];
    
    // Parser la signature temporelle
    const timeSignature = this.parseTimeSignature(firstLine);
    
  // Parser toutes les mesures
  const allMeasures: Measure[] = [];
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const measures = this.parseLine(line, lineIndex === 0);
      
      // Marquer la dernière mesure de chaque ligne
      if (measures.length > 0 && lineIndex < lines.length - 1) {
        measures[measures.length - 1].lineBreakAfter = true;
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
      for (const beat of measure.beats) {
        for (const n of beat.notes) {
          if (!n.value) continue;
          const baseWhole = 1 / n.value; // fraction of whole note
          const dottedMultiplier = n.dotted ? 1.5 : 1;
          const whole = baseWhole * dottedMultiplier;
          foundQuarterNotes += whole * 4; // convert to quarter-note units
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

    return { grid, errors, measures: allMeasures };
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
        for (const beat of seg.beats) {
          for (const n of beat.notes) {
            flatNotes.push({
              value: n.value,
              dotted: !!n.dotted,
              isRest: !!n.isRest,
              tieStart: n.tieStart || false,
              tieEnd: n.tieEnd || false,
              tieToVoid: n.tieToVoid || false,
              tieFromVoid: n.tieFromVoid || false,
            });
          }
        }
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
        lineBreakAfter: m.lineBreakAfter,
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
    // Accept barlines: ||:, :||, ||, |
    const tokens: Array<{bar: string; content: string}> = [];
    // Regex to split while capturing barlines
    const re = /(\|\|:|:?\|\||\|)/g;
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
        tokens.push({bar: p.sep, content: currentText});
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

    // Filter out empty tokens (these come from leading or consecutive barlines)
    const nonEmptyTokens = tokens.filter(t => t.content.trim().length > 0);

    for (let ti = 0; ti < nonEmptyTokens.length; ti++) {
      const t = nonEmptyTokens[ti];
      const text = t.content;
      const bar = t.bar as BarlineType;

      const beats: Beat[] = [];
      let firstChord = '';
      let anySource = '';

      let m2: RegExpExecArray | null;
      // Determine whether this measure is first/last on the line for tie logic
      const isFirstMeasureOfLine = ti === 0;
      const isLastMeasureOfLine = ti === nonEmptyTokens.length - 1;

      const chordSegments: ChordSegment[] = [];
      while ((m2 = segmentRe.exec(text)) !== null) {
        const leadingSpaceCapture = m2[1] || '';
        const chord = (m2[2] || '').trim();
        const rhythm = (m2[3] || '').trim();
        const sourceText = m2[0];
        if (!firstChord && chord) firstChord = chord;
        anySource += (anySource ? ' ' : '') + sourceText;

        if (rhythm.length > 0) {
          // Determine whether there was explicit whitespace before THIS segment
          // Use the capture group from the segment regex which preserves leading spaces
          const hasSignificantSpace = (leadingSpaceCapture || '').length > 0;

          const parsedBeats = analyzer.analyzeRhythmGroup(rhythm, chord, isFirstMeasureOfLine, isLastMeasureOfLine, hasSignificantSpace);
          
          // Créer un segment pour chaque groupe accord/rythme
          chordSegments.push({
            chord: chord,  // utiliser l'accord actuel
            beats: parsedBeats,
            leadingSpace: hasSignificantSpace
          });
          
          beats.push(...parsedBeats); // garder la compatibilité avec le reste du code
        }
      }

          console.log("Parsed chords:", chordSegments.map(s => s.chord));

      measures.push({
        beats,
        chord: firstChord,  // garder pour compatibilité
        chordSegments,     // nouvelle propriété pour tous les accords
        barline: bar,
        lineBreakAfter: false,
        source: anySource || text
      });
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
  private parseTimeSignature(line: string): TimeSignature {
    const m = /^\s*(\d+)\/(\d+)/.exec(line);
    if (m) {
      return {
        numerator: parseInt(m[1], 10),
        denominator: parseInt(m[2], 10)
      } as TimeSignature;
    }
    // Fallback default
    return { numerator: 4, denominator: 4 } as TimeSignature;
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
    hasSignificantSpace: boolean = false
  ): Beat[] {
    // NOTE: we should NOT overwrite lastGroupHasSpace here because the
    // continuity decision in createBeat must use the *previous* group's
    // spacing flag. We'll update lastGroupHasSpace at the end of this
    // function so the next group can observe it.
    const beats: Beat[] = [];
    let currentBeat: NoteElement[] = [];
    let i = 0;
    
    while (i < rhythmStr.length) {
      // Gestion des underscores (liaisons)
      if (rhythmStr[i] === '_') {
        // Si on est à la fin du groupe rythmique et fin de ligne
        if (i === rhythmStr.length - 1 && isLastMeasureOfLine) {
          this.markTieToVoid(currentBeat);
        } else if (i === 0 && isFirstMeasureOfLine) {
          // Liaison depuis le vide (début de ligne)
          this.tieContext.pendingTieToVoid = false;
        } else {
          this.markTieStart(currentBeat);
        }
        i++;
        continue;
      }
      
      // Gestion des espaces
      if (rhythmStr[i] === ' ') {
        if (currentBeat.length > 0) {
          beats.push(this.createBeat(currentBeat));
          currentBeat = [];
        }
        i++;
        continue;
      }
      
      // NEW: Gestion des silences (-)
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
      
      // NEW: Gestion liaison depuis le vide
      if (i === 0 && isFirstMeasureOfLine && rhythmStr[0] === '_') {
        note.tieFromVoid = true;
      }
      
      // Gestion de la liaison entrante normale
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
    // Match only valid note values. For concatenated numbers (e.g. "323216"),
    // prefer the longest match from the allowed set: 64,32,16,8,4,2,1
    const VALID = ['64','32','16','8','4','2','1'];
    for (const v of VALID) {
      if (rhythmStr.startsWith(v, startIndex)) {
        let len = v.length;
        let dotted = false;
        if (startIndex + len < rhythmStr.length && rhythmStr[startIndex + len] === '.') {
          dotted = true;
          len += 1;
        }
        return {
          value: parseInt(v) as NoteValue,
          dotted,
          tieStart: false,
          tieEnd: false,
          tieToVoid: false,
          tieFromVoid: false,
          isRest: false,
          position: startIndex,
          length: len
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
  ChordGrid,
  ValidationError,
  ParseResult,
  BeamGroup,
  ChordSegment
} from './type';
import {
  ParsedMeasure as AnalyzerParsedMeasure,
  ParsedSegment as AnalyzerParsedSegment,
  ParsedNote as AnalyzerParsedNote,
} from '../analyzer/analyzer-types';
