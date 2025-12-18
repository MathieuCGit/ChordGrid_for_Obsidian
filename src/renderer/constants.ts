/**
 * @file constants.ts
 * @description Constants used for SVG rendering.
 * 
 * This file centralizes constant values needed for rendering,
 * organized by category for easy maintenance and future customization.
 * 
 * Categories:
 * - SVG: XML namespace
 * - LAYOUT: Spacing, padding, margins
 * - TYPOGRAPHY: Font sizes, weights, ratios
 * - VISUAL: Colors, stroke widths
 * - NOTATION: Musical notation dimensions (stems, notes, beams)
 * - POSITIONING: Vertical/horizontal offsets, clearances
 * 
 * @version 2.2.0
 * @plannedFor v3.0 - User-configurable options
 */

// =============================================================================
// SVG NAMESPACE
// =============================================================================

/**
 * XML namespace for SVG elements.
 * Required to create SVG elements with document.createElementNS().
 */
export const SVG_NS = 'http://www.w3.org/2000/svg';

// =============================================================================
// LAYOUT CONSTANTS
// =============================================================================

/**
 * Horizontal spacing between measures and segments
 */
export const LAYOUT = {
    /** Base left padding inside measures (px) */
    BASE_LEFT_PADDING: 10,
    
    /** Right padding inside measures (px) */
    BASE_RIGHT_PADDING: 10,
    
    /** Inner padding per chord segment (px) */
    INNER_PADDING_PER_SEGMENT: 20,
    
    /** Gap width when source had a space between segments (px) */
    SEPARATOR_WIDTH: 12,
    
    /** Extra left padding for repeat-start barlines (px) */
    EXTRA_LEFT_PADDING_REPEAT: 15,
    
    /** Vertical spacing between lines (px) */
    LINE_VERTICAL_SPACING: 20,
    
    /** Top margin before first line (px) */
    TOP_MARGIN: 0,  // Minimal top margin for compact rendering
    
    /** Bottom margin after last line (px) */
    BOTTOM_MARGIN: 25,  // Increased for better spacing at bottom
    
    /** Side margin for SVG container (px) */
    SIDE_MARGIN: 30,  // Increased for better right spacing
    
    /** Measure height for layout calculation (px) */
    MEASURE_HEIGHT: 120,
    
    /** Base measure width (px) */
    BASE_MEASURE_WIDTH: 240,
    
    /** Extra breathing room at end of multi-note segments (px) */
    SEGMENT_END_PADDING: 8,
    
    /** Repeat symbol height (px) @plannedFor v3.0 */
    REPEAT_SYMBOL_HEIGHT: 30,
    
    /** Repeat count font size (px) @plannedFor v3.0 */
    REPEAT_COUNT_FONT_SIZE: 22,
    
    /** Repeat count width (approximate, px) @plannedFor v3.0 */
    REPEAT_COUNT_WIDTH: 30,
    
    /** Chord vertical offset (px) @plannedFor v3.0 */
    CHORD_VERTICAL_OFFSET: 30,
    
    /** Spacing between double barlines (px) @plannedFor v3.0 */
    DOUBLE_BAR_SPACING: 6,
    
    /** Measures per line (default layout) @plannedFor v3.0 */
    DEFAULT_MEASURES_PER_LINE: 4,
    
    /** Time signature margin after metric (px) @plannedFor v3.0 */
    TIME_SIG_MARGIN: 4,
    
    /** Default line start padding (px) @plannedFor v3.0 */
    DEFAULT_LINE_START_PADDING: 40,
    
    /** Final margin at bottom of SVG (px) @plannedFor v3.0 */
    BOTTOM_SVG_MARGIN: 30,  // Increased for better spacing at bottom
    
    /** Additional width for SVG right margin (px) @plannedFor v3.0 */
    RIGHT_SVG_MARGIN: 20,  // Increased for better right spacing
    
    /** Top margin for chord symbols (px) @plannedFor v3.0 */
    TOP_MARGIN_FOR_CHORDS: 0,  // Zero top margin for compact rendering
    
    /** Y offset for measures in line (px) @plannedFor v3.0 */
    MEASURE_Y_OFFSET: 40,
    
    /** Side margin for availableWidth calculation (px) @plannedFor v3.0 */
    AVAILABLE_WIDTH_SIDE_MARGIN: 60,
    
    /** Spacing between barline and volta text (px) @plannedFor v3.0 */
    VOLTA_TEXT_OFFSET: 5,
    
    /** Horizontal margin around volta text for collision detection (px) @plannedFor v3.0 */
    VOLTA_TEXT_MARGIN: 5,
    
    /** Extra left padding for volta text bbox to ensure clearance from barlines (px) @plannedFor v3.0 */
    VOLTA_TEXT_LEFT_PADDING: 3,
} as const;

