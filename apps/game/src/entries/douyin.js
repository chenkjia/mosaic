import { startBoot } from '../boot/main.js';
import { createDouyinPlatform } from '../platform/index.js';

startBoot(createDouyinPlatform(), () => {
  const load = require;
  return Promise.resolve(load('./pkg-game/index.js').createGameApp);
});
