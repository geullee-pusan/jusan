// JUSAN(docs/SPEC.md 0장, 2026-11-09 바뀜): 문제를 풀고 맞히는 것이 중심이다.
//  - 지도 화면: 블록 섬(강)들, 기술 배지 선반, 선생님 꾸미기, 나와의 기록
//  - 풀기 화면: 한 판 8문제 + 고르는 보너스 문제. 큐브 선생님이 문제를 내고 답을 듣는다.
//  - 강의는 "강의 보기"를 누를 때만 본다(지도에서, 또는 문제를 풀다가 잘 모르겠을 때).
// 아이는 실물 주판으로 풀고 말로 대답한다. 말이 안 되면 숫자판을 쓴다.
import './ui/style.css';
import fontUrl from 'galmuri/dist/Galmuri11-Bold.woff2?inline';
import lesson from './content/lessons/mul-1digit.json';
import look from './content/teacher-look.json';
import script from './content/teacher.json';
import { BADGES, bestSeconds, earnedBadges, formatDuration, newBadges, unlockedItems } from './core/badges.js';
import { lessonPlan, solveScenes } from './core/lesson.js';
import { parseSpokenCommand, pickSpokenNumber } from './core/numhear.js';
import { answerScenes, askProblemScenes, bonusAskScenes, bonusIntroScenes, practiceRound, roundEndScenes, roundStartScenes } from './core/practice.js';
import { createAbacus } from './ui/abacus-view.js';
import { createBoard } from './ui/board.js';
import { prepareEndSound } from './ui/end-sound.js';
import { registerServiceWorker } from './ui/install.js';
import { listenOnce, listenSupported, stopListening } from './ui/listen.js';
import { createPlayer } from './ui/player.js';
import { setSfxMuted, sfx } from './ui/sfx.js';
import { setMuted, speechSupported, stopSpeaking, voicesReady } from './ui/speech.js';
import { loadData, saveData } from './ui/storage.js';
import { createTeacher } from './ui/teacher-view.js';

// 도트 글꼴(갈무리, SIL OFL 1.1). index.html 안에 들어 있어 오프라인에서도 보인다.
try {
  const face = new FontFace('Galmuri', `url(${fontUrl})`);
  face.load().then((f) => document.fonts.add(f)).catch(() => {});
} catch {
  // 글꼴을 못 불러오면 기본 글꼴로 보인다
}

const BADGE_ICON = { 'first-round': '🧱', 'zero-pad': '0️⃣', friend: '🤝', 'zero-zero': '⭕', bonus: '🚀', perfect: '👑' };
const ITEM_ICON = { hat: '🎩', glasses: '🕶️', tie: '👔', bowtie: '🎀', cape: '🦸', crown: '👑' };
const ISLANDS = [
  { id: 'mul-1digit', no: 1, title: '한 자리 곱셈', open: true },
  { id: 'mul-2digit', no: 2, title: '두 자리 곱셈', open: false },
  { id: 'div-1digit', no: 3, title: '나눗셈', open: false },
  { id: 'add-sub', no: 4, title: '덧셈·뺄셈', open: false },
];

