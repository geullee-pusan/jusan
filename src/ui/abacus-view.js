// 화면 주판(docs/SPEC.md 9장). 아이의 실물 주판과 똑같이 보이게 그린다(2026-11-09 부모가 보낸 사진).
//  - 17줄. 줄마다 알 색이 왼쪽부터 빨·파·흰·노·주·초로 되풀이된다(한 줄 안의 알 5개는 같은 색).
//  - 알은 팽이(마름모) 모양의 반짝이는 플라스틱. 살은 주황빛 나무색.
//  - 가장자리 틀과 안쪽 바탕은 검정, 윗알 아래 가름대는 흰색. 가름대에 세 줄마다 검은 자리점(왼쪽에서 3·6·9·12·15째 줄).
//  - 일의 자리는 자리점이 있는 줄 가운데 가장 오른쪽(왼쪽에서 15째, 흰 알)으로 본다.
//    강의에서도 자리점 줄을 기준으로 천의 자리에 쉼표를 찍는다. TODO(확인 필요): 아이가 실제로 일의 자리로 쓰는 줄.
// 선생님이 한 단계씩 알을 움직이고, 움직이는 순간에만 반짝인다.
import { beads } from '../core/abacus.js';
import { placeName } from '../core/korean.js';

export const RODS = 17;
const COLORS = ['#e8401c', '#1d5fd6', '#f4f4ef', '#f6e03a', '#f79a14', '#18a64a']; // 빨 파 흰 노 주 초
const ONES_INDEX = 14; // 왼쪽에서 0부터 셌을 때 일의 자리 줄
const DOT_INDEXES = new Set([2, 5, 8, 11, 14]);

/** 자리 번호(0 = 일의 자리)의 알 색 */
export function rodColor(place) {
  const index = ONES_INDEX - place;
  return COLORS[((index % 6) + 6) % 6];
}

