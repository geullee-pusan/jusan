// 게임 모드 "주판 성 지키기"
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DIFFICULTY, ENEMIES, makeWave, matchAnswer, positionAt, reached, scoreFor, SPEEDS, starsFor } from '../src/core/defense.js';

test('난이도마다 정해진 몬스터만 나오고, 어려움은 마지막이 보스다', () => {
  for (const difficulty of Object.keys(DIFFICULTY)) {
    for (let seed = 0; seed < 5; seed++) {
      const wave = makeWave(seed, { difficulty, speed: 'normal', count: 10 });
      assert.equal(wave.length, 10);
      const allowed = new Set([...Object.keys(DIFFICULTY[difficulty].mix), ...(DIFFICULTY[difficulty].boss ? ['boss'] : [])]);
      assert.ok(wave.every((e) => allowed.has(e.type)), difficulty);
      if (DIFFICULTY[difficulty].boss) assert.equal(wave.at(-1).type, 'boss');
    }
  }
});

test('한 판 안에서 답이 겹치지 않고, 같은 시드면 같은 판이다', () => {
  const a = makeWave(3, { difficulty: 'hard', speed: 'slow', count: 20 });
  assert.equal(new Set(a.map((e) => e.answer)).size, a.length);
  assert.deepEqual(makeWave(3, { difficulty: 'hard', speed: 'slow', count: 20 }).map((e) => e.answer), a.map((e) => e.answer));
});

test('강할수록 점수가 크고 문제가 어렵다', () => {
  assert.ok(ENEMIES.slime.points < ENEMIES.skeleton.points && ENEMIES.golem.points < ENEMIES.dragon.points && ENEMIES.dragon.points < ENEMIES.boss.points);
  assert.equal(ENEMIES.slime.make(1).rows.length, 3);
  assert.equal(ENEMIES.golem.make(1).rows.length, 5);
  assert.equal(ENEMIES.dragon.make(1).kind, 'mul');
});

test('위치, 닿음, 답 맞추기', () => {
  const travel = SPEEDS.normal.travel;
  const e = { id: 0, answer: 12, spawnAt: 2 };
  assert.equal(positionAt(e, 2, travel), 0);
  assert.equal(positionAt(e, 2 + travel / 2, travel), 0.5);
  assert.equal(positionAt(e, 100, travel), 1);
  assert.deepEqual(reached([e], 2 + travel, travel), [e]);
  const f = { id: 1, answer: 12, spawnAt: 10 };
  assert.equal(matchAnswer([e, f], 12, 20, travel).id, 0, '성에 더 가까운 몬스터부터');
  assert.equal(matchAnswer([e, f], 13, 20, travel), null);
  assert.equal(matchAnswer([f], 12, 5, travel), null, '아직 나오지 않은 몬스터는 못 맞힌다');
});

test('멀리서 무찌를수록 점수가 크고, 별은 남은 성벽만큼', () => {
  assert.equal(scoreFor({ type: 'slime' }, 0), 15);
  assert.equal(scoreFor({ type: 'slime' }, 1), 10);
  assert.deepEqual([3, 2, 1, 0].map(starsFor), [3, 2, 1, 0]);
});
