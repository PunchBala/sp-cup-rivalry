import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4173);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function safePathname(urlPathname) {
  const normalized = decodeURIComponent(urlPathname === '/' ? '/index.html' : urlPathname);
  const resolved = path.resolve(root, `.${normalized}`);
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${host}:${port}`);
  const resolved = safePathname(url.pathname);
  if (!resolved) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  let filePath = resolved;
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    const body = fs.readFileSync(filePath);
    res.setHeader('Content-Type', mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
});

server.listen(port, host, () => {
  process.stdout.write(`Serving ${root} at http://${host}:${port}\n`);
});
