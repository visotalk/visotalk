/** chrome-headless-shell: launch with deterministic flags, open a begin-frame-controlled page, drive frames. */
import {existsSync, linkSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import puppeteer, {type Browser, type CDPSession, type Page} from 'puppeteer-core';

/** The chrome-headless-shell build (Chrome for Testing) the goldens were recorded with: another build can paint other pixels */
export const PINNED_CHROME = '157.0.8080.0';

/** Flags for reproducible output: begin-frame control, software GL, fixed colour profile, no LCD AA */
export const CHROME_ARGS = [
  '--deterministic-mode', // enable-begin-frame-control, run-all-compositor-stages-before-draw, no threaded animation
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-gpu-rasterization', // CPU raster: GPU raster through SwiftShader makes glyph edges depend on the previous frame
  '--force-color-profile=srgb',
  '--force-device-scale-factor=1',
  '--font-render-hinting=none',
  '--disable-lcd-text',
  '--hide-scrollbars',
  '--mute-audio',
  '--no-sandbox',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
];

export function findChrome(explicit?: string): string {
  const c = [explicit, process.env.VISOTALK_CHROME].find((p): p is string => !!p && existsSync(p));
  if (!c) throw new Error('chrome-headless-shell not found: pass --chrome PATH or set VISOTALK_CHROME (Chrome for Testing build, pinned)');
  return c;
}

/** The flags that keep drawing off the GPU; `gpu` replaces them with `gpuGl` (where Chrome then finds no GPU it still draws in software: Mesa's llvmpipe through EGL on Linux) */
const SOFTWARE_GL = ['--use-angle=swiftshader', '--disable-gpu-rasterization'];

/**
 * ANGLE on the platform's own graphics API, which chrome-headless-shell does not pick by itself: left to choose, it stays on SwiftShader. Direct3D 11 on
 * Windows, Metal on macOS, GL over EGL on Linux (HyperFrames' browserManager.ts notes that `--use-gl=egl` alone makes the GPU process exit), with raster on
 * the GPU too.
 */
export const gpuGl = (platform: NodeJS.Platform = process.platform): string[] => [
  '--use-gl=angle', `--use-angle=${platform === 'win32' ? 'd3d11' : platform === 'darwin' ? 'metal' : 'gl-egl'}`,
  '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization',
];

/**
 * `scale` is device pixels per CSS pixel (`--force-device-scale-factor`): 2 paints a 1920 x 1080 page as 3840 x 2160. `gpu` draws on the machine's GPU
 * when Chrome can reach one: faster for heavy canvases, but its pixels depend on the GPU and its driver, so it is never used for goldens.
 */
export const launch = (chrome: string, extraArgs: string[] = [], scale = 1, gpu = false): Promise<Browser> =>
  puppeteer.launch({executablePath: chrome, headless: 'shell', defaultViewport: null, args: [...chromeArgs(scale, gpu), ...extraArgs]});

/** The flags `launch` passes: `CHROME_ARGS` at the scale, and with `gpu` the platform's GL in place of software GL */
export const chromeArgs = (scale = 1, gpu = false, platform: NodeJS.Platform = process.platform): string[] => [
  ...CHROME_ARGS.filter((a) => !gpu || !SOFTWARE_GL.includes(a)).map((a) => (a.startsWith('--force-device-scale-factor=') ? `--force-device-scale-factor=${scale}` : a)),
  ...(gpu ? gpuGl(platform) : []),
];

/** The GL renderer a page draws with, as WebGL names it ("ANGLE (NVIDIA, … Direct3D11 …)"; SwiftShader is software) */
export const glRenderer = (page: Page): Promise<string> =>
  page.evaluate(`(() => { const gl = document.createElement('canvas').getContext('webgl'); const x = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return gl ? String(gl.getParameter(x ? x.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : 'no WebGL'; })()`) as Promise<string>;

export interface DrivenPage {
  page: Page;
  cdp: CDPSession;
  frame(screenshot?: {format: 'png' | 'jpeg'; quality?: number}): Promise<Buffer | null>;
}

/** A page whose compositor only produces frames on HeadlessExperimental.beginFrame */
export async function openDrivenPage(browser: Browser, url: string, width: number, height: number, fps: number, scale = 1): Promise<DrivenPage> {
  const bcdp = await browser.target().createCDPSession();
  const {targetId} = await bcdp.send('Target.createTarget', {url: 'about:blank', width, height, enableBeginFrameControl: true});
  const target = await browser.waitForTarget((t) => (t as unknown as {_targetId: string})._targetId === targetId);
  const page = (await target.page())!;
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: scale, mobile: false});
  page.on('pageerror', (e) => console.error(`[page error] ${e}`));
  page.on('response', (r) => r.status() >= 400 && console.error(`[http ${r.status()}] ${r.url()}`));
  await page.goto(url, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction('!!window.__visotalk', {polling: 50});
  // Frame times live in the browser's TimeTicks base (CLOCK_MONOTONIC); times in its past are not honoured.
  let ticks = Number(process.hrtime.bigint() / 1000000n);
  const interval = 1000 / fps;
  const frame = async (screenshot?: {format: 'png' | 'jpeg'; quality?: number}) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      ticks += interval;
      const r = (await cdp.send('HeadlessExperimental.beginFrame', {frameTimeTicks: ticks, interval, ...(screenshot ? {screenshot} : {})})) as {
        screenshotData?: string;
      };
      if (!screenshot) return null;
      if (r.screenshotData) return Buffer.from(r.screenshotData, 'base64');
    }
    throw new Error('beginFrame returned no screenshot after 5 attempts');
  };
  await frame(); // warm-up: discard the page-load paint
  return {page, cdp, frame};
}

