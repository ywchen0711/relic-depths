// Loot the way the old dungeon crawlers did it: every drop is its own item, rolled from a base type and an item level.
//   normal (white)  - just the base
//   magic  (blue)   - one prefix and/or one suffix
//   rare   (yellow) - three to six affixes and a random two-word name
//   unique (gold)   - a named item with fixed powers
//   set    (green)  - named pieces that grow stronger the more of the set you wear
// An item lives in S.loot[uid] as a small spec; at load it is turned into a GEAR entry under its uid, so the rest of
// the game (stats, battles, paper dolls) treats it like any other piece of equipment.
import { GEAR, ELEM, ITEMS, forgetGear } from './data.js?v=1';
// rare treasures: change a hero's class, or take back their skill points
ITEMS.i_reclass = { name: '轉職之書', price: 30000, sell: 3000, use: { reclass: true }, field: true, cat: 'treasure', desc: '讓一位隊員換成另一個職業：等級和經驗不變，技能點數和屬性點數全部退回重新分配，新職業不能用的裝備會放回背包' };
ITEMS.i_respec = { name: '遺忘之水', price: 12000, sell: 1200, use: { respec: true }, field: true, cat: 'treasure', desc: '讓一位隊員忘記所有技能：投入技能樹的點數全部退回，可以重新分配' };
ITEMS.i_restat = { name: '重生之果', price: 12000, sell: 1200, use: { restat: true }, field: true, cat: 'treasure', desc: '讓一位隊員的屬性點數（力量、敏捷、體力、精力）全部退回，可以重新分配' };
ITEMS.i_tp = { name: '回城卷軸', price: 60, use: { townPortal: true }, field: true, desc: '打開通往營地的傳送門；走進營地的藍色傳送門（或在水晶選「回到傳送門」）就回到原地', cat: 'tool' };
import { WTYPES, mergeFx, FAM_N, STATUS_N } from './content.js?v=1';
import { CLASSES, TREES } from './classes.js?v=1';
import { U2, SETS2, powers } from './loot2.js?v=1';
import { RUNEWORDS, RUNES, PROC_IDS, PROC_HIT, PROC_STRUCK, maxSockets, matchRuneword, runeFx } from './runes.js?v=1';
import { SKILLS } from './data.js?v=1';

export const RARITY = [
  { n: '普通', c: '#e8e8e8' }, { n: '魔法', c: '#7a9aff' }, { n: '稀有', c: '#ffe04a' }, { n: '暗金', c: '#c8a060' }, { n: '套裝', c: '#3ae06a' },
];
const ELS = ['fire', 'ice', 'thunder', 'water', 'wind', 'earth', 'light', 'dark'];
const rint = (a, b, r = Math.random) => a + Math.floor(r() * (b - a + 1));
const pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];
// a roll u in [0, 1] picks a whole number in [a, b]; u = 1 is always the top of the range
const pin = ([a, b], u) => a + Math.min(b - a, Math.floor(u * (b - a + 1)));
const r3 = (x) => Math.round(x * 1000) / 1000;

// ---------------------------------------------------------------- base types
// every base piece made by content.js: weapons, shields, armour in three styles, and jewellery
export const BASES = [];
for (const [id, g] of Object.entries(GEAR)) {
  if (!/^g_/.test(id) || g.rare || g.affix || g.teach === undefined && g.slot === 'acc' && !g.name) continue;
  if (g.slot === 'acc') continue; // rings and amulets are made below
  if (g.tier == null) continue;
  BASES.push(id);
}
// jewellery bases: plain rings and amulets, three grades
const JEWEL = [['ring', '戒指', 0], ['ring', '銀戒指', 3], ['ring', '金戒指', 6], ['amulet', '護身符', 1], ['amulet', '項鍊', 4], ['amulet', '星之項鍊', 7]];
JEWEL.forEach(([kind, name, t], i) => { const id = `j_${kind}${i}`; GEAR[id] = { name, slot: 'acc', kind, tier: t, price: 200 + t * 300 }; BASES.push(id); });
// elite bases: 神話 (tier 8, item level 65+) and 混沌 (tier 9, item level 73+), made from the top base of each kind
for (const id of BASES.slice()) {
  const g = GEAR[id]; if (g.tier !== 7) continue;
  [['神話', 1.25, 8], ['混沌', 1.55, 9]].forEach(([pre, k, t]) => {
    const e = { ...g, name: pre + g.name.replace(/^(星鐵|星辰|星輝|龍骨|龍息|龍筋|龍語|龍鱗|龍紋)/, ''), tier: t, price: Math.round(g.price * k * 1.6), elite: true };
    for (const st of ['atk', 'def', 'mag', 'spr', 'hp', 'mp']) if (e[st] > 0) e[st] = Math.round(e[st] * k);
    const nid = id.replace(/8$/, String(t + 1)); GEAR[nid] = e; BASES.push(nid);
  });
}
// jewellery of the end game
[['ring', '神秘戒指', 8], ['amulet', '混沌項鍊', 9]].forEach(([kind, name, t], i) => { const id = `j_${kind}e${i}`; GEAR[id] = { name, slot: 'acc', kind, tier: t, price: 4000 + t * 500, elite: true }; BASES.push(id); });
const catOf = (g) => g.slot === 'acc' ? 'J' : g.slot === 'hand' ? (g.type === 'shield' ? 'S' : 'W') : 'A';
const ilvlOfTier = (t) => t * 8 + 1; // a base of tier t drops from item level 8t+1 up

