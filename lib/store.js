'use strict';

// Persistence layer — the ONLY module that touches data.json.
// Stored shape:
//   { quizzes: { <id>: {
//       creatorName: string,
//       questions: [ { text, options:[...], answer:int } ],   // full definition, answers included
//       createdAt: number,
//       attempts: [ { friendName, score, total, tier, at } ]
//   } } }
// The creator's `answer` fields live ONLY here on the server — see server.js /
// scoring.js for the cheat-proof read path that strips them before responding.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.quizzes !== 'object' || parsed.quizzes === null) {
      return { quizzes: {} };
    }
    return parsed;
  } catch (err) {
    // Missing or corrupt file — start fresh.
    return { quizzes: {} };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// url-safe short id, 6 chars, no ambiguous glyphs.
function makeId() {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(6);
  let id = '';
  for (let i = 0; i < 6; i++) id += alphabet[bytes[i] % alphabet.length];
  return id;
}

// Return the full stored quiz (INCLUDING answers) or null. Callers that respond
// to clients must strip `answer` themselves.
function getQuiz(id) {
  return readData().quizzes[id] || null;
}

// Persist a new quiz `{ creatorName, questions:[{text,options,answer}] }`.
// Stamps createdAt + empty attempts, allocates a unique id, returns the id.
function saveQuiz(quiz) {
  const data = readData();
  let id = makeId();
  let guard = 0;
  while (data.quizzes[id] && guard++ < 20) id = makeId();
  data.quizzes[id] = {
    creatorName: quiz.creatorName,
    questions: quiz.questions,
    createdAt: Date.now(),
    attempts: [],
  };
  writeData(data);
  return id;
}

// Append an attempt record to a quiz. Returns false if the quiz is gone.
function addAttempt(id, attempt) {
  const data = readData();
  const quiz = data.quizzes[id];
  if (!quiz) return false;
  quiz.attempts.push(attempt);
  writeData(data);
  return true;
}

// Sorted (score desc, earliest first) leaderboard view, or null if no quiz.
// One row per friend (best score kept): after sorting best-first, the first
// attempt seen per normalized name is their best (earliest on ties).
function getLeaderboard(id) {
  const quiz = getQuiz(id);
  if (!quiz) return null;
  const seen = new Set();
  const attempts = quiz.attempts
    .slice()
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .filter((a) => {
      const key = String(a.friendName).trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((a) => ({ friendName: a.friendName, score: a.score, total: a.total, tier: a.tier }));
  return { creatorName: quiz.creatorName, attempts };
}

module.exports = { getQuiz, saveQuiz, addAttempt, getLeaderboard };
