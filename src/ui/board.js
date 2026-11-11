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
    problem(a, b, op = '×') {
      this.clear();
      const p = document.createElement('div');
      p.className = 'board-problem';
      p.textContent = `${fmt(a)} ${op} ${fmt(b)}`;
      body.appendChild(p);
    },
    /**
     * 여러 줄 덧셈·뺄셈 문제를 학원 문제지처럼 세로로 줄 맞춰 쓴다. 빼기 줄은 "−" 기호를 붙인다.
     * hideFirst: 첫 줄은 주판 그림으로 보여 주므로 칠판에는 "주판 그림"이라고만 쓴다(머릿속 주판).
     */
    rows(rows, { hideFirst = false } = {}) {
      this.clear();
      const grid = document.createElement('div');
      grid.className = 'board-rows';
      rows.forEach((r, i) => {
        const sign = document.createElement('span');
        sign.className = 'board-sign';
        sign.textContent = i === 0 ? '' : r < 0 ? '−' : '+';
        const num = document.createElement('span');
        num.className = 'board-num';
        num.textContent = i === 0 && hideFirst ? '🧮' : fmt(Math.abs(r));
        grid.append(sign, num);
      });
      const line = document.createElement('div');
      line.className = 'board-line';
      grid.appendChild(line);
      body.appendChild(grid);
    },
    /** 듣고 하는 암산: 수는 쓰지 않고 몇 줄인지만 */
    listen(count) {
      this.clear();
      const p = document.createElement('div');
      p.className = 'board-problem';
      p.textContent = '👂 잘 들어요';
      body.appendChild(p);
      note.textContent = `${count}줄이에요.`;
    },
    /** 번쩍 암산: 한 줄씩 번쩍 보여 주고 지운다. ms는 아이가 고른 빠르기 */
    async flash(rows, ms) {
      this.clear();
      const p = document.createElement('div');
      p.className = 'board-problem flash';
      body.appendChild(p);
      for (const [i, r] of rows.entries()) {
        p.textContent = `${i === 0 ? '' : r < 0 ? '− ' : '+ '}${fmt(Math.abs(r))}`;
        await new Promise((ok) => setTimeout(ok, ms));
        p.textContent = '';
        await new Promise((ok) => setTimeout(ok, 160));
      }
      p.textContent = '?';
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
