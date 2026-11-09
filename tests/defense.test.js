// 게임 모드 "주판 성 지키기": 레벨이 오를수록 몬스터가 서서히 바뀌고 빨라진다
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ENEMIES, LEVELS, levelAfter, levelInfo, makeEnemy, matchAnswer, MIN_TRAVEL, PER_LEVEL, positionAt, reached, scoreFor, spawnGap, stageOf, STAGES, typesAt } from '../src/core/defense.js';
import { SKILLS } from '../src/core/skills.js';

const ORDER = Object.keys(ENEMIES);

test('몬스터는 15종이고, 뒤로 갈수록 점수가 크며, 모두 문제를 만들 수 있다', () => {
  assert.equal(ORDER.length, 15);
  for (let i = 1; i < ORDER.length; i++) assert.ok(ENEMIES[ORDER[i]].points > ENEMIES[ORDER[i - 1]].points, ORDER[i]);
  const islands = new Set(SKILLS.map((s) => s.island));
  for (const [type, e] of Object.entries(ENEMIES)) {
    assert.ok(islands.has(e.island), `${type}의 섬`);
    for (let seed = 0; seed < 20; seed++) {
      const p = e.make(seed);
      assert.ok(Number.isInteger(p.answer) && p.answer >= 0, `${type} ${seed}`);
    }
  }
  assert.equal(ENEMIES.slime.make(1).rows.length, 3);
  assert.equal(ENEMIES.knight.make(1).rows.length, 5);
  assert.equal(ENEMIES.dragon.make(1).kind, 'mul');
});

test('레벨이 오르면 몬스터가 서서히 바뀌고(하나 빠지고 하나 들어옴), 빨라진다', () => {
  for (let lv = 2; lv <= LEVELS.length; lv++) {
    const before = typesAt(lv - 1);
    const now = typesAt(lv);
    const kept = now.filter((t) => before.includes(t));
    assert.ok(kept.length >= 1, `레벨 ${lv}에 이어지는 몬스터가 있다`);
    assert.ok(now.length - kept.length <= 1, `레벨 ${lv}에 새 몬스터는 하나까지`);
    // 가장 센 몬스터는 늘 같거나 더 세다
    assert.ok(ORDER.indexOf(now.at(-1)) >= ORDER.indexOf(before.at(-1)));
    assert.ok(levelInfo(lv).travel < levelInfo(lv - 1).travel, `레벨 ${lv}가 더 빠르다`);
  }
  // 15종이 모두 어느 레벨에선가 나온다
  const seen = new Set(LEVELS.flatMap((_, i) => typesAt(i + 1)));
  assert.equal(seen.size, 15);
  // 레벨표를 넘으면 조금씩 더 빨라지되 너무 빨라지지 않는다
  assert.ok(levelInfo(LEVELS.length + 1).travel < levelInfo(LEVELS.length).travel);
  assert.equal(levelInfo(100).travel, MIN_TRAVEL);
  assert.equal(spawnGap(1), levelInfo(1).travel / 4);
});

test('10마리마다 레벨이 하나 오르고, 시작 레벨에서 센다', () => {
  assert.equal(PER_LEVEL, 10);
  assert.equal(levelAfter(1, 0), 1);
  assert.equal(levelAfter(1, 9), 1);
  assert.equal(levelAfter(1, 10), 2);
  assert.equal(levelAfter(4, 25), 6);
});

test('배경은 레벨이 오를수록 어려운 땅으로 바뀐다', () => {
  assert.equal(STAGES.length, 5);
  assert.deepEqual([1, 3, 4, 6, 7, 9, 10, 12, 13, 15, 30].map(stageOf), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5]);
});

test('몬스터 만들기: 같은 입력이면 같고, 레벨의 몬스터만 나오고, 화면의 답과 겹치지 않는다', () => {
  for (let lv = 1; lv <= LEVELS.length; lv++) {
    for (let i = 0; i < 12; i++) {
      const e = makeEnemy(7, i, lv, 3);
      assert.ok(typesAt(lv).includes(e.type), `레벨 ${lv}`);
      assert.equal(e.travel, levelInfo(lv).travel);
      assert.equal(e.lane, i % 3);
      assert.deepEqual(makeEnemy(7, i, lv, 3), e);
    }
  }
  const first = makeEnemy(1, 0, 1, 0);
  const other = makeEnemy(1, 0, 1, 0, [first.answer]);
  assert.notEqual(other.answer, first.answer);
});

test('위치, 닿음, 답 맞추기(몬스터마다 자기 빠르기)', () => {
  const e = { id: 0, answer: 12, spawnAt: 2, travel: 40 };
  assert.equal(positionAt(e, 2), 0);
  assert.equal(positionAt(e, 22), 0.5);
  assert.equal(positionAt(e, 100), 1);
  assert.deepEqual(reached([e], 42), [e]);
  const f = { id: 1, answer: 12, spawnAt: 10, travel: 20 };
  assert.equal(matchAnswer([e, f], 12, 11).id, 0, '성에 더 가까운 몬스터부터');
  assert.equal(matchAnswer([e, f], 12, 25).id, 1, '빠른 몬스터가 더 가까우면 그것부터');
  assert.equal(matchAnswer([e, f], 13, 20), null);
  assert.equal(matchAnswer([f], 12, 5), null, '아직 나오지 않은 몬스터는 못 맞힌다');
});

test('멀리서 무찌를수록 점수가 크다', () => {
  assert.equal(scoreFor({ type: 'slime' }, 0), 15);
  assert.equal(scoreFor({ type: 'slime' }, 1), 10);
});
