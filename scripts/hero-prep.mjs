// 3D 주인공 다듬기(docs/3d-hero.md): 사진 → 3D 서비스(TRELLIS)에서 받은 GLB를 앱과 Mixamo에 맞게 고친다.
//   npm run dev 를 켠 채로: node scripts/hero-prep.mjs [원본 GLB=assets/hero/hero-raw.glb]
//   - 몸에서 떨어져 떠 있는 작은 조각을 지운다
//   - 발을 바닥(0)에, 몸을 가운데에 맞춘다
//   - assets/hero/hero-clean.glb(다듬은 것)와 assets/hero/mixamo/hero.zip(OBJ+MTL+PNG, Mixamo 올리기용)을 만든다
// 새 라이브러리 없이 컴퓨터의 Chrome·Edge를 화면 없이 띄우고, 개발 서버의 scripts/hero-prep.html에서 three.js로 처리한다.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2] ?? 'assets/hero/hero-raw.glb';
const DEV = 'http://localhost:5174';
const browserPath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p));
if (!browserPath) throw new Error('Chrome이나 Edge를 찾지 못했어요.');
const dir = join(tmpdir(), `jusan-heroprep-${process.pid}`);
const port = 9800 + (process.pid % 150);
const chrome = spawn(browserPath, ['--headless=new', '--enable-unsafe-swiftshader', `--remote-debugging-port=${port}`, `--user-data-dir=${join(dir, 'profile')}`, `${DEV}/scripts/hero-prep.html`], { stdio: 'ignore' });
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
if (!target) throw new Error('브라우저에 연결하지 못했어요. npm run dev가 켜져 있나요?');
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
    pending.set(n, (m) => (m.result?.exceptionDetails ? fail(new Error(JSON.stringify(m.result.exceptionDetails).slice(0, 600))) : ok(m.result?.result?.value)));
    ws.send(JSON.stringify({ id: n, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
  });
// 개발 서버가 처음 한 번 페이지를 다시 읽을 수 있다. 준비 함수가 생길 때까지 기다리고, 없어지면 다시 기다린다
const waitReady = () => evaluate(`new Promise((ok) => { const f = () => (typeof window.prep === 'function' ? ok(true) : setTimeout(f, 100)); f(); })`);
await waitReady();
await sleep(1500);
await waitReady();
const r = await evaluate(`prep(${JSON.stringify('/' + src.split('\\').join('/'))})`);
ws.close();
chrome.kill();
await sleep(300);
rmSync(dir, { recursive: true, force: true });

console.log(`조각 ${r.report.parts}개(삼각형 수 큰 순: ${r.report.sizes.join(', ')}) → 남긴 삼각형 ${r.report.kept}, 지운 삼각형 ${r.report.removed}. 키 ${r.height.toFixed(2)}`);
writeFileSync(resolve(ROOT, 'assets/hero/hero-clean.glb'), Buffer.from(r.glb, 'base64'));
const mix = resolve(ROOT, 'assets/hero/mixamo');
mkdirSync(mix, { recursive: true });
writeFileSync(join(mix, 'hero.obj'), r.obj);
writeFileSync(join(mix, 'hero.mtl'), r.mtl);
writeFileSync(join(mix, 'hero.png'), Buffer.from(r.png, 'base64'));
rmSync(join(mix, 'hero.zip'), { force: true });
execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${join(mix, 'hero.obj')}','${join(mix, 'hero.mtl')}','${join(mix, 'hero.png')}' -DestinationPath '${join(mix, 'hero.zip')}'`]);
console.log('assets/hero/hero-clean.glb, assets/hero/mixamo/hero.zip 을 만들었어요.');
