/**
 * @file StrumPatternRenderer.ts
 * @description Automatic assignment of strum patterns (pick strokes and fingerstyle).
 * 
 * This module handles the logic for assigning playing technique symbols to notes:
 * - Pick strokes (down/up strokes for plectrum playing)
 * - Fingerstyle symbols (thumb/fingers for classical guitar)
 * 
 * Priority System (highest to lowest):
 * 1. Explicit symbols: User-defined symbols in the notation (e.g., 8pd, 4mu)
 * 2. Predefined patterns: Time signature-specific patterns from FINGER_PATTERNS
 * 3. Automatic alternation: Fallback algorithm that alternates based on rhythm
 * 
 * Architecture:
 * - This file contains the LOGIC (algorithms)
 * - constants.ts contains the DATA (pattern definitions)
 * - SVGRenderer.ts uses this module to assign and render symbols
 * 
 * @version 2.2.0
 * @see {@link FINGER_PATTERNS} in constants.ts for pattern definitions
 */

import { ChordGrid, NoteElement, Beat } from '../parser/type';
import { FINGER_PATTERNS } from './constants';

/**
 * Represents a note's position in the rhythmic timeline
 */
interface NoteOnTimeline {
    measureIndex: number;
    chordIndex: number;
    beatIndex: number;
    noteIndex: number;
    subdivisionStart: number;
    isAttack: boolean;
    value: number;
    explicitSymbol?: string; // Explicit symbol from user (highest priority)
}

/**
 * Represents a position in the rhythmic timeline with assigned direction
 */
interface TimelineSlot {
    direction: 'down' | 'up';
    subdivisionIndex: number;
    symbol?: string; // Normalized symbol (e.g., 'pd', 'pu', 'md', 'mu' for finger mode)
}

/**
 * Configuration for pattern assignment
 */
interface PatternConfig {
    mode: 'pick' | 'finger';
    language?: 'en' | 'fr'; // For fingerstyle translation
}

/**
 * Main class for strum pattern logic
 */
export class StrumPatternRenderer {
    
    /**
     * Detect the global subdivision (8, 16, 32, or 64) across the entire grid.
     * 
     * Rule: Return the smallest note value found (highest numeric value).
     * 
     * This determines the "grain" of the rhythmic timeline for alternation.
     * 
     * @param grid - Complete chord grid
     * @returns 8, 16, 32, or 64 (subdivision unit)
     */
    public static detectGlobalSubdivision(grid: ChordGrid): 8 | 16 | 32 | 64 {
        let smallestValue = 8; // Default to eighth notes
        
        for (const measure of grid.measures) {
            // Build map of tuplet groups to determine their baseLen
            const groupBase: Record<string, number> = {};
            
            // First pass: collect baseLen for each tuplet group
            for (const seg of (measure.chordSegments || [])) {
                for (const beat of seg.beats) {
                    for (const n of beat.notes) {
                        if (n.tuplet) {
                            const gid = n.tuplet.groupId;
                            const prev = groupBase[gid] ?? 0;
                            // baseLen = shortest duration => largest numeric value
                            groupBase[gid] = Math.max(prev, n.value);
                        }
                    }
                }
            }
            
            // Second pass: inspect attacks
            for (const seg of (measure.chordSegments || [])) {
                for (const beat of seg.beats) {
                    for (const n of beat.notes) {
                        // Skip non-attacks
                        if (n.isRest || n.tieEnd || n.tieFromVoid) continue;
                        
                        let effectiveValue: number = n.value;
                        
                        // For tuplet notes, use the baseLen
                        if (n.tuplet) {
                            const gid = n.tuplet.groupId;
                            const base = groupBase[gid] || n.value;
                            effectiveValue = Math.max(effectiveValue, base);
                        }
                        
                        // Track the smallest note value (largest number)
                        if (effectiveValue > smallestValue) {
                            smallestValue = effectiveValue as 8 | 16 | 32 | 64;
                        }
                    }
                }
            }
        }
        
        // Return the detected subdivision (8, 16, 32, or 64)
        return smallestValue as 8 | 16 | 32 | 64;
    }

