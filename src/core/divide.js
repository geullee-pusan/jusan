// 주판 나눗셈: 상제법(商除法). 나눗셈 바다 "한 자리로 나누기" 섬. 순수 함수다.
// 근거: docs/research-curriculum.md 9.2·9.3절(일본 주산교육연맹 안내서 40~42쪽, Totton "Rules for Placing the
// First Quotient Number"·"Predetermining the Unit Rod", 일본어 위키백과 「そろばん」 除法).
//
// 1. 나뉠 수만 주판에 놓는다. 나누는 수는 보기만 한다.
// 2. 나뉠 수를 놓는 줄(Totton): 첫 숫자를 "나뉠 수 자릿수 − (나누는 수 자릿수 + 2)" 줄에 놓는다(일의 자리 = 0).
//    두 자리 ÷ 한 자리면 2 − 3 = −1, 곧 자리점 줄(일의 자리) 바로 오른쪽부터 놓는다.
//    그러면 몫의 일의 자리가 자리점 줄에 저절로 온다.
// 3. 몫 세우기(연맹 40~42쪽)
//    규칙 1: 나누는 수가 나뉠 수의 앞자리보다 작거나 같으면, 그 숫자 하나만 보고 몫을 두 줄 왼쪽(한 줄 건너)에 세운다.
//    규칙 2: 나누는 수가 더 크면, 두 자리를 보고 몫을 그 두 자리 바로 한 줄 왼쪽에 세운다.
// 4. 몫 × 나누는 수를 두 칸 곱으로(한 자리면 앞에 0) 몫 바로 오른쪽 두 칸에서 뺀다. 모자라면 친구수 뺄셈.
// 5. 남은 수가 있으면 다음 숫자와 함께 다시 나눈다.
//
// 이 파일은 나누는 수가 한 자리인 경우를 다룬다. 나뉠 수는 몇 자리여도 된다(지금 섬은 두 자리만 낸다).
// 두 자리로 나누기(몫 어림과 고치기)는 아직 열지 않았다.
import { subDigit } from './abacus.js';
import { createRng, randInt, seedFrom } from './rng.js';

const OFF = 4; // 내부 배열에서 일의 자리 위치(오른쪽 소수 자리 4줄을 둔다)
const at = (place) => place + OFF;

/** 나뉠 수의 첫 숫자를 놓는 줄(일의 자리 = 0, 음수는 오른쪽) */
export function dividendTopPlace(dividend, divisor) {
  return String(dividend).length - (String(divisor).length + 2);
}

/**
 * 나눗셈을 단계로 푼다(나누어떨어지는 문제와 나머지가 있는 문제 모두).
 * @param {number} dividend 나뉠 수
 * @param {number} divisor 나누는 수(2~9)
 * @returns {{
 *   dividend, divisor, quotient, remainder, topPlace, onesPlace, startState,
 *   rounds: {place, look, rule, q, quotientPlace, product, pair, padded, steps, left, leading}[]
 * }}
 *   onesPlace: 나뉠 수의 일의 자리가 놓인 줄. rounds: 나뉠 수의 숫자마다 한 번.
 *   look: 이번에 보는 수(규칙 1이면 한 자리, 규칙 2면 남은 수와 다음 숫자 두 자리)
 *   rule: 1 | 2 | 0(몫이 0이라 세우지 않음). leading: 몫이 시작되기 전(앞에서 나눌 수 없어 건너뜀)
 *   steps: 알 움직임(몫 세우기 한 단계 + 빼기). place는 화면 자리(일의 자리 = 0, 오른쪽은 음수)
 */