// =============================================================================
// TYPOGRAPHY CONSTANTS
// =============================================================================

/**
 * Font sizes and text-related dimensions
 */
export const TYPOGRAPHY = {
    /** Default font size for chord symbols (px) */
    CHORD_FONT_SIZE: 24,
    
    /** Font size for chord-only mode (larger) (px) */
    CHORD_ONLY_FONT_SIZE: 28,
    
    /** Estimated character width to font size ratio */
    CHAR_WIDTH_RATIO: 0.53,
    
    /** Font size for time signature numerator (px) */
    TIME_SIG_NUMERATOR_SIZE: 24,
    
    /** Font size for time signature denominator (px) */
    TIME_SIG_DENOMINATOR_SIZE: 20,
    
    /** Width for single-digit measure count (px) */
    MEASURE_COUNT_WIDTH_SINGLE: 30,
    
    /** Width for double-digit measure count (px) */
    MEASURE_COUNT_WIDTH_DOUBLE: 40,
    
    /** Superstructure font size ratio (relative to main) */
    SUPERSTRUCTURE_SIZE_RATIO: 0.75,
    
    /** Bass note font size ratio (relative to main) */
    BASS_NOTE_SIZE_RATIO: 0.83,
    
    /** Parentheses font size ratio (relative to main) */
    PARENTHESES_SIZE_RATIO: 0.65,
    
    /** Default font family for text elements */
    DEFAULT_FONT_FAMILY: 'Arial, sans-serif',
    
    /** Default font weight for bold text */
    DEFAULT_FONT_WEIGHT_BOLD: 'bold',
} as const;

// =============================================================================
// VISUAL CONSTANTS
// =============================================================================

/**
 * Colors, stroke widths, and visual properties
 */
export const VISUAL = {
    /** Default stroke color */
    COLOR_BLACK: '#000',
    
    /** Standard line stroke width (px) */
    STROKE_WIDTH_THIN: 1,
    
    /** Medium line stroke width (px) @plannedFor v3.0 */
    STROKE_WIDTH_MEDIUM: 1.5,
    
    /** Thick line stroke width (barlines) (px) */
    STROKE_WIDTH_THICK: 3,
    
    /** Final barline stroke width (px) @plannedFor v3.0 */
    STROKE_WIDTH_FINAL: 5,
    
    /** Extra thick stroke width (note slashes) (px) */
    STROKE_WIDTH_EXTRA_THICK: 3,
    
    /** Beam stroke width (px) */
    BEAM_STROKE_WIDTH: 3,
    
    /** Stem stroke width (px) @plannedFor v3.0 */
    STEM_STROKE_WIDTH: 1.5,
    
    /** Dot radius for dotted notes (px) */
    DOT_RADIUS: 2,
    
    /** Barline width for special barlines (px) */
    BARLINE_WIDTH_SPECIAL: 10,
    
    /** Separator color (chord-only mode) @plannedFor v3.0 */
    COLOR_SEPARATOR: '#999',
    
    /** Repeat symbol color @plannedFor v3.0 */
    COLOR_REPEAT_SYMBOL: '#444',
} as const;

// =============================================================================
// NOTATION CONSTANTS
// =============================================================================

/**
 * Musical notation element dimensions
 */
