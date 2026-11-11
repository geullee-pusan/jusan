// 큰 곱셈, 큰 수 나누기, 두 자리로 나누기. 근거: docs/research-curriculum.md 9.1·9.3절(연맹 30~53쪽)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { diagnoseDiv, divideSteps, divProblemOf } from '../src/core/divide.js';
import { answerScenes, askScenes, demoScenes, islandRound, lectureParts, mergeScript, replayScenes } from '../src/core/islands.js';
import { longProblemOf, multiplyLong } from '../src/core/mul2.js';
import { skillsOfResult } from '../src/core/skills.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = (id) => JSON.parse(readFileSync(resolve(ROOT, `src/content/lessons/${id}.json`), 'utf8'));
const common = load('common');
const script = (id) => mergeScript(load(id), common);
const texts = (scenes) => scenes.filter((s) => s.kind === 'say').map((s) => s.text);

// ---------- 큰 곱셈 ----------

test('연맹 36·37·38쪽: 604 × 15 = 9,060, 63 × 476 = 29,988, 32 × 406 = 12,992. 곱의 십의 칸은 시작 자리 − i − j', () => {
  for (const [a, b, ans] of [[604, 15, 9060], [63, 476, 29988], [32, 406, 12992]]) {
    const s = multiplyLong(a, b);
    assert.equal(s.answer, ans);
    for (const p of s.products) assert.equal(p.tensPlace, s.startPlace - p.row - p.col);
  }
  // 604 × 15: 0 × 1, 0 × 5는 영영(놓을 알 없음), 4 × 1 = 04는 영 붙이기
  const s = multiplyLong(604, 15);
  assert.deepEqual(s.products.filter((p) => p.product === 0).map((p) => `${p.x}x${p.y}`), ['0x1', '0x5']);
  assert.ok(s.products.some((p) => p.x === 4 && p.y === 1 && p.padded));
});

test('큰 곱셈 판: 문제 차례 조건(자릿수, 가운데 영, 올림)을 지키고 같은 시드면 같다', () => {
  const sc = script('mul-big');
  for (let seed = 0; seed < 25; seed++) {
    const { problems, bonus } = islandRound(sc, seed, []);
    assert.deepEqual(islandRound(sc, seed, []).problems.map((p) => p.key), problems.map((p) => p.key));
    problems.forEach((p, i) => {
      const spec = sc.problems[i];
      assert.equal(String(p.a).length, spec.da);
      assert.equal(String(p.b).length, spec.db);
      for (const [k, want] of Object.entries(spec.need)) assert.equal(p.features[k], want, `${seed} ${i} ${p.key} ${k}`);
      assert.ok(!['604x15', '63x476', '32x406'].includes(p.key), '강의 예는 내지 않는다');
    });
    assert.equal(String(bonus.a).length, 3);
    assert.equal(String(bonus.b).length, 3);
  }
});

test('큰 곱셈 같이 풀기: 여섯 번 곱하고, 영영을 말하고, 시작 자리를 두 번 옮긴다', () => {
  const sc = script('mul-big');
  const demo = demoScenes(sc, longProblemOf(604, 15), 1);
  assert.equal(demo.filter((s) => s.kind === 'abacus-steps').length, 6);
  const said = texts(demo);
  assert.ok(said.some((t) => t.includes('영영')));
  assert.equal(said.filter((t) => t.includes('시작 자리를 한 칸 오른쪽')).length, 2);
  assert.ok(lectureParts(sc, 1).filter((p) => p.some((s) => s.kind === 'wait')).length === 3);
});

// ---------- 큰 수 나누기 ----------

test('연맹 43·44쪽: 1,008 ÷ 6 = 168, 5,000 ÷ 4 = 1,250. 618 ÷ 3 = 206은 몫 가운데 영', () => {
  assert.equal(divideSteps(1008, 6).quotient, 168);
  assert.equal(divideSteps(5000, 4).quotient, 1250);
  const s = divideSteps(618, 3);
  assert.equal(s.quotient, 206);
  assert.deepEqual(s.rounds.map((r) => r.q), [2, 0, 6]);
  assert.equal(s.topPlace, 0); // 세 자리 ÷ 한 자리는 첫 숫자를 자리점 줄에
});

test('큰 수 나누기 판: 세·네 자리, 첫 규칙, 몫의 영, 친구수 뺄셈 조건을 지킨다', () => {
  const sc = script('div-2');
  for (let seed = 0; seed < 25; seed++) {
    const { problems, bonus } = islandRound(sc, seed, []);
    problems.forEach((p, i) => {
      const spec = sc.problems[i];
      assert.equal(String(p.a).length, spec.digits);
      assert.ok(p.b <= 9 && p.a % p.b === 0);
      if (spec.first) assert.equal(p.features.first, spec.first);
      if (spec.zero !== undefined) assert.equal(p.features.zeroQuotient, spec.zero, p.key);
      if (spec.borrow !== undefined) assert.equal(p.features.borrow, spec.borrow, p.key);
    });
    assert.ok(bonus.features.zeroQuotient && bonus.features.borrow);
  }
  // 같이 풀기: 몫이 영인 자리를 비우고, 친구수 뺄셈을 말로 짚는다
  assert.ok(texts(demoScenes(sc, divProblemOf(618, 3), 1)).some((t) => t.includes('몫은 영')));
  const borrow = islandRound(sc, 3, []).problems[2];
  assert.ok(texts(demoScenes(sc, borrow, 1)).some((t) => t.includes('친구수')));
  assert.ok(lectureParts(sc, 1).filter((p) => p.some((s) => s.kind === 'wait')).length === 4);
});

