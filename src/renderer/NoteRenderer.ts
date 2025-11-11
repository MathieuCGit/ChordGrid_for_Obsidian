/**
 * @file NoteRenderer.ts
 * @description Rendu SVG des notes et de leurs ligatures.
 * 
 * Cette classe gère le rendu graphique des notes musicales dans un beat,
 * incluant :
 * - Les têtes de notes (slash notation)
 * - Les hampes (stems)
 * - Les crochets individuels (flags) pour notes non groupées
 * - Les ligatures (beams) reliant plusieurs notes
 * - Les points pour notes pointées
 * - Les silences (délégués à RestRenderer)
 * 
 * Les ligatures peuvent avoir plusieurs niveaux (croches, doubles-croches, etc.)
 * et sont calculées automatiquement selon la valeur des notes.
 * 
 * @see {@link RestRenderer} pour le rendu des silences
 */

import { Beat, BeamGroup, NoteElement } from '../parser/type';
import { RestRenderer } from './RestRenderer';
import { SVG_NS } from './constants';

/**
 * Classe de rendu des notes et ligatures d'un beat.
 */
export class NoteRenderer {
  // expected fields
  private beat: Beat;
  private x: number;
  private y: number;
  private NOTE_Y = 40;
  private restRenderer = new RestRenderer();

  /**
   * Constructeur du renderer de notes.
   * 
   * @param beat - Beat contenant les notes à rendre
   * @param x - Position X de départ du beat
   * @param y - Position Y de départ du beat
   */
  constructor(beat?: Beat, x?: number, y?: number) {
    // allow zero-arg construction for type-checking scenarios; assign when provided
    this.beat = beat as Beat ?? { notes: [], hasBeam: false, beamGroups: [] };
    this.x = x ?? 0;
    this.y = y ?? 0;
  }
  
  /**
   * Dessine un groupe de ligatures reliant plusieurs notes.
   * 
   * Calcule le nombre de niveaux de ligatures nécessaires selon les valeurs
   * des notes (croches = 1 niveau, doubles-croches = 2 niveaux, etc.).
   * 
   * @param svg - Élément SVG parent
   * @param group - Groupe de ligature avec indices de début et fin
   * @param spacing - Espacement entre notes
   */
  private drawBeamGroup(svg: SVGElement, group: BeamGroup, spacing: number) {
    // group.startIndex et group.endIndex sont les VRAIS indices dans beat.notes
    const notes = this.beat.notes.slice(group.startIndex, group.endIndex + 1);
    const startX = this.x + group.startIndex * spacing;
    const endX = this.x + group.endIndex * spacing;
    
    console.log(`Dessiner ligature du groupe:`, {
      startIndex: group.startIndex,
      endIndex: group.endIndex,
      notes: notes.map(n => ({ value: n.value, isRest: n.isRest })),
      startX,
      endX,
      width: endX - startX,
      x: this.x,
      spacing
    });
    
    // Calculer le nombre de ligatures nécessaires
    const maxBeams = Math.max(...notes.map(n => this.getBeamCount(n.value)));
    
    for (let beamLevel = 0; beamLevel < maxBeams; beamLevel++) {
      this.drawBeamLevel(svg, notes, startX, spacing, beamLevel);
    }
  }
  
