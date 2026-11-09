// 섬마다 판·문제·강의를 만든다(지도 src/content/curriculum.json, 대본 src/content/lessons/). 순수 함수다.
// 섬의 종류(kind)
//  mul    한 자리 곱셈(1강, practice.js·lesson.js를 그대로 쓴다)
//  addsub 덧셈·뺄셈 여러 줄(덧셈·뺄셈 숲, 암산 하늘). mode: see(보고) / listen(듣고) / flash(번쩍) / picture(첫 줄 주판 그림)
//  tt     곱셈구구 점검(주판 없이)
// 정답을 맞히면 바로 칭찬하지 않고, 화면 주판으로 계산 과정을 빠르게 한 번 보여 준 뒤 칭찬한다(2026-11-09 부모 요청).
import { diagnoseAddSub, makeAddSubProblem } from './addsub.js';
import { placeName } from './korean.js';
import { fill, lessonPlan, solveScenes as mulSolveScenes } from './lesson.js';
import { diagnoseMul } from './muldiagnose.js';
import { readNumber } from './numread.js';
import { practiceRound } from './practice.js';
import { createRng, seedFrom } from './rng.js';
import { makeTTRound, ttWeights } from './timestable.js';

const NTH = ['', '첫 번째', '두 번째', '세 번째', '네 번째', '다섯 번째', '여섯 번째', '일곱 번째', '여덟 번째', '아홉 번째', '열 번째'];
const read = (n) => readNumber(n);
const FAST_MS = 460; // 맞혔을 때 다시 보여 주는 빠르기(알 한 번 움직임, 2026-11-10 절반 속도로)

/** 섬 대본과 공통 대사를 합친다(섬 대본이 이긴다) */
export function mergeScript(island, common) {
  return { ...island, lines: { ...common.lines, ...(island.lines ?? {}) } };
}

/** 대사 하나 */
export function say(script, key, seed, vars = {}, pose = 'talk') {
  const list = script.lines[key];
  if (!list) throw new Error(`대사가 없어요: ${key}`);
  const pick = list[Math.floor(createRng(seedFrom(key, seed))() * list.length)];
  return { kind: 'say', key, text: fill(pick, vars), pose };
}

const nth = (no) => (no === 'bonus' ? '보너스' : NTH[no] ?? `${no}번째`);

// ---------- 판 ----------

/**
 * 한 판의 문제들과 보너스 문제.
 * @param {object} script 섬 대본(mergeScript 결과)
 * @param {number} seed
 * @param {object[]} rounds 지금까지의 기록(곱셈구구는 자주 틀린 단을 더 자주 낸다)
 */
export function islandRound(script, seed, rounds = []) {
  if (script.kind === 'mul') return practiceRound(seed);
  if (script.kind === 'tt') return { problems: makeTTRound(seed, ttWeights(rounds)), bonus: null };
  const used = new Set();
  const problems = [];
  for (let i = 0; i < script.round.count; i++) {
    const p = makeAddSubProblem(seedFrom(script.id, seed, i), { ...script.round.spec, avoid: used });
    used.add(p.key);
    problems.push(p);
  }
  const bonus = script.bonus ? makeAddSubProblem(seedFrom(script.id, 'bonus', seed), { ...script.bonus, avoid: used }) : null;
  return { problems, bonus };
}

// ---------- 문제 내기 ----------

function rowLines(script, rows, seed) {
  return rows.map((r, i) => say(script, i === 0 ? 'row-first' : r < 0 ? 'row-minus' : 'row-plus', seed + i, { n: read(Math.abs(r)) }));
}

/**
 * 문제를 낸다.
 * @param {{flashMs?: number}} options 번쩍 암산의 빠르기(아이가 고른 것)
 */
export function askScenes(script, problem, no, seed, { flashMs = 1000 } = {}) {
  if (script.kind === 'mul') {
    return [
      { kind: 'board-problem', a: problem.a, b: problem.b },
      { kind: 'abacus-clear' },
      say(script, 'q', seed, { no: nth(no), a: read(problem.a), b: read(problem.b) }),
    ];
  }
  if (script.kind === 'tt') {
    return [{ kind: 'board-problem', a: problem.a, b: problem.b }, say(script, 'q-tt', seed, { a: read(problem.a), b: read(problem.b) })];
  }
  const head = say(script, 'q', seed, { no: nth(no) });
  switch (script.mode) {
    case 'listen':
      return [{ kind: 'abacus-visible', on: false }, { kind: 'board-listen', count: problem.rows.length }, head, say(script, 'q-listen', seed), ...rowLines(script, problem.rows, seed), say(script, 'answer-ask', seed)];
    case 'flash':
      return [{ kind: 'abacus-visible', on: false }, { kind: 'board-clear' }, head, say(script, 'q-flash', seed), { kind: 'board-flash', rows: problem.rows, ms: flashMs }, say(script, 'answer-ask', seed)];
    case 'picture':
      return [
        { kind: 'abacus-visible', on: true },
        { kind: 'abacus-clear' },
        { kind: 'abacus-set', value: problem.rows[0] },
        { kind: 'board-rows', rows: problem.rows, hideFirst: true },
        head,
        say(script, 'q-picture', seed),
        ...rowLines(script, problem.rows, seed).slice(1), // 첫 줄은 주판 그림으로 보여 준다
        say(script, 'answer-ask', seed),
      ];
    default:
      return [{ kind: 'abacus-visible', on: true }, { kind: 'board-rows', rows: problem.rows }, { kind: 'abacus-clear' }, head, ...rowLines(script, problem.rows, seed)];
  }
}

