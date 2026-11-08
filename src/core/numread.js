// 숫자를 한국어로 읽는다(docs/SPEC.md 7.3절). 예: 325 → "삼백이십오", 32325 → "삼만 이천삼백이십오".
// 선생님이 숫자를 불러 줄 때 쓴다. 음성 파일로 바꿀 때를 생각해 "숫자 조각"으로도 나눈다(7.4절).

const DIGITS = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const SMALL_UNITS = ['', '십', '백', '천'];
const BIG_UNITS = ['', '만', '억', '조'];

/** 1~9999를 읽는다. 십·백·천 앞의 1은 읽지 않는다(백이십, 천오). */
function readUnder10000(n) {
  let out = '';
  const digits = String(n).padStart(4, '0').split('').map(Number);
  digits.forEach((d, i) => {
    const unit = SMALL_UNITS[3 - i];
    if (d === 0) return;
    out += (d === 1 && unit ? '' : DIGITS[d]) + unit;
  });
  return out;
}

/** 네 자리씩 나눈다. 낮은 자리부터. */
function groupsOf(n) {
  const groups = [];
  let rest = n;
  while (rest > 0) {
    groups.push(rest % 10000);
    rest = Math.floor(rest / 10000);
  }
  return groups;
}

/**
 * 정수를 한국어로 읽는다. 큰 단위(만, 억, 조) 사이는 띄어 쓴다.
 * 만 앞의 1은 읽지 않고("만", "만 오천"), 억·조 앞의 1은 읽는다("일억").
 * @param {number} n -9999조 ~ 9999조 사이의 정수
 */
export function readNumber(n) {
  if (!Number.isInteger(n)) throw new Error(`정수만 읽어요: ${n}`);
  if (n < 0) return `마이너스 ${readNumber(-n)}`;
  if (n === 0) return DIGITS[0];
  const groups = groupsOf(n);
  if (groups.length > BIG_UNITS.length) throw new Error(`너무 큰 수예요: ${n}`);
  const words = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    const head = g === 1 && i === 1 ? '' : readUnder10000(g);
    words.push(head + BIG_UNITS[i]);
  }
  return words.join(' ');
}

/**
 * 숫자를 음성 조각으로 나눈다. 조각은 정해진 목록에서만 나온다(음성 파일을 미리 만들 수 있게).
 *  - "천" 자리: 일천이 아니라 "천", "이천" … "구천" (9개)
 *  - 1~999 읽기 (999개)
 *  - 큰 단위: "만", "억", "조"
 * 예: 32325 → ["삼", "만", "이천", "삼백이십오"], 10000 → ["만"], 100000000 → ["일", "억"]
 */
export function numberPieces(n) {
  if (!Number.isInteger(n)) throw new Error(`정수만 읽어요: ${n}`);
  if (n < 0) return ['마이너스', ...numberPieces(-n)];
  if (n === 0) return [DIGITS[0]];
  const groups = groupsOf(n);
  const pieces = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    if (!(g === 1 && i === 1)) {
      const thousands = Math.floor(g / 1000);
      const rest = g % 1000;
      if (thousands) pieces.push((thousands === 1 ? '' : DIGITS[thousands]) + '천');
      if (rest) pieces.push(readUnder10000(rest));
    }
    if (i > 0) pieces.push(BIG_UNITS[i]);
  }
  return pieces;
}
