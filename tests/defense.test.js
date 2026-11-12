// 게임 모드 "주판 성 지키기": 레벨이 오를수록 몬스터가 서서히 바뀌고 빨라진다
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BANDS, ENEMIES, LEVELS, levelAfter, levelInfo, makeEnemy, matchAnswer, MIN_GAP, MIN_TRAVEL, MIX_DIV_FROM, PACES, PER_LEVEL, positionAt, problemMix, reached, scoreFor, spawnGap, stageOf, STAGES, TOPICS, travelFor, typesAt } from '../src/core/defense.js';
import { SKILLS } from '../src/core/skills.js';

const ORDER = Object.keys(ENEMIES);

test('몬스터는 17종이고 뒤로 갈수록 점수가 크다. 문제 단계는 모두 기술 지도의 섬에 들어가고 문제를 만든다', () => {
  assert.equal(ORDER.length, 17);
  for (let i = 1; i < ORDER.length; i++) assert.ok(ENEMIES[ORDER[i]].points > ENEMIES[ORDER[i - 1]].points, ORDER[i]);
  const islands = new Set(SKILLS.map((s) => s.island));
  for (const [topic, list] of Object.entries(BANDS)) {
    list.forEach((b, i) => {
      assert.ok(islands.has(b.island), `${topic} ${i}의 섬 ${b.island}`);
      for (let seed = 0; seed < 15; seed++) {
        const p = b.make(seed);
        assert.ok(Number.isInteger(p.answer) && p.answer >= 0, `${topic} ${i} ${seed}`);
      }
    });
  }
  assert.equal(BANDS.addsub[0].make(1).rows.length, 3);
  assert.equal(BANDS.mul[0].make(1).kind, 'tt');
  assert.equal(BANDS.div[0].make(1).kind, 'div');
});

test('문제 종류: 고른 종류만 나오고, 섞어서는 덧뺄셈이 절반을 넘지 않으며 나눗셈은 레벨 5부터', () => {
  assert.deepEqual(Object.keys(TOPICS), ['mix', 'addsub', 'mul', 'div']);
  for (const topic of ['addsub', 'mul', 'div']) {
    for (let lv = 1; lv <= LEVELS.length + 3; lv++) {
      for (const b of problemMix(topic, lv)) assert.equal(b.topic, topic);
      const e = makeEnemy(5, lv, lv, 0, [], { topic });
      assert.ok(BANDS[topic].some((b) => b.island === e.problem.island), `${topic} Lv.${lv}`);
    }
  }
  for (let lv = 1; lv <= LEVELS.length; lv++) {
    const mix = problemMix('mix', lv);
    const total = mix.reduce((s, b) => s + b.weight, 0);
    const add = mix.filter((b) => b.topic === 'addsub').reduce((s, b) => s + b.weight, 0);
    assert.ok(add / total <= 0.5, `Lv.${lv} 덧뺄셈 비율`);
    assert.equal(mix.some((b) => b.topic === 'div'), lv >= MIX_DIV_FROM, `Lv.${lv} 나눗셈`);
  }
  // 단계는 레벨이 오를수록 같거나 어려워진다
  for (const topic of ['addsub', 'mul', 'div']) {
    let prev = 0;
    for (let lv = 1; lv <= LEVELS.length; lv++) {
      const top = Math.max(...problemMix(topic, lv).map((b) => b.band));
      assert.ok(top >= prev, `${topic} Lv.${lv}`);
      prev = top;
    }
    assert.equal(prev, BANDS[topic].length - 1, `${topic}은 마지막 레벨에 가장 어려운 단계`);
  }
  // 섞어서 Lv.1은 곱셈구구부터
  assert.ok(problemMix('mix', 1).some((b) => b.topic === 'mul' && BANDS.mul[b.band].island === 'mul-0'));
});

test('기본 빠르기: 아이가 고른 대로 성까지 오는 시간이 바뀌고, 레벨이 오르면 여전히 빨라진다', () => {
  assert.deepEqual(Object.keys(PACES), ['slow', 'normal', 'fast']);
  for (let lv = 1; lv <= LEVELS.length; lv++) {
    assert.equal(travelFor(lv), levelInfo(lv).travel);
    assert.ok(travelFor(lv, 'slow') > travelFor(lv) && travelFor(lv) > travelFor(lv, 'fast'));
    if (lv > 1) for (const pace of Object.keys(PACES)) assert.ok(travelFor(lv, pace) <= travelFor(lv - 1, pace));
    assert.equal(makeEnemy(1, 0, lv, 0, [], { pace: 'slow' }).travel, travelFor(lv, 'slow'));
  }
  assert.ok(spawnGap(1, 'slow') > spawnGap(1) && spawnGap(1) > spawnGap(1, 'fast'));
  assert.equal(spawnGap(100, 'fast'), MIN_GAP);
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
  // 17종이 모두 어느 레벨에선가 나온다
  const seen = new Set(LEVELS.flatMap((_, i) => typesAt(i + 1)));
  assert.equal(seen.size, 17);
  // 레벨표를 넘으면 조금씩 더 빨라지되 너무 빨라지지 않는다
  assert.ok(levelInfo(LEVELS.length + 1).travel < levelInfo(LEVELS.length).travel);
  assert.equal(levelInfo(100).travel, MIN_TRAVEL);
  assert.equal(spawnGap(1), levelInfo(1).travel / 6);
  assert.equal(spawnGap(100), MIN_GAP, '아무리 빨라도 3초보다 자주 나오지 않는다');
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
