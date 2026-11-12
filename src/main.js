// JUSAN(docs/SPEC.md 0장): 문제를 풀고 맞히는 것이 중심이다.
//  - 지도 화면: 세계와 섬(src/content/curriculum.json), 기술 배지 선반, 선생님 꾸미기, 나와의 기록
//  - 풀기 화면: 섬마다 한 판(곱셈 8문제, 덧셈·뺄셈·암산 8문제, 곱셈구구 20문제) + 고르는 보너스 문제
//  - 강의는 "강의 보기"를 누를 때만 본다(지도에서, 또는 문제를 풀다가 잘 모르겠을 때).
// 아이는 실물 주판으로 풀고 말로 대답한다. 말이 안 되면 숫자판을 쓴다.
import './ui/style.css';
import fontUrl from 'galmuri/dist/Galmuri11-Bold.woff2?inline';
import curriculum from './content/curriculum.json';
import look from './content/teacher-look.json';
import teacherVoice from './content/teacher.json';
import { BADGES, bestSeconds, earnedBadges, formatDuration, newBadges, unlockedItems } from './core/badges.js';
import { answerScenes, askScenes, demoScenes, islandRound, lectureParts, mergeScript, say } from './core/islands.js';
import { parseSpokenCommand, pickSpokenNumber } from './core/numhear.js';
import { roundEndScenes } from './core/practice.js';
import { newlyDone, overallLevel, recommend, skillMap } from './core/skills.js';
import { createAbacus } from './ui/abacus-view.js';
import { createBoard } from './ui/board.js';
import { createDefense } from './ui/defense.js';
import { prepareEndSound } from './ui/end-sound.js';
import { registerServiceWorker } from './ui/install.js';
import { listenOnce, listenSupported, stopListening } from './ui/listen.js';
import { createPlayer } from './ui/player.js';
import { setSfxMuted, sfx } from './ui/sfx.js';
import { setMuted, speechSupported, stopSpeaking, voicesReady } from './ui/speech.js';
import { loadData, saveData } from './ui/storage.js';
import { createTeacher } from './ui/teacher-view.js';

// 섬 대본(src/content/lessons/*.json). common은 여러 섬이 함께 쓰는 대사다.
const lessonFiles = import.meta.glob('./content/lessons/*.json', { eager: true, import: 'default' });
const common = lessonFiles['./content/lessons/common.json'];
const SCRIPTS = Object.fromEntries(
  Object.entries(lessonFiles)
    .filter(([path]) => !path.endsWith('common.json'))
    .map(([, json]) => [json.id, mergeScript(json, common)]),
);

// 도트 글꼴(갈무리, SIL OFL 1.1). index.html 안에 들어 있어 오프라인에서도 보인다.
try {
  const face = new FontFace('Galmuri', `url(${fontUrl})`);
  face.load().then((f) => document.fonts.add(f)).catch(() => {});
} catch {
  // 글꼴을 못 불러오면 기본 글꼴로 보인다
}

const BADGE_ICON = { hero: '🏅', defender: '🛡️', 'first-round': '🧱', 'zero-pad': '0️⃣', friend: '🤝', 'zero-zero': '⭕', bonus: '🚀', perfect: '👑', 'tt-master': '🧮', forest: '🌲', mind: '🧠' };
const ITEM_ICON = { sword: '🗡️', helmet: '⛑️', hat: '🎩', glasses: '🕶️', tie: '👔', bowtie: '🎀', cape: '🦸', crown: '👑', scarf: '🧣', backpack: '🎒', goggles: '🥽' };
const FLASH_SPEEDS = [
  { ms: 1500, label: '🐢 느리게' },
  { ms: 1000, label: '🚶 보통' },
  { ms: 700, label: '🐇 빠르게' },
];

