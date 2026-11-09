// 곱셈구구 점검(곱셈 산 첫 섬). 순수 함수다.
// 한 판 20문제. 지난 판들에서 자주 틀린 단을 더 자주 낸다(무작위 보상이 아니라 연습 차례를 정하는 것).
import { createRng, randInt } from './rng.js';

export const TT_COUNT = 20;

/**
 * 단(2~9)마다 연습 무게. 최근 다섯 판에서 한 번에 못 맞힌 만큼 무거워진다.
 * @param {{lesson: string, results: {a: number, firstTry: boolean}[]}[]} rounds
 */
export function ttWeights(rounds) {
  const w = {};
  for (let a = 2; a <= 9; a++) w[a] = 1;
  const recent = rounds.filter((r) => r.lesson === 'mul-0').slice(-5);
  for (const r of recent) for (const x of r.results) if (!x.firstTry && w[x.a] !== undefined) w[x.a] += 2;
  return w;
}

/** 무게에 따라 단을 고르고, 곱하는 수(2~9)를 고른다. 같은 문제는 한 판에 두 번까지, 바로 이어서는 안 낸다 */
export function makeTTRound(seed, weights) {
  const rng = createRng(seed);
  const entries = Object.entries(weights).map(([a, w]) => [Number(a), w]);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  const problems = [];
  const used = new Map(); // 같은 문제는 한 판에 두 번까지
  while (problems.length < TT_COUNT) {
    let pick = rng() * total;
    let a = entries[0][0];
    for (const [k, w] of entries) {
      if ((pick -= w) < 0) {
        a = k;
        break;
      }
    }
    const b = randInt(rng, 2, 9);
    const key = `${a}x${b}`;
    if ((used.get(key) ?? 0) >= 2) continue;
    if (problems.at(-1)?.key === key) continue; // 바로 이어서 같은 문제는 안 낸다
    used.set(key, (used.get(key) ?? 0) + 1);
    problems.push({ kind: 'tt', key, a, b, answer: a * b, features: { a } });
  }
  return problems;
}
