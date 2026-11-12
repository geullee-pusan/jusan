// 3D 주인공용 장면 뽑기(docs/3d-hero.md). 아이 둘레를 돌며 찍은 영상에서 장면을 뽑는다.
//   node scripts/hero-frames.mjs <영상> [초,초,...]
//   - 초를 주지 않으면 1초마다 작은 장면과 선명도를 뽑아 assets/hero/frames/sheet.jpg(한눈에 보기)를 만든다.
//   - 초를 주면 그 때의 장면을 원래 크기로 assets/hero/frames/frame-<초>.jpg로 저장한다(앞뒤 0.3초 안에서 가장 선명한 것).
// 아이 영상과 장면은 git과 배포물에 넣지 않는다(.gitignore). 바깥으로 보내지 않는다.
// 새 라이브러리 없이 컴퓨터의 Chrome·Edge를 화면 없이 띄우고, 개발자 도구 연결(CDP)로 영상을 다룬다.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'assets/hero/frames');
const [videoArg, timesArg] = process.argv.slice(2);
if (!videoArg || !existsSync(videoArg)) throw new Error('영상 파일을 주세요: node scripts/hero-frames.mjs <영상> [초,초]');

function findBrowser() {
  const list = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
  ];
  const found = list.find((p) => existsSync(p));
  if (!found) throw new Error('Chrome이나 Edge를 찾지 못했어요.');
  return found;
}

