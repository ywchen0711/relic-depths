// The camp and the dungeons. Five acts of four levels; every time you walk into a level it is laid out afresh:
// a winding way from the entrance to the exit, rooms along it, side passages with chests, and a waypoint crystal on
// the first and third level. The fourth level of each act ends in the act boss's lair.
import { MAPS, G, THEMES } from './maps.js?v=1';
import { ENEMIES, SKILLS } from './data.js?v=1';
import { BESTIARY_NEW } from './content.js?v=1';

export const DIFFS = [{ n: '普通', add: 0, c: '#e8e8e8' }, { n: '噩夢', add: 36, c: '#ff8a4a' }, { n: '地獄', add: 62, c: '#ff3a3a' }];
export const ACTS = [
  { n: '第一幕　腐朽荒野', lv: 1, levels: [['荒野', 'forest', 'forest'], ['黑暗森林', 'forest', 'forest'], ['地下墓穴', 'mine', 'cave'], ['墓穴深處', 'mine', 'cave']], boss: 'rottree', bossN: '腐朽古樹' },
  { n: '第二幕　焦土峽谷', lv: 11, levels: [['焦土沙漠', 'mountain', 'mountain'], ['乾涸河谷', 'mountain', 'mountain'], ['失落海岸', 'coast', 'coast'], ['海蝕洞', 'coast', 'coast']], boss: 'irongolem', bossN: '鋼鐵巨像' },
  { n: '第三幕　沉沒神殿', lv: 21, levels: [['神殿外庭', 'temple', 'temple'], ['淹沒迴廊', 'temple', 'temple'], ['祭司之間', 'temple', 'temple'], ['深淵祭壇', 'temple', 'temple']], boss: 'leviath', bossN: '深海巨獸' },
  { n: '第四幕　天空廢墟', lv: 31, levels: [['浮空階梯', 'sky', 'sky'], ['雲之庭', 'sky', 'sky'], ['風之塔', 'sky', 'sky'], ['天頂', 'sky', 'sky']], boss: 'elderdragon', bossN: '古龍' },
  { n: '第五幕　深淵', lv: 41, levels: [['裂隙', 'skyDark', 'void'], ['虛無之海', 'skyDark', 'void'], ['魔王城門', 'skyDark', 'void'], ['深淵王座', 'skyDark', 'void']], boss: 'abyss', bossN: '深淵之王' },
];
export const WP_LEVELS = [0, 2]; // levels (0-based) with a waypoint
export const mapId = (act, lvl) => `d${act}_${lvl}`;
export const parseId = (id) => { const m = /^d(\d)_(\d)$/.exec(id); return m ? { act: +m[1], lvl: +m[2] } : null; };
export function areaLevel(S, act, lvl) { return Math.min(99, ACTS[act].lv + lvl * 2 + DIFFS[S.diff || 0].add); }

// ---------------------------------------------------------------- the camp
{
  const g = new G(30, 26, '.');
  g.rect(0, 0, 29, 0, '#').rect(0, 0, 0, 25, '#').rect(29, 0, 29, 25, '#').rect(0, 25, 29, 25, '#');
  g.rect(1, 1, 28, 5, ',');
  g.ell(15, 14, 6, 4, ':');
  g.rect(13, 20, 17, 24, ':');
  const m = g.done();
  MAPS.town = {
    name: '暮光營地', theme: 'anvil', town: true, ...m, bgm: 'town',
    objs: [
      { k: 'house', x: 2, z: 1, w: 6, d: 3, door: 2, chimney: 4, id: 'shop' },
      { k: 'house', x: 11, z: 1, w: 7, d: 3, roof: '#3a5aa8', door: 3, id: 'guild' },
      { k: 'house', x: 21, z: 1, w: 6, d: 3, roof: '#6a3a8a', door: 2, id: 'smithy' },
      { k: 'crystal', x: 15, z: 14 },
      { k: 'npc', x: 5, z: 6, id: 'merchant', look: 'merchant', dir: 'down' },
      { k: 'npc', x: 9, z: 7, id: 'healer', look: 'priest', dir: 'down' },
      { k: 'npc', x: 14, z: 6, id: 'recruiter', look: 'guard', dir: 'down' },
      { k: 'npc', x: 24, z: 6, id: 'gambler', look: 'lady', dir: 'down' },
      { k: 'npc', x: 20, z: 10, id: 'elder', look: 'oldman', dir: 'left' },
      { k: 'stash', x: 8, z: 12, id: 'stash', label: '倉庫' },
      { k: 'lamp', x: 11, z: 11 }, { k: 'lamp', x: 19, z: 11 }, { k: 'lamp', x: 11, z: 17 }, { k: 'lamp', x: 19, z: 17 },
      { k: 'barrel', x: 3, z: 8 }, { k: 'crate', x: 4, z: 9 }, { k: 'barrel', x: 26, z: 8 }, { k: 'flowers', x: 7, z: 15 }, { k: 'flowers', x: 23, z: 15 },
      { k: 'warp', x: 13, z: 24, w: 5, d: 1, to: mapId(0, 0), tx: -1, tz: -1, dir: 'up', label: '前往地城' },
      { k: 'gate', x: 13, z: 23, w: 5, color: '#ffb04a', label: '▼ 前往地城：荒野', back: true },
    ],
    spawn: [15, 18, 'down'],
  };
}

