import { ChordGridParser } from '../src/parser/ChordGridParser';

const input = `4/4 ||: Am[88 4] G[4 88] | C[4 4 4 323216323216] | Dm[4 4] G[88 88] | C[88 4 88 4] |
| Am[88 4 88 16161616] | D[1] | G[1] :||`;

const parser = new ChordGridParser();
const result = parser.parse(input);

console.log('Errors:');
console.log(result.errors);

console.log('\nMeasures detail:');
result.grid.measures.forEach((m, idx) => {
  let totalQuarter = 0;
  const notes: string[] = [];
  m.beats.forEach((b, bi) => {
    b.notes.forEach(n => {
      const baseWhole = 1 / n.value;
      const dottedMultiplier = n.dotted ? 1.5 : 1;
      const whole = baseWhole * dottedMultiplier;
      const q = whole * 4;
      totalQuarter += q;
      notes.push(`${n.value}${n.dotted?'.':''}(${q.toFixed(3)})`);
    });
  });
  console.log(`Measure ${idx+1}: chord='${m.chord}' source='${m.source}' totalQuarter=${totalQuarter.toFixed(3)} notes=[${notes.join(', ')}]`);
});
