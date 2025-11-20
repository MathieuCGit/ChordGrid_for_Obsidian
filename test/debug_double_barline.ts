import { ChordGridParser } from '../src/parser/ChordGridParser';

const parser = new ChordGridParser();
const input = `4/4 | C[8888 _8888] | G[%] | F[1616 1616 88 88 4] | % ||`;

console.log('Input:', input);

// Test the regex used in parseLine
const line = input.replace(/^\d+\/\d+\s*/, ''); // Remove time signature
console.log('\nLine after time sig removal:', line);

const re = /(\|\|:|:?\|\||\|)/g;
const tokens: Array<{bar: string; content: string}> = [];
let lastIndex = 0;
let m: RegExpExecArray | null;
const parts: {sep: string | null, text: string}[] = [];

while ((m = re.exec(line)) !== null) {
  const sep = m[0];
  const text = line.slice(lastIndex, m.index);
  parts.push({sep: null, text});
  parts.push({sep, text: ''});
  lastIndex = re.lastIndex;
  console.log(`  Matched: "${sep}" at index ${m.index}, lastIndex now ${re.lastIndex}`);
}

const trailing = line.slice(lastIndex);
console.log(`  Trailing: "${trailing}"`);
if (trailing.length > 0) parts.push({sep: null, text: trailing});

console.log('\nParts:', parts.map(p => p.sep ? `[${p.sep}]` : `"${p.text}"`).join(' '));

// Build tokens
let currentText = '';
for (const p of parts) {
  if (p.sep === null) {
    currentText += p.text || '';
  } else {
    tokens.push({bar: p.sep, content: currentText});
    currentText = '';
  }
}
if (currentText.length > 0 && currentText.trim().length > 0) {
  tokens.push({bar: '|', content: currentText});
}

console.log('\nTokens:');
tokens.forEach((t, i) => {
  console.log(`  ${i}: bar="${t.bar}" content="${t.content.substring(0, 40)}"`);
});

const result = parser.parse(input);

console.log('\nNumber of measures:', result.measures.length);

result.measures.forEach((m, i) => {
  console.log(`\nMeasure ${i}:`, {
    chord: m.chord,
    isRepeat: m.isRepeat,
    barline: m.barline,
    beats: m.beats.length
  });
});
