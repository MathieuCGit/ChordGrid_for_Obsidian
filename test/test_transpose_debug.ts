import { ChordGridParser } from "../src/parser/ChordGridParser";

const input = "finger:fr show% measure-num transpose:+5`n4/4`n| Em[4 88 4 88] | D[%] | % | Em[%] `n| Em[4 88] G[4 88] | C[4 88] G[4 88] | G[4 88 4 88] | C[4 88] G[4 88]";

console.log("Testing transposition with +5 semitones...");
const parser = new ChordGridParser();
const result = parser.parse(input);
console.log("Errors:", result.errors.length);
console.log("Measures:", result.measures.length);
result.measures.forEach((m, i) => {
  if (m.chordSegments) {
    m.chordSegments.forEach((seg, j) => {
      console.log("Measure " + (i+1) + ", Seg " + (j+1) + ": " + seg.chord);
    });
  }
});
