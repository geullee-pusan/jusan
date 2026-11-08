// 곱셈 오답 짐작(docs/SPEC.md 6.3절). 순수 함수다.
// 실물 주판은 알 움직임을 알 수 없으니, 틀린 답이 어떤 실수에서 나왔을 법한지 따져 본다.
// 선생님은 "~한 것 같아요"라고 짐작임을 밝혀 말한다.

/**
 * @param {object} solution multiplySteps의 결과
 * @param {number} given 아이의 답
 * @returns {{kind: string, productIndex?: number}}
 *   kind: correct | no-pad(0 붙이기를 놓침) | no-carry(받아올림을 놓침) | place(자리를 잘못 읽음)
 *         | product(곱 하나가 틀림, productIndex) | unknown
 */
export function diagnoseMul(solution, given) {
  const { answer, products } = solution;
  if (given === answer) return { kind: 'correct' };

  // 0을 붙이지 않고 한 자리 곱을 앞 칸(십 자리 칸)에 놓았다면
  if (products.some((p) => p.padded && p.product > 0)) {
    const noPad = products.reduce((sum, p) => sum + p.product * 10 ** (p.padded ? p.tensPlace : p.onesPlace), 0);
    if (given === noPad) return { kind: 'no-pad' };
  }

  // 받아올림을 하지 않았다면: 자리마다 더한 값의 끝자리만 남는다
  const columns = new Array(solution.columns).fill(0);
  for (const p of products) {
    columns[p.tensPlace] += p.pair[0];
    columns[p.onesPlace] += p.pair[1];
  }
  const noCarry = columns.reduce((sum, v, place) => sum + (v % 10) * 10 ** place, 0);
  if (noCarry !== answer && given === noCarry) return { kind: 'no-carry' };

  // 자리를 하나 잘못 읽었다면(10배, 10분의 1)
  if (given === answer * 10 || given * 10 === answer) return { kind: 'place' };

  // 곱 하나가 틀렸다면: 차이가 그 곱의 자리에서 작은 값만큼
  const diff = given - answer;
  for (const p of products) {
    const unit = 10 ** p.onesPlace;
    if (diff % unit === 0 && Math.abs(diff / unit) <= 20 && (diff / unit) % 10 !== 0) {
      return { kind: 'product', productIndex: p.index };
    }
  }
  return { kind: 'unknown' };
}
