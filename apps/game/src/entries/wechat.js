import { startBoot } from '../boot/main.js';
import { AD_UNIT_ID, AD_UNIT_IDS } from '../config/ads.js';
import { createGameApp } from '../game/index.js';
import { createWechatPlatform } from '../platform/wechat.js';

startBoot(createWechatPlatform(undefined, {
  adUnitId: AD_UNIT_ID,
  adUnitIds: AD_UNIT_IDS,
}), () => createGameApp);
