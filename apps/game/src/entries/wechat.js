import { startBoot } from '../boot/main.js';
import { createWechatPlatform } from '../platform/index.js';

startBoot(createWechatPlatform(), () => {
  const load = require;
  return Promise.resolve(load('./pkg-game/index.js').createGameApp);
});