export function createAbacus(root) {
  root.classList.add('abacus');
  root.innerHTML = '';
  const frame = document.createElement('div');
  frame.className = 'abacus-frame';
  const beam = document.createElement('div');
  beam.className = 'abacus-beam';
  const sparkles = document.createElement('div');
  sparkles.className = 'abacus-sparkles';
  const labels = document.createElement('div');
  labels.className = 'abacus-labels';
  root.append(frame, labels);
  frame.append(beam, sparkles);

  const values = new Array(RODS).fill(0); // 화면 왼쪽부터
  const cols = [];
  let size = { colW: 40, beadW: 36, beadH: 20, upper: 46, gap: 8, lower: 108 };

  for (let i = 0; i < RODS; i++) {
    const col = document.createElement('div');
    col.className = 'abacus-col';
    col.style.setProperty('--bead', COLORS[i % 6]);
    const rod = document.createElement('div');
    rod.className = 'abacus-rod';
    const upper = bead('abacus-upper');
    const lowers = [0, 1, 2, 3].map(() => bead('abacus-lower'));
    col.append(rod, upper, ...lowers);
    frame.appendChild(col);
    if (DOT_INDEXES.has(i)) {
      const dot = document.createElement('i');
      dot.className = 'abacus-dot';
      dot.style.left = `${((i + 0.5) / RODS) * 100}%`;
      beam.appendChild(dot);
    }
    const label = document.createElement('span');
    const place = ONES_INDEX - i;
    label.textContent = place >= 0 && place <= 4 ? placeName(place) : '';
    labels.appendChild(label);
    cols.push({ col, upper, lowers });
  }

  function bead(kind) {
    const b = document.createElement('div');
    b.className = `abacus-bead ${kind}`;
    return b;
  }

  /** 틀 너비에 맞춰 알 크기와 칸 높이를 정한다(사진의 비율: 알 높이 ≈ 너비의 0.55) */
  function measure() {
    const width = frame.clientWidth || 600;
    const colW = width / RODS;
    const beadW = Math.min(colW * 0.94, 64);
    const beadH = beadW * 0.55;
    size = { colW, beadW, beadH, upper: beadH * 2 + 4, gap: Math.max(6, beadH * 0.32), lower: beadH * 5 + 4 };
    frame.style.setProperty('--bead-w', `${beadW}px`);
    frame.style.setProperty('--bead-h', `${beadH}px`);
    frame.style.height = `${size.upper + size.gap + size.lower}px`;
    beam.style.top = `${size.upper}px`;
    beam.style.height = `${size.gap}px`;
    cols.forEach((_, i) => draw(i));
  }

  function draw(i) {
    const { upper, lowers } = cols[i];
    const { upper: u, lower: l } = beads(values[i]);
    const { beadH, upper: up, gap } = size;
    upper.style.transform = `translateY(${u ? up - beadH : 0}px)`;
    const lowTop = up + gap;
    lowers.forEach((b, k) => {
      const y = k < l ? lowTop + k * beadH : lowTop + size.lower - (4 - k) * beadH;
      b.style.transform = `translateY(${y}px)`;
    });
  }

  const indexOf = (place) => ONES_INDEX - place;

  /** 반짝이: 줄 하나에서 작은 별이 튄다 */
  function sparkle(place, { count = 6, big = false } = {}) {
    const i = indexOf(place);
    if (i < 0 || i >= RODS) return;
    const cx = (i + 0.5) * size.colW;
    const cy = size.upper + size.gap / 2;
    for (let k = 0; k < count; k++) {
      const s = document.createElement('i');
      s.className = big ? 'spark big' : 'spark';
      const angle = (Math.PI * 2 * k) / count + Math.random() * 0.6;
      const dist = (big ? 60 : 30) + Math.random() * 20;
      s.style.left = `${cx}px`;
      s.style.top = `${cy}px`;
      s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      s.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      sparkles.appendChild(s);
      setTimeout(() => s.remove(), 700);
    }
  }

  measure();
  if (typeof ResizeObserver === 'function') new ResizeObserver(measure).observe(frame);

  return {
    /** 모든 알을 0으로(문제 시작) */
    setup() {
      values.fill(0);
      cols.forEach((_, i) => draw(i));
      this.highlight(null);
    },
    /** 주판 털기: 흔들고 모두 0으로 */
    async clear() {
      root.classList.remove('shake');
      void root.offsetWidth;
      root.classList.add('shake');
      this.setup();
      await wait(350);
    },
    /** place 자리의 값을 바꾼다 */
    set(place, value) {
      const i = indexOf(place);
      values[i] = value;
      draw(i);
    },
    /** 자리를 밝게: kind 'now'(지금 움직이는 자리), 'start'(시작 자리) */
    highlight(place, kind = 'now') {
      cols.forEach((c) => {
        if (kind === 'now' || place === null) c.col.classList.remove('hl-now');
        if (kind === 'start' || place === null) c.col.classList.remove('hl-start');
      });
      if (place === null) return;
      const c = cols[indexOf(place)];
      if (c) c.col.classList.add(kind === 'start' ? 'hl-start' : 'hl-now');
    },
    /** 곱 두 칸이 놓였을 때 잠깐 빛난다 */
    glowPair(tensPlace, onesPlace) {
      for (const p of [tensPlace, onesPlace]) {
        const c = cols[indexOf(p)];
        if (!c) continue;
        c.col.classList.remove('glow');
        void c.col.offsetWidth;
        c.col.classList.add('glow');
      }
    },
    /** 답이 맞았을 때 주판 전체가 한 번 반짝인다 */
    celebrate() {
      root.classList.remove('celebrate');
      void root.offsetWidth;
      root.classList.add('celebrate');
      for (let p = 0; p <= 4; p++) sparkle(p, { count: 5, big: true });
    },
    /** 단계들을 차례로 보여 준다(SPEC 4.2절 단계 목록). 알이 움직일 때 반짝이고, 받아올림은 크게 반짝인다. */
    async play(steps, { stepMs = 650 } = {}) {
      for (const s of steps) {
        this.highlight(s.place);
        await wait(stepMs * 0.35);
        this.set(s.place, s.after);
        sparkle(s.place, { big: s.carry });
        await wait(stepMs * 0.65);
      }
      this.highlight(null);
    },
    values: () => [...values],
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
