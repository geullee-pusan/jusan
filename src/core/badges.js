// 기술 배지와 선생님 꾸미기(docs/SPEC.md 2.1절, 2026-11-09). 순수 함수다.
// 배지는 그 기술을 실제로 해냈을 때만 받는다. 무작위로 주지 않는다.
// 기록(판들의 결과)에서 언제든 다시 계산할 수 있다. 기록이 원본이다.

/** 배지 목록. item: 이 배지로 열리는 선생님 꾸미기 */
export const BADGES = [
  { id: 'first-round', name: '곱셈 첫걸음', how: '문제 여덟 개를 끝까지 풀었어요', item: { id: 'hat', name: '빨간 모자' } },
  { id: 'zero-pad', name: '영 붙이기', how: '한 자리 곱에 영을 붙이는 문제를 한 번에 맞혔어요', item: { id: 'glasses', name: '선글라스' } },
  { id: 'friend', name: '친구수 곱셈', how: '더할 때 앞자리로 올리는 문제를 한 번에 맞혔어요', item: { id: 'tie', name: '빨간 넥타이' } },
  { id: 'zero-zero', name: '영영', how: '곱이 영인 문제를 맞혔어요', item: { id: 'bowtie', name: '나비넥타이' } },
  { id: 'bonus', name: '도전자', how: '보너스 문제를 맞혔어요', item: { id: 'cape', name: '망토' } },
  { id: 'perfect', name: '여덟 문제 한 번에', how: '한 판의 여덟 문제를 모두 한 번에 맞혔어요', item: { id: 'crown', name: '금관' } },
];

/**
 * 기록에서 받은 배지를 계산한다.
 * @param {{results: {features: object, firstTry: boolean, correct: boolean}[], bonus?: {correct: boolean}|null, finished: boolean}[]} rounds
 * @returns {string[]} 배지 id(목록 순서대로)
 */
export function earnedBadges(rounds) {
  const got = new Set();
  for (const r of rounds) {
    if (r.finished) got.add('first-round');
    for (const x of r.results) {
      if (x.firstTry && x.features.padded) got.add('zero-pad');
      if (x.firstTry && x.features.carry) got.add('friend');
      if (x.correct && x.features.zeroProduct) got.add('zero-zero');
    }
    if (r.bonus?.correct) got.add('bonus');
    if (r.finished && r.results.length >= 8 && r.results.every((x) => x.firstTry)) got.add('perfect');
  }
  return BADGES.filter((b) => got.has(b.id)).map((b) => b.id);
}

/** 이번에 새로 받은 배지 */
export function newBadges(before, after) {
  const had = new Set(earnedBadges(before));
  return earnedBadges(after).filter((id) => !had.has(id)).map((id) => BADGES.find((b) => b.id === id));
}

/** 받은 배지로 열린 꾸미기 */
export function unlockedItems(rounds) {
  const ids = new Set(earnedBadges(rounds));
  return BADGES.filter((b) => ids.has(b.id)).map((b) => b.item);
}

/** 가장 빠른 기록(초). 끝까지 푼 판만 본다 */
export function bestSeconds(rounds) {
  const times = rounds.filter((r) => r.finished && Number.isFinite(r.seconds)).map((r) => r.seconds);
  return times.length ? Math.min(...times) : null;
}

/** 125 → "2분 5초" */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r}초`;
  return r ? `${m}분 ${r}초` : `${m}분`;
}
