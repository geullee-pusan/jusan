// 주판 나눗셈: 상제법(商除法). 나눗셈 바다의 세 섬(한 자리로 나누기, 큰 수 나누기, 두 자리로 나누기). 순수 함수다.
// 근거: docs/research-curriculum.md 9.2·9.3절(일본 주산교육연맹 안내서 40~53쪽, Totton "Rules for Placing the
// First Quotient Number"·"Predetermining the Unit Rod", 일본어 위키백과 「そろばん」 除法).
//
// 1. 나뉠 수만 주판에 놓는다. 나누는 수는 보기만 한다.
// 2. 나뉠 수를 놓는 줄(Totton): 첫 숫자를 "나뉠 수 자릿수 − (나누는 수 자릿수 + 2)" 줄에 놓는다(일의 자리 = 0).
//    두 자리 ÷ 한 자리면 2 − 3 = −1, 곧 자리점 줄(일의 자리) 바로 오른쪽부터 놓는다.
//    그러면 몫의 일의 자리가 자리점 줄에 저절로 온다.
// 3. 몫 세우기(연맹 40~42쪽, 45~48쪽)
//    규칙 1: 나누는 수가 나뉠 수의 앞자리(나누는 수와 같은 자릿수)보다 작거나 같으면, 몫을 두 줄 왼쪽(한 줄 건너)에 세운다.
//    규칙 2: 나누는 수가 더 크면, 한 자리 더 보고 몫을 바로 한 줄 왼쪽에 세운다.
// 4. 몫 × 나누는 수를 두 칸 곱으로(한 자리면 앞에 0) 몫 바로 오른쪽 두 칸에서 뺀다. 모자라면 친구수 뺄셈.
//    나누는 수가 두 자리면 몫 × 앞자리를 몫 바로 오른쪽 두 칸에서, 몫 × 뒷자리를 한 칸 오른쪽 두 칸에서 뺀다(연맹 45쪽 86÷43).
// 5. 두 자리로 나눌 때는 나누는 수의 앞자리로 "임시 몫"을 어림해 세운다. 뒤의 곱을 뺄 수 없으면
//    몫을 하나 줄이고, 앞에서 뺀 것을 한 번만큼 도로 더한다(연맹 49~52쪽 125÷25, 85÷17, 729÷27).
//    어림이 10 이상이면 바로 9를 세운다(연맹 52쪽 3,192÷38).
// 6. 남은 수가 있으면 다음 숫자와 함께 다시 나눈다. 몫이 끝날 때까지 되풀이한다.
import { addDigit, subDigit } from './abacus.js';
import { createRng, randInt, seedFrom } from './rng.js';

const OFF = 5; // 내부 배열에서 일의 자리 위치(오른쪽 소수 자리 5줄을 둔다)
const at = (place) => place + OFF;
const digitsOf = (n) => String(n).split('').map(Number);

/** 나뉠 수의 첫 숫자를 놓는 줄(일의 자리 = 0, 음수는 오른쪽) */
export function dividendTopPlace(dividend, divisor) {
  return String(dividend).length - (String(divisor).length + 2);
}

/**
 * 나눗셈을 단계로 푼다(나누어떨어지는 문제와 나머지가 있는 문제 모두).
 * @param {number} dividend 나뉠 수
 * @param {number} divisor 나누는 수(2~9 또는 10~99)
 * @returns {{
 *   dividend, divisor, divisorDigits, quotient, remainder, topPlace, onesPlace,
 *   rounds: {place, quotientPlace, look, left, front, top2, est, capped, rule, q, product, pair, padded, rest, leading, actions, steps}[]
 * }}
 *   rounds: 몫 한 자리마다 한 번(몫 자리 = quotientPlace). look: 이번에 보는 수(남은 수와 다음 숫자들).
 *   rule: 1 | 2 | 0(몫이 0이라 세우지 않음). leading: 몫이 시작되기 전(앞에서 나눌 수 없어 건너뜀).
 *   est: 처음 세운 몫(한 자리로 나누면 바로 맞는 몫, 두 자리로 나누면 임시 몫).
 *   actions: 차례대로 { type: 'set'|'sub'|'cant'|'revise', ... , steps }.
 *   steps: 알 움직임 모두. place는 화면 자리(일의 자리 = 0, 오른쪽은 음수)
 */
