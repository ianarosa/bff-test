'use strict';

// BFF Test — zero-dependency friendship-quiz server.
// Thin HTTP entry point: static file serving + API route dispatch. All the real
// work lives in lib/: store.js (persistence), scoring.js (scoring), mime.js.
const http = require('http');
const fs = require('fs');
const path = require('path');

const store = require('./lib/store');
const { scoreAttempt } = require('./lib/scoring');
const { typeFor, MIME } = require('./lib/mime');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DEFAULT_PORT = 5178;

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let tooBig = false;
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        tooBig = true;
        req.destroy();
      }
    });
    req.on('end', () => {
      if (tooBig) return reject(new Error('body too large'));
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('invalid json'));
      }
    });
    req.on('error', reject);
  });
}

function cleanName(name, fallback) {
  if (typeof name !== 'string') return fallback;
  const t = name.trim().slice(0, 40);
  return t.length ? t : fallback;
}

// ---------------------------------------------------------------------------
// Validation for the dynamic quiz definition:
//   questions:[ { text:string, options:[string,...] (2+), answer:int in range } ]
// ---------------------------------------------------------------------------
function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length < 1) return false;
  for (const q of questions) {
    if (!q || typeof q !== 'object') return false;
    if (typeof q.text !== 'string' || !q.text.trim()) return false;
    if (!Array.isArray(q.options) || q.options.length < 2) return false;
    if (!q.options.every((o) => typeof o === 'string' && o.length > 0)) return false;
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) return false;
  }
  return true;
}

// Normalize a validated definition (trim/cap lengths) before storing.
function normalizeQuestions(questions) {
  return questions.map((q) => ({
    text: String(q.text).slice(0, 200),
    options: q.options.map((o) => String(o).slice(0, 120)),
    answer: q.answer | 0,
  }));
}

// The client-safe projection of a quiz's questions — NO `answer` fields.
function publicQuestions(quiz) {
  return quiz.questions.map((q) => ({ text: q.text, options: q.options.slice() }));
}

// ---------------------------------------------------------------------------
// API router
// ---------------------------------------------------------------------------
async function handleApi(req, res, pathname) {
  const method = req.method;

  // POST /api/quiz -> create from a full definition, returns { id }
  if (method === 'POST' && pathname === '/api/quiz') {
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      return sendJson(res, 400, { error: 'Invalid request body' });
    }
    const creatorName = cleanName(body.creatorName, '');
    if (!creatorName) return sendJson(res, 400, { error: 'Tell us your name first' });
    if (!validateQuestions(body.questions)) {
      return sendJson(res, 400, { error: 'Add valid questions (2+ options, a picked answer each)' });
    }
    const id = store.saveQuiz({ creatorName, questions: normalizeQuestions(body.questions) });
    return sendJson(res, 200, { id });
  }

  // Routes under /api/quiz/:id
  const m = pathname.match(/^\/api\/quiz\/([A-Za-z0-9]+)(\/attempt|\/leaderboard|\/check)?$/);
  if (m) {
    const id = m[1];
    const sub = m[2];
    const quiz = store.getQuiz(id);
    if (!quiz) return sendJson(res, 404, { error: 'Quiz not found' });

    // GET /api/quiz/:id -> questions WITHOUT answers
    if (method === 'GET' && !sub) {
      return sendJson(res, 200, {
        creatorName: quiz.creatorName,
        total: quiz.questions.length,
        questions: publicQuestions(quiz), // NEVER includes answer
      });
    }

    // POST /api/quiz/:id/attempt -> score (answers used server-side only)
    if (method === 'POST' && sub === '/attempt') {
      let body;
      try {
        body = await readBody(req);
      } catch (e) {
        return sendJson(res, 400, { error: 'Invalid request body' });
      }
      const friendName = cleanName(body.friendName, 'Anonymous');
      const total = quiz.questions.length;
      const guesses = body.guesses;
      if (!Array.isArray(guesses) || guesses.length !== total) {
        return sendJson(res, 400, { error: 'Answer all ' + total + ' questions' });
      }
      for (let i = 0; i < total; i++) {
        const g = guesses[i];
        if (!Number.isInteger(g) || g < 0 || g >= quiz.questions[i].options.length) {
          return sendJson(res, 400, { error: 'Invalid answer selection' });
        }
      }
      const result = scoreAttempt(quiz, guesses);
      store.addAttempt(id, {
        friendName,
        score: result.score,
        total: result.total,
        tier: result.tier,
        at: Date.now(),
      });
      return sendJson(res, 200, result);
    }

    // POST /api/quiz/:id/check -> check one guess & reveal that question's answer
    // (correct pick returned only after the friend commits a guess for it)
    if (method === 'POST' && sub === '/check') {
      let body;
      try {
        body = await readBody(req);
      } catch (e) {
        return sendJson(res, 400, { error: 'Invalid request body' });
      }
      const index = body.index;
      const guess = body.guess;
      if (!Number.isInteger(index) || index < 0 || index >= quiz.questions.length) {
        return sendJson(res, 400, { error: 'Invalid selection' });
      }
      if (!Number.isInteger(guess) || guess < 0 || guess >= quiz.questions[index].options.length) {
        return sendJson(res, 400, { error: 'Invalid selection' });
      }
      return sendJson(res, 200, {
        right: guess === quiz.questions[index].answer,
        correctPick: quiz.questions[index].answer,
      });
    }

    // GET /api/quiz/:id/leaderboard
    if (method === 'GET' && sub === '/leaderboard') {
      const lb = store.getLeaderboard(id);
      return sendJson(res, 200, { creatorName: lb.creatorName, attempts: lb.attempts });
    }

    return sendJson(res, 404, { error: 'Not found' });
  }

  return sendJson(res, 404, { error: 'Not found' });
}

// ---------------------------------------------------------------------------
// Static file serving (with SPA fallback to index.html for non-API routes)
// ---------------------------------------------------------------------------
function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? '/index.html' : pathname;
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safe);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      if (!pathname.startsWith('/api/')) {
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, idx) => {
          if (e2) {
            res.writeHead(404);
            return res.end('Not found');
          }
          res.writeHead(200, { 'Content-Type': MIME['.html'] });
          res.end(idx);
        });
        return;
      }
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': typeFor(ext) });
    res.end(buf);
  });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    pathname = '/';
  }
  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname).catch(() => sendJson(res, 500, { error: 'Server error' }));
    return;
  }
  serveStatic(req, res, pathname);
});

function start(port, triesLeft) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && triesLeft > 0) {
      const next = port + 1;
      console.log(`⚠ Port ${port} busy, trying ${next}...`);
      start(next, triesLeft - 1);
    } else {
      console.error('Failed to start server:', err.message);
      process.exit(1);
    }
  });
  server.listen(port, () => {
    console.log(`▶ BFF Test running at http://localhost:${port}`);
  });
}

start(DEFAULT_PORT, 15);
