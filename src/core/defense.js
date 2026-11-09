// 게임 모드 "주판 성 지키기"(2026-11-10 부모 결정). 순수 함수다.
// 오른쪽에서 블록 몬스터가 성으로 다가온다. 몬스터마다 계산 문제가 있고, 답을 말하거나 넣으면 무찌른다.
// 몬스터가 성에 닿으면 성벽이 한 칸 깎이고, 세 칸이 다 깎이면 끝난다.
// 이 모드에서만 다가오는 시간과 성벽을 쓴다(CLAUDE.md 예외).
// 시작 레벨은 아이가 고른다. 몬스터를 10마리 무찌를 때마다 레벨이 하나 오르고,
// 레벨이 오를수록 몬스터가 조금씩 세지고 빨라진다(부모 결정, 2026-11-10). 레벨은 내려가지 않는다.
// 시간은 UI가 재서 넘긴다(여기서는 현재 시각을 읽지 않는다).
import { makeAddSubProblem } from './addsub.js';
import { makeMulProblem } from './mulproblems.js';
import { createRng, randInt, seedFrom } from './rng.js';

/**
 * 몬스터 17종. 지도의 섬 차례(바로 넣기 → 친구수 → 5의 짝 → 함께 → 이어서 올리기 → 두 자리 → 곱셈)대로
 * 뒤로 갈수록 문제가 어렵고 점수가 크다. island: 무찌른 문제를 기술 지도에 넣을 때 쓰는 섬.
 */
const D1 = ['A1', 'A2', 'B1', 'B2'];
const as = (rows, digits, minus, need, allowed) => (s) => makeAddSubProblem(s, { rows, digits, minus, need, allowed });
export const ENEMIES = {
  slime: { name: '슬라임', points: 10, island: 'add-1', make: as(3, [1, 1], 1, [], D1) },
  bat: { name: '박쥐', points: 12, island: 'add-1', make: as(4, [1, 1], 1, [], D1) },
  mushroom: { name: '버섯', points: 15, island: 'add-2', make: as(3, [1, 1], 0, ['A4'], [...D1, 'A4']) },
  spider: { name: '거미', points: 20, island: 'add-3', make: as(3, [1, 1], 1, ['B4'], [...D1, 'A4', 'B4']) },
  raven: { name: '큰까마귀', points: 22, island: 'add-3', make: as(4, [1, 1], 1, ['B4'], [...D1, 'A4', 'B4']) },
  zombie: { name: '좀비', points: 25, island: 'add-4', make: as(3, [1, 1], 1, ['A3', 'B3'], [...D1, 'A3', 'A4', 'B3', 'B4']) },
  skeleton: { name: '해골', points: 30, island: 'add-4', make: as(4, [1, 1], 1, ['A3', 'B3'], [...D1, 'A3', 'A4', 'B3', 'B4']) },
  ghost: { name: '유령', points: 35, island: 'add-5', make: as(4, [1, 1], 1, ['A5', 'B5'], [...D1, 'A3', 'A4', 'A5', 'B3', 'B4', 'B5']) },
  goblin: { name: '고블린', points: 40, island: 'add-5', make: as(4, [1, 2], 1, ['A6', 'B6'], null) },
  golem: { name: '바위 골렘', points: 45, island: 'add-1', make: as(3, [2, 2], 1, [], null) },
  knight: { name: '검은 기사', points: 50, island: 'add-6', make: as(5, [2, 2], 2, [], null) },
  witch: { name: '마녀', points: 55, island: 'mul-1digit', make: (s) => makeMulProblem(s, { multiDigits: 2, singleFirst: createRng(s)() < 0.5, need: { carry: false } }) },
  dragon: { name: '드래곤', points: 60, island: 'mul-1digit', make: (s) => makeMulProblem(s, { multiDigits: 2, singleFirst: createRng(s)() < 0.5 }) },
  giant: { name: '거인', points: 70, island: 'add-6', make: as(5, [2, 3], 2, [], null) },
  gargoyle: { name: '가고일', points: 75, island: 'mul-1digit', make: (s) => makeMulProblem(s, { multiDigits: 2, singleFirst: createRng(s)() < 0.5, need: { carry: true } }) },
  lava: { name: '용암 골렘', points: 80, island: 'mul-1digit', make: (s) => makeMulProblem(s, { multiDigits: 3, singleFirst: createRng(s)() < 0.5 }) },
  boss: { name: '마왕', points: 100, island: 'add-6', make: as(5, [2, 3], 2, ['A5', 'A6', 'B5', 'B6'], null) },
};

/**
 * 레벨표. mix: 나오는 몬스터와 비율(무게), travel: 성까지 오는 시간(초).
 * 레벨마다 가장 약한 몬스터가 하나 빠지고 새 몬스터가 하나 들어온다(서서히 바뀐다).
 * 실물 주판으로 풀 시간을 남기려고 빠르기는 한 레벨에 조금씩만 바꾼다.
 */
