// router.js — hash routing. Maps the URL fragment to a view render() call.
// Routes:
//   ''            -> landing
//   '#/create'    -> create
//   '#/q/:id'     -> take
//   '#/q/:id/board' -> leaderboard
// (The result screen is not a route — take.js renders it in-place after scoring.)

import * as landing from './views/landing.js';
import * as create from './views/create.js';
import * as take from './views/take.js';
import * as leaderboard from './views/leaderboard.js';

export function route() {
  const app = document.getElementById('app');
  const h = location.hash.replace(/^#/, '');
  let m;
  if (!h || h === '/') return landing.render(app);
  if (h === '/create') return create.render(app);
  if ((m = h.match(/^\/q\/([A-Za-z0-9]+)\/board$/))) return leaderboard.render(app, m[1]);
  if ((m = h.match(/^\/q\/([A-Za-z0-9]+)$/))) return take.render(app, m[1]);
  return landing.render(app);
}
