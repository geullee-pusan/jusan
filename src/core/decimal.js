// 자리점 성 "소수" 섬. 순수 함수다.
// 근거: docs/research-curriculum.md 9.4절.
//  - 일의 자리 줄(아이 주판의 12째 줄, 점 있음)의 오른쪽 줄들이 소수 자리다(연맹 4쪽, Totton "Unit Rod").
//  - 소수 덧셈·뺄셈은 수마다 일의 자리를 같은 줄에 맞춰 놓는다. 그러면 소수점이 저절로 맞는다
//    (Totton Addition 8.9 + 56 = 64.9, 45.7 + 4.5 = 50.2, Subtraction 22.3 − 2.8 = 19.5).
//  - 그다음은 덧셈·뺄셈 기법(SPEC 4.2절)을 그대로 쓴다.
// 계산은 늘 정수로 한다: 소수 자릿수 D만큼 10^D를 곱한 "줄 값"으로 놓고, 화면 자리는 D만큼 오른쪽으로 옮긴다.
// 문제 종류
//  read    화면 주판에 놓인 소수를 읽는다(답: 그 수)
//  addsub  소수 여러 줄 더하고 빼기(답: 계산 결과)
import { diagnoseAddSub, simulateRows } from './addsub.js';
import { createRng, randInt, seedFrom } from './rng.js';

const pow = (d) => 10 ** d;

/** 줄 값(정수)과 소수 자릿수로 수: (325, 2) → 3.25 */
export function fromScaled(scaled, dp) {
  return Number((scaled / pow(dp)).toFixed(dp));
}

/** 수의 소수 자릿수: 3.25 → 2, 8 → 0 */
export function decimalsOf(n) {
  const s = String(Number(Number(n).toFixed(6)));
  return s.includes('.') ? s.split('.')[1].length : 0;
}

/** 수를 줄 값으로: (3.25, 2) → 325 */
export function toScaled(n, dp) {
  return Math.round(n * pow(dp));
}

/** 한 줄의 수: 정수 부분 자릿수 intDigits(0이면 0.x), 소수 자릿수 dp */
function makeValue(rng, { intDigits, dp, zero }) {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const head = intDigits === 0 ? 0 : randInt(rng, pow(intDigits - 1), pow(intDigits) - 1);
    const frac = dp === 0 ? 0 : randInt(rng, 1, pow(dp) - 1);
    if (dp > 0 && frac % 10 === 0) continue; // 3.50처럼 끝이 0인 소수는 내지 않는다
    const scaled = head * pow(dp) + frac;
    const s = String(scaled).padStart(dp + 1, '0');
    const hasZero = intDigits === 0 || s.slice(0, -1).includes('0');
    if (zero !== undefined && hasZero !== zero) continue;
    return fromScaled(scaled, dp);
  }
  throw new Error(`소수를 만들지 못했어요: ${intDigits} ${dp}`);
}

/**
 * 읽기 문제.
 * @param {{intDigits: number, dp: 1|2, zero?: boolean}} spec zero: 0.6, 4.05처럼 영이 들어가는 수
 */
export function makeReadProblem(seed, { intDigits, dp, zero, avoid = new Set() }) {
  const rng = createRng(seed);
  for (let attempt = 0; attempt < 2000; attempt++) {
    const value = makeValue(rng, { intDigits, dp, zero });
    const key = `read:${value}`;
    if (avoid.has(key)) continue;
    return { kind: 'decimal', type: 'read', value, dp, scaled: toScaled(value, dp), key, answer: value, features: { type: 'read', dp, zero: !!zero } };
  }
  throw new Error('읽기 문제를 만들지 못했어요');
}

/** 여러 줄 소수 문제를 푼다(줄 값으로 계산) */
export function solveRows(rows) {
  const D = Math.max(...rows.map(decimalsOf));
  const scaledRows = rows.map((r) => toScaled(r, D));
  const sim = simulateRows(scaledRows, 9);
  return { D, scaledRows, sim, answer: fromScaled(sim.answer, D) };
}

/**
 * 덧셈·뺄셈 문제.
 * @param {{rows: {intDigits: number, dp: number}[], minus?: number[], mixed?: boolean, carry?: boolean}} spec
 *   rows: 줄마다 크기, minus: 빼는 줄 번호(첫 줄 빼고), carry: 친구수(올림·빌림)가 꼭 있음(true)·없음(false)
 */