export const LEVELS = [
  { mix: { slime: 3, bat: 1 }, travel: 45 },
  { mix: { slime: 1, bat: 2, mushroom: 1 }, travel: 43 },
  { mix: { bat: 1, mushroom: 2, spider: 1 }, travel: 41 },
  { mix: { mushroom: 1, spider: 2, raven: 1 }, travel: 39 },
  { mix: { spider: 1, raven: 2, zombie: 1 }, travel: 37 },
  { mix: { raven: 1, zombie: 2, skeleton: 1 }, travel: 35 },
  { mix: { zombie: 1, skeleton: 2, ghost: 1 }, travel: 33 },
  { mix: { skeleton: 1, ghost: 2, goblin: 1 }, travel: 31 },
  { mix: { ghost: 1, goblin: 2, golem: 1 }, travel: 30 },
  { mix: { goblin: 1, golem: 2, knight: 1 }, travel: 29 },
  { mix: { golem: 1, knight: 2, witch: 1 }, travel: 28 },
  { mix: { knight: 1, witch: 2, dragon: 1 }, travel: 27 },
  { mix: { witch: 1, dragon: 2, giant: 1 }, travel: 26 },
  { mix: { dragon: 1, giant: 2, gargoyle: 1 }, travel: 25 },
  { mix: { giant: 1, gargoyle: 2, lava: 1 }, travel: 24 },
  { mix: { gargoyle: 1, lava: 2, boss: 1 }, travel: 23 },
  { mix: { lava: 1, boss: 2 }, travel: 22 },
];
/** 레벨 하나에 무찌를 몬스터 수 */
export const PER_LEVEL = 10;
/** 마지막 레벨표를 넘으면 한 레벨에 1초씩 더 빨라지되 이보다 빠르지는 않다 */
export const MIN_TRAVEL = 16;
/** 시작 레벨로 고를 수 있는 가장 높은 레벨 */
export const START_LEVELS = LEVELS.length;

export const WALLS = 3;

/** 레벨의 몬스터와 빠르기 */
export function levelInfo(level) {
  const n = Math.max(1, Math.floor(level));
  if (n <= LEVELS.length) return LEVELS[n - 1];
  const last = LEVELS.at(-1);
  return { mix: last.mix, travel: Math.max(MIN_TRAVEL, last.travel - (n - LEVELS.length)) };
}

/** 지금 레벨: 시작 레벨 + 무찌른 몬스터 10마리마다 하나 */
export function levelAfter(startLevel, defeated) {
  return startLevel + Math.floor(defeated / PER_LEVEL);
}

/** 다음 몬스터가 나오기까지(초): 성까지 오는 시간의 4분의 1 */
export function spawnGap(level) {
  return levelInfo(level).travel / 4;
}

/** 레벨에 나오는 몬스터 종류(약한 것부터) */
export function typesAt(level) {
  return Object.keys(ENEMIES).filter((t) => t in levelInfo(level).mix);
}

/**
 * 몬스터 하나를 만든다. 화면에 있는 몬스터와 답이 겹치지 않게 한다(답 하나로 몬스터 하나를 무찌른다).
 * @param {number} seed 판의 시드
 * @param {number} index 몇 번째 몬스터인지(0부터)
 * @param {number} level 지금 레벨
 * @param {number} spawnAt 나오는 때(판이 시작하고 흐른 초)
 * @param {Iterable<number>} taken 화면에 있는 몬스터들의 답
 * @returns {{id: number, type: string, problem: object, answer: number, spawnAt: number, travel: number, lane: number, level: number}}
 */
export function makeEnemy(seed, index, level, spawnAt, taken = []) {
  const { mix, travel } = levelInfo(level);
  const rng = createRng(seedFrom('enemy-type', seed, index));
  const entries = Object.entries(mix);
  let pick = rng() * entries.reduce((sum, [, w]) => sum + w, 0);
  let type = entries[0][0];
  for (const [k, w] of entries) {
    if ((pick -= w) < 0) {
      type = k;
      break;
    }
  }
  const used = new Set(taken);
  let problem;
  for (let t = 0; t < 50; t++) {
    problem = ENEMIES[type].make(seedFrom('enemy', seed, index, t));
    if (!used.has(problem.answer)) break;
  }
  return { id: index, type, problem, answer: problem.answer, spawnAt, travel, lane: index % 3, level };
}

/** 몬스터의 위치: 0이면 오른쪽 끝, 1이면 성에 닿음. t는 판이 시작하고 흐른 초 */
export function positionAt(enemy, t) {
  return Math.max(0, Math.min(1, (t - enemy.spawnAt) / enemy.travel));
}

/** 답에 맞는 몬스터(화면에 나와 있고 아직 살아 있는 것 가운데 성에 가장 가까운 것) */
export function matchAnswer(alive, value, t) {
  const hits = alive.filter((e) => e.answer === value && t >= e.spawnAt);
  hits.sort((a, b) => positionAt(b, t) - positionAt(a, t));
  return hits[0] ?? null;
}

/** 무찌른 점수: 몬스터 점수 + 성에서 멀리서 무찌를수록 보너스(최대 절반) */
export function scoreFor(enemy, position) {
  const base = ENEMIES[enemy.type].points;
  return base + Math.round(base * 0.5 * (1 - position));
}

/** 다가오는 중인 몬스터 가운데 성에 닿은 것 */
export function reached(alive, t) {
  return alive.filter((e) => positionAt(e, t) >= 1);
}

/** 배경 단계: 레벨이 오를수록 어려움을 암시하는 땅으로 바뀐다(세 레벨마다 하나, 다섯 단계) */
export const STAGES = ['풀밭', '해 질 녘 들판', '메마른 땅', '어둠 동굴', '용암 땅'];
export function stageOf(level) {
  return Math.min(STAGES.length, Math.max(1, Math.ceil(level / 3)));
}
