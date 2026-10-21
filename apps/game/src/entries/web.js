import { startBoot } from '../boot/main.js';
import { createGameApp } from '../game/index.js';
import { createWebPlatform } from '../platform/web.js';

startBoot(createWebPlatform(), () => Promise.resolve(createGameApp));
