// JUSAN: 1강 "한 자리 곱셈" 수업(docs/SPEC.md 1차 목표).
// 첫 화면에서 "수업 시작"을 누르면 큐브 선생님이 수업을 처음부터 끝까지 이끈다.
//  복습 → 두 자리 소개 → 같이 풀기 2 → 세 자리 소개(0 붙이기) → 같이 풀기 2 → 기초문제 4 → 확인 → 마무리
// 아이는 실물 주판으로 풀고, 말로 대답한다. 말이 안 되면 버튼과 숫자판을 쓴다.
import './ui/style.css';
import lesson from './content/lessons/mul-1digit.json';
import look from './content/teacher-look.json';
import script from './content/teacher.json';
import { askScenes, checkScenes, didntHearScene, endScenes, lessonPlan } from './core/lesson.js';
import { parseSpokenCommand, pickSpokenNumber } from './core/numhear.js';
import { createAbacus } from './ui/abacus-view.js';
import { createBoard } from './ui/board.js';
import { prepareEndSound } from './ui/end-sound.js';
import { listenOnce, listenSupported, stopListening } from './ui/listen.js';
import { createPlayer } from './ui/player.js';
import { setMuted, speechSupported, stopSpeaking, voicesReady } from './ui/speech.js';
import { createTeacher } from './ui/teacher-view.js';

const app = document.getElementById('app');
app.innerHTML = `
  <header class="top">
    <h1>JUSAN</h1>
    <span class="sub">1강 · ${lesson.title}</span>
    <button class="small" data-act="mute" aria-pressed="false">소리 끄기</button>
  </header>
  <main class="lesson">
    <section class="stage-wrap">
      <div id="teacher"></div>
      <div id="caption" class="caption" aria-live="polite"></div>
    </section>
    <section class="side">
      <div id="board"></div>
      <div id="abacus"></div>
    </section>
  </main>
  <section id="answer" class="answer" hidden>
    <div class="answer-head"><span id="mic" class="mic">🎤 말로 대답해요</span><span id="heard" class="heard"></span></div>
    <div class="answer-show" id="answer-show"></div>
    <div class="keys" id="keys"></div>
  </section>
  <footer class="controls">
    <button data-act="start" class="primary big">수업 시작</button>
    <button data-act="done" class="primary" hidden>다 했어요</button>
    <button data-act="again" hidden>다시 말해 주세요</button>
    <button data-act="slower" hidden>천천히요</button>
    <button data-act="stop" hidden>그만할래요</button>
  </footer>
  <p class="voice-note" id="voice-note"></p>
`;

const $ = (sel) => document.querySelector(sel);
const teacher = createTeacher($('#teacher'), look, { unit: 4 });
const board = createBoard($('#board'));
const abacus = createAbacus($('#abacus'));
const caption = $('#caption');
const notes = [];
if (!speechSupported()) notes.push('이 브라우저는 글을 소리로 읽지 못해요. 자막으로 수업해요. 크롬으로 열면 선생님 목소리가 나요.');
if (!listenSupported()) notes.push('이 브라우저는 말을 알아듣지 못해요. 버튼과 숫자판으로 대답해요.');
$('#voice-note').textContent = notes.join(' ');

const show = (act, on) => ($(`[data-act=${act}]`).hidden = !on);

// ---- "다 했어요" 기다리기: 버튼 또는 말 ----
let pending = null; // 지금 기다리는 것: { resolve }
function waitDone(prompt) {
  show('done', true);
  caption.textContent = prompt === 'solve-all' ? '다 풀면 "다 했어요"라고 말해요.' : '다 놓았으면 "다 했어요"라고 말해요.';
  return new Promise((resolve) => {
    pending = { resolve: (r) => { pending = null; show('done', false); stopListening(); resolve(r); } };
    listenForCommand();
  });
}

/** 기다리는 동안 계속 들으며 "다 했어요"를 찾는다 */
async function listenForCommand() {
  if (!listenSupported()) return;
  while (pending && !player.stopped) {
    const r = await listenOnce({ timeoutMs: 12000 });
    if (!pending) return;
    if (r.error === 'not-allowed' || r.error === 'service-not-allowed' || r.error === 'unsupported') return;
    const command = r.texts?.map(parseSpokenCommand).find(Boolean);
    if (command === 'done') pending?.resolve('done');
    else if (command === 'stop') stopLesson();
  }
}

