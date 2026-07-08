// POST /api/quiz/:id/attempt — score a friend's guesses server-side (answers
// used only here, never sent up front) and persist the attempt. Returns
// { score, total, tier, breakdown }.

import { scoreAttempt } from '../../../_lib/scoring.js';

function json(obj, status = 200) {
  return Response.json(obj, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function cleanName(name, fallback) {
  if (typeof name !== 'string') return fallback;
  const t = name.trim().slice(0, 40);
  return t.length ? t : fallback;
}

export async function onRequestPost({ params, request, env }) {
  try {
    const id = params.id;
    const row = await env.DB.prepare('SELECT creator_name, questions FROM quizzes WHERE id = ?')
      .bind(id)
      .first();
    if (!row) return json({ error: 'Quiz not found' }, 404);

    let questions;
    try {
      questions = JSON.parse(row.questions);
    } catch (e) {
      return json({ error: 'Server error' }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: 'Invalid request body' }, 400);
    }
    if (!body || typeof body !== 'object') {
      return json({ error: 'Invalid request body' }, 400);
    }

    const friendName = cleanName(body.friendName, 'Anonymous');
    const total = questions.length;
    const guesses = body.guesses;
    if (!Array.isArray(guesses) || guesses.length !== total) {
      return json({ error: 'Answer all ' + total + ' questions' }, 400);
    }
    for (let i = 0; i < total; i++) {
      const g = guesses[i];
      if (!Number.isInteger(g) || g < 0 || g >= questions[i].options.length) {
        return json({ error: 'Invalid answer selection' }, 400);
      }
    }

    const result = scoreAttempt(questions, guesses);

    await env.DB.prepare(
      'INSERT INTO attempts (quiz_id, friend_name, score, total, tier, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(id, friendName, result.score, result.total, result.tier, Date.now())
      .run();

    return json(result, 200);
  } catch (e) {
    return json({ error: 'Server error' }, 500);
  }
}
