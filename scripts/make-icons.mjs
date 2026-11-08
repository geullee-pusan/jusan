// 홈 화면 아이콘을 만든다(node scripts/make-icons.mjs).
// 아이 사진(assets/son-photo.jpg)을 그대로 쓰되 조금 단순하게 만든다.
//  1. 머리와 어깨만 남기고 배경을 지운다(손으로 정한 테두리 + 밝은 벽 색 지우기).
//  2. 쿠와하라 필터로 피부·머리의 잔결을 지워 그림처럼 매끈하게 한다. 윤곽은 남는다.
//  3. 호박색 바탕 위, 주판 살과 알 앞에 놓는다.
// 원본 사진은 git과 배포물에 넣지 않는다. 결과 PNG만 public/에 둔다.
// 새 라이브러리 없이, 컴퓨터에 깔린 Chrome이나 Edge를 화면 없이 띄워 캔버스로 처리한다.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public');
const PHOTO = resolve(ROOT, 'assets/son-photo.jpg');

/** 사진(901×1600)에서 쓸 네모: 머리 위부터 어깨까지. */
const CROP = { x: 0, y: 290, size: 880 };

/** 사람 테두리(사진 좌표). 이 안쪽만 남긴다. 머리카락 끝보다 조금 넉넉하게 잡는다. */
const OUTLINE = [
  [128, 560], [140, 480], [178, 412], [236, 362], [324, 326], [420, 314], [518, 334], [596, 380],
  [642, 450], [656, 540], [652, 640], [640, 720], [636, 800], [630, 900], [606, 966], [582, 1032],
  [612, 1062], [700, 1098], [800, 1140], [901, 1176], [901, 1600], [0, 1600], [0, 1160], [120, 1110], [222, 1072],
  [226, 1044], [186, 982], [158, 900], [148, 800], [134, 700],
];

const C = { bg: '#F4B942', bgDeep: '#E9A52C', rod: '#8A5A2B', bead: '#6B3F1D', beadLight: '#8E5A2E' };