// ---------------------------------------------------------------- how each level looks
// its ground, what lies about, and what its treasure is kept in (box: the big finds; minor: the small things to search)
Object.assign(THEMES, {
  wilds: { ...THEMES.forest, tiles: { main: ['grass', '#7a8a48'], second: ['dirt', '#8a7454'], third: ['dirt', '#6a5a44'], grass: ['grass', '#6a7a40'] }, wall: ['stonewall', '#7a7464'], cap: ['grass', '#5a6a38'], sky: ['#6a7a8a', '#d8c8a8'], light: 'dusk', fireflies: false, motes: '#f0e0b0', bgm: 'world', fog: ['#b8a890', 30, 90] },
  crypt: { ...THEMES.mine, light: 'interior', tiles: { main: ['cobble', '#7a7068'], second: ['brick', '#6a5a50'], third: ['cobble', '#5a5250'] }, wall: ['brick', '#5a4a44'], cap: ['cobble', '#3a3430'], motes: '#d8c8a8', fog: ['#140e0c', 16, 52], pillar: ['stonewall', '#7a7068'] },
  crypt2: { ...THEMES.mine, light: 'sanctum', tiles: { main: ['cobble', '#5e5868'], second: ['brick', '#4a3e4a'], third: ['cobble', '#3e3a46'] }, wall: ['brick', '#3e3440'], cap: ['cobble', '#2a2430'], motes: '#b08aff', fog: ['#0e0a14', 14, 46], pillar: ['stonewall', '#5e5868'] },
  desert: { ...THEMES.mountain, tiles: { main: ['sand', '#e4c488'], second: ['sand', '#d0aa70'], third: ['dirt', '#b08a5a'] }, wall: ['stonewall', '#c8a070'], cap: ['sand', '#d8b478'], sky: ['#e8a860', '#f8e8c0'], motes: '#fff0c0', fog: ['#f0d8a8', 34, 100] },
  badlands: { ...THEMES.mountain, tiles: { main: ['dirt', '#b07a4a'], second: ['dirt', '#9a6440'], third: ['sand', '#c89a68'] }, wall: ['stonewall', '#a06a48'], cap: ['dirt', '#8a5a3a'], sky: ['#d87a4a', '#f4d0a0'], light: 'dusk', fog: ['#e0a070', 30, 90] },
  seacave: { ...THEMES.mine, tiles: { main: ['cave', '#4a6a70'], second: ['sand', '#a8a080'], third: ['cave', '#36505a'] }, wall: ['cave', '#2e4850'], cap: ['cave', '#24383e'], light: 'deep', motes: '#8ae8ff', bgm: 'seaside', fog: ['#081a20', 16, 52], pillar: ['cave', '#3a5a60'] },
  templeYard: { ...THEMES.temple, tiles: { ...THEMES.temple.tiles, second: ['grass', '#3e6a5a'] } },
  templeHall: { ...THEMES.temple, tiles: { ...THEMES.temple.tiles, second: ['carpet', '#2a4a7a'] }, motes: '#ffe8a0' },
  templeDeep: { ...THEMES.temple, tiles: { main: ['temple', '#4a5a78'], second: ['crystal', '#5a3a8a'], third: ['cave', '#1a1a30'] }, wall: ['temple', '#3a4060'], cap: ['temple', '#2a3050'], motes: '#c88aff', fog: ['#08061a', 12, 40] },
  // the sky ruins at dusk: weathered stone under a deep blue sky, so the white marble does not glare
  skyRuin: { ...THEMES.sky, tiles: { main: ['temple', '#a49eb8'], second: ['cloud', '#c4c0d8'], third: ['crystal', '#7a5ac8'], grass: ['grass', '#6a9a5a'] }, wall: ['temple', '#7e7898'], cap: ['temple', '#8e88a8'], sky: ['#1e2a64', '#c08aa8'], light: 'skyRuin', motes: '#e0d8ff', fog: ['#4a4a7a', 30, 90], pillar: ['temple', '#b0aac4'] },
  skyGold: { ...THEMES.sky, tiles: { ...THEMES.sky.tiles, main: ['temple', '#c0b088'], second: ['crystal', '#d8a84a'], third: ['crystal', '#8a6ac8'] }, wall: ['temple', '#8a7a64'], cap: ['temple', '#9a8a70'], sky: ['#3a2a5a', '#e0905a'], light: 'skyGold', motes: '#ffe0a0', fog: ['#7a5a5a', 30, 90], pillar: ['temple', '#c8b890'] },
  hell: { ...THEMES.skyDark, tiles: { main: ['cave', '#5a2a24'], second: ['cave', '#7a3020'], third: ['dirt', '#3a1a14'] }, wall: ['cave', '#2a1210'], cap: ['cave', '#1e0c0a'], wallH: 3, sky: ['#1a0404', '#5a1408'], light: 'hell', motes: '#ff8a4a', fog: ['#200806', 16, 52], clouds: false, edgeDrop: -1, pillar: ['cave', '#3a1a14'] },
  castle: { ...THEMES.skyDark, tiles: { main: ['brick', '#4a3a40'], second: ['carpet', '#5a1a1a'], third: ['cobble', '#3a3034'] }, wall: ['brick', '#2e2428'], cap: ['stonewall', '#2a2026'], wallH: 3.2, sky: ['#0a0408', '#2a0a14'], motes: '#ff6a6a', fog: ['#14080c', 14, 46], clouds: false, edgeDrop: -1, pillar: ['brick', '#3a2a30'] },
});
export const BOX = {
  chest: { n: '寶箱' }, wet: { n: '漂流寶箱', color: '#6a5a4a' },
  iron: { n: '惡魔的寶箱', color: '#3a3038', mat: 'metal', trim: '#c84a3a' }, relic: { n: '聖物匣', color: '#e8d8a8', mat: 'temple', trim: '#e8c050' }, sky: { n: '天空寶匣', color: '#e8e4f4', mat: 'temple', trim: '#8ae8ff' },
  coffin: { n: '棺材', style: 'coffin' }, sarc: { n: '石棺', style: 'sarc' }, urn: { n: '陶甕', style: 'urn' }, vase: { n: '祭品甕', style: 'urn', color: '#3a7a8a', trim: '#e8c050' },
  barrel: { n: '木桶', style: 'barrel' }, clam: { n: '巨貝', style: 'clam' }, skeleton: { n: '冒險者的骸骨', style: 'skeleton' }, stump: { n: '空心樹樁', style: 'stump' },
  crystal: { n: '水晶簇', style: 'crystal' }, cocoon: { n: '血肉之繭', style: 'cocoon' }, bonepile: { n: '骨堆', style: 'bonepile' },
};
// deco: [prop, share of the floor, blocks the way, colours]
export const LOOK = {
  '0_0': { theme: 'wilds', bg: 'wilds', deco: [['deadtree', 0.012, 1], ['tomb', 0.005, 1], ['rock', 0.008, 1], ['bones', 0.006], ['bush', 0.01, 0, { leaf: '#6a7a3a' }], ['flowers', 0.004, 0, { color: '#c8b8e8' }]], box: ['chest', 'stump'], minor: ['stump', 'bonepile'] },
  '0_1': { deco: [['mushroom', 0.01], ['mushroom', 0.004, 0, { cap: '#8a6ae8', glow: true }], ['deadtree', 0.004, 1], ['rock', 0.006, 1]], box: ['stump', 'chest'], minor: ['stump', 'stump', 'bonepile'] },
  '0_2': { theme: 'crypt', bg: 'crypt', bright: 3.2, deco: [['bones', 0.01], ['skulls', 0.006], ['pillar', 0.004, 1], ['tomb', 0.003, 1]], box: ['sarc', 'coffin'], minor: ['coffin', 'urn', 'bonepile'] },
  '0_3': { theme: 'crypt2', bg: 'crypt', bright: 3.2, deco: [['bones', 0.012], ['skulls', 0.008], ['pillar', 0.004, 1], ['spikes', 0.003, 1, { color: '#5a5048' }]], box: ['sarc'], minor: ['coffin', 'bonepile', 'urn'] },
  '1_0': { theme: 'desert', bg: 'desert', deco: [['cactus', 0.01, 1], ['skulls', 0.005], ['bones', 0.008], ['rock', 0.006, 1, { color: '#c8a070' }], ['deadtree', 0.003, 1, { bark: '#a08a6a' }]], box: ['skeleton', 'urn'], minor: ['skeleton', 'urn'] },
  '1_1': { theme: 'badlands', bg: 'badlands', deco: [['deadtree', 0.008, 1], ['rock', 0.01, 1, { color: '#a06a48' }], ['bones', 0.008], ['skulls', 0.004], ['cactus', 0.003, 1]], box: ['skeleton', 'chest'], minor: ['urn', 'bonepile', 'skeleton'] },
  '1_2': { deco: [['palm', 0.006, 1], ['rock', 0.006, 1], ['reeds', 0.008], ['coral', 0.004, 0, { color: '#ff9a8a' }]], box: ['wet', 'barrel'], minor: ['barrel', 'clam'] },
  '1_3': { theme: 'seacave', bg: 'seacave', bright: 3, deco: [['coral', 0.008], ['coral', 0.004, 0, { color: '#8ac8ff' }], ['seaweed', 0.01], ['rock', 0.006, 1, { color: '#3a5a60' }]], box: ['clam', 'wet'], minor: ['clam', 'barrel'] },
  '2_0': { theme: 'templeYard', deco: [['pillar', 0.005, 1], ['bush', 0.008, 0, { leaf: '#3e6a5a' }], ['rock', 0.004, 1, { color: '#7a9aa8' }], ['seaweed', 0.004]], box: ['relic', 'vase'], minor: ['vase'] },
  '2_1': { deco: [['coral', 0.006], ['seaweed', 0.01], ['pillar', 0.004, 1]], box: ['clam', 'relic'], minor: ['vase', 'clam'] },
  '2_2': { theme: 'templeHall', deco: [['brazier', 0.004, 1], ['banner', 0.004, 1, { color: '#2a5a8a', sigil: '#8ae8ff' }], ['pillar', 0.004, 1]], box: ['relic'], minor: ['vase'] },
  '2_3': { theme: 'templeDeep', deco: [['tentacle', 0.006, 1], ['brazier', 0.003, 1], ['skulls', 0.005], ['crystal', 0.004, 0, { color: '#c88aff' }]], box: ['relic', 'sarc'], minor: ['vase', 'cocoon'] },
  '3_0': { theme: 'skyRuin', bg: 'skyRuin', deco: [['crystal', 0.006, 0, { color: '#c8a0ff' }], ['pillar', 0.004, 1], ['obelisk', 0.002, 1]], box: ['sky', 'crystal'], minor: ['crystal', 'vase'] },
  '3_1': { theme: 'skyRuin', bg: 'skyRuin', deco: [['bush', 0.01, 0, { leaf: '#8ac86a', flower: '#f4a8d8' }], ['flowers', 0.008], ['crystal', 0.003, 0, { color: '#c8a0ff' }]], box: ['sky', 'crystal'], minor: ['crystal'] },
  '3_2': { theme: 'skyRuin', bg: 'skyRuin', deco: [['banner', 0.005, 1, { color: '#3a5ad8', sigil: '#f4f0ff' }], ['pillar', 0.005, 1], ['obelisk', 0.002, 1]], box: ['sky'], minor: ['crystal', 'vase'] },
  '3_3': { theme: 'skyGold', bg: 'skyGold', deco: [['obelisk', 0.004, 1, { rune: '#ffd88a' }], ['crystal', 0.005, 0, { color: '#ffd88a' }], ['pillar', 0.004, 1]], box: ['sky', 'crystal'], minor: ['crystal'] },
  '4_0': { theme: 'hell', bg: 'hell', bright: 2.6, deco: [['spikes', 0.008, 1], ['skulls', 0.006], ['bones', 0.008], ['tentacle', 0.004, 1, { color: '#8a2a2a' }]], box: ['iron', 'cocoon'], minor: ['bonepile', 'cocoon'] },
  '4_1': { deco: [['crystal', 0.006, 0, { color: '#c8a0ff' }], ['tentacle', 0.005, 1], ['spikes', 0.003, 1]], box: ['iron', 'crystal'], minor: ['cocoon', 'crystal'] },
  '4_2': { theme: 'castle', bg: 'castle', bright: 2.8, deco: [['banner', 0.005, 1], ['brazier', 0.004, 1], ['skulls', 0.005], ['spikes', 0.003, 1], ['pillar', 0.003, 1]], box: ['iron'], minor: ['urn', 'bonepile'] },
  '4_3': { theme: 'hell', bg: 'hell', bright: 2.6, deco: [['brazier', 0.004, 1], ['skulls', 0.008], ['spikes', 0.006, 1], ['tentacle', 0.004, 1, { color: '#8a2a2a' }]], box: ['iron'], minor: ['bonepile', 'cocoon'] },
};
const boxObj = (key, extra) => { const B = BOX[key] || BOX.chest; return { k: 'chest', name: B.n, style: B.style, color: B.color, mat: B.mat, trim: B.trim, ...extra }; };

