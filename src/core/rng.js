// 시드 난수(mulberry32). src/core에서는 Math.random 대신 이것만 쓴다(CLAUDE.md).
// 같은 시드는 언제나 같은 수열을 낸다.

/**
 * @param {number} seed 32비트 정수로 바꿔 쓴다.
 * @returns {() => number} 0 이상 1 미만의 수를 내는 함수
 */
export function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** min 이상 max 이하의 정수 */
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** 글자들로 시드를 만든다(FNV-1a). 예: 수업 번호와 문제 번호를 이어 붙인 글자 */
export function seedFrom(...parts) {
  let h = 0x811c9dc5;
  for (const ch of parts.join('|')) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}
