/**
 * @file TimeSignatureRenderer.ts
 * @description Renderer for time signatures using standard music notation SVG symbols.
 * 
 * This renderer handles:
 * - Global time signature display (top-left of first line)
 * - Inline time signature changes within measures
 * - Standard stacked numerator/denominator layout
 * - SVG-based digit rendering for professional appearance
 * 
 * Time signature digits are rendered using SVG paths that match
 * standard music notation fonts (similar to Wikimedia Commons music notation).
 */

import { SVG_NS, TYPOGRAPHY, NOTATION, LAYOUT } from './constants';
import { PlaceAndSizeManager } from './PlaceAndSizeManager';

/**
 * SVG path data for time signature digits (0-9).
 * EXACT paths extracted from user's provided SVG files.
 * These are the actual glyphs from the user's music notation files.
 * 
 * ViewBox: Based on user's files (approximately 0 0 50 69 for digit 4)
 */
const TIME_SIGNATURE_DIGITS: Record<string, string> = {
    // Digit 0 - TO BE UPDATED WITH USER'S FILE
    '0': 'M 37.46875,30.84375 C 51.210938,30.84375 62.5,44.667969 62.5,65.097656 C 62.5,85.527344 51.210938,99.351562 37.46875,99.351562 C 23.726562,99.351562 12.4375,85.527344 12.4375,65.097656 C 12.4375,44.667969 23.726562,30.84375 37.46875,30.84375 z M 37.46875,40.300781 C 28.878906,40.300781 22.5625,50.722656 22.5625,65.097656 C 22.5625,79.472656 28.878906,89.894531 37.46875,89.894531 C 46.058594,89.894531 52.375,79.472656 52.375,65.097656 C 52.375,50.722656 46.058594,40.300781 37.46875,40.300781 z',
    
    // Digit 1 - TO BE UPDATED WITH USER'S FILE
    '1': 'M 32.421875,35.21875 37.5,30.140625 42.578125,35.21875 l 0,64.429688 -10.15625,0 z',
    
    // Digit 2 - EXACT path from user's Music2.svg (path id="path10970-2")
    '2': 'M 15.887184,27.51949 C 10.643483,28.72702 4.2366558,26.15703 2.6959429,20.56234 1.0222481,14.68265 4.3286211,8.24883 9.2042346,5.0425301 c 8.2071514,-5.61537 19.1072164,-6.45522 28.3256354,-3.07163 4.937173,1.23229 8.697059,5.39242 10.834238,9.9067799 1.06,3.94257 1.16117,8.20879 0.25972,12.18455 -1.370993,3.54413 -4.847912,5.47732 -7.276112,8.18135 -6.686341,5.86751 -15.5635,7.75625 -23.261047,11.75711 -2.678645,1.57326 -5.169465,3.52993 -7.148233,5.96204 5.340937,0.45382 10.719695,0.23679 16.077113,0.44028 l 20.04839,0.36256 c 3.327142,-1.24007 3.353339,-0.0442 2.55589,3.37409 -1.086728,4.29506 -2.308404,8.553 -3.452355,12.83234 H 1.2964418e-7 C 1.1768642,61.065 1.6314294,54.55179 5.7631196,49.83162 9.4848014,44.63618 14.332536,40.38792 19.726526,37.07569 c 3.086746,-2.2288 6.425836,-4.22929 9.221178,-6.79477 2.427811,-3.64524 5.213172,-7.58208 4.887744,-12.22199 0.337996,-4.02239 -0.39157,-9.07077 -4.286479,-11.0989199 -4.455299,-1.64069 -9.638798,-1.65272 -14.001266,0.27969 -3.028855,2.7653799 3.149269,3.8267299 4.314273,5.8193599 2.515248,2.77969 2.496111,7.19422 0.912435,10.41727 -1.099424,1.87254 -2.895312,3.27407 -4.887227,4.04316 z',
    
    // Digit 3 - TO BE UPDATED WITH USER'S FILE
    '3': 'M 12.5,40.332031 C 12.5,33.339844 19.824219,28.03125 32.421875,28.03125 44.921875,28.03125 52.34375,35.257812 52.34375,45.410156 c 0,6.933594 -4.882812,12.207032 -12.597656,14.160156 7.617187,2.050782 13.671875,7.226563 13.671875,16.113282 0,11.230468 -9.082031,18.164062 -21.289063,18.164062 C 19.726562,93.847656 10.644531,86.914062 10.644531,75 l 8.203125,0 c 0,6.054688 5.566406,11.328125 13.28125,11.328125 7.8125,0 13.378906,-5.175781 13.378906,-11.328125 0,-6.933594 -6.933594,-10.742187 -13.378906,-10.742187 l 0,-7.519532 c 6.347656,0 12.5,-4.003906 12.5,-11.816406 0,-6.054687 -5.175781,-11.035156 -12.207031,-11.035156 -7.03125,0 -12.011719,3.808593 -12.011719,10.644531 z',
    
    // Digit 4 - FROM USER'S Music4.svg FILE (path id="path11528")
    '4': 'M 0.05179239,49.150774 V 43.771835 L 2.3062482,41.117299 4.9129643,38.11348 7.5381772,34.394869 9.633242,30.149881 l 2.39536,-6.007638 2.113541,-6.007637 1.902206,-7.963609 1.056771,-5.8679248 0.493174,-4.12151258 23.530891,-0.20955957 -0.140894,2.93396235 -2.536274,3.9119431 -3.452131,4.8899335 -3.522587,4.610508 -4.368017,5.658355 -4.43847,5.448776 -6.340655,6.566489 -8.9473807,8.592318 v 1.257407 l 19.1628987,-0.20956 0.0705,-12.50427 15.217588,-15.368367 1.127233,-0.06991 v 27.732924 l 6.83382,-0.139713 v 6.007638 l -7.045176,0.209569 -0.0705,3.073666 0.422713,2.794259 1.127232,3.213388 1.972648,1.746392 1.972648,0.558862 1.902195,0.488985 -0.0705,4.680375 -31.069231,0.06991 -0.140914,-4.680375 2.39536,-0.209559 1.620398,-0.419149 2.113551,-1.39712 0.774963,-1.536832 0.634068,-2.58468 0.211357,-3.143542 -0.0705,-2.794239 z',
    
    // Music_timesig5.svg - https://commons.wikimedia.org/wiki/File:Music_timesig5.svg
    '5': 'M 52.34375,30.140625 l 0,7.03125 -29.6875,0 0,16.699219 4.394531,-1.953125 c 2.929688,-1.5625 5.859375,-2.539063 10.449219,-2.539063 12.5,0 22.65625,9.082032 22.65625,22.460938 0,13.476562 -10.253906,22.460937 -22.65625,22.460937 C 24.902344,94.300781 15.820312,85.316406 15.820312,73.59375 l 7.03125,0 c 0,8.300781 5.957032,14.746094 14.648438,14.746094 8.691406,0 15.527344,-6.347656 15.527344,-14.746094 0,-8.398437 -6.835938,-14.746093 -15.527344,-14.746093 -4.6875,0 -9.765625,2.050781 -13.769531,6.054687 l -7.910157,-4.101563 0,-30.664062 z',
    
    // Music_timesig6.svg - https://commons.wikimedia.org/wiki/File:Music_timesig6.svg
    '6': 'M 37.5,30.140625 c 12.5,0 20.019531,7.128906 20.019531,18.261719 l -7.03125,0 C 50.488281,41.855469 45.214844,37.265625 37.5,37.265625 c -11.425781,0 -15.332031,11.71875 -15.332031,22.949219 3.90625,-6.054688 9.277343,-10.058594 15.332031,-10.058594 12.5,0 22.65625,9.277344 22.65625,22.753906 0,13.574219 -10.253906,22.460938 -22.65625,22.460938 C 25,95.371094 14.746094,84.238281 14.746094,65 l 0,-6.738281 C 14.746094,41.757812 22.753906,30.140625 37.5,30.140625 z m 0,27.246094 c -8.496094,0 -15.332031,6.054687 -15.332031,15.722656 0,9.765625 6.933593,15.332031 15.332031,15.332031 8.398438,0 15.527344,-6.054687 15.527344,-15.332031 0,-9.570313 -6.933594,-15.722656 -15.527344,-15.722656 z',
    
    // Music_timesig7.svg - https://commons.wikimedia.org/wiki/File:Music_timesig7.svg
    '7': 'M 12.5,30.140625 62.5,30.140625 l 0,8.007813 L 37.5,99.648438 28.125,99.648438 51.757812,40.300781 12.5,40.300781 z',
    
    // Music_timesig8.svg - https://commons.wikimedia.org/wiki/File:Music_timesig8.svg
    '8': 'M 37.5,28.03125 c 10.449219,0 19.335938,7.03125 19.335938,18.164062 0,6.835938 -4.6875,12.695313 -11.621094,14.648438 7.617187,2.539062 14.941406,8.496094 14.941406,17.382812 0,11.132813 -10.253906,17.089844 -22.65625,17.089844 C 24.902344,95.316406 14.746094,89.359375 14.746094,78.226562 c 0,-8.789062 7.226562,-14.746093 14.941406,-17.382812 C 22.753906,58.890625 18.066406,53.03125 18.066406,46.195312 18.066406,35.0625 26.953125,28.03125 37.5,28.03125 z m 0,7.03125 c -7.519531,0 -12.402344,3.808594 -12.402344,11.132812 0,7.226563 4.980469,11.035157 12.402344,11.035157 7.421875,0 12.402344,-3.808594 12.402344,-11.035157 0,-7.324218 -4.882813,-11.132812 -12.402344,-11.132812 z M 37.5,64.160156 c -9.570312,0 -17.382812,5.371094 -17.382812,14.066406 0,8.007813 7.8125,9.570313 17.382812,9.570313 9.570312,0 17.382812,-1.5625 17.382812,-9.570313 0,-8.695312 -7.8125,-14.066406 -17.382812,-14.066406 z',
    
    // Music_timesig9.svg - https://commons.wikimedia.org/wiki/File:Music_timesig9.svg
    '9': 'M 37.5,30.140625 c 12.5,0 22.65625,11.71875 22.65625,29.882813 l 0,6.738281 C 60.15625,83.265625 52.148438,94.882812 37.5,94.882812 25,94.882812 17.480469,87.75 17.480469,76.617188 l 7.03125,0 c 0,6.738281 5.664062,11.132812 13.085937,11.132812 11.523438,0 15.332032,-11.425781 15.332032,-22.65625 -3.90625,6.054688 -9.277344,9.960938 -15.429688,9.960938 -12.5,0 -22.65625,-9.179688 -22.65625,-22.753906 0,-13.476563 10.253906,-22.160157 22.65625,-22.160157 z M 37.5,37.265625 c -8.496094,0 -15.332031,5.859375 -15.332031,15.234375 0,9.472656 6.933593,15.527344 15.332031,15.527344 8.398438,0 15.527344,-6.054688 15.527344,-15.527344 0,-9.375 -6.933594,-15.234375 -15.527344,-15.234375 z'
};

