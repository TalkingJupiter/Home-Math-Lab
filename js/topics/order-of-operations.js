'use strict';

// Order of Operations: multi-step integer expressions with grouping symbols and exponents.
(function () {
  const { randInt, pick, chance, attempt, Rational, LIMIT, MINUS } = MP;

  const SYMBOL = { '+': '+', '-': MINUS, '*': '×', '/': '÷' };
  const PREC = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const BRACKETS = [['(', ')'], ['[', ']'], ['{', '}']];

  // Expression tree nodes: { t: 'num', v } | { t: 'bin', op, l, r } | { t: 'pow', base, e }
  const num = (v) => ({ t: 'num', v });
  const bin = (op, l, r) => ({ t: 'bin', op, l, r });

  const leaf = () => num(chance(0.15) ? -randInt(1, 12) : randInt(1, 20));

  // Integer value of a tree, or null if any step leaves the integers or ±LIMIT.
  function evaluate(node) {
    let v;
    if (node.t === 'num') return node.v;
    if (node.t === 'pow') {
      const b = evaluate(node.base);
      if (b === null || Math.abs(b) > (node.e === 2 ? 15 : 6)) return null;
      v = b ** node.e;
    } else {
      const l = evaluate(node.l);
      const r = evaluate(node.r);
      if (l === null || r === null) return null;
      if (node.op === '/') {
        if (r === 0 || l % r !== 0) return null;
        v = l / r;
      } else {
        v = node.op === '+' ? l + r : node.op === '-' ? l - r : l * r;
      }
    }
    return Math.abs(v) <= LIMIT ? v + 0 : null; // + 0 turns -0 into 0
  }

  // A random tree using exactly `ops` operations (an exponent counts as one).
  function build(ops, allowPow = true) {
    if (ops === 0) return leaf();
    if (allowPow && ops <= 2 && chance(0.3)) {
      const base = build(ops - 1, false);
      return base && { t: 'pow', base, e: chance(0.25) ? 3 : 2 };
    }
    const op = pick(['+', '-', '*', '/', '+', '-', '*']);
    const leftOps = randInt(0, ops - 1);
    const rightOps = ops - 1 - leftOps;
    if (op !== '/') {
      const l = build(leftOps);
      const r = build(rightOps);
      return l && r && bin(op, l, r);
    }
    // Division has to come out even, so one side is a number picked to fit the other.
    if (rightOps === 0) {
      const l = build(leftOps);
      const lv = l && evaluate(l);
      if (!lv) return null;
      const divisors = [];
      for (let d = 2; d <= 12; d++) if (lv % d === 0) divisors.push(d);
      if (!divisors.length) return null;
      return bin('/', l, num(pick(divisors) * (chance(0.2) ? -1 : 1)));
    }
    if (leftOps === 0) {
      const r = build(rightOps);
      const rv = r && evaluate(r);
      if (!rv || Math.abs(rv) > 12) return null;
      return bin('/', num(rv * randInt(2, 9)), r);
    }
    return null;
  }

  const prec = (node) => (node.t === 'bin' ? PREC[node.op] : node.t === 'pow' ? 3 : 4);

  // Wrap in the next grouping symbol: ( ), then [ ], then { }.
  function group({ html, depth }) {
    const [open, close] = BRACKETS[Math.min(depth, BRACKETS.length - 1)];
    return { html: open + html + close, depth: depth + 1 };
  }

  // Render with only the grouping symbols the math needs. `first` marks the start of a
  // (sub)expression, the only place a negative number goes without parentheses.
  function render(node, first) {
    if (node.t === 'num') {
      if (node.v >= 0) return { html: String(node.v), depth: 0 };
      const html = MINUS + -node.v;
      return first ? { html, depth: 0 } : { html: `(${html})`, depth: 1 };
    }
    if (node.t === 'pow') {
      const base = node.base.t === 'num' ? render(node.base, false) : group(render(node.base, true));
      return { html: `${base.html}<sup>${node.e}</sup>`, depth: base.depth };
    }
    const p = PREC[node.op];
    const wrapLeft = prec(node.l) < p;
    const wrapRight = prec(node.r) < p || (prec(node.r) === p && (node.op === '-' || node.op === '/'));
    const l = wrapLeft ? group(render(node.l, true)) : render(node.l, first);
    const r = wrapRight ? group(render(node.r, true)) : render(node.r, false);
    return { html: l.html + MP.op(SYMBOL[node.op]) + r.html, depth: Math.max(l.depth, r.depth) };
  }

  function operationsUsed(node, found = new Set()) {
    if (node.t === 'pow') {
      found.add('^');
      operationsUsed(node.base, found);
    } else if (node.t === 'bin') {
      found.add(node.op);
      operationsUsed(node.l, found);
      operationsUsed(node.r, found);
    }
    return found;
  }

  function generate() {
    const { tree, value } = attempt(() => {
      const tree = build(randInt(3, 5));
      if (!tree) return null;
      const value = evaluate(tree);
      if (value === null) return null;
      // Mix low- and high-precedence steps so the order actually matters.
      const used = operationsUsed(tree);
      const hasLow = used.has('+') || used.has('-');
      const hasHigh = used.has('*') || used.has('/') || used.has('^');
      return hasLow && hasHigh ? { tree, value } : null;
    });
    const expected = new Rational(value);
    return {
      prompt: MP.prompt('Evaluate using the order of operations.', render(tree, true).html),
      input: { type: 'text', hint: 'Type an integer, like -42.' },
      answer: String(value),
      check: (text) => MP.matchesNumber(text, expected, { kinds: ['integer', 'decimal'] }),
    };
  }

  MP.registerTopic({
    id: 'order-of-operations',
    title: 'Order of Operations',
    description: 'Evaluate expressions with parentheses, exponents, ×, ÷, + and −.',
    icon: '( )',
    generate,
  });
})();
