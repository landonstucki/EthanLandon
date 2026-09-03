/**
 * Tiny zero-dependency static server for local development.
 *
 * WebFit is a plain static site, but it can't be opened straight off disk:
 * the pages load their JS with <script type="module">, and browsers refuse
 * ES module imports over file:// . So we serve the folder over HTTP instead.
 *
 * Usage: npm start   (or: PORT=3000 npm start)
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 8080;

// There's no index.html, so "/" opens the home page.
const DEFAULT_PAGE = "/home.html";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

const server = http.createServer((req, res) => {
  let pathname;
  try {
    ({ pathname } = new URL(req.url, `http://${req.headers.host || "localhost"}`));
  } catch {
    res.writeHead(400).end("Bad request");
    return;
  }

  if (pathname === "/") {
    pathname = DEFAULT_PAGE;
  }

  const filePath = path.join(ROOT, decodeURIComponent(pathname));

  // Never serve anything outside the project folder.
  if (!filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<h1>404 - Not found</h1><p>${pathname}</p><p><a href="/">Back to WebFit</a></p>`);
      return;
    }

    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      // Always re-read from disk so edits show up on refresh.
      "Cache-Control": "no-cache"
    });
    res.end(data);
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Try: PORT=${PORT + 1} npm start`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`WebFit running at http://localhost:${PORT}/`);
  console.log("Press Ctrl+C to stop.");
});
