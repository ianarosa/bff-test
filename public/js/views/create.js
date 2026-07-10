// create.js — the create-quiz view. Builds an editable draft from
// DEFAULT_QUESTIONS (state.draft.questions = [{text, options[], answer}]), then
// walks the creator through a per-question editor styled like bfftest.fun:
// a purple "Question N" card holding a white question box (with a chevron swap
// chip on its bottom edge), then the answer options as white pills — each with a
// radio ring (marks THEIR answer), inline-editable text, and a ✕ delete — plus a
// dashed "＋ Add an Option". Finally it POSTs the full definition and shows the
// shareable link.
//
// Handoff: the landing page sets state.draft.creatorName before routing here, so
// we skip the name step when a name is already present (fallback name step only
// when it's empty).
//
// The draft stays the single source of truth: questions[] is mutated in place, so
// on submit we POST { creatorName, questions:[{text,options,answer}] } as-is — no
// API change needed. Per-question UI edit-state (is the custom-text box open?) is
// tracked in a parallel `customFlags` array so the draft objects stay clean.

import { esc, toast } from '../main.js';
import { state, resetDraft } from '../state.js';
import { DEFAULT_QUESTIONS, ALTERNATES } from '../questionBank.js';
import { createQuiz, getLeaderboard } from '../api.js';

const MIN_OPTS = 2;
const MAX_OPTS = 6;

