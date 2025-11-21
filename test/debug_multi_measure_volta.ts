import { ChordGridParser } from '../src/parser/ChordGridParser';

const input = `4/4 ||: C[4] :||.4 G[4] | F[4] | Em[4] |. Am[4] ||`;

console.log('=== Input ===');
console.log(input);

const parser = new ChordGridParser();
const result = parser.parse(input);

console.log('\n=== Measures ===');
result.measures.forEach((measure: any, index: number) => {
  const parts = [];
  if (measure.voltaStart) parts.push(`voltaStart=${measure.voltaStart.text}`);
  if (measure.voltaEnd) parts.push(`voltaEnd=${measure.voltaEnd.text}`);
  if (measure.voltaEndMarker) parts.push('voltaEndMarker=true');
  
  console.log(`${index}: ${measure.chord}[4] ${parts.length ? '(' + parts.join(', ') + ')' : ''}`);
});