const app = document.getElementById('app');
app.innerHTML = `
  <section id="map" class="screen map">
    <header class="map-top">
      <h1 class="logo">JUSAN</h1>
      <button class="block-btn small" data-act="mute" aria-pressed="false">🔊 소리</button>
    </header>
    <section class="panel level-panel" id="level-panel"></section>
    <div class="islands" id="islands"></div>
    <!-- 게임은 섬 지도(마지막 자리점 성) 다음, 배지 앞에 둔다 -->
    <button class="game-card" data-act="defense"><span class="gc-icon">🏰</span><span class="gc-text"><b>게임: 주판 성 지키기</b><small>다가오는 몬스터를 계산으로 무찔러요. 말로도 답할 수 있어요.</small></span><span class="gc-go">⚔️</span></button>
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
      <section class="panel skills-panel">
        <h2>기술 지도</h2>
        <p class="hint">최근 8번을 보고 정해요. ●●● 됨 · ●●○ 거의 · ●○○ 아직</p>
        <div id="skills" class="skills"></div>
      </section>
      <section class="panel">
        <h2>나의 기록</h2>
        <p id="records" class="records"></p>
      </section>
    </div>
    <p class="voice-note" id="voice-note"></p>
  </section>

  <section id="defense" class="screen defense" hidden></section>

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
      <section class="abacus-wrap" id="abacus-wrap"><div id="abacus"></div></section>
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
      <span id="speeds" class="speeds" hidden></span>
      <button class="block-btn green" data-act="yes" hidden>네</button>
      <button class="block-btn red" data-act="no" hidden>아니요</button>
      <span class="yesno-hint" id="yesno-hint" hidden>🎤 "네" 또는 "아니요"라고 말해도 돼요</span>
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
let lastIsland = null;

function renderMap() {
  // 세계와 섬. 열린 섬만 풀 수 있고, 끝까지 푼 판 수만큼 깃발을 단다. 마지막에 푼 섬에 "지금 여기".
  const islands = $('#islands');
  islands.innerHTML = '';
  const playedIds = data.rounds.map((r) => r.lesson).filter((id) => SCRIPTS[id]);
  const here = lastIsland ?? playedIds.at(-1) ?? 'mul-1digit';
  let no = 0;
  for (const world of curriculum.worlds) {
    const row = document.createElement('section');
    row.className = `world-row biome-${world.biome}`;
    row.innerHTML = `<header class="world-head"><h2>${world.name}</h2><span>${world.about}</span></header><div class="world-islands"></div>`;
    const list = row.querySelector('.world-islands');
    for (const isl of world.islands) {
      no++;
      const rounds = data.rounds.filter((r) => r.lesson === isl.lesson && r.finished).length;
      const card = document.createElement('div');
      card.className = `island ${isl.open ? 'open' : 'locked'} ${isl.id === here ? 'here-island' : ''}`;
      card.innerHTML = `
        <div class="island-top"><span class="island-no">${no}</span>${isl.id === here ? '<span class="here">⬇ 지금 여기</span>' : ''}</div>
        <div class="island-body">
          <strong>${isl.title}</strong>
          <span class="learn">${isl.learn}</span>
          ${isl.open
            ? `<span class="flags">${rounds ? '🚩'.repeat(Math.min(rounds, 5)) + (rounds > 5 ? ` ×${rounds}` : '') : '아직 깃발 없음'}</span>
               <button class="block-btn green" data-go="round" data-island="${isl.lesson}">⛏️ 문제 풀기</button>
               <button class="block-btn small" data-go="lecture" data-island="${isl.lesson}">📖 강의 보기</button>`
            : '<span class="lock">🔒 준비 중</span>'}
        </div>`;
      list.appendChild(card);
    }
    islands.appendChild(row);
  }
  // 레벨과 선생님 추천
  const map = skillMap(data.rounds);
  const lv = overallLevel(map);
  const openIds = curriculum.worlds.flatMap((w) => w.islands).filter((i) => i.open).map((i) => i.lesson);
  const rec = recommend(data.rounds, openIds);
  const recIsland = rec && curriculum.worlds.flatMap((w) => w.islands).find((i) => i.lesson === rec.island);
  const recWhy = !rec ? '' : rec.why === 'almost' ? `'${rec.skill.name}' 연습이 거의 다 됐어요. 조금만 더!` : rec.why === 'notyet' ? `'${rec.skill.name}' 연습을 다시 해 봐요.` : '아직 안 가 본 섬이에요.';
  $('#level-panel').innerHTML = `
    <div class="level-badge"><span class="lv-num">Lv.${lv.level}</span><span class="lv-title">${lv.title}</span></div>
    <div class="lv-bar" aria-label="다음 레벨까지 ${lv.toNext}점"><span style="width:${((3 - lv.toNext) / 3) * 100}%"></span></div>
    <span class="lv-next">다음 레벨까지 ${lv.toNext}점${lv.nextTitle ? ` · 다음 칭호: ${lv.nextTitle}` : ''}</span>
    ${recIsland ? `<div class="rec"><span>🧑‍🏫 선생님 추천: <b>${recIsland.title}</b> — ${recWhy}</span><button class="block-btn green" data-go="round" data-island="${recIsland.lesson}">가기</button></div>` : ''}`;
  // 기술 지도
  const skillsBox = $('#skills');
  skillsBox.innerHTML = '';
  const DOTS = { done: '●●●', almost: '●●○', notyet: '●○○' };
  const LABEL = { done: '됨', almost: '거의', notyet: '아직' };
  for (const group of [...new Set(map.map((s) => s.group))]) {
    const box = document.createElement('div');
    box.className = 'skill-group';
    box.innerHTML = `<h3>${group}</h3>`;
    for (const s of map.filter((x) => x.group === group)) {
      const row = document.createElement('div');
      row.className = `skill ${s.state}`;
      row.innerHTML = `<span class="skill-name">${s.name}</span><span class="skill-dots">${DOTS[s.state]}</span><span class="skill-label">${LABEL[s.state]}</span><span class="skill-count">${s.tries ? `${s.tries}번 중 ${s.hits}번` : '-'}</span>`;
      box.appendChild(row);
    }
    skillsBox.appendChild(box);
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
  const islandRounds = data.rounds.filter((r) => r.finished && r.lesson !== 'defense');
  const finished = islandRounds.length;
  const islandsPlayed = new Set(islandRounds.map((r) => r.lesson ?? 'mul-1digit')).size;
  const games = data.rounds.filter((r) => r.lesson === 'defense').length;
  const gameText = games ? ` · 성 지키기: ${games}판` : '';
  $('#records').textContent = finished || games ? `끝까지 푼 판: ${finished}판 · 깃발 꽂은 섬: ${islandsPlayed}곳${gameText}` : '아직 푼 판이 없어요. 첫 판을 풀어 봐요!';
}

$('#map').addEventListener('click', (e) => {
  const button = e.target.closest('[data-go]');
  if (!button) return;
  sfx('tap');
  openPlay(button.dataset.island, button.dataset.go);
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

function showPop({ icon, title, name }) {
  badgePop.innerHTML = `<div class="pop-icon">${icon}</div><div class="pop-title">${title}</div><div class="pop-name">${name}</div>`;
  badgePop.hidden = false;
  return new Promise((resolve) => setTimeout(() => { badgePop.hidden = true; resolve(); }, 2000));
}

function setAbacusVisible(on) {
  $('#abacus-wrap').hidden = !on;
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
let choice = null;
function askYesNo() {
  show('yes', true);
  show('no', true);
  // 말로도 답할 수 있다고 알려 준다(음성 인식이 되는 기기에서만)
  $('#yesno-hint').hidden = !listenSupported();
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      show('yes', false);
      show('no', false);
      $('#yesno-hint').hidden = true;
      choice = null;
      stopListening();
      resolve(v);
    };
    choice = finish;
    listenFor((c) => (c === 'yes' ? (finish(true), true) : c === 'no' ? (finish(false), true) : false), () => done);
  });
}

/** 번쩍 암산 빠르기 고르기(아이가 고른다. 앱이 저절로 바꾸지 않는다) */
function askFlashSpeed() {
  const box = $('#speeds');
  box.innerHTML = '';
  box.hidden = false;
  return new Promise((resolve) => {
    for (const s of FLASH_SPEEDS) {
      const b = document.createElement('button');
      b.className = `block-btn ${data.flashMs === s.ms ? 'gold' : ''}`;
      b.textContent = s.label;
      b.onclick = () => {
        sfx('tap');
        box.hidden = true;
        data.flashMs = s.ms;
        saveData(data);
        resolve(s.ms);
      };
      box.appendChild(b);
    }
  });
}

/**
 * 답 받기: 말 또는 숫자판. "같이 풀어 줘요", "강의 보기", "그만할래요"도 여기서 받는다.
 * @returns {Promise<{type: 'number', value: number} | {type: 'demo'} | {type: 'lecture'} | {type: 'stop'}>}
 */
let answering = null;
function getAnswer({ allowDemo = true, decimal = false } = {}) {
  const box = $('#answer');
  const display = $('#answer-show');
  const heard = $('#heard');
  const mic = $('#mic');
  box.hidden = false;
  show('demo', allowDemo);
  let typed = '';
  // 소수 섬에서는 점(.)도 넣는다. 치는 동안 "3."처럼 점이 사라지지 않게 정수 부분만 쉼표로 꾸민다
  const showTyped = () => {
    if (!typed) return (display.textContent = ' ');
    const [head, frac] = typed.split('.');
    display.textContent = Number(head || 0).toLocaleString('ko-KR') + (frac !== undefined ? `.${frac}` : '');
  };
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
    const labels = decimal ? ['1', '2', '3', '4', '5', '.', '⌫', '6', '7', '8', '9', '0', '확인'] : ['1', '2', '3', '4', '5', '⌫', '6', '7', '8', '9', '0', '확인'];
    keys.style.gridTemplateColumns = decimal ? 'repeat(7, 1fr)' : '';
    for (const label of labels) {
      const b = document.createElement('button');
      b.className = label === '확인' ? 'block-btn green' : 'block-btn';
      b.textContent = label;
      if (decimal && label === '확인') b.style.gridColumn = 'span 2';
      b.onclick = () => {
        sfx('tap');
        if (label === '⌫') typed = typed.slice(0, -1);
        else if (label === '확인') return typed && typed !== '.' && finish({ type: 'number', value: Number(typed) });
        else if (label === '.') { if (!typed.includes('.') && typed.length < 7) typed = (typed || '0') + '.'; }
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
          await new Promise((ok) => setTimeout(ok, 400));
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

const player = createPlayer({ teacher, board, abacus, caption, voice: teacherVoice.voice, ui: { waitDone, showBadge, showPop, setAbacusVisible } });

function stopAll() {
  player.stop();
  stopListening();
  waiting?.resolve('stop');
  answering?.({ type: 'stop' });
  choice?.(false);
  $('#speeds').hidden = true;
}

// 진도 줄: 문제 수만큼 칸 + 보너스 칸
function renderProgress(total, results, current, withBonus) {
  const bar = $('#progress');
  bar.innerHTML = '';
  bar.classList.toggle('many', total > 10);
  for (let i = 0; i < total; i++) {
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

/** 강의 보기 */
async function playLecture(script, seed) {
  for (const scenes of lectureParts(script, seed)) {
    if (player.stopped) return;
    await player.play(scenes);
  }
}

/** 문제 하나: 최대 두 번 답한다. 결과 { correct, firstTry } 또는 null(그만) */
async function solveOne(script, problem, no, seed, timer, opts) {
  const ask = () => askScenes(script, problem, no, seed, opts);
  let miss; // 처음 틀렸을 때 짐작한 이유(기술 지도에서 어느 기술 탓인지 정할 때 쓴다)
  await player.play(ask());
  for (let tries = 1; tries <= 2; tries++) {
    if (player.stopped) return null;
    const a = await getAnswer({ allowDemo: script.kind !== 'tt', decimal: script.kind === 'decimal' });
    if (a.type === 'stop') return stopAll(), null;
    if (a.type === 'lecture') {
      timer.pause();
      await playLecture(script, seed + 99);
      timer.resume();
      await player.play([say(script, 'lecture-back', seed), ...ask()]);
      tries--;
      continue;
    }
    if (a.type === 'demo') {
      await player.play(demoScenes(script, problem, seed));
      return { correct: false, firstTry: false, miss };
    }
    const res = answerScenes(script, problem, a.value, tries, seed + tries);
    if (!res.correct && miss === undefined) miss = res.diagnosis?.kind;
    await player.play(res.scenes);
    if (res.correct) return { correct: true, firstTry: tries === 1, miss };
    if (!res.retry) return { correct: false, firstTry: false, miss };
    // 자리점 성은 화면 주판의 수를 다시 읽어야 하니 털지 않는다
    if (script.kind !== 'tt' && script.kind !== 'place' && !(script.kind === 'decimal' && problem.type === 'read') && script.mode !== 'listen' && script.mode !== 'flash') await player.play([{ kind: 'abacus-clear' }]);
    if (script.mode === 'listen' || script.mode === 'flash') await player.play(ask()); // 다시 들려주고 다시 보여 준다
  }
  return { correct: false, firstTry: false, miss };
}

function makeTimer() {
  const start = performance.now();
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
async function runRound(script) {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const { problems, bonus } = islandRound(script, seed, data.rounds);
  const before = data.rounds.slice();
  const record = { lesson: script.id, date: new Date().toISOString().slice(0, 10), finished: false, seconds: null, results: [], bonus: null };
  const opts = {};
  renderProgress(problems.length, record.results, 0, false);
  if (script.kind === 'tt') setAbacusVisible(false);
  await player.play([say(script, 'round-start', seed, { title: script.title, count: problems.length })]);
  if (script.mode === 'flash') {
    await player.say('먼저 빠르기를 골라요.');
    opts.flashMs = await askFlashSpeed();
  }
  const timer = makeTimer();
  for (let i = 0; i < problems.length; i++) {
    if (player.stopped) break;
    renderProgress(problems.length, record.results, i, false);
    const p = problems[i];
    const res = await solveOne(script, p, i + 1, seed + i * 7, timer, opts);
    if (!res) break;
    record.results.push({ key: p.key, features: p.features, a: p.a, ...res });
    renderProgress(problems.length, record.results, i + 1, false);
    if (i < problems.length - 1 && script.kind !== 'tt') await player.say(script.lines.next[0]);
  }
  if (!player.stopped && record.results.length === problems.length) {
    record.finished = true;
    record.seconds = Math.round(timer.seconds());
    if (bonus) {
      await player.play([say(script, 'bonus-ask', seed)]);
      if (await askYesNo()) {
        renderProgress(problems.length, record.results, 'bonus', true);
        await player.play([say(script, 'bonus-intro', seed)]);
        const res = await solveOne(script, bonus, 'bonus', seed + 1000, makeTimer(), opts);
        if (res) record.bonus = { key: bonus.key, ...res };
      }
    }
  }
  if (record.results.length > 0) {
    data.rounds.push(record);
    saveData(data);
  }
  player.reset();
  // 기술 지도는 끝까지 못 풀어도 푼 만큼 바뀐다
  const ups = newlyDone(before, data.rounds);
  const lvBefore = overallLevel(skillMap(before));
  const lvAfter = overallLevel(skillMap(data.rounds));
  const celebrate = [];
  for (const s of ups) celebrate.push({ kind: 'pop', icon: '🗺️', title: '기술 "됨"!', name: s.name }, say(script, 'skill-done', seed, { skill: s.name }));
  if (lvAfter.level > lvBefore.level) celebrate.push({ kind: 'pop', icon: '⬆️', title: '레벨 업!', name: `Lv.${lvAfter.level} ${lvAfter.title}` }, say(script, 'level-up', seed, { level: lvAfter.level, title: lvAfter.title }));
  if (celebrate.length && !leaving) await player.play(celebrate);
  if (record.finished) {
    const sameIsland = before.filter((r) => r.lesson === script.id);
    await player.play(roundEndScenes(script, {
      correct: record.results.filter((r) => r.correct).length,
      total: problems.length,
      seconds: record.seconds,
      best: bestSeconds(sameIsland),
      badges: newBadges(before, data.rounds),
    }, seed));
  } else if (!leaving) {
    await player.play([{ kind: 'say', text: '오늘은 여기까지 해요. 수고했어요.', pose: 'talk' }, { kind: 'fall' }]);
  }
}

let running = false;
let leaving = false; // 지도로 나가는 중이면 인사 없이 끝낸다
let currentIsland = null;
let runPromise = Promise.resolve();
/** 섬 열기. 앞 판이 정리되는 중이면 끝날 때까지 기다렸다가 연다 */
function openPlay(islandId, mode) {
  runPromise = runPromise.then(() => startPlay(islandId, mode));
  return runPromise;
}
async function startPlay(islandId, mode) {
  const script = SCRIPTS[islandId];
  if (running || !script) return;
  running = true;
  leaving = false;
  currentIsland = islandId;
  lastIsland = islandId;
  $('#map').hidden = true;
  $('#play').hidden = false;
  ['again-round', 'back-map', 'done', 'yes', 'no', 'demo'].forEach((a) => show(a, false));
  ['again', 'slower', 'stop'].forEach((a) => show(a, true));
  $('#nametag').textContent = data.teacherName;
  teacher.setOutfit(data.outfit);
  board.clear();
  setAbacusVisible(true);
  abacus.setup();
  abacus.showLabels(true);
  player.reset();
  await teacher.standUp();
  try {
    if (mode === 'lecture') {
      $('#progress').innerHTML = `<span class="progress-title">📖 강의: ${script.title}</span>`;
      await playLecture(script, crypto.getRandomValues(new Uint32Array(1))[0]);
      player.reset();
      if (!leaving) await player.play([say(script, 'lecture-end', 0), { kind: 'fall' }]);
    } else {
      await runRound(script);
    }
  } finally {
    running = false;
    ['again', 'slower', 'stop', 'done', 'yes', 'no', 'demo'].forEach((a) => show(a, false));
    show('again-round', mode !== 'lecture');
    show('back-map', true);
  }
}

function toMap() {
  leaving = true;
  stopAll();
  stopSpeaking();
  $('#play').hidden = true;
  $('#map').hidden = false;
  data = loadData();
  renderMap();
  document.querySelector('.here-island')?.scrollIntoView({ block: 'center', inline: 'center' });
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
  if (act === 'again-round') return openPlay(currentIsland, 'round');
  if (act === 'defense') {
    $('#map').hidden = true;
    $('#defense').hidden = false;
    return defense.open();
  }
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

const defense = createDefense($('#defense'), {
  load: loadData,
  save: saveData,
  onExit: () => {
    $('#defense').hidden = true;
    $('#map').hidden = false;
    data = loadData();
    renderMap();
  },
});

renderMap();
// 처음 열 때 지금 풀 섬이 보이게
document.querySelector('.here-island')?.scrollIntoView({ block: 'center', inline: 'center' });
window.addEventListener('pagehide', () => {
  stopSpeaking();
  stopListening();
});
voicesReady();
prepareEndSound();
registerServiceWorker();