export function divideSteps(dividend, divisor) {
  if (!Number.isInteger(divisor) || divisor < 2 || divisor > 9) throw new Error(`나누는 수는 2~9예요: ${divisor}`);
  if (!Number.isInteger(dividend) || dividend < 10) throw new Error(`나뉠 수는 10 이상이에요: ${dividend}`);
  const digits = String(dividend).split('').map(Number);
  const topPlace = dividendTopPlace(dividend, divisor);
  const onesPlace = topPlace - digits.length + 1;
  let state = new Array(OFF + topPlace + 4).fill(0);
  digits.forEach((d, i) => (state[at(topPlace - i)] = d));
  const startState = [...state];
  const view = (s) => ({ ...s, place: s.place - OFF });
  const rounds = [];
  let started = false;
  for (let place = topPlace; place >= onesPlace; place--) {
    const left = state[at(place + 1)];
    const look = left * 10 + state[at(place)];
    const q = Math.floor(look / divisor);
    const quotientPlace = place + 2;
    const round = { place, look, left, q, quotientPlace, rule: 0, product: 0, pair: [0, 0], padded: false, steps: [], leading: !started && q === 0 };
    if (q > 0) {
      started = true;
      round.rule = left === 0 ? 1 : 2;
      const product = q * divisor;
      round.product = product;
      round.pair = [Math.floor(product / 10), product % 10];
      round.padded = product < 10;
      // 몫 세우기: 빈 줄에 q를 놓는다
      state[at(quotientPlace)] = q;
      round.steps.push({ place: quotientPlace, add: q, technique: 'Q', before: 0, after: q, quotient: true });
      // 몫 × 나누는 수를 몫 바로 오른쪽 두 칸에서 뺀다
      for (const [value, p] of [[round.pair[0], place + 1], [round.pair[1], place]]) {
        const r = subDigit(state, at(p), value);
        state = r.state;
        round.steps.push(...r.steps.map(view));
      }
    }
    round.rest = state[at(place)] + state[at(place + 1)] * 10; // 빼고 남은 수
    rounds.push(round);
  }
  let quotient = 0;
  let remainder = 0;
  state.forEach((v, i) => {
    const p = i - OFF;
    // 몫은 나뉠 수의 일의 자리에서 두 줄 왼쪽(= 일의 자리 줄)부터 왼쪽, 남은 수는 그 오른쪽 두 줄
    if (p >= onesPlace + 2) quotient += v * 10 ** (p - onesPlace - 2);
    else remainder += v * 10 ** (p - onesPlace);
  });
  if (quotient !== Math.floor(dividend / divisor) || remainder !== dividend % divisor) {
    throw new Error(`계산이 어긋났어요: ${dividend} ÷ ${divisor}`);
  }
  return { dividend, divisor, quotient, remainder, topPlace, onesPlace, startState, rounds };
}

/** 이 문제에 나온 특징(문제 고르기와 기술 칸에 쓴다) */
export function divFeatures(sol) {
  const used = sol.rounds.filter((r) => r.q > 0);
  const steps = sol.rounds.flatMap((r) => r.steps).filter((s) => !s.quotient);
  return {
    rule1: used.some((r) => r.rule === 1),
    rule2: used.some((r) => r.rule === 2),
    // 규칙 1로 세운 뒤 남은 수가 있어 다음은 규칙 2로 이어지는 문제
    carryOn: used.some((r) => r.rule === 1 && r.rest > 0),
    zeroQuotient: sol.rounds.some((r) => !r.leading && r.q === 0),
    oneDigit: String(sol.quotient).length === 1,
    borrow: steps.some((s) => s.borrow || s.friend !== undefined),
    remainder: sol.remainder > 0,
    techniques: [...new Set(steps.map((s) => s.technique))],
  };
}

/**
 * 문제 종류(한 판의 차례)
 *  rule1  규칙 1만: 앞자리부터 나누어떨어진다(84 ÷ 4처럼). 몫은 두 자리
 *  rule2  규칙 2만: 나누는 수가 앞자리보다 커서 두 자리를 본다(72 ÷ 8처럼). 몫은 한 자리
 *  mix    규칙 1로 세우고 남은 수와 다음 숫자로 규칙 2(76 ÷ 2처럼)
 *  zero   몫 가운데·끝에 0(80 ÷ 4처럼)
 */
