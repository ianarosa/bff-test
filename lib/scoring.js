'use strict';

// Pure scoring — no I/O. Given a stored quiz (with answers) and a guess array,
// produce the score, tier and a per-question breakdown.

// Tier by ratio so it works for any question count. For a 10-question quiz this
// reproduces the original bands exactly:
//   9-10 -> S, 7-8 -> A, 5-6 -> B, 3-4 -> C, 1-2 -> D, 0 -> F.
function tierFor(score, total) {
  const ratio = total > 0 ? score / total : 0;
  if (ratio >= 0.9) return '🏆 S · CERTIFIED BFF';
  if (ratio >= 0.7) return '💛 A · BESTIES';
  if (ratio >= 0.5) return '😎 B · GOOD FRIEND';
  if (ratio >= 0.3) return '🤔 C · ACQUAINTANCE';
  if (score >= 1) return '😬 D · BARELY';
  return '👻 F · STRANGER';
}

// scoreAttempt(quiz, guesses) -> { score, total, tier, breakdown }
// breakdown carries text + options so the client can render results without
// ever having been sent the answer key up front.
function scoreAttempt(quiz, guesses) {
  const questions = quiz.questions;
  const total = questions.length;
  let score = 0;
  const breakdown = [];
  for (let i = 0; i < total; i++) {
    const q = questions[i];
    const correct = q.answer;
    const pick = guesses[i] | 0;
    const right = pick === correct;
    if (right) score++;
    breakdown.push({
      text: q.text,
      options: q.options.slice(),
      yourPick: pick,
      correctPick: correct,
      right,
    });
  }
  return { score, total, tier: tierFor(score, total), breakdown };
}

module.exports = { scoreAttempt, tierFor };