// ---------------------------------------------------------------- affixes
// [id, prefix?, categories, tiers: [minIlvl, name, roll(r)]]; roll gives stats (hp, atk, ...) and fx
const T6 = [1, 10, 20, 32, 46, 62];
const tiered = (id, pre, cats, names, ranges, make) => [id, pre, cats, names.map((n, i) => [T6[i], n, (r, u) => make(pin(ranges[i], u), i), undefined, ranges[i]])];
const AFFIXES = [
  // prefixes
  tiered('ed', 1, 'W', ['結實的', '鋒利的', '殘酷的', '兇猛的', '野蠻的', '毀滅的'], [[15, 25], [26, 40], [41, 60], [61, 80], [81, 110], [111, 150]], (v) => ({ ed: v })),
  tiered('edef', 1, 'AS', ['堅固的', '強化的', '堅硬的', '鋼鐵的', '神聖的', '不朽的'], [[15, 25], [26, 40], [41, 60], [61, 80], [81, 100], [101, 140]], (v) => ({ edef: v })),
  tiered('atk', 1, 'WJ', ['粗糙的', '尖銳的', '精準的', '致命的', '血腥的', '屠殺的'], [[2, 4], [5, 8], [9, 14], [15, 22], [23, 32], [33, 45]], (v) => ({ atk: v })),
  tiered('mag', 1, 'WJA', ['見習的', '學者的', '魔導的', '大師的', '大賢者的', '神秘的'], [[2, 4], [5, 8], [9, 14], [15, 22], [23, 32], [33, 45]], (v) => ({ mag: v })),
  tiered('mp', 1, 'AJS', ['湛藍的', '青金的', '藍寶的', '星空的', '深海的', '無盡的'], [[5, 10], [11, 20], [21, 35], [36, 55], [56, 80], [81, 120]], (v) => ({ mp: v })),
  tiered('def', 1, 'AS', ['厚實的', '結實的', '重裝的', '城牆的', '要塞的', '巨石的'], [[2, 4], [5, 9], [10, 15], [16, 24], [25, 34], [35, 48]], (v) => ({ def: v })),
  ...ELS.map((e, i) => tiered('res' + e, 1, 'ASJ', [['紅玉', '藍玉', '黃玉', '碧玉', '翠玉', '琥珀', '珍珠', '黑曜'][i] + '的', ['紅寶', '藍寶', '黃寶', '碧寶', '翠寶', '琥珀', '月光', '暗夜'][i] + '的', ['紅晶', '藍晶', '黃晶', '碧晶', '翠晶', '晶琥', '星光', '幽冥'][i] + '的', '', '', ''].slice(0, 3), [[8, 15], [16, 25], [26, 35]], (v) => ({ res: { [e]: v } }))),
  tiered('resall', 1, 'ASJ', ['稜鏡的', '彩虹的', '極光的'], [[5, 9], [10, 15], [16, 22]], (v) => ({ res: Object.fromEntries(ELS.map(e => [e, v])) })),
  ...ELS.map((e, i) => tiered('el' + e, 1, 'W', [['燃燒的', '冰冷的', '閃電的', '潮濕的', '疾風的', '大地的', '神聖的', '闇黑的'][i], ['烈焰的', '寒霜的', '雷鳴的', '激流的', '狂風的', '岩石的', '光輝的', '深淵的'][i], ['地獄火的', '永凍的', '雷神的', '海神的', '風神的', '山脈的', '天堂的', '虛空的'][i]], [[10, 20], [21, 35], [36, 55]], (v) => ({ fx: { el: e, elUp: { [e]: v / 100 } } }))),
  tiered('leech', 1, 'WJ', ['吸血的', '血之', '吸血鬼的'], [[3, 5], [6, 8], [9, 12]], (v) => ({ fx: { drain: v / 100 } })),
  tiered('mleech', 1, 'WJ', ['汲魔的', '吸魂的', '噬魂的'], [[2, 3], [4, 5], [6, 8]], (v) => ({ fx: { mpdrain: v / 100 } })),
  tiered('mf', 1, 'AJS', ['幸運的', '幸運星的', '天選的'], [[5, 12], [13, 22], [23, 35]], (v) => ({ fx: { mf: v } })),
  tiered('skill', 1, 'WJA', ['', '', '', '大師的', '宗師的', '傳奇的'], [[0, 0], [0, 0], [0, 0], [1, 1], [1, 1], [2, 2]], (v) => ({ fx: { skillAll: v } })),
  ...Object.keys(CLASSES).map((c) => tiered('cls' + c, 1, 'WJ', ['', '', CLASSES[c].name + '的', CLASSES[c].name + '大師的', CLASSES[c].name + '宗師的'], [[0, 0], [0, 0], [1, 1], [1, 2], [2, 3]], (v) => ({ fx: { skillCls: { [c]: v } } }))),
  // suffixes
  tiered('hp', 0, 'ASJ', ['・狐', '・狼', '・熊', '・巨鯨', '・巨象', '・泰坦'], [[8, 15], [16, 30], [31, 55], [56, 90], [91, 140], [141, 220]], (v) => ({ hp: v })),
  tiered('str', 0, 'WJA', ['・力量', '・強壯', '・巨力', '・巨人', '・泰坦之力', '・神力'], [[1, 3], [4, 6], [7, 10], [11, 15], [16, 21], [22, 30]], (v) => ({ atk: v })),
  tiered('spd', 0, 'AJ', ['・敏捷', '・迅捷', '・疾風', '・閃電', '・神速'], [[1, 1], [1, 2], [2, 3], [3, 4], [4, 5]], (v) => ({ spd: v })),
  tiered('spr', 0, 'ASJ', ['・守護', '・心靈', '・聖心', '・天佑'], [[2, 4], [5, 9], [10, 16], [17, 26]], (v) => ({ spr: v })),
  tiered('crit', 0, 'WJ', ['・銳利', '・致命', '・處刑', '・殺戮'], [[3, 5], [6, 9], [10, 14], [15, 20]], (v) => ({ fx: { crit: v / 100 } })),
  tiered('dbl', 0, 'W', ['・連擊', '・疾刃', '・風暴'], [[8, 14], [15, 22], [23, 32]], (v) => ({ fx: { dbl: v / 100 } })),
  tiered('brk', 0, 'W', ['・碎甲', '・破城', '・崩山'], [[8, 14], [15, 22], [23, 32]], (v) => ({ fx: { brk: v / 100 } })),
  tiered('hpP', 0, 'AS', ['・活力', '・生命', '・不朽'], [[4, 7], [8, 12], [13, 18]], (v) => ({ fx: { hpP: v / 100 } })),
  tiered('mpreg', 0, 'AJS', ['・冥想', '・魔泉', '・星辰'], [[1, 2], [2, 3], [3, 5]], (v) => ({ fx: { mpregen: v / 100 } })),
  tiered('block', 0, 'S', ['・格擋', '・壁壘', '・不破'], [[4, 7], [8, 12], [13, 18]], (v) => ({ fx: { blockUp: v / 100 } })),
  tiered('evade', 0, 'AJ', ['・幻影', '・殘像', '・無影'], [[3, 5], [6, 9], [10, 14]], (v) => ({ fx: { evade: v / 100 } })),
  tiered('thorns', 0, 'AS', ['・荊棘', '・刺甲', '・報復'], [[8, 14], [15, 22], [23, 32]], (v) => ({ fx: { thorns: v / 100 } })),
  tiered('counter', 0, 'AS', ['・反擊', '・復仇'], [[8, 14], [15, 24]], (v) => ({ fx: { counter: v / 100 } })),
  tiered('gold', 0, 'AJ', ['・貪婪', '・財富', '・國王'], [[15, 30], [31, 55], [56, 90]], (v) => ({ fx: { gil: v / 100 } })),
  tiered('exp', 0, 'J', ['・學問', '・智慧', '・啟蒙'], [[3, 5], [6, 9], [10, 14]], (v) => ({ fx: { exp: v / 100 } })),
  tiered('heal', 0, 'AJS', ['・慈悲', '・恩典'], [[8, 15], [16, 28]], (v) => ({ fx: { healup: v / 100 } })),
  tiered('regen', 0, 'AJ', ['', '', '・再生', '・不死鳥'], [[0, 0], [0, 0], [1, 1], [1, 1]], (v, i) => ({ fx: { auto: ['regen'], ...(i >= 3 ? { killHeal: 0.05 } : {}) } })),
  tiered('first', 0, 'AJ', ['・先手', '・疾風之足'], [[15, 30], [31, 50]], (v) => ({ fx: { first: v / 100 } })),
  ...[['poison', '・毒蛇', '・蠍王'], ['slow', '・泥沼', '・時之沙'], ['stun', '・雷霆', '・崩雷'], ['blind', '・暗幕', '・夜幕'], ['sleep', '・夢魘', '・永眠']].map(([st, a, b]) => tiered('oh' + st, 0, 'W', [a, b], [[10, 18], [19, 30]], (v) => ({ fx: { onHit: { [st]: v / 100 } } }))),
  ...[['dragon', '・屠龍'], ['undead', '・驅魔'], ['beast', '・獵獸'], ['demon', '・弒魔'], ['machine', '・斬鐵'], ['flying', '・落鷹']].map(([f, n]) => tiered('slay' + f, 0, 'W', [n, n + '者'], [[30, 50], [51, 80]], (v) => ({ fx: { slay: { [f]: +(1 + v / 100).toFixed(2) } } }))),
  ...['poison', 'stun', 'sleep', 'silence', 'blind', 'confuse', 'curse'].map((st) => tiered('im' + st, 0, 'AJ', ['・抗' + STATUS_N[st]], [[1, 1]], () => ({ fx: { immune: [st, ...(st === 'stun' ? ['stop'] : [])] } }))),
  ...ELS.map((e, i) => tiered('pen' + e, 0, 'WJ', ['', '', '', ...[['・焚穿', '・寒穿', '・雷穿', '・潮穿', '・風穿', '・岩穿', '・聖穿', '・闇穿'], ['・焚滅', '・寒滅', '・雷滅', '・潮滅', '・風滅', '・岩滅', '・聖滅', '・闇滅']].map(n => n[i])], [[0, 0], [0, 0], [0, 0], [5, 10], [11, 18]], (v) => ({ fx: { pierce: { [e]: v / 100 } } }))),
  tiered('penphys', 0, 'W', ['', '', '', '・碾碎', '・粉碎'], [[0, 0], [0, 0], [0, 0], [6, 12], [13, 20]], (v) => ({ fx: { pierce: { phys: v / 100 } } })),
  tiered('survive', 0, 'J', ['', '', '', '・不屈'], [[0, 0], [0, 0], [0, 0], [1, 1]], () => ({ fx: { survive: 1 } })),
].map(([id, pre, cats, tiers]) => ({ id, pre: !!pre, cats, tiers: tiers.filter(t => t[1]) })).filter(a => a.tiers.length);
// ---------------------------------------------------------------- the end game tiers: item level 70+, the best only on magic items
const TREE_KEYS = Object.entries(TREES).flatMap(([c, ts]) => ts.map((t, i) => `${c}_${i}`));
export const treeLabel = (key) => { const [c, i] = key.split('_'); return `${CLASSES[c]?.name}・${TREES[c]?.[+i]?.name}`; };
const MO = true, res8 = (v) => Object.fromEntries(ELS.map(e => [e, v]));
const END = {
  ed: [[72, '殘暴的', [151, 200]], [82, '破滅的', [201, 260], MO], [90, '神罰的', [261, 320], MO]].map(([l, n, g, m]) => [l, n, (r, u) => ({ ed: pin(g, u) }), m, g]),
  edef: [[72, '金剛的', [141, 180]], [82, '神盾的', [181, 230], MO], [90, '不滅的', [231, 300], MO]].map(([l, n, g, m]) => [l, n, (r, u) => ({ edef: pin(g, u) }), m, g]),
  atk: [[72, '殘殺的', [46, 60]], [85, '弒神的', [61, 80], MO]].map(([l, n, g, m]) => [l, n, (r, u) => ({ atk: pin(g, u) }), m, g]),
  mag: [[72, '大魔導的', [46, 60]], [85, '神諭的', [61, 80], MO]].map(([l, n, g, m]) => [l, n, (r, u) => ({ mag: pin(g, u) }), m, g]),
  mp: [[72, '星海的', [121, 170]], [85, '虛空的', [171, 230], MO]].map(([l, n, g, m]) => [l, n, (r, u) => ({ mp: pin(g, u) }), m, g]),
  resall: [[72, '萬象的', [23, 30]], [84, '神佑的', [31, 40], MO]].map(([l, n, g, m]) => [l, n, (r, u) => ({ res: res8(pin(g, u)) }), m, g]),
  leech: [[72, '血神的', [13, 16]], [86, '永生的', [17, 20], MO]].map(([l, n, g, m]) => [l, n, (r, u) => ({ fx: { drain: pin(g, u) / 100 } }), m, g]),
  mf: [[72, '命運的', [36, 50]], [86, '眾神寵愛的', [51, 70], MO]].map(([l, n, g, m]) => [l, n, (r, u) => ({ fx: { mf: pin(g, u) } }), m, g]),
  skill: [[74, '神匠的', [2, 2]], [88, '至高的', [3, 3], MO]].map(([l, n, g, m]) => [l, n, (r, u) => ({ fx: { skillAll: pin(g, u) } }), m, g]),
  hp: [[72, '・巨神', [221, 300]], [82, '・世界樹', [301, 380]], [90, '・永恆', [381, 460], MO]].map(([l, n, g, m]) => [l, n, (r, u) => ({ hp: pin(g, u) }), m, g]),
  str: [[72, '・天神之力', [31, 40]], [86, '・創世', [41, 52], MO]].map(([l, n, g, m]) => [l, n, (r, u) => ({ atk: pin(g, u) }), m, g]),
  spd: [[72, '・瞬影', [6, 6]], [86, '・時之神', [7, 8], MO]].map(([l, n, g, m]) => [l, n, (r, u) => ({ spd: pin(g, u) }), m, g]),
  crit: [[72, '・斬首', [21, 28]], [86, '・死神', [29, 35], MO]].map(([l, n, g, m]) => [l, n, (r, u) => ({ fx: { crit: pin(g, u) / 100 } }), m, g]),
  dbl: [[72, '・千刃', [33, 42]], [86, '・無盡', [43, 52], MO]].map(([l, n, g, m]) => [l, n, (r, u) => ({ fx: { dbl: pin(g, u) / 100 } }), m, g]),
  hpP: [[74, '・不死', [19, 25]], [88, '・神軀', [26, 32], MO]].map(([l, n, g, m]) => [l, n, (r, u) => ({ fx: { hpP: pin(g, u) / 100 } }), m, g]),
  mpreg: [[74, '・魔神', [5, 7], MO]].map(([l, n, g, m]) => [l, n, (r, u) => ({ fx: { mpregen: pin(g, u) / 100 } }), m, g]),
  block: [[74, '・神盾', [19, 25]]].map(([l, n, g, m]) => [l, n, (r, u) => ({ fx: { blockUp: pin(g, u) / 100 } }), m, g]),
};
for (const [id, tiers] of Object.entries(END)) { const A = AFFIXES.find(a => a.id === id); if (A) A.tiers.push(...tiers); }
for (const c of Object.keys(CLASSES)) { const A = AFFIXES.find(a => a.id === 'cls' + c); if (A) A.tiers.push([72, CLASSES[c].name + '神匠的', (r) => ({ fx: { skillCls: { [c]: 3 } } })], [88, CLASSES[c].name + '傳說的', (r, u) => ({ fx: { skillCls: { [c]: pin([3, 4], u) } } }), MO, [3, 4]]); }
// +skills to one skill tree, like "+3 to Fire Skills": named after the tree it rolled
AFFIXES.push({ id: 'tree', pre: true, cats: 'WJAS', tiers: [[18, '', (r, u, k) => ({ fx: { skillTree: { [pick(k || TREE_KEYS, r)]: 1 } } })], [44, '', (r, u, k) => ({ fx: { skillTree: { [pick(k || TREE_KEYS, r)]: pin([1, 2], u) } } }), undefined, [1, 2]], [70, '', (r, u, k) => ({ fx: { skillTree: { [pick(k || TREE_KEYS, r)]: pin([2, 3], u) } } }), undefined, [2, 3]], [86, '', (r, u, k) => ({ fx: { skillTree: { [pick(k || TREE_KEYS, r)]: pin([3, 4], u) } } }), MO, [3, 4]]] });
// "12% to cast Chain Lightning Lv 8 on hit" on weapons, and something cast when struck on armour (named after the skill)
const procT = (list, ch) => [[24, [4, 8]], [44, [9, 14]], [66, [15, 20]], [86, [21, 25]]].map(([l, g], ti) => [l, '', (r, u, k) => ({ fx: { proc: [[list === PROC_HIT ? 'hit' : 'struck', k && PROC_IDS.includes(k[0]) ? k[0] : pick(list, r), pin(g, u), ch + ti * 0.02]] } }), ti === 3 ? MO : undefined, g]);
AFFIXES.push({ id: 'procw', pre: false, cats: 'W', tiers: procT(PROC_HIT, 0.1) }, { id: 'proca', pre: false, cats: 'AS', tiers: procT(PROC_STRUCK, 0.12) });
const AFFIX_BY = Object.fromEntries(AFFIXES.map(a => [a.id, a]));
export const AFFIX_COUNT = AFFIXES.reduce((s, a) => s + a.tiers.length, 0);
export const AFFIX_LIST = AFFIXES;

