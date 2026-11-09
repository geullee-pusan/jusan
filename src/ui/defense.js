// 게임 모드 "주판 성 지키기" 화면(2026-11-10). 계산은 src/core/defense.js가 한다.
//  - 게임 전에 시작 레벨만 고른다. 몬스터를 10마리 무찌를 때마다 레벨이 하나 오르고,
//    몬스터가 서서히 세지고 빨라지며 배경도 더 험한 땅으로 바뀐다(부모 결정, 2026-11-10).
//  - 블록 몬스터가 오른쪽에서 성으로 다가온다. 머리 위의 문제를 풀어 답을 말하거나 숫자판으로 넣으면 무찌른다.
//  - 마이크는 게임 내내 듣는다. 숫자가 들리면 바로 제출한다.
//  - 성에 닿으면 성벽이 한 칸 깎인다. 세 칸이 다 깎이면 끝. 언제든 멈추거나 그만할 수 있다.
import { ENEMIES, levelAfter, levelInfo, makeEnemy, matchAnswer, PER_LEVEL, positionAt, reached, scoreFor, spawnGap, stageOf, STAGES, START_LEVELS, typesAt, WALLS } from '../core/defense.js';
import { pickSpokenNumber } from '../core/numhear.js';
import { listenOnce, listenSupported, stopListening } from './listen.js';
import { sfx } from './sfx.js';

const fmt = (n) => n.toLocaleString('ko-KR');
// 몬스터 그림(부모가 만든 그림을 scripts/make-art.mjs로 다듬은 것). 그림이 아직 없는 몬스터는 블록 모양으로 그린다.
const ART = import.meta.glob('../content/monsters/*.webp', { eager: true, import: 'default' });
/** 화면에 그리는 너비(px). 셀수록 크다 */
const ART_WIDTH = { slime: 76, bat: 96, mushroom: 70, spider: 90, zombie: 66, skeleton: 66, ghost: 74, goblin: 70, golem: 100, knight: 80, witch: 80, dragon: 124, giant: 100, lava: 104, boss: 116 };
/** 날거나 떠 있는 몬스터(땅 그림자를 작게, 위아래로 떠다님) */
const FLYING = new Set(['bat', 'ghost']);
const monHTML = (type) => {
  const src = ART[`../content/monsters/${type}.webp`];
  if (!src) return `<div class="mon ${type}"><i></i></div>`;
  return `<div class="mon art ${type} ${FLYING.has(type) ? 'fly' : 'walk'}" style="--w:${ART_WIDTH[type] ?? 80}px"><img src="${src}" alt="" draggable="false"></div>`;
};

/**
 * @param {HTMLElement} root
 * @param {{load: () => object, save: (data: object) => void, onExit: () => void}} io
 */
