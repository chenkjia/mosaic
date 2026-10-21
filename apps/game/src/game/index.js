import { createHomeScene } from './scene/home.js';

export function createGameApp() {
  const home = createHomeScene();
  return {
    frame(ctx, view) {
      home.draw(ctx, view);
    },
    onPointer() {},
  };
}