// ---------------------------------------------------------------- a dungeon level
function rng(seed) { let s = (seed * 9301 + 49297) % 233280 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
// X lays out a floor of the Dead King's palace instead (see genPalace): its own name, look, level and ways in and out
export function genLevel(S, act, lvl, seed = Math.floor(Math.random() * 1e9), X = null) {
  const A = ACTS[act], [name, theme0, hab] = X ? [X.name, X.theme, X.hab] : A.levels[lvl], r = rng(seed), L = X ? X.look : LOOK[`${act}_${lvl}`] || {}, theme = L.theme || theme0;
  const W = 40 + Math.floor(r() * 8), H = 40 + Math.floor(r() * 6), open = '#';
  const g = new G(W, H, open);
  // the main way: from the bottom to the top, zigzagging across
  const pts = []; const n = 5 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) { const z = Math.round(H - 4 - (H - 8) * i / (n - 1)); const x = i === 0 || i === n - 1 ? Math.round(W / 2 + (r() - 0.5) * 6) : Math.round(5 + r() * (W - 10)); pts.push([x, z]); }
  g.path(pts, '.', 3);
  for (const [x, z] of pts) g.ell(x, z, 3 + r() * 3, 2.5 + r() * 2.5, '.');
  // side passages ending in a small room, each with a chest
  const chests = [];
  for (let i = 1; i < n - 1; i++) {
    if (r() < 0.25) continue;
    const [x, z] = pts[i], dx = (x < W / 2 ? 1 : -1) * (6 + Math.floor(r() * 8)), ex = Math.max(4, Math.min(W - 5, x + dx)), ez = Math.max(4, Math.min(H - 5, z + Math.round((r() - 0.5) * 10)));
    g.path([[x, z], [ex, ez]], ':', 2); g.ell(ex, ez, 2.5, 2.2, ':'); chests.push([ex, ez]);
  }
  // texture the floor and scatter a few obstacles
  g.scatter(1, 1, W - 2, H - 2, ',', 0.18, ['.'], seed % 97 + 1);
  if (theme === 'forest') { g.scatter(1, 1, W - 2, H - 2, 'y', 0.03, ['.', ','], seed % 89 + 2); g.scatter(1, 1, W - 2, H - 2, 'Y', 0.025, [',', ':'], seed % 83 + 3); }
  g.path(pts, '.', 1); // keep the way itself clear
  g.rect(0, 0, W - 1, 0, open).rect(0, H - 1, W - 1, H - 1, open).rect(0, 0, 0, H - 1, open).rect(W - 1, 0, W - 1, H - 1, open);
  const m = g.done();
  const [sx, sz] = pts[0], [ex, ez] = pts[n - 1], last = X ? !X.next : lvl === 3;
  const id = X ? X.id : mapId(act, lvl), objs = [], lv = X ? X.lv : areaLevel(S, act, lvl);
  // the way back and the way on
  const backN = lvl === 0 ? '▲ 返回營地' : `▲ 上一層：${A.levels[lvl - 1][0]}`, nextN = `▼ 下一層：${A.levels[lvl + 1]?.[0] || ''}`;
  if (X) {
    const B = X.back; objs.push({ k: 'warp', x: sx - 1, z: sz + 2, w: 3, d: 1, to: B.to, tx: B.tx, tz: B.tz, dir: B.dir, label: B.label }, { k: 'gate', x: sx - 1, z: sz + 2, w: 3, color: '#6ab8ff', label: '▲ ' + B.label, back: true });
    if (X.next) objs.push({ k: 'warp', x: ex - 1, z: ez - 2, w: 3, d: 1, to: X.next.to, tx: -1, tz: -1, dir: 'up', label: X.next.label, ...(X.boss ? { cond: 'pboss', lockMsg: '守護者還擋在門前。', push: 0.8 } : {}) }, { k: 'gate', x: ex - 1, z: ez - 2, w: 3, color: X.boss ? '#ff4a4a' : '#ffb04a', label: '▼ ' + X.next.label });
    if (X.boss) objs.push({ k: 'event', x: ex - 3, z: ez + 1, w: 7, d: 1, id: 'pboss', floor: X.floor });
    if (!X.next) objs.push({ k: 'bigcrystal', x: ex, z: ez - 1, color: '#ff3a3a' });
  } else objs.push({ k: 'warp', x: sx - 1, z: sz + 2, w: 3, d: 1, to: lvl === 0 ? 'town' : mapId(act, lvl - 1), tx: lvl === 0 ? 15 : -2, tz: lvl === 0 ? 22 : -2, dir: lvl === 0 ? 'up' : 'down', label: backN.slice(2) }, { k: 'gate', x: sx - 1, z: sz + 2, w: 3, color: '#6ab8ff', label: backN, back: true });
  if (!X && !last) objs.push({ k: 'warp', x: ex - 1, z: ez - 2, w: 3, d: 1, to: mapId(act, lvl + 1), tx: -1, tz: -1, dir: 'up', label: nextN.slice(2) }, { k: 'gate', x: ex - 1, z: ez - 2, w: 3, color: '#ffb04a', label: nextN });
  else if (!X) { objs.push({ k: 'event', x: ex - 3, z: ez + 1, w: 7, d: 1, id: 'boss', act }); objs.push({ k: 'bigcrystal', x: ex, z: ez - 1, color: '#b06aff' }); }
  if (!X && WP_LEVELS.includes(lvl)) objs.push({ k: 'crystal', x: sx + 2, z: sz - 1 });
  // dark places get torches along the way
  if (THEMES[theme]?.night) pts.forEach(([x, z], i) => { const tx = x + (r() < 0.5 ? -3 : 3), tz = z + (r() < 0.5 ? -1 : 1); if (m.grid[tz]?.[tx] && m.grid[tz][tx] !== '#') objs.push({ k: 'torch', x: tx, z: tz }); });
  const pick = (a) => a[Math.floor(r() * a.length)];
  chests.forEach(([x, z], i) => objs.push(boxObj(pick(L.box || ['chest']), { x, z, id: `${id}_${seed}_${i}`, loot: lv, item: null, big: true })));
  // a shrine (a buff) on some levels
  if (r() < 0.5) { const [x, z] = pts[1 + Math.floor(r() * (n - 2))]; objs.push({ k: 'statue', x: x + 2, z, id: `shrine_${seed}`, weapon: 'staff', hair: 'long', shrine: ['exp', 'atk', 'def', 'mf'][Math.floor(r() * 4)] }); }
  // what lies about, and the small things to search: never on top of something else, and never walling off a passage
  // (anything solid goes only where all eight neighbours are open floor, and keeps its distance from other solid things)
  const FLOOR = '.,:', taken = new Set(), solid = [];
  const floorAt = (x, z) => FLOOR.includes(m.grid[z]?.[x] ?? '#');
  const near = (x, z, d) => solid.some(([a, b]) => Math.abs(a - x) <= d && Math.abs(b - z) <= d);
  for (const o of objs) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= (o.w || 1) + 1; dx++) taken.add(`${o.x + dx},${o.z + dz}`);
  for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { taken.add(`${sx + dx},${sz + dz}`); taken.add(`${ex + dx},${ez + dz}`); }
  const open8 = (x, z) => { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (!floorAt(x + dx, z + dz)) return false; return true; };
  const place = (x, z, block) => { if (!floorAt(x, z) || taken.has(`${x},${z}`)) return false; if (block && (!open8(x, z) || near(x, z, 2))) return false; taken.add(`${x},${z}`); if (block) solid.push([x, z]); return true; };
  const nMinor = 3 + Math.floor(r() * 4);
  for (let i = 0, tries = 0; i < nMinor && tries < 200; tries++) {
    const [px, pz] = pick(pts), x = Math.round(px + (r() - 0.5) * 9), z = Math.round(pz + (r() - 0.5) * 7);
    if (place(x, z, true)) { objs.push(boxObj(pick(L.minor || ['urn']), { x, z, id: `${id}_${seed}_m${i}`, loot: lv, minor: true })); i++; }
  }
  for (const [kind, share, block, colors] of L.deco || []) {
    const want = Math.round(W * H * share);
    for (let i = 0, tries = 0; i < want && tries < want * 12; tries++) {
      const x = 1 + Math.floor(r() * (W - 2)), z = 1 + Math.floor(r() * (H - 2));
      if (!place(x, z, !!block)) continue; i++;
      if (kind === 'pillar') objs.push({ k: 'pillar', x, z, broken: r() < 0.6, h: 2.6 + r() });
      else if (kind === 'brazier') objs.push({ k: 'brazier', x, z });
      else objs.push({ k: 'deco', x, z, sprite: kind, colors, block: !!block, scale: block ? 1.1 + r() * 0.35 : 0.9 + r() * 0.3 });
    }
  }
  MAPS[id] = {
    name: `${name}　Lv${lv}`, theme, ...m, objs, seed, act, lvl, hab, ...(X ? { floor: X.floor, pw: X.pw, lootQ: X.lootQ } : {}), bg: L.bg, alv: lv, bright: L.bright ?? { mine: 3, temple: 2.0, templeYard: 2.0, templeHall: 2.0, templeDeep: 2.0, skyDark: 1.8 }[theme],
    enc: { troops: [['slime']], lv }, encRate: 22,
    spawn: [sx, sz, 'up'], exitSpawn: [ex, ez + 1, 'down'],
  };
  return MAPS[id];
}

