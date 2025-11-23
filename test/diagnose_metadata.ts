import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';
import { PlaceAndSizeManager } from '../src/renderer/PlaceAndSizeManager';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';

// Set up DOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document as any;
global.window = dom.window as any;
global.SVGElement = dom.window.SVGElement as any;

const input = `picks-auto
4/4 ||: C[4 88_4 4] | % | G[%] | % :||`;

console.log('='.repeat(80));
console.log('CHORD GRID ELEMENT METADATA DIAGNOSTIC');
console.log('='.repeat(80));
console.log(`\nInput: ${input}\n`);

const parser = new ChordGridParser();
const result = parser.parse(input);

if (result.errors.length > 0) {
  console.log('❌ Parse errors:', result.errors);
  process.exit(1);
}

// We need to access PlaceAndSizeManager from the renderer
// For now, let's create a modified renderer that exposes it
const renderer = new SVGRenderer();
const svg = renderer.render(result.grid, 'up');

// Access PlaceAndSizeManager through the SVG (we'll need to store it)
// For now, extract all elements from the rendered SVG

console.log('SVG Dimensions:', {
  width: svg.getAttribute('width'),
  height: svg.getAttribute('height'),
  viewBox: svg.getAttribute('viewBox')
});
console.log('');

// Extract and categorize all elements
interface ElementInfo {
  type: string;
  bbox: { startX: number; startY: number; width: number; height: number };
  visual?: { startX?: number; startY?: number; endX?: number; endY?: number };
  specific?: any;
  context?: any;
}

const elements: ElementInfo[] = [];

// 1. TIME SIGNATURE
const timeText = svg.querySelector('text');
if (timeText && timeText.textContent?.includes('/')) {
  const x = parseFloat(timeText.getAttribute('x') || '0');
  const y = parseFloat(timeText.getAttribute('y') || '0');
  const fontSize = parseInt(timeText.getAttribute('font-size') || '18');
  const text = timeText.textContent;
  
  elements.push({
    type: 'time-signature',
    bbox: {
      startX: x,
      startY: y - fontSize,
      width: text.length * fontSize * 0.6,
      height: fontSize
    },
    specific: {
      text,
      fontSize,
      textX: x,
      textY: y
    }
  });
}

// 2. CHORDS
const chords = svg.querySelectorAll('text.chord-symbol');
chords.forEach((chord, idx) => {
  const x = parseFloat(chord.getAttribute('x') || '0');
  const y = parseFloat(chord.getAttribute('y') || '0');
  const anchor = chord.getAttribute('text-anchor') || 'start';
  const text = chord.textContent || '';
  const fontSize = 22; // Standard chord font size
  const textWidth = text.length * fontSize * 0.6;
  
  const bboxStartX = anchor === 'start' ? x : (anchor === 'middle' ? x - textWidth/2 : x - textWidth);
  
  elements.push({
    type: 'chord',
    bbox: {
      startX: bboxStartX,
      startY: y - fontSize,
      width: textWidth,
      height: fontSize + 4
    },
    visual: {
      startX: x,
      endX: anchor === 'start' ? x + textWidth : (anchor === 'middle' ? x + textWidth/2 : x)
    },
    specific: {
      symbol: text,
      textX: x,
      textY: y,
      textAnchor: anchor,
      fontSize,
      textWidth
    },
    context: {
      chordIndex: idx
    }
  });
});

