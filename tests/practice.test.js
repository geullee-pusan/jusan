// 문제 풀기 판과 기술 배지
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { BADGES, bestSeconds, earnedBadges, formatDuration, newBadges, unlockedItems } from '../src/core/badges.js';
import { featuresOf, multiplySteps } from '../src/core/multiply.js';
import { answerScenes, askProblemScenes, practiceRound, ROUND_SPECS, roundEndScenes } from '../src/core/practice.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = JSON.parse(readFileSync(resolve(ROOT, 'src/content/lessons/mul-1digit.json'), 'utf8'));
const problem = (a, b) => {
  const solution = multiplySteps(a, b);
  return { a, b, solution, features: featuresOf(solution) };
};
const texts = (scenes) => scenes.filter((s) => s.kind === 'say').map((s) => s.text);

test('한 판은 여덟 문제, 조건대로, 겹치지 않고, 같은 시드면 같다', () => {
  for (let seed = 0; seed < 30; seed++) {
    const { problems, bonus } = practiceRound(seed);
    assert.equal(problems.length, ROUND_SPECS.length);
    problems.forEach((p, i) => {
      for (const [k, want] of Object.entries(ROUND_SPECS[i].need)) assert.equal(p.features[k], want, `${seed}-${i}-${k}`);
    });
    assert.ok(bonus.features.carry && bonus.features.padded);
    const keys = [...problems, bonus].map((p) => p.key);
    assert.equal(new Set(keys).size, keys.length);
    assert.deepEqual(practiceRound(seed).problems.map((p) => p.key), problems.map((p) => p.key));
  }
});

test('문제를 낼 때 "첫 번째 문제. 구 곱하기 오십팔."처럼 부른다', () => {
  const said = texts(askProblemScenes(script, problem(9, 58), 1, 0));
  assert.deepEqual(said, ['첫 번째 문제. 구 곱하기 오십팔.']);
  assert.ok(texts(askProblemScenes(script, problem(9, 58), 'bonus', 0))[0].startsWith('보너스 문제.'));
});

test('맞으면 반짝이고, 처음 틀리면 짚어 주고 다시, 두 번 틀리면 같이 놓는다', () => {
  const p = problem(221, 4);
  const ok = answerScenes(script, p, 884, 1, 0);
  assert.ok(ok.correct && !ok.retry);
  assert.ok(ok.scenes.some((s) => s.kind === 'celebrate'));
  const first = answerScenes(script, p, 8840, 1, 0);
  assert.ok(!first.correct && first.retry);
  assert.ok(texts(first.scenes)[0].includes('영을 붙였나요'));
  const second = answerScenes(script, p, 8840, 2, 0);
  assert.ok(!second.correct && !second.retry);
  assert.ok(second.scenes.some((s) => s.kind === 'abacus-steps'));
  assert.ok(texts(answerScenes(script, p, 884, 2, 0).scenes).some((t) => t.includes('맞았어요') || t.includes('좋아요')));
});

const round = (results, extra = {}) => ({ finished: true, results, bonus: null, seconds: 300, ...extra });
const r = (features, firstTry, correct = true) => ({ features, firstTry, correct });

test('배지는 그 기술을 해냈을 때만 받는다', () => {
  assert.deepEqual(earnedBadges([]), []);
  assert.deepEqual(earnedBadges([{ ...round([]), finished: false }]), []);
  const plain = { padded: false, carry: false, zeroProduct: false };
  assert.deepEqual(earnedBadges([round([r(plain, true)])]), ['first-round']);
  assert.ok(earnedBadges([round([r({ ...plain, padded: true }, true)])]).includes('zero-pad'));
  assert.ok(!earnedBadges([round([r({ ...plain, padded: true }, false)])]).includes('zero-pad'), '두 번째에 맞히면 아직 아니다');
  assert.ok(earnedBadges([round([r({ ...plain, carry: true }, true)])]).includes('friend'));
  assert.ok(earnedBadges([round([r({ ...plain, zeroProduct: true }, false)])]).includes('zero-zero'));
  assert.ok(earnedBadges([round([], { bonus: { correct: true } })]).includes('bonus'));
  const eight = new Array(8).fill(r(plain, true));
  assert.ok(earnedBadges([round(eight)]).includes('perfect'));
  assert.ok(!earnedBadges([round([...eight.slice(1), r(plain, false)])]).includes('perfect'));
});

test('새 배지와 열린 꾸미기, 가장 빠른 기록', () => {
  const plain = { padded: false, carry: false, zeroProduct: false };
  const before = [round([r(plain, true)])];
  const after = [...before, round([r({ ...plain, carry: true }, true)], { seconds: 250 })];
  assert.deepEqual(newBadges(before, after).map((b) => b.id), ['friend']);
  assert.deepEqual(unlockedItems(after).map((i) => i.id), ['hat', 'tie']);
  assert.equal(bestSeconds(after), 250);
  assert.equal(bestSeconds([]), null);
  assert.equal(new Set(BADGES.map((b) => b.item.id)).size, BADGES.length);
});

test('시간 읽기', () => {
  assert.equal(formatDuration(5), '5초');
  assert.equal(formatDuration(125), '2분 5초');
  assert.equal(formatDuration(120), '2분');
});

test('판 끝: 맞힌 수, 나와의 기록, 새 배지, 인사, 쓰러지기', () => {
  const badge = BADGES.find((b) => b.id === 'zero-pad');
  const scenes = roundEndScenes(script, { correct: 7, total: 8, seconds: 200, best: 260, badges: [badge] }, 0);
  const said = texts(scenes);
  assert.ok(said.includes('여덟 문제 중에 일곱 문제를 맞혔어요.'));
  assert.ok(said.includes('지난번 가장 빠른 기록보다 1분 빨라졌어요!'));
  assert.ok(said.includes('새 배지를 받았어요! 영 붙이기.'));
  assert.ok(said.includes('선생님 꾸미기에 선글라스가 생겼어요.'));
  assert.equal(scenes.at(-1).kind, 'fall');
  assert.ok(texts(roundEndScenes(script, { correct: 3, total: 8, seconds: 200, best: null, badges: [] }, 0)).includes('오늘 기록은 3분 20초예요.'));
});
