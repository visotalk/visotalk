/**
 * `visotalk doctor [--fix] [--json]`: what rendering needs, and where it stands on this machine.
 *
 * Without `--fix` it only reports. With `--fix` it installs what is missing into ~/.visotalk (VISOTALK_HOME): the pinned
 * chrome-headless-shell, the Kokoro model, a Python venv with its packages, the word-alignment weights and the fonts a document can embed, each download
 * checked against a size and a SHA-256 and written whole or not at all. `ffmpeg` and Python itself are the user's to install.
 * Every command then finds those files through `applyDefaults`, unless the variable it replaces (VISOTALK_CHROME, KOKORO_DIR,
 * VISOTALK_PYTHON, TORCH_HOME, VISOTALK_FONTS) is already set.
 */
import {createHash} from 'node:crypto';
import {createWriteStream, existsSync, mkdirSync, renameSync, rmSync, statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {homedir} from 'node:os';
import {dirname, join} from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {Browser, computeExecutablePath, detectBrowserPlatform, install} from '@puppeteer/browsers';
import {PINNED_CHROME} from '@visotalk/exporter';
import {FONTS, fontFile, isInstalled} from './fonts.ts';

const KOKORO_URL = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0';
const KOKORO = [
  {file: 'kokoro-v1.0.onnx', url: `${KOKORO_URL}/kokoro-v1.0.onnx`, bytes: 325532387, sha256: '7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5'},
  {file: 'voices-v1.0.bin', url: `${KOKORO_URL}/voices-v1.0.bin`, bytes: 28214398, sha256: 'bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d'},
];
/** The weights torchaudio's WAV2VEC2_ASR_BASE_960H loads. Its own first-use download once left a truncated file that failed later. */
const ALIGNER = {
  file: 'wav2vec2_fairseq_base_ls960_asr_ls960.pth', url: 'https://download.pytorch.org/torchaudio/models/wav2vec2_fairseq_base_ls960_asr_ls960.pth',
  bytes: 377664473, sha256: '488fd4f16de84438ffc945334278c1b9fb9b7159a806c1080b16111a958c945d',
};
/** kokoro-onnx is the one whose output the audio depends on, so it is pinned. torchaudio does not require torch in its metadata, so both are named and pip picks a pair. */
const PIP = ['kokoro-onnx==0.6.1', 'soundfile', 'torch', 'torchaudio', 'fonttools==4.67.0', 'brotli==1.2.0'];
const PIP_CPU_INDEX = 'https://download.pytorch.org/whl/cpu';
/**
 * espeak-ng, which Kokoro speaks through, loses its data under a path of about 160 characters (measured: a data path of 157 works, 167 fails with
 * "Error processing file …/phontab"), and the venv's own part of it is 58. A home deeper than this makes narration fail after a clean install.
 */
const MAX_VENV_PATH = 90;

const home = () => process.env.VISOTALK_HOME ?? join(homedir(), '.visotalk');
const chromeIn = (h: string) => computeExecutablePath({browser: Browser.CHROMEHEADLESSSHELL, buildId: PINNED_CHROME, cacheDir: join(h, 'chrome')});
const venvPython = (h: string) => join(h, 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const weightsIn = (torchHome: string) => join(torchHome, 'hub', 'checkpoints', ALIGNER.file);
/** A setting is ours to repair when the user did not set it, or it is the default `applyDefaults` set from ~/.visotalk. */
const ours = (value: string | undefined, installed: string) => !value || value === installed;
const hasSize = (path: string, bytes: number) => existsSync(path) && statSync(path).size === bytes;

/** Point the commands at what `doctor --fix` installed, for each setting the environment has not made. */
export function applyDefaults() {
  const h = home();
  const use = (name: string, value: string, exists: boolean) => void (!process.env[name] && exists && (process.env[name] = value));
  use('VISOTALK_CHROME', chromeIn(h), existsSync(chromeIn(h)));
  use('KOKORO_DIR', join(h, 'kokoro'), KOKORO.every((f) => hasSize(join(h, 'kokoro', f.file), f.bytes)));
  use('VISOTALK_PYTHON', venvPython(h), existsSync(venvPython(h)));
  use('TORCH_HOME', join(h, 'torch'), hasSize(weightsIn(join(h, 'torch')), ALIGNER.bytes));
  use('VISOTALK_FONTS', join(h, 'fonts'), FONTS.every((f) => isInstalled(join(h, 'fonts'), f)));
}

/** Download `url` to `dest`: the file appears only when it has the expected size and SHA-256, so a cut connection never leaves a bad one in place. */
export async function download(url: string, dest: string, want: {bytes: number; sha256: string}, opts: {retries?: number} = {}) {
  mkdirSync(dirname(dest), {recursive: true});
  const part = `${dest}.part`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok || !res.body) throw new Error(`${url}: ${res.status} ${res.statusText}`);
      const hash = createHash('sha256');
      let bytes = 0;
      await pipeline(Readable.fromWeb(res.body as never).on('data', (c: Buffer) => (hash.update(c), (bytes += c.length))), createWriteStream(part));
      if (bytes !== want.bytes || hash.digest('hex') !== want.sha256) throw new Error(`${url}: the download is not the expected file (${bytes} bytes, expected ${want.bytes})`);
      return renameSync(part, dest);
    } catch (e) {
      rmSync(part, {force: true});
      if (attempt >= (opts.retries ?? 3)) throw e;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

type Item = {id: string; ok: boolean; detail: string; fixable: boolean};

const run = (cmd: string, args: string[]) => spawnSync(cmd, args, {encoding: 'utf8'});
const python = () => process.env.VISOTALK_PYTHON ?? 'python3';

function check(): Item[] {
  const h = home();
  const items: Item[] = [];
  const add = (id: string, ok: boolean, detail: string, fixable = false) => void items.push({id, ok, detail, fixable});

  const major = Number(process.versions.node.split('.')[0]);
  add('node', major >= 22, major >= 22 ? process.version : `${process.version}; Node 22 or later is needed`);

  const ff = run('ffmpeg', ['-version']);
  add('ffmpeg', ff.status === 0, ff.status === 0 ? ff.stdout.split('\n')[0].replace(/ Copyright.*/, '') : 'not on the PATH; install it (brew install ffmpeg, apt install ffmpeg, winget install ffmpeg)');

  const chrome = process.env.VISOTALK_CHROME;
  if (!chrome) add('chrome', false, `pinned chrome-headless-shell ${PINNED_CHROME} is not installed`, true);
  else if (!existsSync(chrome)) add('chrome', false, `VISOTALK_CHROME points to a missing file: ${chrome}`);
  else {
    const v = run(chrome, ['--version']).stdout?.trim() ?? '';
    add('chrome', v !== '', v.endsWith(PINNED_CHROME) ? `${v} (${chrome})` : `${v || 'does not run'} (${chrome}); the pinned build is ${PINNED_CHROME}, pixels can differ`);
  }

  const kokoro = process.env.KOKORO_DIR;
  const kokoroOk = !!kokoro && KOKORO.every((f) => hasSize(join(kokoro, f.file), f.bytes));
  add('kokoro', kokoroOk, kokoroOk ? kokoro! : kokoro ? `${kokoro} lacks ${KOKORO.map((f) => f.file).join(' and ')}` : 'the Kokoro model (narration) is not installed', ours(kokoro, join(h, 'kokoro')));

  const mine = ours(process.env.VISOTALK_PYTHON, venvPython(h));
  const tooLong = mine && join(h, 'venv').length > MAX_VENV_PATH;
  if (tooLong) add('home', false, `${h} is too long for narration (espeak-ng fails on paths over ~160 characters); set VISOTALK_HOME to a shorter directory, e.g. ~/.visotalk`);
  const py = run(python(), ['-c', 'import kokoro_onnx, soundfile, torch, torchaudio, fontTools, brotli']);
  add('python', py.status === 0, py.status === 0 ? `${python()} has kokoro-onnx, soundfile, torch, torchaudio, fonttools and brotli` : `${python()} lacks kokoro-onnx, soundfile, torch, torchaudio, fonttools or brotli`, mine && !tooLong);

  const torchHome = process.env.TORCH_HOME ?? join(homedir(), '.cache', 'torch');
  const weights = hasSize(weightsIn(torchHome), ALIGNER.bytes);
  add('aligner', weights, weights ? weightsIn(torchHome) : 'the word-alignment weights are not downloaded', ours(process.env.TORCH_HOME, join(h, 'torch')));

  const fonts = process.env.VISOTALK_FONTS;
  const missing = fonts ? FONTS.filter((f) => !isInstalled(fonts, f)) : FONTS;
  add('fonts', missing.length === 0, missing.length === 0 ? `${fonts} (${FONTS.map((f) => f.family).join(', ')})` : fonts ? `${fonts} lacks ${missing.map((f) => f.family).join(', ')}` : 'the fonts (Chinese, Japanese and Korean documents, and Newsreader) are not installed', ours(fonts, join(h, 'fonts')));
  return items;
}

const fixers: Record<string, (h: string) => Promise<void>> = {
  async chrome(h) {
    await install({browser: Browser.CHROMEHEADLESSSHELL, buildId: PINNED_CHROME, cacheDir: join(h, 'chrome'), platform: detectBrowserPlatform()});
  },
  async kokoro(h) {
    for (const f of KOKORO) if (!hasSize(join(h, 'kokoro', f.file), f.bytes)) await download(f.url, join(h, 'kokoro', f.file), f);
  },
  async python(h) {
    if (!existsSync(venvPython(h))) {
      const base = ['python3', 'python'].find((c) => run(c, ['-c', 'import sys; sys.exit(sys.version_info < (3, 9))']).status === 0);
      if (!base) throw new Error('Python 3.9 or later is needed to create the environment: install it, then run doctor --fix again');
      const venv = run(base, ['-m', 'venv', join(h, 'venv')]);
      if (venv.status !== 0) throw new Error(`could not create a Python environment (on Debian or Ubuntu: apt install python3-venv): ${venv.stderr.trim()}`);
    }
    const index = process.platform === 'linux' ? ['--extra-index-url', PIP_CPU_INDEX] : [];
    const pip = run(venvPython(h), ['-m', 'pip', 'install', '-q', '--disable-pip-version-check', ...index, ...PIP]);
    if (pip.status !== 0) throw new Error(`pip install ${PIP.join(' ')} failed: ${pip.stderr.trim().split('\n').slice(-3).join(' ')}`);
  },
  async fonts(h) {
    for (const f of FONTS) if (!isInstalled(join(h, 'fonts'), f)) await download(f.url, fontFile(join(h, 'fonts'), f), f);
  },
  async aligner(h) {
    const dest = weightsIn(join(h, 'torch'));
    if (!hasSize(dest, ALIGNER.bytes)) await download(ALIGNER.url, dest, ALIGNER);
  },
};

export async function doctor(args: string[]) {
  const json = args.includes('--json');
  const log = (s: string) => (json ? console.error(s) : console.log(s));
  let items = check();
  const todo = items.filter((i) => !i.ok && i.fixable);
  if (args.includes('--fix') && todo.length) {
    const h = home();
    log(`installing into ${h}: ${todo.map((i) => i.id).join(', ')} (a few minutes the first time)`);
    const failed = new Map<string, string>();
    await Promise.all(todo.map((i) => fixers[i.id](h).then(() => log(`installed ${i.id}`), (e) => void failed.set(i.id, e instanceof Error ? e.message : String(e)))));
    applyDefaults();
    items = check().map((i) => (failed.has(i.id) ? {...i, detail: `${i.detail}; ${failed.get(i.id)}`} : i));
  }
  const ok = items.every((i) => i.ok);
  if (json) console.log(JSON.stringify({ok, home: home(), items}, null, 1));
  else {
    for (const i of items) console.log(`${i.ok ? 'ok     ' : 'MISSING'}  ${i.id.padEnd(8)} ${i.detail}`);
    if (!ok && items.some((i) => !i.ok && i.fixable) && !args.includes('--fix')) console.log('\nrun: visotalk doctor --fix');
  }
  if (!ok) process.exit(1);
}
