export const C = {
  bgTop: '#FFF4F9',
  bgBottom: '#E8E1FF',
  ink: '#2A2344',
  primary: '#5B4BC4',
  muted: '#8B7FA8',
  soft: '#B7AACB',
  line: 'rgba(91,75,196,0.16)',
  panel: '#FFFFFF',
  panelSoft: 'rgba(255,255,255,0.72)',
  overlay: 'rgba(36,22,63,0.55)',
  pink: '#FF9FC2',
  pinkDeep: '#FF6F9E',
  peach: '#FFC58A',
  orange: '#FF9A5C',
  yellow: '#FFD86E',
  gold: '#FFB84D',
  mint: '#7BDCC8',
  mintDeep: '#4CC9B0',
  sky: '#8FD3FF',
  blue: '#5AA9F0',
  lavender: '#A9A0FF',
  violet: '#8B7FE8',
  white: '#FFFFFF',
  danger: '#D9547A',
  success: '#3FAF95',
  shadow: 'rgba(42,35,68,0.16)',
  shadowDeep: 'rgba(42,35,68,0.24)',
};

export const FONT = {
  display: '800 92px "PingFang SC", "Microsoft YaHei", sans-serif',
  title: '800 56px "PingFang SC", "Microsoft YaHei", sans-serif',
  h1: '700 44px "PingFang SC", "Microsoft YaHei", sans-serif',
  h2: '700 34px "PingFang SC", "Microsoft YaHei", sans-serif',
  h3: '700 28px "PingFang SC", "Microsoft YaHei", sans-serif',
  body: '500 26px "PingFang SC", "Microsoft YaHei", sans-serif',
  small: '500 22px "PingFang SC", "Microsoft YaHei", sans-serif',
  tiny: '500 18px "PingFang SC", "Microsoft YaHei", sans-serif',
  tinyBold: '700 18px "PingFang SC", "Microsoft YaHei", sans-serif',
  number: '800 42px "PingFang SC", "Microsoft YaHei", sans-serif',
  numberSmall: '700 30px "PingFang SC", "Microsoft YaHei", sans-serif',
  button: '700 30px "PingFang SC", "Microsoft YaHei", sans-serif',
  buttonSmall: '600 24px "PingFang SC", "Microsoft YaHei", sans-serif',
  slot: '700 17px "PingFang SC", "Microsoft YaHei", sans-serif',
};

export const SKILL_META = {
  multiBall: { label: '多球', short: '多', color: C.pinkDeep, tip: '分裂出 2 颗球' },
  widePaddle: { label: '加宽', short: '宽', color: C.blue, tip: '挡板加宽 15 秒' },
  split: { label: '分裂', short: '分', color: C.violet, tip: '场上所有球各分裂 1 颗' },
  slow: { label: '减速', short: '慢', color: C.mintDeep, tip: '球速降到 0.7 倍' },
};

export const THEME_LABEL = {
  animals: '动物',
  flowers: '花卉',
  scenery: '风景',
};

export const EFFECT_META = {
  wide: { label: '加宽', short: '宽', color: C.blue, icon: 'widePaddle' },
  slow: { label: '减速', short: '慢', color: C.mintDeep, icon: 'slow' },
  shrink: { label: '挡板缩短', short: '缩板', color: C.orange, icon: 'shrink' },
  speed: { label: '球速加快', short: '加速', color: C.danger, icon: 'speed' },
  reverse: { label: '方向反转', short: '反向', color: C.violet, icon: 'reverse' },
};
