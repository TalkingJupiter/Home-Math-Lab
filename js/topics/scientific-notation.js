'use strict';

// Scientific Notation: converting both ways, plus multiplying and dividing.
// The coefficient and the exponent are the generated numbers here, so the value
// itself can go well past ±1000 (e.g. 4.5 × 10⁸).
(function () {
  const { randInt, randNonZero, pick, chance, attempt, Rational } = MP;

  const MAX_EXP = 9; // exponents shown in questions stay within ±MAX_EXP

  const pow10 = (e) => (e >= 0 ? new Rational(10n ** BigInt(e)) : new Rational(1n, 10n ** BigInt(-e)));

  // A coefficient 1 ≤ c < 10 with `digits` significant digits (sometimes negative).
  function coefficient(digits, negativeChance = 0.15) {
    const scale = 10 ** (digits - 1);
    const c = new Rational(randInt(scale, 10 * scale - 1), scale);
    return chance(negativeChance) ? c.neg() : c;
  }

  // Split a nonzero value into { coef, exp } with 1 ≤ |coef| < 10.
  function toScientific(value) {
    let exp = Math.floor(Math.log10(Math.abs(value.toNumber())));
    let coef = value.div(pow10(exp));
    while (coef.abs().cmp(10) >= 0) {
      coef = coef.div(10);
      exp++;
    }
    while (coef.abs().cmp(1) < 0) {
      coef = coef.mul(10);
      exp--;
    }
    return { coef, exp };
  }

  const sciHtml = (coef, exp) => `${MP.decimalHtml(coef)}${MP.op('×')}10<sup>${MP.minus(exp)}</sup>`;

  function standardHtml(value) {
    const [whole, fraction] = value.toDecimalString().split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return MP.minus(fraction === undefined ? grouped : `${grouped}.${fraction}`);
  }

  // The response { coef, exp } must be proper scientific notation equal to `value`.
  function sciChecker(value) {
    return ({ coef, exp }) => {
      const c = MP.parseNumber(coef);
      const e = MP.parseNumber(exp);
      if (!c || c.kind === 'fraction' || c.kind === 'mixed') return false;
      if (!e || e.kind !== 'integer' || e.value.abs().cmp(100) > 0) return false;
      const size = c.value.abs();
      if (size.cmp(1) < 0 || size.cmp(10) >= 0) return false;
      return c.value.mul(pow10(Number(e.value.n))).eq(value);
    };
  }

  const SCI_HINT = 'Ignoring its sign, the first number must be at least 1 and less than 10.';

  function sciQuestion(text, math, value) {
    const { coef, exp } = toScientific(value);
    return {
      prompt: MP.prompt(text, math),
      input: { type: 'scientific', hint: SCI_HINT },
      answer: { coef: coef.toDecimalString(), exp: String(exp) },
      check: sciChecker(value),
    };
  }

  function randomNumber() {
    const exp = pick([-7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const coef = coefficient(randInt(1, 3));
    return { coef, exp, value: coef.mul(pow10(exp)) };
  }

  function toSciQuestion() {
    const { value } = randomNumber();
    return sciQuestion('Write this number in scientific notation.', standardHtml(value), value);
  }

  function toStandardQuestion() {
    const { coef, exp, value } = randomNumber();
    return {
      prompt: MP.prompt('Write this number in standard form.', sciHtml(coef, exp)),
      input: { type: 'text', hint: 'Type the number in standard form. Commas are optional.' },
      answer: value.toDecimalString(),
      check: (text) => MP.matchesNumber(text, value, { kinds: ['integer', 'decimal'] }),
    };
  }

  function multiplyQuestion() {
    return attempt(() => {
      const a = coefficient(randInt(1, 2));
      const b = coefficient(randInt(1, 2));
      const m = randNonZero(-MAX_EXP, MAX_EXP);
      const n = randNonZero(-MAX_EXP, MAX_EXP);
      const product = a.mul(pow10(m)).mul(b.mul(pow10(n)));
      const { exp } = toScientific(product);
      if (exp === 0 || Math.abs(exp) > MAX_EXP) return null;
      const math = `(${sciHtml(a, m)})${MP.op('×')}(${sciHtml(b, n)})`;
      return sciQuestion('Multiply. Write the answer in scientific notation.', math, product);
    });
  }

  function divideQuestion() {
    return attempt(() => {
      // Pick the answer first so the division comes out exact.
      const q = coefficient(randInt(1, 2), 0);
      const b = coefficient(randInt(1, 2));
      const { coef: a, exp: shift } = toScientific(q.mul(b.abs()));
      const r = randNonZero(-MAX_EXP, MAX_EXP);
      const n = randNonZero(-MAX_EXP, MAX_EXP);
      const m = r + n + shift;
      if (m === 0 || Math.abs(m) > MAX_EXP) return null;
      const dividend = chance(0.15) ? a.neg() : a;
      const quotient = dividend.mul(pow10(m)).div(b.mul(pow10(n)));
      const math = `(${sciHtml(dividend, m)})${MP.op('÷')}(${sciHtml(b, n)})`;
      return sciQuestion('Divide. Write the answer in scientific notation.', math, quotient);
    });
  }

  MP.registerTopic({
    id: 'scientific-notation',
    title: 'Scientific Notation',
    description: 'Convert to and from scientific notation, then multiply and divide with it.',
    icon: '10ⁿ',
    generate: () => pick([toSciQuestion, toSciQuestion, toStandardQuestion, toStandardQuestion, multiplyQuestion, divideQuestion])(),
  });
})();
