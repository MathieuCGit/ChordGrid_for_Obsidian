// Simple test to see if |. is tokenized correctly
const input = `4/4 :||.4 G[4] |. Am[4] ||`;

console.log('Input:', input);
console.log('\nTokenization:');

// Simulate tokenization logic
const barlineRegex = /(\|\|:?|:\|\||:?\|\|x?\d*\.?(?:\d+(?:-\d+)?(?:,\d+)*)?|\|\.?(?:\d+(?:-\d+)?(?:,\d+)*)?)/g;

const tokens: any[] = [];
let currentText = '';
let lastIndex = 0;

let match;
while ((match = barlineRegex.exec(input)) !== null) {
  const beforeBar = input.substring(lastIndex, match.index);
  if (beforeBar.trim()) {
    currentText += beforeBar;
  }
  
  let barline = match[1];
  let repeatCount: number | undefined;
  let volta: string | undefined;
  
  // Extract volta notation
  const voltaMatch = /^(.+?)\.(\d+(?:-\d+)?(?:,\d+)*)?$/.exec(barline);
  if (voltaMatch && voltaMatch[0].includes('.')) {
    barline = voltaMatch[1];
    volta = voltaMatch[2] || 'END';
  }
  
  console.log(`Token: bar="${barline}", content="${currentText.trim()}", volta="${volta || 'none'}"`);
  tokens.push({bar: barline, content: currentText.trim(), volta});
  currentText = '';
  lastIndex = barlineRegex.lastIndex;
}

// Remaining content
if (lastIndex < input.length) {
  const remaining = input.substring(lastIndex).trim();
  if (remaining) {
    console.log(`Token: bar="|", content="${remaining}", volta="none"`);
  }
}
