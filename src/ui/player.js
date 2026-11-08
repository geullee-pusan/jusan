// 장면 재생기(docs/SPEC.md 7~8장). src/core/lesson.js가 만든 장면을 차례로 보여 주고 읽는다.
// 말할 때는 자막을 늘 보여 준다. 목소리는 하나로 일정하다(teacher.json의 voice).
import { playEndSound } from './end-sound.js';
import { speak as speakLine, stopSpeaking, wait } from './speech.js';

/**
 * @param {{teacher, board, abacus, caption: HTMLElement, voice: {pitch, rate},
 *          ui: {waitDone: (prompt: string) => Promise<string>}}} ctx
 *   ui.waitDone: "다 했어요"를 기다린다. 'done' 또는 'stop'을 돌려준다.
 */
export function createPlayer(ctx) {
  const { teacher, board, abacus, caption } = ctx;
  let stopped = false;
  let slow = 1; // "천천히요"를 누를 때마다 줄어든다
  let lastLine = null;

  async function say(text, pose = 'talk') {
    if (stopped) return;
    lastLine = { text, pose };
    caption.textContent = text;
    teacher.pose(pose);
    let started = false;
    const begin = () => {
      if (started) return;
      started = true;
      teacher.talking(true);
    };
    const early = setTimeout(begin, 300); // 소리가 늦게 시작해도 입은 곧 움직인다
    const voice = { pitch: ctx.voice.pitch, rate: ctx.voice.rate * slow };
    await speakLine(text, voice, { onStart: begin });
    clearTimeout(early);
    teacher.talking(false);
    await wait(180 / slow);
  }

  /** 장면 목록을 재생한다. 그만하면 false를 돌려준다. */
  async function play(scenes) {
    for (const scene of scenes) {
      if (stopped) return false;
      switch (scene.kind) {
        case 'say':
          await say(scene.text, scene.pose);
          if (scene.pose !== 'demo') teacher.pose('idle');
          break;
        case 'board-problem':
          board.problem(scene.a, scene.b);
          break;
        case 'board-list':
          board.list(scene.items);
          break;
        case 'abacus-clear':
          await abacus.clear(scene.columns);
          if (scene.start !== null && scene.start !== undefined) abacus.highlight(scene.start, 'start');
          break;
        case 'abacus-steps':
          teacher.pose('demo');
          await abacus.play(scene.steps, { stepMs: 700 / slow });
          teacher.pose('idle');
          break;
        case 'wait': {
          teacher.pose('idle');
          const r = await ctx.ui.waitDone(scene.prompt);
          if (r === 'stop') stopped = true;
          break;
        }
        case 'nod':
          await teacher.nod();
          break;
        case 'fall':
          caption.textContent = '';
          playEndSound(); // 쓰러지기 시작하는 순간에 소리가 난다
          await teacher.fall();
          await wait(500);
          break;
        default:
          throw new Error(`모르는 장면이에요: ${scene.kind}`);
      }
    }
    return !stopped;
  }

  return {
    play,
    say,
    /** 방금 한 말을 다시 한다 */
    async again() {
      if (lastLine) await say(lastLine.text, lastLine.pose);
    },
    slower() {
      slow = Math.max(0.6, slow * 0.85);
    },
    stop() {
      stopped = true;
      stopSpeaking();
    },
    get stopped() {
      return stopped;
    },
    reset() {
      stopped = false;
    },
  };
}
