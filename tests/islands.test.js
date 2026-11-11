// 새 섬들: 덧셈·뺄셈 숲, 암산 하늘, 곱셈구구 점검
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { diagnoseAddSub, makeAddSubProblem, simulateRows } from '../src/core/addsub.js';
import { earnedBadges } from '../src/core/badges.js';
import { answerScenes, askScenes, demoScenes, islandRound, lectureParts, mergeScript } from '../src/core/islands.js';
import { nativeCount } from '../src/core/korean.js';
import { makeTTRound, ttWeights, TT_COUNT } from '../src/core/timestable.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = (id) => JSON.parse(readFileSync(resolve(ROOT, `src/content/lessons/${id}.json`), 'utf8'));
const common = load('common');
const curriculum = JSON.parse(readFileSync(resolve(ROOT, 'src/content/curriculum.json'), 'utf8'));
const openIds = curriculum.worlds.flatMap((w) => w.islands).filter((i) => i.open).map((i) => i.id);
const texts = (scenes) => scenes.filter((s) => s.kind === 'say').map((s) => s.text);

test('줄 계산: 3 + 4 - 2 = 5, 5의 짝 덧셈이 나온다', () => {
  const sim = simulateRows([3, 4, -2]);
  assert.equal(sim.answer, 5);
  assert.ok(sim.techniques.includes('A3'));
});

test('열린 섬은 14개(1강 + 새 섬 10개 + 두 자리 곱셈·큰 수와 쉼표·한 자리로 나누기)', () => {
  assert.equal(openIds.length, 14);
});

test('열린 섬마다: 판 문제가 섬 조건을 지키고, 같은 시드면 같고, 강의가 만들어진다', () => {
  for (const id of openIds) {
    const script = mergeScript(load(id), common);
    for (let seed = 0; seed < 8; seed++) {
      const { problems, bonus } = islandRound(script, seed, []);
      assert.deepEqual(islandRound(script, seed, []).problems.map((p) => p.key), problems.map((p) => p.key), id);
      if (script.kind === 'addsub') {
        assert.equal(problems.length, script.round.count);
        const { allowed, need } = script.round.spec;
        for (const p of problems) {
          if (allowed) assert.ok(p.sim.techniques.every((t) => allowed.includes(t)), `${id} ${p.key} ${p.sim.techniques}`);
          if (need) assert.ok(p.sim.techniques.some((t) => need.includes(t)), `${id} ${p.key}`);
          assert.ok(p.rows[0] > 0 && p.answer >= 0);
        }
        assert.ok(bonus, id);
        assert.ok(askScenes(script, problems[0], 1, seed).length > 0);
        assert.ok(demoScenes(script, problems[0], seed).some((s) => s.kind === 'abacus-steps'));
      }
    }
    assert.ok(lectureParts(script, 3).length > 0, id);
  }
});

test('친구수 덧셈 섬의 같이 풀기는 친구수를 말로 짚는다', () => {
  const script = mergeScript(load('add-2'), common);
  const p = makeAddSubProblem(1, { rows: 2, digits: [1, 1], need: ['A4'], allowed: ['A1', 'A2', 'A4'] });
  assert.ok(texts(demoScenes(script, p, 0)).some((t) => t.includes('앞자리로 하나 올리고 친구수')));
});

test('맞히면 계산 과정을 빠르게 한 번 보여 주고 칭찬한다(주판 문제)', () => {
  for (const id of ['add-4', 'mul-1digit']) {
    const script = mergeScript(load(id), common);
    const p = islandRound(script, 1).problems[0];
    const res = answerScenes(script, p, p.answer, 1, 0);
    const kinds = res.scenes.map((s) => s.kind);
    assert.ok(kinds.indexOf('abacus-steps') < kinds.indexOf('say'), `${id}: 칭찬보다 다시 보기가 먼저`);
    assert.ok(res.scenes.find((s) => s.kind === 'abacus-steps').fast > 0);
  }
});

test('덧셈·뺄셈 오답 짐작', () => {
  const p = { rows: [7, 5, -3], answer: 9 };
  assert.equal(diagnoseAddSub(p, 9).kind, 'correct');
  assert.equal(diagnoseAddSub(p, 15).kind, 'sign');
  assert.equal(diagnoseAddSub(p, 4).kind, 'skip');
  assert.equal(diagnoseAddSub(p, 19).kind, 'carry');
  assert.equal(diagnoseAddSub(p, 14).kind, 'five');
});

test('곱셈구구: 스무 문제, 자주 틀린 단을 더 자주 낸다', () => {
  assert.equal(makeTTRound(1, ttWeights([])).length, TT_COUNT);
  const rounds = [{ lesson: 'mul-0', results: new Array(10).fill({ a: 7, firstTry: false }) }];
  const w = ttWeights(rounds);
  assert.ok(w[7] > w[3]);
  let sevens = 0;
  for (let seed = 0; seed < 20; seed++) sevens += makeTTRound(seed, w).filter((p) => p.a === 7).length;
  assert.ok(sevens > 20 * TT_COUNT * 0.5, `7단이 절반 넘게 나와야 한다: ${sevens}`);
  const script = mergeScript(load('mul-0'), common);
  const q = makeTTRound(1, ttWeights([]))[0];
  assert.ok(texts(askScenes(script, q, 1, 0))[0].endsWith('?'));
  assert.ok(texts(answerScenes(script, q, q.answer + 1, 2, 0).scenes)[0].includes('기억해요'));
});

test('새 배지: 구구 박사, 숲 탐험가, 머릿속 주판', () => {
  const tt = { lesson: 'mul-0', finished: true, results: new Array(20).fill({ firstTry: true, correct: true }) };
  assert.ok(earnedBadges([tt]).includes('tt-master'));
  const forest = ['add-1', 'add-2', 'add-3', 'add-4', 'add-5', 'add-6'].map((lesson) => ({ lesson, finished: true, results: [] }));
  assert.ok(earnedBadges(forest).includes('forest'));
  assert.ok(!earnedBadges(forest.slice(1)).includes('forest'));
  const mind = { lesson: 'mental-2', finished: true, results: new Array(6).fill({ correct: true }) };
  assert.ok(earnedBadges([mind]).includes('mind'));
  assert.ok(!earnedBadges([tt]).includes('first-round'), '곱셈 첫걸음은 1강에서만');
});

test('개수 세기 말', () => {
  assert.deepEqual([1, 8, 10, 19, 20, 21].map(nativeCount), ['한', '여덟', '열', '열아홉', '스무', '스물한']);
});
