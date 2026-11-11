// 나눗셈 바다 "한 자리로 나누기": 상제법. 근거: docs/research-curriculum.md 9.2·9.3절
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { diagnoseDiv, DIV_ROUND, DIV_TYPES, divideSteps, dividendTopPlace, divProblemOf, divRound } from '../src/core/divide.js';
import { answerScenes, askScenes, demoScenes, islandRound, lectureParts, mergeScript, replayScenes } from '../src/core/islands.js';
import { skillsOfResult } from '../src/core/skills.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = (id) => JSON.parse(readFileSync(resolve(ROOT, `src/content/lessons/${id}.json`), 'utf8'));
const script = mergeScript(load('div-1'), load('common'));
const texts = (scenes) => scenes.filter((s) => s.kind === 'say').map((s) => s.text);

test('나뉠 수를 놓는 줄(Totton): 자릿수 − (나누는 수 자릿수 + 2). 두 자리 ÷ 한 자리는 자리점 바로 오른쪽', () => {
  assert.equal(dividendTopPlace(84, 4), -1);
  assert.equal(dividendTopPlace(951, 3), 0); // Totton의 예: 951 ÷ 3은 일의 자리 줄에 9를 놓는다
});

test('연맹 40쪽 93 ÷ 3: 규칙 1, 몫 3을 9의 두 줄 왼쪽, 1을 3의 두 줄 왼쪽에. 몫 31의 일의 자리는 자리점 줄', () => {
  const s = divideSteps(93, 3);
  assert.equal(s.quotient, 31);
  assert.deepEqual(s.rounds.map((r) => [r.rule, r.q, r.place, r.quotientPlace]), [[1, 3, -1, 1], [1, 1, -2, 0]]);
});

test('연맹 41쪽 134 ÷ 2: 1은 2로 나눌 수 없어 13을 보고, 몫 6을 바로 한 줄 왼쪽에(규칙 2). 몫 67', () => {
  const s = divideSteps(134, 2);
  assert.equal(s.quotient, 67);
  const used = s.rounds.filter((r) => r.q > 0);
  assert.equal(used[0].rule, 2);
  assert.equal(used[0].look, 13);
  assert.equal(used[0].quotientPlace, used[0].place + 2); // 13의 3 자리에서 두 줄 = 1의 자리에서 한 줄 왼쪽
  assert.equal(used.at(-1).quotientPlace, 0);
});

test('연맹 42쪽 76 ÷ 2: 규칙 1로 3을 세우고 남은 1과 6으로 16 ÷ 2 = 8(규칙 2). 몫 38', () => {
  const s = divideSteps(76, 2);
  assert.equal(s.quotient, 38);
  assert.deepEqual(s.rounds.map((r) => [r.rule, r.q, r.look]), [[1, 3, 7], [2, 8, 16]]);
});

test('몫 × 나누는 수는 몫 바로 오른쪽 두 칸에서 뺀다(한 자리 곱은 영 붙여 두 칸)', () => {
  const s = divideSteps(84, 4);
  const r = s.rounds[0];
  assert.deepEqual(r.pair, [0, 8]);
  assert.ok(r.padded);
  for (const st of r.steps.filter((x) => !x.quotient)) assert.ok([r.place, r.place + 1].includes(st.place));
});

test('남은 수가 있는 나눗셈에서는 빼다가 모자라면 친구수 뺄셈(B4)을 쓴다: 71 ÷ 4', () => {
  const s = divideSteps(71, 4);
  assert.equal(s.quotient, 17);
  assert.equal(s.remainder, 3);
  assert.ok(s.rounds.flatMap((r) => r.steps).some((x) => x.technique === 'B4'));
});

test('어떤 나눗셈이든 맞게 풀고, 몫의 일의 자리는 늘 자리점 줄(넓힐 때를 위해 네 자리까지)', () => {
  for (let b = 2; b <= 9; b++) {
    for (let a = 10; a <= 9999; a += a < 1000 ? 1 : 7) {
      const s = divideSteps(a, b);
      assert.equal(s.quotient, Math.floor(a / b));
      assert.equal(s.remainder, a % b);
      assert.equal(s.rounds.at(-1).quotientPlace, 0);
    }
  }
});

