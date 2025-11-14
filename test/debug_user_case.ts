/**
 * Analyse du cas utilisateur : validation rythmique incorrecte
 * Input: 4/4 | [{816-16 1616 8 8}5:8 {16-1688-8 8-88}7:8 {888}3 4] |
 */

import { ChordGridParser } from '../src/parser/ChordGridParser';

const parser = new ChordGridParser();

console.log('\n=== Analyse du cas utilisateur ===');
const input = "4/4 | [{816-16 1616 8 8}5:8 {16-1688-8 8-88}7:8 {888}3 4] |";
console.log('Input:', input);

const result = parser.parse(input);

console.log('\n📊 Résultat du parsing:');
console.log('Mesures:', result.grid.measures.length);
console.log('Erreurs:', result.errors);

// Analyser chaque tuplet
const measure = result.grid.measures[0];
console.log('\n📋 Analyse des tuplets:');

const tuplets = new Map<string, any[]>();
for (const beat of measure.beats) {
  for (const note of beat.notes) {
    if (note.tuplet) {
      if (!tuplets.has(note.tuplet.groupId)) {
        tuplets.set(note.tuplet.groupId, []);
      }
      tuplets.get(note.tuplet.groupId)!.push(note);
    }
  }
}

console.log(`\nNombre de tuplets trouvés: ${tuplets.size}`);

let tupletIndex = 1;
for (const [groupId, notes] of tuplets) {
  console.log(`\n--- Tuplet ${tupletIndex} (${groupId}) ---`);
  console.log(`Nombre de notes: ${notes.length}`);
  console.log(`Count déclaré: ${notes[0].tuplet?.count}`);
  console.log(`Ratio: ${notes[0].tuplet?.ratio ? 
    `${notes[0].tuplet.ratio.numerator}:${notes[0].tuplet.ratio.denominator}` : 
    'défaut'}`);
  
  // Calculer la durée totale
  let totalDuration = 0;
  for (const note of notes) {
    const baseWhole = 1 / note.value;
    const dottedMult = note.dotted ? 1.5 : 1;
    totalDuration += baseWhole * dottedMult;
  }
  
  console.log(`Durée totale des notes: ${totalDuration} de ronde = ${totalDuration * 4} quarter-notes`);
  
  // Calculer avec le ratio
  let ratio = 1;
  if (notes[0].tuplet?.ratio) {
    ratio = notes[0].tuplet.ratio.denominator / notes[0].tuplet.ratio.numerator;
  } else {
    // Check default ratio table
    const defaultRatios: Record<number, {numerator: number, denominator: number}> = {
      3: { numerator: 3, denominator: 2 },
      5: { numerator: 5, denominator: 4 },
      6: { numerator: 6, denominator: 4 },
      7: { numerator: 7, denominator: 4 },
    };
    const defaultRatio = defaultRatios[notes[0].tuplet!.count];
    if (defaultRatio) {
      ratio = defaultRatio.denominator / defaultRatio.numerator;
      console.log(`Utilise ratio par défaut ${defaultRatio.numerator}:${defaultRatio.denominator}`);
    } else {
      const normalCount = Math.pow(2, Math.floor(Math.log2(notes[0].tuplet!.count)));
      ratio = normalCount / notes[0].tuplet!.count;
      console.log(`Utilise calcul automatique (${normalCount}/${notes[0].tuplet!.count})`);
    }
  }
  
  const actualDuration = totalDuration * ratio;
  console.log(`Ratio appliqué: ${ratio}`);
  console.log(`Durée réelle: ${actualDuration} de ronde = ${actualDuration * 4} quarter-notes`);
  
  tupletIndex++;
}

// Analyser les notes non-tuplet
console.log('\n--- Notes hors tuplet ---');
let nonTupletDuration = 0;
for (const beat of measure.beats) {
  for (const note of beat.notes) {
    if (!note.tuplet) {
      const baseWhole = 1 / note.value;
      const dottedMult = note.dotted ? 1.5 : 1;
      nonTupletDuration += baseWhole * dottedMult;
      console.log(`Note ${note.value}: ${baseWhole * dottedMult} de ronde`);
    }
  }
}
console.log(`Total notes hors tuplet: ${nonTupletDuration} de ronde = ${nonTupletDuration * 4} quarter-notes`);

console.log('\n=== DIAGNOSTIC ===');
console.log('Le problème vient probablement du fait que le COUNT déclaré ne correspond pas');
console.log('au nombre réel de notes dans le tuplet.');
console.log('Par exemple: {816-16 1616 8 8}5:8 contient 7 notes mais déclare }5:8');