const dir = join(tmpdir(), `jusan-hero-${process.pid}`);
mkdirSync(dir, { recursive: true });
const html = join(dir, 'v.html');
writeFileSync(html, `<!doctype html><video id="v" muted preload="auto" src="${pathToFileURL(resolve(videoArg)).href}"></video>`);
const port = 9300 + (process.pid % 500);
const chrome = spawn(findBrowser(), ['--headless=new', '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${port}`, '--allow-file-access-from-files', `--user-data-dir=${join(dir, 'profile')}`, pathToFileURL(html).href], { stdio: 'ignore' });

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    target = list.find((t) => t.type === 'page');
  } catch {
    // 아직 뜨는 중
  }
}
if (!target) throw new Error('브라우저에 연결하지 못했어요.');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((ok) => ws.addEventListener('open', ok));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
const evaluate = (expression) =>
  new Promise((ok, fail) => {
    const n = ++id;
    pending.set(n, (msg) => (msg.result?.exceptionDetails ? fail(new Error(JSON.stringify(msg.result.exceptionDetails))) : ok(msg.result?.result?.value)));
    ws.send(JSON.stringify({ id: n, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
  });

// 페이지가 다 뜰 때까지 기다린다
await evaluate(`new Promise((ok) => { const f = () => (document.getElementById('v') ? ok(true) : setTimeout(f, 50)); f(); })`);

// 영상에서 t초 장면을 그리고 선명도(밝기의 라플라시안 분산)를 잰다
const helpers = `
  window.v = document.getElementById('v');
  // 화면 없는 브라우저는 한 번 재생해야 장면을 그린다(재생기를 깨운다)
  window.ready = new Promise((ok) => (v.readyState >= 2 ? ok() : v.addEventListener('loadeddata', ok, { once: true }))).then(async () => { await Promise.race([v.play().catch(() => {}), new Promise((ok) => setTimeout(ok, 1500))]); await new Promise((ok) => setTimeout(ok, 300)); v.pause(); });
  window.grab = async (t, h) => {
    await ready;
    v.currentTime = Math.min(Math.max(0, t), v.duration - 0.05);
    await new Promise((ok) => v.addEventListener('seeked', ok, { once: true }));
    // 그 장면이 그려지도록 잠깐 기다린다(화면 없는 브라우저는 그림 알림이 오지 않을 때가 있다)
    await new Promise((ok) => setTimeout(ok, 150));
    const s = h ? h / v.videoHeight : 1;
    const c = document.createElement('canvas');
    c.width = Math.round(v.videoWidth * s);
    c.height = Math.round(v.videoHeight * s);
    const x = c.getContext('2d');
    x.drawImage(v, 0, 0, c.width, c.height);
    // 선명도: 가운데 부분을 작게 줄여 잰다
    const m = document.createElement('canvas');
    m.width = 270; m.height = 480;
    const mx = m.getContext('2d');
    mx.drawImage(v, 0, 0, 270, 480);
    const p = mx.getImageData(0, 0, 270, 480).data;
    let sum = 0, sum2 = 0, n = 0;
    for (let yy = 1; yy < 479; yy++) for (let xx = 1; xx < 269; xx++) {
      const L = (i) => p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11;
      const i = (yy * 270 + xx) * 4;
      const lap = 4 * L(i) - L(i - 4) - L(i + 4) - L(i - 1080) - L(i + 1080);
      sum += lap; sum2 += lap * lap; n++;
    }
    return { url: c.toDataURL('image/jpeg', 0.92), sharp: Math.round(sum2 / n - (sum / n) ** 2), w: c.width, h: c.height };
  };
  'ok';
`;
await evaluate(helpers);
const duration = await evaluate('ready.then(() => v.duration)');
mkdirSync(OUT, { recursive: true });
const save = (name, url) => writeFileSync(join(OUT, name), Buffer.from(url.split(',')[1], 'base64'));

if (!timesArg || timesArg.startsWith('sheet')) {
  // 한눈에 보기: 1초마다(sheet:0.5 처럼 주면 그 간격으로) 장면 + 선명도(페이지 안에서 바로 한 장에 그린다)
  const step = Number(timesArg?.split(':')[1] ?? 1);
  const big = step < 1;
  const result = await evaluate(`(async () => {
    await ready;
    const cols = ${big ? 10 : 12}, w = ${big ? 216 : 135}, h = ${big ? 384 : 240}, times = [];
    for (let t = ${step / 2}; t < v.duration; t += ${step}) times.push(t);
    const c = document.createElement('canvas');
    c.width = cols * w; c.height = Math.ceil(times.length / cols) * (h + 18);
    const x = c.getContext('2d');
    x.fillStyle = '#222'; x.fillRect(0, 0, c.width, c.height);
    const list = [];
    for (const [i, t] of times.entries()) {
      const r = await grab(t, h);
      const cx = (i % cols) * w, cy = Math.floor(i / cols) * (h + 18);
      x.drawImage(v, cx, cy, w, h);
      x.fillStyle = '#ff0'; x.font = '13px Arial';
      x.fillText(t.toFixed(1) + 's  ' + r.sharp, cx + 3, cy + h + 14);
      list.push([t, r.sharp]);
    }
    return { sheet: c.toDataURL('image/jpeg', 0.85), list };
  })()`);
  save('sheet.jpg', result.sheet);
  console.log(`영상 ${duration.toFixed(1)}초. 한눈에 보기: assets/hero/frames/sheet.jpg`);
  for (const [t, sharp] of result.list) console.log(`${t.toFixed(1)}s 선명도 ${sharp}`);
} else {
  for (const raw of timesArg.split(',')) {
    // 끝에 ! 를 붙이면(24.3!) 그 시각 그대로 뽑는다
    const t = Number(raw.replace('!', ''));
    const exact = raw.endsWith('!');
    // 앞뒤 0.3초 안에서 가장 선명한 장면
    let best = null;
    for (const dt of exact ? [0] : [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3]) {
      const r = await evaluate(`grab(${t + dt}, 0)`);
      if (!best || r.sharp > best.sharp) best = { ...r, t: t + dt };
    }
    save(`frame-${t}.jpg`, best.url);
    console.log(`assets/hero/frames/frame-${t}.jpg  (${best.t.toFixed(1)}초, ${best.w}×${best.h}, 선명도 ${best.sharp})`);
  }
}
ws.close();
chrome.kill();
await sleep(300);
rmSync(dir, { recursive: true, force: true });
