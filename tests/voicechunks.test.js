// 목소리 조각 나누기(docs/SPEC.md 7.4절): 1~5글자마다 목소리가 바뀐다.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { letterCount, splitVoiceChunks } from '../src/core/voicechunks.js';

const SAMPLES = [
  '안녕하세요. 오늘은 10의 짝 덧셈을 해 볼 거예요.',
  '삼십이, 더하기 십오, 빼기 칠은?',
  '네',
  '',
  '  앞에 빈칸이 있어요',
];

test('조각을 이어 붙이면 처음 말과 같다', () => {
  for (const text of SAMPLES) {
    for (let seed = 0; seed < 50; seed++) {
      const chunks = splitVoiceChunks(text, seed, { voices: 4 });
      assert.equal(chunks.map((c) => c.text).join(''), text);
    }
  }
});

test('조각마다 소리 나는 글자는 1~5개다(마지막 조각은 남은 만큼)', () => {
  for (const text of SAMPLES) {
    for (let seed = 0; seed < 200; seed++) {
      const chunks = splitVoiceChunks(text, seed, { voices: 4 });
      chunks.forEach((c, i) => {
        const n = letterCount(c.text);
        assert.ok(n <= 5, `${seed}: "${c.text}"`);
        if (i < chunks.length - 1) assert.ok(n >= 1, `${seed}: "${c.text}"`);
      });
    }
  }
});

test('바로 앞 조각과 목소리가 다르고, 목소리 번호는 범위 안이다', () => {
  for (let seed = 0; seed < 200; seed++) {
    const chunks = splitVoiceChunks(SAMPLES[0], seed, { voices: 3 });
    chunks.forEach((c, i) => {
      assert.ok(c.voice >= 0 && c.voice < 3);
      if (i > 0) assert.notEqual(c.voice, chunks[i - 1].voice);
    });
  }
});

test('같은 시드는 같게, 다른 시드는 대개 다르게 나눈다', () => {
  const a = splitVoiceChunks(SAMPLES[0], 7, { voices: 4 });
  assert.deepEqual(splitVoiceChunks(SAMPLES[0], 7, { voices: 4 }), a);
  const different = [1, 2, 3, 4, 5].filter((s) => JSON.stringify(splitVoiceChunks(SAMPLES[0], s, { voices: 4 })) !== JSON.stringify(a));
  assert.ok(different.length >= 4);
});

test('조각 길이가 1~5 사이에서 고루 나온다', () => {
  const seen = new Set();
  for (let seed = 0; seed < 100; seed++) {
    const chunks = splitVoiceChunks(SAMPLES[0], seed, { voices: 4 });
    chunks.slice(0, -1).forEach((c) => seen.add(letterCount(c.text)));
  }
  assert.deepEqual([...seen].sort(), [1, 2, 3, 4, 5]);
});

test('목소리가 1가지뿐이면 바꿀 수 없다고 알려 준다', () => {
  assert.throws(() => splitVoiceChunks('안녕', 1, { voices: 1 }));
});
