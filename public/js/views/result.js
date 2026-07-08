// result.js — the score / breakdown screen. Rendered in-place by take.js after
// an attempt is scored (not a route). resultData carries everything it needs:
//   { quizId, creator, score, total, tier, breakdown }
// where breakdown = [{ text, options, yourPick, correctPick, right }] — the
// options/answers arrive only NOW, in the scored response, never before.

import { esc } from '../main.js';
import { launchConfetti } from '../confetti.js';

export function render(app, resultData) {
  const { quizId, creator, score, total, tier, breakdown } = resultData;

  const bd = breakdown.map((b) => {
    const cls = b.right ? 'right' : 'wrong';
    const mark = b.right ? '✅' : '❌';
    const you = '<span class="pill you">You: ' + esc(b.options[b.yourPick]) + '</span>';
    const real = b.right ? '' : ' <span class="pill real">' + esc(creator) + ': ' + esc(b.options[b.correctPick]) + '</span>';
    return '<div class="brow ' + cls + '"><div class="bq"><span class="bmark">' + mark + '</span><span>' + esc(b.text) + '</span></div>' +
      '<div class="bans">' + you + real + '</div></div>';
  }).join('');

  app.innerHTML =
    '<div class="card center result">' +
    '<span class="eyebrow">results are in 🎊</span>' +
    '<div class="scorebig">' + score + '<span>/' + total + '</span></div>' +
    '<div class="charm"><span class="badge">' + esc(tier) + '</span></div>' +
    '<p class="sub result-sub">Here\'s how you did on knowing <span class="name-chip">' + esc(creator) + '</span> 👇</p>' +
    '<div class="breakdown">' + bd + '</div>' +
    '<div class="btn-row">' +
    '<button class="btn alt small" id="board">Leaderboard 🏆</button>' +
    '<button class="btn mint small" id="own">Make Your Own 🎉</button>' +
    '</div></div>';
  document.getElementById('board').onclick = () => { location.hash = '#/q/' + quizId + '/board'; };
  document.getElementById('own').onclick = () => { location.hash = '#/create'; };

  if (score >= total * 0.5) launchConfetti();
  else if (score >= 1) launchConfetti(0.5);
}
