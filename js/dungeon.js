// The camp and the dungeons. Five acts of four levels; every time you walk into a level it is laid out afresh:
// a winding way from the entrance to the exit, rooms along it, side passages with chests, and a waypoint crystal on
// the first and third level. The fourth level of each act ends in the act boss's lair.
import { MAPS, G } from './maps.js?v=1';
import { ENEMIES } from './data.js?v=1';
import { BESTIARY_NEW } from './content.js?v=1';

export const DIFFS = [{ n: '普通', add: 0, c: '#e8e8e8' }, { n: '噩夢', add: 36, c: '#ff8a4a' }, { n: '地獄', add: 62, c: '#ff3a3a' }];
export const ACTS = [
  { n: '第一幕　腐朽荒野', lv: 1, levels: [['荒野', 'forest', 'forest'], ['黑暗森林', 'forest', 'forest'], ['地下墓穴', 'mine', 'cave'], ['墓穴深處', 'mine', 'cave']], boss: 'rottree', bossN: '腐朽古樹' },
  { n: '第二幕　焦土峽谷', lv: 11, levels: [['焦土', 'mountain', 'mountain'], ['乾涸河谷', 'mountain', 'mountain'], ['失落海岸', 'coast', 'coast'], ['海蝕洞', 'coast', 'coast']], boss: 'irongolem', bossN: '鋼鐵巨像' },
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

// ---------------------------------------------------------------- a dungeon level
function rng(seed) { let s = (seed * 9301 + 49297) % 233280 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
export function genLevel(S, act, lvl, seed = Math.floor(Math.random() * 1e9)) {
  const A = ACTS[act], [name, theme, hab] = A.levels[lvl], r = rng(seed);
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
  const [sx, sz] = pts[0], [ex, ez] = pts[n - 1], last = lvl === 3;
  const id = mapId(act, lvl), objs = [];
  // the way back and the way on
  const backN = lvl === 0 ? '▲ 返回營地' : `▲ 上一層：${A.levels[lvl - 1][0]}`, nextN = `▼ 下一層：${A.levels[lvl + 1]?.[0] || ''}`;
  objs.push({ k: 'warp', x: sx - 1, z: sz + 2, w: 3, d: 1, to: lvl === 0 ? 'town' : mapId(act, lvl - 1), tx: lvl === 0 ? 15 : -2, tz: lvl === 0 ? 22 : -2, dir: lvl === 0 ? 'up' : 'down', label: backN.slice(2) }, { k: 'gate', x: sx - 1, z: sz + 2, w: 3, color: '#6ab8ff', label: backN, back: true });
  if (!last) objs.push({ k: 'warp', x: ex - 1, z: ez - 2, w: 3, d: 1, to: mapId(act, lvl + 1), tx: -1, tz: -1, dir: 'up', label: nextN.slice(2) }, { k: 'gate', x: ex - 1, z: ez - 2, w: 3, color: '#ffb04a', label: nextN });
  else { objs.push({ k: 'event', x: ex - 3, z: ez + 1, w: 7, d: 1, id: 'boss', act }); objs.push({ k: 'bigcrystal', x: ex, z: ez - 1, color: '#b06aff' }); }
  if (WP_LEVELS.includes(lvl)) objs.push({ k: 'crystal', x: sx + 2, z: sz - 1 });
  // dark places get torches along the way
  if (['mine', 'temple', 'skyDark'].includes(theme)) pts.forEach(([x, z], i) => { const tx = x + (r() < 0.5 ? -3 : 3), tz = z + (r() < 0.5 ? -1 : 1); if (m.grid[tz]?.[tx] && m.grid[tz][tx] !== '#') objs.push({ k: 'torch', x: tx, z: tz }); });
  chests.forEach(([x, z], i) => objs.push({ k: 'chest', x, z, id: `${id}_${seed}_${i}`, loot: areaLevel(S, act, lvl), item: null }));
  // a shrine (a buff) on some levels
  if (r() < 0.5) { const [x, z] = pts[1 + Math.floor(r() * (n - 2))]; objs.push({ k: 'statue', x: x + 2, z, id: `shrine_${seed}`, weapon: 'staff', hair: 'long', shrine: ['exp', 'atk', 'def', 'mf'][Math.floor(r() * 4)] }); }
  const lv = areaLevel(S, act, lvl);
  MAPS[id] = {
    name: `${name}　Lv${lv}`, theme, ...m, objs, seed, act, lvl, hab, alv: lv, bright: { mine: 3, temple: 2.0, skyDark: 1.8 }[theme], ...(theme === 'mine' ? { fog: ['#16121c', 20, 58] } : {}),
    enc: { troops: [['slime']], lv }, encRate: 22,
    spawn: [sx, sz, 'up'], exitSpawn: [ex, ez + 1, 'down'],
  };
  return MAPS[id];
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
};
const UNIQ_A = ['腐骨', '血爪', '碎顱', '影牙', '毒心', '狂怒', '骸王', '冥火', '霜嚎', '雷鳴', '黑翼', '鐵皮', '噬魂', '裂地', '夜行'];
const UNIQ_B = ['者', '之主', '屠夫', '暴君', '惡徒', '收割者', '吞噬者', '掠奪者'];
export function rollTroop(S, def, r = Math.random) {
  const lv = def.alv, pool = poolFor(def.hab, Math.min(lv, 60));
  const ps = S.party.length, n = 1 + Math.floor(r() * (ps >= 3 ? 3 : 2)) + (r() < (ps >= 2 ? 0.25 : 0.08) ? 1 : 0);
  const troop = [], mods = [];
  const kind = r() < 0.05 ? 'unique' : r() < 0.12 ? 'champion' : 'normal';
  const mainId = pool[Math.floor(r() * pool.length)];
  const modKeys = Object.keys(MODS);
  const pickMods = (k) => { const out = []; while (out.length < k) { const m = modKeys[Math.floor(r() * modKeys.length)]; if (!out.includes(m)) out.push(m); } return out; };
  for (let i = 0; i < Math.min(4, n); i++) {
    const id = kind === 'normal' ? pool[Math.floor(r() * pool.length)] : mainId;
    troop.push(id);
    if (kind === 'champion') mods.push({ rank: 1, mods: i === 0 ? pickMods(1) : [], lv });
    else if (kind === 'unique' && i === 0) mods.push({ rank: 2, mods: pickMods(2 + (S.diff > 0 ? 1 : 0)), lv, name: UNIQ_A[Math.floor(r() * UNIQ_A.length)] + UNIQ_B[Math.floor(r() * UNIQ_B.length)] });
    else mods.push({ rank: 0, mods: [], lv: lv + Math.round((r() - 0.5) * 2) });
  }
  if (kind === 'champion') { const m = mods[0].mods; for (const x of mods) x.mods = m; } // a champion pack shares its modifier
  return { troop, mods, kind };
}
// stats of a monster moved to another level (curves measured from the bestiary)
const CURVE = { hp: (L) => 30 + 15 * L + 0.65 * L * L, atk: (L) => 13 + 2 * L, def: (L) => 7 + 1.12 * L, mag: (L) => 13 + 1.65 * L, spr: (L) => 10 + 1.2 * L, spd: (L) => 10 + 0.42 * L, exp: (L) => 2 + 4.5 * L + 0.09 * L * L, gil: (L) => 5 + 3 * L };
export function scaleTo(v, k, from, to) { const f = CURVE[k]; return f ? Math.max(1, Math.round(v * f(to) / f(Math.max(1, from)))) : v; }
