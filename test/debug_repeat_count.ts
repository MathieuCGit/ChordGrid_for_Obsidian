import { ChordGridParser } from '../src/parser/ChordGridParser';
import { SVGRenderer } from '../src/renderer/SVGRenderer';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document as any;

const parser = new ChordGridParser();
const input = '4/4 ||: C[4 88_4 4] | % | G[%] | % :||x3';
console.log('Input:', input);

const parseResult = parser.parse(input);
console.log('\nParsed measures:');
parseResult.grid.measures.forEach((m, i) => {
  console.log(`  [${i}] chord="${m.chord}", barline="${m.barline}", isRepeatStart=${(m as any).isRepeatStart}, isRepeatEnd=${(m as any).isRepeatEnd}, repeatCount=${(m as any).repeatCount}`);
});

const renderer = new SVGRenderer();
const svg = renderer.render(parseResult.grid, { displayRepeatSymbol: true });
const svgString = svg.outerHTML;

// Check for repeat count text
const hasRepeatCount = svgString.includes('>x3<');
console.log('\n✓ SVG contains "x3":', hasRepeatCount);

if (hasRepeatCount) {
  // Extract the x3 text element
  const match = /<text[^>]*>x3<\/text>/.exec(svgString);
  if (match) {
    console.log('  Text element:', match[0]);
  }
}
