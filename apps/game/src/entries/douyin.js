import { startBoot } from '../boot/main.js';
import { AD_UNIT_ID, AD_UNIT_IDS } from '../config/ads.js';
import { createDouyinPlatform } from '../platform/douyin.js';

startBoot(createDouyinPlatform(undefined, {
  adUnitId: AD_UNIT_ID,
  adUnitIds: AD_UNIT_IDS,
}), () => {
  const load = require;
  return Promise.resolve(load('./pkg-game/index.js').createGameApp);
});
