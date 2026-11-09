// 성 지키기 그림을 앱에 넣을 크기로 다듬는다(node scripts/make-art.mjs, npm run art).
//  - 몬스터: assets/monsters/<이름>.(png|webp|jpg) → src/content/monsters/<이름>.webp
//      1. 흰 바탕이면 가장자리에서 이어진 흰 부분을 지워 투명하게 한다(테두리는 부드럽게).
//      2. 몬스터만 남게 잘라 내고, 긴 쪽을 SIZE.monster에 맞춘다.
//      3. 오른쪽을 보는 그림은 FLIP에 넣어 뒤집는다(몬스터는 모두 왼쪽 성을 본다).
//  - 배경: assets/backgrounds/bg-<번호>.* → src/content/backgrounds/bg-<번호>.webp (가로 SIZE.background)
//  - 성: assets/backgrounds/castle.* → src/content/backgrounds/castle.webp (몬스터처럼 바탕을 지운다)
// 그림은 부모가 AI 이미지 도구로 만들어 준다(프롬프트: docs/art-prompts.md).
// 새 라이브러리 없이, 컴퓨터에 깔린 Chrome이나 Edge를 화면 없이 띄워 캔버스로 처리한다(make-icons.mjs와 같은 방식).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIZE = { monster: 288, background: 1600 };
/** 오른쪽을 보고 그려진 몬스터(뒤집는다) */
const FLIP = new Set([]);
const MIME = { '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

function collect(dir, kind) {
  const abs = resolve(ROOT, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((f) => MIME[extname(f).toLowerCase()])
    .map((f) => {
      const name = f.slice(0, -extname(f).length);
      const k = kind === 'background' && name === 'castle' ? 'cutout' : kind;
      return { name, kind: k, flip: FLIP.has(name), url: `data:${MIME[extname(f).toLowerCase()]};base64,${readFileSync(join(abs, f)).toString('base64')}` };
    });
}

function page(jobs, size) {
  // 그림을 <img>로 페이지에 넣어 둔다. 페이지가 다 읽히면(load) 그 안에서 한 번에(동기로) 처리해야
  // 브라우저가 처리가 끝나기 전에 페이지를 내보내지 않는다.
  return `<!doctype html><meta charset="utf-8"><body><pre id="out"></pre>
${jobs.map((j, i) => `<img id="src-${i}" src="${j.url}" style="display:none">`).join('\n')}
<script>
const JOBS = ${JSON.stringify(jobs.map(({ url, ...rest }) => rest))};
const SIZE = ${JSON.stringify(size)};

/** 가장자리에서 이어진 흰 바탕을 지운다. 이미 투명한 그림이면 그대로 둔다. */
function cutWhite(d, w, h) {
  const p = d.data;
  let clear = 0;
  for (let i = 3; i < p.length; i += 4 * 61) if (p[i] < 250) clear++;
  if (clear > 40) return;
  const isBg = (i) => {
    const r = p[i], g = p[i + 1], b = p[i + 2];
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    return mn >= 226 && mx - mn <= 24;
  };
  const gone = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const k = stack.pop();
    if (gone[k] || !isBg(k * 4)) continue;
    gone[k] = 1;
    const x = k % w, y = (k - x) / w;
    if (x > 0) stack.push(k - 1);
    if (x < w - 1) stack.push(k + 1);
    if (y > 0) stack.push(k - w);
    if (y < h - 1) stack.push(k + w);
  }
  for (let k = 0; k < w * h; k++) if (gone[k]) p[k * 4 + 3] = 0;
  // 테두리: 지운 곳과 닿은 두 겹을 밝기만큼 반투명하게 하고, 흰 기운을 걷어 낸다
  const near = gone.slice(); // 1 = 지운 곳 또는 이미 다듬은 테두리
  for (let ring = 0; ring < 2; ring++) {
    const edge = [];
    for (let k = w; k < w * h - w; k++) {
      if (near[k]) continue;
      const x = k % w;
      if ((x > 0 && near[k - 1]) || (x < w - 1 && near[k + 1]) || near[k - w] || near[k + w]) edge.push(k);
    }
    for (const k of edge) {
      const i = k * 4;
      const mn = Math.min(p[i], p[i + 1], p[i + 2]);
      const a = Math.max(0, Math.min(1, (255 - mn) / 70)) * (ring === 0 ? 0.9 : 1);
      if (a < 1) {
        if (a > 0.05) for (let c = 0; c < 3; c++) p[i + c] = Math.max(0, Math.min(255, (p[i + c] - 255 * (1 - a)) / a));
        p[i + 3] = Math.round(255 * a);
      }
      near[k] = 1;
    }
  }
}

/** 투명하지 않은 부분만 남게 자른 네모 */
function bounds(d, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d.data[(y * w + x) * 4 + 3] > 20) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? { x: 0, y: 0, w, h } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** 반씩 여러 번 줄여 결을 살린다 */
function shrink(src, tw, th) {
  let c = src;
  while (c.width / 2 >= tw) {
    const n = document.createElement('canvas');
    n.width = Math.round(c.width / 2);
    n.height = Math.round(c.height / 2);
    const x = n.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(c, 0, 0, n.width, n.height);
    c = n;
  }
  const out = document.createElement('canvas');
  out.width = tw;
  out.height = th;
  const x = out.getContext('2d');
  x.imageSmoothingQuality = 'high';
  x.drawImage(c, 0, 0, tw, th);
  return out;
}

function run() {
  const result = {};
  for (const [i, job] of JOBS.entries()) {
    const img = document.getElementById('src-' + i);
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    if (job.flip) {
      x.translate(w, 0);
      x.scale(-1, 1);
    }
    x.drawImage(img, 0, 0);
    if (job.kind === 'background') {
      const out = shrink(c, Math.min(SIZE.background, w), Math.round(h * Math.min(SIZE.background, w) / w));
      result[job.name] = { url: out.toDataURL('image/webp', 0.8), w: out.width, h: out.height };
      continue;
    }
    const d = x.getImageData(0, 0, w, h);
    cutWhite(d, w, h);
    x.putImageData(d, 0, 0);
    const b = bounds(d, w, h);
    const pad = Math.round(Math.max(b.w, b.h) * 0.02);
    const cut = document.createElement('canvas');
    cut.width = b.w + pad * 2;
    cut.height = b.h + pad * 2;
    cut.getContext('2d').drawImage(c, b.x, b.y, b.w, b.h, pad, pad, b.w, b.h);
    const scale = Math.min(1, SIZE.monster / Math.max(cut.width, cut.height));
    const out = shrink(cut, Math.round(cut.width * scale), Math.round(cut.height * scale));
    result[job.name] = { url: out.toDataURL('image/webp', 0.86), w: out.width, h: out.height };
  }
  document.getElementById('out').textContent = JSON.stringify(result);
}
window.addEventListener('load', () => {
  try {
    run();
  } catch (e) {
    document.getElementById('out').textContent = JSON.stringify({ error: String(e) });
  }
});
</script>`;
}

function findBrowser() {
  const list = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];
  const found = list.find((p) => existsSync(p));
  if (!found) throw new Error('Chrome이나 Edge를 찾지 못했어요. 그림을 다듬을 수 없어요.');
  return found;
}

const groups = [
  { jobs: collect('assets/monsters', 'monster'), out: 'src/content/monsters' },
  { jobs: collect('assets/backgrounds', 'background'), out: 'src/content/backgrounds' },
];
const browser = findBrowser();
for (const { jobs, out } of groups) {
  for (const job of jobs) {
    // 한 장씩 처리한다(큰 그림 여러 장을 한 번에 넘기면 브라우저가 무거워진다)
    const dir = join(tmpdir(), `jusan-art-${process.pid}`);
    mkdirSync(dir, { recursive: true });
    const html = join(dir, 'art.html');
    writeFileSync(html, page([job], SIZE));
    const dom = execFileSync(browser, ['--headless=new', '--disable-gpu', '--virtual-time-budget=60000', '--dump-dom', pathToFileURL(html).href], {
      maxBuffer: 256 * 1024 * 1024,
      encoding: 'utf8',
    });
    rmSync(dir, { recursive: true, force: true });
    const json = dom.match(/<pre id="out">([^<]*)<\/pre>/)?.[1];
    if (!json) throw new Error(`${job.name}: 브라우저가 그림을 다 다듬지 못했어요. ${dom.slice(dom.indexOf("<pre"), dom.indexOf("<pre") + 300)}`);
    const result = JSON.parse(json.replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
    if (result.error) throw new Error(`${job.name}: ${result.error}`);
    mkdirSync(resolve(ROOT, out), { recursive: true });
    const r = result[job.name];
    const buf = Buffer.from(r.url.split(',')[1], 'base64');
    writeFileSync(resolve(ROOT, out, `${job.name}.webp`), buf);
    console.log(`${out}/${job.name}.webp  ${r.w}×${r.h}  ${(buf.length / 1024).toFixed(1)}KB`);
  }
}