// ---------------------------------------------------------------- the Dead King's palace
// Opens once the hell difficulty is beaten: a hundred floors, stronger every floor, richer every floor. A guardian
// waits on every tenth floor (the act bosses again, far stronger), the Dead King himself on the hundredth. Every floor
// has a way back to the surface; die down there and you lose experience, gold and half of what you found on the way.
export const PALACE_N = 100;
export const palaceId = (f) => `p${f}`;
export const parsePalace = (id) => { const m = /^p(\d+)$/.exec(id || ''); return m ? +m[1] : 0; };
export const palacePower = (f) => ({ hp: 1 + f * 0.04, atk: 1 + f * 0.015, def: 1 + f * 0.006 }); // floor 100: HP x5, attack x2.5
export const palaceLootQ = (f) => 1.5 + f * 0.035; // how much likelier the good things are: floor 1 x1.5, floor 100 x5
export const palaceBoss = (f) => f >= PALACE_N ? 'deadking' : ACTS[(f / 10 - 1) % ACTS.length].boss;
ENEMIES.deadking = { ...ENEMIES.abyss, name: '死王', kind: 'lord', colors: { body: '#2a1a1e', trim: '#e8c050', halo: '#ff4a3a', eye: '#ff3a3a' }, weak: ['light', 'fire', 'sword'], resist: ['dark', 'ice'], acts: [['e_void', 2], ['e_dark', 2], ['e_silence_all', 1], ['e_tidal', 1]], exp: 40000, gil: 50000, drops: [], scale: 1.5, twice: 1 };
const PAL_LOOK = ['4_2', '0_3', '4_0', '2_3', '4_1'], PAL_HAB = ['cave', 'temple', 'void', 'forest', 'mountain', 'coast', 'sky'];
export function genPalace(S, f, seed) {
  const look = LOOK[PAL_LOOK[Math.min(4, Math.floor((f - 1) / 20))]];
  return genLevel(S, 4, 0, seed, {
    id: palaceId(f), name: `死王宮殿　第${f}層`, theme: 'skyDark', hab: PAL_HAB[f % PAL_HAB.length], look, lv: 99, floor: f, pw: palacePower(f), lootQ: palaceLootQ(f),
    boss: f % 10 === 0 ? palaceBoss(f) : null, back: { to: 'town', tx: 15, tz: 22, dir: 'up', label: '返回地面（營地）' }, next: f < PALACE_N ? { to: palaceId(f + 1), label: `下一層：第${f + 1}層` } : null,
  });
}

