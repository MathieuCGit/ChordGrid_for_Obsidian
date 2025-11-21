// Test repeat count extraction
const barline = ':||x3';
const repeatMatch = /^(:?\|\|)x(\d+)$/.exec(barline);

console.log('Testing barline:', barline);
console.log('Regex:', /^(:?\|\|)x(\d+)$/);
console.log('Match:', repeatMatch);

if (repeatMatch) {
  console.log('  Extracted barline:', repeatMatch[1]);
  console.log('  Extracted count:', repeatMatch[2]);
}
