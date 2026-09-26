'use strict';

// Page shell: the topic list, the practice screen, and the answer widgets questions ask for.
(function () {
  const root = document.getElementById('app');
  const stats = new Map(); // topic id → { answered, correct, streak } for this visit

  function h(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'html') node.innerHTML = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    node.append(...children.flat().filter((c) => c != null && c !== false));
    return node;
  }

  function statsFor(id) {
    if (!stats.has(id)) stats.set(id, { answered: 0, correct: 0, streak: 0 });
    return stats.get(id);
  }

  // ---------- Answer widgets ----------
  // Each returns { el, value(), isComplete(), lock(), focus() }.

  function textWidget({ suffix }) {
    const input = h('input', {
      type: 'text',
      class: 'answer-input',
      autocomplete: 'off',
      autocapitalize: 'off',
      autocorrect: 'off',
      spellcheck: 'false',
      'aria-label': 'Your answer',
      placeholder: 'Your answer',
    });
    return {
      el: h('div', { class: 'text-answer' }, input, suffix ? h('span', { class: 'suffix' }, suffix) : null),
      value: () => input.value,
      isComplete: () => input.value.trim() !== '',
      lock: () => (input.readOnly = true),
      focus: () => input.focus(),
    };
  }

  function choiceWidget({ options }, promptEl) {
    let selected = null;
    let locked = false;
    const blank = promptEl.querySelector('.blank');
    const buttons = options.map((option) =>
      h('button', { type: 'button', class: 'choice-btn', 'aria-pressed': 'false', onclick: () => choose(option) }, option)
    );
    function choose(option) {
      if (locked) return;
      selected = option;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === option)));
      if (blank) {
        blank.textContent = option;
        blank.classList.add('filled');
      }
    }
    return {
      el: h('div', { class: 'choices', role: 'group', 'aria-label': 'Choose a symbol' }, buttons),
      value: () => selected,
      isComplete: () => selected !== null,
      lock: () => (locked = true),
      focus: () => {},
    };
  }

  function numberLineWidget({ start, end }) {
    let selected = null;
    let locked = false;
    const gaps = end - start;
    const status = h('p', { class: 'nl-status' }, 'Tap the space between two numbers.');
    const axis = h('div', { class: 'nl-axis' }, h('div', { class: 'nl-line' }));
    const segments = [];

    for (let i = 0; i <= gaps; i++) {
      const left = `${(i / gaps) * 100}%`;
      axis.append(
        h('span', { class: 'nl-tick', style: `left:${left}` }),
        h('span', { class: 'nl-label', style: `left:${left}` }, MP.minus(start + i))
      );
    }
    for (let i = 0; i < gaps; i++) {
      const low = start + i;
      const label = `Between ${MP.minus(low)} and ${MP.minus(low + 1)}`;
      const seg = h('button', {
        type: 'button',
        class: 'nl-seg',
        style: `left:${(i / gaps) * 100}%;width:${100 / gaps}%`,
        'aria-label': label,
        'aria-pressed': 'false',
        onclick: () => {
          if (locked) return;
          selected = low;
          segments.forEach((s) => s.setAttribute('aria-pressed', String(s === seg)));
          status.textContent = label;
          status.classList.add('chosen');
        },
      });
      segments.push(seg);
      axis.append(seg);
    }

    return {
      el: h('div', { class: 'numberline' }, axis, status),
      value: () => selected,
      isComplete: () => selected !== null,
      lock: () => {
        locked = true;
        axis.classList.add('locked');
      },
      focus: () => {},
    };
  }

  function orderWidget({ items, descending }) {
    let order = [];
    let locked = false;
    const slots = h('div', { class: 'order-row order-slots' });
    const tiles = items.map((html, i) => h('button', { type: 'button', class: 'tile', html, onclick: () => place(i) }));

    function place(i) {
      if (locked || order.includes(i)) return;
      order.push(i);
      draw();
    }
    function remove(...picked) {
      if (locked) return;
      order = order.filter((x) => !picked.includes(x));
      draw();
    }
    function draw() {
      const cells = [];
      items.forEach((_, k) => {
        if (k > 0) cells.push(h('span', { class: 'order-sep', 'aria-hidden': 'true' }, descending ? '>' : '<'));
        const i = order[k];
        cells.push(
          i === undefined
            ? h('span', { class: 'slot' })
            : h('button', { type: 'button', class: 'tile placed', html: items[i], title: 'Tap to remove', onclick: () => remove(i) })
        );
      });
      slots.replaceChildren(...cells);
      tiles.forEach((tile, i) => {
        tile.classList.toggle('used', order.includes(i));
        tile.disabled = order.includes(i);
      });
    }
    draw();

    const clear = h('button', { type: 'button', class: 'link-btn', onclick: () => remove(...order) }, 'Clear');
    return {
      el: h(
        'div',
        { class: 'order' },
        h('p', { class: 'order-caption' }, descending ? 'Greatest → Least' : 'Least → Greatest'),
        slots,
        h('p', { class: 'order-caption' }, 'Tap the numbers in order'),
        h('div', { class: 'order-row order-pool' }, tiles),
        clear
      ),
      value: () => order.slice(),
      isComplete: () => order.length === items.length,
      lock: () => {
        locked = true;
        clear.hidden = true;
      },
      focus: () => {},
    };
  }

  function scientificWidget() {
    const field = (cls, label, placeholder) =>
      h('input', { type: 'text', class: `answer-input ${cls}`, autocomplete: 'off', spellcheck: 'false', 'aria-label': label, placeholder });
    const coef = field('sci-coef', 'Number in front', 'e.g. 4.5');
    const exp = field('sci-exp', 'Exponent (power of 10)', 'n');
    return {
      el: h('div', { class: 'sci-answer' }, coef, h('span', { class: 'sci-times' }, '× 10'), exp),
      value: () => ({ coef: coef.value, exp: exp.value }),
      isComplete: () => coef.value.trim() !== '' && exp.value.trim() !== '',
      lock: () => {
        coef.readOnly = true;
        exp.readOnly = true;
      },
      focus: () => coef.focus(),
    };
  }

  const WIDGETS = {
    text: textWidget,
    choice: choiceWidget,
    numberline: numberLineWidget,
    order: orderWidget,
    scientific: scientificWidget,
  };

  // ---------- Screens ----------

  function showHome() {
    document.title = 'Math Practice';
    root.replaceChildren(
      h(
        'header',
        { class: 'home-header' },
        h('h1', {}, 'Math Practice'),
        h('p', { class: 'lede' }, 'Pick a topic. Every question is randomly generated, so you can keep practicing.')
      ),
      h(
        'div',
        { class: 'topic-grid' },
        MP.topics.map((topic, i) => {
          const s = stats.get(topic.id);
          return h(
            'a',
            { class: 'topic-card', href: `#/${topic.id}`, style: `--topic: var(--c${i % 7})` },
            h('span', { class: 'topic-icon', 'aria-hidden': 'true', html: topic.icon }),
            h('span', { class: 'topic-title' }, topic.title),
            h('span', { class: 'topic-desc' }, topic.description),
            s && s.answered ? h('span', { class: 'topic-progress' }, `${s.correct} of ${s.answered} right this visit`) : null
          );
        })
      )
    );
  }

  function showPractice(topic, index) {
    document.title = `${topic.title} · Math Practice`;
    const s = statsFor(topic.id);
    let question, widget, attempts, solved;
    let number = 0;

    const score = h('div', { class: 'score', 'aria-live': 'polite' });
    const counter = h('p', { class: 'q-number' });
    const promptEl = h('div', { class: 'prompt' });
    const answerArea = h('div', { class: 'answer-area' });
    const hint = h('p', { class: 'hint' });
    const feedback = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
    const checkBtn = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Check');
    const nextBtn = h('button', { type: 'button', class: 'btn btn-secondary', onclick: next }, 'Next question');
    const card = h(
      'form',
      { class: 'question-card', onsubmit: submit, novalidate: true },
      counter,
      promptEl,
      answerArea,
      hint,
      h('div', { class: 'actions' }, checkBtn, nextBtn),
      feedback
    );

    root.replaceChildren(
      h('nav', { class: 'practice-bar' }, h('a', { href: '#/', class: 'back' }, '← All topics'), score),
      h(
        'h1',
        { class: 'practice-title', style: `--topic: var(--c${index % 7})` },
        h('span', { class: 'topic-icon', 'aria-hidden': 'true', html: topic.icon }),
        topic.title
      ),
      card
    );

    function renderScore() {
      score.innerHTML = `<span><b>${s.correct}</b> / ${s.answered} correct</span><span>Streak <b>${s.streak}</b></span>`;
    }

    function setFeedback(text, tone) {
      feedback.textContent = text;
      feedback.className = `feedback ${tone || ''}`;
    }

    function next() {
      question = topic.generate();
      number++;
      attempts = 0;
      solved = false;
      counter.textContent = `Question ${number}`;
      promptEl.innerHTML = question.prompt;
      widget = WIDGETS[question.input.type](question.input, promptEl);
      answerArea.replaceChildren(widget.el);
      hint.textContent = question.input.hint || '';
      hint.hidden = !question.input.hint;
      setFeedback('', '');
      checkBtn.textContent = 'Check';
      nextBtn.hidden = true;
      widget.focus();
    }

    function submit(event) {
      event.preventDefault();
      if (solved) return next();
      if (!widget.isComplete()) return setFeedback('Enter an answer first.', 'info');

      const correct = question.check(widget.value());
      if (attempts === 0) {
        // Only the first try counts toward the score.
        s.answered++;
        if (correct) {
          s.correct++;
          s.streak++;
        } else {
          s.streak = 0;
        }
        renderScore();
      }
      attempts++;

      if (correct) {
        solved = true;
        widget.lock();
        setFeedback('Correct!', 'correct');
        checkBtn.textContent = 'Next question →';
        nextBtn.hidden = true;
        checkBtn.focus();
      } else {
        setFeedback('Incorrect. Try again.', 'wrong');
        nextBtn.hidden = false;
        card.classList.remove('shake');
        void card.offsetWidth; // restart the animation
        card.classList.add('shake');
      }
    }

    renderScore();
    next();
  }

  function route() {
    const id = location.hash.replace(/^#\/?/, '');
    const index = MP.topics.findIndex((t) => t.id === id);
    if (index >= 0) showPractice(MP.topics[index], index);
    else showHome();
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);
  route();
})();
