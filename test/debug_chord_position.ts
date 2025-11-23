import { ChordGridParser } from '../src/parser/ChordGridParser';

const parser = new ChordGridParser();

const input = '4/4 ||:.1-3 C[88 81616_16-161616 88] | G[%] | F[16161616_88 88 4] :||.4 Am[88_4 4.8] ||';

const result = parser.parse(input);

console.log('\n=== PARSED STRUCTURE ===\n');
result.measures.forEach((measure, idx) => {
  console.log(`\nMeasure ${idx}:`);
  console.log(`  Barline: ${measure.barline || 'none'}`);
  console.log(`  isRepeatStart: ${(measure as any).isRepeatStart}`);
  console.log(`  isRepeatEnd: ${(measure as any).isRepeatEnd}`);
  
  const segments = (measure as any).chordSegments;
  if (segments) {
    console.log(`  Segments: ${segments.length}`);
    segments.forEach((seg: any, segIdx: number) => {
      console.log(`    Segment ${segIdx}:`);
      console.log(`      Chord: ${seg.chord || 'none'}`);
      console.log(`      leadingSpace: ${seg.leadingSpace}`);
      console.log(`      Beats: ${seg.beats.length}`);
      if (seg.beats.length > 0) {
        const firstBeat = seg.beats[0];
        console.log(`      First beat notes: ${firstBeat.notes.length}`);
        if (firstBeat.notes.length > 0) {
          const firstNote = firstBeat.notes[0];
          console.log(`        First note value: ${firstNote.value}`);
          console.log(`        First note isRest: ${firstNote.isRest}`);
        }
      }
    });
  }
});