/**
 * Time signature rendering options
 */
export interface TimeSignatureRenderOptions {
    /** X position (left edge) */
    x: number;
    /** Y position (baseline reference, typically staff line Y) */
    y: number;
    /** Numerator (beats per measure) */
    numerator: number;
    /** Denominator (beat unit) */
    denominator: number;
    /** Scale factor (default 1.0 = standard size) */
    scale?: number;
    /** Measure index for collision registration */
    measureIndex?: number;
}

/**
 * Class responsible for rendering time signatures.
 */
export class TimeSignatureRenderer {
    /**
     * Default digit width from user's custom SVG files (viewBox: 0 0 50 69)
     */
    private readonly DIGIT_WIDTH = 50;
    
    /**
     * Default digit height from user's custom SVG files (viewBox: 0 0 50 69)
     */
    private readonly DIGIT_HEIGHT = 69;
    
    /**
     * Standard scale for inline time signatures (same as global for consistent sizing)
     */
    private readonly INLINE_SCALE = 0.38; // Reduced scale for better proportion with chord names
    
    /**
     * Standard scale for global time signature
     */
    private readonly GLOBAL_SCALE = 0.38; // Reduced scale for better proportion with chord names
    
    /**
     * Vertical spacing between numerator and denominator (in scaled units)
     */
    private readonly VERTICAL_SPACING = 5;

