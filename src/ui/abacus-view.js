// 화면 주판(docs/SPEC.md 9장). 선생님이 한 단계씩 알을 움직여 보여 준다.
// 윗알 1개(5), 아래알 4개(1씩). 오른쪽 끝이 일의 자리다. 일·천의 자리 가름대에 자리점을 찍는다.
import { beads } from '../core/abacus.js';
import { placeName } from '../core/korean.js';

const BEAD_H = 26; // 알 높이(px)
const UPPER_ROOM = BEAD_H * 2 + 8; // 위 칸 높이
const LOWER_ROOM = BEAD_H * 5 + 8; // 아래 칸 높이

/**
 * 아이의 실물 주판 색(2026-11-09 부모 확인): 23줄, 왼쪽부터 빨·파·흰·노·주·초가 되풀이된다.
 * 가장자리 틀은 검정, 윗알 아래 가름대는 흰색이다(style.css).
 * 화면 주판도 같은 색으로 칠해 실물과 나란히 보며 따라 놓기 쉽게 한다.
 * 실물의 오른쪽 끝 줄을 일의 자리로 본다(TODO(확인 필요): 아이가 일의 자리로 쓰는 줄).
 */
const REAL_COLORS = ['#e53935', '#1e66d0', '#f7f5ef', '#f7c631', '#f28c28', '#3aa655'];
const REAL_RODS = 23;
const ONES_FROM_LEFT = REAL_RODS - 1;
export function rodColor(place) {
  const fromLeft = ONES_FROM_LEFT - place;
  return REAL_COLORS[((fromLeft % 6) + 6) % 6];
}

export function createAbacus(root) {
  root.classList.add('abacus');
  const frame = document.createElement('div');
  frame.className = 'abacus-frame';
  const labels = document.createElement('div');
  labels.className = 'abacus-labels';
  root.append(frame, labels);
  let columns = [];
  let values = [];

  function build(count) {
    frame.innerHTML = '';
    labels.innerHTML = '';
    columns = [];
    values = new Array(count).fill(0);
    frame.style.setProperty('--cols', count);
    labels.style.setProperty('--cols', count);
    // 화면 왼쪽이 높은 자리. place = count - 1 - 화면 순서
    for (let i = 0; i < count; i++) {
      const place = count - 1 - i;
      const col = document.createElement('div');
      col.className = 'abacus-col';
      col.style.setProperty('--bead', rodColor(place));
      const rod = document.createElement('div');
      rod.className = 'abacus-rod';
      const upper = document.createElement('div');
      upper.className = 'abacus-bead abacus-upper';
      const lowers = [0, 1, 2, 3].map(() => {
        const b = document.createElement('div');
        b.className = 'abacus-bead abacus-lower';
        return b;
      });
      const dot = document.createElement('div');
      dot.className = place % 3 === 0 ? 'abacus-dot' : 'abacus-dot hidden';
      col.append(rod, upper, ...lowers, dot);
      frame.appendChild(col);
      columns[place] = { col, upper, lowers };
      const label = document.createElement('span');
      label.textContent = placeName(place);
      labels.appendChild(label);
      draw(place);
    }
  }

  function draw(place) {
    const { upper, lowers } = columns[place];
    const { upper: u, lower: l } = beads(values[place]);
    // 윗알: 0이면 위에, 1이면 가름대 쪽으로 내려온다
    upper.style.transform = `translateY(${u ? UPPER_ROOM - BEAD_H - 2 : 2}px)`;
    // 아래알: 올린 l개는 가름대 쪽에 붙고, 나머지는 아래에 모인다
    lowers.forEach((b, k) => {
      const up = k < l;
      const y = up ? UPPER_ROOM + 6 + k * BEAD_H : UPPER_ROOM + 6 + LOWER_ROOM - (4 - k) * BEAD_H - 4;
      b.style.transform = `translateY(${y}px)`;
    });
  }

  build(5);

  return {
    /** 자리 수를 정하고 모두 0으로 */
    setup(count) {
      if (count !== values.length) build(count);
      else values.fill(0), values.forEach((_, p) => draw(p));
      this.highlight(null);
    },
    /** 주판 털기: 흔들고 모두 0으로 */
    async clear(count = values.length) {
      root.classList.remove('shake');
      void root.offsetWidth;
      root.classList.add('shake');
      this.setup(count);
      await wait(350);
    },
    set(place, value) {
      values[place] = value;
      draw(place);
    },
    /** 자리 하나를 밝게(선생님이 가리키는 곳). null이면 끈다 */
    highlight(place, kind = 'now') {
      columns.forEach((c, p) => {
        if (!c) return;
        c.col.classList.toggle('hl-now', kind === 'now' && p === place);
        c.col.classList.toggle('hl-start', kind === 'start' && p === place);
      });
    },
    /** 단계들을 차례로 보여 준다(SPEC 4.2절 단계 목록) */
    async play(steps, { stepMs = 650 } = {}) {
      for (const s of steps) {
        this.highlight(s.place);
        await wait(stepMs * 0.35);
        this.set(s.place, s.after);
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

export const ABACUS_SIZES = { BEAD_H, UPPER_ROOM, LOWER_ROOM };