export const NOTATION = {
    /** Staff line Y offset from measure top (px) */
    STAFF_LINE_Y_OFFSET: 80,
    
    /** Note head diamond size (radius) (px) */
    DIAMOND_SIZE: 6,
    
    /** Slash note head length (px) */
    SLASH_LENGTH: 10,
    
    /** Standard stem height (px) */
    STEM_HEIGHT: 30,
    
    /** Beam gap between levels (8th, 16th, etc.) (px) */
    BEAM_GAP: 7,
    
    /** Beamlet length for partial beams (px) */
    BEAMLET_LENGTH: 9,
    
    /** Flag spacing between multiple flags on a stem (px) */
    FLAG_SPACING: 10,
    
    /** Flag curve control distance (px) */
    FLAG_CURVE_DISTANCE: 10,
    
    /** Flag curve end offset (px) */
    FLAG_CURVE_END_OFFSET: 8,
    
    /** Flag curve control Y offset (px) */
    FLAG_CURVE_Y_OFFSET: 5,
    
    /** Flag stroke width (px) */
    FLAG_STROKE_WIDTH: 2,
    
    /** Dot horizontal offset from note center (px) */
    DOT_X_OFFSET: 10,
    
    /** Dot vertical offset from staff line (px) */
    DOT_Y_OFFSET: 4,
    
    /** Dot radius (px) */
    DOT_RADIUS: 1.5,
    
    /** Ghost note cross size (smaller than diamond) (px) */
    GHOST_CROSS_SIZE: 5,
    
    /** Flag curve total Y distance (px) */
    FLAG_CURVE_Y_DISTANCE: 12,
    
    /** Dot offset from note center (px) */
    DOT_OFFSET: 10,
    
    /** Dot collision box half-size (px) */
    DOT_COLLISION_HALF: 2,
    
    /** Dot horizontal offset from note head (px) */
    DOT_OFFSET_X: 6,
    
    /** Dot vertical offset for dotted notes (px) */
    DOT_OFFSET_Y: 4,
    
    /** Repeat dots spacing above/below staff line (px) */
    REPEAT_DOT_SPACING: 12,
    
    /** Repeat dots horizontal offset from barline (px) @plannedFor v3.0 */
    REPEAT_DOT_OFFSET: 12,
    
    /** Repeat dots radius (px) @plannedFor v3.0 */
    REPEAT_DOT_RADIUS: 3,
    
    /** Hook height for volta brackets (px) @plannedFor v3.0 */
    HOOK_HEIGHT: 10,
    
    /** Rest symbol reference height (quarter note) (px) */
    REST_HEIGHT_QUARTER: 30,
    
    /** Eighth rest target height (px) */
    REST_HEIGHT_EIGHTH: 24,
    
    /** Sixteenth rest target height (px) */
    REST_HEIGHT_SIXTEENTH: 24,
    
    /** Thirty-second rest target height (px) */
    REST_HEIGHT_THIRTY_SECOND: 28,
    
    /** Sixty-fourth rest target height (px) */
    REST_HEIGHT_SIXTY_FOURTH: 32,
    
    /** Upbow symbol width (px) */
    UPBOW_WIDTH: 24.2,
    
    /** Upbow target display height (px) */
    UPBOW_HEIGHT: 16,
    
    /** Tie curve amplitude base (px) */
    TIE_BASE_AMPLITUDE: 40,
    
    /** Tie curve minimum amplitude (px) */
    TIE_MIN_AMPLITUDE: 8,
    
    /** Tie curve extra amplitude for cross-line ties (px) */
    TIE_CROSS_LINE_EXTRA_AMP: 10,
    
    /** Percent symbol target height (px) */
    PERCENT_SYMBOL_HEIGHT: 30,
    
    /** Fingerstyle pattern letter font size (p, m) (px) */
    PATTERN_LETTER_FONT_SIZE: 14,
    
    /** Fingerstyle pattern arrow font size (↑, ↓) (px) */
    PATTERN_ARROW_FONT_SIZE: 20,
    
    /** Distance from note head to pattern symbol (px) */
    PATTERN_MARGIN: 7,
    
    /** Note head half height for pattern positioning (px) */
    PATTERN_NOTE_HEAD_HALF_HEIGHT: 5,
    
    /** Counting number font size for tall (beat starts) (px) */
    COUNTING_FONT_SIZE_TALL: 14,
    
    /** Counting number font size for medium (subdivisions) (px) */
    COUNTING_FONT_SIZE_MEDIUM: 12,
    
    /** Counting number font size for small (rests) (px) */
    COUNTING_FONT_SIZE_SMALL: 11,
    
    /** Distance from note head to counting number (px) */
    COUNTING_MARGIN: 10,
    
    /** Font weight for tall counting numbers */
    COUNTING_FONT_WEIGHT_TALL: 'normal',
    
    /** Font weight for medium/small counting numbers */
    COUNTING_FONT_WEIGHT_NORMAL: 'normal',
    
    /** Color for rest counting numbers (gray) */
    COUNTING_COLOR_REST: '#777',
    
    /** Color for normal counting numbers (black) */
    COUNTING_COLOR_NORMAL: '#000',
    
    /** Measure number font size (px) @plannedFor v2.3 */
    MEASURE_NUMBER_FONT_SIZE: 14,
    
    /** Measure number X offset from left barline (px) @plannedFor v2.3 */
    MEASURE_NUMBER_X_OFFSET: -2,
    
    /** Measure number Y offset from top of measure (px) @plannedFor v2.3 */
    MEASURE_NUMBER_Y_OFFSET: 10,
    
    /** Measure number text color @plannedFor v2.3 */
    MEASURE_NUMBER_COLOR: '#666',
} as const;

