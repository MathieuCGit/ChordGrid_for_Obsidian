import { ChordGridParser } from '../src/parser/ChordGridParser';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error('ASSERT FAILED:', msg);
    process.exit(1);
  }
}

const parser = new ChordGridParser();

const examples = [
  {
    name: 'chord segments test',
    input: '4/4 | Dm[4 4] G[88 88] |',
    valid: true,
    check: (result: { grid: { measures: Array<{ chordSegments?: Array<{chord: string}> }> } }) => {
      const m = result.grid.measures[0];
      if (!m.chordSegments || m.chordSegments.length !== 2) {
        assert(false, "Should have 2 chord segments");
        return;
      }
      assert(m.chordSegments[0].chord === "Dm", "First segment should be Dm");
      assert(m.chordSegments[1].chord === "G", "Second segment should be G");
    }
  },
  {
    name: 'simple 4/4',
    input: '4/4 | G[4 4 4 4] |',
    valid: true
  },
  {
    name: 'repeat example from README',
    input: '4/4 ||: Am[88 4 4 88] | Dm[2 4 4] | G[4 4 2] | C[1] :||',
    valid: true
  },
  {
    name: 'cross-measure tie',
    input: '4/4 | C[2 4_88_] | [_8] G[8 4 4 4] |',
    valid: true
  },
  {
    name: 'invalid measure length',
    input: '4/4 | C[4 4 4] |',
    valid: false
  }
];

for (const ex of examples) {
  console.log('Running:', ex.name);
  const result = parser.parse(ex.input);
  const ok = result.errors.length === 0;
  if (ex.valid) {
    assert(ok, `${ex.name} should be valid but had errors: ${JSON.stringify(result.errors)}`);
  } else {
    assert(!ok, `${ex.name} should be invalid but had no errors`);
  }
  console.log('  -> errors:', result.errors.map(e => e.message));
}

console.log('All tests passed.');