// ---- 답 받기: 말 또는 숫자판 ----
function getAnswer() {
  const box = $('#answer');
  const display = $('#answer-show');
  const heard = $('#heard');
  const mic = $('#mic');
  box.hidden = false;
  let typed = '';
  const showTyped = () => (display.textContent = typed ? Number(typed).toLocaleString('ko-KR') : ' ');
  showTyped();
  heard.textContent = '';
  return new Promise((resolve) => {
    let finished = false;
    const finish = (value) => {
      if (finished) return;
      finished = true;
      stopListening();
      box.hidden = true;
      resolve(value);
    };
    const keys = $('#keys');
    keys.innerHTML = '';
    for (const label of ['7', '8', '9', '4', '5', '6', '1', '2', '3', '⌫', '0', '확인']) {
      const b = document.createElement('button');
      b.textContent = label;
      if (label === '확인') b.className = 'primary';
      b.onclick = () => {
        if (label === '⌫') typed = typed.slice(0, -1);
        else if (label === '확인') return typed && finish(Number(typed));
        else if (typed.length < 7) typed += label;
        showTyped();
      };
      keys.appendChild(b);
    }
    stopWaiter = () => finish(null);
    (async () => {
      if (!listenSupported()) {
        mic.textContent = '⌨️ 숫자판으로 넣어요';
        return;
      }
      for (let tries = 0; tries < 3 && !finished; tries++) {
        mic.textContent = '🎤 듣고 있어요…';
        const r = await listenOnce({ onInterim: (t) => (heard.textContent = t) });
        if (finished) return;
        if (r.error === 'not-allowed' || r.error === 'service-not-allowed') {
          mic.textContent = '⌨️ 마이크를 쓸 수 없어요. 숫자판으로 넣어요';
          return;
        }
        const n = r.texts ? pickSpokenNumber(r.texts) : null;
        if (n !== null) {
          heard.textContent = `"${r.texts[0]}"`;
          typed = String(n);
          showTyped();
          await new Promise((ok) => setTimeout(ok, 500));
          return finish(n);
        }
        if (r.texts?.some((t) => parseSpokenCommand(t) === 'stop')) return stopLesson();
        mic.textContent = '🎤 다시 들을게요';
        await player.say(didntHearScene(lesson, tries).text);
      }
      if (!finished) mic.textContent = '⌨️ 숫자판으로 넣어도 돼요';
    })();
  });
}
let stopWaiter = null;

const player = createPlayer({ teacher, board, abacus, caption, voice: script.voice, ui: { waitDone } });

function stopLesson() {
  player.stop();
  stopListening();
  pending?.resolve('stop');
  stopWaiter?.();
}

/** 수업 하나를 처음부터 끝까지 */
async function runLesson() {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const { parts, practice } = lessonPlan(lesson, seed);
  const items = practice.map((p, i) => ({ no: i + 1, a: p.a, b: p.b }));
  let correct = 0;
  player.reset();
  await teacher.standUp();
  for (const part of parts) {
    if (player.stopped) break;
    if (part.scenes) {
      await player.play(part.scenes);
    } else if (part.check) {
      const { no, problem } = part.check;
      board.focus?.(no);
      await player.play(askScenes(lesson, no, seed).filter((s) => s.kind === 'say'));
      teacher.pose('listen');
      const answer = await getAnswer();
      teacher.pose('idle');
      if (answer === null) break;
      const result = checkScenes(lesson, problem, answer, seed + no);
      if (result.correct) correct++;
      await player.play(result.scenes);
      // 기초문제 목록으로 돌아와 결과를 표시한다(틀려서 다시 놓아 보였어도)
      marks[no] = { correct: result.correct, answer };
      board.list(items);
      for (const [k, m] of Object.entries(marks)) board.mark(Number(k), m.correct, m.answer);
    } else if (part.end) {
      player.reset();
      await player.play(endScenes(lesson, correct, seed));
    }
  }
  if (player.stopped) {
    // 그만하면 인사하고 쓰러진다(수업 끝 신호는 늘 같다)
    player.reset();
    await player.play([{ kind: 'say', text: '오늘은 여기까지 해요. 수고했어요.', pose: 'talk' }, { kind: 'fall' }]);
  }
}
const marks = {};

let running = false;
document.querySelector('.controls').addEventListener('click', async (e) => {
  const button = e.target.closest('button[data-act]');
  if (!button) return;
  const act = button.dataset.act;
  if (act === 'done') return pending?.resolve('done');
  if (act === 'again') return player.again();
  if (act === 'slower') return player.slower();
  if (act === 'stop') return stopLesson();
  if (act === 'start' && !running) {
    running = true;
    for (const k of Object.keys(marks)) delete marks[k];
    show('start', false);
    ['again', 'slower', 'stop'].forEach((a) => show(a, true));
    try {
      await runLesson();
    } finally {
      running = false;
      ['again', 'slower', 'stop', 'done'].forEach((a) => show(a, false));
      $('[data-act=start]').textContent = '다시 수업하기';
      show('start', true);
    }
  }
});

$('[data-act=mute]').addEventListener('click', (e) => {
  const button = e.currentTarget;
  const on = button.getAttribute('aria-pressed') !== 'true';
  button.setAttribute('aria-pressed', String(on));
  button.textContent = on ? '소리 켜기' : '소리 끄기';
  setMuted(on);
});

caption.textContent = '주판을 준비하고 "수업 시작"을 눌러요.';
board.note(`오늘 배울 것: ${lesson.title}`);
window.addEventListener('pagehide', () => {
  stopSpeaking();
  stopListening();
});
voicesReady();
prepareEndSound();
