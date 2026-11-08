// 1강(한 자리 곱셈) 수업 만들기(docs/SPEC.md 7~8장). 순수 함수다.
// 수업은 "부분"들의 목록이다. 부분은 장면 목록이거나, 답을 들어야 이어지는 확인 부분이다.
//
// 장면 종류(화면 src/ui/player.js가 재생한다)
//  say            대사 { text, pose }
//  board-problem  칠판에 문제 하나 { a, b }
//  board-list     칠판에 문제 여러 개 { items: [{ no, a, b }] }
//  abacus-clear   화면 주판 털기 { columns, start }
//  abacus-steps   화면 주판에 알 움직이기 { steps, tensPlace, onesPlace }
//  wait           아이가 "다 했어요" 할 때까지 { prompt }
//  nod, fall      끄덕이기, 쓰러지기
import { diagnoseMul } from './muldiagnose.js';
import { lessonProblems } from './mulproblems.js';
import { readNumber } from './numread.js';
import { hasBatchim, placeName } from './korean.js';
import { createRng, seedFrom } from './rng.js';

const COUNT = ['', '한', '두', '세', '네', '다섯', '여섯'];
/** 차례: "이번"처럼 다른 뜻으로 들리지 않게 "두 번째"로 읽는다 */
const ORDINAL = ['', '첫 번째', '두 번째', '세 번째', '네 번째'];

/** 숫자 칸 읽기: 8 → "팔", 0 → "영" */
const read = (n) => readNumber(n);

/**
 * 대사 틀을 채운다. {이름}은 값, {이름은}처럼 조사를 붙이면 받침에 맞춰 고른다.
 * 쓸 수 있는 조사: 은/는, 을/를, 이/가, 이에요/예요(모두 받침 있는 쪽으로 적는다).
 */
export function fill(template, vars) {
  return template.replace(/\{(\w+)(은|는|을|를|이에요|예요|이|가)?\}/g, (_, name, particle) => {
    if (!(name in vars)) throw new Error(`대사 틀에 없는 값이에요: ${name}`);
    const value = String(vars[name]);
    if (!particle) return value;
    const b = hasBatchim(value);
    const pick = { 은: ['은', '는'], 는: ['은', '는'], 을: ['을', '를'], 를: ['을', '를'], 이에요: ['이에요', '예요'], 예요: ['이에요', '예요'], 이: ['이', '가'], 가: ['이', '가'] }[particle];
    return value + (b ? pick[0] : pick[1]);
  });
}

function line(script, key, seed, vars = {}, pose = 'talk') {
  const list = script.lines[key];
  if (!list) throw new Error(`대사가 없어요: ${key}`);
  const pick = list[Math.floor(createRng(seedFrom(key, seed))() * list.length)];
  return { kind: 'say', key, text: fill(pick, vars), pose };
}

/** 문제 하나를 화면 주판으로 풀어 보인다(같이 풀기, 틀렸을 때 다시 놓기). */
export function solveScenes(script, problem, seed, { explainOrder = false } = {}) {
  const sol = problem.solution;
  const scenes = [
    { kind: 'board-problem', a: sol.a, b: sol.b },
    line(script, 'problem', seed, { a: read(sol.a), b: read(sol.b) }),
    { kind: 'abacus-clear', columns: sol.columns, start: sol.startPlace },
    line(script, 'clear', seed),
    line(script, 'digits', seed, {
      da: COUNT[String(sol.a).length], db: COUNT[String(sol.b).length], dt: COUNT[sol.digits], start: placeName(sol.startPlace),
    }),
  ];
  if (explainOrder) scenes.push(line(script, 'order', seed));
  sol.products.forEach((p, i) => {
    scenes.push(line(script, 'mul', seed + i, { single: read(sol.single), digit: read(p.digit), product: read(p.product) }, 'demo'));
    if (p.product === 0) scenes.push(line(script, 'zero', seed, {}, 'demo'));
    else if (p.padded) scenes.push(line(script, 'pad', seed, { pair: `영${read(p.product)}` }, 'demo'));
    if (i === 0 && explainOrder) scenes.push(line(script, 'put', seed, { tens: placeName(p.tensPlace), ones: placeName(p.onesPlace) }, 'demo'));
    const over = p.steps.find((s) => !s.carry && s.friend !== undefined);
    if (over) {
      scenes.push(line(script, over.technique === 'A5' ? 'carry-five' : 'carry', seed, {
        place: placeName(over.place), add: read(over.add), friend: read(over.friend),
      }, 'demo'));
    }
    scenes.push({ kind: 'abacus-steps', steps: p.steps, tensPlace: p.tensPlace, onesPlace: p.onesPlace });
    if (i === 0) scenes.push(line(script, 'end-place', seed, { place: placeName(p.onesPlace) }));
  });
  scenes.push(line(script, 'answer', seed, { answer: read(sol.answer) }));
  if (String(sol.answer).length < sol.digits) scenes.push(line(script, 'short', seed, { start: placeName(sol.startPlace) }));
  if (sol.answer >= 1000) scenes.push(line(script, 'comma', seed));
  return scenes;
}

