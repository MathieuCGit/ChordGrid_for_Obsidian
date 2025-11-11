/**
 * Quick test runner for analyzer tests
 */

import { MusicAnalyzer } from '../src/analyzer/MusicAnalyzer';
import { ParsedMeasure, ParsedSegment } from '../src/analyzer/analyzer-types';
import { BarlineType } from '../src/parser/type';

console.log('🧪 Testing MusicAnalyzer...\n');

const analyzer = new MusicAnalyzer();

// Test 1: Cross-segment beaming [8]G[8]
console.log('Test 1: Cross-segment beam grouping [8]G[8]');
const measure1: ParsedMeasure = {
  segments: [
    {
      chord: 'C',
      notes: [{ value: 8, dotted: false, isRest: false }],
      leadingSpace: false
    },
    {
      chord: 'G',
      notes: [{ value: 8, dotted: false, isRest: false }],
      leadingSpace: false
    }
  ],
  timeSignature: { numerator: 4, denominator: 4, beatsPerMeasure: 4, beatUnit: 4 },
  barline: BarlineType.Single,
  lineBreakAfter: false,
  source: '[8]G[8]'
};

const result1 = analyzer.analyze(measure1);
console.log(`  ✓ Created ${result1.beamGroups.length} beam group(s)`);
console.log(`  ✓ Group 1 connects ${result1.beamGroups[0].notes.length} notes`);
console.log(`  ✓ isPartial: ${result1.beamGroups[0].isPartial}`);
console.log('  Expected: 1 beam group, 2 notes, not partial');
console.log(`  ${result1.beamGroups.length === 1 && result1.beamGroups[0].notes.length === 2 && !result1.beamGroups[0].isPartial ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 2: Break beams with space [8] G[8]
console.log('Test 2: Break beams with space [8] G[8]');
const measure2: ParsedMeasure = {
  segments: [
    {
      chord: 'C',
      notes: [{ value: 8, dotted: false, isRest: false }],
      leadingSpace: false
    },
    {
      chord: 'G',
      notes: [{ value: 8, dotted: false, isRest: false }],
      leadingSpace: true  // Space breaks beam
    }
  ],
  timeSignature: { numerator: 4, denominator: 4, beatsPerMeasure: 4, beatUnit: 4 },
  barline: BarlineType.Single,
  lineBreakAfter: false,
  source: '[8] G[8]'
};

const result2 = analyzer.analyze(measure2);
console.log(`  ✓ Created ${result2.beamGroups.length} beam group(s)`);
console.log(`  ✓ Both partial: ${result2.beamGroups.every(g => g.isPartial)}`);
console.log('  Expected: 2 beam groups (beamlets), both partial');
console.log(`  ${result2.beamGroups.length === 2 && result2.beamGroups.every(g => g.isPartial) ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 3: Rest breaks beams [88-88]
console.log('Test 3: Rest breaks beams [88-88]');
const measure3: ParsedMeasure = {
  segments: [
    {
      chord: 'C',
      notes: [
        { value: 8, dotted: false, isRest: false },
        { value: 8, dotted: false, isRest: false },
        { value: 8, dotted: false, isRest: true },
        { value: 8, dotted: false, isRest: false },
        { value: 8, dotted: false, isRest: false }
      ],
      leadingSpace: false
    }
  ],
  timeSignature: { numerator: 4, denominator: 4, beatsPerMeasure: 4, beatUnit: 4 },
  barline: BarlineType.Single,
  lineBreakAfter: false,
  source: '[88-88]'
};

const result3 = analyzer.analyze(measure3);
console.log(`  ✓ Created ${result3.beamGroups.length} beam group(s)`);
console.log(`  ✓ First group: ${result3.beamGroups[0].notes.length} notes`);
console.log(`  ✓ Second group: ${result3.beamGroups[1].notes.length} notes`);
console.log('  Expected: 2 beam groups (before/after rest), 2 notes each');
console.log(`  ${result3.beamGroups.length === 2 && result3.beamGroups[0].notes.length === 2 && result3.beamGroups[1].notes.length === 2 ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 4: Beamlet direction after dotted [8.8]
console.log('Test 4: Dotted note beaming [8.16]');
const measure4: ParsedMeasure = {
  segments: [
    {
      chord: 'C',
      notes: [
        { value: 8, dotted: true, isRest: false },
  { value: 16, dotted: false, isRest: false }
      ],
      leadingSpace: false
    }
  ],
  timeSignature: { numerator: 4, denominator: 4, beatsPerMeasure: 4, beatUnit: 4 },
  barline: BarlineType.Single,
  lineBreakAfter: false,
  source: '[8.16]'
};

const result4 = analyzer.analyze(measure4);
const level1_4 = result4.beamGroups.find(g => g.level === 1);
const level2Beamlet_4 = result4.beamGroups.find(g => g.level === 2 && g.isPartial);
console.log(`  ✓ Level 1 beam: ${level1_4 ? level1_4.notes.length + ' notes' : 'not found'}`);
console.log(`  ✓ Level 2 beamlet: ${level2Beamlet_4 ? 'found' : 'not found'}`);
console.log(`  ✓ Beamlet direction: ${level2Beamlet_4?.direction}`);
console.log('  Expected: Level 1 beam (2 notes), Level 2 beamlet pointing LEFT');
console.log(`  ${level1_4 && level1_4.notes.length === 2 && level2Beamlet_4 && level2Beamlet_4.direction === 'left' ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 5: Multiple beam levels [1616]
console.log('Test 5: Multiple beam levels [1616]');
const measure5: ParsedMeasure = {
  segments: [
    {
      chord: 'C',
      notes: [
        { value: 16, dotted: false, isRest: false },
        { value: 16, dotted: false, isRest: false }
      ],
      leadingSpace: false
    }
  ],
  timeSignature: { numerator: 4, denominator: 4, beatsPerMeasure: 4, beatUnit: 4 },
  barline: BarlineType.Single,
  lineBreakAfter: false,
  source: '[1616]'
};

const result5 = analyzer.analyze(measure5);
const level1_5 = result5.beamGroups.find(g => g.level === 1);
const level2_5 = result5.beamGroups.find(g => g.level === 2);
console.log(`  ✓ Total groups: ${result5.beamGroups.length}`);
console.log(`  ✓ Level 1 (8th): ${level1_5 ? level1_5.notes.length + ' notes' : 'not found'}`);
console.log(`  ✓ Level 2 (16th): ${level2_5 ? level2_5.notes.length + ' notes' : 'not found'}`);
console.log('  Expected: 2 levels, both connecting 2 notes');
console.log(`  ${result5.beamGroups.length === 2 && level1_5 && level2_5 && level1_5.notes.length === 2 && level2_5.notes.length === 2 ? '✅ PASS' : '❌ FAIL'}\n`);

console.log('🎉 All tests completed!');
