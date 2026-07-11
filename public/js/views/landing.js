// landing.js — the homepage. Matches bfftest.fun: a chunky white hero heading,
// a "How It Works" trio of teal/peach/pink cards, and a name-entry field with a
// live counter feeding into the primary START QUIZ button. Submitting a valid
// name seeds state.draft.creatorName and routes to #/create (which detects the
// preset name and skips its own name step).

import { esc, toast } from '../main.js';
import { state, resetDraft } from '../state.js';

const NAME_MAX = 40;

// The three How-It-Works steps, in order (color class, emoji, title, sub).
const STEPS = [
  ['teal',  '✨', 'Create Your Quiz',  'Answer questions about yourself!'],
  ['peach', '🚀', 'Share with Friends', 'Send your quiz link and challenge them!'],
  ['pink',  '👀', 'See the Results',   'Find out who actually knows you best!'],
];

// Decorative topic chips — short, playful, our own labels (static, no nav).
const TOPICS = [
  'How Well Do You Know Me',
  'Guess My Answers',
  'Most Likely To',
  'Friendship IQ',
  'Do You Really Know Me',
];

// Steps for the "How It Works" info article (title, text) — original.
const INFO_STEPS = [
  ['Build your quiz',
   'Answer a handful of questions about yourself — the more "so me" they are, the harder they are to fake.'],
  ['Share it around',
   'Grab your link and drop it in the group chat, your story, or a DM. Anyone with the link can jump in and guess.'],
  ['Watch the leaderboard fill up',
   'As friends finish, their scores stack up on your board — so you can finally settle who really knows you best.'],
];

// Static footer link labels (decorative).
const FOOTER_LINKS = ['How It Works', 'Make a Quiz', 'About'];

export function render(app) {
  app.innerHTML =
    '<section class="center">' +
      '<h1>Who Really Knows You? 👀</h1>' +
      '<p class="sub">Create a friendship quiz &amp; expose your friends!</p>' +
    '</section>' +

    '<h2 class="center" style="margin-top:14px">How It Works 👇</h2>' +
    '<div style="display:grid;gap:14px;max-width:var(--card-max);margin:14px auto 8px">' +
      STEPS.map(([tone, ico, title, sub]) =>
        '<div class="howto-card ' + tone + '">' +
          '<div class="howto-ico">' + ico + '</div>' +
          '<div>' +
            '<div class="howto-title">' + esc(title) + '</div>' +
            '<div class="howto-sub">' + esc(sub) + '</div>' +
          '</div>' +
        '</div>'
      ).join('') +
    '</div>' +

    '<h2 class="center" style="margin-top:30px">What Should We Call You? 👋</h2>' +
    '<div class="center" style="max-width:var(--card-max);margin:14px auto 0">' +
      '<div style="position:relative;max-width:480px;margin-inline:auto">' +
        '<input id="name" class="field" type="text" autocomplete="off" ' +
          'maxlength="' + NAME_MAX + '" placeholder="Enter your name…" ' +
          'aria-label="Your name">' +
        '<span id="counter" class="counter" ' +
          'style="position:absolute;right:16px;top:50%;transform:translateY(-50%)">' +
          '0/' + NAME_MAX + '</span>' +
      '</div>' +
      '<button id="start" class="btn" style="margin-top:16px">START QUIZ 🔥</button>' +
    '</div>' +

    // ---- Decorative topic chips (static, our own playful labels) ----
    '<div class="topic-chips">' +
      TOPICS.map((t) => '<span class="topic-chip">' + esc(t) + '</span>').join('') +
    '</div>' +

    // ---- "About this quiz" article (all original copy) ----
    '<div class="info-card">' +
      '<h2 class="info-h">The Ultimate Friendship Quiz</h2>' +
      '<p class="info-p">How Well You Know Me is the fun way to find out who <em>actually</em> ' +
        'pays attention to you. You build a quick quiz about your own quirks — ' +
        'your comfort snack, your dream trip, the song you have on repeat — and ' +
        'every answer becomes a little test of who really knows you.</p>' +
      '<p class="info-p">Share your link anywhere, let your friends guess, and ' +
        'watch the scores roll in. No sign-ups, no downloads — just you, your ' +
        'people, and some very revealing results.</p>' +

      '<h2 class="info-h">How It Works</h2>' +
      INFO_STEPS.map((s, i) =>
        '<div class="info-step">' +
          '<div class="info-step-num">' + (i + 1) + '</div>' +
          '<div class="info-step-body">' +
            '<div class="info-step-title">' + esc(s[0]) + '</div>' +
            '<div class="info-step-text">' + esc(s[1]) + '</div>' +
          '</div>' +
        '</div>'
      ).join('') +

      '<p class="info-p">Every quiz is 100% you, so no two quizzes are ever ' +
        'the same. Make one in a couple of minutes and see who earns the ' +
        'know-you-best crown. 👑</p>' +
    '</div>' +

    // ---- Site footer (static) ----
    '<footer class="site-footer">' +
      '<div class="footer-links">' +
        FOOTER_LINKS.map((t) => '<span>' + esc(t) + '</span>').join('') +
      '</div>' +
      '<div class="footer-copy">© 2026 How Well You Know Me</div>' +
    '</footer>';

  const input = document.getElementById('name');
  const counter = document.getElementById('counter');
  const startBtn = document.getElementById('start');

  // Live counter — updates as the friend types.
  input.addEventListener('input', () => {
    counter.textContent = input.value.length + '/' + NAME_MAX;
  });

  function start() {
    const name = input.value.trim();
    if (!name) {
      input.focus();
      // brief shake to signal the empty field (Web Animations API — no CSS
      // dependency), plus a nudge toast.
      if (input.animate) {
        input.animate(
          [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-9px)' },
            { transform: 'translateX(8px)' },
            { transform: 'translateX(-6px)' },
            { transform: 'translateX(4px)' },
            { transform: 'translateX(0)' },
          ],
          { duration: 380, easing: 'ease-in-out' }
        );
      }
      toast('Enter your name first! 👀');
      return;
    }
    resetDraft();
    state.draft.creatorName = name;
    location.hash = '#/create';
  }

  startBtn.addEventListener('click', start);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); start(); }
  });

  input.focus();
}
