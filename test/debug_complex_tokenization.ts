const input2 = '||: C[4 88_4 4] | % |.1-3 G[%] | % :||.4 G[4 4 4 4] ||';
const re2 = /(\|\|:(?:\.[\d,-]+)?|:?\|\|(?:x\d+)?(?:\.[\d,-]+)?|\|(?:\.[\d,-]+)?)/g;

console.log('=== TOKENIZATION for complex example ===');
let lastIndex2 = 0;
let m2;
const parts2 = [];
while ((m2 = re2.exec(input2)) !== null) {
  const sep = m2[0];
  const text = input2.slice(lastIndex2, m2.index);
  if (text) {
    console.log(`Text: "${text}"`);
  }
  console.log(`Separator: "${sep}"`);
  parts2.push({sep: null, text});
  parts2.push({sep, text: ''});
  lastIndex2 = re2.lastIndex;
}
const trailing2 = input2.slice(lastIndex2);
if (trailing2) {
  console.log(`Trailing: "${trailing2}"`);
}

console.log('\n=== TOKENS ===');
let currentText2 = '';
const tokens2 = [];
for (const p of parts2) {
  if (p.sep === null) {
    currentText2 += p.text || '';
  } else {
    let barline = p.sep;
    let volta;
    
    const voltaMatch = /^(.+?)\.(\d+(?:-\d+)?(?:,\d+)*)$/.exec(barline);
    if (voltaMatch) {
      barline = voltaMatch[1];
      volta = voltaMatch[2];
    }
    
    console.log(`Token: bar="${barline}", content="${currentText2.trim()}", volta="${volta}"`);
    tokens2.push({bar: barline, content: currentText2, volta});
    currentText2 = '';
  }
}
