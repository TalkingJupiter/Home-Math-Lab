# Math Practice

A practice site for middle school math. Students pick a topic, answer randomly
generated questions, and see whether each answer is right or wrong.

Plain HTML, CSS and JavaScript: no build step and no dependencies.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8123
```

Then visit http://localhost:8123. To publish it, upload the folder to any static host
(GitHub Pages, Netlify, a school web server).

## Topics

| Topic | Answer format |
| --- | --- |
| Rational Number Operations | typed number (integer, decimal or fraction) |
| Order of Operations | typed integer |
| Perfect Square Roots | typed number |
| Estimating Non-perfect Square Roots | tap the gap between two integers on a number line |
| Fraction, Decimal, Percent Conversions | typed fraction, decimal or percent |
| Comparing and Ordering Real Numbers | pick <, = or >, or tap numbers into order |
| Scientific Notation | coefficient and exponent boxes, or a typed number |

## Answer checking rules

- Generated numbers stay between −1000 and 1000. **Exception:** in scientific notation
  the coefficient and exponent are the generated numbers, so values like 4.5 × 10⁸ appear.
- Fractions must be in simplest form (`2/4` is marked wrong, `1/2` is right). Mixed
  numbers (`1 1/2`) and improper fractions (`3/2`) are both accepted.
- Where a question does not ask for a specific form, any equal value is accepted
  (`1/2` or `0.5`).
- Only the first try counts toward the score. After a wrong answer, students can try
  again or move to the next question.

## Project layout

```
index.html              page and script list
css/styles.css          all styles (light and dark)
js/core.js              random helpers, exact fractions, answer parsing, math formatting
js/topics/*.js          one file per topic
js/app.js               topic list, practice screen, answer widgets
tests/generators.test.js
```

## Adding a topic

Create `js/topics/<name>.js`, add a `<script>` tag for it in `index.html` (before
`app.js`), and register it:

```js
MP.registerTopic({
  id: 'my-topic',                 // used in the URL: #/my-topic
  title: 'My Topic',
  description: 'One line for the topic card.',
  icon: '∑',
  generate() {
    return {
      prompt: MP.prompt('Evaluate.', '2 + 2'),
      input: { type: 'text', hint: 'Type an integer.' },
      answer: '4',                // a correct response, used by the tests
      check: (text) => MP.matchesNumber(text, new MP.Rational(4)),
    };
  },
});
```

The input types are `text`, `choice`, `numberline`, `order` and `scientific`. See
`js/app.js` for the options each one takes and the response it passes to `check`.

## Tests

```bash
node tests/generators.test.js
```

The script generates 3,000 questions per topic. For each one it checks that the stored
answer is accepted, that a wrong answer is rejected, and that every number shown stays
within ±1000.
