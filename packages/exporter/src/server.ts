/** Static server for the built player, with the media cache and HTTP ranges. */
import {createReadStream, existsSync, statSync} from 'node:fs';
import {createServer, type IncomingMessage, type Server, type ServerResponse} from 'node:http';
import {extname, join, resolve} from 'node:path';

const TYPES: Record<string, string> = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.map': 'application/json'};

function sendFile(req: IncomingMessage, res: ServerResponse, file: string, extraHeaders: Record<string, string> = {}) {
  const size = statSync(file).size;
  const type = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
  if (m) {
    const start = m[1] ? Number(m[1]) : 0;
    const end = m[2] ? Number(m[2]) : size - 1;
    res.writeHead(206, {...extraHeaders, 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1});
    createReadStream(file, {start, end}).pipe(res);
  } else {
    res.writeHead(200, {...extraHeaders, 'content-type': type, 'accept-ranges': 'bytes', 'content-length': size});
    createReadStream(file).pipe(res);
  }
}

const listen = (s: Server, port = 0) => new Promise<number>((ok) => s.listen(port, '127.0.0.1', () => ok((s.address() as {port: number}).port)));

/** Serves `root`, plus `/__media/<asset>/<frame>.png` from `mediaCache` */
export async function servePlayer(root: string, mediaCache: string, port = 0): Promise<{url: string; close(): void}> {
  root = resolve(root);
  mediaCache = resolve(mediaCache);
  const s = createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url!, 'http://x').pathname);
    let file = p.startsWith('/__media/') ? join(mediaCache, p.slice(9)) : join(root, p);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!(file.startsWith(root) || file.startsWith(mediaCache)) || !existsSync(file)) return void res.writeHead(404).end();
    sendFile(req, res, file);
  });
  const p = await listen(s, port);
  return {url: `http://127.0.0.1:${p}/`, close: () => s.close()};
}
