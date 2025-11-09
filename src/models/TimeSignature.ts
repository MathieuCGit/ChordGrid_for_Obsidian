/**
 * TimeSignature.ts
 *
 * Small utility class to represent and manipulate musical time signatures.
 *
 * Usage:
 *   const ts = TimeSignature.parse("6/8");
 *   const secondsPerBar = ts.secondsPerBar(120); // BPM = 120 (quarter-note)
 *
 * Notes:
 * - Denominator must be a power-of-two (1,2,4,8,16,32).
 * - Accepts "4/4", "C" (common time -> 4/4), "C|" (cut time -> 2/2).
 * - BPM input is assumed to be quarter-note BPM (standard).
 */

export interface TimeSignatureJSON {
    numerator: number;
    denominator: number;
}

const VALID_DENOMINATORS = new Set([1, 2, 4, 8, 16, 32]);

export default class TimeSignature {
    readonly numerator: number;
    readonly denominator: number;

    constructor(numerator: number = 4, denominator: number = 4) {
        if (!Number.isInteger(numerator) || numerator <= 0) {
            throw new Error("numerator must be a positive integer");
        }
        if (!Number.isInteger(denominator) || !VALID_DENOMINATORS.has(denominator)) {
            throw new Error(`denominator must be one of ${Array.from(VALID_DENOMINATORS).join(", ")}`);
        }
        this.numerator = numerator;
        this.denominator = denominator;
    }

    static fromJSON(json: TimeSignatureJSON): TimeSignature {
        return new TimeSignature(json.numerator, json.denominator);
    }

    toJSON(): TimeSignatureJSON {
        return { numerator: this.numerator, denominator: this.denominator };
    }

    clone(): TimeSignature {
        return new TimeSignature(this.numerator, this.denominator);
    }

    equals(other: TimeSignature | null | undefined): boolean {
        if (!other) return false;
        return this.numerator === other.numerator && this.denominator === other.denominator;
    }

    toString(): string {
        if (this.isCommonTime()) return "C";
        if (this.isCutTime()) return "C|";
        return `${this.numerator}/${this.denominator}`;
    }

    /**
     * Parse a string into a TimeSignature.
     * Accepts:
     *  - "4/4", "3/8", etc.
     *  - "C" => 4/4 (common time)
     *  - "C|" => 2/2 (cut time)
     */
    static parse(input: string): TimeSignature {
        const s = input.trim();
        if (/^C\|$/i.test(s)) return new TimeSignature(2, 2);
        if (/^C$/i.test(s)) return new TimeSignature(4, 4);
        const m = /^(\d+)\s*\/\s*(\d+)$/.exec(s);
        if (!m) {
            throw new Error(`Invalid time signature string: "${input}"`);
        }
        const num = parseInt(m[1], 10);
        const den = parseInt(m[2], 10);
        if (!VALID_DENOMINATORS.has(den)) {
            throw new Error(`Invalid denominator: ${den}. Must be one of ${Array.from(VALID_DENOMINATORS).join(", ")}`);
        }
        return new TimeSignature(num, den);
    }

    /**
     * Is this standard "common time" (4/4)?
     */
    isCommonTime(): boolean {
        return this.numerator === 4 && this.denominator === 4;
    }

    /**
     * Is this standard "cut time" (2/2)?
     */
    isCutTime(): boolean {
        return this.numerator === 2 && this.denominator === 2;
    }

    /**
     * Returns whether the meter is compound.
     * Simple heuristic: numerator is divisible by 3 and greater than 3 (6,9,12,...).
     */
    isCompound(): boolean {
        return this.numerator > 3 && this.numerator % 3 === 0;
    }

    /**
     * Number of beats per bar as defined by the numerator.
     * Note: "beat" here is the metrical beat represented by the time signature numerator's unit (denominator).
     */
    beatsPerBar(): number {
        return this.numerator;
    }

    /**
     * Returns the note value that represents one beat as a fraction of a whole note.
     * Example: denominator = 4 => 1/4 -> returns 0.25
     */
    beatUnitFractionOfWhole(): number {
        return 1 / this.denominator;
    }

    /**
     * Convert this time signature to number of quarter-note beats per bar.
     * Useful because BPM is typically expressed in quarter notes.
     * E.g. 6/8 -> each bar has 6 * (1/8) = 6/8 whole notes = (6/8)/(1/4) = 3 quarter-notes
     */
    quarterNotesPerBar(): number {
        // one whole note = 4 quarter notes
        return this.numerator * (4 / this.denominator);
    }

    /**
     * Given a tempo in BPM (quarter notes per minute), return seconds per bar.
     * BPM is assumed to be quarter-note based.
     */
    secondsPerBar(bpm: number): number {
        if (!(bpm > 0)) throw new Error("bpm must be a positive number");
        const quarterNotes = this.quarterNotesPerBar();
        const secondsPerQuarter = 60 / bpm;
        return quarterNotes * secondsPerQuarter;
    }

    /**
     * Given BPM (quarter-note based) return seconds for one beat of the time signature (the beat defined by denominator).
     */
    secondsPerSignatureBeat(bpm: number): number {
        if (!(bpm > 0)) throw new Error("bpm must be a positive number");
        // seconds per whole note = 60 / BPM * 4
        const secondsPerWhole = (60 / bpm) * 4;
        return secondsPerWhole * this.beatUnitFractionOfWhole();
    }

    /**
     * Returns the number of subdivisions (smallest note value) per bar given a subdivision denominator.
     * Example: for 16th-note subdivisions provide subdivisionDenominator = 16.
     * Returns integer count of how many subdivision notes fit in a bar.
     */
    subdivisionsPerBar(subdivisionDenominator: number): number {
        if (!VALID_DENOMINATORS.has(subdivisionDenominator)) {
            throw new Error(`Invalid subdivision denominator: ${subdivisionDenominator}`);
        }
        // number of whole notes per bar = numerator / denominator
        // times subdivisionDenominator gives count of those subdivisions
        return this.numerator * (subdivisionDenominator / this.denominator);
    }

    /**
     * Create a new TimeSignature with the numerator changed.
     */
    withNumerator(n: number): TimeSignature {
        return new TimeSignature(n, this.denominator);
    }

    /**
     * Create a new TimeSignature with the denominator changed.
     */
    withDenominator(d: number): TimeSignature {
        return new TimeSignature(this.numerator, d);
    }

    /**
     * Pretty debug representation
     */
    inspect?(): string {
        return `TimeSignature(${this.toString()})`;
    }
}