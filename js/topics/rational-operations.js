'use strict';

// Rational Number Operations: +, −, ×, ÷ with integers, decimals or fractions.
(function () {
  const { randInt, randNonZero, pick, chance, attempt, Rational, LIMIT, MINUS } = MP;

  const SYMBOL = { '+': '+', '-': MINUS, '*': '×', '/': '÷' };

  const HINT = {
    integer: 'Type an integer, like -42.',
    decimal: 'Type a decimal, like -3.75.',
    fraction: 'Type a fraction in simplest form, like -5/6 or 1 1/2.',
  };

  function calculate(a, op, b) {
    if (op === '+') return a.add(b);
    if (op === '-') return a.sub(b);
    if (op === '*') return a.mul(b);
    return a.div(b);
  }

  const decimal = (units, places) => new Rational(units, 10n ** BigInt(places));

  // Operands as Rationals. Multiplication and division are sized so the result
  // also stays within ±LIMIT; division is built as divisor × quotient so it comes out even.
  function integerOperands(op) {
    if (op === '+' || op === '-') {
      const max = pick([20, 100, LIMIT]);
      return [randNonZero(-max, max), randNonZero(-max, max)];
    }
    if (op === '*') {
      const a = randNonZero(-30, 30);
      const max = Math.min(50, Math.floor(LIMIT / Math.abs(a)));
      return [a, randNonZero(-max, max)];
    }
    const divisor = randNonZero(-25, 25);
    const max = Math.min(50, Math.floor(LIMIT / Math.abs(divisor)));
    return [divisor * randNonZero(-max, max), divisor];
  }

  function decimalOperands(op) {
    if (op === '+' || op === '-') {
      const max = pick([10, 100, LIMIT]);
      const [pa, pb] = [randInt(1, 2), randInt(1, 2)];
      return [
        decimal(randNonZero(-max * 10 ** pa, max * 10 ** pa), pa),
        decimal(randNonZero(-max * 10 ** pb, max * 10 ** pb), pb),
      ];
    }
    const other = () => (chance(0.5) ? new Rational(randNonZero(-12, 12)) : decimal(randNonZero(-99, 99), 1));
    if (op === '*') return [decimal(randNonZero(-150, 150), 1), other()];
    const divisor = other();
    return [divisor.mul(decimal(randNonZero(-300, 300), 1)), divisor];
  }

  function fractionOperand() {
    return attempt(() => {
      const d = randInt(2, 12);
      const r = new Rational(randNonZero(-3 * d, 3 * d), d);
      return r.isInteger() ? null : r;
    });
  }

  function display(r, kind) {
    if (kind === 'decimal') return MP.decimalHtml(r);
    return MP.rationalHtml(r, { mixed: kind === 'fraction' && chance(0.5) });
  }

  function generate() {
    const kind = pick(['integer', 'decimal', 'fraction']);
    return attempt(() => {
      const op = pick(['+', '-', '*', '/']);
      let a, b;
      if (kind === 'integer') [a, b] = integerOperands(op).map((n) => new Rational(n));
      else if (kind === 'decimal') [a, b] = decimalOperands(op);
      else [a, b] = [fractionOperand(), fractionOperand()];

      const multiplicative = op === '*' || op === '/';
      if (multiplicative && (a.abs().eq(1) || b.abs().eq(1))) return null;
      if (kind === 'decimal' && a.isInteger() && b.isInteger()) return null;

      const result = calculate(a, op, b);
      if (result.abs().cmp(LIMIT) > 0) return null;
      if (kind === 'fraction' && result.d > 100n) return null;

      const expression = display(a, kind) + MP.op(SYMBOL[op]) + MP.parenIfNegative(display(b, kind), b.isNegative());
      return {
        prompt: MP.prompt('Evaluate.', expression),
        input: { type: 'text', hint: HINT[kind] },
        answer: kind === 'decimal' ? result.toDecimalString() : result.toString(),
        check: (text) => MP.matchesNumber(text, result),
      };
    });
  }

  MP.registerTopic({
    id: 'rational-operations',
    title: 'Rational Number Operations',
    description: 'Add, subtract, multiply and divide integers, decimals and fractions.',
    icon: '±',
    generate,
  });
})();