  /**
   * Rend le beat complet avec toutes ses notes, silences et ligatures.
   * 
   * Cette méthode principale :
   * 1. Dessine chaque note ou silence
   * 2. Ajoute les hampes et crochets individuels si nécessaire
   * 3. Dessine les groupes de ligatures pour les notes groupées
   * 
   * @param svg - Élément SVG parent
   */
  render(svg: SVGElement) {
    const noteSpacing = 20;
    
    console.log('Rendu beat:', {
      notes: this.beat.notes.map(n => ({ value: n.value, isRest: n.isRest })),
      hasBeam: this.beat.hasBeam,
      beamGroups: this.beat.beamGroups
    });
    
    // Dessiner toutes les notes/silences
    this.beat.notes.forEach((element, i) => {
      const x = this.x + i * noteSpacing; // i est l'index réel dans beat.notes
      const y = this.y + this.NOTE_Y;
      
      console.log(`Rendu élément ${i}:`, { 
        value: element.value, 
        isRest: element.isRest,
        x, y 
      });
      
      if (element.isRest) {
        this.restRenderer.drawRest(svg, element, x, y);
      } else {
        this.drawSlashNotehead(svg, x, y);
        
        if (element.dotted) {
          this.drawDot(svg, x + 12, y);
        }
        
        if (element.value >= 2) {
          this.drawStem(svg, x, y);
        }
        
        // Crochets individuels si pas dans un groupe de ligature
        if (element.value >= 8 && !this.isInBeamGroup(i)) {
          this.drawIndividualFlags(svg, element, x, y);
        }
      }
    });
    
    // Dessiner les ligatures par groupe
    for (const group of this.beat.beamGroups) {
      console.log(`Traiter groupe de ligature:`, group);
      this.drawBeamGroup(svg, group, noteSpacing);
    }
  }

  private isInBeamGroup(noteIndex: number): boolean {
    return this.beat.beamGroups.some(group => 
      noteIndex >= group.startIndex && 
      noteIndex <= group.endIndex
    );
  }

  // --- Minimal helper stubs so TypeScript typechecks ---
  private getBeamCount(value: number): number {
    if (value >= 32) return 3;
    if (value >= 16) return 2;
    if (value >= 8) return 1;
    return 0;
  }

  private drawBeamLevel(svg: SVGElement, notes: NoteElement[], startX: number, spacing: number, beamLevel: number) {
    // Match main_2025 beam positioning
    const y = this.y + this.NOTE_Y - 25 - beamLevel * 5;
    const firstX = startX - 3; // Account for stem offset
    const lastX = startX + (notes.length - 1) * spacing - 3;
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(firstX));
    line.setAttribute('y1', String(y));
    line.setAttribute('x2', String(lastX));
    line.setAttribute('y2', String(y));
    line.setAttribute('stroke', '#000');
    line.setAttribute('stroke-width', '2');
    svg.appendChild(line);
  }

  private drawSlashNotehead(svg: SVGElement, x: number, y: number) {
    // Use slash like in main_2025
    const slashLength = 10;
    const slash = document.createElementNS(SVG_NS, 'line');
    slash.setAttribute('x1', (x + slashLength/2).toString());
    slash.setAttribute('y1', (y - slashLength/2).toString());
    slash.setAttribute('x2', (x - slashLength/2).toString());
    slash.setAttribute('y2', (y + slashLength/2).toString());
    slash.setAttribute('stroke', '#000');
    slash.setAttribute('stroke-width', '2.5');
    svg.appendChild(slash);
  }

  private drawDot(svg: SVGElement, x: number, y: number) {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', String(x));
    c.setAttribute('cy', String(y));
    c.setAttribute('r', '1.5');
    c.setAttribute('fill', 'black');
    svg.appendChild(c);
  }

  private drawStem(svg: SVGElement, x: number, y: number) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(x - 3)); // Attach to left side of slash
    line.setAttribute('y1', String(y + 5)); // Start below slash
    line.setAttribute('x2', String(x - 3));
    line.setAttribute('y2', String(y - 25)); // Match main_2025 height
    line.setAttribute('stroke', '#000');
    line.setAttribute('stroke-width', '1.5');
    svg.appendChild(line);
  }

  private drawIndividualFlags(svg: SVGElement, element: NoteElement, x: number, y: number) {
    const stemX = x - 3;
    const stemTopY = y - 25;
    const count = element.value === 16 ? 2 : element.value === 32 ? 3 : element.value === 64 ? 4 : 1;
    
    for (let i = 0; i < count; i++) {
      const flagY = stemTopY + i * 5;
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', `M ${stemX} ${flagY} Q ${stemX - 8} ${flagY - 4} ${stemX - 6} ${flagY - 10}`);
      path.setAttribute('stroke', '#000');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('fill', 'none');
      svg.appendChild(path);
    }
  }
}
