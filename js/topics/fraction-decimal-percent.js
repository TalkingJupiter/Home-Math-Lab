'use strict';

// Fraction, Decimal, Percent Conversions between all three forms.
(function () {
  const { randInt, pick, chance, attempt, Rational } = MP;

  // Denominators with only 2s and 5s, so every decimal terminates.
  const DENOMINATORS = [2, 4, 5, 8, 10, 20, 25, 40, 50, 100, 200];

  const FORMS = {
    fraction: { target: 'a fraction in simplest form', hint: 'Type a fraction in simplest form, like 3/8 or 1 1/4.' },
    decimal: { target: 'a decimal', hint: 'Type a decimal, like 0.375.' },
    percent: { target: 'a percent', hint: 'Type a percent, like 37.5%.' },
  };

  const PAIRS = [
    ['fraction', 'decimal'],
    ['decimal', 'fraction'],
    ['decimal', 'percent'],
    ['percent', 'decimal'],
    ['fraction', 'percent'],
    ['percent', 'fraction'],
  ];

  function randomValue() {
    return attempt(() => {
      const d = pick(DENOMINATORS);
      const n = chance(0.2) ? randInt(d + 1, 3 * d) : randInt(1, d - 1);
      const r = new Rational(n, d);
      return r.isInteger() ? null : r;
    });
  }

  const percentOf = (r) => r.mul(100);

  function show(r, form) {
    if (form === 'fraction') return MP.rationalHtml(r, { mixed: chance(0.5) });
    if (form === 'decimal') return MP.decimalHtml(r);
    return MP.decimalHtml(percentOf(r)) + '%';
  }

  function answerText(r, form) {
    if (form === 'fraction') return r.toString();
    if (form === 'decimal') return r.toDecimalString();
    return percentOf(r).toDecimalString() + '%';
  }

  function checker(r, form) {
    if (form === 'fraction') return (text) => MP.matchesNumber(text, r, { kinds: ['fraction', 'mixed'] });
    if (form === 'decimal') return (text) => MP.matchesNumber(text, r, { kinds: ['decimal'] });
    return (text) =>
      MP.matchesNumber(String(text).trim().replace(/\s*%$/, ''), percentOf(r), { kinds: ['integer', 'decimal'] });
  }

  function generate() {
    const r = randomValue();
    const [from, to] = pick(PAIRS);
    return {
      prompt: MP.prompt(`Write this number as ${FORMS[to].target}.`, show(r, from)),
      input: { type: 'text', hint: FORMS[to].hint, suffix: to === 'percent' ? '%' : '' },
      answer: answerText(r, to),
      check: checker(r, to),
    };
  }

  MP.registerTopic({
    id: 'fraction-decimal-percent',
    title: 'Fraction, Decimal, Percent Conversions',
    description: 'Rewrite a number as a fraction, a decimal or a percent.',
    icon: '%',
    generate,
  });
})();