// 3. BARLINES (thick lines = stroke-width 3, thin = 1.5, normal = 5)
const allLines = svg.querySelectorAll('line');
allLines.forEach((line) => {
  const x1 = parseFloat(line.getAttribute('x1') || '0');
  const y1 = parseFloat(line.getAttribute('y1') || '0');
  const x2 = parseFloat(line.getAttribute('x2') || '0');
  const y2 = parseFloat(line.getAttribute('y2') || '0');
  const strokeWidth = line.getAttribute('stroke-width');
  
  // Vertical line = potential barline
  if (Math.abs(x1 - x2) < 1 && (strokeWidth === '1.5' || strokeWidth === '3' || strokeWidth === '5')) {
    const isThick = strokeWidth === '3';
    const type = isThick ? 'thick-barline' : 'thin-barline';
    
    elements.push({
      type: 'barline',
      bbox: {
        startX: Math.min(x1, x2) - parseFloat(strokeWidth) / 2,
        startY: Math.min(y1, y2),
        width: parseFloat(strokeWidth),
        height: Math.abs(y2 - y1)
      },
      visual: {
        startX: x1,
        endX: x2
      },
      specific: {
        lineType: type,
        x: x1,
        y1,
        y2,
        strokeWidth: parseFloat(strokeWidth)
      }
    });
  }
  
  // Diagonal line with stroke-width=3 = note head (slash)
  if (Math.abs(x1 - x2) > 1 && strokeWidth === '3') {
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    
    elements.push({
      type: 'note-head',
      bbox: {
        startX: Math.min(x1, x2),
        startY: Math.min(y1, y2),
        width,
        height
      },
      visual: {
        startX: Math.min(x1, x2),
        startY: Math.min(y1, y2),
        endX: Math.max(x1, x2),
        endY: Math.max(y1, y2)
      },
      specific: {
        headType: 'slash',
        centerX,
        centerY,
        leftX: Math.min(x1, x2),
        rightX: Math.max(x1, x2),
        x1, y1, x2, y2
      }
    });
  }
  
  // Vertical line with stroke-width=2 = stem
  if (Math.abs(x1 - x2) < 0.1 && strokeWidth === '2') {
    const direction = y2 < y1 ? 'up' : 'down';
    
    elements.push({
      type: 'stem',
      bbox: {
        startX: x1 - 1.5,
        startY: Math.min(y1, y2),
        width: 3,
        height: Math.abs(y2 - y1)
      },
      visual: {
        startX: x1,
        endX: x1
      },
      specific: {
        direction,
        stemX: x1,
        topY: Math.min(y1, y2),
        bottomY: Math.max(y1, y2),
        y1,
        y2
      }
    });
  }
});

