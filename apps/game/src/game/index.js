import { LEVEL_COUNT } from '@mosaic/shared';
import { createAudioManager } from './audio.js';
import { createSaveStore } from './saveStore.js';
import { createPlayScene } from './scene/play.js';

export function createGameApp(platform) {
  const store = createSaveStore(platform.storage);
  const audio = createAudioManager(store);

  function share(from) {
    try {
      return Promise.resolve(platform.share({
        title: 'Mosaic · 宝石打砖块',
        imageUrl: 'assets/share/cover.png',
        query: 'from=' + from + '&level=' + store.get().highestLevel,
      })).then((ok) => ok !== false).catch(() => false);
    } catch {
      return Promise.resolve(false);
    }
  }

  const play = createPlayScene({
    platform,
    store,
    audio,
    onShare: () => share('pause'),
  });

  play.start(store.get().highestLevel);

  function frame(ctx, view, now) {
    play.draw(ctx, view, now);
  }

  function onPointer(event) {
    play.onPointer(event);
  }

  function onHide() {
    play.onHide();
  }

  function onShow() {
    play.onShow();
  }

  const debug = {
    getSnapshot() {
      const snapshot = play.snapshot() || {};
      return Object.assign({ save: Object.assign({}, store.get()), levelCount: LEVEL_COUNT }, snapshot, {
        rects: play.debugRects(),
      });
    },
    setSkillStacks(values) {
      return play.debugSetSkillStacks(values);
    },
    startLevel(id) {
      play.start(id);
      return true;
    },
    dismissModal() {
      return play.debugDismissModal();
    },
    forceClear() {
      return play.debugForceClear();
    },
    forceFail() {
      return play.debugForceFail();
    },
    useSkill(index) {
      return play.debugUseSkill(index);
    },
    castSkill(index) {
      return play.debugCastSkill(index);
    },
    triggerDebuff(kind) {
      return play.debugTriggerDebuff(kind);
    },
    click(x, y) {
      onPointer({ type: 'start', id: 'debug', x, y });
      onPointer({ type: 'end', id: 'debug', x, y });
      return true;
    },
    getRects() {
      return play.debugRects();
    },
    share() {
      return share('debug');
    },
  };

  if (typeof platform.debugInstall === 'function') platform.debugInstall(debug);

  return { frame, onPointer, onHide, onShow };
}