const app = document.getElementById('app');
app.innerHTML = `
  <section id="map" class="screen map">
    <header class="map-top">
      <h1 class="logo">JUSAN</h1>
      <button class="block-btn small" data-act="mute" aria-pressed="false">🔊 소리</button>
    </header>
    <div class="islands" id="islands"></div>
    <div class="map-panels">
      <section class="panel">
        <h2>배지</h2>
        <div class="hotbar badges" id="badges"></div>
        <p class="hint" id="badge-hint">배지를 누르면 받는 방법이 나와요.</p>
      </section>
      <section class="panel dress">
        <h2>선생님 꾸미기</h2>
        <div class="dress-row">
          <div class="dress-teacher"><div id="dress-teacher"></div></div>
          <div class="hotbar items" id="items"></div>
        </div>
      </section>
      <section class="panel">
        <h2>나의 기록</h2>
        <p id="records" class="records"></p>
      </section>
    </div>
    <p class="voice-note" id="voice-note"></p>
    <p class="credit">글꼴: 갈무리(Galmuri) · SIL 오픈 폰트 라이선스 1.1</p>
  </section>

  <section id="play" class="screen play" hidden>
    <header class="play-top">
      <button class="block-btn small" data-act="to-map">🗺️ 지도</button>
      <div class="hotbar progress" id="progress"></div>
      <button class="block-btn small gold" data-act="lecture">📖 강의 보기</button>
    </header>
    <div class="play-grid">
      <section class="stage-wrap world">
        <div id="teacher"></div>
      </section>
      <section class="side">
        <div class="dialog">
          <span class="nametag" id="nametag">큐브 선생님</span>
          <div id="caption" class="caption" aria-live="polite"></div>
        </div>
        <div id="board"></div>
      </section>
      <section class="abacus-wrap"><div id="abacus"></div></section>
      <section id="answer" class="answer panel" hidden>
        <div class="answer-head"><span id="mic" class="mic">🎤 말로 대답해요</span><span id="heard" class="heard"></span></div>
        <div class="answer-show" id="answer-show"></div>
        <div class="keys" id="keys"></div>
      </section>
    </div>
    <footer class="controls">
      <button class="block-btn" data-act="demo" hidden>🤝 같이 풀어 줘요</button>
      <button class="block-btn" data-act="again">🔁 다시 말해 주세요</button>
      <button class="block-btn" data-act="slower">🐢 천천히요</button>
      <button class="block-btn green" data-act="yes" hidden>네</button>
      <button class="block-btn red" data-act="no" hidden>아니요</button>
      <button class="block-btn green big" data-act="done" hidden>다 했어요</button>
      <button class="block-btn green big" data-act="again-round" hidden>한 판 더</button>
      <button class="block-btn big" data-act="back-map" hidden>지도로</button>
      <button class="block-btn red" data-act="stop">그만할래요</button>
    </footer>
    <div id="badge-pop" class="badge-pop" hidden></div>
  </section>
`;

const $ = (sel) => document.querySelector(sel);
const show = (act, on) => document.querySelectorAll(`[data-act=${act}]`).forEach((b) => (b.hidden = !on));
let data = loadData();

const notes = [];
if (!speechSupported()) notes.push('이 브라우저는 글을 소리로 읽지 못해요. 자막으로 해요. 크롬으로 열면 선생님 목소리가 나요.');
if (!listenSupported()) notes.push('이 브라우저는 말을 알아듣지 못해요. 숫자판으로 대답해요.');
$('#voice-note').textContent = notes.join(' ');

// ---------- 지도 화면 ----------
const dressTeacher = createTeacher($('#dress-teacher'), look, { unit: 2.4 });

function renderMap() {
  const islands = $('#islands');
  islands.innerHTML = '';
  for (const isl of ISLANDS) {
    const card = document.createElement('div');
    card.className = `island ${isl.open ? 'open' : 'locked'}`;
    card.innerHTML = `
      <div class="island-top"><span class="island-no">${isl.no}</span></div>
      <div class="island-body">
        <strong>${isl.title}</strong>
        ${isl.open ? '<button class="block-btn green" data-go="play">⛏️ 문제 풀기</button><button class="block-btn small" data-go="lecture">📖 강의 보기</button>' : '<span class="lock">🔒 준비 중</span>'}
      </div>`;
    islands.appendChild(card);
  }
  // 배지
  const got = new Set(earnedBadges(data.rounds));
  const badges = $('#badges');
  badges.innerHTML = '';
  for (const b of BADGES) {
    const slot = document.createElement('button');
    slot.className = `slot ${got.has(b.id) ? 'got' : ''}`;
    slot.innerHTML = `<span class="slot-icon">${got.has(b.id) ? BADGE_ICON[b.id] : '❔'}</span><span class="slot-name">${b.name}</span>`;
    slot.onclick = () => {
      sfx('tap');
      $('#badge-hint').textContent = `${b.name}: ${got.has(b.id) ? '받았어요! ' : ''}${b.how}. 꾸미기: ${b.item.name}`;
    };
    badges.appendChild(slot);
  }
  // 꾸미기
  const unlocked = unlockedItems(data.rounds);
  const items = $('#items');
  items.innerHTML = '';
  if (unlocked.length === 0) items.innerHTML = '<p class="hint">배지를 받으면 선생님에게 입힐 것이 생겨요.</p>';
  for (const it of unlocked) {
    const on = data.outfit.includes(it.id);
    const slot = document.createElement('button');
    slot.className = `slot got ${on ? 'on' : ''}`;
    slot.setAttribute('aria-pressed', String(on));
    slot.innerHTML = `<span class="slot-icon">${ITEM_ICON[it.id]}</span><span class="slot-name">${it.name}${on ? ' ✔' : ''}</span>`;
    slot.onclick = () => {
      sfx('tap');
      data.outfit = on ? data.outfit.filter((x) => x !== it.id) : [...data.outfit, it.id];
      saveData(data);
      renderMap();
    };
    items.appendChild(slot);
  }
  dressTeacher.setOutfit(data.outfit);
  // 기록
  const finished = data.rounds.filter((r) => r.finished).length;
  const best = bestSeconds(data.rounds);
  $('#records').textContent = finished
    ? `끝까지 푼 판: ${finished}판 · 가장 빠른 기록: ${best !== null ? formatDuration(best) : '-'}`
    : '아직 푼 판이 없어요. 첫 판을 풀어 봐요!';
}