test('한 판: 규칙 1 → 규칙 2 → 섞기 차례를 지키고, 모두 나누어떨어지고, 같은 시드면 같다', () => {
  for (let seed = 0; seed < 40; seed++) {
    const { problems, bonus } = divRound(seed);
    assert.deepEqual(divRound(seed).problems.map((p) => p.key), problems.map((p) => p.key));
    problems.forEach((p, i) => {
      assert.ok(DIV_TYPES[DIV_ROUND[i]](p.features), `${seed} ${i} ${p.key}`);
      assert.equal(p.a % p.b, 0);
      assert.ok(p.a >= 10 && p.a <= 99 && p.b >= 2 && p.b <= 9);
      assert.notEqual(p.key, '84/4', '강의 예는 내지 않는다');
    });
    assert.ok(bonus.features.zeroQuotient);
    assert.equal(new Set([...problems, bonus].map((p) => p.key)).size, 9);
  }
});

test('오답 짐작: 줄 밀림(10배), 몫 하나 크게·작게', () => {
  const p = divProblemOf(76, 2);
  assert.equal(diagnoseDiv(p, 38).kind, 'correct');
  assert.equal(diagnoseDiv(p, 380).kind, 'place');
  assert.equal(diagnoseDiv(divProblemOf(72, 8), 90).kind, 'place');
  assert.equal(diagnoseDiv(p, 39).kind, 'over');
  assert.equal(diagnoseDiv(p, 28).kind, 'under');
  assert.equal(diagnoseDiv(p, 5).kind, 'unknown');
});

test('나눗셈 섬: 칠판에 ÷로 쓰고, 같이 풀기는 나뉠 수를 자리점 오른쪽에 놓고 규칙을 말한다', () => {
  const p = divProblemOf(76, 2);
  const ask = askScenes(script, p, 1, 1);
  assert.ok(ask.some((s) => s.kind === 'board-problem' && s.op === '÷'));
  const demo = demoScenes(script, p, 1);
  assert.ok(demo.some((s) => s.kind === 'abacus-set' && s.value === 76 && s.at === -2));
  const said = texts(demo);
  assert.ok(said.some((t) => t.includes('두 줄 왼쪽')));
  assert.ok(said.some((t) => t.includes('바로 한 줄 왼쪽')));
  assert.ok(said.some((t) => t.includes('자리점 줄')));
  assert.ok(demo.some((s) => s.kind === 'board-answer' && s.value === 38));
  const replay = replayScenes(script, p);
  assert.ok(replay.some((s) => s.kind === 'abacus-set' && s.at === -2));
  assert.ok(replay.some((s) => s.kind === 'abacus-steps'));
  for (const wrong of [380, 39, 28, 5]) {
    const r = answerScenes(script, p, wrong, 1, 1);
    assert.ok(r.retry && texts(r.scenes).length === 1);
    assert.ok(texts(r.scenes)[0].includes('같아요') || texts(r.scenes)[0].includes('다시'));
  }
  // 몫에 0이 있는 문제(보너스)도 같이 풀 수 있다
  assert.ok(texts(demoScenes(script, divProblemOf(80, 4), 1)).some((t) => t.includes('몫은 영')));
});

test('나눗셈 강의: 84 ÷ 4로 시작해 규칙 1, 규칙 2, 섞기를 차례로 같이 푼다', () => {
  const parts = lectureParts(script, 3);
  const solves = parts.filter((p) => p.some((s) => s.kind === 'wait'));
  assert.equal(solves.length, 4);
  assert.ok(solves[0].some((s) => s.kind === 'board-problem' && s.a === 84 && s.b === 4));
  const round = islandRound(script, 3, []);
  assert.equal(round.problems.length, 8);
});

test('기술 지도: 나눗셈 결과는 규칙 1·규칙 2 칸에 들어간다', () => {
  assert.deepEqual(skillsOfResult('div-1', { features: divProblemOf(76, 2).features, firstTry: true }).sort(), ['div-rule1', 'div-rule2']);
  assert.deepEqual(skillsOfResult('div-1', { features: divProblemOf(72, 8).features, firstTry: true }), ['div-rule2']);
});
