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
  // Rendering style constants tuned for a single staff line context
  private readonly stroke = '#000';
  private readonly strokeThin = 1.6; // lighter lines for better readability
  private readonly strokeThick = 2;
  private readonly dotRadius = 1.8;
  // Match note stem height from MeasureRenderer (approx 25px)
  private readonly stemLength = 25;
  private readonly stemTopOffset = -5;  // start slightly above the staff line
  private readonly stemBottomOffset = 20; // end below the staff line so total ~= 25
  // Reference height for 1/8 rest (used to scale 1/16)
  private readonly EIGHTH_REF_HEIGHT = 1052.4 * 0.050; // ≈ 52.62 px
  // Tunables for 1/16 rest size and alignment
  private readonly sixteenthHeightRatio = 0.6; // 60% of eighth rest height
  private readonly sixteenthVertAlign = 0.55; // center placement factor (similar to 0.57 for 1/8)
  private readonly sixteenthStrokePx = 0.8; // visual stroke thickness target in px
  
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
    rect.setAttribute('y', String(y + 1)); // pend juste sous la ligne
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
    rect.setAttribute('y', String(y - (height + 1))); // posé sur la ligne
    rect.setAttribute('width', String(width));
    rect.setAttribute('height', String(height));
    rect.setAttribute('fill', 'black');
    svg.appendChild(rect);

    if (dotted) {
      this.drawDot(svg, x + width + 2, y - 2);
    }
  }
  
  private drawQuarterRest(svg: SVGElement, x: number, y: number, dotted: boolean) {
    // Soupir (quarter rest) – basé sur le SVG fourni (grande grille 512x512) compressé.
    // Le path original est massif; on applique une échelle pour obtenir ~22–24 px de hauteur.
    // Ajustables : scale, translateY pour caler précisément sur ta ligne de portée.
    const SCALE = 0.045; // 512 * 0.045 ≈ 23 px
    // Décalage vertical pour aligner le centre visuel sur y
    const RAW_HEIGHT = 512 * SCALE; // ~23
    const translateX = x - (256 * SCALE); // centrer autour de x
    const translateY = y - (RAW_HEIGHT / 2); // centrer verticalement sur y
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('transform', `translate(${translateX.toFixed(2)},${translateY.toFixed(2)}) scale(${SCALE})`);
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M349.091,371.859c-14.588-11.448-44.397-43.31-65.554-102.28c-20.802-57.964,25.648-94.268,50.571-113.841 c6.486-5.102,7.92-11.556-0.692-20.531C324.82,126.241,219.343,9.028,219.343,9.028c-13.03-17.143-30.816-7.13-20.604,7.302 c120.65,170.544-35.068,196.638-35.068,196.638s16.854,43.837,97.392,115.062c-84.28-21.915-138.6,40.178-97.392,104.108 c41.2,63.923,120.798,77.62,127.358,79.45c7.261,2.02,17.794-3.659,6.561-10.953c-25.566-16.623-78.667-60.732-53.381-92.24 c33.716-42.008,83.348-23.744,96.452-17.358C363.44,402.147,371.574,389.52,349.091,371.859z');
    path.setAttribute('fill', 'black');
    group.appendChild(path);
    svg.appendChild(group);
    if (dotted) this.drawDot(svg, x + 12, y - 4);
  }
  
  private drawEighthRest(svg: SVGElement, x: number, y: number, dotted: boolean) {
    // Demi-soupir (eighth rest) – épaissi et légèrement agrandi pour plus de lisibilité.
    const VIEW_W = 744.09;
    const VIEW_H = 1052.4;
    const SCALE = 0.050; // +11% par rapport à 0.045
    const RAW_HEIGHT = VIEW_H * SCALE;
    const centerX = VIEW_W / 2;
    const translateX = x - (centerX * SCALE);
    // Remonter un peu (55% -> 57%) pour réduire l'empiètement vertical bas
    const translateY = y - (RAW_HEIGHT * 0.57);
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('transform', `translate(${translateX.toFixed(2)},${translateY.toFixed(2)}) scale(${SCALE})`);
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'm393.4 441.74c17.21-1.095 24.829-18.447 33.337-30.631 5.2859-7.5696 18.577-14.912 24.908-8.7934 8.965 8.6646-7.7624 23.608-11.243 35.674-23.183 77.875-46.296 155.78-71.16 233.14-6.5676 6.6802-25.437 6.0742-27.886-2.034 25.232-69.872 50.463-139.74 75.695-209.62-26.033 4.9431-52.11 11.93-78.77 11.611-21.055-1.3185-42.014-15.485-46.498-36.923-5.1756-17.258 0.047-37.86 15.535-48.125 16.48-12.754 44.789-13.811 57.294 4.986 9.5372 14.464 6.4128 34.464 18.521 47.502 2.8844 2.2846 6.6328 3.2533 10.268 3.2108z');
    path.setAttribute('fill', 'black');
    // Ajout d'un contour pour épaissir visuellement le glyph
    path.setAttribute('stroke', 'black');
    path.setAttribute('stroke-width', '18'); // (18 * SCALE ≈ 0.9px visuels)
    path.setAttribute('stroke-linejoin', 'round');
    group.appendChild(path);
    svg.appendChild(group);
    if (dotted) this.drawDot(svg, x + 10, y - 2);
  }
  
  private drawSixteenthRest(svg: SVGElement, x: number, y: number, dotted: boolean) {
    // 1/16 rest – utilise le SVG fourni (12.66 x 26.65) avec un groupe interne à 1.8x.
    // On calibre pour obtenir une hauteur proche du demi-soupir (~52–55 px).
  const BASE_W = 12.66;
  const BASE_H = 26.65;
  const INTERNAL_SCALE = 1.8;
  // Calibrer pour que la hauteur corresponde EXACTEMENT à celle du demi-soupir (Htarget = 1052.4 * 0.050)
  // Calage relatif à l'1/8: 60% de la hauteur de référence
  const H_TARGET = this.EIGHTH_REF_HEIGHT * this.sixteenthHeightRatio; // ~31.6 px
  const OUTER_SCALE = H_TARGET / (BASE_H * INTERNAL_SCALE); // ≈ 1.0967
  const widthPx = BASE_W * INTERNAL_SCALE * OUTER_SCALE;
  const heightPx = H_TARGET;
  const translateX = x - widthPx / 2;
  // remonter légèrement, alignement visuel similaire au demi-soupir (57%)
  const translateY = y - (heightPx * this.sixteenthVertAlign);

    const outer = document.createElementNS(SVG_NS, 'g');
    outer.setAttribute('transform', `translate(${translateX.toFixed(2)},${translateY.toFixed(2)}) scale(${OUTER_SCALE})`);

    // Reprend la hiérarchie de transforms du fichier source
    const g1 = document.createElementNS(SVG_NS, 'g');
    g1.setAttribute('transform', 'translate(-481.99253,-144.99198)');
    const g2 = document.createElementNS(SVG_NS, 'g');
    g2.setAttribute('transform', 'matrix(1.8,0,0,1.8,-492.20747,10.83713)');
    g2.setAttribute('style', 'fill:#000000;fill-rule:evenodd;stroke:#000000;stroke-width:0;stroke-linecap:butt;stroke-linejoin:round;stroke-miterlimit:10');

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M 544.191,74.847 C 543.672,74.945 543.273,75.304 543.098,75.8 C 543.055,75.96 543.055,75.999 543.055,76.218 C 543.055,76.519 543.074,76.679 543.215,76.917 C 543.414,77.316 543.832,77.636 544.313,77.753 C 544.809,77.894 545.605,77.792 546.563,77.476 C 546.703,77.417 546.82,77.374 546.82,77.394 C 546.82,77.417 545.926,80.324 545.887,80.425 C 545.785,80.683 545.445,81.16 545.148,81.46 C 544.871,81.738 544.73,81.8 544.512,81.699 C 544.332,81.601 544.273,81.499 544.152,80.96 C 544.051,80.562 543.973,80.343 543.813,80.187 C 543.395,79.726 542.676,79.667 542.121,80.027 C 541.859,80.206 541.66,80.484 541.543,80.785 C 541.5,80.941 541.5,80.984 541.5,81.202 C 541.5,81.499 541.523,81.66 541.66,81.898 C 541.859,82.296 542.277,82.617 542.758,82.734 C 542.977,82.796 543.535,82.796 543.914,82.734 C 544.23,82.675 544.609,82.577 544.988,82.456 C 545.148,82.398 545.289,82.359 545.289,82.378 C 545.289,82.378 543.336,88.734 543.297,88.831 C 543.297,88.851 543.453,88.972 543.613,89.011 C 543.773,89.074 543.934,89.074 544.094,89.011 C 544.25,88.972 544.41,88.874 544.41,88.812 C 544.43,88.792 545.227,85.785 546.203,82.136 L 547.977,75.503 L 547.938,75.445 C 547.859,75.324 547.699,75.304 547.559,75.363 C 547.48,75.402 547.48,75.402 547.242,75.761 C 547.043,76.081 546.762,76.417 546.602,76.577 C 546.383,76.757 546.266,76.796 546.066,76.718 C 545.887,76.62 545.824,76.519 545.707,75.98 C 545.586,75.445 545.445,75.202 545.148,75.003 C 544.871,74.824 544.512,74.765 544.191,74.847 z ');
    // Épaissir légèrement comme pour le demi-soupir, en conservant une épaisseur visuelle cible
    path.setAttribute('fill', '#000');
  path.setAttribute('stroke', '#000');
  const desiredStrokePx = this.sixteenthStrokePx; // épaisseur visuelle cible
  const strokeAttr = desiredStrokePx / (INTERNAL_SCALE * OUTER_SCALE);
  path.setAttribute('stroke-width', strokeAttr.toFixed(3));
    path.setAttribute('stroke-linejoin', 'round');

    g2.appendChild(path);
    g1.appendChild(g2);
    outer.appendChild(g1);
    svg.appendChild(outer);
    if (dotted) this.drawDot(svg, x + 10, y - 2);
  }
  
  private drawThirtySecondRest(svg: SVGElement, x: number, y: number, dotted: boolean) {
    // 1/32 rest: three droplets
    this.drawRestStem(svg, x, y + this.stemTopOffset, y + this.stemBottomOffset);
    this.drawDroplet(svg, x + 2, y - 6, 6, 4.5);
    this.drawDroplet(svg, x + 2, y, 6, 4.5);
    this.drawDroplet(svg, x + 2, y + 6, 6, 4.5);
    if (dotted) this.drawDot(svg, x + 10, y - 2);
  }
  
  private drawSixtyFourthRest(svg: SVGElement, x: number, y: number, dotted: boolean) {
    // 1/64 rest: four droplets
    this.drawRestStem(svg, x, y + this.stemTopOffset, y + this.stemBottomOffset);
    this.drawDroplet(svg, x + 2, y - 6, 6, 4.5);
    this.drawDroplet(svg, x + 2, y, 6, 4.5);
    this.drawDroplet(svg, x + 2, y + 6, 6, 4.5);
    this.drawDroplet(svg, x + 2, y + 12, 6, 4.5);
    if (dotted) this.drawDot(svg, x + 10, y - 2);
  }
  
  private drawRestStem(svg: SVGElement, x: number, topY: number, bottomY: number) {
    const stem = document.createElementNS(SVG_NS, 'line');
    stem.setAttribute('x1', String(x));
    stem.setAttribute('y1', String(topY));
    stem.setAttribute('x2', String(x));
    stem.setAttribute('y2', String(bottomY));
    stem.setAttribute('stroke', this.stroke);
    stem.setAttribute('stroke-width', String(this.strokeThin));
    stem.setAttribute('stroke-linecap', 'round');
    svg.appendChild(stem);
  }

  private drawDroplet(svg: SVGElement, cx: number, cy: number, w: number = 4, h: number = 3) {
    // Light, compact droplet
    const path = document.createElementNS(SVG_NS, 'path');
    const d = `M ${cx},${cy}
               c ${w/3},${-h} ${w},${-h} ${w},0
               c 0,${h} ${-w/1.5},${h+1} ${-w},${h+1}
               c ${-w/3},${-1} ${-w/3},${-h} 0,${-h+1}
               z`;
    path.setAttribute('d', d.replace(/\s+/g,' '));
    path.setAttribute('fill', 'black');
    svg.appendChild(path);
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