export function divideSteps(dividend, divisor) {
  const dd = digitsOf(divisor);
  const m = dd.length;
  if (!Number.isInteger(divisor) || divisor < 2 || divisor > 99) throw new Error(`나누는 수는 2~99예요: ${divisor}`);
  if (!Number.isInteger(dividend) || dividend < 10 || dividend > 99999) throw new Error(`나뉠 수는 10~99999예요: ${dividend}`);
  const digits = digitsOf(dividend);
  const topPlace = dividendTopPlace(dividend, divisor);
  const onesPlace = topPlace - digits.length + 1;
  let state = new Array(OFF + topPlace + 5).fill(0);
  digits.forEach((d, i) => (state[at(topPlace - i)] = d));
  const view = (s) => ({ ...s, place: s.place - OFF });
  // 몫 자리 Q에서 본 수: Q−1부터 오른쪽으로 m+1줄(맨 앞 줄은 남은 수 자리)
  const windowAt = (Q, len) => {
    let v = 0;
    for (let t = 0; t < len; t++) v = v * 10 + state[at(Q - 1 - t)];
    return v;
  };
  const rounds = [];
  let started = false;
  for (let Q = topPlace + 2; Q >= 0; Q--) {
    const look = windowAt(Q, m + 1);
    const left = state[at(Q - 1)];
    const trueQ = Math.floor(look / divisor);
    const top2 = left * 10 + state[at(Q - 2)];
    const rawEst = m === 1 ? trueQ : Math.floor(top2 / dd[0]);
    const round = {
      place: Q - 2, quotientPlace: Q, look, left, front: Math.floor(look / 10), top2,
      est: 0, capped: false, rule: 0, q: 0, product: 0, pair: [0, 0], padded: false, rest: 0,
      leading: !started && trueQ === 0, actions: [], steps: [],
    };
    if (trueQ > 0) {
      started = true;
      round.rule = left === 0 ? 1 : 2;
      let q = Math.min(9, rawEst);
      round.est = q;
      round.capped = rawEst > 9;
      // 몫(또는 임시 몫) 세우기
      state[at(Q)] = q;
      const setStep = { place: Q, add: q, technique: 'Q', before: 0, after: q, quotient: true };
      round.actions.push({ type: 'set', q, steps: [setStep] });
      let k = 0;
      while (k < m) {
        const product = q * dd[k];
        const pair = [Math.floor(product / 10), product % 10];
        const tens = Q - 1 - k;
        // 지금 뺄 수 있는가: Q−1부터 이 곱의 일의 칸까지의 수가 곱보다 작지 않아야 한다
        if (windowAt(Q, k + 2) >= product) {
          const steps = [];
          for (const [value, p] of [[pair[0], tens], [pair[1], tens - 1]]) {
            const r = subDigit(state, at(p), value);
            state = r.state;
            steps.push(...r.steps.map(view));
          }
          round.actions.push({ type: 'sub', k, q, digit: dd[k], product, pair, padded: product < 10, tens, steps });
          k++;
        } else {
          // 뺄 수 없다: 임시 몫이 크다. 몫을 하나 줄이고, 앞에서 뺀 곱을 한 번만큼 도로 더한다
          round.actions.push({ type: 'cant', k, q, digit: dd[k], product, steps: [] });
          const steps = [{ place: Q, add: -1, technique: 'Q', before: q, after: q - 1, quotient: true }];
          state[at(Q)] = q - 1;
          for (let j = 0; j < k; j++) {
            const r = addDigit(state, at(Q - 2 - j), dd[j]);
            state = r.state;
            steps.push(...r.steps.map(view));
          }
          round.actions.push({ type: 'revise', k, from: q, to: q - 1, back: Number(dd.slice(0, k).join('')), steps });
          q -= 1;
        }
      }
      round.q = q;
      if (q !== trueQ) throw new Error(`몫 고치기가 어긋났어요: ${dividend} ÷ ${divisor}`);
      round.product = q * divisor;
      round.pair = [Math.floor(round.product / 10), round.product % 10];
      round.padded = m === 1 && round.product < 10;
    }
    round.steps = round.actions.flatMap((a) => a.steps);
    round.rest = windowAt(Q, m + 1);
    rounds.push(round);
  }
  let quotient = 0;
  let remainder = 0;
  state.forEach((v, i) => {
    const p = i - OFF;
    // 몫은 일의 자리 줄(0)부터 왼쪽, 남은 수는 그 오른쪽
    if (p >= 0) quotient += v * 10 ** p;
    else remainder += v * 10 ** (p - onesPlace);
  });
  if (quotient !== Math.floor(dividend / divisor) || remainder !== dividend % divisor) {
    throw new Error(`계산이 어긋났어요: ${dividend} ÷ ${divisor}`);
  }
  return { dividend, divisor, divisorDigits: dd, quotient, remainder, topPlace, onesPlace, rounds };
}

