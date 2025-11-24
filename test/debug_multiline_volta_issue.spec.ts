import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';

describe('Debug multi-line volta issue', () => {
  test('Simple case: 3 measures with volta spanning to repeat end', () => {
    const input = `4/4 ||:.1-3 C[4] | G[4] | F[4] :||`;

    console.log('\n=== SIMPLE TEST ===');
    const parser = new ChordGridParser();
    const result = parser.parse(input);
    
    console.log('Total measures:', result.grid.measures.length);
    result.grid.measures.forEach((measure: any, i) => {
      console.log(`Measure ${i}: chord=${measure.chord}, barline=${measure.barline}`);
      if (measure.voltaStart) console.log(`  → voltaStart:`, measure.voltaStart);
      if (measure.voltaEnd) console.log(`  → voltaEnd:`, measure.voltaEnd);
      if (measure.isRepeatEnd) console.log(`  → isRepeatEnd: true`);
      if (measure.isRepeatStart) console.log(`  → isRepeatStart: true`);
    });
    
    expect(result.grid.measures).toHaveLength(3);
    expect(result.grid.measures[0].voltaStart).toBeDefined();
    expect(result.grid.measures[2].voltaEnd).toBeDefined(); // Should end at measure 2 (F with :||)
  });

  test('User case: volta should span multiple lines', () => {
    const input = `measures-per-line:4 picks-auto
4/4 ||:.1-3 C[88 81616_16-161616 88] | G[%] | 
| F[16161616_88 88 4] :||.4 Am[88_4 4.8] ||`;

    console.log('\n=== INPUT ===');
    console.log(input);
    console.log('\n=== LINES ===');
    input.split('\n').forEach((line, i) => console.log(`Line ${i}: "${line}"`));

    const parser = new ChordGridParser();
    const result = parser.parse(input);
    
    console.log('\n=== PARSING RESULT ===');
    console.log('Errors:', result.errors);
    console.log('Total measures:', result.grid.measures.length);
    
    result.grid.measures.forEach((measure: any, i) => {
      console.log(`\nMeasure ${i}:`);
      console.log('  voltaStart:', measure.voltaStart);
      console.log('  voltaEnd:', measure.voltaEnd);
      console.log('  barline:', measure.barline);
      console.log('  chord:', measure.chord);
      console.log('  isRepeatEnd:', measure.isRepeatEnd);
      console.log('  isRepeatStart:', measure.isRepeatStart);
    });

    const renderer = new SVGRenderer();
    const svg = renderer.render(result.grid);
    
    expect(svg).toBeDefined();
  });
});