export const DIV_TYPES = {
  rule1: (f) => f.rule1 && !f.rule2 && !f.zeroQuotient,
  rule2: (f) => f.rule2 && !f.rule1,
  mix: (f) => f.carryOn && !f.zeroQuotient,
  zero: (f) => f.zeroQuotient,
};

/** 정해진 문제 하나(강의의 예) */
export function divProblemOf(dividend, divisor) {
  const solution = divideSteps(dividend, divisor);
  return { kind: 'div', a: dividend, b: divisor, key: `${dividend}/${divisor}`, answer: solution.quotient, solution, features: divFeatures(solution) };
}

/**
 * 조건에 맞는 두 자리 ÷ 한 자리 문제(나누어떨어진다).
 * @param {number} seed
 * @param {{type: keyof DIV_TYPES, avoid?: Set<string>}} spec
 */
export function makeDivProblem(seed, { type, avoid = new Set() }) {
  const ok = DIV_TYPES[type];
  if (!ok) throw new Error(`없는 나눗셈 종류예요: ${type}`);
  const rng = createRng(seed);
  for (let attempt = 0; attempt < 5000; attempt++) {
    const divisor = randInt(rng, 2, 9);
    const quotient = randInt(rng, 2, Math.floor(99 / divisor));
    const dividend = quotient * divisor;
    if (dividend < 10) continue;
    if (quotient === 11 || LECTURE.has(`${dividend}/${divisor}`)) continue; // 33 ÷ 3처럼 너무 쉬운 것, 강의 예는 내지 않는다
    const key = `${dividend}/${divisor}`;
    if (avoid.has(key)) continue;
    const solution = divideSteps(dividend, divisor);
    const features = divFeatures(solution);
    if (!ok(features)) continue;
    return { kind: 'div', a: dividend, b: divisor, key, answer: solution.quotient, solution, features: { ...features, type } };
  }
  throw new Error(`조건에 맞는 문제를 찾지 못했어요: ${type}`);
}

/** 강의 대본에 예로 나오는 문제 */
const LECTURE = new Set(['84/4']);

/** 한 판: 규칙 1 두 문제 → 규칙 2 두 문제 → 섞어서 네 문제. 보너스는 몫에 0이 있는 문제 */
export const DIV_ROUND = ['rule1', 'rule1', 'rule2', 'rule2', 'mix', 'rule1', 'mix', 'rule2'];

export function divRound(seed) {
  const used = new Set();
  const problems = DIV_ROUND.map((type, i) => {
    const p = makeDivProblem(seedFrom('div-1', seed, i), { type, avoid: used });
    used.add(p.key);
    return p;
  });
  const bonus = makeDivProblem(seedFrom('div-1', 'bonus', seed), { type: 'zero', avoid: used });
  return { problems, bonus };
}

/**
 * 오답 짐작(선생님은 "~한 것 같아요"로 말한다).
 * @returns {{kind: 'correct'|'place'|'over'|'under'|'unknown', round?: number}}
 *   place: 몫을 세운 줄이 한 줄 밀림(10배, 10분의 1) — 규칙 1과 규칙 2를 바꿔 쓴 것 같다
 *   over/under: 몫 한 자리를 1 크게/작게 세움(round: 몇째 숫자)
 */
export function diagnoseDiv(problem, given) {
  const answer = problem.answer;
  if (given === answer) return { kind: 'correct' };
  if (given === answer * 10 || given * 10 === answer) return { kind: 'place' };
  const a = String(answer);
  const g = String(given);
  if (a.length === g.length) {
    const diffs = [...a].map((ch, i) => Number(g[i]) - Number(ch)).filter((d, i) => g[i] !== a[i]);
    const at = [...a].findIndex((ch, i) => g[i] !== ch);
    if (diffs.length === 1 && Math.abs(diffs[0]) === 1) return { kind: diffs[0] > 0 ? 'over' : 'under', digit: at };
  }
  return { kind: 'unknown' };
}
