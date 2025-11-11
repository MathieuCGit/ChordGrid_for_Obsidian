/**
 * Quick integration test: parser -> analyzer -> beam groups
 */
import { ChordGridParser } from '../src/parser/ChordGridParser';
import { MusicAnalyzer } from '../src/analyzer/MusicAnalyzer';

const parser = new ChordGridParser();
const analyzer = new MusicAnalyzer();

const input = '4/4 | C[8]G[8] |';

const { measures } = parser.parseForAnalyzer(input);
const analyzed = analyzer.analyze(measures[0]);

console.log('Groups:', analyzed.beamGroups.length);
console.log('Notes in G1:', analyzed.beamGroups[0]?.notes.length);
console.log('isPartial:', analyzed.beamGroups[0]?.isPartial);
