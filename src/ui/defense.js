// 게임 모드 "주판 성 지키기" 화면(2026-11-10). 계산은 src/core/defense.js가 한다.
//  - 게임 전에 시작 레벨만 고른다. 몬스터를 10마리 무찌를 때마다 레벨이 하나 오르고,
//    몬스터가 서서히 세지고 빨라지며 배경도 더 험한 땅으로 바뀐다(부모 결정, 2026-11-10).
//  - 블록 몬스터가 오른쪽에서 성으로 다가온다. 머리 위의 문제를 풀어 답을 말하거나 숫자판으로 넣으면 무찌른다.
//  - 마이크는 게임 내내 듣는다. 숫자가 들리면 바로 제출한다.
//  - 성에 닿으면 성벽이 한 칸 깎인다. 세 칸이 다 깎이면 끝. 언제든 멈추거나 그만할 수 있다.
import { ENEMIES, levelAfter, levelInfo, makeEnemy, matchAnswer, PER_LEVEL, positionAt, reached, scoreFor, spawnGap, stageOf, STAGES, START_LEVELS, typesAt, WALLS } from '../core/defense.js';
import { pickSpokenNumber } from '../core/numhear.js';
import { listenOnce, listenSupported, stopListening } from './listen.js';
import { audioContext, isSfxMuted, sfx } from './sfx.js';

const fmt = (n) => n.toLocaleString('ko-KR');
// 몬스터 그림(부모가 만든 그림을 scripts/make-art.mjs로 다듬은 것). 그림이 아직 없는 몬스터는 블록 모양으로 그린다.
const ART = import.meta.glob('../content/monsters/*.webp', { eager: true, import: 'default' });
// 배경 그림(레벨 단계마다 하나, bg-1 ~ bg-5)
const BACKDROPS = import.meta.glob('../content/backgrounds/bg-*.webp', { eager: true, import: 'default' });
/**
 * 배경 그림마다 땅이 시작하는 높이(그림 위에서부터, %). 그 위는 하늘과 먼 산이다.
 * 땅에서 걷는 몬스터는 이 아래 땅에만 선다(부모 결정, 2026-11-10). 지평선보다 조금 아래로 잡는다.
 * 새 배경 그림을 넣으면 그림을 보고 여기에 더한다. 없으면 GROUND_DEFAULT를 쓴다.
 */
const GROUND = { 1: 60, 2: 50, 3: 40, 4: 62, 5: 62 };
const GROUND_DEFAULT = 55;
/**
 * 엄폐물(바위, 덤불, 종유석 등). 몬스터가 그 뒤를 지나가 엄폐물 뒤에서 나오는 것처럼 보인다(부모 결정, 2026-11-10).
 * 배경을 실감 나게 하려는 것뿐이다. 몬스터는 늘 오른쪽 끝에서 같은 빠르기로 오고, 난이도는 바뀌지 않는다.
 * 배경 그림 좌표(그림 크기 W×H)로 테두리를 따 두고, 같은 그림을 그 모양으로 오려 몬스터 위에 겹친다.
 * lane: 이 엄폐물 바로 뒤에 서는 줄(엄폐물 밑동이 그 줄의 발 높이와 맞는 것). 그보다 앞줄 몬스터는 엄폐물 앞으로 지나간다.
 * 새 배경을 넣으면 그림을 보고 여기에 더한다. 멀리 있는 덤불처럼 어느 줄보다 뒤에 있는 것은 넣지 않는다.
 */
const COVERS = {
  3: {
    W: 922, H: 434, list: [
      { lane: 0, poly: [[748, 262], [756, 222], [774, 200], [796, 190], [818, 198], [834, 214], [848, 206], [872, 200], [900, 204], [922, 210], [922, 278], [790, 272]] },
      { lane: 2, poly: [[838, 434], [846, 384], [860, 346], [880, 326], [902, 330], [922, 336], [922, 434]] },
    ],
  },
  4: {
    W: 922, H: 434, list: [
      { lane: 0, poly: [[758, 326], [764, 300], [778, 289], [802, 284], [830, 289], [860, 282], [890, 279], [922, 285], [922, 332]] },
      { lane: 2, poly: [[856, 434], [864, 398], [874, 370], [886, 368], [894, 398], [904, 418], [914, 384], [922, 378], [922, 434]] },
    ],
  },
  // 용암 땅: 성 바로 앞(왼쪽 아래 바위판)은 몬스터 문제를 가리므로 넣지 않는다
  5: {
    W: 922, H: 434, list: [
      { lane: 0, poly: [[790, 346], [800, 312], [830, 303], [870, 298], [922, 296], [922, 346]] },
      { lane: 2, poly: [[520, 434], [546, 402], [600, 382], [680, 366], [740, 356], [782, 372], [800, 434]] },
      { lane: 2, poly: [[866, 434], [872, 300], [886, 250], [900, 216], [914, 200], [922, 204], [922, 434]] },
    ],
  },
};