/** Where the lock lives (`VISOTALK_CHROME_LOCK` moves it, for tests), and how long a run waits for it before it says so and stops */
const lockPath = () => process.env.VISOTALK_CHROME_LOCK ?? join(tmpdir(), 'visotalk-chrome.lock');
const lockWaitMs = () => Number(process.env.VISOTALK_CHROME_LOCK_WAIT_MS ?? 45 * 60 * 1000);

/**
 * One run at a time drives Chrome on a machine: several software-rendered browsers at once exhaust it (a run dies with "Target closed"), and an author's tools,
 * agents and a render start them freely. The lock is a file holding the owner's pid; a lock whose owner is gone is taken over.
 */
export async function withChromeLock<T>(fn: () => Promise<T>): Promise<T> {
  const CHROME_LOCK = lockPath(), LOCK_WAIT_MS = lockWaitMs();
  let waited = false;
  const since = Date.now();
  for (;;) {
    // the pid is written before the lock exists (a hard link is atomic), so a crash can never leave a lock with no owner in it
    const mine = `${CHROME_LOCK}.${process.pid}`;
    writeFileSync(mine, String(process.pid));
    try {
      linkSync(mine, CHROME_LOCK);
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
    } finally {
      rmSync(mine, {force: true});
    }
    let owner = 0;
    try {
      owner = Number(readFileSync(CHROME_LOCK, 'utf8'));
      if (owner > 0) process.kill(owner, 0);
      else throw Object.assign(new Error('no owner in the lock'), {code: 'ESRCH'});
    } catch (err) {
      // the file is gone, or its owner is (EPERM means the owner is alive): take over
      if ((err as NodeJS.ErrnoException).code !== 'EPERM') {
        try {
          if (owner > 0 && readFileSync(CHROME_LOCK, 'utf8').trim() !== String(owner)) continue; // somebody took it over first
        } catch {
          continue; // gone meanwhile
        }
        rmSync(CHROME_LOCK, {force: true});
        continue;
      }
    }
    if (Date.now() - since > LOCK_WAIT_MS) throw new Error(`another visotalk run has held Chrome for more than ${Math.round(LOCK_WAIT_MS / 60000)} minutes${owner ? ` (pid ${owner})` : ''}: stop it, or remove ${CHROME_LOCK} if nothing is running`);
    if (!waited) console.error(`waiting for another visotalk run to finish with Chrome${owner ? ` (pid ${owner})` : ''}`);
    waited = true;
    await new Promise((r) => setTimeout(r, 500));
  }
  try {
    return await fn();
  } finally {
    // only our own lock: if it was taken over meanwhile, it is somebody else's now
    try {
      if (readFileSync(CHROME_LOCK, 'utf8').trim() === String(process.pid)) rmSync(CHROME_LOCK, {force: true});
    } catch {
      // already gone
    }
  }
}