$('#islands').addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]')?.dataset.go;
  if (!go) return;
  sfx('tap');
  openPlay(go === 'lecture' ? 'lecture' : 'round');
});

// ---------- 풀기 화면 ----------
const teacher = createTeacher($('#teacher'), look, { unit: 3.6 });
const board = createBoard($('#board'));
const abacus = createAbacus($('#abacus'));
const caption = $('#caption');

const badgePop = $('#badge-pop');
function showBadge(badge) {
  badgePop.innerHTML = `<div class="pop-icon">${BADGE_ICON[badge.id]}</div><div class="pop-title">새 배지!</div><div class="pop-name">${badge.name}</div><div class="pop-item">${ITEM_ICON[badge.item.id]} ${badge.item.name}</div>`;
  badgePop.hidden = false;
  return new Promise((resolve) =>
    setTimeout(() => {
      badgePop.hidden = true;
      resolve();
    }, 2200),
  );
}

/** "다 했어요" 기다리기(강의의 같이 풀기): 버튼 또는 말 */
let waiting = null;
function waitDone() {
  show('done', true);
  return new Promise((resolve) => {
    waiting = {
      resolve: (r) => {
        waiting = null;
        show('done', false);
        stopListening();
        resolve(r);
      },
    };
    listenFor((command) => (command === 'done' ? (waiting?.resolve('done'), true) : false), () => !waiting);
  });
}

/** 기다리는 동안 계속 들으며 명령을 찾는다. handle이 true면 그만 듣는다 */
async function listenFor(handle, isOver) {
  if (!listenSupported()) return;
  while (!isOver() && !player.stopped) {
    const r = await listenOnce({ timeoutMs: 12000 });
    if (isOver()) return;
    if (['not-allowed', 'service-not-allowed', 'unsupported'].includes(r.error)) return;
    const command = r.texts?.map(parseSpokenCommand).find(Boolean);
    if (command === 'stop') return stopAll();
    if (command && handle(command)) return;
  }
}

/** 네/아니요 */
function askYesNo() {
  show('yes', true);
  show('no', true);
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      show('yes', false);
      show('no', false);
      choice = null;
      stopListening();
      resolve(v);
    };
    choice = finish;
    listenFor((c) => (c === 'yes' ? (finish(true), true) : c === 'no' ? (finish(false), true) : false), () => done);
  });
}
let choice = null;

/**
 * 답 받기: 말 또는 숫자판. "같이 풀어 줘요", "강의 보기", "그만할래요"도 여기서 받는다.
 * @returns {Promise<{type: 'number', value: number} | {type: 'demo'} | {type: 'lecture'} | {type: 'stop'}>}
 */
