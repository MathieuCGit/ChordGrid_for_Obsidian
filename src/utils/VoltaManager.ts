/**
 * @file VoltaManager.ts
 * @description Manager for volta brackets spanning multiple lines.
 * 
 * This class manages volta brackets that can span across multiple render lines,
 * similar to how TieManager handles ties crossing line boundaries.
 * 
 * The manager accumulates measure positions and barline information across all lines,
 * then renders volta brackets with a global view of the entire score.
 * 
 * Use cases:
 * - Volta spanning a single line (traditional)
 * - Volta spanning multiple lines (automatic line breaks)
 * - Open voltas (without right hook)
 * - Closed voltas (with both hooks)
 * 
 * The VoltaManager allows SVGRenderer to handle voltas correctly even when
 * measures are split across different render lines.
 * 
 * @example
 * ```typescript
 * const voltaManager = new VoltaManager();
 * 
 * renderLines.forEach((line, lineIndex) => {
 *   // Render line...
 *   lineMeasurePositions.forEach(mp => voltaManager.addMeasurePosition(mp));
 *   voltaManager.addBarlines(lineBarlines);
 * });
 * 
 * // After all lines processed
 * voltaManager.renderVoltas(svg, placeAndSizeManager);
 * ```
 */

import { SVG_NS } from '../renderer/constants';
import { LAYOUT } from '../renderer/constants';
import { PlaceAndSizeManager } from '../renderer/PlaceAndSizeManager';

/**
 * Position information for a measure in the rendered output.
 */
export interface MeasurePosition {
  measure: any; // Using 'any' to match SVGRenderer's usage (parser/type.Measure)
  lineIndex: number;
  posInLine: number;
  globalIndex: number;
  width: number;
  x?: number;
  y?: number;
}

/**
 * Barline information extracted from PlaceAndSizeManager.
 */
export interface BarlineInfo {
  exactX: number;
  visualStartX?: number;
  visualEndX?: number;
  y: number;
  measureIndex: number;
  side: string;
}

/**
 * Manager for volta brackets spanning multiple lines.
 * 
 * Accumulates measure positions and barline data across all render lines,
 * then renders volta brackets with global context.
 */
export class VoltaManager {
  private allMeasurePositions: MeasurePosition[] = [];
  private allBarlines: BarlineInfo[] = [];

  /**
   * Registers a measure position for volta rendering.
   * 
   * Should be called for each measure as it's rendered, in order.
   * 
   * @param mp - Measure position with coordinates and line information
   */
  addMeasurePosition(mp: MeasurePosition): void {
    this.allMeasurePositions.push(mp);
  }

  /**
   * Registers barlines from a line before PlaceAndSizeManager.clearAll().
   * 
   * Since PlaceAndSizeManager is cleared after each line for collision management,
   * we need to save barline positions before they're lost.
   * 
   * @param barlines - Array of barline information from the current line
   */
  addBarlines(barlines: BarlineInfo[]): void {
    this.allBarlines.push(...barlines);
  }