// 4. TIES (paths)
const paths = svg.querySelectorAll('path');
paths.forEach((path, idx) => {
  const d = path.getAttribute('d') || '';
  const mMatch = d.match(/M\s*([\d.]+)\s+([\d.]+)/);
  const qMatch = d.match(/Q\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  
  if (mMatch && qMatch) {
    const startX = parseFloat(mMatch[1]);
    const startY = parseFloat(mMatch[2]);
    const controlX = parseFloat(qMatch[1]);
    const controlY = parseFloat(qMatch[2]);
    const endX = parseFloat(qMatch[3]);
    const endY = parseFloat(qMatch[4]);
    
    const minX = Math.min(startX, endX, controlX);
    const maxX = Math.max(startX, endX, controlX);
    const minY = Math.min(startY, endY, controlY);
    const maxY = Math.max(startY, endY, controlY);
    
    elements.push({
      type: 'tie',
      bbox: {
        startX: minX,
        startY: minY,
        width: maxX - minX,
        height: maxY - minY
      },
      visual: {
        startX,
        startY,
        endX,
        endY
      },
      specific: {
        startX,
        startY,
        endX,
        endY,
        controlX,
        controlY,
        pathData: d
      }
    });
  }
});

// Sort elements by type and position
elements.sort((a, b) => {
  if (a.type !== b.type) return a.type.localeCompare(b.type);
  return a.bbox.startX - b.bbox.startX;
});

// Group by type
const byType: Record<string, ElementInfo[]> = {};
elements.forEach(el => {
  if (!byType[el.type]) byType[el.type] = [];
  byType[el.type].push(el);
});

console.log('\n' + '='.repeat(80));
console.log('ELEMENTS BY TYPE');
console.log('='.repeat(80));

Object.keys(byType).sort().forEach(type => {
  const items = byType[type];
  console.log(`\n${type.toUpperCase()} (${items.length} elements)`);
  console.log('-'.repeat(80));
  
  items.forEach((el, idx) => {
    console.log(`\n[${idx}] BBox: { startX: ${el.bbox.startX.toFixed(2)}, startY: ${el.bbox.startY.toFixed(2)}, width: ${el.bbox.width.toFixed(2)}, height: ${el.bbox.height.toFixed(2)} }`);
    if (el.visual) {
      console.log(`    Visual: { startX: ${el.visual.startX?.toFixed(2) || 'N/A'}, endX: ${el.visual.endX?.toFixed(2) || 'N/A'} }`);
    }
    if (el.specific) {
      console.log(`    Specific:`, JSON.stringify(el.specific, null, 2).split('\n').map((line, i) => i === 0 ? line : '             ' + line).join('\n'));
    }
  });
});

// ALIGNMENT ANALYSIS
console.log('\n\n' + '='.repeat(80));
console.log('CHORD-STEM ALIGNMENT ANALYSIS');
console.log('='.repeat(80));

const chordElements = byType['chord'] || [];
const stemElements = byType['stem'] || [];
const noteHeadElements = byType['note-head'] || [];

// Group stems by approximate measure (every ~240px)
const measureWidth = 240;
const stemsByMeasure: number[][] = [];
let currentMeasure: number[] = [];
let currentMeasureStart = 0;

stemElements.forEach((stem, idx) => {
  const stemX = stem.specific.stemX;
  if (stemX - currentMeasureStart > measureWidth) {
    if (currentMeasure.length > 0) {
      stemsByMeasure.push([...currentMeasure]);
    }
    currentMeasure = [];
    currentMeasureStart = stemX;
  }
  currentMeasure.push(idx);
});
if (currentMeasure.length > 0) {
  stemsByMeasure.push(currentMeasure);
}

console.log(`\nDetected ${stemsByMeasure.length} measures\n`);

chordElements.forEach((chord, chordIdx) => {
  const chordX = chord.specific.textX;
  
  // Find which measure this chord belongs to
  const measureIdx = stemsByMeasure.findIndex((stemIndices, mi) => {
    if (stemIndices.length === 0) return false;
    const firstStemX = stemElements[stemIndices[0]].specific.stemX;
    const lastStemX = stemElements[stemIndices[stemIndices.length - 1]].specific.stemX;
    return chordX >= firstStemX - 30 && chordX <= lastStemX + 30;
  });
  
  if (measureIdx >= 0) {
    const stemIndices = stemsByMeasure[measureIdx];
    const firstStemIdx = stemIndices[0];
    const firstStem = stemElements[firstStemIdx];
    const firstNoteHead = noteHeadElements[firstStemIdx];
    
    const stemX = firstStem.specific.stemX;
    const noteX = firstNoteHead ? firstNoteHead.specific.centerX : null;
    const chordTextX = chord.specific.textX;
    
    const diff = chordTextX - stemX;
    const noteToStemOffset = noteX !== null ? stemX - noteX : null;
    
    console.log(`Measure ${measureIdx + 1} - Chord "${chord.specific.symbol}"`);
    console.log(`  Chord text X: ${chordTextX.toFixed(2)} (anchor: ${chord.specific.textAnchor})`);
    console.log(`  Chord bbox: startX=${chord.bbox.startX.toFixed(2)}, width=${chord.bbox.width.toFixed(2)}`);
    if (noteX !== null) {
      console.log(`  First note center X: ${noteX.toFixed(2)}`);
      console.log(`  Note→Stem offset: ${noteToStemOffset?.toFixed(2) || 'N/A'}px (expected ~5px for UP stems)`);
    }
    console.log(`  First stem X: ${stemX.toFixed(2)}`);
    console.log(`  Chord→Stem difference: ${diff.toFixed(2)}px`);
    
    if (Math.abs(diff) < 0.5) {
      console.log(`  ✅ PERFECT ALIGNMENT`);
    } else if (Math.abs(diff) < 2) {
      console.log(`  ⚠️  MINOR MISALIGNMENT (${Math.abs(diff).toFixed(2)}px ${diff > 0 ? 'RIGHT' : 'LEFT'})`);
    } else {
      console.log(`  ❌ MISALIGNMENT: chord is ${Math.abs(diff).toFixed(2)}px ${diff > 0 ? 'RIGHT' : 'LEFT'} of stem`);
    }
    console.log('');
  } else {
    console.log(`Chord "${chord.specific.symbol}" - No matching measure found (X=${chordX.toFixed(2)})\n`);
  }
});

// Save detailed report
const report = {
  input,
  timestamp: new Date().toISOString(),
  svg: {
    width: svg.getAttribute('width'),
    height: svg.getAttribute('height'),
    viewBox: svg.getAttribute('viewBox')
  },
  elements,
  byType,
  measures: stemsByMeasure.length,
  summary: {
    chords: chordElements.length,
    stems: stemElements.length,
    noteHeads: noteHeadElements.length,
    ties: byType['tie']?.length || 0,
    barlines: byType['barline']?.length || 0
  }
};

fs.writeFileSync('test/metadata_diagnostic.json', JSON.stringify(report, null, 2));
console.log('\n✅ Detailed report saved to test/metadata_diagnostic.json');