// =============================================================================
// POSITIONING CONSTANTS
// =============================================================================

/**
 * Vertical and horizontal positioning offsets
 */
export const POSITIONING = {
    /** Default vertical offset for chords above staff (px) */
    CHORD_VERTICAL_OFFSET: 30,
    
    /** Chord vertical offset when measuring from baseline (px) */
    CHORD_VERTICAL_OFFSET_ALT: 40,
    
    /** Clearance between chord and stems (px) */
    STEM_CLEARANCE: 12,
    
    /** Chord-only mode vertical center (no staff) (px) */
    CHORD_ONLY_Y_CENTER: 60,
    
    /** Space above staff for chord symbols (px) */
    TOP_MARGIN_FOR_CHORDS: 50,
    
    /** Time signature baseline Y position (px) */
    TIME_SIG_BASELINE_Y: 40,
    
    /** Dynamic line start padding (default/fallback) (px) */
    DYNAMIC_LINE_START_PADDING: 40,
    
    /** Measure count X offset from barline (px) */
    MEASURE_COUNT_X_OFFSET: 10,
    
    /** Hook/coda Y position above staff (px) */
    HOOK_Y_OFFSET: 10,
    
    /** Hook text Y offset (include text height) (px) */
    HOOK_TEXT_Y_OFFSET: 20,
    
    /** Slash diagonal start Y for chord-only (px) */
    SLASH_START_Y: 30,
    
    /** Slash diagonal end Y for chord-only (px) */
    SLASH_END_Y: 90,
    
    /** Slash horizontal width for chord-only (px) */
    SLASH_WIDTH: 10,
    
    /** Chord-only 2-chord first X ratio */
    CHORD_ONLY_2_FIRST_X: 0.35,
    
    /** Chord-only 2-chord second X ratio */
    CHORD_ONLY_2_SECOND_X: 0.65,
    
    /** Chord-only 2-chord first Y position (px) */
    CHORD_ONLY_2_FIRST_Y: 25,
    
    /** Chord-only 2-chord second Y position (px) */
    CHORD_ONLY_2_SECOND_Y: 95,
    
    /** Spacing between stacked parentheses in chords (px) */
    CHORD_PARENTHESES_SPACING: 12,
} as const;

// =============================================================================
// NOTE SPACING CONSTANTS
// =============================================================================

/**
 * Spacing between notes based on note value (duration)
 */
export const NOTE_SPACING = {
    /** Spacing for 64th notes (px) */
    SIXTY_FOURTH: 16,
    
    /** Spacing for 32nd notes (px) */
    THIRTY_SECOND: 20,
    
    /** Spacing for 16th notes (px) */
    SIXTEENTH: 26,
    
    /** Spacing for 8th notes (px) */
    EIGHTH: 24,
    
    /** Spacing for quarter notes and longer (px) */
    QUARTER_AND_LONGER: 20,
    
    /** Extra spacing for rest symbols (px) @plannedFor v3.0 */
    REST_EXTRA_SPACING: 4,
} as const;

// =============================================================================
// SEGMENT WIDTH CALCULATION
// =============================================================================

/**
 * Constants for calculating segment widths
 */
export const SEGMENT_WIDTH = {
    /** Base width for single note (px) */
    SINGLE_NOTE_BASE: 28,
    
    /** Extra padding for single note (px) */
    SINGLE_NOTE_PADDING: 10,
    
    /** Left padding for multi-note segments (px) */
    MULTI_NOTE_LEFT_PADDING: 10,
    
    /** Right padding for multi-note segments (px) */
    MULTI_NOTE_RIGHT_PADDING: 10,
    
    /** Rest bbox width for whole/half rests (px) */
    REST_WIDTH_LONG: 10,
    
    /** Rest bbox width for quarter rests (px) */
    REST_WIDTH_QUARTER: 8,
    
    /** Rest bbox width for eighth/shorter rests (px) */
    REST_WIDTH_SHORT: 10,
    
    /** Rest bbox width for sixty-fourth rests (px) */
    REST_WIDTH_SIXTY_FOURTH: 12,
    
    /** Note head half width maximum (px) */
    HEAD_HALF_MAX: 6,
    
    /** Extra spacing margin at the end of multi-note segments (px) */
    MULTI_NOTE_END_MARGIN: 8,
    
    /** Minimum spacing ratio for readability (70% = too tight) */
    MIN_SPACING_RATIO: 0.7,
    
    /** Maximum spacing ratio for readability (150% = too spread) */
    MAX_SPACING_RATIO: 1.5,
} as const;