export function makeAddSubDecimal(seed, { rows, minus = [], carry, avoid = new Set() }) {
  const rng = createRng(seed);
  for (let attempt = 0; attempt < 5000; attempt++) {
    const values = rows.map((r) => makeValue(rng, r));
    const signed = values.map((v, i) => (minus.includes(i) ? -v : v));
    let solved;
    try {
      solved = solveRows(signed);
    } catch {
      continue; // 빼다가 주판 값이 모자라면(음수) 다시
    }
    const { D, scaledRows, sim, answer } = solved;
    const hasCarry = sim.rowSteps.flat().some((s) => ['A4', 'A5', 'A6', 'B4', 'B5', 'B6'].includes(s.technique));
    if (carry !== undefined && hasCarry !== carry) continue;
    if (answer <= 0) continue;
    const key = `rows:${signed.join(',')}`;
    if (avoid.has(key)) continue;
    const mixed = new Set(signed.map(decimalsOf)).size > 1;
    return {
      kind: 'decimal', type: 'addsub', rows: signed, D, scaledRows, sim, key, answer,
      features: { type: 'addsub', mixed, carry: hasCarry, minus: minus.length > 0, techniques: sim.techniques },
    };
  }
  throw new Error(`소수 덧셈·뺄셈 문제를 만들지 못했어요: ${JSON.stringify(rows)}`);
}

/** 대본에 적힌 문제 차례(specs)로 한 판을 만든다 */
export function decimalRound(id, specs, bonusSpec, seed) {
  const used = new Set();
  const make = (spec, s) => (spec.type === 'read' ? makeReadProblem(s, { ...spec, avoid: used }) : makeAddSubDecimal(s, { ...spec, avoid: used }));
  const problems = specs.map((spec, i) => {
    const p = make(spec, seedFrom(id, seed, i));
    used.add(p.key);
    return p;
  });
  const bonus = bonusSpec ? make(bonusSpec, seedFrom(id, 'bonus', seed)) : null;
  return { problems, bonus };
}

/** 정해진 덧셈·뺄셈 문제(강의의 예) */
export function addSubDecimalOf(rows) {
  const { D, scaledRows, sim, answer } = solveRows(rows);
  const mixed = new Set(rows.map(decimalsOf)).size > 1;
  return { kind: 'decimal', type: 'addsub', rows, D, scaledRows, sim, key: `rows:${rows.join(',')}`, answer, features: { type: 'addsub', mixed, carry: false, minus: rows.some((r) => r < 0), techniques: sim.techniques } };
}

/** 정해진 읽기 문제(강의의 예) */
export function readDecimalOf(value) {
  const dp = decimalsOf(value);
  return { kind: 'decimal', type: 'read', value, dp, scaled: toScaled(value, dp), key: `read:${value}`, answer: value, features: { type: 'read', dp, zero: false } };
}

/**
 * 오답 짐작(선생님은 "~한 것 같아요"로 말한다).
 * @returns {{kind: 'correct'|'shift'|'zero-drop'|'align'|'sign'|'skip'|'carry'|'five'|'unknown'}}
 *   shift: 일의 자리를 한 줄 옆으로 봄(10배, 10분의 1)
 *   zero-drop: 영(빈 줄)을 빠뜨림(4.05 → 4.5)
 *   align: 소수점을 맞추지 않고 끝자리끼리 맞춰 더함(3.5 + 1.25를 35 + 125처럼)
 */
export function diagnoseDecimal(problem, given) {
  if (typeof given !== 'number' || !Number.isFinite(given)) return { kind: 'unknown' };
  const D = problem.type === 'read' ? problem.dp : problem.D;
  const g = toScaled(given, Math.max(D, decimalsOf(given)));
  const ans = toScaled(problem.answer, Math.max(D, decimalsOf(given)));
  if (g === ans) return { kind: 'correct' };
  const near = (x, y) => Math.abs(x - y) < 1e-9;
  if (near(given, problem.answer * 10) || near(given * 10, problem.answer)) return { kind: 'shift' };
  if (problem.type === 'read') {
    const s = String(problem.value);
    const [i, f = ''] = s.split('.');
    const dropped = Number(`${i}.${f.replace(/0/g, '')}`);
    if (dropped !== problem.value && near(given, dropped)) return { kind: 'zero-drop' };
    return { kind: 'unknown' };
  }
  // 끝자리끼리 맞춘 셈: 줄마다 소수점을 지우고 정수로 더한 것을 가장 긴 소수 자릿수로 읽는다
  const digitsOnly = problem.rows.map((r) => Math.sign(r) * Number(String(Math.abs(r)).replace('.', '')));
  const misaligned = fromScaled(digitsOnly.reduce((a, b) => a + b, 0), problem.D);
  if (!near(misaligned, problem.answer) && near(given, misaligned)) return { kind: 'align' };
  // 그 밖에는 정수 덧셈·뺄셈의 짐작을 줄 값으로 한다
  const scaledGiven = toScaled(given, problem.D);
  if (!near(fromScaled(scaledGiven, problem.D), given)) return { kind: 'unknown' };
  const d = diagnoseAddSub({ rows: problem.scaledRows, answer: toScaled(problem.answer, problem.D) }, scaledGiven);
  return { kind: d.kind === 'correct' ? 'unknown' : d.kind };
}