// can a class use this base at all (weapon type, shield, armour style)?
export function canWear(c, b) {
  const G = GEAR[b], X = CLASSES[c]; if (!G || !X) return true;
  if (G.slot === 'acc') return true;
  if (G.slot === 'hand') return G.type === 'shield' ? !!X.shield : X.weapons.includes(G.type);
  return !G.style || X.styles.includes(G.style);
}
function rollAffix(cat, ilvl, pre, taken, r, rar = 1, perfect = false, b = null) {
  const fits = (t) => t[0] <= ilvl && (!t[3] || rar === 1);
  // +class skills only on what that class can use, +tree skills only for the trees of classes that can
  const keys = b ? TREE_KEYS.filter(k => canWear(k.split('_')[0], b)) : TREE_KEYS;
  const forBase = (a) => !b || (/^cls/.test(a.id) ? canWear(a.id.slice(3), b) : a.id !== 'tree' || keys.length > 0);
  const pool = AFFIXES.filter(a => a.pre === pre && a.cats.includes(cat) && !taken.has(a.id) && a.tiers.some(fits) && forBase(a));
  if (!pool.length) return null;
  const A = pick(pool, r); const ok = A.tiers.filter(fits);
  // higher tiers are rarer: weight the best few allowed
  const ti = Math.max(0, ok.length - 1 - Math.floor(Math.pow(r(), 0.6) * Math.min(3, ok.length)));
  const T = ok[ti]; taken.add(A.id);
  const u = perfect ? 1 : r3(r()); // where in the tier's range the value lands (kept, so the tooltip can show it)
  return [A.id, A.tiers.indexOf(T), T[2](r, u, keys), u];
}

