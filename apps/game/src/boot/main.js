import { assertPlatformAdapter } from '../platform/contract.js';
import { createLoadingScene } from './loading.js';

const MIN_LOADING_MS = 600;

const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

export function startBoot(platform, loadGameModule) {
  assertPlatformAdapter(platform);

  const canvas = platform.getMainCanvas();
  const ctx = canvas.getContext('2d');
  const loading = createLoadingScene();

  let phase = 'loading';
  let game = null;
  let gameReady = false;
  let startedAt = null;
  let loadToken = 0;

  platform.log('[game] boot ' + version);

  function startLoad() {
    const token = ++loadToken;
    phase = 'loading';
    gameReady = false;
    game = null;
    loading.reset();
    loading.setProgress(0.15);

    Promise.resolve()
      .then(() => loadGameModule())
      .then((createGame) => {
        if (token !== loadToken) return;
        game = createGame(platform, canvas);
        loading.setProgress(1);
        gameReady = true;
      })
      .catch((err) => {
        if (token !== loadToken) return;
        loading.setFailed(true);
        phase = 'error';
        platform.log('[boot] 初始化失败: ' + (err && err.message ? err.message : String(err)));
      });
  }

  platform.onPointer((event) => {
    if (phase === 'error') {
      startLoad();
      return;
    }
    if (phase === 'game' && game && typeof game.onPointer === 'function') {
      game.onPointer(event);
    }
  });

  platform.onHide(() => {
    if (game && typeof game.onHide === 'function') game.onHide();
  });

  platform.onShow(() => {
    if (game && typeof game.onShow === 'function') game.onShow();
  });

  platform.onFrame((now) => {
    if (startedAt === null) startedAt = now;
    if (phase === 'loading' && gameReady && now - startedAt >= MIN_LOADING_MS) {
      phase = 'game';
      platform.log('[boot] play ' + version);
    }

    platform.applyViewTransform(ctx);
    const view = platform.designSize();
    if (phase === 'game' && game) {
      game.frame(ctx, view, now);
    } else {
      loading.draw(ctx, view, now - startedAt);
    }
  });

  startLoad();
}
