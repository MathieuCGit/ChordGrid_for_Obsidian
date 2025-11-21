// Test regex for repeat count
const re = /(\|\|:|:?\|\|(?:x\d+)?|\|)/g;
const line = '4/4 ||: C[4 88_4 4] | % | G[%] | % :||x3';

console.log('Testing regex:', re);
console.log('Input:', line);
console.log('\nMatches:');

let m;
while ((m = re.exec(line)) !== null) {
  console.log(`  "${m[0]}" at index ${m.index}`);
}