// 성 그림(없으면 회색 블록 성)
const CASTLE = Object.values(import.meta.glob('../content/backgrounds/castle.webp', { eager: true, import: 'default' }))[0];
/** 화면에 그리는 너비(px). 셀수록 크다 */
const ART_WIDTH = { slime: 76, bat: 96, mushroom: 70, spider: 90, zombie: 66, skeleton: 66, ghost: 74, goblin: 70, golem: 100, knight: 80, witch: 80, dragon: 124, giant: 100, lava: 104, boss: 116, raven: 98, gargoyle: 104 };
/** 들어 있는 배경음악 곡 번호(public/music/bgm-N.mp3). 곡을 더하면 여기에 번호를 더한다 */
const MUSIC_TRACKS = [1, 2, 3, 4, 5];
const MUSIC_VOLUME = 0.22;
/** 고유 동작을 하는 때(길의 몇 %). 몬스터 번호로 고른다. 한 마리가 두 번 한다 */
const ACT_AT = [[0.22, 0.6], [0.34, 0.72], [0.28, 0.52]];
/** 고유 동작에 붙는 효과 */
/** 고유 동작 소리(src/ui/sfx.js) */
const ACT_SOUND = { slime: 'boing', bat: 'flap', raven: 'flap', gargoyle: 'flap', witch: 'cackle', mushroom: 'puff', spider: 'skitter', goblin: 'skitter', zombie: 'groan', skeleton: 'rattle', ghost: 'wail', golem: 'stomp', giant: 'stomp', knight: 'clank', dragon: 'roar', lava: 'erupt', boss: 'summon' };
const ACT_FX = { gargoyle: 'dust', mushroom: 'spores', golem: 'dust', giant: 'dust', knight: 'dust', dragon: 'fire', lava: 'embers', boss: 'aura', witch: 'sparks', ghost: 'aura-blue', slime: 'drops' };
/** 날거나 떠 있는 몬스터(땅 그림자를 작게, 위아래로 떠다님) */
const FLYING = new Set(['bat', 'ghost', 'witch', 'raven', 'gargoyle']);
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
        <button class="block-btn small" data-d="music">🎵 끔</button>
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
  if (CASTLE) {
    $('#def-castle').classList.add('art');
    $('#def-castle').style.setProperty('--castle-mask', `url(${CASTLE})`); // 성 모양대로 색을 입힌다
    $('#def-castle').innerHTML = `<img src="${CASTLE}" alt="" draggable="false">`;
    field.classList.add('castle-art');
  }

  /** 배경 땅을 바꾼다. 그림이 있으면 그림을, 없으면 색으로 그린 땅을 쓴다 */
  function setStage(stage) {
    field.dataset.stage = stage;
    const src = BACKDROPS[`../content/backgrounds/bg-${stage}.webp`];
    field.classList.toggle('has-bg', Boolean(src));
    field.style.setProperty('--ground', `${GROUND[stage] ?? GROUND_DEFAULT}%`);
    field.style.backgroundImage = src ? `url(${src})` : '';
    placeCovers();
  }

  /**
   * 엄폐물 겹그림을 놓는다.
   * 배경은 들판을 덮도록 키우고 아래에 맞춘다(CSS의 cover + center bottom과 같은 계산).
   */
  function placeCovers() {
    for (const el of field.querySelectorAll('.def-cover')) el.remove();
    const stage = Number(field.dataset.stage);
    const src = BACKDROPS[`../content/backgrounds/bg-${stage}.webp`];
    const info = COVERS[stage];
    if (!src || !info) return;
    const fw = field.clientWidth, fh = field.clientHeight;
    if (!fw || !fh) return;
    const scale = Math.max(fw / info.W, fh / info.H);
    const rw = info.W * scale, rh = info.H * scale;
    const left = (fw - rw) / 2, top = fh - rh;
    for (const c of info.list) {
      const el = document.createElement('div');
      el.className = 'def-cover';
      el.style.cssText = `left:${left}px;top:${top}px;width:${rw}px;height:${rh}px;background-image:url(${src});z-index:${11 + c.lane * 2};clip-path:polygon(${c.poly.map(([x, y]) => `${(x / info.W) * 100}% ${(y / info.H) * 100}%`).join(',')})`;
      field.appendChild(el);
    }
  }
  window.addEventListener('resize', () => {
    if (!root.hidden && field.offsetParent) placeCovers();
  });

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
      acted: new Map(), // 몬스터마다 고유 동작을 몇 번 했는지
      over: false,
    };
    for (const lane of root.querySelectorAll('.def-lane')) lane.innerHTML = '';
    setStage(stageOf(game.level));
    $('#def-levelup').hidden = true;
    $('#def-setup').hidden = true;
    $('#def-result').hidden = true;
    $('#def-game').hidden = false;
    placeCovers(); // 화면이 보인 뒤에야 들판 크기를 잴 수 있다
    $('#def-paused').hidden = true;
    root.querySelector('[data-d=pause]').textContent = '⏸️ 멈춤';
    renderHud();
    buildKeys();
    requestAnimationFrame(frame);
    listenLoop();
    renderMusicButton();
    musicUpdate();
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
      sfx('appear');
    }
    const alive = game.enemies.filter((e) => !game.gone.has(e.id));
    for (const e of alive) {
      const el = game.els.get(e.id);
      const pos = positionAt(e, game.t);
      el.style.left = `${(1 - pos) * 100}%`;
      el.style.setProperty('--p', pos.toFixed(3)); // 성에 다가올수록 커지고 앞으로 나온다(CSS)
      // 고유 동작: 길의 정해진 두 곳에서 한 번씩. 보기만 바뀌고 위치와 빠르기는 그대로다(난이도 그대로)
      const at = ACT_AT[e.id % ACT_AT.length];
      const done = game.acted.get(e.id) ?? 0;
      if (done < at.length && pos >= at[done]) {
        game.acted.set(e.id, done + 1);
        act(el, e.type);
      }
    }
    // 성에 닿은 몬스터: 성을 한 번 공격하고(성벽 한 칸), 공격에 성공한 듯 물러나며 사라진다
    for (const e of reached(alive, game.t)) {
      game.gone.add(e.id); // 이제 답으로 무찌를 수 없다
      strike(game.els.get(e.id), e.type);
    }
    if (!bgm.paused && isSfxMuted()) bgm.pause();
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
      sfx('nope');
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
    sfx('defeat');
    $('#def-heard').textContent = `${fmt(value)}! ${ENEMIES[hit.type].name} 무찌름`;
    const level = levelAfter(settings.startLevel, game.defeated.length);
    if (level > game.level) levelUp(level);
    renderHud();
    return true;
  }

  /**
   * 성 공격: 성으로 달려들어 한 번 치고(맞는 순간 성벽이 한 칸 깎인다), 물러나며 사라진다.
   * 걷는 몬스터는 뒤로 물러나며 흐려지고, 나는 몬스터는 위로 날아가 버린다.
   * 성벽이 다 깎이면 마지막 공격 장면을 잠깐 보여 주고 끝낸다.
   */
  function strike(el, type) {
    const my = game;
    if (!el) return;
    el.classList.add('striking', FLYING.has(type) ? 'fly-off' : 'walk-off');
    sfx(ACT_SOUND[type]);
    setTimeout(() => {
      if (game !== my || my.over) return;
      my.walls = Math.max(0, my.walls - 1);
      sfx('wall');
      field.classList.remove('quake');
      void field.offsetWidth;
      field.classList.add('quake');
      const castle = $('#def-castle');
      castle.classList.remove('hit');
      void castle.offsetWidth;
      castle.classList.add('hit');
      renderHud();
      if (my.walls <= 0 && !my.ending) {
        my.ending = true;
        setTimeout(() => game === my && finish(), 900);
      }
    }, 380);
    setTimeout(() => el.remove(), 1400);
  }

  /** 몬스터 고유 동작 한 번: 그림을 움직이고, 몬스터에 따라 효과(포자, 먼지, 불, 불씨, 기운)를 낸다 */
  function act(el, type) {
    const mon = el.querySelector('.mon.art');
    if (!mon) return;
    mon.classList.remove('acting');
    void mon.offsetWidth;
    mon.classList.add('acting');
    sfx(ACT_SOUND[type]);
    setTimeout(() => mon.classList.remove('acting'), 1100);
    const fx = ACT_FX[type];
    if (fx) {
      const s = document.createElement('span');
      s.className = `fx fx-${fx}`;
      mon.appendChild(s);
      setTimeout(() => s.remove(), 1300);
    }
  }

  /** 레벨이 오르면 잠깐 알려 주고, 배경을 다음 땅으로 바꾼다 */
  function levelUp(level) {
    const stageBefore = stageOf(game.level);
    game.level = level;
    sfx('levelup');
    // 레벨이 오르면 깎인 성벽을 한 칸 고친다(부모 결정, 2026-11-10). 이미 무너지는 중이면 고치지 않는다
    const healed = game.walls < WALLS && game.walls > 0 && !game.ending;
    if (healed) game.walls += 1;
    const stage = stageOf(level);
    setStage(stage);
    musicUpdate(); // 배경이 바뀌면 곡도 바뀐다
    const box = $('#def-levelup');
    const newTypes = typesAt(level).filter((t) => !typesAt(level - 1).includes(t));
    const where = stage !== stageBefore ? `${STAGES[stage - 1]}에 왔어요. ` : '';
    const fresh = newTypes.length ? `<br>새 몬스터: ${newTypes.map((t) => `<span class="mon-mini">${monHTML(t)}</span> ${ENEMIES[t].name}`).join(' ')}` : '';
    const heal = healed ? '<br>🧱 성벽 한 칸을 고쳤어요' : '';
    box.innerHTML = `⬆️ 레벨 ${level}!<small>${where}몬스터가 조금 더 세지고 빨라져요${heal}${fresh}</small>`;
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

  // ---- 배경음악(게임 모드에만, 2026-11-10) ----
  // public/music/bgm-N.mp3를 배경 단계에 맞춰 작게 되풀이한다. 게임 중에만 나고, 처음에는 켜져 있다(🎵 단추로 끈다).
  // 마이크로 답을 듣기 때문에 소리를 작게 한다. 소리 끄기를 해 두면 나오지 않는다.
  const bgm = new Audio();
  bgm.loop = true;
  bgm.volume = MUSIC_VOLUME;
  // 배경음악도 효과음과 같은 소리 길(Web Audio)로 내보낸다. 효과음이 나는 기기라면 음악도 나도록.
  // (마이크를 켜 둔 동안 일부 기기는 <audio> 소리만 밀어 내는데, 같은 길로 보내면 효과음과 같이 나온다)
  let bgmRouted = false;
  const routeBgm = () => {
    if (bgmRouted) return;
    try {
      const ac = audioContext();
      ac.createMediaElementSource(bgm).connect(ac.destination);
      bgmRouted = true;
    } catch {
      // 잇지 못하면 <audio>가 그대로 소리를 낸다
    }
  };
  const playBgm = () => {
    routeBgm();
    try {
      audioContext();
    } catch {
      // 소리 길을 못 여는 브라우저
    }
    bgm.play().catch(() => {});
  };
  let bgmTrack = 0;
  let bgmFading = false;

  /** 배경 단계에 쓸 곡: 그 단계 곡이 없으면 그보다 앞 단계 곡 */
  function trackFor(stage) {
    const ok = MUSIC_TRACKS.filter((n) => n <= stage);
    return ok.length ? ok.at(-1) : MUSIC_TRACKS[0];
  }

  function renderMusicButton() {
    root.querySelector('[data-d=music]').textContent = data.musicOff ? '🎵 끔' : '🎵 켬';
  }

  /** 지금 상태에 맞게 음악을 켜거나 끈다. 곡이 바뀌면 줄였다가 바꾼다 */
  function musicUpdate() {
    const want = Boolean(!data.musicOff && game && !game.over && !game.paused && !isSfxMuted() && MUSIC_TRACKS.length);
    if (!want) {
      bgm.pause();
      return;
    }
    const n = trackFor(stageOf(game.level));
    if (n === bgmTrack) {
      if (bgm.paused && !bgmFading) playBgm();
      return;
    }
    if (bgm.paused || !bgmTrack) {
      bgmTrack = n;
      bgm.src = `./music/bgm-${n}.mp3`;
      bgm.volume = MUSIC_VOLUME;
      playBgm();
      return;
    }
    // 곡 바꾸기: 0.6초 동안 줄이고, 바꾼 뒤 다시 키운다
    bgmFading = true;
    const steps = 6;
    const down = (i) => {
      bgm.volume = MUSIC_VOLUME * (1 - i / steps);
      if (i < steps) return setTimeout(() => down(i + 1), 100);
      bgmTrack = n;
      bgm.src = `./music/bgm-${n}.mp3`;
      playBgm();
      const up = (j) => {
        bgm.volume = MUSIC_VOLUME * (j / steps);
        if (j < steps) setTimeout(() => up(j + 1), 100);
        else bgmFading = false;
      };
      up(0);
    };
    down(0);
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
    musicUpdate();
  }

  function finish(quit = false) {
    if (!game || game.over) return;
    game.over = true;
    stopListening();
    musicUpdate();
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
    if (!quit) sfx('gameover');
    if (newBest || newLevel) setTimeout(() => sfx('badge'), quit ? 0 : 750);
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
    if (act === 'music') {
      data.musicOff = !data.musicOff;
      const saved = io.load();
      saved.musicOff = data.musicOff;
      io.save(saved);
      renderMusicButton();
      musicUpdate();
    }
    if (act === 'quit') finish(true);
    if (act === 'setup') {
      $('#def-result').hidden = true;
      $('#def-setup').hidden = false;
      renderSetup();
    }
    if (act === 'exit') {
      if (game && !game.over) finish(true);
      stopListening();
      bgm.pause();
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
      bgm.pause();
    },
  };
}
