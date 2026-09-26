'use strict';

// Estimating Non-perfect Square Roots: pick the gap between two integers on a number line.
(function () {
  const { randInt, chance, attempt, MINUS } = MP;

  const SEGMENTS = 7; // gaps shown on the number line (8 tick marks)

  function generate() {
    const n = attempt(() => {
      const x = randInt(2, 999);
      return Number.isInteger(Math.sqrt(x)) ? null : x;
    });
    const floor = Math.floor(Math.sqrt(n));
    const negative = chance(0.2);

    // Place the answer gap at a random spot on a window of SEGMENTS gaps.
    // Negative roots use the mirror image of the positive window.
    const offset = randInt(Math.max(0, floor - SEGMENTS + 1), floor);
    const start = negative ? -(offset + SEGMENTS) : offset;
    const answer = negative ? -(floor + 1) : floor; // left end of the correct gap

    return {
      prompt: MP.prompt(
        'Between which two integers is this number? Tap that space on the number line.',
        (negative ? MINUS : '') + MP.radical(n)
      ),
      input: { type: 'numberline', start, end: start + SEGMENTS },
      answer,
      check: (left) => left === answer,
    };
  }

  MP.registerTopic({
    id: 'estimating-square-roots',
    title: 'Estimating Non-perfect Square Roots',
    description: 'Place square roots between the two integers they fall between on a number line.',
    icon: '≈√',
    generate,
  });
})();
