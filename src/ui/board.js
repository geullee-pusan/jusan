// 칠판(docs/SPEC.md 7.5절). 선생님이 숫자를 부르면 한 줄씩 써진다.
// 학원 문제지처럼 세로로 줄을 맞추고, 빼는 줄은 "−" 기호를 붙인다. 색만으로 덧셈·뺄셈을 나누지 않는다.

export function createBoard(root) {
  root.classList.add('board');
  const list = document.createElement('div');
  list.className = 'board-rows';
  const note = document.createElement('div');
  note.className = 'board-note';
  root.append(list, note);

  return {
    clear() {
      list.innerHTML = '';
      note.textContent = '';
    },
    /** 한 줄 쓴다. sign: '', '+', '-' */
    write(sign, value) {
      const row = document.createElement('div');
      row.className = 'board-row';
      const s = document.createElement('span');
      s.className = 'board-sign';
      s.textContent = sign === '-' ? '−' : sign === '+' ? '+' : '';
      const n = document.createElement('span');
      n.className = 'board-num';
      n.textContent = value.toLocaleString('ko-KR');
      row.append(s, n);
      list.appendChild(row);
    },
    /** 칠판에 쓰지 않는 문제(듣고 풀기)일 때: 몇째 줄인지만 보여 준다 */
    listening(rowCount) {
      note.textContent = `👂 듣고 있어요 · ${rowCount}째 줄`;
    },
    line() {
      const hr = document.createElement('div');
      hr.className = 'board-line';
      list.appendChild(hr);
    },
  };
}