// ---------------------------------------------------------------- uniques
// a fixed list of powers made for level lv, as it would be at level L: flat numbers grow fully, chances and percentages a third as fast
function scaleP(p, lv, L) {
  const m = (60 + L * 2.4) / (60 + lv * 2.4), m2 = 1 + (m - 1) * 0.35, q = { ...p };
  for (const k of ['ed', 'edef', 'hp', 'mp', 'atk', 'def', 'mag', 'spr']) if (q[k]) q[k] = Math.round(q[k] * m);
  if (q.spd) q.spd += Math.floor((L - lv) / 25);
  if (q.evade) q.evade = Math.round(q.evade * m2);
  const R = (o) => o && Object.fromEntries(Object.entries(o).map(([e, v]) => [e, Math.min(60, Math.round(v * m2))]));
  if (q.res) q.res = R(q.res);
  if (q.fx) {
    const f = q.fx = { ...q.fx };
    for (const k of Object.keys(f)) {
      if (ROLL_FX.has(k) && typeof f[k] === 'number' && (f[k] < 1 || k === 'mf')) f[k] = k === 'mf' ? Math.round(f[k] * m2) : Math.round(f[k] * m2 * 100) / 100;
      else if (k === 'elUp' || k === 'onHit' || k === 'pierce') f[k] = Object.fromEntries(Object.entries(f[k]).map(([e, v]) => [e, Math.round(v * m2 * 100) / 100]));
      else if (k === 'slay') f[k] = Object.fromEntries(Object.entries(f[k]).map(([e, v]) => [e, Math.round((1 + (v - 1) * m2) * 100) / 100]));
      else if (k === 'res') f[k] = R(f[k]);
    }
  }
  return q;
}
// [id, name, base (weapon type | slot:style | ring | amulet | shield kind), min base tier, level req, powers]
const U = [
  ['u_axe1', '碎顱者', 'axe', 0, 3, { ed: 120, fx: { onHit: { stun: 0.2 }, crit: 0.08 } }, '一把沾著乾血的手斧'],
  ['u_sword1', '黎明之刃', 'sword', 0, 5, { ed: 90, mag: 8, fx: { el: 'light', elUp: { light: 0.3 }, slay: { undead: 1.6 } } }, '晨光照在刃上，亡者就退散'],
  ['u_bow1', '風之低語', 'bow', 1, 9, { ed: 100, spd: 3, fx: { dbl: 0.2, el: 'wind' } }, '射出的箭不會發出聲音'],
  ['u_staff1', '學徒的夢想', 'staff', 0, 4, { mag: 18, mp: 30, fx: { skillAll: 1, mpregen: 0.02 } }, '每個魔法學徒都夢想過它'],
  ['u_dagger1', '毒蛇之吻', 'dagger', 1, 8, { ed: 80, fx: { onHit: { poison: 0.5 }, crit: 0.12 } }, '傷口會慢慢變黑'],
  ['u_head1', '狼首頭盔', 'head:heavy', 1, 10, { edef: 80, hp: 40, fx: { res: { ice: 20 }, counter: 0.1 } }, '戴上它的人，聽得見狼嚎'],
  ['u_body1', '煉獄外套', 'body:light', 2, 14, { edef: 100, fx: { res: { fire: 40 }, thorns: 0.2, auto: ['haste'] } }, '摸起來是溫的'],
  ['u_ring1', '小賊的戒指', 'ring', 0, 6, { spd: 2, fx: { mf: 30, gil: 0.5, steal: 0.3 } }, '你確定它原本是你的嗎？'],
  ['u_amu1', '亡者的眼淚', 'amulet', 1, 12, { mag: 10, fx: { skillCls: { necro: 2 }, drain: 0.05 } }, '一滴凝固的黑色淚珠'],
  ['u_shield1', '城牆', 'shield:tower', 1, 12, { edef: 120, fx: { blockUp: 0.15, res: Object.fromEntries(ELS.map(e => [e, 15])) } }, '它擋下過一整支軍隊'],
  ['u_hammer1', '雷神之鎚', 'hammer', 3, 24, { ed: 160, fx: { el: 'thunder', elUp: { thunder: 0.5 }, onHit: { stun: 0.3 }, chainT: 1 } }, '舉起它的時候會打雷'],
  ['u_spear1', '龍騎之槍', 'spear', 3, 26, { ed: 150, fx: { slay: { dragon: 2.0, flying: 1.5 }, first: 0.4 } }, '刺穿過七條龍的心臟'],
  ['u_gs1', '巨人殺手', 'greatsword', 3, 28, { ed: 180, atk: 15, fx: { brk: 0.35, lowhp: 0.6 } }, '比持有者還要高的劍'],
  ['u_katana1', '村雨', 'katana', 3, 30, { ed: 170, fx: { crit: 0.2, el: 'water', dbl: 0.15 } }, '刀身永遠是濕的'],
  ['u_gun1', '惡魔的獨眼', 'gun', 3, 30, { ed: 150, fx: { crit: 0.15, revealHit: 1, slay: { demon: 1.8 } } }, '它只看得見獵物'],
  ['u_rod1', '永恆之火', 'rod', 3, 28, { mag: 40, fx: { el: 'fire', elUp: { fire: 0.6 }, burnAmp: 1, skillCls: { sorc: 2 } } }, '火焰在杖頭燒了三百年'],
  ['u_tome1', '禁忌之書', 'tome', 3, 32, { mag: 45, fx: { skillAll: 2, mpcost: -0.2, dualcast: 0.15 } }, '翻開它的人都瘋了'],
  ['u_knuckle1', '虎王之爪', 'knuckle', 3, 26, { ed: 160, spd: 3, fx: { dbl: 0.3, skillCls: { monk: 2 } } }, '猛虎的爪子打造的拳套'],
  ['u_whip1', '女王的鞭', 'whip', 3, 26, { ed: 140, fx: { onHit: { confuse: 0.25 }, skillCls: { bard: 2 } } }, '被抽到的人會跪下'],
  ['u_harp1', '天使的豎琴', 'harp', 3, 28, { mag: 30, mp: 50, fx: { healup: 0.4, skillCls: { bard: 2 } } }, '天使彈過的琴弦'],
  ['u_boom1', '永不迷途', 'boomerang', 2, 18, { ed: 120, fx: { dbl: 0.2, drop: 0.3 } }, '扔出去就一定會回來'],
  ['u_body2', '泰坦之鎧', 'body:heavy', 4, 36, { edef: 150, hp: 150, fx: { hpP: 0.15, survive: 1 } }, '巨人族的戰甲'],
  ['u_body3', '星辰法袍', 'body:robe', 4, 36, { edef: 100, mag: 30, mp: 80, fx: { skillAll: 1, res: Object.fromEntries(ELS.map(e => [e, 20])) } }, '縫著星圖的長袍'],
  ['u_head2', '賢者之冠', 'head:robe', 3, 30, { mag: 25, fx: { skillAll: 1, mpregen: 0.03 } }, '戴上它，思緒會變得清晰'],
  ['u_feet1', '赫密斯之靴', 'feet:light', 2, 20, { spd: 5, fx: { first: 0.5, evade: 0.1 } }, '穿上它的人腳不沾地'],
  ['u_arms1', '血手套', 'arms:light', 2, 18, { atk: 15, fx: { drain: 0.08, crit: 0.08 } }, '洗不掉的紅色'],
  ['u_waist1', '巨魔腰帶', 'waist:heavy', 2, 20, { hp: 80, fx: { auto: ['regen'], hpP: 0.1 } }, '巨魔的皮做的'],
  ['u_back1', '吸血鬼斗篷', 'back:light', 3, 26, { edef: 80, fx: { drain: 0.06, res: { dark: 40 }, evade: 0.06 } }, '在月光下會展開成翅膀'],
  ['u_legs1', '鐵壁護腿', 'legs:heavy', 3, 24, { edef: 120, def: 15, fx: { immune: ['slow', 'stun', 'stop'] } }, '穿上它的人不會倒下'],
  ['u_ring2', '烏洛波洛斯', 'ring', 4, 40, { atk: 12, mag: 12, fx: { skillAll: 1, drain: 0.04, mpdrain: 0.03 } }, '咬著自己尾巴的蛇'],
  ['u_ring3', '王者之戒', 'ring', 5, 50, { hp: 60, mp: 30, fx: { mf: 40, res: Object.fromEntries(ELS.map(e => [e, 20])), skillAll: 1 } }, '只有王能戴'],
  ['u_amu2', '女神的祝福', 'amulet', 4, 40, { spr: 25, fx: { skillAll: 2, healup: 0.3, res: Object.fromEntries(ELS.map(e => [e, 25])) } }, '神殿裡供奉了千年'],
  ['u_amu3', '狂戰士之心', 'amulet', 3, 30, { atk: 20, fx: { skillCls: { barb: 3 }, lowhp: 0.5 } }, '還在跳動'],
  ['u_amu4', '影之護符', 'amulet', 3, 30, { spd: 3, fx: { skillCls: { assassin: 3 }, evade: 0.08 } }, '看不見它的影子'],
  ['u_amu5', '森林之心', 'amulet', 3, 30, { hp: 60, fx: { skillCls: { druid: 3 }, auto: ['regen'] } }, '長著青苔的寶石'],
  ['u_amu6', '聖光護符', 'amulet', 3, 30, { def: 15, fx: { skillCls: { paladin: 3 }, slay: { undead: 1.5 } } }, '永遠發著微光'],
  ['u_amu7', '鷹之眼', 'amulet', 3, 30, { atk: 12, fx: { skillCls: { ranger: 3 }, crit: 0.1 } }, '一顆鷹的眼睛化成的寶石'],
  ['u_amu8', '齒輪之心', 'amulet', 3, 30, { atk: 10, mag: 10, fx: { skillCls: { gunner: 3 } } }, '滴答作響'],
  ['u_amu9', '元素之眼', 'amulet', 3, 30, { mag: 20, fx: { skillCls: { sorc: 3 } } }, '四種顏色在裡面流轉'],
  ['u_amu10', '禪心', 'amulet', 3, 30, { spr: 20, fx: { skillCls: { monk: 3 }, mpregen: 0.03 } }, '握著它，心就靜了'],
  ['u_axe2', '世界之樹斧', 'axe', 5, 50, { ed: 220, hp: 100, fx: { skillCls: { barb: 2 }, brk: 0.3, el: 'earth' } }, '從世界樹上砍下來的枝幹做的柄'],
  ['u_sword2', '斬龍劍', 'sword', 5, 52, { ed: 230, fx: { slay: { dragon: 2.5 }, crit: 0.15, el: 'fire' } }, '傳說中屠龍英雄的劍'],
  ['u_bow2', '天弓', 'bow', 5, 54, { ed: 220, spd: 4, fx: { dbl: 0.3, crit: 0.15, skillCls: { ranger: 2 } } }, '弦是用彩虹做的'],
  ['u_staff2', '世界之杖', 'staff', 5, 54, { mag: 70, mp: 100, fx: { skillAll: 2, mpregen: 0.04, dualcast: 0.1 } }, '大魔導師的遺物'],
  ['u_dagger2', '弒神', 'dagger', 5, 56, { ed: 250, spd: 4, fx: { crit: 0.25, onHit: { doom: 0.1 } } }, '刺過神的短劍'],
  ['u_shield2', '神盾', 'shield:aegis', 5, 55, { edef: 180, fx: { blockUp: 0.2, mblock: 0.2, res: Object.fromEntries(ELS.map(e => [e, 30])), auto: ['reflect'] } }, '連神的雷霆都擋得下'],
  ['u_head3', '魔王之角', 'head:heavy', 5, 55, { edef: 140, atk: 20, mag: 20, fx: { skillAll: 2, lowhp: 0.4 } }, '從魔王頭上折下來的角'],
  ['u_feet2', '七里靴', 'feet:heavy', 5, 50, { spd: 6, edef: 120, fx: { first: 1, mf: 25 } }, '一步就是七里'],
];
export const UNIQUES = {};
for (const [id, name, base, tier, lv, p, flavor] of U) UNIQUES[id] = { id, name, base, tier, lv, p, flavor, mk: (L) => scaleP(p, lv, L) };
// the hundred from loot2.js: powers grow with their level
const isWpn = (b) => !!WTYPES[b.split(':')[0]];
U2.forEach(([name, base, lv, tokens, flavor], i) => { UNIQUES[`u2_${i}`] = { id: `u2_${i}`, name, base, tier: Math.min(9, Math.floor(lv / 9)), lv, p: powers(tokens, lv, isWpn(base)), flavor, mk: (L) => powers(tokens, L, isWpn(base)) }; });