/** 이 문제에 나온 특징(문제 고르기와 기술 칸에 쓴다) */
export function divFeatures(sol) {
  const used = sol.rounds.filter((r) => r.q > 0);
  const steps = sol.rounds.flatMap((r) => r.steps).filter((s) => !s.quotient);
  return {
    rule1: used.some((r) => r.rule === 1),
    rule2: used.some((r) => r.rule === 2),
    first: used[0]?.rule ?? 0,
    // 규칙 1로 세운 뒤 남은 수가 있어 다음은 규칙 2로 이어지는 문제
    carryOn: used.some((r) => r.rule === 1 && r.rest > 0),
    zeroQuotient: sol.rounds.some((r) => !r.leading && r.q === 0),
    oneDigit: String(sol.quotient).length === 1,
    qDigits: String(sol.quotient).length,
    dividendDigits: String(sol.dividend).length,
    divisorDigits: sol.divisorDigits.length,
    borrow: steps.some((s) => s.sub !== undefined && s.friend !== undefined),
    revise: sol.rounds.some((r) => r.actions.some((a) => a.type === 'revise')),
    remainder: sol.remainder > 0,
    techniques: [...new Set(steps.map((s) => s.technique))],
  };
}

/** 정해진 문제 하나(강의의 예) */
export function divProblemOf(dividend, divisor) {
  const solution = divideSteps(dividend, divisor);
  return { kind: 'div', a: dividend, b: divisor, key: `${dividend}/${divisor}`, answer: solution.quotient, solution, features: divFeatures(solution) };
}

/**
 * 한 자리로 나누기(두 자리 ÷ 한 자리)의 문제 종류
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

/** 강의 대본에 예로 나오는 문제(판에는 내지 않는다) */
const LECTURE = new Set(['84/4', '93/3', '134/2', '618/3', '86/43', '192/32', '125/25', '276/23', '729/27']);

/** 몫이 11, 111처럼 같은 숫자만 되풀이되면 너무 쉽다 */
const boring = (q) => q >= 10 && new Set(String(q)).size === 1;

/**
 * 조건에 맞는 문제 하나(나누어떨어진다).
 * @param {number} seed
 * @param {{type?: keyof DIV_TYPES, digits?: number, divisorDigits?: 1|2, qDigits?: number, first?: 1|2,
 *          zero?: boolean, borrow?: boolean, revise?: boolean, avoid?: Set<string>}} spec
 *   type가 있으면 한 자리로 나누기(두 자리 ÷ 한 자리)의 종류. 없으면 나머지 값으로 고른다
 *   (digits: 나뉠 수 자릿수, 빠진 값은 상관없음, 불 값은 true면 꼭 있고 false면 없음).
 */
