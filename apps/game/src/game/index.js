import { LEVEL_COUNT } from '@mosaic/shared';
import { createAudioManager } from './audio.js';
import { createSaveStore } from './saveStore.js';
import { createHomeScene } from './scene/home.js';
import { createPlayScene } from './scene/play.js';

export function createGameApp(platform) {
  const store = createSaveStore(platform.storage);
  const audio = createAudioManager(store);
  let scene = 'home';

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

  function openLevel(id) {
    scene = 'play';
    play.start(id);
  }

  function backHome() {
    scene = 'home';
    store.reload();
  }

  const home = createHomeScene({
    platform,
    store,
    audio,
    onStart: openLevel,
    onShare: () => share('home'),
  });

  const play = createPlayScene({
    platform,
    store,
    audio,
    onExit: backHome,
    onShare: () => share('pause'),
  });

  function frame(ctx, view, now) {
    if (scene === 'home') home.draw(ctx, view, now);
    else play.draw(ctx, view, now);
  }

  function onPointer(event) {
    if (scene === 'home') home.onPointer(event);
    else play.onPointer(event);
  }

  function onHide() {
    if (scene === 'play') play.onHide();
  }

  function onShow() {
    if (scene === 'play') play.onShow();
  }

  const debug = {
    getSnapshot() {
      const save = Object.assign({}, store.get());
      if (scene === 'home') {
        return {
          scene: 'home',
          save,
          levelCount: LEVEL_COUNT,
          rects: home.debugRects(),
        };
      }
      const snapshot = play.snapshot() || {};
      return Object.assign({ save, levelCount: LEVEL_COUNT }, snapshot, {
        rects: play.debugRects(),
      });
    },
    setCharges(values) {
      if (scene !== 'play') return false;
      return play.debugSetCharges(values);
    },
    startLevel(id) {
      openLevel(id);
      return true;
    },
    dismissModal() {
      if (scene === 'home') return false;
      return play.debugDismissModal();
    },
    forceClear() {
      if (scene !== 'play') return false;
      return play.debugForceClear();
    },
    forceFail() {
      if (scene !== 'play') return false;
      return play.debugForceFail();
    },
    useSkill(index) {
      if (scene !== 'play') return false;
      return play.debugUseSkill(index);
    },
    click(x, y) {
      onPointer({ type: 'start', id: 'debug', x, y });
      onPointer({ type: 'end', id: 'debug', x, y });
      return true;
    },
    getRects() {
      return scene === 'home' ? home.debugRects() : play.debugRects();
    },
    share() {
      return share('debug');
    },
  };

  if (typeof platform.debugInstall === 'function') platform.debugInstall(debug);

  return { frame, onPointer, onHide, onShow };
}
