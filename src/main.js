// JUSAN 첫 화면(Phase 2): 큐브 선생님 시험 화면.
// 선생님이 인사하고, 문제를 불러 주고, 답을 듣고, 수업을 마치며 쓰러지는 것까지 시험해 본다.
// 진짜 수업 흐름(문제 고르기, 기술 지도)은 Phase 3~4에서 만든다.
import './ui/style.css';
import look from './content/teacher-look.json';
import script from './content/teacher.json';
import { answerScenes, endScenes, greetScenes, problemScenes, sumRows } from './core/teacher.js';
import { createBoard } from './ui/board.js';
import { createPlayer } from './ui/player.js';
import { setMuted, speechSupported, stopSpeaking, voicesReady } from './ui/speech.js';
import { createTeacher } from './ui/teacher-view.js';

const app = document.getElementById('app');
app.innerHTML = `
  <header class="top">
    <h1>JUSAN</h1>
    <span class="sub">선생님 시험 화면</span>
  </header>
  <main class="lesson">
    <section class="stage-wrap">
      <div id="teacher"></div>
      <div id="caption" class="caption" aria-live="polite"></div>
    </section>
    <section class="side">
      <div id="board"></div>
      <div id="answer" class="answer" hidden>
        <div class="answer-show" id="answer-show"></div>
        <div class="keys" id="keys"></div>
      </div>
    </section>
  </main>
  <footer class="controls">
    <button data-act="greet">인사</button>
    <button data-act="problem">문제 불러 주기</button>
    <button data-act="listen-only">듣고만 풀기</button>
    <button data-act="end">수업 끝</button>
    <button data-act="stand">다시 세우기</button>
    <button data-act="mute" aria-pressed="false">소리 끄기</button>
    <button data-act="done" class="primary" hidden>다 했어요</button>
  </footer>
  <p class="voice-note" id="voice-note"></p>
`;

const teacher = createTeacher(document.getElementById('teacher'), look, { unit: 5 });
const board = createBoard(document.getElementById('board'));
const caption = document.getElementById('caption');
const doneButton = document.querySelector('[data-act=done]');
const answerBox = document.getElementById('answer');
const answerShow = document.getElementById('answer-show');
const keys = document.getElementById('keys');

if (!speechSupported()) {
  document.getElementById('voice-note').textContent = '이 브라우저는 글을 소리로 읽지 못해요. 자막으로 수업해요. 크롬으로 열면 목소리가 나요.';
}

/** "다 했어요"를 누를 때까지 기다린다. */
function waitDone() {
  doneButton.hidden = false;
  return new Promise((resolve) => {
    doneButton.onclick = () => {
      doneButton.hidden = true;
      resolve();
    };
  });
}

/** 숫자판으로 답을 받는다(말로 대답하기는 Phase 3에서 붙인다). */
function getAnswer() {
  answerBox.hidden = false;
  let typed = '';
  const show = () => (answerShow.textContent = typed || ' ');
  show();
  keys.innerHTML = '';
  return new Promise((resolve) => {
    const labels = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '⌫', '0', '확인'];
    for (const label of labels) {
      const b = document.createElement('button');
      b.textContent = label;
      if (label === '확인') b.className = 'primary';
      b.onclick = () => {
        if (label === '⌫') typed = typed.slice(0, -1);
        else if (label === '확인') {
          if (!typed) return;
          answerBox.hidden = true;
          resolve(Number(typed));
          return;
        } else if (typed.length < 9) typed += label;
        show();
      };
      keys.appendChild(b);
    }
  });
}

const player = createPlayer({ teacher, board, caption, styles: script.voices, waitDone, getAnswer });

/** 이번 시험의 시드. 누를 때마다 새로 정해 목소리 조각이 매번 다르게 나뉜다. */
function newSeed() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}

/** 시험용 문제: 한 자리 수 3줄, 중간 합이 0 아래로 내려가지 않게 */
function sampleRows(seed) {
  let s = seed;
  const next = () => ((s = (s * 1103515245 + 12345) >>> 0) % 9) + 1;
  const rows = [next(), next()];
  const third = next();
  rows.push(sumRows(rows) - third >= 0 && s % 2 ? -third : third);
  return rows;
}

let busy = false;
let correctCount = 0;
async function run(act) {
  if (busy) return;
  busy = true;
  const seed = newSeed();
  try {
    if (act === 'greet') await player.play(greetScenes(script, seed));
    if (act === 'problem' || act === 'listen-only') {
      const rows = sampleRows(seed);
      const answer = await player.play(problemScenes(script, rows, seed, { show: act === 'problem' }));
      if (answer !== undefined && answer !== null) {
        const ok = answer === sumRows(rows);
        if (ok) correctCount++;
        await player.play(answerScenes(script, ok, seed));
        if (!ok) caption.textContent = `정답은 ${sumRows(rows)}이에요.`;
      }
    }
    if (act === 'end') {
      await player.play(endScenes(script, correctCount, seed));
      correctCount = 0;
    }
    if (act === 'stand') await teacher.standUp();
  } finally {
    busy = false;
  }
}

document.querySelector('.controls').addEventListener('click', (e) => {
  const button = e.target.closest('button[data-act]');
  if (!button) return;
  const act = button.dataset.act;
  if (act === 'done') return;
  if (act === 'mute') {
    const on = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(on));
    button.textContent = on ? '소리 켜기' : '소리 끄기';
    setMuted(on);
    return;
  }
  run(act);
});

window.addEventListener('pagehide', stopSpeaking);
voicesReady();
