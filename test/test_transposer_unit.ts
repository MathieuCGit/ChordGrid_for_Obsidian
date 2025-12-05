import { Transposer } from "../src/utils/Transposer";

console.log("Testing transposeChord directly:");
console.log("Em + 5 =", Transposer.transposeChord("Em", 5));
console.log("E + 5 =", Transposer.transposeChord("E", 5));
console.log("D + 5 =", Transposer.transposeChord("D", 5));
console.log("G + 5 =", Transposer.transposeChord("G", 5));
console.log("C + 5 =", Transposer.transposeChord("C", 5));

console.log("\nExpected:");
console.log("Em + 5 = Am");
console.log("E + 5 = A");
console.log("D + 5 = G");
console.log("G + 5 = C");
console.log("C + 5 = F");
