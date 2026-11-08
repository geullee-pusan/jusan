// 주판 모델과 덧셈 기법 판별(docs/SPEC.md 4.1~4.2절). 순수 함수다.
//
// 주판 상태는 자리별 값(0~9)의 배열이다. 0번이 일의 자리, 1번이 십의 자리 …
// 한 자리 값 v는 윗알 u(0·1)와 아래알 l(0~4)로 나타낸다: v = 5u + l.
//
// 덧셈 기법(SPEC 4.2절)
//  A1 바로 넣기(1짜리 알)        A2 바로 넣기(5짜리 알 함께)
//  A3 5의 짝 덧셈                A4 친구수 덧셈(앞자리로 1 올리고 친구수 빼기)
//  A5 친구수와 5의 짝 함께        A6 이어서 받아올리기(올린 앞자리가 또 넘침)
// 뺄셈(B1~B6)은 덧셈 단계(Phase 1)에서 더한다.

export const TECHNIQUES = {
  A1: '바로 넣기',
  A2: '5짜리 알과 함께 바로 넣기',
  A3: '5의 짝 덧셈',
  A4: '친구수 덧셈',
  A5: '친구수와 5의 짝 함께',
  A6: '이어서 받아올리기',
};

/** 한 자리 값을 알로 */
export function beads(v) {
  if (!Number.isInteger(v) || v < 0 || v > 9) throw new Error(`한 자리 값이 아니에요: ${v}`);
  return { upper: v >= 5 ? 1 : 0, lower: v % 5 };
}

/** 숫자를 주판 상태로. columns: 자리 수 */
export function fromNumber(n, columns) {
  if (!Number.isInteger(n) || n < 0) throw new Error(`0 이상의 정수만 놓아요: ${n}`);
  const state = [];
  let rest = n;
  for (let i = 0; i < columns; i++) {
    state.push(rest % 10);
    rest = Math.floor(rest / 10);
  }
  if (rest > 0) throw new Error(`${n}은 ${columns}자리 주판에 다 놓을 수 없어요`);
  return state;
}

/** 주판 상태를 숫자로 */
export function toNumber(state) {
  return state.reduceRight((acc, v) => acc * 10 + v, 0);
}

/** 빈 주판 */
export function emptyAbacus(columns) {
  return new Array(columns).fill(0);
}

/**
 * place 자리에 d(1~9)를 더한다. 받아올림까지 한다.
 * @returns {{state: number[], steps: object[]}}
 *   steps: 알을 움직인 차례. { place, add, technique, before, after }
 *   add는 그 자리에 실제로 더하거나(+) 뺀(-) 값. 받아올림은 앞자리에 +1 하는 단계로 따로 적는다.
 */
export function addDigit(stateIn, place, d) {
  if (!Number.isInteger(d) || d < 0 || d > 9) throw new Error(`더할 수는 0~9예요: ${d}`);
  const state = [...stateIn];
  const steps = [];
  if (d === 0) return { state, steps };
  addAt(state, place, d, steps, false);
  return { state, steps };
}

function addAt(state, place, d, steps, isCarry) {
  if (place >= state.length) throw new Error('주판 자리가 모자라요');
  const v = state[place];
  const { upper, lower } = beads(v);
  if (v + d <= 9) {
    let technique;
    if (d >= 5) technique = 'A2';
    else if (lower + d <= 4) technique = 'A1';
    else technique = 'A3';
    state[place] = v + d;
    steps.push({ place, add: d, technique, before: v, after: v + d, carry: isCarry });
    return;
  }
  // 넘친다: 앞자리로 1을 올리고, 이 자리에서 친구수(10 - d)를 뺀다(강의 순서).
  const friend = 10 - d;
  // 친구수가 4 이하인데 아래알이 모자라면(윗알만 있으면) 5의 짝으로 빼야 한다.
  let technique = friend <= 4 && lower < friend ? 'A5' : 'A4';
  // 받아올린 1 때문에 또 넘치면 "이어서 받아올리기"다.
  if (isCarry) technique = 'A6';
  addAt(state, place + 1, 1, steps, true);
  state[place] = v - friend;
  steps.push({ place, add: d, friend, technique, before: v, after: v - friend, carry: isCarry, upper });
}

/**
 * 여러 자리 수 n을 place 자리부터(n의 일의 자리가 place) 더한다. 앞자리부터 놓는다.
 * @returns {{state: number[], steps: object[]}}
 */
export function addNumber(stateIn, n, place = 0) {
  let state = [...stateIn];
  const steps = [];
  const digits = String(n).split('').map(Number);
  digits.forEach((d, i) => {
    const at = place + digits.length - 1 - i;
    const r = addDigit(state, at, d);
    state = r.state;
    steps.push(...r.steps);
  });
  return { state, steps };
}

/** 단계들에 나온 기법 모음(겹치지 않게) */
export function techniquesOf(steps) {
  return [...new Set(steps.map((s) => s.technique))];
}