// ---------- 같이 풀기와 빠른 다시 보기 ----------

/** 덧셈·뺄셈 문제를 화면 주판으로 한 줄씩 풀어 보인다(기법이 나오면 말로 짚는다) */
function addSubSolveScenes(script, problem, seed) {
  const scenes = [{ kind: 'abacus-visible', on: true }, { kind: 'board-rows', rows: problem.rows }, { kind: 'abacus-clear' }, say(script, 'clear', seed)];
  problem.rows.forEach((r, i) => {
    scenes.push(say(script, i === 0 ? 'row-first' : r < 0 ? 'row-minus' : 'row-plus', seed + i, { n: read(Math.abs(r)) }, 'demo'));
    const steps = problem.sim.rowSteps[i];
    const special = steps.find((s) => !s.carry && !s.borrow && ['A3', 'A4', 'A5', 'B3', 'B4', 'B5'].includes(s.technique));
    if (special) {
      const d = special.add ?? special.sub;
      scenes.push(say(script, `t-${special.technique}`, seed + i, { place: placeName(special.place), d: read(d), five: read(5 - d), friend: read(special.friend ?? 0) }, 'demo'));
    }
    const chain = steps.find((s) => s.technique === 'A6' || s.technique === 'B6');
    if (chain) scenes.push(say(script, `t-${chain.technique}`, seed + i, {}, 'demo'));
    scenes.push({ kind: 'abacus-steps', steps, tensPlace: null, onesPlace: null });
  });
  scenes.push(say(script, 'answer-is', seed, { answer: read(problem.answer) }));
  return scenes;
}

/** 같이 풀기(틀렸을 때, "같이 풀어 줘요"를 눌렀을 때, 강의) */
export function demoScenes(script, problem, seed) {
  if (script.kind === 'mul') return mulSolveScenes(script, problem, seed);
  if (script.kind === 'tt') return [say(script, 'tt-tell', seed, { a: read(problem.a), b: read(problem.b), answer: read(problem.answer) }), { kind: 'board-answer', value: problem.answer }];
  return addSubSolveScenes(script, problem, seed);
}

/** 맞혔을 때: 화면 주판으로 계산 과정을 빠르게 한 번 보여 준다(말 없이) */
export function replayScenes(script, problem) {
  if (script.kind === 'tt') return [];
  const steps = script.kind === 'mul' ? problem.solution.products.flatMap((p) => p.steps) : problem.sim.rowSteps.flat();
  return [{ kind: 'abacus-visible', on: true }, { kind: 'abacus-clear', quiet: true }, { kind: 'abacus-steps', steps, tensPlace: null, onesPlace: null, fast: FAST_MS }];
}

// ---------- 답 듣기 ----------

function diagnose(script, problem, given) {
  if (script.kind === 'mul') return diagnoseMul(problem.solution, given);
  if (script.kind === 'tt') return { kind: given === problem.answer ? 'correct' : 'wrong' };
  return diagnoseAddSub(problem, given);
}

/**
 * 답을 들은 뒤.
 * @returns {{correct: boolean, retry: boolean, diagnosis: object, scenes: object[]}}
 */
export function answerScenes(script, problem, given, tries, seed) {
  const d = diagnose(script, problem, given);
  if (d.kind === 'correct') {
    const praise = script.kind === 'tt' ? 'tt-correct' : tries === 1 ? 'correct-first' : 'correct-second';
    return {
      correct: true,
      retry: false,
      diagnosis: d,
      scenes: [{ kind: 'board-answer', value: given }, ...replayScenes(script, problem), { kind: 'celebrate' }, { kind: 'nod' }, say(script, praise, seed)],
    };
  }
  if (tries === 1) {
    let hint;
    if (script.kind === 'tt') hint = say(script, 'tt-retry', seed);
    else if (script.kind === 'mul') {
      const sol = problem.solution;
      const vars = d.kind === 'product' ? { single: read(sol.single), digit: read(sol.products[d.productIndex].digit) } : {};
      hint = say(script, `hint-${d.kind}`, seed, vars);
    } else hint = say(script, `hint-${d.kind}`, seed);
    return { correct: false, retry: true, diagnosis: d, scenes: [hint] };
  }
  const together = script.kind === 'tt' ? [] : [say(script, 'together-now', seed)];
  return { correct: false, retry: false, diagnosis: d, scenes: [...together, ...demoScenes(script, problem, seed)] };
}

// ---------- 강의 ----------

/**
 * 강의 보기: 대본의 lecture를 장면 묶음들로. 같이 풀기마다 "다 했어요"를 기다린다.
 * 1강(한 자리 곱셈)은 lesson.js의 강의 부분을 쓴다.
 */
export function lectureParts(script, seed) {
  if (script.kind === 'mul') {
    const { parts } = lessonPlan(script, seed);
    return parts.slice(0, parts.findIndex((p) => p.scenes?.some((s) => s.kind === 'board-list'))).map((p) => p.scenes);
  }
  const parts = [];
  let current = [];
  script.lecture.forEach((step, i) => {
    if (step.say) current.push({ kind: 'say', key: 'lecture', text: step.say, pose: 'talk' });
    if (step.together) {
      const p = makeAddSubProblem(seedFrom(script.id, 'lecture', seed, i), step.together);
      parts.push(current);
      current = [...addSubSolveScenes(script, p, seed + i), say(script, 'follow-check', seed + i), { kind: 'wait', prompt: 'follow' }];
      parts.push(current);
      current = [];
    }
  });
  if (current.length) parts.push(current);
  return parts.filter((p) => p.length);
}