function page(photoDataUrl) {
  return `<!doctype html><meta charset="utf-8"><body><pre id="out"></pre><script>
const CROP = ${JSON.stringify(CROP)};
const OUTLINE = ${JSON.stringify(OUTLINE)};
const C = ${JSON.stringify(C)};
const W = 640; // 처리하는 크기

function kuwahara(src, w, h, r) {
  // 네 사분면 중 밝기 흔들림이 가장 작은 쪽의 평균 색을 쓴다. 잔결은 지우고 경계는 지킨다.
  const out = new Uint8ClampedArray(src.length);
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = 0.299 * src[i*4] + 0.587 * src[i*4+1] + 0.114 * src[i*4+2];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let best = Infinity, br = 0, bg = 0, bb = 0;
    for (const [dx0, dy0] of [[-r, -r], [0, -r], [-r, 0], [0, 0]]) {
      let n = 0, s = 0, s2 = 0, sr = 0, sg = 0, sb = 0;
      for (let dy = dy0; dy <= dy0 + r; dy++) {
        const yy = Math.min(h - 1, Math.max(0, y + dy));
        for (let dx = dx0; dx <= dx0 + r; dx++) {
          const xx = Math.min(w - 1, Math.max(0, x + dx));
          const i = yy * w + xx, l = lum[i];
          n++; s += l; s2 += l * l; sr += src[i*4]; sg += src[i*4+1]; sb += src[i*4+2];
        }
      }
      const v = s2 / n - (s / n) ** 2;
      if (v < best) { best = v; br = sr / n; bg = sg / n; bb = sb / n; }
    }
    const o = (y * w + x) * 4;
    out[o] = br; out[o+1] = bg; out[o+2] = bb; out[o+3] = src[o+3];
  }
  return out;
}

function bilateral(src, w, h, r, sc) {
  // 가까운 비슷한 색끼리만 섞는다. 피부·머리 잔결은 지우고 경계는 지킨다.
  const out = new Uint8ClampedArray(src.length);
  const ss = 2 * (r / 2) ** 2, cc = 2 * sc * sc;
  const sw = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) sw.push([dx, dy, Math.exp(-(dx*dx + dy*dy) / ss)]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4, r0 = src[o], g0 = src[o+1], b0 = src[o+2];
    let tw = 0, sr = 0, sg = 0, sb = 0;
    for (const [dx, dy, wsp] of sw) {
      const xx = Math.min(w - 1, Math.max(0, x + dx)), yy = Math.min(h - 1, Math.max(0, y + dy));
      const i = (yy * w + xx) * 4;
      const d = (src[i] - r0) ** 2 + (src[i+1] - g0) ** 2 + (src[i+2] - b0) ** 2;
      const wt = wsp * Math.exp(-d / cc);
      tw += wt; sr += src[i] * wt; sg += src[i+1] * wt; sb += src[i+2] * wt;
    }
    out[o] = sr / tw; out[o+1] = sg / tw; out[o+2] = sb / tw; out[o+3] = src[o+3];
  }
  return out;
}

function sharpen(src, w, h, amount) {
  // 언샤프 마스크: 흐린 것과의 차이를 더해 윤곽을 또렷하게 한다.
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = Math.min(w - 1, Math.max(0, x + dx)), yy = Math.min(h - 1, Math.max(0, y + dy));
        sum += src[(yy * w + xx) * 4 + c];
      }
      out[o + c] = src[o + c] + amount * (src[o + c] - sum / 9);
    }
    out[o + 3] = src[o + 3];
  }
  return out;
}

function bead(ctx, x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-26, 0); ctx.quadraticCurveTo(-18, -17, 0, -19); ctx.quadraticCurveTo(18, -17, 26, 0);
  ctx.quadraticCurveTo(18, 17, 0, 19); ctx.quadraticCurveTo(-18, 17, -26, 0);
  ctx.fillStyle = C.bead; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-20, -4); ctx.quadraticCurveTo(0, -16, 20, -4);
  ctx.strokeStyle = C.beadLight; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
}

const img = new Image();
img.onload = () => {
  // 1. 잘라서 W×W로
  const work = document.createElement('canvas'); work.width = work.height = W;
  const wc = work.getContext('2d', { willReadFrequently: true });
  wc.drawImage(img, CROP.x, CROP.y, CROP.size, CROP.size, 0, 0, W, W);

  // 2. 테두리 마스크(가장자리를 부드럽게)
  const mask = document.createElement('canvas'); mask.width = mask.height = W;
  const mc = mask.getContext('2d', { willReadFrequently: true });
  mc.filter = 'blur(3px)';
  mc.beginPath();
  OUTLINE.forEach(([px, py], i) => {
    const x = (px - CROP.x) / CROP.size * W, y = (py - CROP.y) / CROP.size * W;
    i ? mc.lineTo(x, y) : mc.moveTo(x, y);
  });
  mc.closePath(); mc.fillStyle = '#fff'; mc.fill();
  const m = mc.getImageData(0, 0, W, W).data;

  // 3. 단순하게
  const data = wc.getImageData(0, 0, W, W);
  let px = bilateral(data.data, W, W, 5, 18);
  px = kuwahara(px, W, W, 1);
  px = sharpen(px, W, W, 0.7);

  // 4. 밝은 벽 색 지우기 + 마스크 적용 + 색 조금 살리기
  for (let i = 0; i < W * W; i++) {
    const o = i * 4;
    const r = px[o], g = px[o+1], b = px[o+2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let a = m[o + 3] / 255;
    const photoY = CROP.y + Math.floor(i / W) / W * CROP.size;
    if (photoY < 1040 && mx > 150 && mx - mn < 30) a *= Math.max(0, Math.min(1, (mx - mn - 20) / 10)); // 회백색 벽(옷깃 위만)
    const l = (r + g + b) / 3, k = 1.12; // 채도 조금 올리기
    px[o] = l + (r - l) * k; px[o+1] = l + (g - l) * k; px[o+2] = l + (b - l) * k;
    px[o+3] = a * 255;
  }
  data.data.set(px); wc.putImageData(data, 0, 0);

  // 5. 아이콘 그리기
  const result = {};
  for (const [name, size, radius, scale] of [
    ['icon-512', 512, 112, 1], ['icon-192', 192, 112, 1],
    ['icon-maskable-512', 512, 0, 0.8], ['apple-touch-icon', 180, 0, 1],
  ]) {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const ctx = c.getContext('2d');
    ctx.beginPath(); ctx.roundRect(0, 0, 512, 512, radius); ctx.clip();
    const grad = ctx.createRadialGradient(256, 205, 0, 256, 205, 360);
    grad.addColorStop(0, C.bg); grad.addColorStop(1, C.bgDeep);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 512);
    ctx.save();
    ctx.translate(256 * (1 - scale), 256 * (1 - scale)); ctx.scale(scale, scale);
    ctx.fillStyle = C.rod; ctx.fillRect(-200, 214, 912, 10); // 주판 살(머리 뒤)
    for (const x of [40, 94, 418, 472]) bead(ctx, x, 219);
    ctx.drawImage(work, 42, 58, 470, 470); // 사진: 머리를 가운데, 아래쪽은 아이콘 끝까지
    ctx.restore();
    const out = document.createElement('canvas'); out.width = out.height = size;
    const oc = out.getContext('2d'); oc.imageSmoothingQuality = 'high';
    oc.drawImage(c, 0, 0, size, size);
    result[name] = out.toDataURL('image/png');
  }
  document.getElementById('out').textContent = JSON.stringify(result);
};
img.src = ${JSON.stringify(photoDataUrl)};
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
  if (!found) throw new Error('Chrome이나 Edge를 찾지 못했어요. 아이콘을 만들 수 없어요.');
  return found;
}

if (!existsSync(PHOTO)) throw new Error('assets/son-photo.jpg가 없어요.');
const photo = `data:image/jpeg;base64,${readFileSync(PHOTO).toString('base64')}`;
const dir = join(tmpdir(), `jusan-icon-${process.pid}`);
mkdirSync(dir, { recursive: true });
const html = join(dir, 'icon.html');
writeFileSync(html, page(photo));
const dom = execFileSync(findBrowser(), [
  '--headless=new', '--disable-gpu', '--virtual-time-budget=60000', '--dump-dom', pathToFileURL(html).href,
], { maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' });
rmSync(dir, { recursive: true, force: true });

const json = dom.match(/<pre id="out">([^<]*)<\/pre>/)?.[1];
if (!json) throw new Error('브라우저가 아이콘을 다 만들지 못했어요.');
const result = JSON.parse(json.replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
mkdirSync(OUT, { recursive: true });
for (const [name, url] of Object.entries(result)) {
  writeFileSync(resolve(OUT, `${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
}
console.log(`아이콘을 만들었어요: ${Object.keys(result).map((n) => `public/${n}.png`).join(', ')}`);
