import { ChordGridParser } from '../src/parser/ChordGridParser';
import { MusicAnalyzer } from '../src/analyzer/MusicAnalyzer';

describe('Debug noauto inline', () => {
  let parser: ChordGridParser;
  let analyzer: MusicAnalyzer;

  beforeEach(() => {
    parser = new ChordGridParser();
    analyzer = new MusicAnalyzer();
  });

  test('Debug 3/4 noauto measure', () => {
    const input = `4/4 | C | G | 3/4 noauto Am[888 888] | 4/4 Em |`;
    
    const result = parser.parse(input);
    const parsed = parser.parseForAnalyzer(input);
    
    console.log('\n=== PARSED RESULT ===');
    console.log('Measure 0 timeSignature:', result.measures[0].timeSignature);
    console.log('Measure 1 timeSignature:', result.measures[1].timeSignature);
    console.log('Measure 2 timeSignature:', result.measures[2].timeSignature);
    console.log('Measure 3 timeSignature:', result.measures[3].timeSignature);
    
    console.log('\n=== PARSED FOR ANALYZER ===');
    console.log('Measure 0 timeSignature:', parsed.measures[0].timeSignature);
    console.log('Measure 1 timeSignature:', parsed.measures[1].timeSignature);
    console.log('Measure 2 timeSignature:', parsed.measures[2].timeSignature);
    console.log('Measure 3 timeSignature:', parsed.measures[3].timeSignature);
    
    console.log('\n=== MEASURE 2 SEGMENTS ===');
    console.log('Segments:', parsed.measures[2].segments);
    
    const analyzed = analyzer.analyze(parsed.measures[2]);
    
    console.log('\n=== ANALYZED RESULT ===');
    console.log('Beam groups count:', analyzed.beamGroups.length);
    console.log('Beam groups:', analyzed.beamGroups);
  });
});