    constructor(
        private readonly placeAndSizeManager?: PlaceAndSizeManager
    ) {}

    /**
     * Calculate the standard Y position for time signatures.
     * This ensures all time signatures (global and inline) are vertically aligned.
     * 
     * @returns The Y coordinate where time signatures should be centered
     */
    public static getStandardYPosition(): number {
        // Standard formula: MEASURE_Y_OFFSET (40) + 30 = 70
        // This aligns with the staff line position used throughout the codebase
        return LAYOUT.MEASURE_Y_OFFSET + 30;
    }

    /**
     * Render a time signature at the specified position.
     * 
     * @param svg - Parent SVG element
     * @param options - Rendering options
     * @param isGlobal - Whether this is the global time signature (affects scale)
     */
    public render(svg: SVGElement, options: TimeSignatureRenderOptions, isGlobal: boolean = false): void {
        const scale = options.scale ?? (isGlobal ? this.GLOBAL_SCALE : this.INLINE_SCALE);
        const numeratorStr = options.numerator.toString();
        const denominatorStr = options.denominator.toString();
        
        // Calculate dimensions
        const digitWidth = this.DIGIT_WIDTH * scale;
        const digitHeight = this.DIGIT_HEIGHT * scale;
        
        // Calculate total width (use max width of numerator or denominator)
        const numeratorWidth = numeratorStr.length * digitWidth * 0.6; // Digits overlap slightly
        const denominatorWidth = denominatorStr.length * digitWidth * 0.6;
        const totalWidth = Math.max(numeratorWidth, denominatorWidth);
        
        // Calculate total height (numerator + denominator + spacing)
        const totalHeight = digitHeight * 2 + this.VERTICAL_SPACING;
        
        // Center position
        const centerX = options.x;
        const centerY = options.y; // Staff line position
        
        // Create group for the time signature
        const group = document.createElementNS(SVG_NS, 'g');
        group.setAttribute('data-time-signature', `${options.numerator}/${options.denominator}`);
        
        // Render numerator (positioned above staff line, accounting for full digit height)
        const numeratorY = centerY - digitHeight - this.VERTICAL_SPACING / 2;
        this.renderDigits(group, numeratorStr, centerX, numeratorY, scale);
        
        // Render denominator (positioned below staff line)
        const denominatorY = centerY + this.VERTICAL_SPACING / 2;
        this.renderDigits(group, denominatorStr, centerX, denominatorY, scale);
        
        svg.appendChild(group);
        
        // Register in PlaceAndSizeManager for collision detection
        if (this.placeAndSizeManager && options.measureIndex !== undefined) {
            this.placeAndSizeManager.registerElement('time-signature', {
                x: centerX - totalWidth / 2,
                y: centerY - totalHeight / 2,
                width: totalWidth,
                height: totalHeight
            }, options.measureIndex, {
                numerator: options.numerator,
                denominator: options.denominator,
                exactX: centerX,
                exactY: centerY
            });
        }
    }
    
