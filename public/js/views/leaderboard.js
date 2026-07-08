// leaderboard.js — ranked scoreboard for a quiz. render(container, quizId).

import { esc } from '../main.js';
import { getLeaderboard } from '../api.js';

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

export function render(app, id) {
  app.innerHTML = '<div class="spin">counting the real ones… 🏆</div>';
  getLeaderboard(id).then((r) => {
    if (!r.ok) { renderNotFound(app); return; }
    const creator = r.data.creatorName;
    const rows = r.data.attempts || [];

    let list;
    if (!rows.length) {
      list =
        '<div class="card center empty">' +
        '<div class="empty-emoji">🫙</div>' +
        '<div class="empty-title">The board is empty!</div>' +
        '<div class="empty-sub">No one has taken it yet — share your link to find out who your real ones are. 💌</div>' +
        '</div>';
    } else {
      const body = rows.map((a, i) => {
        const topc = i === 0 ? ' top1' : i === 1 ? ' top2' : i === 2 ? ' top3' : '';
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
        return '<div class="lb-row' + topc + '">' +
          '<div class="lb-left"><span class="lb-rank">' + medal + '</span>' +
          '<div class="lb-who"><span class="lb-name">' + esc(a.friendName) + '</span>' +
          '<span class="lb-tier">' + esc(a.tier) + '</span></div></div>' +
          '<span class="lb-score">' + a.score + '<span>/' + a.total + '</span></span></div>';
      }).join('');
      list = '<div class="lb-table"><div class="lb-head"><span>Name</span><span>Score</span></div>' + body + '</div>';
    }

    app.innerHTML =
      '<div class="lb-view center">' +
      '<h1 class="lb-title">Who knows <span class="name-chip">' + esc(creator) + '</span> best?</h1>' +
      '<p class="sub lb-sub">Only the top besties get the crown. 👑</p>' +
      list +
      '<div class="btn-row"><button class="btn small" id="take">Take the Test 🔥</button>' +
      '<button class="btn ghost small" id="own">Make Your Own 🎉</button></div>' +
      '</div>';
    document.getElementById('take').onclick = () => { location.hash = '#/q/' + id; };
    document.getElementById('own').onclick = () => { location.hash = '#/create'; };
  });
}