// ---------------------------------------------------------------- sets
// pieces: [base, piece name, own powers]; bonus[n] applies when n pieces are worn
const SETS_DEF = [
  ['s_wolf', '狼群', 6, [['axe', '狼牙斧', { ed: 60 }], ['head:light', '狼首帽', { hp: 30 }], ['body:light', '狼皮甲', { edef: 50 }]], { 2: { fx: { crit: 0.08 } }, 3: { fx: { dbl: 0.2, skillCls: { barb: 1 } } } }],
  ['s_sage', '見習賢者', 6, [['rod', '見習魔杖', { mag: 8 }], ['head:robe', '見習法帽', { mp: 20 }], ['body:robe', '見習長袍', { mag: 6 }]], { 2: { fx: { mpregen: 0.02 } }, 3: { fx: { skillAll: 1 } } }],
  ['s_hunter', '獵人', 10, [['bow', '獵人長弓', { ed: 60 }], ['arms:light', '獵人護手', { atk: 5 }], ['feet:light', '獵人長靴', { spd: 2 }], ['back:light', '獵人斗篷', { evade: 5 }]], { 2: { fx: { slay: { beast: 1.4, flying: 1.4 } } }, 3: { fx: { crit: 0.1 } }, 4: { fx: { skillCls: { ranger: 2 }, dbl: 0.15 } } }],
  ['s_vigil', '守夜人', 14, [['sword', '守夜人之劍', { ed: 80 }], ['shield:kite', '守夜人之盾', { edef: 60 }], ['body:heavy', '守夜人鎧甲', { edef: 60 }], ['head:heavy', '守夜人頭盔', { hp: 40 }]], { 2: { fx: { slay: { undead: 1.5 } } }, 3: { fx: { blockUp: 0.1, res: { dark: 30 } } }, 4: { fx: { skillCls: { paladin: 2 }, auto: ['protect'] } } }],
  ['s_shadow', '影舞', 18, [['dagger', '影舞短劍', { ed: 90 }], ['body:light', '影舞夜行衣', { edef: 60 }], ['feet:light', '影舞足袋', { spd: 3 }], ['back:light', '影舞面紗', { evade: 6 }]], { 2: { fx: { evade: 0.08 } }, 3: { fx: { first: 0.5 } }, 4: { fx: { skillCls: { assassin: 2 }, dodgeCounter: 1 } } }],
  ['s_inferno', '焰獄', 26, [['staff', '焰獄法杖', { mag: 20 }], ['head:robe', '焰獄法冠', { mag: 10 }], ['body:robe', '焰獄法袍', { res: { fire: 30 } }], ['arms:robe', '焰獄手套', { mag: 8 }]], { 2: { fx: { elUp: { fire: 0.25 } } }, 3: { fx: { burnAmp: 1, spreadBurn: 1 } }, 4: { fx: { skillAll: 2, elUp: { fire: 0.4 } } } }],
  ['s_bastion', '不滅', 34, [['shield:tower', '不滅塔盾', { edef: 100 }], ['body:heavy', '不滅重鎧', { hp: 80 }], ['legs:heavy', '不滅護腿', { def: 15 }], ['feet:heavy', '不滅鐵靴', { edef: 80 }], ['waist:heavy', '不滅腰甲', { hp: 50 }]], { 2: { fx: { hpP: 0.1 } }, 3: { fx: { blockUp: 0.15 } }, 4: { fx: { thorns: 0.3, survive: 1 } }, 5: { fx: { res: Object.fromEntries(ELS.map(e => [e, 30])), auto: ['regen'] } } }],
  ['s_storm', '雷帝', 40, [['gun', '雷帝之槍', { ed: 120 }], ['head:light', '雷帝頭巾', { spd: 2 }], ['body:light', '雷帝戰衣', { res: { thunder: 40 } }], ['arms:light', '雷帝護腕', { atk: 10 }]], { 2: { fx: { el: 'thunder', elUp: { thunder: 0.3 } } }, 3: { fx: { shockStun: 1 } }, 4: { fx: { skillCls: { gunner: 2 }, chainT: 1 } } }],
  ['s_nature', '大地之子', 44, [['hammer', '大地之鎚', { ed: 130 }], ['body:light', '樹皮甲', { hp: 80 }], ['back:light', '藤蔓斗篷', { res: { earth: 40 } }], ['amulet', '種子護符', { hp: 50 }]], { 2: { fx: { auto: ['regen'] } }, 3: { fx: { healup: 0.3 } }, 4: { fx: { skillCls: { druid: 2 }, hpP: 0.15 } } }],
  ['s_dragon', '龍王', 56, [['greatsword', '龍王之劍', { ed: 200 }], ['head:heavy', '龍王之冠', { edef: 120 }], ['body:heavy', '龍鱗鎧', { edef: 140 }], ['arms:heavy', '龍爪護手', { atk: 20 }], ['ring', '龍之眼', { hp: 60 }]], { 2: { fx: { slay: { dragon: 2 } } }, 3: { fx: { res: { fire: 40, ice: 40 } } }, 4: { fx: { skillAll: 1, crit: 0.15 } }, 5: { fx: { skillAll: 2, hpP: 0.2, lowhp: 0.5 } } }],
];
export const SETS = {}; export const SET_ITEMS = {};
for (const [id, name, lv, pieces, bonus] of SETS_DEF) {
  SETS[id] = { id, name, lv, bonus, pieces: pieces.map((p, i) => `${id}_${i}`) };
  pieces.forEach(([base, pn, own], i) => {
    // the piece's own power on top of the stats any piece of its kind and level carries
    const caster = /^(rod|staff|harp)/.test(base), st = powers(isWpn(base) ? `ed ${caster ? 'mag' : 'str'}` : base === 'ring' || base === 'amulet' ? 'hp' : 'edef hp', lv, isWpn(base), 0.6), p = { ...st, ...own, fx: { ...st.fx, ...(own.fx || {}) } };
    for (const k of ['ed', 'edef', 'hp', 'mp', 'atk', 'mag']) if (st[k] && own[k]) p[k] = st[k] + own[k];
    SET_ITEMS[`${id}_${i}`] = { id: `${id}_${i}`, set: id, name: pn, base, lv, p, mk: (L) => scaleP(p, lv, L) };
  });
}
// the thirty from loot2.js: each piece carries one of the theme's powers and its stats, and the whole set outgrows the uniques
SETS2.forEach(([name, lv, cls, themes, pieces], si) => {
  const id = `s2_${si}`, t = themes.split(' '), n = pieces.length, top = (cls ? `cls:${cls} ` : '') + 'skill resall';
  const bonus = { 2: { fx: powers(t[0], lv, false, 1, true).fx }, 3: { fx: powers(n === 3 ? `${t[1]} ${t[2]} ${top}` : t[1], lv, false, 1, true).fx } };
  if (n >= 4) bonus[4] = { fx: powers(n === 4 ? `${t[2]} ${top}` : `${t[2]} skill`, lv, false, 1.1, true).fx };
  if (n >= 5) bonus[5] = { fx: powers(`${top} ${t[0]} skill`, lv, false, 1.1, true).fx };
  SETS[id] = { id, name, lv, bonus, pieces: pieces.map((p, i) => `${id}_${i}`) };
  pieces.forEach(([base, pn], i) => { const caster = /^(rod|staff|harp)/.test(base) || ['sorc', 'necro', 'druid', 'bard'].includes(cls), tok = `${isWpn(base) ? `ed ${caster ? 'mag' : 'str'}` : base === 'ring' || base === 'amulet' ? `hp ${caster ? 'mag' : 'str'}` : 'edef hp'} ${t[i % t.length]}`; SET_ITEMS[`${id}_${i}`] = { id: `${id}_${i}`, set: id, name: pn, base, lv, p: powers(tok, lv, isWpn(base), 0.85), mk: (L) => powers(tok, L, isWpn(base), 0.85) }; });
});
export function setBonusFx(equipIds) {
  const count = {};
  for (const id of equipIds) { const g = GEAR[id]; if (g?.lootSet) count[g.lootSet] = (count[g.lootSet] || 0) + 1; }
  const out = [];
  for (const [s, n] of Object.entries(count)) for (const [k, b] of Object.entries(SETS[s].bonus)) if (n >= +k) out.push(b.fx || {});
  return { count, fx: out };
}