// ---------------------------------------------------------------- who lives there
const POOL = {};
// monsters that live on this ground, near the area's level (their skills were made for that level)
export function poolFor(hab, lv = 1) {
  const key = hab + ':' + lv; if (POOL[key]) return POOL[key];
  const all = [...new Set([...BESTIARY_NEW, ...Object.keys(ENEMIES)])].filter(id => { const E = ENEMIES[id]; return E && !E.boss && !E.metal && !E.trial && (E.hab || []).includes(hab) && E.kind; });
  const span = Math.max(5, lv * 0.25);
  let ids = all.filter(id => Math.abs(ENEMIES[id].lv - lv) <= span);
  if (ids.length < 6) ids = all.slice().sort((a, b) => Math.abs(ENEMIES[a].lv - lv) - Math.abs(ENEMIES[b].lv - lv)).slice(0, 8);
  return (POOL[key] = ids.length ? ids : BESTIARY_NEW.slice(0, 20));
}
// the monster modifiers of the old games: champions get one, unique monsters two or three
export const MODS = {
  strong: { n: '強壯', atk: 1.5, c: '#ff8a6a' }, fast: { n: '迅捷', spd: 1.5, c: '#8affb0' }, stone: { n: '石膚', def: 2.2, c: '#c8c0b0' },
  fire: { n: '火焰強化', el: 'fire', c: '#ff7a3a' }, cold: { n: '冰冷強化', el: 'ice', onHit: 'slow', c: '#8ae0ff' }, light: { n: '雷電強化', el: 'thunder', traits: ['counter'], c: '#ffe04a' },
  resist: { n: '魔法抗性', resistAll: 0.5, c: '#c8a0ff' }, mana: { n: '法力燃燒', traits: ['mpburn'], c: '#4a8aff' }, vamp: { n: '吸血', traits: ['leech'], c: '#e84a6a' },
  curse: { n: '詛咒', traits: ['intimidate'], c: '#b06aff' }, phase: { n: '幻影', traits: ['phase'], c: '#e8e8ff' }, split: { n: '分裂', traits: ['split'], c: '#8ae84a' },
  guard: { n: '守衛', traits: ['guardian'], c: '#8ac8ff' }, haste: { n: '狂熱光環', aura: 'haste', c: '#ffb04a' }, regen: { n: '再生', aura: 'regen', c: '#6ae8a0' },
  // special moves: champions sometimes, unique monsters usually, carry one of these
  p_meteor: { n: '隕石術', skill: 'x_meteor' }, p_blizzard: { n: '暴風雪', skill: 'x_blizzard' }, p_chain: { n: '連鎖閃電', skill: 'x_chain' }, p_quake: { n: '大地震', skill: 'x_quake' },
  p_frenzy: { n: '狂亂連擊', skill: 'x_frenzy' }, p_drain: { n: '生命吸取', skill: 'x_drain' }, p_heal: { n: '再生術', skill: 'x_heal' }, p_curse: { n: '衰弱詛咒', skill: 'x_curse' },
  p_doom: { n: '死亡宣告', skill: 'x_doom' }, p_rage: { n: '狂暴化', skill: 'x_rage' }, p_poison: { n: '毒霧', skill: 'x_poison' }, p_holy: { n: '審判之光', skill: 'x_holy' },
  p_sleep: { n: '催眠波', skill: 'x_sleep' }, p_shatter: { n: '碎甲重擊', skill: 'x_shatter' },
};
Object.assign(SKILLS, {
  x_meteor: { name: '隕石術', type: 'mag', tgt: 'enemies', pow: 1.6, el: 'fire', anim: 'meteor', desc: '火屬性全體大傷害' },
  x_blizzard: { name: '暴風雪', type: 'mag', tgt: 'enemies', pow: 1.35, el: 'ice', status: 'slow', chance: 0.4, anim: 'ice' },
  x_chain: { name: '連鎖閃電', type: 'mag', tgt: 'enemy', pow: 1.5, el: 'thunder', chain: 3, anim: 'thunder' },
  x_quake: { name: '大地震', type: 'phys', tgt: 'enemies', pow: 1.3, el: 'earth', status: 'stun', chance: 0.25, anim: 'quake' },
  x_frenzy: { name: '狂亂連擊', type: 'phys', tgt: 'random', pow: 0.7, hits: 4, anim: 'claw' },
  x_drain: { name: '生命吸取', type: 'mag', tgt: 'enemy', pow: 1.7, el: 'dark', drain: true, anim: 'dark' },
  x_heal: { name: '再生術', type: 'heal', tgt: 'self', healP: 0.35, anim: 'heal' },
  x_curse: { name: '衰弱詛咒', type: 'debuff', tgt: 'enemies', debuff: { atk: 1, def: 1 }, anim: 'dark' },
  x_doom: { name: '死亡宣告', type: 'debuff', tgt: 'enemy', status: 'doom', chance: 0.6, anim: 'dark' },
  x_rage: { name: '狂暴化', type: 'buff', tgt: 'self', buff: { atk: 2, spd: 1 }, anim: 'buff' },
  x_poison: { name: '毒霧', type: 'debuff', tgt: 'enemies', status: 'poison', chance: 0.75, anim: 'dark' },
  x_holy: { name: '審判之光', type: 'mag', tgt: 'enemies', pow: 1.45, el: 'light', anim: 'holy' },
  x_sleep: { name: '催眠波', type: 'debuff', tgt: 'enemies', status: 'sleep', chance: 0.45, anim: 'song' },
  x_shatter: { name: '碎甲重擊', type: 'phys', tgt: 'enemy', pow: 2.0, debuff: { def: 2 }, anim: 'slash' },
});
const UNIQ_A = ['腐骨', '血爪', '碎顱', '影牙', '毒心', '狂怒', '骸王', '冥火', '霜嚎', '雷鳴', '黑翼', '鐵皮', '噬魂', '裂地', '夜行'];
const UNIQ_B = ['者', '之主', '屠夫', '暴君', '惡徒', '收割者', '吞噬者', '掠奪者'];
export function rollTroop(S, def, r = Math.random) {
  const lv = def.alv, pool = poolFor(def.hab, Math.min(lv, 60));
  const ps = S.party.length, n = (ps >= 3 ? 2 : 1) + Math.floor(r() * (ps >= 2 ? 3 : 2)) + (r() < (ps >= 2 ? 0.25 : 0.08) ? 1 : 0); // bigger parties meet bigger packs
  const troop = [], mods = [];
  const kind = r() < 0.05 ? 'unique' : r() < 0.12 ? 'champion' : 'normal';
  const mainId = pool[Math.floor(r() * pool.length)];
  const modKeys = Object.keys(MODS).filter(k => !MODS[k].skill), powKeys = Object.keys(MODS).filter(k => MODS[k].skill);
  const pickFrom = (keys, k, out = []) => { while (out.length < k) { const m = keys[Math.floor(r() * keys.length)]; if (!out.includes(m)) out.push(m); } return out; };
  const pickMods = (k, pw) => [...pickFrom(modKeys, k), ...pickFrom(powKeys, pw)];
  for (let i = 0; i < Math.min(4, n); i++) {
    const id = kind === 'normal' ? pool[Math.floor(r() * pool.length)] : mainId;
    troop.push(id);
    if (kind === 'champion') mods.push({ rank: 1, mods: i === 0 ? pickMods(1, r() < 0.35 ? 1 : 0) : [], lv });
    else if (kind === 'unique' && i === 0) mods.push({ rank: 2, mods: pickMods(2 + (S.diff > 0 ? 1 : 0), (r() < 0.75 ? 1 : 0) + (S.diff > 0 && r() < 0.5 ? 1 : 0)), lv, name: UNIQ_A[Math.floor(r() * UNIQ_A.length)] + UNIQ_B[Math.floor(r() * UNIQ_B.length)] });
    else mods.push({ rank: 0, mods: [], lv: lv + Math.round((r() - 0.5) * 2) });
  }
  if (kind === 'champion') { const m = mods[0].mods; for (const x of mods) x.mods = m; } // a champion pack shares its modifier
  return { troop, mods, kind };
}
// stats of a monster moved to another level (curves measured from the bestiary)
const CURVE = { hp: (L) => 30 + 15 * L + 0.65 * L * L, atk: (L) => 13 + 2 * L, def: (L) => 7 + 1.12 * L, mag: (L) => 13 + 1.65 * L, spr: (L) => 10 + 1.2 * L, spd: (L) => 10 + 0.42 * L, exp: (L) => 2 + 4.5 * L + 0.09 * L * L, gil: (L) => 5 + 3 * L };
export function scaleTo(v, k, from, to) { const f = CURVE[k]; return f ? Math.max(1, Math.round(v * f(to) / f(Math.max(1, from)))) : v; }
