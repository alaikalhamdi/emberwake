// Takes the entry's screenshots: starts headless Chrome or Edge, opens each scene listed in
// shots.json on a locally served game (node serve.ts), waits for window.__shotReady and
// saves the page as a JPEG under screenshots/, lowering the quality until it fits the
// gate's 256 KiB cap. Node 22+, standard library only.
//   node serve.ts --port 8123 &  node tools/capture.ts --port 8123 [--browser <path>] [--out <dir>]
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};
const port = option('--port', '8080');
const outDir = option('--out', join(root, 'screenshots'));
const MAX_BYTES = 262144;
const WIDTH = 1280;
const HEIGHT = 720;
const DEBUG_PORT = 9333;

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];
const browserPath = option('--browser', BROWSERS.find((path) => existsSync(path)) ?? '');
if (!browserPath) throw new Error('No Chrome or Edge found: pass --browser <path>');

type Shot = { name: string; query: string };
const shots: Shot[] = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));

const browser = spawn(browserPath, [
  '--headless=new',
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--window-size=${WIDTH},${HEIGHT}`,
  '--force-device-scale-factor=1',
  '--hide-scrollbars',
  '--mute-audio',
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'emberwake-shots-'))}`,
  'about:blank',
], { stdio: 'ignore' });

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function pageSocketUrl(): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      const page = list.find((target: { type: string }) => target.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // The browser is still starting.
    }
    await pause(200);
  }
  throw new Error('the browser never opened its debugging port');
}

/** A minimal DevTools Protocol client over one page's WebSocket. */
async function connect(url: string) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 1;
  const waiting = new Map<number, (value: any) => void>();
  socket.onmessage = (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id && waiting.has(message.id)) {
      waiting.get(message.id)!(message.error ? Promise.reject(new Error(message.error.message)) : message.result);
      waiting.delete(message.id);
    }
  };
  const send = (method: string, params: object = {}) => new Promise<any>((resolve) => {
    const id = nextId++;
    waiting.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
  return { send, close: () => socket.close() };
}

async function main() {
  const cdp = await connect(await pageSocketUrl());
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
  mkdirSync(outDir, { recursive: true });
  for (const shot of shots) {
    await cdp.send('Page.navigate', { url: `http://localhost:${port}/${shot.query}` });
    let ready = false;
    for (let attempt = 0; attempt < 300 && !ready; attempt += 1) {
      await pause(100);
      const result = await cdp.send('Runtime.evaluate', { expression: 'window.__shotReady === true', returnByValue: true });
      ready = result?.result?.value === true;
    }
    if (!ready) throw new Error(`${shot.name}: the scene never signalled ready`);
    await pause(300);
    let quality = 92;
    let bytes: Buffer;
    do {
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality });
      bytes = Buffer.from(data, 'base64');
      quality -= 4;
    } while (bytes.length > MAX_BYTES && quality > 30);
    writeFileSync(join(outDir, shot.name), bytes);
    console.log(`${shot.name}: ${bytes.length} bytes at quality ${quality + 4}`);
  }
  cdp.close();
}

main().finally(() => browser.kill());