// ---------------------------------------------------------------- a base piece that fits a description
function baseFor(desc, tierMin, ilvl, r) {
  const maxT = Math.max(tierMin, Math.min(9, Math.floor((ilvl - 1) / 8)));
  const t = rint(tierMin, maxT, r);
  if (desc === 'ring' || desc === 'amulet') return pick(BASES.filter(b => GEAR[b].kind === desc && GEAR[b].tier <= Math.max(GEAR[b].tier, t)), r);
  const [a, b] = desc.split(':');
  if (a === 'shield') return `g_${b}${t + 1}`;
  if (WTYPES[a]) return `g_${a}${t + 1}`;
  return `g_${a}_${b}${t + 1}`;
}

// ---------------------------------------------------------------- making items
let uidN = 0;
export function newUid(S) { S.uidN = (S.uidN || 0) + 1; return 'L' + S.uidN.toString(36) + Math.floor(Math.random() * 1296).toString(36); }
// roll a drop. o: { mf, rarity (force), minRarity, cat }
export function rollItem(S, ilvl, o = {}, r = Math.random) {
  ilvl = Math.max(1, Math.min(99, Math.round(ilvl)));
  const mf = o.mf || 0, eff = (k) => mf * k / (mf + k); // diminishing returns, as in the old games
  let rar = o.rarity;
  if (rar == null) {
    const x = r(), q = o.quality || 1;
    if (x < 0.004 * q * (1 + eff(250) / 100)) rar = 3;
    else if (x < 0.012 * q * (1 + eff(500) / 100)) rar = 4;
    else if (x < 0.06 * q * (1 + eff(600) / 100)) rar = 2;
    else if (x < 0.36 * q * (1 + mf / 100)) rar = 1;
    else rar = 0;
    if (o.minRarity) rar = Math.max(rar, o.minRarity);
  }
  const pf = o.perfect ?? r() < 0.004 * (o.quality || 1); // a perfect piece: every number at the top of its range
  if (rar === 3) { const all = Object.values(UNIQUES).filter(u => u.lv <= ilvl + 4), near = all.filter(u => u.lv >= ilvl - 30), pool = near.length ? near : all; if (pool.length) { const u = pick(pool, r); return register(S, { b: baseFor(u.base, u.tier, Math.max(ilvl, ilvlOfTier(u.tier)), r), r: 3, il: ilvl, u: u.id, ...(pf ? { pf: 1 } : {}) }); } rar = 2; }
  if (rar === 4) { const all = Object.values(SET_ITEMS).filter(p => p.lv <= ilvl + 4), near = all.filter(p => p.lv >= ilvl - 30), pool = near.length ? near : all; if (pool.length) { const p = pick(pool, r); return register(S, { b: baseFor(p.base, Math.min(9, Math.floor(p.lv / 9)), Math.max(ilvl, p.lv), r), r: 4, il: ilvl, s: p.id, ...(pf ? { pf: 1 } : {}) }); } rar = 2; }
  // a base piece the item level allows (jewellery only comes magic or better)
  const maxT = Math.max(0, Math.min(9, Math.floor((ilvl - 1) / 8))), tt = Math.max(0, maxT - (r() < 0.65 ? 0 : 1)); // mostly the best base the level allows
  let pool = BASES.filter(b => GEAR[b].tier === tt || GEAR[b].slot === 'acc' && GEAR[b].tier <= tt);
  if (o.cat) pool = pool.filter(b => catOf(GEAR[b]) === o.cat);
  if (rar === 0) pool = pool.filter(b => GEAR[b].slot !== 'acc');
  if (!pool.length) pool = BASES.filter(b => GEAR[b].tier === 0);
  const b = pick(pool, r), cat = catOf(GEAR[b]), taken = new Set(), a = [];
  if (rar === 1) { const np = r() < 0.6 ? 1 : 0, ns = np && r() < 0.5 ? 0 : 1; for (let i = 0; i < np; i++) { const x = rollAffix(cat, ilvl, true, taken, r, 1, pf, b); if (x) a.push(x); } for (let i = 0; i < ns || !a.length && i < 1; i++) { const x = rollAffix(cat, ilvl, false, taken, r, 1, pf, b); if (x) a.push(x); } }
  if (rar === 2) { const n = rint(ilvl >= 70 ? 4 : 3, ilvl >= 30 ? 6 : 5, r); let pre = 0, suf = 0; for (let i = 0; i < n; i++) { const want = pre >= 3 ? false : suf >= 3 ? true : r() < 0.5; const x = rollAffix(cat, ilvl, want, taken, r, 2, pf, b); if (x) { a.push(x); if (want) pre++; else suf++; } } }
  const spec = { b, r: rar, il: ilvl, a, ...(pf ? { pf: 1 } : {}) };
  if (rar === 2) spec.n = rareName(r);
  if (rar === 0 && r() < 0.15) spec.q = rint(5, 15, r); // superior
  if (rar === 0 && r() < 0.3) spec.so = rint(1, maxSockets(GEAR[b], ilvl), r); // sockets, for runes
  return register(S, spec);
}
const RARE_A = ['血腥', '幽魂', '暴風', '亡靈', '烈陽', '寒夜', '星辰', '深淵', '狂怒', '腐朽', '雷鳴', '月影', '荊棘', '鋼鐵', '黃金', '骸骨', '黎明', '黃昏', '災厄', '聖潔'];
const RARE_B = ['之牙', '之魂', '之嚎', '之心', '之眼', '之刃', '之咒', '之歌', '之翼', '之印', '之怒', '之誓', '之淚', '之鱗', '之爪', '之冠'];
const rareName = (r) => pick(RARE_A, r) + pick(RARE_B, r);

// put a spec into the save and the GEAR table
export function register(S, spec) {
  const uid = spec.uid || newUid(S); spec.uid = uid;
  if (spec.bu == null) { spec.bu = spec.pf ? 1 : r3(Math.random()); spec.v = []; } // a new piece: its base and its powers get rolled in build()
  S.loot = S.loot || {}; S.loot[uid] = spec;
  GEAR[uid] = build(spec);
  return uid;
}
export function restoreLoot(S) { for (const [uid, spec] of Object.entries(S.loot || {})) GEAR[uid] = build(spec); }
export function dropLoot(S, uid) { delete S.loot?.[uid]; }
// the level a piece is made at, and awakening a god piece to level L (its rolls stay at the top)
export const lootLevel = (spec) => Math.max(spec.aw || 0, spec.il || 1, UNIQUES[spec.u]?.lv || 0, SET_ITEMS[spec.s]?.lv || 0, RUNEWORDS[spec.rw]?.lv || 0);
// sockets and runes, done at the smith; runes stay in for good, and the right ones in order make a runeword
export function socketItem(S, uid, n) { const spec = S.loot?.[uid]; if (!spec) return false; spec.so = n; GEAR[uid] = build(spec); forgetGear(uid); return true; }
export function insertRune(S, uid, i) {
  const spec = S.loot?.[uid]; if (!spec) return null;
  spec.rn = [...(spec.rn || []), i];
  const w = matchRuneword(GEAR[spec.b], spec.rn, spec.so); if (w) spec.rw = w.id;
  GEAR[uid] = build(spec); forgetGear(uid); return w;
}
export function awaken(S, uid, L) {
  const spec = S.loot?.[uid]; if (!spec) return false;
  spec.aw = Math.min(99, L); spec.pf = 1; for (const a of spec.a || []) a[3] = 1;
  GEAR[uid] = build(spec); forgetGear(uid); return true;
}

