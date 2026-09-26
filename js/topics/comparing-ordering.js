'use strict';

// Comparing and Ordering Real Numbers written as integers, decimals, fractions,
// mixed numbers, repeating decimals, square roots and multiples of π.
(function () {
  const { randInt, pick, chance, shuffle, attempt, Rational, LIMIT, MINUS } = MP;

  const signOf = (x) => (x < 0 ? MINUS : '');
  const repeating = (whole, digit) => `${whole}.<span class="repeat">${digit}</span>`;

  // Each maker writes a number close to `t` in one notation: { value, html }, or null
  // when that notation can't land near `t`.
  const MAKERS = {
    integer(t) {
      const v = Math.round(t);
      return { value: v, html: signOf(v) + Math.abs(v) };
    },
    decimal(t) {
      const places = randInt(1, 2);
      const r = new Rational(Math.round(t * 10 ** places), 10n ** BigInt(places));
      return r.isInteger() ? null : { value: r.toNumber(), html: MP.decimalHtml(r) };
    },
    fraction(t) {
      const d = randInt(2, 12);
      const r = new Rational(Math.round(t * d), d);
      if (r.isInteger() || r.abs().n > BigInt(LIMIT)) return null; // numerator stays within ±LIMIT too
      return { value: r.toNumber(), html: MP.rationalHtml(r) };
    },
    mixed(t) {
      const d = randInt(2, 12);
      const r = new Rational(Math.round(t * d), d);
      if (r.isInteger() || r.abs().cmp(1) < 0) return null;
      return { value: r.toNumber(), html: MP.rationalHtml(r, { mixed: true }) };
    },
    repeating(t) {
      const whole = Math.abs(Math.trunc(t));
      const digit = Math.round((Math.abs(t) - whole) * 9);
      if (digit === 0 || digit === 9) return null;
      const size = whole + digit / 9;
      return { value: t < 0 ? -size : size, html: signOf(t) + repeating(whole, digit) };
    },
    sqrt(t) {
      const n = Math.round(t * t);
      if (n < 2 || n > 999 || Number.isInteger(Math.sqrt(n))) return null;
      return { value: Math.sign(t) * Math.sqrt(n), html: signOf(t) + MP.radical(n) };
    },
    pi(t) {
      const k = Math.round(t / Math.PI);
      if (k === 0 || Math.abs(k) > 9) return null;
      return { value: k * Math.PI, html: signOf(k) + (Math.abs(k) === 1 ? '' : Math.abs(k)) + 'π' };
    },
  };

  // A random stretch of the number line and the notations that can reach it.
  function numberWindow(halfWidth) {
    const center = chance(0.7) ? randInt(-25, 25) : randInt(-990, 990);
    const lo = center - halfWidth;
    const hi = center + halfWidth;
    const reach = Math.max(Math.abs(lo), Math.abs(hi));
    const forms = ['integer', 'decimal', 'fraction', 'mixed', 'repeating'];
    if (reach <= 31) forms.push('sqrt', 'sqrt');
    if (reach <= 28) forms.push('pi');
    return { lo, hi, forms };
  }

  function make(form, w) {
    const item = MAKERS[form](w.lo + Math.random() * (w.hi - w.lo));
    if (!item || item.value < w.lo - 0.5 || item.value > w.hi + 0.5) return null;
    return { ...item, form };
  }

  // ---------- Compare two numbers ----------

  // Same value in two notations, so "=" comes up too.
  function equalPair() {
    const negative = chance(0.3);
    const withSign = (r) => (negative ? r.neg() : r);
    const kind = pick(['fraction-decimal', 'mixed-improper', 'repeating-fraction', 'root-integer']);
    if (kind === 'fraction-decimal') {
      const r = attempt(() => {
        const d = pick([2, 4, 5, 8, 10, 20, 25]);
        const r = new Rational(randInt(1, 3 * d), d);
        return r.isInteger() ? null : withSign(r);
      });
      return [MP.rationalHtml(r, { mixed: chance(0.5) }), MP.decimalHtml(r)];
    }
    if (kind === 'mixed-improper') {
      const r = attempt(() => {
        const d = randInt(2, 12);
        const r = new Rational(randInt(d + 1, 4 * d), d);
        return r.isInteger() ? null : withSign(r);
      });
      return [MP.rationalHtml(r, { mixed: true }), MP.rationalHtml(r)];
    }
    if (kind === 'repeating-fraction') {
      const whole = randInt(0, 5);
      const digit = randInt(1, 8);
      const r = withSign(new Rational(9 * whole + digit, 9));
      return [(negative ? MINUS : '') + repeating(whole, digit), MP.rationalHtml(r, { mixed: chance(0.5) })];
    }
    const k = randInt(2, 31);
    const sign = negative ? MINUS : '';
    return [sign + MP.radical(k * k), sign + k];
  }

  function compareQuestion() {
    let a, b, relation;
    if (chance(0.2)) {
      [a, b] = shuffle(equalPair());
      relation = '=';
    } else {
      [a, b, relation] = attempt(() => {
        const w = numberWindow(pick([0.5, 1]));
        const [fa, fb] = shuffle(w.forms);
        const x = make(fa, w);
        const y = make(fb, w);
        if (!x || !y || Math.abs(x.value - y.value) < 0.005) return null;
        return [x.html, y.html, x.value < y.value ? '<' : '>'];
      });
    }
    return {
      prompt:
        '<p class="prompt-text">Compare the numbers. Choose &lt;, &gt; or =.</p>' +
        `<div class="math compare"><span>${a}</span><span class="blank" aria-hidden="true">?</span><span>${b}</span></div>`,
      input: { type: 'choice', options: ['<', '=', '>'] },
      answer: relation,
      check: (choice) => choice === relation,
    };
  }

  // ---------- Order a list ----------

  function orderQuestion() {
    const count = randInt(4, 5);
    const items = attempt(() => {
      const w = numberWindow(pick([1, 1.5, 2.5]));
      const list = [];
      for (let i = 0; i < count; i++) {
        const item = make(pick(w.forms), w);
        if (!item) return null;
        list.push(item);
      }
      const values = list.map((it) => it.value).sort((x, y) => x - y);
      if (values.some((v, i) => i > 0 && v - values[i - 1] < 0.01)) return null;
      if (new Set(list.map((it) => it.form)).size < 3) return null;
      return list;
    });

    const descending = chance(0.3);
    const before = (x, y) => (descending ? x > y : x < y);
    const answer = items.map((_, i) => i).sort((i, j) => (before(items[i].value, items[j].value) ? -1 : 1));
    return {
      prompt: `<p class="prompt-text">Put these numbers in order from <strong>${
        descending ? 'greatest to least' : 'least to greatest'
      }</strong>.</p>`,
      input: { type: 'order', items: items.map((it) => it.html), descending },
      answer,
      check: (order) =>
        order.length === items.length &&
        new Set(order).size === items.length &&
        order.every((idx, k) => k === 0 || before(items[order[k - 1]].value, items[idx].value)),
    };
  }

  MP.registerTopic({
    id: 'comparing-ordering',
    title: 'Comparing and Ordering Real Numbers',
    description: 'Compare and order fractions, decimals, square roots and π.',
    icon: '&lt; &gt;',
    generate: () => (chance(0.5) ? compareQuestion() : orderQuestion()),
  });
})();
