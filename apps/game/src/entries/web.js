import { startBoot } from '../boot/main.js';
import { createGameApp } from '../game/index.js';
import { createWebPlatform } from '../platform/index.js';

startBoot(createWebPlatform(), () => Promise.resolve(createGameApp));