export function render(app) {
  // The landing page collects the creator's name and routes here with it set.
  // There is no name step in this view: if we arrive without a name (e.g. a
  // direct #/create hit), bounce back to the landing to collect it.
  const presetName = (state.draft.creatorName || '').trim();
  if (!presetName) { location.hash = '#/'; return; }

  const draft = resetDraft();
  draft.questions = DEFAULT_QUESTIONS.map((q) => ({
    text: q.text,
    options: q.options.slice(),
    answer: null,
  }));
  draft.creatorName = presetName;

  const questions = draft.questions;
  const total = questions.length;
  // Per-question flag: is the question text an editable "write my own" input?
  const customFlags = new Array(total).fill(false);
  let step = 1;            // 1..total = questions (no name step)
  let modalEl = null;      // the one swap-modal overlay in the DOM (or null)
  let modalKeydown = null; // Escape handler while the modal is open

  // Bank questions offered for a swap on the current question: ALTERNATES plus
  // any DEFAULT questions not currently in use, minus anything already on screen
  // (so we never offer a duplicate of a question the creator already has).
  function swapPool() {
    const onScreen = new Set(questions.map((q) => q.text.trim()));
    const seen = new Set();
    return ALTERNATES.concat(DEFAULT_QUESTIONS).filter((bq) => {
      if (seen.has(bq.text)) return false;
      seen.add(bq.text);
      return !onScreen.has(bq.text.trim());
    });
  }

  function optionPillHTML(o, oi, q) {
    const sel = q.answer === oi ? ' sel' : '';
    const canDel = q.options.length > MIN_OPTS;
    return '<div class="opt-pill' + sel + '" data-o="' + oi + '">' +
      '<button class="ring" data-pick="' + oi + '" aria-label="Mark this as my answer"></button>' +
      '<input class="opt-txt" data-oi="' + oi + '" maxlength="60" placeholder="Type an answer…" value="' + esc(o) + '" />' +
      '<button class="del' + (canDel ? '' : ' gone') + '" data-del="' + oi + '" aria-label="Delete this option"' + (canDel ? '' : ' tabindex="-1"') + '>✕</button>' +
      '</div>';
  }

  function renderStep() {
    const qi = step - 1;
    const q = questions[qi];
    const isCustom = customFlags[qi];
    const lastStep = step === total;
    const pillsHtml = q.options.map((o, oi) => optionPillHTML(o, oi, q)).join('');
    const head = isCustom
      ? '<input class="q-input" id="qin" maxlength="120" placeholder="Write your own question… ✍️" value="' + esc(q.text) + '" />'
      : '<div class="qtext">' + esc(q.text) + '</div>';
    // No name step, so Q1 has nothing to go back to — hide Back there.
    const backBtn = step > 1 ? '<button class="link-btn" id="back">‹ Back</button>' : '';

    const body =
      '<div class="q-head">' +
        '<span class="q-num">Question ' + step + '</span>' +
        '<span class="counter">' + step + ' of ' + total + '</span>' +
      '</div>' +
      // White question box; the chevron swap chip hangs off its bottom edge.
      '<div class="qbox">' +
        head +
        '<div class="swap-wrap">' +
          '<button class="swap-btn" id="swap" aria-haspopup="dialog" aria-expanded="false" aria-label="Swap this question">⌄</button>' +
        '</div>' +
      '</div>' +
      '<div class="opt-list">' + pillsHtml + '</div>' +
      '<button class="add-pill" id="addOpt"' + (q.options.length >= MAX_OPTS ? ' disabled' : '') + '>＋ Add an Option</button>' +
      '<div class="q-nav">' +
        backBtn +
        '<button class="btn small next-btn" id="next">' + (lastStep ? 'Create my quiz 🎉' : 'Next ›') + '</button>' +
      '</div>';
    app.innerHTML = '<div class="card qcard">' + body + '</div>';
    wire();
  }

  // Returns an error string if the question isn't submittable, else null.
  function validateQuestion(q) {
    if (!q.text.trim()) return 'Give your question some words ✍️';
    if (q.options.length < MIN_OPTS) return 'Need at least 2 answers 🙌';
    if (q.options.some((o) => !o.trim())) return 'Fill in every answer option 📝';
    if (q.answer == null) return 'Tap YOUR answer to lock it in 🎯';
    return null;
  }

  // Tear down the swap modal (idempotent). Removes its Escape handler and the
  // overlay element, letting the exit transition play before detaching.
  function closeSwapModal() {
    if (modalKeydown) { document.removeEventListener('keydown', modalKeydown); modalKeydown = null; }
    const m = modalEl;
    modalEl = null;
    if (m) {
      m.classList.remove('open');
      setTimeout(() => { if (m.parentNode) m.parentNode.removeChild(m); }, 220);
    }
    const swapBtn = document.getElementById('swap');
    if (swapBtn) swapBtn.setAttribute('aria-expanded', 'false');
  }

  // Open the full-screen swap modal (a dimmed bottom-sheet / centered sheet) for
  // question `qi`. Reuses swapPool() and the same swap behaviors, closing on
  // scrim click, ×, Escape, or after a choice. Never locks body scroll (that
  // would change body width and re-introduce the gradient twitch).
  function openSwapModal(qi) {
    closeSwapModal(); // guarantee only ONE modal in the DOM at a time
    const q = questions[qi];
    const pool = swapPool();
    const rows = pool.map((bq, pi) =>
      '<button class="qpick-row" data-swap="' + pi + '">' + esc(bq.text) + '</button>').join('');

    const overlay = document.createElement('div');
    overlay.className = 'swap-modal';
    overlay.innerHTML =
      '<div class="swap-scrim" data-close="1"></div>' +
      '<div class="swap-sheet" role="dialog" aria-modal="true" aria-label="Swap this question">' +
        '<div class="sheet-head">' +
          '<span class="sheet-title">Swap this question</span>' +
          '<button class="sheet-x" data-close="1" aria-label="Close">×</button>' +
        '</div>' +
        '<div class="sheet-scroll">' +
          '<button class="qpick-row write-own" data-own="1">✏️ Write my own…</button>' +
          rows +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    modalEl = overlay;

    // Scrim + × close the modal.
    Array.prototype.forEach.call(overlay.querySelectorAll('[data-close]'), (elx) => {
      elx.onclick = () => closeSwapModal();
    });

    // Choosing a row swaps (or enables custom) then closes.
    Array.prototype.forEach.call(overlay.querySelectorAll('.qpick-row'), (row) => {
      row.onclick = () => {
        if (row.getAttribute('data-own')) {
          // Write-my-own: blank question + a couple of blank options to edit.
          customFlags[qi] = true;
          q.text = '';
          q.options = ['', ''];
          q.answer = null;
        } else {
          const bq = pool[+row.getAttribute('data-swap')];
          if (!bq) return;
          customFlags[qi] = false;
          q.text = bq.text;
          q.options = bq.options.slice();
          q.answer = null;
        }
        closeSwapModal();
        renderStep();
        if (customFlags[qi]) { const qin = document.getElementById('qin'); if (qin) qin.focus(); }
      };
    });

    // Escape closes.
    modalKeydown = (e) => { if (e.key === 'Escape') closeSwapModal(); };
    document.addEventListener('keydown', modalKeydown);

    const swapBtn = document.getElementById('swap');
    if (swapBtn) swapBtn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => { overlay.classList.add('open'); });
  }

  function wire() {
    // A re-render replaces the card, so close any open swap modal cleanly.
    closeSwapModal();

    const qi = step - 1;
    const q = questions[qi];

    // --- swap chip opens the full-screen swap modal ---
    document.getElementById('swap').onclick = (e) => { e.stopPropagation(); openSwapModal(qi); };

    // --- custom question text ---
    if (customFlags[qi]) {
      const qin = document.getElementById('qin');
      if (qin) qin.oninput = () => { q.text = qin.value; };
    }

    // --- tap a pill (its ring or body, not the input/✕) to make it MY answer ---
    Array.prototype.forEach.call(app.querySelectorAll('.opt-pill'), (pill) => {
      pill.onclick = (e) => {
        if (e.target.closest('.del') || e.target.closest('.opt-txt')) return;
        q.answer = +pill.getAttribute('data-o');
        Array.prototype.forEach.call(app.querySelectorAll('.opt-pill'), (p) => p.classList.remove('sel'));
        pill.classList.add('sel');
      };
    });

    // --- edit an option's text inline ---
    Array.prototype.forEach.call(app.querySelectorAll('.opt-txt'), (inp) => {
      inp.oninput = () => { q.options[+inp.getAttribute('data-oi')] = inp.value; };
    });

    // --- delete an option (min 2, keep answer index aligned) ---
    Array.prototype.forEach.call(app.querySelectorAll('.del'), (btn) => {
      if (btn.classList.contains('gone')) return;
      btn.onclick = (e) => {
        e.stopPropagation();
        if (q.options.length <= MIN_OPTS) return;
        const oi = +btn.getAttribute('data-del');
        q.options.splice(oi, 1);
        if (q.answer === oi) q.answer = null;          // deleted the picked one
        else if (q.answer != null && q.answer > oi) q.answer -= 1; // shift down
        renderStep();
      };
    });

    // --- add an option (max 6) ---
    document.getElementById('addOpt').onclick = () => {
      if (q.options.length >= MAX_OPTS) return;
      q.options.push('');
      renderStep();
      const inputs = app.querySelectorAll('.opt-txt');
      const last = inputs[inputs.length - 1];
      if (last) last.focus();
    };

    // --- navigation (Back is absent on Q1) ---
    const back = document.getElementById('back');
    if (back) back.onclick = () => { step--; renderStep(); };
    document.getElementById('next').onclick = () => {
      const err = validateQuestion(q);
      if (err) { toast(err); return; }
      if (step < total) { step++; renderStep(); }
      else finalizeAndSubmit();
    };
  }

  function finalizeAndSubmit() {
    // Re-validate everything; jump back to the first broken question if any.
    for (let i = 0; i < questions.length; i++) {
      const err = validateQuestion(questions[i]);
      if (err) { step = i + 1; renderStep(); toast('Q' + (i + 1) + ': ' + err); return; }
    }
    // Trim before sending so no leading/trailing whitespace ships to the API.
    questions.forEach((q) => {
      q.text = q.text.trim();
      q.options = q.options.map((o) => o.trim());
    });
    submitDraft();
  }

  function submitDraft() {
    closeSwapModal();
    app.innerHTML = '<div class="spin">saving your quiz… ✨</div>';
    createQuiz(draft.creatorName, draft.questions).then((r) => {
      if (!r.ok) { toast((r.data && r.data.error) || 'Something broke 😬'); render(app); return; }
      showShare(r.data.id);
    });
  }

  function showShare(id) {
    // Shareable link is a REAL PATH (not a #hash) so social apps can crawl it for
    // a preview card. In-app navigation below still uses location.hash on purpose.
    const link = location.origin + '/q/' + id;

    // Native share sheet (phone) → one tap to WhatsApp/Instagram/Messages.
    // On desktop (no navigator.share) it degrades to copying the link.
    function nativeShare() {
      const shareData = {
        title: 'How Well You Know Me',
        text: 'Think you know me? Take my quiz and find out how well you really do 🎯',
        url: link,
      };
      if (navigator.share) {
        navigator.share(shareData).catch(() => {}); // user cancel / not-allowed: silently ignore
      } else {
        copyText(link);
        toast('Link copied — paste it to your friends! 📋');
      }
    }

    app.innerHTML =
      '<div class="card center">' +
      '<span class="eyebrow">quiz is live! 🎉</span>' +
      '<h2>Your quiz is ready 🎯</h2>' +
      '<p class="sub">Send this link to your friends. Every guess lands on your leaderboard.</p>' +
      '<div class="linkbox"><code id="lk">' + esc(link) + '</code></div>' +
      '<p class="sub play-note" id="playnote" style="margin-top:10px"></p>' +
      '<div style="height:14px"></div>' +
      '<button class="btn" id="share">Share 📲</button>' +
      '<div class="btn-row">' +
      '<button class="btn alt small" id="copy">Copy Link 🔗</button>' +
      '<button class="btn ghost small" id="board">Leaderboard 🏆</button>' +
      '<button class="btn ghost small" id="try">Preview 👀</button>' +
      '</div></div>';
    document.getElementById('share').onclick = nativeShare;
    document.getElementById('copy').onclick = () => copyText(link);
    document.getElementById('board').onclick = () => { location.hash = '#/q/' + id + '/board'; };
    document.getElementById('try').onclick = () => { location.hash = '#/q/' + id; };

    // live play count for social proof
    getLeaderboard(id).then((lb) => {
      const n = (lb.ok && Array.isArray(lb.data.attempts)) ? lb.data.attempts.length : 0;
      const note = document.getElementById('playnote');
      if (!note) return;
      note.textContent = n === 0
        ? 'No plays yet — send it around 🚀'
        : '🔥 ' + n + ' ' + (n === 1 ? 'person has' : 'people have') + ' played';
    });
  }

  function copyText(text) {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand('copy'); toast('Copied! 📋'); } catch (e) { toast('Copy failed — long-press to copy'); }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast('Copied! 📋'), fallback);
    } else { fallback(); }
  }

  renderStep();
}