// =============================================================================
// COLLISION DETECTION
// =============================================================================

/**
 * Constants for collision detection and positioning
 */
export const COLLISION = {
    /** Default element priority (fixed position) */
    PRIORITY_FIXED: 0,
    
    /** Chord element priority */
    PRIORITY_CHORD: 5,
    
    /** Mobile element priority (can be moved) */
    PRIORITY_MOBILE: 10,
    
    /** Maximum positioning attempts to resolve collisions */
    MAX_POSITIONING_ATTEMPTS: 20,
    
    /** Max attempts for specific operations */
    MAX_ATTEMPTS_ALT: 10,
} as const;

// =============================================================================
// SVG VIEWPORT
// =============================================================================

/**
 * SVG viewport and sizing
 */
export const SVG_VIEWPORT = {
    /** SVG width attribute (responsive) */
    WIDTH: '100%',
    
    /** Default Z-order for normal elements */
    Z_ORDER_DEFAULT: 100,
} as const;

// =============================================================================
// FINGERSTYLE PATTERNS
// =============================================================================

/**
 * Fingerstyle patterns per time signature and subdivision (short symbols).
 * 
 * Musical Logic:
 * - Offbeats are always played with "tu" (thumb up)
 * - Strong beats (1, 3 in 4/4) are played with "t" (thumb down)
 * - Weak beats (2, 4 in 4/4) are played with "h" (hand down)
 * 
 * Pattern Structure:
 * - eighth: For rhythms where eighth note (8) is the smallest value
 * - sixteenth: For rhythms where sixteenth note (16) is the smallest value
 * 
 * Time Scaling:
 * - The pattern for eighths on 2 beats compresses to 1 beat with sixteenths
 * - Example 4/4: eighth pattern [t tu h tu] over 2 beats
 *                sixteenth pattern [t tu h tu] over 1 beat
 * 
 * Symbol Format:
 * Patterns use SHORT symbols for readability and user interface:
 * - 't'  = thumb down (normalized to 'td' internally)
 * - 'tu' = thumb up (already normalized)
 * - 'h'  = hand down (normalized to 'hd' internally)
 * - 'hu' = hand up (already normalized)
 * 
 * The code accepts BOTH short and long forms:
 * - Short: t, tu, h, hu (user-friendly, used in patterns)
 * - Long: td, tu, hd, hu (internal normalized form)
 * 
 * Translation to French (via normalizeFingerSymbol):
 * - t/td → pd (pouce down)
 * - tu → pu (pouce up)
 * - h/hd → md (main down)
 * - hu → mu (main up)
 * 
 * Priority System:
 * 1. Explicit symbols (user-defined) - highest priority
 * 2. Predefined patterns (this table) - medium priority
 * 3. Automatic alternation (fallback) - lowest priority
 * 
 * @version 2.2.0
 * @plannedFor v2.3 - User-customizable patterns via UI
 */
export const FINGER_PATTERNS: Record<string, { 
    pattern: readonly string[];
}> = {
    // 4/4 time signature
    '4/4': {
        // Pattern: t-tu-h-tu (pd-pu-md-pu)
        // Duration varies with subdivision:
        // - step=8: covers 2 beats → 8pd 8pu 8md 8pu
        // - step=16: covers 1 beat → 16pd 16pu 16md 16pu (repeated 4 times)
        // - step=32: covers 1/2 beat → 32pd 32pu 32md 32pu (repeated 8 times)
        pattern: ['t', 'tu', 'h', 'tu']
    },
    
    // 3/4 time signature
    '3/4': {
        pattern: ['t', 'tu', 'h', 'tu']
    },
    
    // 6/8 time signature (compound meter: 2 groups of 3 eighths)
    '6/8': {
        pattern: ['t', 'tu', 'h', 'tu', 'h', 'tu']
    },
    
    // 2/4 time signature
    '2/4': {
        pattern: ['t', 'tu', 'h', 'tu']
    },
    
    // Common time (C) = 4/4
    'C': {
        pattern: ['t', 'tu', 'h', 'tu']
    }
} as const;
