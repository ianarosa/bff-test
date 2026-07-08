// take.js — the take-quiz view. Fetches a quiz's questions (NO answers), walks
// the friend through naming + guessing, submits, then hands the scored result to
// the result view. Uses state.attempt as the working store for guesses.

import { esc, toast } from '../main.js';
import { state, resetAttempt } from '../state.js';
import { getQuiz, submitAttempt, getLeaderboard } from '../api.js';
import * as result from './result.js';

const BEAD_EMOJI = ['🩷', '🧡', '💜', '💚', '💙', '🌸', '⭐', '🌈', '🍒', '🦋'];

// Shown when the quiz id doesn't resolve.
function renderNotFound(app) {
  app.innerHTML =
    '<div class="card center">' +
    '<div style="font-size:4rem">👻</div>' +
    '<h2>This quiz ghosted us</h2>' +
    '<p class="sub">That link doesn\'t match any quiz. Maybe make your own?</p>' +
    '<button class="btn" id="home">Create a Quiz 🎉</button></div>';
  document.getElementById('home').onclick = () => { location.hash = '#/create'; };
}

function braceletHTML(guesses) {
  const total = guesses.length;
  let s = '<div class="bracelet"><span class="knot">🪢</span>';
  for (let i = 0; i < total; i++) {
    const filled = guesses[i] != null;
    s += '<span class="bead b' + (i % 5) + (filled ? ' filled' : '') + '" data-b="' + i + '">' + (filled ? BEAD_EMOJI[i % BEAD_EMOJI.length] : '') + '</span>';
  }
  s += '<span class="knot">🪢</span></div>';
  return s;
}

export function render(app, id) {
  app.innerHTML = '<div class="spin">loading quiz… 🧵</div>';
  getQuiz(id).then((r) => {
    if (!r.ok) { renderNotFound(app); return; }

    const creator = r.data.creatorName;
    const questions = r.data.questions; // [{text, options}] — no answers
    const total = r.data.total || questions.length;
    const attempt = resetAttempt(id);
    attempt.guesses = new Array(total).fill(null);
    const guesses = attempt.guesses;

    let step = 0; // 0 = name, 1..total = questions
    let name = '';
    let board = []; // leaderboard rows shown under the name card (may be empty)

    // A small "who's already played" table under the name card (reference look).
    function boardPeekHTML() {
      if (!board.length) return '';
      const rows = board.slice(0, 5).map((a) =>
        '<div class="lb-row"><span class="lb-name">' + esc(a.friendName) + '</span>' +
        '<span class="lb-score">' + a.score + '</span></div>'
      ).join('');
      return '<div class="board-peek">' +
        '<div class="board-peek-h">Who knows <span class="name-chip">' + esc(creator) + '</span> best?</div>' +
        '<div class="lb-table"><div class="lb-head"><span>Name</span><span>Score</span></div>' + rows + '</div></div>';
    }

    function renderStep() {
      if (step === 0) {
        app.innerHTML =
          '<h1 class="take-title">How Well Do You Really Know <span class="name-chip">' + esc(creator) + '</span>?</h1>' +
          '<div class="card center namestep">' +
          '<div class="namestep-h">What is your name? 👥</div>' +
          '<input class="field" id="nm" maxlength="40" placeholder="Type your name here…" value="' + esc(name) + '" />' +
          '<button class="btn mint" id="go">Get Started 🚀</button>' +
          '</div>' +
          boardPeekHTML();
      } else {
        const qi = step - 1;
        const q = questions[qi];
        const optsHtml = q.options.map((o, oi) => {
          const sel = guesses[qi] === oi ? ' sel' : '';
          return '<button class="opt-pill' + sel + '" data-o="' + oi + '">' +
            '<span class="ring"></span><span class="opt-txt">' + esc(o) + '</span></button>';
        }).join('');
        // 2-up on wide screens only when options are short & there are 2+; long
        // text or a lone option forces a single column.
        const longOpt = q.options.some((o) => String(o).length > 34);
        const oneCol = longOpt || q.options.length < 2 ? ' one-col' : '';
        const answered = guesses.filter((g) => g != null).length;
        const body =
          '<div class="step-meta"><span class="step-count">Q' + step + ' / ' + total + '</span>' +
          '<span class="step-progress">' + answered + '/' + total + ' answered</span>' +
          '<button class="link-btn" id="back">‹ Back</button></div>' +
          '<div class="qtext">' + esc(q.text) + '</div>' +
          '<div class="opts qopts' + oneCol + '">' + optsHtml + '</div>';
        app.innerHTML = braceletHTML(guesses) + '<div class="card qcard">' + body + '</div>';
      }
      wire();
    }

    function popBead(i) {
      const b = app.querySelector('.bead[data-b="' + i + '"]');
      if (b) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
    }

    function wire() {
      if (step === 0) {
        const input = document.getElementById('nm');
        const go = document.getElementById('go');
        const submitName = () => {
          const v = input.value.trim();
          if (!v) { input.focus(); toast('Add your name first ✍️'); return; }
          name = v;
          attempt.friendName = v;
          step = 1;
          renderStep();
        };
        go.onclick = submitName;
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitName(); });
        input.focus();
      } else {
        const qi = step - 1;
        Array.prototype.forEach.call(app.querySelectorAll('.opt-pill'), (btn) => {
          btn.onclick = () => {
            const oi = +btn.getAttribute('data-o');
            guesses[qi] = oi;
            Array.prototype.forEach.call(app.querySelectorAll('.opt-pill'), (b) => b.classList.remove('sel'));
            btn.classList.add('sel');
            const bead = app.querySelector('.bead[data-b="' + qi + '"]');
            if (bead) { bead.className = 'bead b' + (qi % 5) + ' filled'; bead.textContent = BEAD_EMOJI[qi % BEAD_EMOJI.length]; }
            popBead(qi);
            setTimeout(() => {
              if (step < total) { step++; renderStep(); }
              else { submitAttemptNow(); }
            }, 280);
          };
        });
        document.getElementById('back').onclick = () => { step--; renderStep(); };
      }
    }

    function submitAttemptNow() {
      app.innerHTML = '<div class="spin">scoring your bestie-ness… 🧮</div>';
      submitAttempt(id, attempt.friendName, guesses).then((res) => {
        if (!res.ok) { toast((res.data && res.data.error) || 'Oops 😬'); render(app, id); return; }
        result.render(app, {
          quizId: id,
          creator,
          score: res.data.score,
          total: res.data.total,
          tier: res.data.tier,
          breakdown: res.data.breakdown,
        });
      });
    }

    // Fetch the leaderboard once for the name-step peek, then show the flow.
    getLeaderboard(id).then((lb) => {
      board = (lb.ok && Array.isArray(lb.data.attempts)) ? lb.data.attempts : [];
      renderStep();
    });
  });
}
