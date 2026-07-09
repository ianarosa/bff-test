// main.js — app bootstrap. Wires the hash router, seeds the background doodles,
// and exports the few generic DOM helpers every view shares (esc/el/toast).
// Keeping these here (rather than in a view) means create/take/result/
// leaderboard agents never edit the same file to reach a shared helper.

import { route } from './router.js';

// HTML-escape a value for safe interpolation into innerHTML.
export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Build a detached element from an HTML string (returns the wrapper div).
export function el(html) {
  const t = document.createElement('div');
  t.innerHTML = html;
  return t;
}

// Show a transient toast message.
export function toast(msg) {
  const toastEl = document.getElementById('toast');
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('show'), 1700);
}

// Scatter floating sticker doodles across the fixed background layer.
function initDoodles() {
  const d = document.getElementById('doodles');
  if (!d) return;
  const set = ['🎯', '✨', '🧵', '🌈', '⭐', '🔍', '💡', '🧩', '💫', '🌟'];
  let html = '';
  for (let i = 0; i < 12; i++) {
    const top = Math.random() * 92;
    const left = Math.random() * 92;
    const delay = (Math.random() * 6).toFixed(2);
    const dur = (5 + Math.random() * 5).toFixed(2);
    html += '<span class="doodle" style="top:' + top + '%;left:' + left + '%;animation-delay:' + delay + 's;animation-duration:' + dur + 's">' + set[i % set.length] + '</span>';
  }
  d.innerHTML = html;
}

initDoodles();
window.addEventListener('hashchange', route);
route();