    /**
     * Render a string of digits at the specified position.
     * Digits are centered horizontally around the given X position.
     * 
     * @param parent - Parent SVG group
     * @param digits - String of digits to render (e.g., "34", "6", "12")
     * @param centerX - Center X position
     * @param topY - Top Y position of the digits
     * @param scale - Scale factor
     */
    private renderDigits(parent: SVGGElement, digits: string, centerX: number, topY: number, scale: number): void {
        const digitWidth = this.DIGIT_WIDTH * scale;
        const digitSpacing = digitWidth * 0.6; // Slight overlap for better appearance
        
        // Calculate total width of all digits
        const totalWidth = digits.length * digitSpacing;
        
        // Starting X position (leftmost digit)
        let currentX = centerX - totalWidth / 2;
        
        for (const digit of digits) {
            const pathData = TIME_SIGNATURE_DIGITS[digit];
            if (!pathData) {
                console.warn(`[TimeSignatureRenderer] No path data for digit: ${digit}`);
                continue;
            }
            
            // Create nested SVG for this digit with viewBox to normalize dimensions
            const digitSvg = document.createElementNS(SVG_NS, 'svg');
            digitSvg.setAttribute('x', currentX.toFixed(2));
            digitSvg.setAttribute('y', topY.toFixed(2));
            digitSvg.setAttribute('width', (this.DIGIT_WIDTH * scale).toFixed(2));
            digitSvg.setAttribute('height', (this.DIGIT_HEIGHT * scale).toFixed(2));
            digitSvg.setAttribute('viewBox', `0 0 ${this.DIGIT_WIDTH} ${this.DIGIT_HEIGHT}`);
            digitSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            
            // Create path for the digit
            const path = document.createElementNS(SVG_NS, 'path');
            path.setAttribute('d', pathData);
            path.setAttribute('fill', '#000');
            path.setAttribute('stroke', 'none');
            
            digitSvg.appendChild(path);
            parent.appendChild(digitSvg);
            
            currentX += digitSpacing;
        }
    }
    
    /**
     * Calculate the width that a time signature will occupy.
     * Useful for layout calculations.
     * 
     * @param numerator - Numerator
     * @param denominator - Denominator
     * @param isGlobal - Whether this is the global time signature
     * @returns Width in pixels
     */
    public calculateWidth(numerator: number, denominator: number, isGlobal: boolean = false): number {
        const scale = isGlobal ? this.GLOBAL_SCALE : this.INLINE_SCALE;
        const numeratorStr = numerator.toString();
        const denominatorStr = denominator.toString();
        
        const digitWidth = this.DIGIT_WIDTH * scale;
        const numeratorWidth = numeratorStr.length * digitWidth * 0.6;
        const denominatorWidth = denominatorStr.length * digitWidth * 0.6;
        
        return Math.max(numeratorWidth, denominatorWidth);
    }
}
