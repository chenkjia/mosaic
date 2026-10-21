import { createMinigamePlatform } from './minigame.js';

export function createDouyinPlatform(api = typeof tt !== 'undefined' ? tt : null, options) {
  return createMinigamePlatform(api, options);
}
