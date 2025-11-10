import { ChordGridParser } from '../src/parser/ChordGridParser';

const input = `4/4 Am[4. 8_4 4_] | [_4 2_8]G[8] |`;

const parser = new ChordGridParser();
const result = parser.parse(input);

console.log('\n=== Parsed measures ===');
result.grid.measures.forEach((m, mi) => {
  console.log(`\nMeasure ${mi}: chord='${m.chord}' source='${m.source}' bar='${m.barline}'`);
  if (m.chordSegments) {
    m.chordSegments.forEach((seg, si) => {
      console.log(`  Segment ${si}: chord='${seg.chord}' leadingSpace=${seg.leadingSpace} beats=${seg.beats.length}`);
      seg.beats.forEach((b, bi) => {
        console.log(`    Beat ${bi}: notes=[${b.notes.map(n => `${n.value}${n.dotted?'.':''}${n.tieStart?'^':''}${n.tieEnd?'-':''}`).join(', ')}] hasBeam=${b.hasBeam} beamGroups=${JSON.stringify(b.beamGroups)}`);
      });
    });
  }
});

console.log('\n=== All beats (flat) ===');
let count = 0;
result.grid.measures.forEach((m, mi) => {
  m.beats.forEach((b, bi) => {
    console.log(`Measure ${mi} Beat ${bi}: notes=[${b.notes.map(n=>n.value).join(',')}] hasBeam=${b.hasBeam} beamGroups=${JSON.stringify(b.beamGroups)}`);
    count++;
  });
});

console.log('\nDone');
