/**
 * One frame per narrated line of a film, for the independent review a fresh agent does.
 *
 *   node review-frames.mjs <doc.tsx> [--cli "npx visotalk@latest"] [--parts 3]
 *
 * It reads the film `visotalk render` made (.visotalk/<id>/out/final.mp4; `render-segments.sh` writes .visotalk/<id>/final.mp4: copy it there), takes the frame 85% of the way through each line (the pictures a line
 * names have normally appeared by then) and writes, beside the work files, review/<n>-<scene>-<line>.png, review/manifest.json (line, time, the exact
 * narration, the frame) and review/part1.json .. partN.json: the same entries cut for N reviewers. Hand each reviewer one part, the frames it names
 * and the list of sources the figures come from; never your own verdict on the film.
 *
 * Needs ffmpeg and a VisoTalk CLI (`npx visotalk@latest`, or `pnpm visotalk` in the repository). Nothing is written outside .visotalk/.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const docFile = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : null;
if (!docFile) {
  console.error('usage: node review-frames.mjs <doc.tsx> [--cli "npx visotalk@latest"] [--parts 3]');
  process.exit(2);
}
const cli = arg('cli', 'npx visotalk@latest').split(/\s+/);
const parts = Number(arg('parts', 3));

const source = readFileSync(docFile, 'utf8');
const id = source.match(/<Doc\s+id="([a-z0-9-]+)"/)?.[1];
if (!id) { console.error('no <Doc id="…"> in the document'); process.exit(1); }
const work = path.join(path.dirname(docFile), '.visotalk', id);
const film = path.join(work, 'out', 'final.mp4');
const out = path.join(work, 'review');
mkdirSync(out, { recursive: true });

// what each line says, exactly (the text between the tags, markup collapsed)
const spoken = Object.fromEntries([...source.matchAll(/<Line id="([a-z0-9-]+)"[^>]*>(.*?)<\/Line>/gs)].map((m) => [m[1], m[2].replace(/\s+/g, ' ').trim()]));

// `sheet` prints one row per line with the second at which its frame was taken (0.85 through the line)
const table = execFileSync(cli[0], [...cli.slice(1), 'sheet', docFile, '--out', path.join(out, 'sheet.png')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const rows = [];
for (const row of table.split('\n')) {
  const m = row.match(/^\s*(\d+)\s+(\S+)\/(\S+)\s+([\d.]+) s/);
  if (!m) continue;
  const [, n, scene, line, time] = m;
  const frame = path.join(out, `${String(n).padStart(2, '0')}-${scene}-${line}.png`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', time, '-i', film, '-frames:v', '1', '-vf', 'scale=1280:-1', frame]);
  rows.push({ n: Number(n), scene, line, time: Number(time), spoken: spoken[line], frame });
}
if (!rows.length) { console.error('`sheet` printed no lines: is the film rendered and the CLI right?'); process.exit(1); }

writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(rows, null, 1));
const size = Math.ceil(rows.length / parts);
for (let p = 0; p < parts; p++) {
  const part = rows.slice(p * size, (p + 1) * size);
  if (part.length) writeFileSync(path.join(out, `part${p + 1}.json`), JSON.stringify(part, null, 1));
}
console.log(`${rows.length} lines, ${parts} parts -> ${out}`);
