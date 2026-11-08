// 장면 재생기(docs/SPEC.md 7.3~7.5절). src/core/teacher.js가 만든 장면 목록을 차례로 보여 주고 읽는다.
// 말할 때는 자막을 늘 보여 준다. 목소리는 하나로 일정하다(teacher.json의 voice).
import { playEndSound } from './end-sound.js';
import { speak as speakLine, wait } from './speech.js';

/**
 * @param {{teacher: object, board: object, caption: HTMLElement, voice: object,
 *          waitDone: () => Promise<void>, getAnswer: () => Promise<number|null>}} ctx
 *   waitDone: 아이가 "다 했어요"를 할 때까지 기다린다. getAnswer: 아이의 답을 받는다(그만하면 null).
 */
export function createPlayer(ctx) {
  const { teacher, board, caption, voice } = ctx;
  let stopped = false;

  async function speak(text, pose) {
    caption.textContent = text;
    teacher.pose(pose ?? 'talk');
    let started = false;
    const begin = () => {
      if (started) return;
      started = true;
      teacher.talking(true);
    };
    // 소리가 늦게 시작해도 입은 곧 움직인다.
    const early = setTimeout(begin, 300);
    await speakLine(text, voice, { onStart: begin });
    clearTimeout(early);
    teacher.talking(false);
  }

  /** 장면 목록을 재생한다. listen 장면에서 받은 답을 돌려준다. */
  async function play(scenes) {
    stopped = false;
    let answer;
    let shownRows = 0;
    for (const scene of scenes) {
      if (stopped) break;
      switch (scene.kind) {
        case 'say':
          await speak(scene.text, scene.pose);
          teacher.pose('idle');
          break;
        case 'number':
          if (scene.row !== null && scene.show && scene.value !== null) {
            board.write(scene.sign, scene.value);
            shownRows++;
          } else if (scene.row !== null && scene.value !== null) {
            board.listening(scene.row + 1);
          }
          await speak(scene.text, scene.pose);
          await wait(250); // 줄 사이 쉼(나중에 아이가 고르는 빠르기로 바꾼다)
          break;
        case 'clear':
          board.clear();
          shownRows = 0;
          break;
        case 'wait':
          teacher.pose('idle');
          if (shownRows) board.line();
          caption.textContent = '다 놓았으면 "다 했어요"를 눌러요.';
          await ctx.waitDone();
          break;
        case 'listen':
          teacher.pose('listen');
          caption.textContent = '🎤 답을 기다려요';
          answer = await ctx.getAnswer();
          teacher.pose('idle');
          if (answer === null) stopped = true;
          break;
        case 'nod':
          await teacher.nod();
          break;
        case 'fall':
          caption.textContent = '';
          await teacher.fall();
          playEndSound();
          await wait(500);
          break;
        default:
          throw new Error(`모르는 장면이에요: ${scene.kind}`);
      }
    }
    return answer;
  }

  return {
    play,
    stop() {
      stopped = true;
    },
  };
}
