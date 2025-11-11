/**
 * @file RestRenderer.ts
 * @description Rendu SVG des silences musicaux.
 * 
 * Cette classe est spécialisée dans le rendu graphique des différents types
 * de silences (pauses, demi-pauses, soupirs, demi-soupirs, etc.).
 * 
 * Types de silences supportés :
 * - Pause (1) : rectangle suspendu sous la ligne
 * - Demi-pause (2) : rectangle posé sur la ligne
 * - Soupir (4) : forme en Z stylisée
 * - Demi-soupir (8) : crochet simple
 * - Quart de soupir (16) : double crochet
 * - Huitième de soupir (32) : triple crochet
 * - Seizième de soupir (64) : quadruple crochet
 * 
 * Tous les silences peuvent être pointés (durée × 1.5).
 */

import { NoteElement } from '../parser/type';
import { SVG_NS } from './constants';

/**
 * Classe de rendu des silences musicaux.
 */
export class RestRenderer {
  
  /**
   * Dessine un silence selon sa valeur rythmique.
   * 
   * @param svg - Élément SVG parent
   * @param note - Note marquée comme silence (isRest=true)
   * @param x - Position X du silence
   * @param y - Position Y de référence (ligne de portée)
   */
  drawRest(svg: SVGElement, note: NoteElement, x: number, y: number) {
    if (note.value === 1) {
      this.drawWholeRest(svg, x, y, note.dotted);
    } else if (note.value === 2) {
      this.drawHalfRest(svg, x, y, note.dotted);
    } else if (note.value === 4) {
      this.drawQuarterRest(svg, x, y, note.dotted);
    } else if (note.value === 8) {
      this.drawEighthRest(svg, x, y, note.dotted);
    } else if (note.value === 16) {
      this.drawSixteenthRest(svg, x, y, note.dotted);
    } else if (note.value === 32) {
      this.drawThirtySecondRest(svg, x, y, note.dotted);
    } else if (note.value === 64) {
      this.drawSixtyFourthRest(svg, x, y, note.dotted);
    }
  }
  
  private drawWholeRest(svg: SVGElement, x: number, y: number, dotted: boolean) {
    // Rectangle suspendu sous la ligne
  const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(x - 4));
    rect.setAttribute('y', String(y - 2));
    rect.setAttribute('width', '8');
    rect.setAttribute('height', '4');
    rect.setAttribute('fill', 'black');
    svg.appendChild(rect);
    
    if (dotted) {
      this.drawDot(svg, x + 8, y);
    }
  }
  
  private drawHalfRest(svg: SVGElement, x: number, y: number, dotted: boolean) {
    // Rectangle posé sur la ligne
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(x - 4));
    rect.setAttribute('y', String(y - 2));
    rect.setAttribute('width', '8');
    rect.setAttribute('height', '4');
    rect.setAttribute('fill', 'black');
    svg.appendChild(rect);
    
    if (dotted) {
      this.drawDot(svg, x + 8, y + 2);
    }
  }
  
  private drawQuarterRest(svg: SVGElement, x: number, y: number, dotted: boolean) {
    // Forme en Z stylisée (soupir)
    const path = document.createElementNS(SVG_NS, 'path');
    const d = `
      M ${x - 2},${y - 8}
      L ${x + 3},${y - 8}
      L ${x - 3},${y + 4}
      Q ${x - 4},${y + 6} ${x - 2},${y + 8}
      Q ${x},${y + 10} ${x + 2},${y + 8}
      L ${x},${y + 6}
      L ${x + 4},${y - 6}
      L ${x - 2},${y - 8}
    `;
    path.setAttribute('d', d.trim());
    path.setAttribute('fill', 'black');
    svg.appendChild(path);
    
    if (dotted) {
      this.drawDot(svg, x + 8, y);
    }
  }
  
  private drawEighthRest(svg: SVGElement, x: number, y: number, dotted: boolean) {
    // Crochet simple (demi-soupir)
    const path = document.createElementNS(SVG_NS, 'path');
    const d = `
      M ${x},${y - 6}
      Q ${x + 4},${y - 4} ${x + 5},${y}
      Q ${x + 6},${y + 4} ${x + 2},${y + 6}
      L ${x},${y + 4}
      L ${x + 2},${y}
      Q ${x + 1},${y - 2} ${x},${y - 6}
    `;
    path.setAttribute('d', d.trim());
    path.setAttribute('fill', 'black');
    svg.appendChild(path);
    
    if (dotted) {
      this.drawDot(svg, x + 8, y);
    }
  }
  
  private drawSixteenthRest(svg: SVGElement, x: number, y: number, dotted: boolean) {
    // Deux crochets (double-croche silence)
    // Premier crochet
    this.drawSingleHook(svg, x, y - 4);
    // Second crochet
    this.drawSingleHook(svg, x, y + 2);
    
    if (dotted) {
      this.drawDot(svg, x + 8, y);
    }
  }
  
  private drawThirtySecondRest(svg: SVGElement, x: number, y: number, dotted: boolean) {
    // Trois crochets
    this.drawSingleHook(svg, x, y - 6);
    this.drawSingleHook(svg, x, y - 1);
    this.drawSingleHook(svg, x, y + 4);
    
    if (dotted) {
      this.drawDot(svg, x + 8, y);
    }
  }
  
  private drawSixtyFourthRest(svg: SVGElement, x: number, y: number, dotted: boolean) {
    // Quatre crochets
    this.drawSingleHook(svg, x, y - 8);
    this.drawSingleHook(svg, x, y - 3);
    this.drawSingleHook(svg, x, y + 2);
    this.drawSingleHook(svg, x, y + 7);
    
    if (dotted) {
      this.drawDot(svg, x + 8, y);
    }
  }
  
  private drawSingleHook(svg: SVGElement, x: number, y: number) {
    const path = document.createElementNS(SVG_NS, 'path');
    const d = `
      M ${x},${y}
      Q ${x + 3},${y + 1} ${x + 4},${y + 3}
      L ${x + 2},${y + 4}
      Q ${x + 1},${y + 2} ${x},${y}
    `;
    path.setAttribute('d', d.trim());
    path.setAttribute('fill', 'black');
    svg.appendChild(path);
  }
  
  private drawDot(svg: SVGElement, x: number, y: number) {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', String(x));
    circle.setAttribute('cy', String(y));
    circle.setAttribute('r', '2');
    circle.setAttribute('fill', 'black');
    svg.appendChild(circle);
  }
}