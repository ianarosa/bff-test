// Pure scoring — no I/O. Shared by all Pages Functions handlers.
// Ported verbatim (behaviour-identical) from lib/scoring.js, adapted to ESM and
// to take a raw `questions` array (each { text, options:[...], answer:int })
// instead of a wrapping quiz object.

// Tier by ratio so it works for any question count. For a 10-question quiz this
// reproduces the original bands exactly:
//   9-10 -> S, 7-8 -> A, 5-6 -> B, 3-4 -> C, 1-2 -> D, 0 -> F.
export function tierFor(score, total) {
  const ratio = total > 0 ? score / total : 0;
  if (ratio >= 0.9) return '🏆 S · MIND READER';
  if (ratio >= 0.7) return '🌟 A · INNER CIRCLE';
  if (ratio >= 0.5) return '😎 B · GOOD FRIEND';
  if (ratio >= 0.3) return '🤔 C · ACQUAINTANCE';
  if (score >= 1) return '😬 D · BARELY KNOW ME';
  return '👻 F · TOTAL STRANGER';
}

// scoreAttempt(questions, guesses) -> { score, total, tier, breakdown }
// breakdown carries text + options so the client can render results without
// ever having been sent the answer key up front.
export function scoreAttempt(questions, guesses) {
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
