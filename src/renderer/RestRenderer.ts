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
 * 
 * Proportions calibrées sur les notes rythmiques :
 * - Quarter note (4) : slash 10px + stem 25px = 30px total
 * - Tous les silences sont proportionnés à cette référence
 */
export class RestRenderer {
  // Rendering style constants
  private readonly dotRadius = 1.8;
  private readonly NOTE_HEIGHT = 30; // Hauteur de référence d'une quarter note (slash + stem)
  
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
    // Pause: rectangle plein suspendu SOUS la ligne de portée
    const width = 10;
    const height = 4;
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(x - width / 2));
    rect.setAttribute('y', String(y + 2)); // pend sous la ligne
    rect.setAttribute('width', String(width));
    rect.setAttribute('height', String(height));
    rect.setAttribute('fill', 'black');
    svg.appendChild(rect);

    if (dotted) {
      this.drawDot(svg, x + width + 2, y);
    }
  }
  
  private drawHalfRest(svg: SVGElement, x: number, y: number, dotted: boolean) {
    // Demi-pause: rectangle plein POSÉ SUR la ligne
    const width = 10;
    const height = 4;
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(x - width / 2));
    rect.setAttribute('y', String(y - height)); // posé sur la ligne
    rect.setAttribute('width', String(width));
    rect.setAttribute('height', String(height));
    rect.setAttribute('fill', 'black');
    svg.appendChild(rect);

    if (dotted) {
      this.drawDot(svg, x + width + 2, y - 2);
    }
  }
  
  private drawQuarterRest(svg: SVGElement, x: number, y: number, dotted: boolean) {
    // Soupir (quarter rest) – path canonique centré dans un viewBox de 100x100
    // Hauteur calibrée pour correspondre à une noire : 30px (slash 10px + stem 25px - 5px overlap)
    const TARGET_HEIGHT = 24; // Ajusté à 24px
    const SYMBOL_HEIGHT = 12; // Hauteur approximative du symbole original (71 à 83)
    const SCALE = TARGET_HEIGHT / SYMBOL_HEIGHT; // = 2.0
    const SYMBOL_CENTER_X = 512;
    const SYMBOL_CENTER_Y = 75;
    
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('transform', `translate(${x},${y}) scale(${SCALE}) translate(${-SYMBOL_CENTER_X},${-SYMBOL_CENTER_Y})`);
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'm 512.254,71.019 c -0.137,0.058 -0.219,0.258 -0.156,0.398 0.019,0.02 0.218,0.258 0.418,0.52 0.457,0.515 0.535,0.637 0.636,0.875 0.399,0.816 0.18,1.855 -0.519,2.512 -0.059,0.078 -0.317,0.296 -0.559,0.476 -0.695,0.598 -1.015,0.938 -1.133,1.238 -0.043,0.079 -0.043,0.157 -0.043,0.278 -0.019,0.277 0,0.301 0.821,1.254 1.113,1.336 1.91,2.273 1.972,2.332 l 0.059,0.058 -0.078,-0.039 c -1.098,-0.457 -2.332,-0.676 -2.75,-0.476 -0.141,0.058 -0.223,0.14 -0.281,0.277 -0.161,0.34 -0.118,0.84 0.121,1.574 0.218,0.66 0.656,1.535 1.093,2.192 0.18,0.281 0.52,0.718 0.559,0.738 0.059,0.059 0.141,0.039 0.199,0 0.059,-0.078 0.059,-0.141 -0.058,-0.277 -0.418,-0.598 -0.617,-1.836 -0.379,-2.493 0.097,-0.296 0.219,-0.457 0.437,-0.558 0.578,-0.258 1.856,0.062 2.391,0.597 0.039,0.04 0.121,0.122 0.16,0.141 0.141,0.059 0.34,-0.019 0.399,-0.16 0.082,-0.141 0.039,-0.238 -0.141,-0.457 -0.336,-0.399 -1.352,-1.594 -1.492,-1.774 -0.36,-0.418 -0.52,-0.816 -0.559,-1.316 -0.019,-0.637 0.238,-1.312 0.719,-1.754 0.058,-0.078 0.316,-0.297 0.555,-0.476 0.738,-0.618 1.039,-0.957 1.156,-1.278 0.082,-0.258 0.043,-0.496 -0.137,-0.715 -0.062,-0.058 -0.758,-0.918 -1.574,-1.894 -1.117,-1.313 -1.516,-1.793 -1.574,-1.813 -0.082,-0.019 -0.18,-0.019 -0.262,0.02 z');
    path.setAttribute('fill', '#000000');
    group.appendChild(path);
    svg.appendChild(group);
    if (dotted) this.drawDot(svg, x + 12, y - 4);
  }
  
  private drawEighthRest(svg: SVGElement, x: number, y: number, dotted: boolean) {
    // Demi-soupir (eighth rest) – path canonique centré
    // Hauteur similaire au quarter rest
    const TARGET_HEIGHT = 18; // Réduit significativement
    const SYMBOL_HEIGHT = 9; // Hauteur approximative du symbole original
    const SCALE = TARGET_HEIGHT / SYMBOL_HEIGHT; // ≈ 2
    const SYMBOL_CENTER_X = 531;
    const SYMBOL_CENTER_Y = 78;
    
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('transform', `translate(${x},${y}) scale(${SCALE}) translate(${-SYMBOL_CENTER_X},${-SYMBOL_CENTER_Y})`);
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'm 531.098,74.847 c -0.52,0.098 -0.918,0.457 -1.098,0.953 -0.039,0.16 -0.039,0.199 -0.039,0.418 0,0.301 0.019,0.461 0.16,0.699 0.199,0.399 0.617,0.719 1.094,0.836 0.5,0.141 1.336,0.02 2.293,-0.297 l 0.238,-0.082 -1.176,3.25 -1.156,3.246 c 0,0 0.039,0.02 0.102,0.063 0.117,0.078 0.316,0.137 0.457,0.137 0.238,0 0.539,-0.137 0.578,-0.258 0,-0.039 0.558,-1.934 1.234,-4.184 l 1.195,-4.125 -0.039,-0.058 c -0.097,-0.121 -0.296,-0.16 -0.418,-0.063 -0.039,0.039 -0.101,0.121 -0.14,0.18 -0.18,0.301 -0.637,0.836 -0.875,1.035 -0.219,0.18 -0.34,0.199 -0.539,0.121 -0.18,-0.098 -0.239,-0.199 -0.36,-0.738 -0.117,-0.535 -0.257,-0.778 -0.558,-0.977 -0.278,-0.179 -0.637,-0.238 -0.953,-0.156 z');
    path.setAttribute('fill', '#000000');
    group.appendChild(path);
    svg.appendChild(group);
    if (dotted) this.drawDot(svg, x + 10, y - 2);
  }
  
  private drawSixteenthRest(svg: SVGElement, x: number, y: number, dotted: boolean) {
    // 1/16 rest – path canonique centré
    // Légèrement plus grand que le 1/8 pour accommoder le 2ème crochet
    const TARGET_HEIGHT = 24; // Augmenté (un peu plus grand que le 1/8)
    const SYMBOL_HEIGHT = 14.5; // Hauteur approximative du symbole original (75 à 89.5)
    const SCALE = TARGET_HEIGHT / SYMBOL_HEIGHT; // ≈ 1.65
    const SYMBOL_CENTER_X = 544;
    const SYMBOL_CENTER_Y = 81;
    
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('transform', `translate(${x},${y}) scale(${SCALE}) translate(${-SYMBOL_CENTER_X},${-SYMBOL_CENTER_Y})`);
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'm 544.191,74.847 c -0.519,0.098 -0.918,0.457 -1.093,0.953 -0.043,0.16 -0.043,0.199 -0.043,0.418 0,0.301 0.019,0.461 0.16,0.699 0.199,0.399 0.617,0.719 1.098,0.836 0.496,0.141 1.292,0.039 2.25,-0.277 0.14,-0.059 0.257,-0.102 0.257,-0.082 0,0.023 -0.894,2.93 -0.933,3.031 -0.102,0.258 -0.442,0.735 -0.739,1.035 -0.277,0.278 -0.418,0.34 -0.636,0.239 -0.18,-0.098 -0.239,-0.2 -0.36,-0.739 -0.101,-0.398 -0.179,-0.617 -0.339,-0.773 -0.418,-0.461 -1.137,-0.52 -1.692,-0.16 -0.262,0.179 -0.461,0.457 -0.578,0.758 -0.043,0.156 -0.043,0.199 -0.043,0.417 0,0.297 0.023,0.458 0.16,0.696 0.199,0.398 0.617,0.719 1.098,0.836 0.219,0.062 0.777,0.062 1.156,0 0.316,-0.059 0.695,-0.157 1.074,-0.278 0.16,-0.058 0.301,-0.097 0.301,-0.078 0,0 -1.953,6.356 -1.992,6.453 0,0.02 0.156,0.141 0.316,0.18 0.16,0.063 0.321,0.063 0.481,0 0.156,-0.039 0.316,-0.137 0.316,-0.199 0.02,-0.02 0.817,-3.027 1.793,-6.676 l 1.774,-6.633 -0.039,-0.058 c -0.079,-0.121 -0.239,-0.141 -0.379,-0.082 -0.079,0.039 -0.079,0.039 -0.317,0.398 -0.199,0.32 -0.48,0.656 -0.64,0.816 -0.219,0.18 -0.336,0.219 -0.536,0.141 -0.179,-0.098 -0.242,-0.199 -0.359,-0.738 -0.121,-0.535 -0.262,-0.778 -0.559,-0.977 -0.277,-0.179 -0.636,-0.238 -0.957,-0.156 z');
    path.setAttribute('fill', '#000000');
    group.appendChild(path);
    svg.appendChild(group);
    if (dotted) this.drawDot(svg, x + 10, y - 2);
  }
  
  private drawThirtySecondRest(svg: SVGElement, x: number, y: number, dotted: boolean) {
    // 1/32 rest – path canonique centré (3 crochets)
    // Plus grand que le 1/16 pour accommoder le 3ème crochet
    const TARGET_HEIGHT = 28; // Augmenté
    const SYMBOL_HEIGHT = 21; // Hauteur approximative du symbole original (70 à 91)
    const SCALE = TARGET_HEIGHT / SYMBOL_HEIGHT; // ≈ 1.33
    const SYMBOL_CENTER_X = 554;
    const SYMBOL_CENTER_Y = 76;
    
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('transform', `translate(${x},${y}) scale(${SCALE}) translate(${-SYMBOL_CENTER_X},${-SYMBOL_CENTER_Y})`);
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'm 553.789,69.863 c -0.516,0.101 -0.918,0.461 -1.094,0.957 -0.043,0.16 -0.043,0.199 -0.043,0.418 0,0.218 0,0.3 0.043,0.418 0.137,0.441 0.418,0.777 0.856,0.976 0.297,0.16 0.437,0.18 0.855,0.18 0.52,0 0.957,-0.078 1.657,-0.297 0.179,-0.063 0.316,-0.102 0.316,-0.102 0.019,0 -0.16,0.7 -0.399,1.536 -0.296,1.175 -0.417,1.554 -0.457,1.671 -0.16,0.301 -0.5,0.758 -0.718,0.957 -0.2,0.18 -0.317,0.219 -0.516,0.141 -0.18,-0.098 -0.242,-0.199 -0.359,-0.738 -0.102,-0.399 -0.18,-0.617 -0.34,-0.778 -0.418,-0.457 -1.137,-0.515 -1.692,-0.156 -0.261,0.176 -0.46,0.457 -0.578,0.754 -0.043,0.16 -0.043,0.199 -0.043,0.418 0,0.301 0.024,0.461 0.161,0.699 0.199,0.399 0.617,0.719 1.097,0.836 0.219,0.063 0.778,0.063 1.156,0 0.317,-0.058 0.696,-0.16 1.075,-0.277 0.179,-0.059 0.32,-0.102 0.32,-0.102 0,0.02 -0.797,3.051 -0.84,3.11 -0.156,0.34 -0.476,0.758 -0.715,0.996 -0.258,0.258 -0.398,0.301 -0.617,0.219 -0.18,-0.098 -0.242,-0.2 -0.359,-0.739 -0.102,-0.398 -0.18,-0.617 -0.34,-0.773 -0.418,-0.461 -1.137,-0.52 -1.692,-0.16 -0.261,0.179 -0.46,0.457 -0.578,0.758 -0.043,0.156 -0.043,0.199 -0.043,0.417 0,0.219 0,0.297 0.043,0.418 0.137,0.438 0.418,0.778 0.856,0.977 0.32,0.16 0.437,0.18 0.875,0.18 0.32,0 0.422,0 0.679,-0.043 0.36,-0.059 0.739,-0.176 1.157,-0.297 l 0.258,-0.102 v 0.063 c -0.02,0.078 -1.696,6.375 -1.715,6.414 -0.02,0.082 0.34,0.238 0.558,0.238 0.219,0 0.539,-0.137 0.559,-0.238 0.019,-0.02 0.976,-4.145 2.172,-9.164 2.133,-9.086 2.133,-9.106 2.094,-9.168 -0.063,-0.078 -0.161,-0.117 -0.282,-0.117 -0.14,0.019 -0.199,0.078 -0.34,0.316 -0.277,0.481 -0.597,0.898 -0.773,1.039 -0.121,0.078 -0.223,0.078 -0.379,0.02 -0.18,-0.102 -0.242,-0.2 -0.359,-0.739 -0.121,-0.539 -0.262,-0.777 -0.559,-0.976 -0.277,-0.18 -0.637,-0.238 -0.957,-0.16 z');
    path.setAttribute('fill', '#000000');
    group.appendChild(path);
    svg.appendChild(group);
    if (dotted) this.drawDot(svg, x + 10, y - 2);
  }
  
  private drawSixtyFourthRest(svg: SVGElement, x: number, y: number, dotted: boolean) {
    // 1/64 rest – path canonique centré (4 crochets)
    // Le plus grand pour accommoder 4 crochets
    const TARGET_HEIGHT = 32; // Augmenté
    const SYMBOL_HEIGHT = 52; // Hauteur approximative du symbole original (18 à 70)
    const SCALE = TARGET_HEIGHT / SYMBOL_HEIGHT; // ≈ 0.62
    const SYMBOL_CENTER_X = 608;
    const SYMBOL_CENTER_Y = 45;
    
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('transform', `translate(${x},${y}) scale(${SCALE}) translate(${-SYMBOL_CENTER_X},${-SYMBOL_CENTER_Y})`);
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'm 608.27627,17.897034 c -0.9342,0.1818 -1.6524,0.8298 -1.9692,1.7226 -0.0774,0.288 -0.0774,0.3582 -0.0774,0.7524 0,0.3924 0,0.54 0.0774,0.7524 0.2466,0.7938 0.7524,1.3986 1.5408,1.7568 0.5688,0.288 0.7866,0.324 1.575,0.324 0.5418,0 0.7524,0 1.188,-0.0702 0.5688,-0.1062 1.3572,-0.324 1.9692,-0.5346 l 0.3942,-0.1476 -0.036,0.1476 c -0.0342,0.0702 -0.288,1.3212 -0.612,2.7558 -0.5688,2.511 -0.6048,2.6586 -0.7866,2.9808 -0.3942,0.8226 -0.963,1.611 -1.3644,1.8648 -0.2106,0.1404 -0.3942,0.1404 -0.6408,0.0342 -0.3222,-0.1764 -0.4356,-0.3582 -0.6462,-1.3284 -0.1836,-0.7182 -0.324,-1.1106 -0.612,-1.4004 -0.7524,-0.8226 -2.0466,-0.927 -3.051,-0.2808 -0.4644,0.3168 -0.8226,0.8226 -1.0332,1.3572 -0.0774,0.288 -0.0774,0.3582 -0.0774,0.7524 0,0.5418 0.0342,0.8298 0.288,1.2582 0.3582,0.7182 1.1106,1.2942 1.9764,1.5048 0.3924,0.1134 1.3986,0.1134 2.0808,0 0.5688,-0.1044 1.251,-0.288 1.9332,-0.4986 0.324,-0.1062 0.5418,-0.1836 0.576,-0.1836 0,0.036 -1.2222,5.4216 -1.2924,5.598 -0.2196,0.4644 -0.7884,1.3644 -1.2168,1.827 -0.4716,0.4302 -0.6822,0.5076 -1.0764,0.36 -0.324,-0.1764 -0.4356,-0.36 -0.6462,-1.3302 -0.1836,-0.7164 -0.324,-1.1106 -0.612,-1.3914 -0.7524,-0.8298 -2.0466,-0.936 -3.051,-0.288 -0.4644,0.3222 -0.8226,0.8226 -1.0422,1.3644 -0.0702,0.2808 -0.0702,0.3582 -0.0702,0.7506 0,0.5346 0.036,0.8244 0.2898,1.2528 0.3582,0.7164 1.1106,1.2942 1.9746,1.5048 0.9288,0.252 2.475,0.0414 4.2336,-0.5346 0.2448,-0.1062 0.4986,-0.1836 0.4986,-0.1836 0,0.0432 -0.288,1.224 -0.612,2.6928 -0.5346,2.511 -0.5688,2.6928 -0.7524,3.0096 -0.288,0.612 -0.927,1.4778 -1.3644,1.8702 -0.3582,0.324 -0.603,0.3942 -0.963,0.2466 -0.3222,-0.1764 -0.4356,-0.3582 -0.6462,-1.3212 -0.1836,-0.7182 -0.324,-1.1124 -0.612,-1.4004 -0.7524,-0.8298 -2.0466,-0.9342 -3.051,-0.288 -0.4644,0.324 -0.8226,0.8226 -1.0332,1.3644 -0.0774,0.288 -0.0774,0.3582 -0.0774,0.7524 0,0.5346 0.0342,0.8226 0.288,1.251 0.3582,0.7182 1.1106,1.2942 1.9746,1.512 0.9288,0.2466 2.7216,0 4.4802,-0.612 0.2178,-0.0702 0.3582,-0.1044 0.3582,-0.1044 0,0.0342 -2.511,11.2914 -2.6154,11.6496 0,0.0774 0.0342,0.1134 0.1746,0.1836 0.2196,0.1404 0.5778,0.2538 0.8298,0.2538 0.2466,0 0.6048,-0.1134 0.8226,-0.2538 0.1476,-0.0702 0.1836,-0.1062 0.2196,-0.288 0,-0.1062 1.8972,-9.5418 4.2318,-20.9826 3.6918,-18.4356 4.1562,-20.7972 4.1202,-20.8746 -0.1044,-0.1764 -0.2466,-0.2466 -0.4644,-0.2466 -0.3222,0 -0.3924,0.0702 -0.7164,0.6822 -0.4644,0.8928 -0.936,1.539 -1.2582,1.7928 -0.1764,0.1404 -0.36,0.1404 -0.6408,0.036 -0.3222,-0.1836 -0.4356,-0.36 -0.6462,-1.3302 -0.2178,-0.9702 -0.4716,-1.3986 -1.0062,-1.7568 -0.5058,-0.324 -1.1448,-0.4284 -1.7226,-0.288 z');
    path.setAttribute('fill', '#000000');
    group.appendChild(path);
    svg.appendChild(group);
    if (dotted) this.drawDot(svg, x + 10, y - 2);
  }
  
  private drawDot(svg: SVGElement, x: number, y: number) {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', String(x));
    circle.setAttribute('cy', String(y));
    circle.setAttribute('r', String(this.dotRadius));
    circle.setAttribute('fill', 'black');
    svg.appendChild(circle);
  }
}