    /**
     * Detect the smallest subdivision within a specific beat.
     * 
     * @param beat - Beat object containing notes
     * @returns 4, 8, 16, 32, or 64 (subdivision unit for this beat)
     */
    private static detectBeatSubdivision(beat: Beat): 4 | 8 | 16 | 32 | 64 {
        let smallestValue = 4; // Default to quarter notes
        
        for (const note of beat.notes) {
            // Skip non-attacks
            if (note.isRest || note.tieEnd || note.tieFromVoid) continue;
            
            if (note.value > smallestValue) {
                smallestValue = note.value as 4 | 8 | 16 | 32 | 64;
            }
        }
        
        return smallestValue as 4 | 8 | 16 | 32 | 64;
    }
    
    /**
     * Build a rhythmic timeline and assign directions to each note.
     * 
     * This is the core algorithm that:
     * 1. Builds a continuous timeline of all notes
     * 2. Applies the 3-level priority system:
     *    - Level 1: Explicit symbols (user-defined)
     *    - Level 2: Predefined patterns (time signature-specific)
     *    - Level 3: Automatic alternation (fallback)
     * 
     * @param grid - Complete chord grid
     * @param config - Configuration (pick or finger mode)
     * @returns Array of notes with assigned directions
     */
    public static assignDirections(
        grid: ChordGrid,
        config: PatternConfig
    ): Array<NoteOnTimeline & { assignedDirection: 'down' | 'up'; assignedSymbol?: string }> {
        
        // Detect the global subdivision (8, 16, 32, 64)
        const globalStep = this.detectGlobalSubdivision(grid);
        
        // Cap baseStep at 16 if 32/64 detected globally
        // Beats containing 32/64 will use their local step
        const baseStep = Math.min(globalStep, 16);
        
        // Build timeline of all notes
        const notesOnTimeline: NoteOnTimeline[] = [];
        let currentSubdivision = 0;
        
        grid.measures.forEach((measure, measureIndex) => {
            const segments = measure.chordSegments || [];
            segments.forEach((segment, chordIndex) => {
                segment.beats.forEach((beat, beatIndex) => {
                    // Detect the smallest subdivision in this beat
                    const beatStep = this.detectBeatSubdivision(beat);
                    
                    // Use beatStep if >= 32, otherwise use baseStep
                    const effectiveStep = beatStep >= 32 ? beatStep : baseStep;
                    
                    beat.notes.forEach((note, noteIndex) => {
                        // Calculate duration in subdivisions
                        const noteDuration = note.value;
                        const dottedMultiplier = note.dotted ? 1.5 : 1;
                        const subdivisionCount = Math.round((effectiveStep / noteDuration) * dottedMultiplier);
                        
                        // Check for explicit symbol
                        let explicitSymbol: string | undefined;
                        if (config.mode === 'pick' && note.pickDirection) {
                            explicitSymbol = note.pickDirection; // 'd' or 'u'
                        } else if (config.mode === 'finger' && note.fingerSymbol) {
                            explicitSymbol = note.fingerSymbol; // 'pd', 'pu', 'md', 'mu', etc.
                        }
                        
                        // Is this a real attack?
                        const isAttack = !note.isRest && !note.tieEnd && !note.tieFromVoid;
                        
                        notesOnTimeline.push({
                            measureIndex,
                            chordIndex,
                            beatIndex,
                            noteIndex,
                            subdivisionStart: currentSubdivision,
                            isAttack,
                            value: note.value,
                            explicitSymbol
                        });
                        
                        currentSubdivision += subdivisionCount;
                    });
                });
            });
        });
        
        // Get time signature
        const timeSignature = grid.timeSignature;
        const tsKey = `${timeSignature.numerator}/${timeSignature.denominator}`;
        
        // DEBUG FLAG: Set to true to disable predefined patterns and use only automatic logic
        const DEBUG_DISABLE_PATTERNS = false;
        
        // Try to get predefined pattern
        const patternConfig = FINGER_PATTERNS[tsKey];
        const patternArray = DEBUG_DISABLE_PATTERNS ? undefined : patternConfig?.pattern;
        
        // Determine how many beats the pattern covers based on subdivision
        // Rule: pattern covers 2 beats for eighths (8), 1 beat for sixteenths (16), 1/2 beat for thirty-seconds (32)
        // Formula: patternBeats = 16 / globalStep
        let patternBeats: number;
        if (globalStep === 8) {
            patternBeats = 2; // Pattern covers 2 beats (8pd 8pu 8md 8pu)
        } else if (globalStep === 16) {
            patternBeats = 1; // Pattern covers 1 beat (16pd 16pu 16md 16pu)
        } else if (globalStep >= 32) {
            patternBeats = 0.5; // Pattern covers 1/2 beat (32pd 32pu 32md 32pu)
        } else {
            patternBeats = 2; // Default fallback
        }
        
        // Calculate subdivisions per beat (for pattern reset logic)
        // The beat unit is typically a quarter note (value 4)
        // For 4/4, 3/4, 2/4: beat = quarter note = 4
        // - globalStep=8 → 8/4 = 2 subdivisions per beat
        // - globalStep=16 → 16/4 = 4 subdivisions per beat
        // - globalStep=32 → 32/4 = 8 subdivisions per beat
        const beatValue = 4; // Quarter note (noire) is standard beat
        const subdivisionsPerBeat = globalStep / beatValue;
        
        // Build timeline with directions
        const timeline: TimelineSlot[] = [];
        
        if (patternArray && config.mode === 'finger') {
            // PRIORITY LEVEL 2: Use predefined pattern
            // Map pattern onto timeline based on pattern duration
            
            // Calculate how many subdivisions each pattern element covers
            const totalPatternSubdivisions = patternBeats * subdivisionsPerBeat;
            const subdivPerPatternElement = totalPatternSubdivisions / patternArray.length;
            
            for (let i = 0; i < currentSubdivision; i++) {
                // Find which pattern element this subdivision belongs to
                const positionInPattern = i % totalPatternSubdivisions;
                const patternIndex = Math.floor(positionInPattern / subdivPerPatternElement);
                const rawSymbol = patternArray[patternIndex];
                
                // Normalize pattern symbol to ensure consistency
                const normalizedSymbol = this.normalizeFingerSymbol(rawSymbol, config.language || 'fr');
                // Convert symbol to direction (symbols ending with 'u' are 'up')
                const direction = normalizedSymbol.endsWith('u') ? 'up' : 'down';
                timeline.push({ direction, subdivisionIndex: i, symbol: normalizedSymbol });
            }
        } else {
            // PRIORITY LEVEL 3: Automatic alternation (fallback)
            
            // Base pattern for finger mode: pd pu md pu (4 elements)
            const basePattern = ['t', 'tu', 'h', 'tu'];
            
            // TWO DIFFERENT BEHAVIORS based on step:
            //
            // 1) step > 8 (16ths, 32nds, etc.):
            //    Pattern resets at each BEAT
            //    - step=16: pattern covers 1 beat (4 subdivisions)
            //    - step=32: pattern repeats 2x per beat (8 subdivisions)
            //    - step=64: pattern repeats 4x per beat (16 subdivisions)
            //
            // 2) step <= 8 (8ths or slower):
            //    Pattern stretches over 2 BEATS
            //    - Example: 8pd 8pu 8md 8pu (4 subdivisions over 2 beats)
            
            // Create timeline: pattern cycles based on subdivision position
            for (let i = 0; i < currentSubdivision; i++) {
                let direction: 'down' | 'up';
                let symbol: string | undefined;
                
                if (config.mode === 'finger') {
                    let patternIndex: number;
                    
                    if (globalStep > 8) {
                        // Pattern resets at each beat
                        const positionInBeat = i % subdivisionsPerBeat;
                        patternIndex = positionInBeat % basePattern.length;
                    } else {
                        // Pattern stretches over multiple beats
                        patternIndex = i % basePattern.length;
                    }
                    
                    const rawSymbol = basePattern[patternIndex];
                    symbol = this.normalizeFingerSymbol(rawSymbol, config.language || 'en');
                    direction = symbol.endsWith('u') ? 'up' : 'down';
                } else {
                    // Pick mode: simple down/up alternation
                    const isDown = i % 2 === 0;
                    direction = isDown ? 'down' : 'up';
                }
                
                timeline.push({
                    direction,
                    subdivisionIndex: i,
                    symbol
                });
            }
        }
        
        // Assign directions to attacks
        const result = notesOnTimeline
            .filter(n => n.isAttack)
            .map(n => {
                // PRIORITY LEVEL 1: Explicit symbol (highest priority)
                if (n.explicitSymbol) {
                    let direction: 'down' | 'up';
                    let normalizedSymbol: string;
                    
                    if (config.mode === 'pick') {
                        direction = n.explicitSymbol === 'd' ? 'down' : 'up';
                        normalizedSymbol = n.explicitSymbol;
                    } else {
                        // Finger mode: normalize the explicit symbol
                        normalizedSymbol = this.normalizeFingerSymbol(n.explicitSymbol, config.language || 'en');
                        direction = normalizedSymbol.endsWith('u') ? 'up' : 'down';
                    }
                    
                    return {
                        ...n,
                        assignedDirection: direction,
                        assignedSymbol: normalizedSymbol
                    };
                }
                
                // PRIORITY LEVEL 2 or 3: Use timeline (pattern or automatic)
                const timelineSlot = timeline[n.subdivisionStart];
                const direction = timelineSlot?.direction || 'down';
                const assignedSymbol = timelineSlot?.symbol; // Symbol already normalized in timeline
                
                return {
                    ...n,
                    assignedDirection: direction,
                    assignedSymbol
                };
            });
        
        return result;
    }
    
