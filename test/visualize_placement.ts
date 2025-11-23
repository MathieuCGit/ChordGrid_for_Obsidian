import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';

// Set up DOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document as any;
global.window = dom.window as any;
global.SVGElement = dom.window.SVGElement as any;

const input = `picks-auto
4/4 ||: C[4 88_4 4] | % | G[%] | % :||`;

console.log('Testing input:', input);
console.log('');

const parser = new ChordGridParser();
const result = parser.parse(input);

if (result.errors.length > 0) {
  console.log('Parse errors:', result.errors);
}

const renderer = new SVGRenderer();
const svg = renderer.render(result.grid, 'up');

// Access PlaceAndSizeManager from the renderer (we'll need to expose it)
// For now, let's extract information from the rendered SVG

console.log('=== RENDERED ELEMENTS IN SVG ===\n');

// Extract all elements with their positions
const allElements = svg.querySelectorAll('*');
const elementsByType: Record<string, any[]> = {};

allElements.forEach((el) => {
  const tagName = el.tagName;
  const classList = el.getAttribute('class') || 'no-class';
  
  // Extract position information based on element type
  let info: any = { tag: tagName, class: classList };
  
  if (tagName === 'text') {
    info.x = parseFloat(el.getAttribute('x') || '0');
    info.y = parseFloat(el.getAttribute('y') || '0');
    info.content = el.textContent;
    info.anchor = el.getAttribute('text-anchor');
  } else if (tagName === 'line') {
    info.x1 = parseFloat(el.getAttribute('x1') || '0');
    info.y1 = parseFloat(el.getAttribute('y1') || '0');
    info.x2 = parseFloat(el.getAttribute('x2') || '0');
    info.y2 = parseFloat(el.getAttribute('y2') || '0');
    info.strokeWidth = el.getAttribute('stroke-width');
  } else if (tagName === 'path') {
    const d = el.getAttribute('d') || '';
    // Extract start and end points from path
    const mMatch = d.match(/M\s*([\d.]+)\s+([\d.]+)/);
    const qMatch = d.match(/Q\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    if (mMatch) {
      info.startX = parseFloat(mMatch[1]);
      info.startY = parseFloat(mMatch[2]);
    }
    if (qMatch) {
      info.controlX = parseFloat(qMatch[1]);
      info.controlY = parseFloat(qMatch[2]);
      info.endX = parseFloat(qMatch[3]);
      info.endY = parseFloat(qMatch[4]);
    }
    info.d = d;
  } else if (tagName === 'rect') {
    info.x = parseFloat(el.getAttribute('x') || '0');
    info.y = parseFloat(el.getAttribute('y') || '0');
    info.width = parseFloat(el.getAttribute('width') || '0');
    info.height = parseFloat(el.getAttribute('height') || '0');
  }
  
  const key = `${tagName}.${classList}`;
  if (!elementsByType[key]) elementsByType[key] = [];
  elementsByType[key].push(info);
});

// Display organized by type
Object.keys(elementsByType).sort().forEach(key => {
  const elements = elementsByType[key];
  console.log(`\n${key} (${elements.length} elements):`);
  
  elements.slice(0, 5).forEach((el, i) => {
    console.log(`  [${i}]`, JSON.stringify(el, null, 2).split('\n').map((line, idx) => 
      idx === 0 ? line : '     ' + line
    ).join('\n'));
  });
  
  if (elements.length > 5) {
    console.log(`  ... (${elements.length - 5} more)`);
  }
});

// Analyze chord-stem alignment
console.log('\n\n=== CHORD-STEM ALIGNMENT ANALYSIS ===\n');

const chords = Array.from(svg.querySelectorAll('text.chord-symbol')).map(el => ({
  text: el.textContent,
  x: parseFloat(el.getAttribute('x') || '0'),
  y: parseFloat(el.getAttribute('y') || '0'),
  anchor: el.getAttribute('text-anchor')
}));

const stems = Array.from(svg.querySelectorAll('line[stroke-width="2"]')).map(el => ({
  x1: parseFloat(el.getAttribute('x1') || '0'),
  y1: parseFloat(el.getAttribute('y1') || '0'),
  x2: parseFloat(el.getAttribute('x2') || '0'),
  y2: parseFloat(el.getAttribute('y2') || '0')
}));

// Notes are diagonal slashes (stroke-width=3) with different x1/x2
// Barlines are vertical lines (x1 === x2)
const notes = Array.from(svg.querySelectorAll('line[stroke-width="3"]'))
  .filter(el => {
    const x1 = parseFloat(el.getAttribute('x1') || '0');
    const x2 = parseFloat(el.getAttribute('x2') || '0');
    return Math.abs(x1 - x2) > 1; // Diagonal line = note, not barline
  })
  .map(el => ({
    x1: parseFloat(el.getAttribute('x1') || '0'),
    y1: parseFloat(el.getAttribute('y1') || '0'),
    x2: parseFloat(el.getAttribute('x2') || '0'),
    y2: parseFloat(el.getAttribute('y2') || '0'),
    // Note center is at the midpoint of the diagonal slash
    centerX: (parseFloat(el.getAttribute('x1') || '0') + parseFloat(el.getAttribute('x2') || '0')) / 2,
    centerY: (parseFloat(el.getAttribute('y1') || '0') + parseFloat(el.getAttribute('y2') || '0')) / 2
  }));

console.log('Chords:', chords.length);
console.log('Stems:', stems.length);
console.log('Notes (slash heads):', notes.length);
console.log('');

// Group stems by measure (approximate by X position)
const stemsByMeasure: number[][] = [];
let currentMeasureStems: number[] = [];
let lastStemX = -100;

stems.forEach((stem, i) => {
  if (stem.x1 - lastStemX > 200) {
    if (currentMeasureStems.length > 0) {
      stemsByMeasure.push([...currentMeasureStems]);
    }
    currentMeasureStems = [];
  }
  currentMeasureStems.push(i);
  lastStemX = stem.x1;
});
if (currentMeasureStems.length > 0) {
  stemsByMeasure.push(currentMeasureStems);
}

console.log(`Found ${stemsByMeasure.length} measures\n`);

chords.forEach((chord, chordIdx) => {
  // Find the measure this chord belongs to
  const measureIdx = stemsByMeasure.findIndex(stemIndices => {
    if (stemIndices.length === 0) return false;
    const firstStem = stems[stemIndices[0]];
    const lastStem = stems[stemIndices[stemIndices.length - 1]];
    return chord.x >= firstStem.x1 - 20 && chord.x <= lastStem.x1 + 20;
  });
  
  if (measureIdx >= 0) {
    const stemIndices = stemsByMeasure[measureIdx];
    const firstStemIdx = stemIndices[0];
    const firstStem = stems[firstStemIdx];
    const firstNote = notes[firstStemIdx];
    
    const diff = chord.x - firstStem.x1;
    const noteToStemDiff = firstStem.x1 - firstNote.centerX;
    
    console.log(`Measure ${measureIdx + 1} - Chord "${chord.text}":`);
    console.log(`  Chord X: ${chord.x.toFixed(2)} (anchor: ${chord.anchor})`);
    console.log(`  First note center X: ${firstNote.centerX.toFixed(2)}`);
    console.log(`  First stem X: ${firstStem.x1.toFixed(2)}`);
    console.log(`  Note→Stem offset: ${noteToStemDiff.toFixed(2)}px (should be ~5px for UP stems)`);
    console.log(`  Chord→Stem difference: ${diff.toFixed(2)}px`);
    
    if (Math.abs(diff) < 0.5) {
      console.log(`  ✅ PERFECT ALIGNMENT`);
    } else if (Math.abs(diff) < 2) {
      console.log(`  ⚠️  MINOR MISALIGNMENT (acceptable)`);
    } else {
      console.log(`  ❌ MISALIGNMENT: chord is ${diff > 0 ? 'RIGHT' : 'LEFT'} of stem`);
    }
    console.log('');
  }
});

// Create a visual HTML representation
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Chord Grid Visualization</title>
  <style>
    body { font-family: monospace; padding: 20px; }
    svg { border: 1px solid #ccc; }
    .info { margin: 20px 0; }
    table { border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f0f0f0; }
    .aligned { color: green; }
    .misaligned { color: red; }
  </style>
</head>
<body>
  <h1>Chord Grid Visualization</h1>
  <div class="info">
    <strong>Input:</strong> <code>${input}</code>
  </div>
  
  ${svg.outerHTML}
  
  <h2>Alignment Analysis</h2>
  <table>
    <tr>
      <th>Measure</th>
      <th>Chord</th>
      <th>Chord X</th>
      <th>First Note X</th>
      <th>First Stem X</th>
      <th>Note→Stem</th>
      <th>Chord→Stem</th>
      <th>Status</th>
    </tr>
    ${chords.map((chord, idx) => {
      const measureIdx = stemsByMeasure.findIndex(stemIndices => {
        if (stemIndices.length === 0) return false;
        const firstStem = stems[stemIndices[0]];
        const lastStem = stems[stemIndices[stemIndices.length - 1]];
        return chord.x >= firstStem.x1 - 20 && chord.x <= lastStem.x1 + 20;
      });
      
      if (measureIdx >= 0) {
        const stemIndices = stemsByMeasure[measureIdx];
        const firstStemIdx = stemIndices[0];
        const firstStem = stems[firstStemIdx];
        const firstNote = notes[firstStemIdx];
        const diff = chord.x - firstStem.x1;
        const noteToStemDiff = firstStem.x1 - firstNote.centerX;
        const status = Math.abs(diff) < 0.5 ? 'aligned' : 'misaligned';
        
        return `
          <tr class="${status}">
            <td>${measureIdx + 1}</td>
            <td>${chord.text}</td>
            <td>${chord.x.toFixed(2)}</td>
            <td>${firstNote.centerX.toFixed(2)}</td>
            <td>${firstStem.x1.toFixed(2)}</td>
            <td>${noteToStemDiff.toFixed(2)}px</td>
            <td>${diff.toFixed(2)}px</td>
            <td>${Math.abs(diff) < 0.5 ? '✅ Aligned' : '❌ Misaligned'}</td>
          </tr>
        `;
      }
      return '';
    }).join('')}
  </table>
</body>
</html>
`;

fs.writeFileSync('test/visualization.html', htmlContent);
console.log('\n✅ Visualization saved to test/visualization.html');
