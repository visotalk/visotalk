/** chrome-headless-shell: launch with deterministic flags, open a begin-frame-controlled page, drive frames. */
import {existsSync} from 'node:fs';
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

export const launch = (chrome: string, extraArgs: string[] = []): Promise<Browser> =>
  puppeteer.launch({executablePath: chrome, headless: 'shell', args: [...CHROME_ARGS, ...extraArgs], defaultViewport: null});

export interface DrivenPage {
  page: Page;
  cdp: CDPSession;
  frame(screenshot?: {format: 'png' | 'jpeg'; quality?: number}): Promise<Buffer | null>;
}

/** A page whose compositor only produces frames on HeadlessExperimental.beginFrame */
export async function openDrivenPage(browser: Browser, url: string, width: number, height: number, fps: number): Promise<DrivenPage> {
  const bcdp = await browser.target().createCDPSession();
  const {targetId} = await bcdp.send('Target.createTarget', {url: 'about:blank', width, height, enableBeginFrameControl: true});
  const target = await browser.waitForTarget((t) => (t as unknown as {_targetId: string})._targetId === targetId);
  const page = (await target.page())!;
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});
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