const STATK = ['hp', 'mp', 'atk', 'def', 'mag', 'spr', 'spd'];
// ---------------------------------------------------------------- rolled numbers
// Like the old games, every number on a piece is rolled: the base stats within 10%, a unique's or set piece's powers
// within 20% of their listed value, and affixes within their tier. Each roll is kept as [key, value, worst, best, step, steps].
// A piece with every roll at its top step is a perfect one.
const ROLL_TOP = ['ed', 'edef', 'hp', 'mp', 'atk', 'def', 'mag', 'spr', 'spd', 'evade'];
const ROLL_FX = new Set(['crit', 'dbl', 'drain', 'mpdrain', 'mf', 'gil', 'exp', 'blockUp', 'mblock', 'evade', 'thorns', 'counter', 'first', 'lowhp', 'brk', 'dualcast', 'killHeal', 'healup', 'mpregen', 'hpP', 'mpcost', 'drop', 'steal']);
const ROLL_NEST = ['elUp', 'onHit', 'slay', 'pierce'];
const fix2 = (x) => Math.round(x * 100) / 100;
// the range of a listed value v, give or take k, and where roll u lands in it
function rollV(v, k, u, slay) {
  if (slay) { const x = rollV(v - 1, k, u); x[0] = fix2(x[0] + 1); x[1] = fix2(x[1] + 1); x[2] = fix2(x[2] + 1); return x; }
  const st = Number.isInteger(v) ? 1 : 0.01, w = fix2(Math.round(v * (1 - k) / st) * st), b = fix2(Math.round(v * (1 + k) / st) * st);
  const n = Math.round(Math.abs(b - w) / st), i = Math.min(n, Math.floor(u * (n + 1)));
  return [fix2(w + Math.sign(b - w) * i * st), w, b, i, n];
}
function rollPowers(p, U, out, k = 0.2) {
  if (!p) return p;
  const q = { ...p }, one = (key, v, slay) => { const [x, w, b, i, n] = rollV(v, k, U(), slay); if (n) out.push([key, x, w, b, i, n]); return x; };
  for (const key of ROLL_TOP) if (typeof q[key] === 'number' && q[key]) q[key] = one(key, q[key]);
  if (q.res) { q.res = { ...q.res }; for (const e of Object.keys(q.res)) q.res[e] = one('res.' + e, q.res[e]); }
  if (q.fx) {
    const f = q.fx = { ...q.fx };
    for (const key of Object.keys(f)) {
      if (ROLL_FX.has(key) && typeof f[key] === 'number' && f[key] && f[key] < 1 || key === 'mf' && f[key]) f[key] = one('fx.' + key, f[key]);
      else if (ROLL_NEST.includes(key) && f[key] && typeof f[key] === 'object') { f[key] = { ...f[key] }; for (const e of Object.keys(f[key])) f[key][e] = one(key + '.' + e, f[key][e], key === 'slay'); }
      else if (key === 'res' && f.res) { f.res = { ...f.res }; for (const e of Object.keys(f.res)) f.res[e] = one('res.' + e, f.res[e]); }
    }
  }
  return q;
}
const TREES_N = (p) => { const k = Object.keys(p.fx?.skillTree || {})[0]; return k ? TREES[k.split('_')[0]]?.[+k.split('_')[1]]?.name || '' : ''; };
function apply(g, p) {
  if (!p) return;
  if (p.ed && g.atk) g.atk = Math.round(g.atk * (1 + p.ed / 100));
  if (p.ed && g.mag && !g.atk) g.mag = Math.round(g.mag * (1 + p.ed / 100));
  if (p.edef && g.def) { g.def = Math.round(g.def * (1 + p.edef / 100)); if (g.spr) g.spr = Math.round(g.spr * (1 + p.edef / 200)); }
  if (p.edef && !g.def) g.def = Math.round(3 + p.edef / 10);
  for (const k of STATK) if (p[k]) g[k] = (g[k] || 0) + p[k];
  const fx = { ...(p.fx || {}) };
  if (p.res) fx.res = { ...(fx.res || {}), ...p.res };
  if (p.evade) fx.evade = (fx.evade || 0) + p.evade / 100;
  g.fx = mergeFx(g.fx || {}, fx);
}
// awakening: a god piece remade at a higher level, on the base of that level, every affix at its best tier there
const upBase = (id, L) => { const m = /^(g_.+?)(\d+)$/.exec(id); if (!m) return id; const t = Math.min(9, Math.floor((L - 1) / 8)); return +m[2] - 1 < t && GEAR[m[1] + (t + 1)] ? m[1] + (t + 1) : id; };
const topTier = (A, L, rar) => { let best = -1; A.tiers.forEach((t, i) => { if (t[0] <= L && (!t[3] || rar === 1)) best = i; }); return best; };
export function build(spec) {
  const aw = spec.aw || 0, bid = aw ? upBase(spec.b, aw) : spec.b;
  const B = GEAR[bid]; if (!B) return { name: '???', slot: 'acc', tier: 0, price: 1 };
  const g = { ...B, fx: { ...(B.fx || {}) }, base: bid, awake: aw || undefined, baseName: B.name, rarity: spec.r, il: Math.max(spec.il, aw), uid: spec.uid, loot: true };
  delete g.teach; delete g.ap;
  // the rolls: pieces from before rolls existed have none, and keep the middle of every range
  const rolls = g.rolls = [], old = spec.bu == null, V = spec.v || [];
  let vi = 0; const U = () => spec.pf ? 1 : old ? 0.5 : (V[vi] ??= r3(Math.random()), V[vi++]);
  const bu = spec.pf ? 1 : old ? 0.5 : spec.bu;
  for (const k of ['atk', 'def', 'mag', 'spr', 'hp', 'mp']) if (B[k] > 0 && !old) { const [x, w, b, i, n] = rollV(B[k], 0.1, bu); g[k] = x; if (n) rolls.push(['base.' + k, x, w, b, i, n]); }
  if (spec.q) { if (g.atk) g.atk = Math.round(g.atk * (1 + spec.q / 100)); if (g.def) g.def = Math.round(g.def * (1 + spec.q / 100)); }
  let pre = '', suf = '';
  for (let [aid, ti, p, u] of spec.a || []) {
    const A0 = AFFIX_BY[aid];
    if (aw && A0) { const t2 = topTier(A0, aw, spec.r); if (t2 > ti) { ti = t2; const T = A0.tiers[ti]; p = aid === 'tree' ? { fx: { skillTree: { [Object.keys(p.fx?.skillTree || {})[0] || TREE_KEYS[0]]: T[4] ? pin(T[4], u ?? 1) : 1 } } } : T[2](Math.random, u ?? 1, aid.startsWith('proc') ? [p.fx?.proc?.[0]?.[1]] : undefined); } }
    const A = AFFIX_BY[aid], rg = A?.tiers[ti]?.[4]; if (u != null && rg && rg[1] > rg[0]) rolls.push(['aff.' + aid, pin(rg, u), rg[0], rg[1], pin(rg, u) - rg[0], rg[1] - rg[0]]); apply(g, p); if (A && spec.r === 1) { if (aid === 'tree') pre = TREES_N(p) + '的'; else if (aid.startsWith('proc')) suf = '・' + (SKILLS[p.fx?.proc?.[0]?.[1]]?.name || ''); else if (A.pre) pre = A.tiers[ti]?.[1] || ''; else suf = A.tiers[ti]?.[1] || ''; } }
  const RP = (p) => old ? p : rollPowers(p, U, rolls);
  for (const i of spec.rn || []) apply(g, runeFx(i, B));
  const RW = RUNEWORDS[spec.rw];
  if (RW) { apply(g, RP(aw > RW.lv ? scaleP(RW.p, RW.lv, aw) : RW.p)); g.name = RW.name; g.flavor = RW.flavor; g.lvReq = RW.lv; g.rw = spec.rw; }
  if (spec.so) { g.sock = spec.so; g.runes = spec.rn || []; }
  if (spec.u) { const u = UNIQUES[spec.u]; apply(g, RP(aw > u.lv ? u.mk(aw) : u.p)); g.name = u.name; g.flavor = u.flavor; g.lvReq = u.lv; g.uniq = spec.u; }
  else if (spec.s) { const p = SET_ITEMS[spec.s]; apply(g, RP(aw > p.lv ? p.mk(aw) : p.p)); g.name = p.name; g.lootSet = p.set; g.lvReq = p.lv; g.setPiece = spec.s; }
  else if (spec.r === 2) { g.name = spec.n; g.lvReq = Math.max(1, Math.floor(spec.il * 0.7)); }
  else if (!RW) { g.name = (spec.q ? '精良的' : '') + pre + B.name + suf + (spec.so ? `〔${spec.so}孔〕` : ''); g.lvReq = spec.r === 1 ? Math.max(1, Math.floor(spec.il * 0.6)) : Math.max(1, B.tier * 6); }
  if (spec.rn?.length) g.lvReq = Math.max(g.lvReq || 1, ...spec.rn.map(i => RUNES[i].lv));
  g.lvReq = Math.min(90, Math.max(g.lvReq || 1, B.tier * 6 + (B.tier >= 8 ? (B.tier - 7) * 6 : 0), aw ? aw - 8 : 0));
  g.color = undefined; g.rarColor = RW ? '#e0c080' : RARITY[spec.r].c;
  // how good the rolls are, 0..1; every one at the top makes a perfect piece (only magic or better counts)
  g.qual = rolls.length ? rolls.reduce((s, x) => s + x[4] / x[5], 0) / rolls.length : null;
  // every one at the top is a perfect piece; it is a god piece when that was a 1-in-100 shot or worse (a ring of +1-2 speed is not)
  g.maxed = rolls.length > 0 && rolls.every(x => x[4] === x[5]);
  g.godly = (spec.r >= 1 || !!RW) && g.maxed && (spec.pf || rolls.reduce((p, x) => p * (x[5] + 1), 1) >= 100);
  if (g.godly) g.name = '★' + g.name;
  g.price = Math.round(((B.price || 100) * [1, 1.8, 3.5, 8, 6][spec.r] + (spec.a || []).length * 80 * (1 + spec.il / 10)) * (g.qual == null ? 1 : 0.8 + g.qual * 0.4) * (g.godly ? 3 : 1) * (aw ? 1.5 : 1) * (RW ? 4 : 1)) + (spec.rn || []).reduce((s, i) => s + ITEMS[RUNES[i].id].price, 0);
  return g;
}

