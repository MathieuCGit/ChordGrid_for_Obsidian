import { ChordGridParser } from "../src/parser/ChordGridParser";
const input = "transpose:+5\n4/4\n| Em | D | G | C |";
console.log("=== TRANSPOSE TEST ===");
const parser = new ChordGridParser();
const result = parser.parse(input);
console.log("Result measures:", result.measures.length);
result.measures.forEach((m, i) => {
  if (m.chordSegments) {
    m.chordSegments.forEach(seg => console.log("  Chord:", seg.chord));
  }
});
