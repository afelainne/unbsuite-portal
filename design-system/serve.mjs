/**
 * Static server for the design-system reference pages.
 *
 *   npm run design-system     → http://localhost:4180
 *
 * Why this exists: the kit pages load their screens with
 * `<script type="text/babel" src="Screen.jsx">`, which Babel fetches at
 * runtime. Opening those files straight from disk (file://) blocks the fetch,
 * and serving them through the app's Vite server rewrites the .jsx before the
 * browser sees it. A plain static server is the only thing that works, so it
 * ships with the folder and needs no dependency.
 *
 * The specimen cards under reference/guidelines are plain HTML+CSS and do open
 * from disk without this.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)));
const PORT = Number(process.env.PORT) || 4180;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  // Served as plain text on purpose: Babel compiles these in the browser.
  ".jsx": "text/babel; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".md": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const requested = decodeURIComponent(url.pathname);
    const target = resolve(ROOT, "." + normalize(requested));

    // Never serve outside the design-system folder.
    if (target !== ROOT && !target.startsWith(ROOT + sep)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    let file = target;
    const info = await stat(file).catch(() => null);
    if (info?.isDirectory()) file = join(file, "index.html");
    if (requested === "/") file = join(ROOT, "reference", "index.html");

    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Não encontrado");
  }
});

server.listen(PORT, () => {
  console.log(`Design system em http://localhost:${PORT}`);
  console.log(`Índice da referência: http://localhost:${PORT}/reference/index.html`);
});