export function makeDivProblem(seed, spec) {
  const { type, digits = 2, divisorDigits = 1, avoid = new Set() } = spec;
  const ok = type ? DIV_TYPES[type] : (f) =>
    (spec.qDigits === undefined || f.qDigits === spec.qDigits)
    && (spec.first === undefined || f.first === spec.first)
    && ['zero', 'borrow', 'revise'].every((k) => spec[k] === undefined || f[k === 'zero' ? 'zeroQuotient' : k] === spec[k]);
  if (type && !ok) throw new Error(`없는 나눗셈 종류예요: ${type}`);
  const rng = createRng(seed);
  for (let attempt = 0; attempt < 20000; attempt++) {
    const divisor = divisorDigits === 1 ? randInt(rng, 2, 9) : randInt(rng, 11, 99);
    if (type) {
      // 한 자리로 나누기는 처음 연 때(2026-11-12)와 같은 차례로 뽑는다: 같은 시드면 언제나 같은 문제
      const quotient = randInt(rng, 2, Math.floor(99 / divisor));
      const dividend = quotient * divisor;
      const key = `${dividend}/${divisor}`;
      if (dividend < 10 || quotient === 11 || key === '84/4' || avoid.has(key)) continue;
      const solution = divideSteps(dividend, divisor);
      const features = divFeatures(solution);
      if (!ok(features)) continue;
      return { kind: 'div', a: dividend, b: divisor, key, answer: solution.quotient, solution, features: { ...features, type } };
    }
    if (divisor % 10 === 0) continue;
    const lo = Math.max(2, Math.ceil(10 ** (digits - 1) / divisor));
    const hi = Math.floor((10 ** digits - 1) / divisor);
    if (lo > hi) continue;
    const quotient = randInt(rng, lo, hi);
    const dividend = quotient * divisor;
    const key = `${dividend}/${divisor}`;
    if (boring(quotient) || LECTURE.has(key) || avoid.has(key)) continue;
    const solution = divideSteps(dividend, divisor);
    const features = divFeatures(solution);
    if (!ok(features)) continue;
    return { kind: 'div', a: dividend, b: divisor, key, answer: solution.quotient, solution, features: { ...features, type: type ?? null } };
  }
  throw new Error(`조건에 맞는 문제를 찾지 못했어요: ${JSON.stringify({ ...spec, avoid: undefined })}`);
}

/** 한 자리로 나누기 한 판: 규칙 1 두 문제 → 규칙 2 두 문제 → 섞어서 네 문제. 보너스는 몫에 영이 있는 문제 */
export const DIV_ROUND = ['rule1', 'rule1', 'rule2', 'rule2', 'mix', 'rule1', 'mix', 'rule2'];

export function divRound(seed) {
  return divRoundFrom('div-1', DIV_ROUND.map((type) => ({ type })), { type: 'zero' }, seed);
}

/** 대본에 적힌 문제 차례(specs)로 한 판을 만든다(큰 수 나누기, 두 자리로 나누기) */
export function divRoundFrom(id, specs, bonusSpec, seed) {
  const used = new Set();
  const problems = specs.map((spec, i) => {
    const p = makeDivProblem(seedFrom(id, seed, i), { ...spec, avoid: used });
    used.add(p.key);
    return p;
  });
  const bonus = bonusSpec ? makeDivProblem(seedFrom(id, 'bonus', seed), { ...bonusSpec, avoid: used }) : null;
  return { problems, bonus };
}

/**
 * 오답 짐작(선생님은 "~한 것 같아요"로 말한다).
 * @returns {{kind: 'correct'|'place'|'over'|'under'|'unknown', digit?: number}}
 *   place: 몫을 세운 줄이 한 줄 밀림(10배, 10분의 1) — 규칙 1과 규칙 2를 바꿔 쓴 것 같다
 *   over/under: 몫 한 자리를 크게/작게 세움(digit: 몇째 숫자). 두 자리로 나눌 때는 임시 몫을 고치지 않은 것 같다
 */
export function diagnoseDiv(problem, given) {
  const answer = problem.answer;
  if (given === answer) return { kind: 'correct' };
  if (given === answer * 10 || given * 10 === answer) return { kind: 'place' };
  const a = String(answer);
  const g = String(given);
  if (a.length === g.length) {
    const at = [...a].map((ch, i) => (g[i] !== ch ? i : -1)).filter((i) => i >= 0);
    if (at.length === 1) {
      const diff = Number(g[at[0]]) - Number(a[at[0]]);
      const limit = problem.b >= 10 ? 9 : 1; // 한 자리로 나눌 때는 하나 차이만 그렇게 본다
      if (Math.abs(diff) <= limit) return { kind: diff > 0 ? 'over' : 'under', digit: at[0] };
    }
  }
  return { kind: 'unknown' };
}
