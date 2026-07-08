'use strict';

// Extension -> Content-Type map. Serving `.js` as application/javascript and
// `.css` as text/css is REQUIRED or native ES module imports fail in the browser.
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Look up a content type by file extension (case-insensitive).
function typeFor(ext) {
  return MIME[String(ext).toLowerCase()] || 'application/octet-stream';
}

module.exports = { MIME, typeFor };
