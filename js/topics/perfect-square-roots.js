'use strict';

// Perfect Square Roots: whole numbers, fractions and decimals whose root is exact.
(function () {
  const { randInt, chance, attempt, gcd, Rational, MINUS } = MP;

  function generate() {
    const roll = Math.random();
    let radicand, root;
    let decimalRoot = false;
    if (roll < 0.65) {
      const k = randInt(1, 31); // 31² = 961 keeps the radicand under 1000
      radicand = String(k * k);
      root = new Rational(k);
    } else if (roll < 0.85) {
      const [a, b] = attempt(() => {
        const b = randInt(2, 15);
        const a = randInt(1, b - 1);
        return gcd(a, b) === 1 ? [a, b] : null;
      });
      radicand = MP.frac(a * a, b * b);
      root = new Rational(a, b);
    } else {
      const k = attempt(() => {
        const k = randInt(1, 31);
        return k % 10 ? k : null;
      });
      radicand = new Rational(k * k, 100).toDecimalString();
      root = new Rational(k, 10);
      decimalRoot = true;
    }

    const negative = chance(0.2);
    if (negative) root = root.neg();

    return {
      prompt: MP.prompt('Find the square root.', (negative ? MINUS : '') + MP.radical(radicand)),
      input: { type: 'text', hint: 'Type a number, like 12, -7, 3/5 or 0.9.' },
      answer: decimalRoot ? root.toDecimalString() : root.toString(),
      check: (text) => MP.matchesNumber(text, root),
    };
  }

  MP.registerTopic({
    id: 'perfect-square-roots',
    title: 'Perfect Square Roots',
    description: 'Find exact square roots of perfect squares, including fractions and decimals.',
    icon: '√',
    generate,
  });
})();
