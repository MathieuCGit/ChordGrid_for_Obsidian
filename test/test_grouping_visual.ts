import { ChordGridParser } from '../src/parser/ChordGridParser';
import { MusicAnalyzer } from '../src/analyzer/MusicAnalyzer';

const parser = new ChordGridParser();
const analyzer = new MusicAnalyzer();

console.log('\n=== Test 1: 4/4 avec notes collées (devrait créer UN groupe de 8) ===');
const test1 = parser.parseForAnalyzer('4/4 | C[8888 8888] |');
const result1 = analyzer.analyze(test1.measures[0]);
console.log('Nombre de groupes de ligatures:', result1.beamGroups.length);
console.log('Détail:', result1.beamGroups.map(g => `${g.notes.length} notes`));

console.log('\n=== Test 2: 4/4 avec espaces (devrait créer 4 groupes de 2) ===');
const test2 = parser.parseForAnalyzer('4/4 | G[88 88 88 88] |');
const result2 = analyzer.analyze(test2.measures[0]);
console.log('Nombre de groupes de ligatures:', result2.beamGroups.length);
console.log('Détail:', result2.beamGroups.map(g => `${g.notes.length} notes`));

console.log('\n=== Test 3: 6/8 avec notes collées (devrait créer UN groupe de 6) ===');
const test3 = parser.parseForAnalyzer('6/8 | C[888888] |');
const result3 = analyzer.analyze(test3.measures[0]);
console.log('Nombre de groupes de ligatures:', result3.beamGroups.length);
console.log('Détail:', result3.beamGroups.map(g => `${g.notes.length} notes`));

console.log('\n=== Test 4: 6/8 avec espace (devrait créer 2 groupes de 3) ===');
const test4 = parser.parseForAnalyzer('6/8 | G[888 888] |');
const result4 = analyzer.analyze(test4.measures[0]);
console.log('Nombre de groupes de ligatures:', result4.beamGroups.length);
console.log('Détail:', result4.beamGroups.map(g => `${g.notes.length} notes`));

console.log('\n=== Test 5: 9/8 avec notes collées (devrait créer UN groupe de 9) ===');
const test5 = parser.parseForAnalyzer('9/8 | C[888888888] |');
const result5 = analyzer.analyze(test5.measures[0]);
console.log('Nombre de groupes de ligatures:', result5.beamGroups.length);
console.log('Détail:', result5.beamGroups.map(g => `${g.notes.length} notes`));

console.log('\n=== Test 6: 9/8 avec espaces (devrait créer 3 groupes de 3) ===');
const test6 = parser.parseForAnalyzer('9/8 | Am[888 888 888] |');
const result6 = analyzer.analyze(test6.measures[0]);
console.log('Nombre de groupes de ligatures:', result6.beamGroups.length);
console.log('Détail:', result6.beamGroups.map(g => `${g.notes.length} notes`));

console.log('\n=== Test 7: 6/8 avec liaisons sans espace (devrait créer 2 groupes de 3) ===');
const test7 = parser.parseForAnalyzer('6/8 | C[888_888_] |');
const result7 = analyzer.analyze(test7.measures[0]);
console.log('Nombre de groupes de ligatures:', result7.beamGroups.length);
console.log('Détail:', result7.beamGroups.map(g => `${g.notes.length} notes`));
