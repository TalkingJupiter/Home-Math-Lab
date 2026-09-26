'use strict';

// Shared toolkit for every topic: randomness, exact fractions, answer parsing and
// math formatting. Loaded as a classic <script> (not a module) so the site also
// works when index.html is opened straight from disk.
(function () {
  const MP = (window.MP = window.MP || {});

  // Generated numbers stay within ±LIMIT.
  const LIMIT = 1000;
  const MINUS = '−';

  const topics = [];
  const registerTopic = (topic) => topics.push(topic);

  // ---------- Randomness ----------

  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function randNonZero(min, max) {
    let n;
    do {
      n = randInt(min, max);
    } while (n === 0);
    return n;
  }

  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const chance = (p) => Math.random() < p;

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Call `make` until it returns something other than null.
  function attempt(make, tries = 5000) {
    for (let i = 0; i < tries; i++) {
      const result = make();
      if (result != null) return result;
    }
    throw new Error('Could not generate a question');
  }

  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a;
  }

  // ---------- Exact rational numbers ----------

  const babs = (x) => (x < 0n ? -x : x);

  function bgcd(a, b) {
    a = babs(a);
    b = babs(b);
    while (b) [a, b] = [b, a % b];
    return a;
  }

  // An exact fraction n/d in lowest terms (BigInt parts, d > 0).
  class Rational {
    constructor(n, d = 1n) {
      n = BigInt(n);
      d = BigInt(d);
      if (d === 0n) throw new RangeError('Denominator cannot be 0');
      if (d < 0n) {
        n = -n;
        d = -d;
      }
      const g = bgcd(n, d) || 1n;
      this.n = n / g;
      this.d = d / g;
    }

    static of(x) {
      return x instanceof Rational ? x : new Rational(x);
    }

    add(o) {
      o = Rational.of(o);
      return new Rational(this.n * o.d + o.n * this.d, this.d * o.d);
    }

    sub(o) {
      o = Rational.of(o);
      return new Rational(this.n * o.d - o.n * this.d, this.d * o.d);
    }

    mul(o) {
      o = Rational.of(o);
      return new Rational(this.n * o.n, this.d * o.d);
    }

    div(o) {
      o = Rational.of(o);
      return new Rational(this.n * o.d, this.d * o.n);
    }

    neg() {
      return new Rational(-this.n, this.d);
    }

    abs() {
      return new Rational(babs(this.n), this.d);
    }

    cmp(o) {
      o = Rational.of(o);
      const l = this.n * o.d;
      const r = o.n * this.d;
      return l < r ? -1 : l > r ? 1 : 0;
    }

    eq(o) {
      return this.cmp(o) === 0;
    }

    isInteger() {
      return this.d === 1n;
    }

    isNegative() {
      return this.n < 0n;
    }

    // True when the decimal form ends (denominator has only 2s and 5s).
    isTerminating() {
      let d = this.d;
      while (d % 2n === 0n) d /= 2n;
      while (d % 5n === 0n) d /= 5n;
      return d === 1n;
    }

    toNumber() {
      return Number(this.n) / Number(this.d);
    }

    // "n/d" or "n", ASCII minus: the form a student would type.
    toString() {
      return this.d === 1n ? String(this.n) : `${this.n}/${this.d}`;
    }

    // Exact decimal digits, e.g. "-12.375". Only for terminating values.
    toDecimalString() {
      if (!this.isTerminating()) throw new RangeError(`${this} has no finite decimal`);
      let places = 0;
      let scale = 1n;
      while (scale % this.d !== 0n) {
        scale *= 10n;
        places++;
      }
      const digits = (babs(this.n) * (scale / this.d)).toString().padStart(places + 1, '0');
      const cut = digits.length - places;
      const text = places ? `${digits.slice(0, cut)}.${digits.slice(cut)}` : digits;
      return (this.n < 0n ? '-' : '') + text;
    }
  }

  // ---------- Reading student answers ----------

  // Clean up what a student typed so equivalent spellings parse the same way.
  function normalizeInput(text) {
    return String(text)
      .trim()
      .replace(/[−‒–—]/g, '-')
      .replace(/(\d),(?=\d{3}(?!\d))/g, '$1')
      .replace(/^\((.*)\)$/, '$1')
      .replace(/\s*\/\s*/g, '/')
      .replace(/^([+-])\s+/, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const signed = (sign, digits) => (sign === '-' ? -BigInt(digits) : BigInt(digits));

  // Parse an integer, decimal, fraction or mixed number.
  // Returns { value: Rational, kind, simplest } or null when it isn't a number.
  function parseNumber(text) {
    const s = normalizeInput(text);
    let m;
    if ((m = s.match(/^([+-]?)(\d+)$/))) {
      return { value: new Rational(signed(m[1], m[2])), kind: 'integer', simplest: true };
    }
    if ((m = s.match(/^([+-]?)(\d*)\.(\d*)$/)) && (m[2] || m[3])) {
      const value = new Rational(signed(m[1], (m[2] || '0') + m[3]), 10n ** BigInt(m[3].length));
      return { value, kind: 'decimal', simplest: true };
    }
    if ((m = s.match(/^([+-]?)(\d+)\/(\d+)$/))) {
      const n = BigInt(m[2]);
      const d = BigInt(m[3]);
      if (d === 0n) return null;
      const simplest = d !== 1n && bgcd(n, d) === 1n;
      return { value: new Rational(signed(m[1], m[2]), d), kind: 'fraction', simplest };
    }
    if ((m = s.match(/^([+-]?)(\d+) (\d+)\/(\d+)$/))) {
      const whole = BigInt(m[2]);
      const n = BigInt(m[3]);
      const d = BigInt(m[4]);
      if (d === 0n) return null;
      const size = new Rational(whole * d + n, d);
      const simplest = whole > 0n && n > 0n && n < d && bgcd(n, d) === 1n;
      return { value: m[1] === '-' ? size.neg() : size, kind: 'mixed', simplest };
    }
    return null;
  }

  const ALL_KINDS = ['integer', 'decimal', 'fraction', 'mixed'];

  // True when `text` is exactly `expected`, written in one of `kinds`.
  // Fractions must be in simplest form.
  function matchesNumber(text, expected, { kinds = ALL_KINDS } = {}) {
    const parsed = parseNumber(text);
    if (!parsed || !kinds.includes(parsed.kind) || !parsed.simplest) return false;
    return parsed.value.eq(expected);
  }

  // ---------- Math formatting (HTML) ----------

  const minus = (text) => String(text).replace(/^-/, MINUS);

  // A binary operator with room to breathe (and to wrap on small screens).
  const op = (symbol) => ` <span class="op">${symbol}</span> `;

  const frac = (num, den) =>
    `<span class="frac"><span class="num">${num}</span><span class="den">${den}</span></span>`;

  // A Rational as an integer, a stacked fraction, or (with mixed) a mixed number.
  function rationalHtml(r, { mixed = false } = {}) {
    const sign = r.isNegative() ? MINUS : '';
    const n = babs(r.n);
    if (r.d === 1n) return sign + n;
    if (mixed && n > r.d) return `${sign}${n / r.d}${frac(n % r.d, r.d)}`;
    return sign + frac(n, r.d);
  }

  const decimalHtml = (r) => minus(r.toDecimalString());

  // Negative numbers after an operator get parentheses: 5 − (−3).
  const parenIfNegative = (html, negative) => (negative ? `(${html})` : html);

  const RADICAL_SIGN =
    '<svg class="radical-sign" viewBox="0 0 32 100" preserveAspectRatio="none" aria-hidden="true">' +
    '<path d="M1 60 L9 53 L19 98 L31 1" vector-effect="non-scaling-stroke"/></svg>';

  const radical = (inner) =>
    `<span class="radical"><span class="radical-sign-box">${RADICAL_SIGN}</span>` +
    `<span class="radicand">${inner}</span></span>`;

  // Question text followed by a large math display.
  const prompt = (text, mathHtml) =>
    `<p class="prompt-text">${text}</p>` + (mathHtml ? `<div class="math">${mathHtml}</div>` : '');

  Object.assign(MP, {
    LIMIT,
    MINUS,
    topics,
    registerTopic,
    randInt,
    randNonZero,
    pick,
    chance,
    shuffle,
    attempt,
    gcd,
    Rational,
    normalizeInput,
    parseNumber,
    matchesNumber,
    minus,
    op,
    frac,
    rationalHtml,
    decimalHtml,
    parenIfNegative,
    radical,
    prompt,
  });
})();
