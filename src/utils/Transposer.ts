/**
 * @file Transposer.ts
 * @description Transpose chords by semitones with tonal analysis
 */

/**
 * Transposer class for transposing chords with music theory awareness
 */
export class Transposer {
  // Chromatic scales
  private static readonly SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  private static readonly FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  // Circle of fifths - major keys preferring sharps
  private static readonly SHARP_KEYS = new Set(['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#']);

  // Circle of fifths - major keys preferring flats  
  private static readonly FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']);

  // Minor keys and their relative majors
  private static readonly RELATIVE_MAJORS: Record<string, string> = {
    'Am': 'C', 'Em': 'G', 'Bm': 'D', 'F#m': 'A', 'C#m': 'E', 'G#m': 'B', 'D#m': 'F#',
    'Dm': 'F', 'Gm': 'Bb', 'Cm': 'Eb', 'Fm': 'Ab', 'Bbm': 'Db', 'Ebm': 'Gb'
  };

  /**
   * Transpose a single chord by semitones
   * @param chord - The chord to transpose (e.g., "Cmaj7", "F#m", "Bb/D")
   * @param semitones - Number of semitones to transpose (positive = up, negative = down)
   * @param preference - Force 'sharp' or 'flat' accidentals
   * @returns Transposed chord
   */
  static transposeChord(
    chord: string,
    semitones: number,
    preference?: 'sharp' | 'flat'
  ): string {
    if (!chord || chord.trim() === '') return '';

    // Extract root note (with accidental)
    const rootMatch = chord.match(/^([A-G][#b]?)/);
    if (!rootMatch) return chord; // Invalid chord, return as-is

    const root = rootMatch[1];
    const suffix = chord.substring(root.length);

    // Handle slash chord (bass note)
    let bassSuffix = '';
    const slashMatch = suffix.match(/^(.*)\/([A-G][#b]?)$/);
    if (slashMatch) {
      const quality = slashMatch[1];
      const bassNote = slashMatch[2];
      const transposedBass = this.transposeNote(bassNote, semitones, preference);
      bassSuffix = `/${transposedBass}`;
      // Continue with main chord quality
      return this.transposeNote(root, semitones, preference) + quality + bassSuffix;
    }

    // Transpose main root note
    const transposedRoot = this.transposeNote(root, semitones, preference);
    return transposedRoot + suffix;
  }

  /**
   * Transpose multiple chords with automatic key analysis
   * @param chords - Array of chords to transpose
   * @param semitones - Number of semitones to transpose
   * @param forceAccidental - Force '#' or 'b' for all chords
   * @returns Array of transposed chords
   */
  static transposeChords(
    chords: string[],
    semitones: number,
    forceAccidental?: '#' | 'b'
  ): string[] {
    if (chords.length === 0) return [];

    let preference: 'sharp' | 'flat' | undefined;

    if (forceAccidental) {
      preference = forceAccidental === '#' ? 'sharp' : 'flat';
    } else {
      // Analyze target key after transposition
      preference = this.analyzeTargetKey(chords, semitones);
    }

    return chords.map(chord => this.transposeChord(chord, semitones, preference));
  }

  /**
   * Transpose a single note (root only, no chord quality)
   * @private
   */
  private static transposeNote(
    note: string,
    semitones: number,
    preference?: 'sharp' | 'flat'
  ): string {
    // Normalize to sharp notation for calculation
    const sharpIndex = this.SHARPS.indexOf(note.replace('b', this.getEnharmonicSharp(note)));
    const flatIndex = this.FLATS.indexOf(note);

    let startIndex: number;
    if (sharpIndex !== -1) {
      startIndex = sharpIndex;
    } else if (flatIndex !== -1) {
      startIndex = flatIndex;
    } else {
      return note; // Invalid note
    }

    // Calculate target index (with octave wrapping)
    let targetIndex = (startIndex + semitones) % 12;
    if (targetIndex < 0) targetIndex += 12;

    // Choose scale based on preference
    if (preference === 'sharp') {
      return this.SHARPS[targetIndex];
    } else if (preference === 'flat') {
      return this.FLATS[targetIndex];
    }

    // Default: prefer natural notes when possible
    const sharpNote = this.SHARPS[targetIndex];
    const flatNote = this.FLATS[targetIndex];

    // If they're the same (natural note), use it
    if (sharpNote === flatNote) return sharpNote;

    // Otherwise, prefer sharps by default (can be improved with key analysis)
    return sharpNote;
  }

  /**
   * Get enharmonic sharp equivalent of a flat note
   * @private
   */
  private static getEnharmonicSharp(flatNote: string): string {
    const enharmonics: Record<string, string> = {
      'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
    };
    return enharmonics[flatNote] || flatNote;
  }

  /**
   * Analyze the target key to determine sharp/flat preference
   * @private
   */
  private static analyzeTargetKey(
    chords: string[],
    semitones: number
  ): 'sharp' | 'flat' {
    // First, try to identify the tonic (most likely the first chord)
    if (chords.length === 0) return 'sharp';

    const firstChord = chords[0];
    const rootMatch = firstChord.match(/^([A-G][#b]?)/);
    if (!rootMatch) return 'sharp';

    const originalRoot = rootMatch[1];
    const isMinor = firstChord.match(/^[A-G][#b]?m(?!aj)/); // "m" but not "maj"

    // Transpose the root to get target key
    const targetRoot = this.transposeNote(originalRoot, semitones, undefined);

    // Check if it's a minor chord - get relative major
    let targetKey = targetRoot;
    if (isMinor) {
      // For minor chords, analyze as relative major
      const minorKey = targetRoot + 'm';
      targetKey = this.RELATIVE_MAJORS[minorKey] || targetRoot;
    }

    // Determine preference based on key
    if (this.SHARP_KEYS.has(targetKey)) {
      return 'sharp';
    } else if (this.FLAT_KEYS.has(targetKey)) {
      return 'flat';
    }

    // Additional heuristic: count existing accidentals in the progression
    const sharpCount = chords.filter(c => c.includes('#')).length;
    const flatCount = chords.filter(c => c.includes('b')).length;

    return flatCount > sharpCount ? 'flat' : 'sharp';
  }
}
