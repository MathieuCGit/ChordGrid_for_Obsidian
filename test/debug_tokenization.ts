const input = '||: C[4 4 4 4] |.1 G[4 4 4 4] :||';
const re = /(\|\|:(?:\.[\d,-]+)?|:?\|\|(?:x\d+)?(?:\.[\d,-]+)?|\|(?:\.[\d,-]+)?)/g;

console.log('=== TOKENIZATION ===');
let lastIndex = 0;
let m;
const parts = [];
while ((m = re.exec(input)) !== null) {
  const sep = m[0];
  const text = input.slice(lastIndex, m.index);
  if (text) {
    console.log(`Text: "${text}"`);
  }
  console.log(`Separator: "${sep}"`);
  parts.push({sep: null, text});
  parts.push({sep, text: ''});
  lastIndex = re.lastIndex;
}
const trailing = input.slice(lastIndex);
if (trailing) {
  console.log(`Trailing: "${trailing}"`);
}

console.log('\n=== TOKENS ===');
let currentText = '';
const tokens = [];
for (const p of parts) {
  if (p.sep === null) {
    currentText += p.text || '';
  } else {
    let barline = p.sep;
    let volta;
    
    const voltaMatch = /^(.+?)\.(\d+(?:-\d+)?(?:,\d+)*)$/.exec(barline);
    if (voltaMatch) {
      barline = voltaMatch[1];
      volta = voltaMatch[2];
    }
    
    console.log(`Token: bar="${barline}", content="${currentText}", volta="${volta}"`);
    tokens.push({bar: barline, content: currentText, volta});
    currentText = '';
  }
}