  /**
   * Renders all volta brackets with global context.
   * 
   * This method must be called AFTER all lines have been processed,
   * so it has a complete view of all measures and can correctly
   * render voltas that span multiple lines.
   * 
   * @param svg - Parent SVG element
   * @param placeAndSizeManager - Collision detection manager
   */
  renderVoltas(
    svg: SVGElement,
    placeAndSizeManager: PlaceAndSizeManager
  ): void {
    const measurePositions = this.allMeasurePositions;
    const allBarlines = this.allBarlines;

    // Find all volta starts
    for (let i = 0; i < measurePositions.length; i++) {
      const mp = measurePositions[i];
      const measure = mp.measure as any;
      
      if (measure.voltaStart) {
        // Find the corresponding end measure
        let endMeasureIndex = i;
        for (let j = i; j < measurePositions.length; j++) {
          const endMeasure = measurePositions[j].measure as any;
          // Compare volta info by text value since voltaEnd is a copy of voltaStart
          if (endMeasure.voltaEnd && endMeasure.voltaEnd.text === measure.voltaStart.text) {
            endMeasureIndex = j;
            break;
          }
        }
        
        const startMP = measurePositions[i];
        const endMP = measurePositions[endMeasureIndex];
        
        // Support multi-line voltas: draw segments on each line
        if (startMP.x !== undefined && endMP.x !== undefined && startMP.y !== undefined) {
          const voltaInfo = measure.voltaStart;
          const hookHeight = 15; // Height of descending hooks
          const textSize = 14; // Font size for volta numbers
          
          // Group measures by line to draw volta segments
          const voltaMeasures = measurePositions.slice(i, endMeasureIndex + 1);
          const lineGroups = new Map<number, typeof voltaMeasures>();
          
          voltaMeasures.forEach(mp => {
            if (!lineGroups.has(mp.lineIndex)) {
              lineGroups.set(mp.lineIndex, []);
            }
            lineGroups.get(mp.lineIndex)!.push(mp);
          });
          
          // Draw one segment per line
          lineGroups.forEach((lineMeasures, lineIndex) => {
            const isFirstLine = lineIndex === startMP.lineIndex;
            const isLastLine = lineIndex === endMP.lineIndex;
            const firstMeasureOnLine = lineMeasures[0];
            const lastMeasureOnLine = lineMeasures[lineMeasures.length - 1];
            
            // Find start X: left barline of first measure in segment
            let startX: number;
            let startBarline: any;
            
            if (isFirstLine && i > 0 && measurePositions[i - 1].lineIndex === startMP.lineIndex) {
              // First line: use right barline of previous measure if exists
              const prevMeasureIndex = measurePositions[i - 1].globalIndex;
              startBarline = allBarlines.find(
                bl => bl.measureIndex === prevMeasureIndex && bl.side === 'right'
              );
              startX = startBarline?.exactX ?? (firstMeasureOnLine.x! + firstMeasureOnLine.width - 2);
            } else {
              // Continuation line OR first measure of line: use left barline
              startBarline = allBarlines.find(
                bl => bl.measureIndex === firstMeasureOnLine.globalIndex && bl.side === 'left'
              );
              startX = startBarline?.exactX ?? firstMeasureOnLine.x!;
            }
            
            // Find end X: right barline of last measure in segment
            const endRightBarline = allBarlines.find(
              bl => bl.measureIndex === lastMeasureOnLine.globalIndex && bl.side === 'right'
            );
            let endX = endRightBarline?.visualEndX ?? endRightBarline?.exactX ?? (lastMeasureOnLine.x! + lastMeasureOnLine.width - 2);
            
            const y = startBarline?.y ?? firstMeasureOnLine.y;
            
            // Draw horizontal line for this segment
            const horizontalLine = document.createElementNS(SVG_NS, 'line');
            horizontalLine.setAttribute('x1', startX.toString());
            horizontalLine.setAttribute('y1', y.toString());
            horizontalLine.setAttribute('x2', endX.toString());
            horizontalLine.setAttribute('y2', y.toString());
            horizontalLine.setAttribute('stroke', '#000');
            horizontalLine.setAttribute('stroke-width', '1.5');
            horizontalLine.setAttribute('data-volta', 'horizontal'); // For testing
            svg.appendChild(horizontalLine);
            
            // Draw left descending hook (only on first line)
            if (isFirstLine) {
              const leftHook = document.createElementNS(SVG_NS, 'line');
              leftHook.setAttribute('x1', startX.toString());
              leftHook.setAttribute('y1', y.toString());
              leftHook.setAttribute('x2', startX.toString());
              leftHook.setAttribute('y2', (y + hookHeight).toString());
              leftHook.setAttribute('stroke', '#000');
              leftHook.setAttribute('stroke-width', '1.5');
              leftHook.setAttribute('data-volta', 'left-hook'); // For testing
              svg.appendChild(leftHook);
            }
            
            // Draw right descending hook (only on last line AND if closed)
            if (isLastLine && voltaInfo.isClosed) {
              const rightHook = document.createElementNS(SVG_NS, 'line');
              rightHook.setAttribute('x1', endX.toString());
              rightHook.setAttribute('y1', y.toString());
              rightHook.setAttribute('x2', endX.toString());
              rightHook.setAttribute('y2', (y + hookHeight).toString());
              rightHook.setAttribute('stroke', '#000');
              rightHook.setAttribute('stroke-width', '1.5');
              rightHook.setAttribute('data-volta', 'right-hook'); // For testing
              svg.appendChild(rightHook);
            }
            
            // Draw text label BELOW the bracket line (only on first line)
            if (isFirstLine) {
              const textY = y + textSize + 2;
              
              // Retrieve registered volta-text position from PlaceAndSizeManager
              const registeredVoltaTexts = placeAndSizeManager.getElements().filter(el => 
                el.type === 'volta-text' && 
                el.metadata?.measureIndex === i
              );
              
              const registeredText = registeredVoltaTexts[0];
              // The registered bbox includes textMargin + leftPadding on the left side
              // We need to add both to get the actual text start position
              const textMargin = LAYOUT.VOLTA_TEXT_MARGIN;
              const leftPadding = registeredText?.metadata?.leftPadding ?? LAYOUT.VOLTA_TEXT_LEFT_PADDING;
              const textX = registeredText 
                ? registeredText.bbox.x + textMargin + leftPadding
                : startX + LAYOUT.VOLTA_TEXT_OFFSET + textMargin;
              
              const voltaText = document.createElementNS(SVG_NS, 'text');
              voltaText.setAttribute('x', textX.toString());
              voltaText.setAttribute('y', textY.toString());
              voltaText.setAttribute('font-family', 'Arial, sans-serif');
              voltaText.setAttribute('font-size', `${textSize}px`);
              voltaText.setAttribute('font-weight', 'normal');
              voltaText.setAttribute('fill', '#000');
              voltaText.setAttribute('text-anchor', 'start');
              voltaText.setAttribute('data-volta', 'text'); // For testing
              voltaText.textContent = voltaInfo.text;
              svg.appendChild(voltaText);
              
              // Measure REAL text dimensions for volta-bracket height calculation
              let realTextWidth = voltaInfo.text.length * (textSize * 0.6); // fallback estimation
              let realTextHeight = textSize;
              try {
                const textBBox = voltaText.getBBox();
                realTextWidth = textBBox.width;
                realTextHeight = textBBox.height;
              } catch (e) {
                // getBBox() may fail if SVG not attached to DOM yet, use estimation
              }
              
              // Register volta bracket for collision detection (only first line segment with text)
              placeAndSizeManager.registerElement('volta-bracket', {
                x: startX,
                y: y,
                width: endX - startX,
                height: hookHeight + realTextHeight + 4
              }, 1, { 
                text: voltaInfo.text, 
                isClosed: voltaInfo.isClosed,
                exactX: (startX + endX) / 2,
                exactY: y + hookHeight / 2,
                horizontalLineY: y,
                leftHookX: startX,
                rightHookX: endX,
                hookHeight: hookHeight,
                visualStartX: startX,
                visualEndX: endX,
                visualTopY: y,
                visualBottomY: y + hookHeight + realTextHeight + 4,
                measureStartIndex: i,
                measureEndIndex: endMeasureIndex,
                isFirstLine: true
              });
            } else {
              // Register continuation segments (without text)
              placeAndSizeManager.registerElement('volta-bracket', {
                x: startX,
                y: y,
                width: endX - startX,
                height: hookHeight
              }, 1, { 
                text: voltaInfo.text, 
                isClosed: voltaInfo.isClosed && isLastLine,
                exactX: (startX + endX) / 2,
                exactY: y + hookHeight / 2,
                horizontalLineY: y,
                leftHookX: isFirstLine ? startX : undefined,
                rightHookX: (isLastLine && voltaInfo.isClosed) ? endX : undefined,
                hookHeight: hookHeight,
                visualStartX: startX,
                visualEndX: endX,
                visualTopY: y,
                visualBottomY: y + hookHeight,
                measureStartIndex: firstMeasureOnLine.globalIndex,
                measureEndIndex: lastMeasureOnLine.globalIndex,
                isFirstLine: false,
                lineIndex: lineIndex
              });
            }
          });
        }
      }
    }
  }

  /**
   * Clears all accumulated data.
   * 
   * Should be called before starting a new render to ensure
   * no stale data from previous renders remains.
   */
  clear(): void {
    this.allMeasurePositions = [];
    this.allBarlines = [];
  }
}
