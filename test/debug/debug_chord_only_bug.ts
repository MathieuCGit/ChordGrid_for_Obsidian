import { ChordGridParser } from '../src/parser/ChordGridParser';

const parser = new ChordGridParser();

// Exemple original du bug
const input = `
| Dm | % | E | % | Am | E | Am | E |
`.trim();

console.log('=== Test du bug original ===');
console.log('Input:');
console.log(input);
console.log('\n');

const result = parser.parse(input);

console.log('Résultat:');
console.log(`- Nombre de mesures: ${result.measures.length}`);
console.log(`- Nombre d'erreurs: ${result.errors.length}`);

if (result.errors.length > 0) {
  console.log('\n❌ ERREURS:');
  result.errors.forEach(err => {
    console.log(`  ${err.message}`);
  });
} else {
  console.log('\n✅ AUCUNE ERREUR - Bug corrigé !');
}

console.log('\nDétail des mesures:');
result.measures.forEach((m, i) => {
  const hasRhythm = m.beats.some(b => b.notes && b.notes.length > 0);
  const isRepeat = (m as any).isRepeat;
  const isChordOnly = (m as any).__isChordOnlyMode;
  console.log(`  Mesure ${i + 1}: chord="${m.chord}", hasRhythm=${hasRhythm}, isRepeat=${isRepeat}, isChordOnlyMode=${isChordOnly}`);
});