// ---------- 두 자리로 나누기 ----------

test('연맹 45~48쪽: 86÷43 규칙 1, 192÷32 규칙 2, 276÷23 = 12, 3,975÷53 = 75. 고치지 않는다', () => {
  for (const [a, b, q, rule] of [[86, 43, 2, 1], [192, 32, 6, 2], [276, 23, 12, 1], [3975, 53, 75, 2]]) {
    const s = divideSteps(a, b);
    assert.equal(s.quotient, q);
    const used = s.rounds.filter((r) => r.q > 0);
    assert.equal(used[0].rule, rule);
    assert.ok(!used.some((r) => r.actions.some((x) => x.type === 'revise')));
    assert.equal(used.at(-1).quotientPlace, 0);
  }
});

test('연맹 49~52쪽 임시 몫 고치기: 125÷25는 6→5, 85÷17은 8→7→6→5, 729÷27은 3→2와 9→8→7, 3,192÷38은 바로 9', () => {
  const revs = (a, b) => divideSteps(a, b).rounds.map((r) => r.actions.filter((x) => x.type === 'revise').map((x) => `${x.from}>${x.to}`).join(',')).filter(Boolean);
  assert.deepEqual(revs(125, 25), ['6>5']);
  assert.deepEqual(revs(85, 17), ['8>7,7>6,6>5']);
  assert.deepEqual(revs(729, 27), ['3>2', '9>8,8>7']);
  const s = divideSteps(3192, 38);
  assert.equal(s.quotient, 84);
  assert.ok(s.rounds.find((r) => r.q > 0).capped);
  // 고칠 때는 몫을 하나 빼고 앞자리 수를 한 번 도로 더한다(125÷25: 몫 줄에서 1 빼고 2를 더함)
  const rev = divideSteps(125, 25).rounds.find((r) => r.q > 0).actions.find((x) => x.type === 'revise');
  assert.equal(rev.back, 2);
  assert.ok(rev.steps.some((x) => x.quotient && x.after === 5));
});

test('두 자리로 나누기: 어떤 나눗셈이든 맞게 풀고, 몫의 일의 자리는 자리점 줄', () => {
  for (let b = 11; b <= 99; b++) {
    if (b % 10 === 0) continue;
    for (let a = b; a <= 9999; a += 37) {
      const s = divideSteps(a, b);
      assert.equal(s.quotient, Math.floor(a / b));
      assert.equal(s.remainder, a % b);
    }
  }
});

test('두 자리로 나누기 판: 처음 네 문제는 몫이 한 자리, 고치기 있음·없음 조건을 지킨다', () => {
  const sc = script('div-3');
  for (let seed = 0; seed < 25; seed++) {
    const { problems, bonus } = islandRound(sc, seed, []);
    problems.forEach((p, i) => {
      const spec = sc.problems[i];
      assert.equal(String(p.a).length, spec.digits);
      assert.ok(p.b >= 11 && p.b <= 99 && p.b % 10 !== 0 && p.a % p.b === 0);
      if (i < 4) assert.equal(p.features.qDigits, 1, p.key);
      if (spec.revise !== undefined) assert.equal(p.features.revise, spec.revise, p.key);
      if (spec.qDigits) assert.equal(p.features.qDigits, spec.qDigits);
    });
    assert.ok(bonus.features.revise);
  }
});

test('두 자리로 나누기 같이 풀기: 임시 몫을 세우고, 뺄 수 없으면 고치는 장면을 보여 준다', () => {
  const sc = script('div-3');
  const p = divProblemOf(125, 25);
  const demo = demoScenes(sc, p, 1);
  const said = texts(demo);
  assert.ok(said.some((t) => t.includes('임시 몫 육')));
  assert.ok(said.some((t) => t.includes('뺄 수 없어요')));
  assert.ok(said.some((t) => t.includes('이제 몫은 오')));
  assert.ok(demo.some((s) => s.kind === 'abacus-set' && s.value === 125 && s.at === -3));
  assert.ok(demo.some((s) => s.kind === 'board-answer' && s.value === 5));
  assert.ok(texts(demoScenes(sc, divProblemOf(3192, 38), 1)).some((t) => t.includes('임시 몫 구')));
  assert.ok(askScenes(sc, p, 1, 1).some((s) => s.kind === 'board-problem' && s.op === '÷'));
  assert.ok(replayScenes(sc, p).some((s) => s.kind === 'abacus-steps'));
  assert.equal(diagnoseDiv(p, 6).kind, 'over');
  const r = answerScenes(sc, p, 6, 1, 1);
  assert.ok(r.retry && texts(r.scenes)[0].includes('고쳐요'));
  const parts = lectureParts(sc, 1).filter((x) => x.some((s) => s.kind === 'wait'));
  assert.equal(parts.length, 4);
  assert.ok(parts[2].some((s) => s.kind === 'board-problem' && s.a === 125));
});

test('기술 지도: 새 섬 결과가 새 칸에 들어간다', () => {
  assert.deepEqual(skillsOfResult('mul-big', { features: longProblemOf(604, 15).features, firstTry: true }).sort(), ['big-mul', 'big-zero']);
  assert.deepEqual(skillsOfResult('div-2', { features: divProblemOf(618, 3).features, firstTry: true }).sort(), ['div-long', 'div-zero']);
  assert.deepEqual(skillsOfResult('div-3', { features: divProblemOf(125, 25).features, firstTry: true }).sort(), ['div-est', 'div-revise']);
});