export function createDefense(root, io) {
  root.innerHTML = `
    <header class="play-top">
      <button class="block-btn small" data-d="exit">🗺️ 지도</button>
      <h2 class="def-title">🏰 주판 성 지키기</h2>
      <span></span>
    </header>
    <section class="panel def-setup" id="def-setup">
      <p>몬스터가 성으로 다가와요. 머리 위 문제를 풀어 답을 말하면 무찔러요.</p>
      <p>몬스터를 ${PER_LEVEL}마리 무찌를 때마다 레벨이 올라요. 레벨이 오르면 몬스터가 조금씩 세지고 빨라져요.</p>
      <div class="def-row"><b>시작 레벨</b><span class="def-choices" data-choice="startLevel"></span></div>
      <div class="def-legend" id="def-legend"></div>
      <p class="def-best" id="def-best"></p>
      <button class="block-btn green big" data-d="start">⚔️ 시작</button>
    </section>
    <section class="def-game" id="def-game" hidden>
      <div class="def-hud">
        <span class="def-walls" id="def-walls"></span>
        <span>점수 <b id="def-score">0</b></span>
        <span class="def-lv">Lv.<b id="def-level">1</b></span>
        <span>무찌름 <b id="def-count">0</b></span>
        <button class="block-btn small" data-d="pause">⏸️ 멈춤</button>
        <button class="block-btn small red" data-d="quit">그만</button>
      </div>
      <div class="def-field" id="def-field">
        <div class="def-castle" id="def-castle"><div class="def-flag">🚩</div></div>
        <div class="def-lane" style="--lane:0"></div><div class="def-lane" style="--lane:1"></div><div class="def-lane" style="--lane:2"></div>
        <div class="def-levelup" id="def-levelup" hidden></div>
        <div class="def-paused" id="def-paused" hidden>⏸️ 멈췄어요<br><small>다시 하려면 ▶️ 계속</small></div>
      </div>
      <div class="answer panel def-answer">
        <div class="answer-head"><span id="def-mic" class="mic">🎤 답을 말해요</span><span id="def-heard" class="heard"></span></div>
        <div class="answer-show" id="def-show"></div>
        <div class="keys" id="def-keys"></div>
      </div>
    </section>
    <section class="panel def-result" id="def-result" hidden></section>
  `;
  const $ = (s) => root.querySelector(s);
  let data = io.load();
  const saved = Number(data.defenseSettings?.startLevel);
  const settings = { startLevel: saved >= 1 && saved <= START_LEVELS ? saved : 1 };

  // ---- 설정 ----
  const CHOICES = {
    startLevel: Array.from({ length: START_LEVELS }, (_, i) => [i + 1, `Lv.${i + 1}`]),
  };
  function renderSetup() {
    for (const box of root.querySelectorAll('[data-choice]')) {
      const key = box.dataset.choice;
      box.innerHTML = '';
      for (const [value, label] of CHOICES[key]) {
        const b = document.createElement('button');
        b.className = `block-btn small ${String(settings[key]) === String(value) ? 'gold' : ''}`;
        b.textContent = label;
        b.onclick = () => {
          sfx('tap');
          settings[key] = Number(value);
          renderSetup();
        };
        box.appendChild(b);
      }
    }
    const lv = settings.startLevel;
    $('#def-legend').innerHTML = `<b>Lv.${lv}</b> · ${STAGES[stageOf(lv) - 1]} · 몬스터가 성까지 ${levelInfo(lv).travel}초<br>나오는 몬스터: ${typesAt(lv).map((t) => `<span class="mon-mini">${monHTML(t)}</span> ${ENEMIES[t].name}(${ENEMIES[t].points}점)`).join(' · ')}`;
    const best = data.defense ?? {};
    $('#def-best').textContent = best.bestScore ? `최고 점수 ${fmt(best.bestScore)}점 · 가장 높이 간 레벨 Lv.${best.bestLevel ?? 1}` : '아직 기록이 없어요. 첫 판을 해 봐요!';
  }

  // ---- 게임 ----
  let game = null;
  const field = $('#def-field');

  function problemHTML(p) {
    if (p.kind === 'mul') return `<div class="q-mul">${fmt(p.a)} × ${fmt(p.b)}</div>`;
    return `<div class="q-rows">${p.rows.map((r, i) => `<span>${i === 0 ? '' : r < 0 ? '−' : '+'}</span><span>${fmt(Math.abs(r))}</span>`).join('')}</div>`;
  }

  function start() {
    data = io.load();
    data.defenseSettings = { startLevel: settings.startLevel };
    io.save(data);
    game = {
      seed: crypto.getRandomValues(new Uint32Array(1))[0],
      enemies: [],
      level: settings.startLevel,
      nextSpawn: 1,
      t: 0,
      last: performance.now(),
      paused: false,
      walls: WALLS,
      score: 0,
      defeated: [],
      gone: new Set(),
      els: new Map(),
      over: false,
    };
    for (const lane of root.querySelectorAll('.def-lane')) lane.innerHTML = '';
    field.dataset.stage = stageOf(game.level);
    $('#def-levelup').hidden = true;
    $('#def-setup').hidden = true;
    $('#def-result').hidden = true;
    $('#def-game').hidden = false;
    $('#def-paused').hidden = true;
    root.querySelector('[data-d=pause]').textContent = '⏸️ 멈춤';
    renderHud();
    buildKeys();
    requestAnimationFrame(frame);
    listenLoop();
  }

  function renderHud() {
    $('#def-walls').innerHTML = Array.from({ length: WALLS }, (_, i) => `<i class="wall ${i < game.walls ? '' : 'broken'}">${i < game.walls ? '🧱' : '💥'}</i>`).join('');
    $('#def-score').textContent = fmt(game.score);
    $('#def-level').textContent = game.level;
    const left = PER_LEVEL - (game.defeated.length % PER_LEVEL);
    $('#def-count').textContent = `${game.defeated.length}마리 · 다음 레벨까지 ${left}`;
    $('#def-castle').classList.toggle('hurt', game.walls < WALLS);
  }

  function frame(now) {
    if (!game || game.over) return;
    // 화면이 가려졌다 돌아오면 그동안의 시간을 한꺼번에 더하지 않는다(몬스터가 순간 이동하지 않게)
    const dt = Math.min(0.1, (now - game.last) / 1000);
    game.last = now;
    if (!game.paused) game.t += dt;
    const lanes = root.querySelectorAll('.def-lane');
    // 몬스터는 끝없이 나온다. 나올 때의 레벨로 종류와 빠르기가 정해진다
    while (game.t >= game.nextSpawn) {
      const taken = game.enemies.filter((e) => !game.gone.has(e.id)).map((e) => e.answer);
      const e = makeEnemy(game.seed, game.enemies.length, game.level, game.nextSpawn, taken);
      game.enemies.push(e);
      game.nextSpawn += spawnGap(game.level);
      const el = document.createElement('div');
      el.className = `enemy ${e.type}`;
      el.innerHTML = `<div class="bubble">${problemHTML(e.problem)}</div>${monHTML(e.type)}`;
      lanes[e.lane].appendChild(el);
      game.els.set(e.id, el);
    }
    const alive = game.enemies.filter((e) => !game.gone.has(e.id));
    for (const e of alive) game.els.get(e.id).style.left = `${(1 - positionAt(e, game.t)) * 100}%`;
    for (const e of reached(alive, game.t)) {
      game.gone.add(e.id);
      game.els.get(e.id)?.remove();
      game.walls--;
      sfx('wall');
      field.classList.remove('quake');
      void field.offsetWidth;
      field.classList.add('quake');
      renderHud();
    }
    if (game.walls <= 0) return finish();
    requestAnimationFrame(frame);
  }

  function submit(value) {
    if (!game || game.over || game.paused) return false;
    const alive = game.enemies.filter((e) => !game.gone.has(e.id));
    const hit = matchAnswer(alive, value, game.t);
    const show = $('#def-show');
    if (!hit) {
      show.classList.remove('nope');
      void show.offsetWidth;
      show.classList.add('nope');
      $('#def-heard').textContent = `${fmt(value)}: 그 답을 가진 몬스터가 없어요`;
      return false;
    }
    const pos = positionAt(hit, game.t);
    game.score += scoreFor(hit, pos);
    game.gone.add(hit.id);
    game.defeated.push(hit);
    const el = game.els.get(hit.id);
    if (el) {
      el.classList.add('boom');
      setTimeout(() => el.remove(), 450);
    }
    sfx('correct');
    $('#def-heard').textContent = `${fmt(value)}! ${ENEMIES[hit.type].name} 무찌름`;
    const level = levelAfter(settings.startLevel, game.defeated.length);
    if (level > game.level) levelUp(level);
    renderHud();
    return true;
  }

  /** 레벨이 오르면 잠깐 알려 주고, 배경을 다음 땅으로 바꾼다 */
  function levelUp(level) {
    const stageBefore = stageOf(game.level);
    game.level = level;
    sfx('badge');
    const stage = stageOf(level);
    field.dataset.stage = stage;
    const box = $('#def-levelup');
    const newTypes = typesAt(level).filter((t) => !typesAt(level - 1).includes(t));
    const where = stage !== stageBefore ? `${STAGES[stage - 1]}에 왔어요. ` : '';
    const fresh = newTypes.length ? `<br>새 몬스터: ${newTypes.map((t) => `<span class="mon-mini">${monHTML(t)}</span> ${ENEMIES[t].name}`).join(' ')}` : '';
    box.innerHTML = `⬆️ 레벨 ${level}!<small>${where}몬스터가 조금 더 세지고 빨라져요${fresh}</small>`;
    box.hidden = false;
    box.classList.remove('show');
    void box.offsetWidth;
    box.classList.add('show');
    clearTimeout(game.levelTimer);
    game.levelTimer = setTimeout(() => (box.hidden = true), 2600);
  }

  // 숫자판
  let typed = '';
  function buildKeys() {
    typed = '';
    const show = () => ($('#def-show').textContent = typed ? fmt(Number(typed)) : ' ');
    show();
    const keys = $('#def-keys');
    keys.innerHTML = '';
    for (const label of ['1', '2', '3', '4', '5', '⌫', '6', '7', '8', '9', '0', '확인']) {
      const b = document.createElement('button');
      b.className = label === '확인' ? 'block-btn green' : 'block-btn';
      b.textContent = label;
      b.onclick = () => {
        sfx('tap');
        if (label === '⌫') typed = typed.slice(0, -1);
        else if (label === '확인') {
          if (typed) submit(Number(typed));
          typed = '';
        } else if (typed.length < 6) typed += label;
        show();
      };
      keys.appendChild(b);
    }
  }

  /** 게임 내내 듣는다. 숫자가 들리면 바로 제출한다 */
  async function listenLoop() {
    const mic = $('#def-mic');
    if (!listenSupported()) {
      mic.textContent = '⌨️ 숫자판으로 넣어요';
      return;
    }
    const my = game;
    while (game === my && !my.over) {
      if (my.paused) {
        mic.textContent = '⏸️ 멈춤';
        await new Promise((ok) => setTimeout(ok, 300));
        continue;
      }
      mic.textContent = '🎤 듣고 있어요…';
      const r = await listenOnce({ timeoutMs: 8000, onInterim: (t) => ($('#def-heard').textContent = t) });
      if (game !== my || my.over) return;
      if (r.error === 'not-allowed' || r.error === 'service-not-allowed') {
        mic.textContent = '⌨️ 마이크를 쓸 수 없어요. 숫자판으로 넣어요';
        return;
      }
      if (r.error && r.error !== 'no-speech' && r.error !== 'aborted') await new Promise((ok) => setTimeout(ok, 1000));
      const n = r.texts ? pickSpokenNumber(r.texts) : null;
      if (n !== null) {
        $('#def-show').textContent = fmt(n);
        submit(n);
      }
    }
  }

  // 다른 앱으로 가거나 화면이 꺼지면 저절로 멈춘다. 다시 시작은 아이가 누른다.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game && !game.over) setPaused(true);
  });

  function setPaused(on) {
    if (!game) return;
    game.paused = on;
    $('#def-paused').hidden = !on;
    root.querySelector('[data-d=pause]').textContent = on ? '▶️ 계속' : '⏸️ 멈춤';
    if (on) stopListening();
  }

  function finish(quit = false) {
    if (!game || game.over) return;
    game.over = true;
    stopListening();
    clearTimeout(game.levelTimer);
    data = io.load();
    data.defense ??= {};
    const prevBest = data.defense.bestScore ?? 0;
    const prevLevel = data.defense.bestLevel ?? 0;
    const newBest = game.score > prevBest;
    const newLevel = game.level > prevLevel && game.level > settings.startLevel;
    if (newBest) data.defense.bestScore = game.score;
    if (game.level > prevLevel) data.defense.bestLevel = game.level;
    const climbed = game.level - settings.startLevel;
    // 기술 지도: 무찌른 문제만 "맞음"으로 넣는다(시간에 쫓기며 놓친 것은 셈하지 않는다)
    if (game.defeated.length) {
      data.rounds.push({
        lesson: 'defense',
        date: new Date().toISOString().slice(0, 10),
        finished: !quit,
        seconds: Math.round(game.t),
        results: game.defeated.map((e) => ({ lesson: ENEMIES[e.type].island, key: e.problem.key, features: e.problem.features, a: e.problem.a, firstTry: true, correct: true, timed: true, enemy: e.type })),
        bonus: null,
        defense: { startLevel: settings.startLevel, level: game.level, score: game.score, defeated: game.defeated.length },
      });
    }
    io.save(data);
    if (newBest || newLevel) sfx('badge');
    $('#def-game').hidden = true;
    const res = $('#def-result');
    res.hidden = false;
    res.innerHTML = `
      <h2>${quit ? '그만했어요' : '💥 성벽이 무너졌어요'}</h2>
      <div class="def-reach">Lv.${settings.startLevel} → <b>Lv.${game.level}</b></div>
      <p>${climbed > 0 ? `레벨을 ${climbed}번 올렸어요.` : '이번에는 레벨이 그대로예요.'}${newLevel ? ' 🎉 가장 높이 간 레벨이에요!' : ''}</p>
      <p>점수 <b>${fmt(game.score)}</b>점${newBest ? ' · 🎉 새 최고 점수!' : ` · 최고 ${fmt(Math.max(prevBest, game.score))}점`}</p>
      <p>무찌른 몬스터 ${game.defeated.length}마리</p>
      <div class="controls"><button class="block-btn green big" data-d="again">⚔️ 한 판 더</button><button class="block-btn big" data-d="setup">⚙️ 시작 레벨 바꾸기</button><button class="block-btn big" data-d="exit">🗺️ 지도로</button></div>`;
  }

  root.addEventListener('click', (e) => {
    const act = e.target.closest('[data-d]')?.dataset.d;
    if (!act) return;
    sfx('tap');
    if (act === 'start' || act === 'again') start();
    if (act === 'pause') setPaused(!game?.paused);
    if (act === 'quit') finish(true);
    if (act === 'setup') {
      $('#def-result').hidden = true;
      $('#def-setup').hidden = false;
      renderSetup();
    }
    if (act === 'exit') {
      if (game && !game.over) finish(true);
      stopListening();
      io.onExit();
    }
  });

  return {
    open() {
      data = io.load();
      $('#def-setup').hidden = false;
      $('#def-game').hidden = true;
      $('#def-result').hidden = true;
      renderSetup();
    },
    close() {
      if (game && !game.over) finish(true);
      stopListening();
    },
  };
}
