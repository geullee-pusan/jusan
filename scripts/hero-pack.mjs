// 3D 주인공 묶기(docs/3d-hero.md): Mixamo에서 받은 FBX(뼈대·텍스처·동작)를 앱이 쓰는 모양으로 바꾼다.
//   node scripts/hero-pack.mjs
//   - 넣는 것: assets/hero/anim/defeated.fbx(모델+쓰러지기), idle.fbx(서 있기), dance-hiphop.fbx, dance-silly.fbx, dance-hiphop2.fbx, dance-hiphop3.fbx, dance-silly2.fbx, dance-chicken.fbx, dance-hiphop4.fbx, yawn.fbx(오래 기다릴 때), hurt-spat.fbx·hurt-injured.fbx(성벽이 깎일 때), gameover.fbx(게임 오버)
//   - 만드는 것: src/content/hero/hero.json(뼈대·메시·동작), src/content/hero/hero.webp(텍스처),
//     assets/hero/pack-shots.jpg(확인용 그림)
// 앱은 모델 로더 없이 src/ui/hero-model.js로 조립한다(로더 안의 네트워크 코드를 배포물에 넣지 않으려고).
// 이 폴더에서 Vite 서버를 잠깐 띄우고, 화면 없는 Chrome·Edge로 scripts/hero-pack.html을 연다.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ANIM = '/assets/hero/anim';
const job = {
  base: `${ANIM}/defeated.fbx`,
  baseClip: 'defeated',
  textureFile: '/assets/hero/mixamo/hero.png',
  // [이름, 파일, 엉덩이 위치 움직임을 살릴지]
  extras: [
    ['idle', `${ANIM}/idle.fbx`, true],
    ['dance1', `${ANIM}/dance-hiphop.fbx`, true],
    ['dance2', `${ANIM}/dance-silly.fbx`, true],
    ['dance3', `${ANIM}/dance-hiphop2.fbx`, true],
    ['dance4', `${ANIM}/dance-hiphop3.fbx`, true],
    ['dance5', `${ANIM}/dance-silly2.fbx`, true],
    ['dance6', `${ANIM}/dance-chicken.fbx`, true],
    ['dance7', `${ANIM}/dance-hiphop4.fbx`, true],
    ['yawn', `${ANIM}/yawn.fbx`, true],
    ['hurt2', `${ANIM}/hurt-spat.fbx`, true],
    ['hurt3', `${ANIM}/hurt-injured.fbx`, true],
    ['gameover', `${ANIM}/gameover.fbx`, true],
  ],
};
const vite = await createServer({ root: ROOT, server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await vite.listen();
const DEV = `http://127.0.0.1:${vite.httpServer.address().port}`;
const browserPath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p));
if (!browserPath) throw new Error('Chrome이나 Edge를 찾지 못했어요.');
const dir = join(tmpdir(), `jusan-heropack-${process.pid}`);
const port = 9950 + (process.pid % 40);
const chrome = spawn(browserPath, ['--headless=new', '--enable-unsafe-swiftshader', `--remote-debugging-port=${port}`, `--user-data-dir=${join(dir, 'profile')}`, `${DEV}/scripts/hero-pack.html`], { stdio: 'ignore' });
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');
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
  const m = JSON.parse(e.data);
  pending.get(m.id)?.(m);
  pending.delete(m.id);
});
const evaluate = (expression) =>
  new Promise((ok, fail) => {
    const n = ++id;
    pending.set(n, (m) => (m.result?.exceptionDetails ? fail(new Error(JSON.stringify(m.result.exceptionDetails).slice(0, 800))) : ok(m.result?.result?.value)));
    ws.send(JSON.stringify({ id: n, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
  });
const waitReady = () => evaluate(`new Promise((ok) => { const f = () => (typeof window.pack === 'function' ? ok(true) : setTimeout(f, 100)); f(); })`);
await waitReady();
await sleep(1500);
await waitReady();
let r;
try {
  r = await evaluate(`pack(${JSON.stringify(job)})`);
} finally {
  ws.close();
  chrome.kill();
  await sleep(300);
  rmSync(dir, { recursive: true, force: true });
  await vite.close();
}
const out = resolve(ROOT, 'src/content/hero');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'hero.json'), r.json);
if (r.texture) writeFileSync(join(out, 'hero.webp'), Buffer.from(r.texture.split(',')[1], 'base64'));
// 확인용 그림 한 장(동작마다 한 줄)
const shots = r.shots;
const html = `<body style="margin:0;background:#333">${shots.map((s, i) => `${i % 4 === 0 ? '<div style="display:flex">' : ''}<img src="${s.url}">${i % 4 === 3 ? '</div>' : ''}`).join('')}</body>`;
writeFileSync(resolve(ROOT, 'assets/hero/pack-shots.html'), html);
console.log(JSON.stringify(r.report));
console.log(`src/content/hero/hero.json ${(r.json.length / 1024).toFixed(0)}KB, hero.webp ${r.texture ? (r.texture.length * 0.75 / 1024).toFixed(0) : 0}KB`);
console.log('확인용: assets/hero/pack-shots.html');
