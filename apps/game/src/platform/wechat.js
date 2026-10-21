import { createMinigamePlatform } from './minigame.js';

export function createWechatPlatform(api = typeof wx !== 'undefined' ? wx : null, options) {
  return createMinigamePlatform(api, options);
}
