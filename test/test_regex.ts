const regex = /^(.+?)\.(\d+(?:-\d+)?(?:,\d+)*)?$/;

const tests = [
  '|.1-3',
  '|.4',
  '|.',
  ':||.4'
];

tests.forEach(test => {
  const match = regex.exec(test);
  console.log(`Input: "${test}"`);
  if (match) {
    console.log(`  Match: ${JSON.stringify(match)}`);
    console.log(`  Barline: "${match[1]}", Volta: "${match[2] || 'END'}"`);
  } else {
    console.log(`  No match`);
  }
  console.log();
});