/**
 * 1강 전체. 부분 목록을 돌려준다.
 *  { scenes: [...] }                  그대로 재생
 *  { check: { no, problem } }         답을 듣고 checkScenes로 이어 간다
 *  { end: true }                      맞힌 수를 넣어 endScenes로 끝낸다
 */
export function lessonPlan(script, seed) {
  const { together, practice } = lessonProblems(seed);
  const S = (...scenes) => ({ scenes });
  const L = (key, vars, pose) => line(script, key, seed, vars, pose);
  const follow = { kind: 'wait', prompt: 'follow' };
  const parts = [
    S(L('greet'), L('review1'), L('review2'), L('review3'), L('review4'), L('today'), L('times-table')),
    S(L('intro2'), L('together')),
    S(...solveScenes(script, together[0], seed + 1, { explainOrder: true }), L('follow-check'), follow),
    S(...solveScenes(script, together[1], seed + 2), L('follow-check'), follow),
    S(L('intro3'), L('intro3-digits'), L('pad-rule1'), L('pad-rule2'), L('pad-rule3')),
    S(...solveScenes(script, together[2], seed + 3), L('follow-check'), follow),
    S(...solveScenes(script, together[3], seed + 4), L('follow-check'), follow),
    S(
      L('practice-intro'),
      { kind: 'board-list', items: practice.map((p, i) => ({ no: i + 1, a: p.a, b: p.b })) },
      { kind: 'abacus-clear', columns: 5, start: null },
      ...practice.map((p, i) => L('practice-read', { no: ORDINAL[i + 1], a: read(p.a), b: read(p.b) })),
      L('practice-wait'),
      { kind: 'wait', prompt: 'solve-all' },
      L('check-intro'),
    ),
    ...practice.map((problem, i) => ({ check: { no: i + 1, problem } })),
    { end: true },
  ];
  return { parts, together, practice };
}

/** 확인 부분: 묻는 장면 */
export function askScenes(script, no, seed) {
  return [line(script, 'check-ask', seed + no, { no: ORDINAL[no] }), { kind: 'listen' }];
}

/** 확인 부분: 답을 들은 뒤. 틀리면 무엇을 놓쳤는지 짐작해 말하고 같이 다시 놓는다. */
export function checkScenes(script, problem, given, seed) {
  const d = diagnoseMul(problem.solution, given);
  if (d.kind === 'correct') return { correct: true, scenes: [{ kind: 'nod' }, line(script, 'correct', seed)] };
  const sol = problem.solution;
  const vars = d.kind === 'product' ? { single: read(sol.single), digit: read(sol.products[d.productIndex].digit) } : {};
  return {
    correct: false,
    diagnosis: d,
    scenes: [line(script, `wrong-${d.kind}`, seed, vars), ...solveScenes(script, problem, seed)],
  };
}

/** 수업 끝 */
export function endScenes(script, correctCount, seed) {
  const L = (key, vars) => line(script, key, seed, vars);
  const result = correctCount > 0 ? L('result', { correct: COUNT[correctCount] }) : L('result-zero');
  return [L('summary1'), L('summary2'), L('summary3'), result, L('bye'), { kind: 'fall' }];
}

/** 말 못 알아들었을 때 */
export function didntHearScene(script, seed) {
  return line(script, 'didnt-hear', seed);
}
