// 게임 모드 "주판 성 지키기"(2026-11-10 부모 결정). 순수 함수다.
// 오른쪽에서 블록 몬스터가 성으로 다가온다. 몬스터마다 계산 문제가 있고, 답을 말하거나 넣으면 무찌른다.
// 몬스터가 성에 닿으면 성벽이 한 칸 깎이고, 세 칸이 다 깎이면 끝난다.
// 이 모드에서만 다가오는 시간과 성벽을 쓴다(CLAUDE.md 예외). 빠르기는 아이가 고른다.
// 시간은 UI가 재서 넘긴다(여기서는 현재 시각을 읽지 않는다).
import { makeAddSubProblem } from './addsub.js';
import { makeMulProblem } from './mulproblems.js';
import { createRng, randInt, seedFrom } from './rng.js';

/** 몬스터 종류: 강하게 생길수록 어려운 문제 */
export const ENEMIES = {
  slime: { name: '슬라임 블록', points: 10, make: (s) => makeAddSubProblem(s, { rows: 3, digits: [1, 1], minus: 1, allowed: ['A1', 'A2', 'B1', 'B2'] }) },
  skeleton: { name: '해골 블록', points: 20, make: (s) => makeAddSubProblem(s, { rows: 3, digits: [1, 1], minus: 1, need: ['A3', 'A4', 'B3', 'B4'], allowed: ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'] }) },
  golem: { name: '바위 골렘', points: 40, make: (s) => makeAddSubProblem(s, { rows: 5, digits: [2, 2], minus: 2 }) },
  dragon: {
    name: '블록 드래곤',
    points: 60,
    make: (s) => {
      const rng = createRng(s);
      return makeMulProblem(s, { multiDigits: randInt(rng, 2, 3), singleFirst: rng() < 0.5 });
    },
  },
  boss: { name: '보스', points: 100, make: (s) => makeAddSubProblem(s, { rows: 5, digits: [1, 2], minus: 2, need: ['A5', 'B5', 'A6', 'B6'] }) },
};

/** 난이도별로 나오는 몬스터와 비율(무게) */
export const DIFFICULTY = {
  easy: { name: '쉬움', mix: { slime: 3, skeleton: 1 }, boss: false },
  normal: { name: '보통', mix: { slime: 2, skeleton: 2, golem: 1 }, boss: false },
  hard: { name: '어려움', mix: { skeleton: 2, golem: 2, dragon: 2 }, boss: true },
};

/** 몬스터가 성까지 오는 시간(초). 실물 주판으로 풀 시간을 남긴다(2026-11-10: 60·40·25초에서 조금 빠르게) */
export const SPEEDS = {
  slow: { name: '느리게', travel: 45 },
  normal: { name: '보통', travel: 30 },
  fast: { name: '빠르게', travel: 20 },
};

export const WALLS = 3;

/**
 * 한 판의 몬스터들. 같은 판 안에서 답이 겹치지 않게 한다(답 하나로 몬스터 하나를 무찌른다).
 * @param {number} seed
 * @param {{difficulty: keyof DIFFICULTY, speed: keyof SPEEDS, count: number}} settings
 * @returns {{id: number, type: string, problem: object, answer: number, spawnAt: number, lane: number}[]}
 */
export function makeWave(seed, { difficulty, speed, count }) {
  const d = DIFFICULTY[difficulty];
  const travel = SPEEDS[speed].travel;
  const rng = createRng(seedFrom('wave', seed));
  const entries = Object.entries(d.mix);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  const answers = new Set();
  const enemies = [];
  const gap = travel / 4; // 성까지 오는 시간의 4분의 1마다 하나씩
  for (let i = 0; i < count; i++) {
    let type;
    if (d.boss && i === count - 1) type = 'boss';
    else {
      let pick = rng() * total;
      type = entries[0][0];
      for (const [k, w] of entries) {
        if ((pick -= w) < 0) {
          type = k;
          break;
        }
      }
    }
    let problem;
    for (let t = 0; t < 50; t++) {
      problem = ENEMIES[type].make(seedFrom('enemy', seed, i, t));
      if (!answers.has(problem.answer)) break;
    }
    answers.add(problem.answer);
    enemies.push({ id: i, type, problem, answer: problem.answer, spawnAt: i * gap + 1, lane: i % 3 });
  }
  return enemies;
}

/** 몬스터의 위치: 0이면 오른쪽 끝, 1이면 성에 닿음. t는 판이 시작하고 흐른 초 */
export function positionAt(enemy, t, travel) {
  return Math.max(0, Math.min(1, (t - enemy.spawnAt) / travel));
}

/** 답에 맞는 몬스터(화면에 나와 있고 아직 살아 있는 것 가운데 성에 가장 가까운 것) */
export function matchAnswer(alive, value, t, travel) {
  const hits = alive.filter((e) => e.answer === value && t >= e.spawnAt);
  hits.sort((a, b) => positionAt(b, t, travel) - positionAt(a, t, travel));
  return hits[0] ?? null;
}

/** 무찌른 점수: 몬스터 점수 + 성에서 멀리서 무찌를수록 보너스(최대 절반) */
export function scoreFor(enemy, position) {
  const base = ENEMIES[enemy.type].points;
  return base + Math.round(base * 0.5 * (1 - position));
}

/** 별: 성벽이 남은 만큼(다 깎이면 0) */
export function starsFor(wallsLeft) {
  return Math.max(0, Math.min(3, wallsLeft));
}

/** 다가오는 중인 몬스터들의 "성에 닿음" 여부를 판정한다 */
export function reached(alive, t, travel) {
  return alive.filter((e) => positionAt(e, t, travel) >= 1);
}