    /**
     * Normalize and translate finger symbols to their canonical form.
     * 
     * This function accepts ALL variants (short, long, English, French) and normalizes them
     * to the long form in the target language.
     * 
     * Accepted Input Variants:
     * - Short English: t, tu, h, hu
     * - Long English: td, tu, hd, hu
     * - Short French: p, pu, m, mu
     * - Long French: pd, pu, md, mu
     * 
     * Output (normalized long form):
     * - English: td, tu, hd, hu
     * - French: pd, pu, md, mu
     * 
     * Examples:
     * ```
     * normalizeFingerSymbol('t', 'en')   → 'td'  (expand short)
     * normalizeFingerSymbol('td', 'en')  → 'td'  (already normalized)
     * normalizeFingerSymbol('t', 'fr')   → 'pd'  (expand + translate)
     * normalizeFingerSymbol('td', 'fr')  → 'pd'  (translate)
     * normalizeFingerSymbol('p', 'fr')   → 'pd'  (expand short French)
     * normalizeFingerSymbol('pd', 'fr')  → 'pd'  (already normalized)
     * normalizeFingerSymbol('tu', 'en')  → 'tu'  (already normalized)
     * normalizeFingerSymbol('tu', 'fr')  → 'pu'  (translate)
     * ```
     * 
     * @param symbol - Original symbol (any variant)
     * @param language - Target language ('en' or 'fr')
     * @returns Normalized symbol in long form for target language
     */
    public static normalizeFingerSymbol(symbol: string, language: 'en' | 'fr'): string {
        // Step 1: Map all variants to English long form (canonical)
        const toEnglishLong: Record<string, string> = {
            // Short English → Long English
            't': 'td',
            'tu': 'tu',   // already long
            'h': 'hd',
            'hu': 'hu',   // already long
            
            // Long English → Long English (pass-through)
            'td': 'td',
            'hd': 'hd',
            
            // Short French → Long English (normalize first)
            'p': 'td',
            'pu': 'tu',
            'm': 'hd',
            'mu': 'hu',
            
            // Long French → Long English
            'pd': 'td',
            'md': 'hd'
        };
        
        const englishLong = toEnglishLong[symbol] || symbol;
        
        // Step 2: If target is French, translate from English long to French long
        if (language === 'fr') {
            const enToFr: Record<string, string> = {
                'td': 'pd',
                'tu': 'pu',
                'hd': 'md',
                'hu': 'mu'
            };
            return enToFr[englishLong] || englishLong;
        }
        
        // Step 3: Return English long form (already normalized)
        return englishLong;
    }
}
