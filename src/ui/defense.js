// 게임 모드 "주판 성 지키기" 화면(2026-11-10). 계산은 src/core/defense.js가 한다.
//  - 게임 전에 난이도, 적 빠르기, 적 수를 고른다(아이가 고른 빠르기만 쓴다).
//  - 블록 몬스터가 오른쪽에서 성으로 다가온다. 머리 위의 문제를 풀어 답을 말하거나 숫자판으로 넣으면 무찌른다.
//  - 마이크는 게임 내내 듣는다. 숫자가 들리면 바로 제출한다.
//  - 성에 닿으면 성벽이 한 칸 깎인다. 세 칸이 다 깎이면 끝. 언제든 멈출 수 있다.
import { DIFFICULTY, ENEMIES, makeWave, matchAnswer, positionAt, reached, scoreFor, SPEEDS, starsFor, WALLS } from '../core/defense.js';
import { pickSpokenNumber } from '../core/numhear.js';
import { listenOnce, listenSupported, stopListening } from './listen.js';
import { sfx } from './sfx.js';

const fmt = (n) => n.toLocaleString('ko-KR');
/** 무찌른 문제를 기술 지도에 넣을 때 쓰는 섬(문제 종류가 같은 섬) */
const ISLAND_OF = { slime: 'add-1', skeleton: 'add-4', golem: 'add-6', dragon: 'mul-1digit', boss: 'add-5' };

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
      <p>몬스터가 성으로 다가와요. 머리 위 문제를 풀어 답을 말하면 무찔러요. 강한 몬스터일수록 문제가 어려워요.</p>
      <div class="def-row"><b>난이도</b><span class="def-choices" data-choice="difficulty"></span></div>
      <div class="def-row"><b>몬스터 빠르기</b><span class="def-choices" data-choice="speed"></span></div>
      <div class="def-row"><b>몬스터 수</b><span class="def-choices" data-choice="count"></span></div>
      <div class="def-legend" id="def-legend"></div>
      <p class="def-best" id="def-best"></p>
      <button class="block-btn green big" data-d="start">⚔️ 시작</button>
    </section>
    <section class="def-game" id="def-game" hidden>
      <div class="def-hud">
        <span class="def-walls" id="def-walls"></span>
        <span>점수 <b id="def-score">0</b></span>
        <span>무찌름 <b id="def-count">0</b></span>
        <button class="block-btn small" data-d="pause">⏸️ 멈춤</button>
        <button class="block-btn small red" data-d="quit">그만</button>
      </div>
      <div class="def-field" id="def-field">
        <div class="def-castle" id="def-castle"><div class="def-flag">🚩</div></div>
        <div class="def-lane" style="--lane:0"></div><div class="def-lane" style="--lane:1"></div><div class="def-lane" style="--lane:2"></div>
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
  const settings = { difficulty: 'easy', speed: 'slow', count: 10, ...(data.defenseSettings ?? {}) };

  // ---- 설정 ----
  const CHOICES = {
    difficulty: Object.entries(DIFFICULTY).map(([k, v]) => [k, v.name]),
    speed: Object.entries(SPEEDS).map(([k, v]) => [k, `${v.name}(${v.travel}초)`]),
    count: [[10, '10마리'], [20, '20마리']],
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
          settings[key] = value;
          renderSetup();
        };
        box.appendChild(b);
      }
    }
    const d = DIFFICULTY[settings.difficulty];
    const types = [...Object.keys(d.mix), ...(d.boss ? ['boss'] : [])];
    $('#def-legend').innerHTML = `나오는 몬스터: ${types.map((t) => `<span class="mon mini ${t}"></span> ${ENEMIES[t].name}(${ENEMIES[t].points}점)`).join(' · ')}`;
    const best = data.defense?.best?.[settings.difficulty];
    $('#def-best').textContent = best ? `${d.name} 최고 점수: ${fmt(best)}점` : `${d.name}은 아직 기록이 없어요.`;
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
    data.defenseSettings = { ...settings };
    io.save(data);
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    const wave = makeWave(seed, settings);
    game = {
      wave,
      travel: SPEEDS[settings.speed].travel,
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
    $('#def-count').textContent = `${game.defeated.length}/${game.wave.length}`;
    $('#def-castle').classList.toggle('hurt', game.walls < WALLS);
  }

  function frame(now) {
    if (!game || game.over) return;
    // 화면이 가려졌다 돌아오면 그동안의 시간을 한꺼번에 더하지 않는다(몬스터가 순간 이동하지 않게)
    const dt = Math.min(0.1, (now - game.last) / 1000);
    game.last = now;
    if (!game.paused) game.t += dt;
    const lanes = root.querySelectorAll('.def-lane');
    for (const e of game.wave) {
      if (game.gone.has(e.id) || game.t < e.spawnAt) continue;
      let el = game.els.get(e.id);
      if (!el) {
        el = document.createElement('div');
        el.className = `enemy ${e.type}`;
        el.innerHTML = `<div class="bubble">${problemHTML(e.problem)}</div><div class="mon ${e.type}"></div>`;
        lanes[e.lane].appendChild(el);
        game.els.set(e.id, el);
      }
      const pos = positionAt(e, game.t, game.travel);
      el.style.left = `${(1 - pos) * 100}%`;
    }
    const alive = game.wave.filter((e) => !game.gone.has(e.id));
    for (const e of reached(alive, game.t, game.travel)) {
      game.gone.add(e.id);
      game.els.get(e.id)?.remove();
      game.walls--;
      sfx('wall');
      field.classList.remove('quake');
      void field.offsetWidth;
      field.classList.add('quake');
      renderHud();
    }
    if (game.walls <= 0 || game.gone.size === game.wave.length) return finish();
    requestAnimationFrame(frame);
  }

  function submit(value) {
    if (!game || game.over || game.paused) return false;
    const alive = game.wave.filter((e) => !game.gone.has(e.id));
    const hit = matchAnswer(alive, value, game.t, game.travel);
    const show = $('#def-show');
    if (!hit) {
      show.classList.remove('nope');
      void show.offsetWidth;
      show.classList.add('nope');
      $('#def-heard').textContent = `${fmt(value)}: 그 답을 가진 몬스터가 없어요`;
      return false;
    }
    const pos = positionAt(hit, game.t, game.travel);
    game.score += scoreFor(hit, pos);
    game.gone.add(hit.id);
    game.defeated.push(hit);
    const el = game.els.get(hit.id);
    if (el) {
      el.classList.add('boom');
      setTimeout(() => el.remove(), 450);
    }
    sfx('correct');
    $('#def-heard').textContent = `${fmt(value)}! ${ENEMIES[hit.type].name}을(를) 무찔렀어요`;
    renderHud();
    return true;
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
    const stars = quit ? 0 : starsFor(game.walls);
    const won = !quit && game.walls > 0;
    data = io.load();
    data.defense ??= { best: {} };
    data.defense.best ??= {};
    const prevBest = data.defense.best[settings.difficulty] ?? 0;
    const newBest = game.score > prevBest;
    if (newBest) data.defense.best[settings.difficulty] = game.score;
    // 기술 지도: 무찌른 문제만 "맞음"으로 넣는다(시간에 쫓기며 놓친 것은 셈하지 않는다)
    if (game.defeated.length) {
      data.rounds.push({
        lesson: 'defense',
        date: new Date().toISOString().slice(0, 10),
        finished: !quit,
        seconds: Math.round(game.t),
        results: game.defeated.map((e) => ({ lesson: ISLAND_OF[e.type], key: e.problem.key, features: e.problem.features, a: e.problem.a, firstTry: true, correct: true, timed: true })),
        bonus: null,
        defense: { difficulty: settings.difficulty, speed: settings.speed, count: settings.count, score: game.score, stars, walls: game.walls },
      });
    }
    io.save(data);
    if (won) sfx('badge');
    $('#def-game').hidden = true;
    const res = $('#def-result');
    res.hidden = false;
    res.innerHTML = `
      <h2>${quit ? '그만했어요' : won ? '🏰 성을 지켰어요!' : '💥 성벽이 무너졌어요'}</h2>
      <div class="def-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <p>점수 <b>${fmt(game.score)}</b>점${newBest ? ' · 🎉 새 최고 점수!' : ` · 최고 ${fmt(Math.max(prevBest, game.score))}점`}</p>
      <p>무찌른 몬스터 ${game.defeated.length}/${game.wave.length}마리 · 남은 성벽 ${game.walls}칸</p>
      <div class="controls"><button class="block-btn green big" data-d="again">⚔️ 한 판 더</button><button class="block-btn big" data-d="setup">⚙️ 설정 바꾸기</button><button class="block-btn big" data-d="exit">🗺️ 지도로</button></div>`;
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
