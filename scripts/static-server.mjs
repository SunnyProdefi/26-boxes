import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve(process.cwd());
const preferredPort = Number(process.env.PORT ?? 4173);
const maxPortAttempts = 20;
let activePort = preferredPort;

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"]
]);

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const requestPath = decodeURIComponent(requestUrl.pathname);
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const cleanPath = normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(join(root, cleanPath));
  const rootBoundary = root.endsWith(sep) ? root : `${root}${sep}`;

  if ((!filePath.startsWith(rootBoundary) && filePath !== root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": mimeTypes.get(extname(filePath)) ?? "application/octet-stream"
  });
  createReadStream(filePath).pipe(response);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE" && activePort < preferredPort + maxPortAttempts) {
    const nextPort = activePort + 1;
    console.warn(`Port ${activePort} is already in use. Trying ${nextPort}...`);
    activePort = nextPort;
    server.close(() => {
      server.listen(activePort);
    });
    return;
  }

  throw error;
});

server.on("listening", () => {
  console.log(`26 Boxes is running at http://localhost:${activePort}`);
});

server.listen(activePort);
