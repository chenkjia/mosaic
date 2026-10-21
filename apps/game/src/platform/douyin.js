import { createMinigamePlatform } from './minigame.js';

export function createDouyinPlatform(api = typeof tt !== 'undefined' ? tt : null) {
  return createMinigamePlatform(api);
}
