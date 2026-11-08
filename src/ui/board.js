// 칠판(docs/SPEC.md 7.5절). 문제를 쓰고, 기초문제 목록을 쓰고, 답을 맞혔는지 표시한다.
// 색만으로 뜻을 전하지 않는다: 맞음은 ○, 다시 본 문제는 △ 기호를 함께 쓴다.

const fmt = (n) => n.toLocaleString('ko-KR');

export function createBoard(root) {
  root.classList.add('board');
  const body = document.createElement('div');
  body.className = 'board-body';
  const note = document.createElement('div');
  note.className = 'board-note';
  root.append(body, note);
  let listItems = new Map();

  return {
    clear() {
      body.innerHTML = '';
      note.textContent = '';
      listItems = new Map();
    },
    /** 문제 하나를 크게 쓴다 */
    problem(a, b) {
      this.clear();
      const p = document.createElement('div');
      p.className = 'board-problem';
      p.textContent = `${fmt(a)} × ${fmt(b)}`;
      body.appendChild(p);
    },
    /** 문제 하나 아래에 답을 쓴다 */
    answer(n) {
      const p = document.createElement('div');
      p.className = 'board-answer';
      p.textContent = `= ${fmt(n)}`;
      body.appendChild(p);
    },
    /** 기초문제 목록 */
    list(items) {
      this.clear();
      const ol = document.createElement('ol');
      ol.className = 'board-list';
      for (const { no, a, b } of items) {
        const li = document.createElement('li');
        li.innerHTML = `<span class="board-no">${no}.</span> <span>${fmt(a)} × ${fmt(b)}</span> <span class="board-mark"></span>`;
        ol.appendChild(li);
        listItems.set(no, li);
      }
      body.appendChild(ol);
    },
    /** 목록의 문제 하나를 가리키거나, 결과를 표시한다 */
    focus(no) {
      for (const [n, li] of listItems) li.classList.toggle('now', n === no);
    },
    mark(no, correct, answer) {
      const li = listItems.get(no);
      if (!li) return;
      li.querySelector('.board-mark').textContent = `${correct ? '○' : '△'} ${fmt(answer)}`;
      li.classList.toggle('ok', correct);
    },
    note(text) {
      note.textContent = text;
    },
  };
}