let answering = null;
function getAnswer() {
  const box = $('#answer');
  const display = $('#answer-show');
  const heard = $('#heard');
  const mic = $('#mic');
  box.hidden = false;
  show('demo', true);
  let typed = '';
  const showTyped = () => (display.textContent = typed ? Number(typed).toLocaleString('ko-KR') : ' ');
  showTyped();
  heard.textContent = '';
  teacher.pose('listen');
  return new Promise((resolve) => {
    let finished = false;
    const finish = (value) => {
      if (finished) return;
      finished = true;
      answering = null;
      stopListening();
      box.hidden = true;
      show('demo', false);
      teacher.pose('idle');
      resolve(value);
    };
    answering = finish;
    const keys = $('#keys');
    keys.innerHTML = '';
    for (const label of ['1', '2', '3', '4', '5', '⌫', '6', '7', '8', '9', '0', '확인']) {
      const b = document.createElement('button');
      b.className = label === '확인' ? 'block-btn green' : 'block-btn';
      b.textContent = label;
      b.onclick = () => {
        sfx('tap');
        if (label === '⌫') typed = typed.slice(0, -1);
        else if (label === '확인') return typed && finish({ type: 'number', value: Number(typed) });
        else if (typed.length < 7) typed += label;
        showTyped();
      };
      keys.appendChild(b);
    }
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
          return finish({ type: 'number', value: n });
        }
        const command = r.texts?.map(parseSpokenCommand).find(Boolean);
        if (command === 'stop') return finish({ type: 'stop' });
        mic.textContent = '🎤 다시 말해 줄래요?';
      }
      if (!finished) mic.textContent = '⌨️ 숫자판으로 넣어도 돼요';
    })();
  });
}

const player = createPlayer({ teacher, board, abacus, caption, voice: script.voice, ui: { waitDone, showBadge } });

function stopAll() {
  player.stop();
  stopListening();
  waiting?.resolve('stop');
  answering?.({ type: 'stop' });
  choice?.(false);
}

// 진도 줄: 8칸 + 보너스 칸
function renderProgress(results, current, withBonus) {
  const bar = $('#progress');
  bar.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const r = results[i];
    const slot = document.createElement('span');
    slot.className = `slot ${r ? (r.correct ? (r.firstTry ? 'gold' : 'got') : 'miss') : ''} ${i === current ? 'now' : ''}`;
    slot.textContent = r ? (r.correct ? (r.firstTry ? '★' : '○') : '△') : String(i + 1);
    bar.appendChild(slot);
  }
  if (withBonus) {
    const slot = document.createElement('span');
    slot.className = `slot bonus ${current === 'bonus' ? 'now' : ''}`;
    slot.textContent = '🚀';
    bar.appendChild(slot);
  }
}

/** 강의 보기: 강의의 가르치는 부분(복습, 소개, 같이 풀기 4문제)만 본다 */
async function playLecture(seed) {
  const { parts } = lessonPlan(lesson, seed);
  const teaching = parts.slice(0, parts.findIndex((p) => p.scenes?.some((s) => s.kind === 'board-list')));
  for (const part of teaching) {
    if (player.stopped) return;
    await player.play(part.scenes);
  }
}

/** 문제 하나: 최대 두 번 답한다. 결과 { correct, firstTry } 또는 null(그만) */
async function solveOne(problem, no, seed, timer) {
  await player.play(askProblemScenes(lesson, problem, no, seed));
  for (let tries = 1; tries <= 2; tries++) {
    if (player.stopped) return null;
    const a = await getAnswer();
    if (a.type === 'stop') return stopAll(), null;
    if (a.type === 'lecture') {
      timer.pause();
      await playLecture(seed + 99);
      timer.resume();
      await player.play([{ kind: 'say', text: lesson.lines['lecture-back'][0], pose: 'talk' }, ...askProblemScenes(lesson, problem, no, seed)]);
      tries--;
      continue;
    }
    if (a.type === 'demo') {
      await player.play(solveScenes(lesson, problem, seed));
      return { correct: false, firstTry: false };
    }
    const res = answerScenes(lesson, problem, a.value, tries, seed + tries);
    await player.play(res.scenes);
    if (res.correct) return { correct: true, firstTry: tries === 1 };
    if (!res.retry) return { correct: false, firstTry: false };
    await player.play([{ kind: 'abacus-clear' }]);
  }
  return { correct: false, firstTry: false };
}

function makeTimer() {
  let start = performance.now();
  let paused = 0;
  let pausedAt = null;
  return {
    pause: () => (pausedAt = performance.now()),
    resume: () => {
      if (pausedAt !== null) paused += performance.now() - pausedAt;
      pausedAt = null;
    },
    seconds: () => (performance.now() - start - paused) / 1000,
  };
}