// ---------------------------------------------------------------- the codex: a piece as it drops at its own level, every number at its top
export function previewGear(kind, id) {
  const key = `_pv_${kind}_${id}`; if (GEAR[key]) return key;
  let spec;
  if (kind === 'u') { const u = UNIQUES[id]; spec = { b: baseFor(u.base, u.tier, Math.max(u.lv, ilvlOfTier(u.tier)), () => 0), r: 3, il: u.lv, u: id }; }
  else if (kind === 's') { const p = SET_ITEMS[id], t = Math.min(9, Math.floor(p.lv / 9)); spec = { b: baseFor(p.base, t, Math.max(p.lv, ilvlOfTier(t)), () => 0), r: 4, il: p.lv, s: id }; }
  else spec = { b: id, r: 0, il: ilvlOfTier(GEAR[id]?.tier || 0), a: [] };
  Object.assign(spec, { uid: key, bu: 1, pf: 1, v: [] });
  const g = build(spec); g.preview = true; g.godly = false; g.maxed = false; g.name = g.name.replace(/^★/, '');
  GEAR[key] = g; return key;
}
export const baseKindOf = (b) => catOf(GEAR[b]);

// ---------------------------------------------------------------- the tooltip text of an item
const RES_N = { fire: '火焰', ice: '冰霜', thunder: '雷電', water: '水', wind: '風', earth: '大地', light: '神聖', dark: '暗黑' };
export function lootLines(g) {
  const o = [], fx = g.fx || {};
  if (fx.skillAll) o.push(`+${fx.skillAll} 所有技能等級`);
  if (fx.skillCls) for (const [c, n] of Object.entries(fx.skillCls)) o.push(`+${n} ${CLASSES[c]?.name}技能等級`);
  if (fx.skillTree) for (const [k, n] of Object.entries(fx.skillTree)) o.push(`+${n} ${treeLabel(k)}技能等級`);
  if (fx.res) { const v = ELS.map(e => fx.res[e] || 0), all = Math.min(...v); if (all > 0) o.push(`所有抗性 +${all}%`); for (const e of ELS) if ((fx.res[e] || 0) > all) o.push(`${RES_N[e]}抗性 +${fx.res[e] - all}%`); }
  if (fx.mf) o.push(`尋寶率 +${Math.round(fx.mf)}%`);
  if (fx.runeF) o.push(`符文掉落 +${Math.round(fx.runeF * 100)}%`);
  return o;
}
export const LOOT_FX_KEYS = ['skillAll', 'skillCls', 'res', 'mf'];
const ROLL_N = { ed: ['攻擊強化', '%'], edef: ['防禦強化', '%'], hp: ['HP', ''], mp: ['MP', ''], atk: ['攻擊', ''], def: ['防禦', ''], mag: ['魔力', ''], spr: ['精神', ''], spd: ['速度', ''], evade: ['迴避', '%'],
  crit: ['暴擊率', '%x'], dbl: ['連擊率', '%x'], drain: ['吸血', '%x'], mpdrain: ['吸魔', '%x'], mf: ['尋寶率', '%'], gil: ['金幣', '%x'], exp: ['經驗值', '%x'], blockUp: ['格擋率', '%x'], mblock: ['魔法格擋', '%x'], thorns: ['反傷', '%x'], counter: ['反擊率', '%x'], first: ['先手率', '%x'], lowhp: ['背水', '%x'], brk: ['破防', '%x'], dualcast: ['連續詠唱', '%x'], killHeal: ['擊殺回復', '%x'], healup: ['治療量', '%x'], mpregen: ['MP 回復', '%x'], hpP: ['HP', '%x'], mpcost: ['MP 消耗', '%x'], drop: ['掉寶率', '%x'], steal: ['偷竊率', '%x'], runeF: ['符文掉落', '%x'], procw: ['觸發技能等級', ''], proca: ['觸發技能等級', ''], penphys: ['物理穿透', '%'],
  resall: ['所有抗性', '%'], leech: ['吸血', '%'], mleech: ['吸魔', '%'], skill: ['所有技能', ''], str: ['攻擊', ''], mpreg: ['MP 回復', '%'], block: ['格擋率', '%'], heal: ['治療量', '%'], gold: ['金幣', '%'], tree: ['技能樹等級', ''] };
// one tooltip line per rolled number: name, value and its range
export function rollLines(g) {
  return (g.rolls || []).map(([key, v, w, b, i, n]) => {
    let [k1, k2] = key.split('.'), name, u = '', x = (y) => y;
    if (k1 === 'aff') {
      const c = /^(res|el|oh|slay|cls|im|pen)(.+)$/.exec(k2);
      if (ROLL_N[k2]) { [name, u] = ROLL_N[k2]; if (u === '%x') u = '%'; }
      else if (c && c[1] === 'res') [name, u] = [RES_N[c[2]] + '抗性', '%'];
      else if (c && c[1] === 'el') [name, u] = [RES_N[c[2]] + '屬性傷害', '%'];
      else if (c && c[1] === 'pen') [name, u] = [(RES_N[c[2]] || '物理') + '穿透', '%'];
      else if (c && c[1] === 'oh') [name, u] = ['命中時' + (STATUS_N[c[2]] || c[2]), '%'];
      else if (c && c[1] === 'slay') [name, u] = ['對' + (FAM_N[c[2]] || c[2]) + '傷害', '%'];
      else if (c && c[1] === 'cls') [name, u] = [(CLASSES[c[2]]?.name || '') + '技能', ''];
      else name = k2;
    } else if (k1 === 'base') [name, u] = [(ROLL_N[k2]?.[0] || k2) + '（底材）', ''];
    else if (k1 === 'res') [name, u] = [RES_N[k2] + '抗性', '%'];
    else if (k1 === 'pierce') [name, u, x] = [(RES_N[k2] || '物理') + '穿透', '%', (y) => Math.round(y * 100)];
    else if (k1 === 'elUp') [name, u, x] = [RES_N[k2] + '屬性傷害', '%', (y) => Math.round(y * 100)];
    else if (k1 === 'onHit') [name, u, x] = ['命中時' + (STATUS_N[k2] || k2), '%', (y) => Math.round(y * 100)];
    else if (k1 === 'slay') [name, u, x] = ['對' + (FAM_N[k2] || k2) + '傷害', '%', (y) => Math.round((y - 1) * 100)];
    else { const k = k1 === 'fx' ? k2 : k1; [name, u] = ROLL_N[k] || [k, '']; if (u === '%x') { u = '%'; x = (y) => Math.round(y * 100); } }
    return { name, v: x(v) + u, lo: x(w), hi: x(b) + u, top: i === n, q: i / n };
  });
}

// ---------------------------------------------------------------- gambling and shops
export function gambleItem(S, ilvl, cat) {
  const x = Math.random(); const rar = x < 0.02 ? 3 : x < 0.05 ? 4 : x < 0.2 ? 2 : 1;
  return rollItem(S, ilvl, { rarity: rar, cat });
}
export function shopStock(S, ilvl, n = 14) {
  const out = []; for (let i = 0; i < n; i++) out.push(rollItem(S, ilvl, { rarity: Math.random() < 0.35 ? 1 : 0 }));
  return out;
}
export function sellPrice(g) { return Math.max(1, Math.round((g.price || 10) * 0.25)); }
