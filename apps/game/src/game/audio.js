// V1 无音频资源；先收口开关状态，后续接音效时只改这一处。
export function createAudioManager(store) {
  const kinds = {
    paddle: 'sound',
    brick: 'sound',
    break: 'sound',
    coin: 'sound',
    skill: 'sound',
    ui: 'sound',
  };

  function play(kind) {
    if (!store.get().sound) return false;
    const channel = kinds[kind] || kinds.ui;
    return channel === 'sound';
  }

  function soundOn() {
    return !!store.get().sound;
  }

  function musicOn() {
    return !!store.get().music;
  }

  function toggleSound() {
    return store.update((save) => {
      save.sound = !save.sound;
    }).sound;
  }

  function toggleMusic() {
    return store.update((save) => {
      save.music = !save.music;
    }).music;
  }

  return { play, soundOn, musicOn, toggleSound, toggleMusic };
}