/** 한 판 */
async function runRound() {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const { problems, bonus } = practiceRound(seed);
  const before = data.rounds.slice();
  const record = { lesson: lesson.id, date: new Date().toISOString().slice(0, 10), finished: false, seconds: null, results: [], bonus: null };
  const timer = makeTimer();
  renderProgress(record.results, 0, false);
  await player.play(roundStartScenes(lesson, seed));
  for (let i = 0; i < problems.length; i++) {
    if (player.stopped) break;
    renderProgress(record.results, i, false);
    const res = await solveOne(problems[i], i + 1, seed + i * 7, timer);
    if (!res) break;
    record.results.push({ key: problems[i].key, features: problems[i].features, ...res });
    renderProgress(record.results, i + 1, false);
    if (i < problems.length - 1) await player.say(lesson.lines.next[0]);
  }
  if (!player.stopped && record.results.length === problems.length) {
    record.finished = true;
    record.seconds = Math.round(timer.seconds());
    await player.play(bonusAskScenes(lesson, seed));
    if (await askYesNo()) {
      renderProgress(record.results, 'bonus', true);
      await player.play(bonusIntroScenes(lesson, seed));
      const res = await solveOne(bonus, 'bonus', seed + 1000, makeTimer());
      if (res) record.bonus = { key: bonus.key, ...res };
    }
  }
  if (record.results.length > 0) {
    data.rounds.push(record);
    saveData(data);
  }
  player.reset();
  if (record.finished) {
    const badges = newBadges(before, data.rounds);
    await player.play(roundEndScenes(lesson, {
      correct: record.results.filter((r) => r.correct).length,
      total: problems.length,
      seconds: record.seconds,
      best: bestSeconds(before),
      badges,
    }, seed));
  } else {
    await player.play([{ kind: 'say', text: '오늘은 여기까지 해요. 수고했어요.', pose: 'talk' }, { kind: 'fall' }]);
  }
}

let running = false;
async function openPlay(mode) {
  if (running) return;
  running = true;
  $('#map').hidden = true;
  $('#play').hidden = false;
  ['again-round', 'back-map', 'done', 'yes', 'no', 'demo'].forEach((a) => show(a, false));
  ['again', 'slower', 'stop'].forEach((a) => show(a, true));
  $('#nametag').textContent = data.teacherName;
  teacher.setOutfit(data.outfit);
  board.clear();
  abacus.setup();
  player.reset();
  await teacher.standUp();
  try {
    if (mode === 'lecture') {
      $('#progress').innerHTML = '<span class="progress-title">📖 강의: 한 자리 곱셈</span>';
      await playLecture(crypto.getRandomValues(new Uint32Array(1))[0]);
      player.reset();
      await player.play([{ kind: 'say', text: '강의 끝! 이제 문제를 풀어 봐요.', pose: 'talk' }, { kind: 'fall' }]);
    } else {
      await runRound();
    }
  } finally {
    running = false;
    ['again', 'slower', 'stop', 'done', 'yes', 'no', 'demo'].forEach((a) => show(a, false));
    show('again-round', mode !== 'lecture');
    show('back-map', true);
  }
}

function toMap() {
  stopAll();
  stopSpeaking();
  $('#play').hidden = true;
  $('#map').hidden = false;
  data = loadData();
  renderMap();
}

document.addEventListener('click', (e) => {
  const button = e.target.closest('button[data-act]');
  if (!button) return;
  const act = button.dataset.act;
  if (act !== 'mute') sfx('tap');
  if (act === 'done') return waiting?.resolve('done');
  if (act === 'again') return player.again();
  if (act === 'slower') return player.slower();
  if (act === 'stop') return stopAll();
  if (act === 'yes') return choice?.(true);
  if (act === 'no') return choice?.(false);
  if (act === 'demo') return answering?.({ type: 'demo' });
  if (act === 'lecture') return answering?.({ type: 'lecture' });
  if (act === 'to-map' || act === 'back-map') return toMap();
  if (act === 'again-round') return openPlay('round');
  if (act === 'mute') {
    const on = button.getAttribute('aria-pressed') !== 'true';
    document.querySelectorAll('[data-act=mute]').forEach((b) => {
      b.setAttribute('aria-pressed', String(on));
      b.textContent = on ? '🔇 소리' : '🔊 소리';
    });
    setMuted(on);
    setSfxMuted(on);
  }
});

renderMap();
window.addEventListener('pagehide', () => {
  stopSpeaking();
  stopListening();
});
voicesReady();
prepareEndSound();
registerServiceWorker();
