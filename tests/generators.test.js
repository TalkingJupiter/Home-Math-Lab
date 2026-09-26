// Sanity checks for answer parsing and every topic generator.
// Run with: node tests/generators.test.js
//
// For thousands of random questions per topic it confirms that the stored answer
// passes the checker, that a wrong answer fails, and that the numbers shown stay
// within ±1000 (scientific notation is the one exception: its values go past that).
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const QUESTIONS_PER_TOPIC = 3000;

// Load the same scripts index.html loads (minus the page shell) into a sandbox.
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]).filter((src) => !src.endsWith('app.js'));
const sandbox = { console };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const src of scripts) vm.runInContext(fs.readFileSync(path.join(ROOT, src), 'utf8'), sandbox, { filename: src });
const { MP } = sandbox;
const { Rational } = MP;

let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures++;
    console.log(`  FAIL ${name}\n       ${err.message}`);
  }
}

// ---------- Parsing ----------

console.log('Answer parsing');

test('accepts equivalent spellings', () => {
  const half = new Rational(1, 2);
  for (const text of ['1/2', ' 1 / 2 ', '0.5', '.5', '0.50', '+1/2', '(1/2)']) {
    assert.ok(MP.matchesNumber(text, half), text);
  }
  const negThreeHalves = new Rational(-3, 2);
  for (const text of ['-3/2', '−3/2', '-1 1/2', '- 1 1/2', '-1.5']) {
    assert.ok(MP.matchesNumber(text, negThreeHalves), text);
  }
  assert.ok(MP.matchesNumber('45,600,000', new Rational(45600000)));
  assert.ok(MP.matchesNumber('-1,000', new Rational(-1000)));
});

test('rejects fractions not in simplest form', () => {
  const half = new Rational(1, 2);
  for (const text of ['2/4', '1 2/4', '4/1', '3/6']) assert.ok(!MP.matchesNumber(text, text === '4/1' ? new Rational(4) : half), text);
  assert.ok(!MP.matchesNumber('1 3/2', new Rational(5, 2)));
});

test('rejects wrong values and junk', () => {
  const half = new Rational(1, 2);
  for (const text of ['', 'abc', '1/0', '0.55', '-1/2', '1/2/3', '1..2', '1,5']) {
    assert.ok(!MP.matchesNumber(text, half), JSON.stringify(text));
  }
});

test('respects allowed kinds', () => {
  const r = new Rational(3, 4);
  assert.ok(!MP.matchesNumber('0.75', r, { kinds: ['fraction', 'mixed'] }));
  assert.ok(!MP.matchesNumber('3/4', r, { kinds: ['decimal'] }));
});

test('exact decimal strings', () => {
  assert.strictEqual(new Rational(-99, 8).toDecimalString(), '-12.375');
  assert.strictEqual(new Rational(1, 200).toDecimalString(), '0.005');
  assert.strictEqual(new Rational(307, 10n ** 10n).toDecimalString(), '0.0000000307');
  assert.strictEqual(new Rational(4500).toDecimalString(), '4500');
});

// ---------- Generators ----------

// A response that must be marked wrong, built from the correct one.
function wrongResponse(q) {
  switch (q.input.type) {
    case 'choice':
      return q.input.options.find((o) => o !== q.answer);
    case 'numberline':
      return q.answer + 1;
    case 'order':
      return q.answer.slice().reverse();
    case 'scientific':
      return { coef: q.answer.coef, exp: String(Number(q.answer.exp) + 1) };
    default: {
      const percent = q.answer.endsWith('%');
      const parsed = MP.parseNumber(q.answer.replace('%', ''));
      const bumped = parsed.value.add(1);
      const text = parsed.kind === 'decimal' ? bumped.toDecimalString() : bumped.toString();
      return percent ? `${text}%` : text;
    }
  }
}

const plainText = (markup) => markup.replace(/<[^>]+>/g, ' ');
const numbersIn = (text) => (text.match(/\d[\d,]*(?:\.\d+)?/g) || []).map((n) => Number(n.replace(/,/g, '')));

console.log(`\nGenerators (${QUESTIONS_PER_TOPIC} questions each)`);

for (const topic of MP.topics) {
  test(topic.title, () => {
    const inputTypes = new Set();
    for (let i = 0; i < QUESTIONS_PER_TOPIC; i++) {
      const q = topic.generate();
      const context = `\n       prompt: ${plainText(q.prompt).replace(/\s+/g, ' ').trim()}\n       answer: ${JSON.stringify(q.answer)}`;
      inputTypes.add(q.input.type);

      assert.ok(q.check(q.answer), `correct answer rejected${context}`);
      assert.ok(!q.check(wrongResponse(q)), `wrong answer accepted${context}`);

      if (q.input.type === 'numberline') {
        assert.ok(q.answer >= q.input.start && q.answer < q.input.end, `answer off the number line${context}`);
      }

      if (topic.id !== 'scientific-notation') {
        const shown = plainText(q.prompt + (q.input.items || []).join(' '));
        const answerText = typeof q.answer === 'string' ? q.answer.replace('%', '') : '';
        for (const n of [...numbersIn(shown), ...numbersIn(answerText)]) {
          assert.ok(n <= MP.LIMIT, `number ${n} outside ±${MP.LIMIT}${context}`);
        }
      }
    }
    console.log(`       input types: ${[...inputTypes].join(', ')}`);
  });
}

console.log(failures ? `\n${failures} failed` : '\nAll passed');
process.exit(failures ? 1 : 0);
