// 덧셈·뺄셈 여러 줄 문제(덧셈·뺄셈 숲, 암산 하늘). 순수 함수다.
// 줄마다 주판에 더하거나 빼며, 어떤 기법(SPEC 4.2절 A1~A6, B1~B6)이 나오는지 판별한다.
// 섬마다 "꼭 나와야 할 기법"과 "나와도 되는 기법"을 정해 그 섬에 맞는 문제만 낸다.
import { addNumber, emptyAbacus, subNumber, toNumber } from './abacus.js';
import { createRng, randInt } from './rng.js';

/**
 * 줄들을 차례로 주판에 놓는다.
 * @param {number[]} rows 더할 수(양수)와 뺄 수(음수). 첫 줄은 양수.
 * @returns {{answer: number, columns: number, rowSteps: object[][], techniques: string[], states: number[][]}}
 */
export function simulateRows(rows, columns = 6) {
  let state = emptyAbacus(columns);
  const rowSteps = [];
  const states = [];
  for (const r of rows) {
    const res = r >= 0 ? addNumber(state, r, 0) : subNumber(state, -r, 0);
    state = res.state;
    rowSteps.push(res.steps);
    states.push(state);
  }
  const techniques = [...new Set(rowSteps.flat().map((s) => s.technique))];
  return { answer: toNumber(state), columns, rowSteps, techniques, states };
}

function randomWithDigits(rng, digits) {
  if (digits === 1) return randInt(rng, 1, 9);
  return randInt(rng, 10 ** (digits - 1), 10 ** digits - 1);
}

/**
 * 조건에 맞는 덧셈·뺄셈 문제 하나를 만든다.
 * @param {number} seed
 * @param {{rows: number, digits: [number, number], minus?: number, need?: string[], allowed?: string[]|null, avoid?: Set<string>}} spec
 *   rows: 줄 수, digits: 한 줄의 자릿수 범위, minus: 빼는 줄 수(첫 줄 빼고),
 *   need: 이 가운데 하나는 꼭 나와야 할 기법, allowed: 나와도 되는 기법(없으면 모두)
 */
export function makeAddSubProblem(seed, { rows, digits, minus = 0, need = [], allowed = null, avoid = new Set() }) {
  const rng = createRng(seed);
  for (let attempt = 0; attempt < 20000; attempt++) {
    // 빼는 줄 자리를 고른다(첫 줄은 늘 더하기)
    const minusAt = new Set();
    while (minusAt.size < minus) minusAt.add(randInt(rng, 1, rows - 1));
    const list = [];
    let total = 0;
    let ok = true;
    for (let i = 0; i < rows; i++) {
      const d = randInt(rng, digits[0], digits[1]);
      let v = randomWithDigits(rng, d);
      if (minusAt.has(i)) {
        if (total < 1) {
          ok = false;
          break;
        }
        if (v > total) v = randInt(rng, 1, total); // 중간 합이 0보다 작아지지 않게
        list.push(-v);
        total -= v;
      } else {
        list.push(v);
        total += v;
      }
    }
    if (!ok || total < 0) continue;
    const key = list.join(',');
    if (avoid.has(key)) continue;
    const sim = simulateRows(list);
    if (allowed && sim.techniques.some((t) => !allowed.includes(t))) continue;
    if (need.length && !sim.techniques.some((t) => need.includes(t))) continue;
    return { kind: 'addsub', key, rows: list, answer: sim.answer, sim, features: { techniques: sim.techniques } };
  }
  throw new Error(`조건에 맞는 덧셈·뺄셈 문제를 찾지 못했어요: ${JSON.stringify({ rows, digits, minus, need, allowed })}`);
}

/**
 * 오답 짐작(덧셈·뺄셈). 선생님은 "~한 것 같아요"라고 말한다.
 * @returns {{kind: 'correct'|'sign'|'skip'|'carry'|'five'|'unknown'}}
 */
export function diagnoseAddSub(problem, given) {
  const { answer, rows } = problem;
  if (given === answer) return { kind: 'correct' };
  if (rows.some((r) => r < 0 && given === answer - 2 * r)) return { kind: 'sign' }; // 빼기를 더하기로
  if (rows.slice(1).some((r) => given === answer - r)) return { kind: 'skip' }; // 한 줄을 빠뜨림
  const diff = Math.abs(given - answer);
  for (let k = 1; k <= 6; k++) {
    if (diff === 10 ** k) return { kind: 'carry' };
    if (diff === 5 * 10 ** (k - 1)) return { kind: 'five' };
  }
  return { kind: 'unknown' };
}
