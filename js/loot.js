// Loot the way the old dungeon crawlers did it: every drop is its own item, rolled from a base type and an item level.
//   normal (white)  - just the base
//   magic  (blue)   - one prefix and/or one suffix
//   rare   (yellow) - three to six affixes and a random two-word name
//   unique (gold)   - a named item with fixed powers
//   set    (green)  - named pieces that grow stronger the more of the set you wear
// An item lives in S.loot[uid] as a small spec; at load it is turned into a GEAR entry under its uid, so the rest of
// the game (stats, battles, paper dolls) treats it like any other piece of equipment.
import { GEAR, ELEM, ITEMS } from './data.js?v=1';
ITEMS.i_tp = { name: '回城卷軸', price: 60, use: { townPortal: true }, field: true, desc: '打開通往營地的傳送門；回來時從營地的藍色水晶走回原地', cat: 'tool' };
import { WTYPES, mergeFx, FAM_N, STATUS_N } from './content.js?v=1';
import { CLASSES, TREES } from './classes.js?v=1';

export const RARITY = [
  { n: '普通', c: '#e8e8e8' }, { n: '魔法', c: '#7a9aff' }, { n: '稀有', c: '#ffe04a' }, { n: '暗金', c: '#c8a060' }, { n: '套裝', c: '#3ae06a' },
];
const ELS = ['fire', 'ice', 'thunder', 'water', 'wind', 'earth', 'light', 'dark'];
const rint = (a, b, r = Math.random) => a + Math.floor(r() * (b - a + 1));
const pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];

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
const catOf = (g) => g.slot === 'acc' ? 'J' : g.slot === 'hand' ? (g.type === 'shield' ? 'S' : 'W') : 'A';
const ilvlOfTier = (t) => t * 8 + 1; // a base of tier t drops from item level 8t+1 up

// ---------------------------------------------------------------- affixes
// [id, prefix?, categories, tiers: [minIlvl, name, roll(r)]]; roll gives stats (hp, atk, ...) and fx
const T6 = [1, 10, 20, 32, 46, 62];
const tiered = (id, pre, cats, names, ranges, make) => [id, pre, cats, names.map((n, i) => [T6[i], n, (r) => make(rint(ranges[i][0], ranges[i][1], r), i)])];
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
  tiered('survive', 0, 'J', ['', '', '', '・不屈'], [[0, 0], [0, 0], [0, 0], [1, 1]], () => ({ fx: { survive: 1 } })),
].map(([id, pre, cats, tiers]) => ({ id, pre: !!pre, cats, tiers: tiers.filter(t => t[1]) })).filter(a => a.tiers.length);
const AFFIX_BY = Object.fromEntries(AFFIXES.map(a => [a.id, a]));
export const AFFIX_COUNT = AFFIXES.reduce((s, a) => s + a.tiers.length, 0);

function rollAffix(cat, ilvl, pre, taken, r) {
  const pool = AFFIXES.filter(a => a.pre === pre && a.cats.includes(cat) && !taken.has(a.id) && a.tiers.some(t => t[0] <= ilvl));
  if (!pool.length) return null;
  const A = pick(pool, r); const ok = A.tiers.filter(t => t[0] <= ilvl);
  // higher tiers are rarer: weight the best few allowed
  const ti = Math.max(0, ok.length - 1 - Math.floor(Math.pow(r(), 0.6) * Math.min(3, ok.length)));
  const T = ok[ti]; taken.add(A.id);
  return [A.id, A.tiers.indexOf(T), T[2](r)];
}

// ---------------------------------------------------------------- uniques
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
for (const [id, name, base, tier, lv, p, flavor] of U) UNIQUES[id] = { id, name, base, tier, lv, p, flavor };

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
  pieces.forEach(([base, pn, p], i) => { SET_ITEMS[`${id}_${i}`] = { id: `${id}_${i}`, set: id, name: pn, base, lv, p }; });
}
export function setBonusFx(equipIds) {
  const count = {};
  for (const id of equipIds) { const g = GEAR[id]; if (g?.lootSet) count[g.lootSet] = (count[g.lootSet] || 0) + 1; }
  const out = [];
  for (const [s, n] of Object.entries(count)) for (const [k, b] of Object.entries(SETS[s].bonus)) if (n >= +k) out.push(b.fx || {});
  return { count, fx: out };
}

// ---------------------------------------------------------------- a base piece that fits a description
function baseFor(desc, tierMin, ilvl, r) {
  const maxT = Math.max(tierMin, Math.min(7, Math.floor((ilvl - 1) / 8)));
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
  if (rar === 3) { const pool = Object.values(UNIQUES).filter(u => ilvlOfTier(u.tier) <= ilvl + 4); if (pool.length) { const u = pick(pool, r); return register(S, { b: baseFor(u.base, u.tier, Math.max(ilvl, ilvlOfTier(u.tier)), r), r: 3, il: ilvl, u: u.id }); } rar = 2; }
  if (rar === 4) { const pool = Object.values(SET_ITEMS).filter(p => p.lv <= ilvl + 4); if (pool.length) { const p = pick(pool, r); return register(S, { b: baseFor(p.base, Math.min(7, Math.floor(p.lv / 8)), Math.max(ilvl, p.lv), r), r: 4, il: ilvl, s: p.id }); } rar = 2; }
  // a base piece the item level allows (jewellery only comes magic or better)
  const maxT = Math.max(0, Math.min(7, Math.floor((ilvl - 1) / 8))), tt = Math.max(0, maxT - (r() < 0.65 ? 0 : 1)); // mostly the best base the level allows
  let pool = BASES.filter(b => GEAR[b].tier === tt || GEAR[b].slot === 'acc' && GEAR[b].tier <= tt);
  if (o.cat) pool = pool.filter(b => catOf(GEAR[b]) === o.cat);
  if (rar === 0) pool = pool.filter(b => GEAR[b].slot !== 'acc');
  if (!pool.length) pool = BASES.filter(b => GEAR[b].tier === 0);
  const b = pick(pool, r), cat = catOf(GEAR[b]), taken = new Set(), a = [];
  if (rar === 1) { const np = r() < 0.6 ? 1 : 0, ns = np && r() < 0.5 ? 0 : 1; for (let i = 0; i < np; i++) { const x = rollAffix(cat, ilvl, true, taken, r); if (x) a.push(x); } for (let i = 0; i < ns || !a.length && i < 1; i++) { const x = rollAffix(cat, ilvl, false, taken, r); if (x) a.push(x); } }
  if (rar === 2) { const n = rint(3, ilvl >= 30 ? 6 : 5, r); let pre = 0, suf = 0; for (let i = 0; i < n; i++) { const want = pre >= 3 ? false : suf >= 3 ? true : r() < 0.5; const x = rollAffix(cat, ilvl, want, taken, r); if (x) { a.push(x); if (want) pre++; else suf++; } } }
  const spec = { b, r: rar, il: ilvl, a };
  if (rar === 2) spec.n = rareName(r);
  if (rar === 0 && r() < 0.15) spec.q = rint(5, 15, r); // superior
  return register(S, spec);
}
const RARE_A = ['血腥', '幽魂', '暴風', '亡靈', '烈陽', '寒夜', '星辰', '深淵', '狂怒', '腐朽', '雷鳴', '月影', '荊棘', '鋼鐵', '黃金', '骸骨', '黎明', '黃昏', '災厄', '聖潔'];
const RARE_B = ['之牙', '之魂', '之嚎', '之心', '之眼', '之刃', '之咒', '之歌', '之翼', '之印', '之怒', '之誓', '之淚', '之鱗', '之爪', '之冠'];
const rareName = (r) => pick(RARE_A, r) + pick(RARE_B, r);

// put a spec into the save and the GEAR table
export function register(S, spec) {
  const uid = spec.uid || newUid(S); spec.uid = uid;
  S.loot = S.loot || {}; S.loot[uid] = spec;
  GEAR[uid] = build(spec);
  return uid;
}
export function restoreLoot(S) { for (const [uid, spec] of Object.entries(S.loot || {})) GEAR[uid] = build(spec); }
export function dropLoot(S, uid) { delete S.loot?.[uid]; }

const STATK = ['hp', 'mp', 'atk', 'def', 'mag', 'spr', 'spd'];
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
export function build(spec) {
  const B = GEAR[spec.b]; if (!B) return { name: '???', slot: 'acc', tier: 0, price: 1 };
  const g = { ...B, fx: { ...(B.fx || {}) }, base: spec.b, baseName: B.name, rarity: spec.r, il: spec.il, uid: spec.uid, loot: true };
  delete g.teach; delete g.ap;
  if (spec.q) { if (g.atk) g.atk = Math.round(g.atk * (1 + spec.q / 100)); if (g.def) g.def = Math.round(g.def * (1 + spec.q / 100)); }
  let pre = '', suf = '';
  for (const [aid, ti, p] of spec.a || []) { const A = AFFIX_BY[aid]; apply(g, p); if (A && spec.r === 1) { if (A.pre) pre = A.tiers[ti]?.[1] || ''; else suf = A.tiers[ti]?.[1] || ''; } }
  if (spec.u) { const u = UNIQUES[spec.u]; apply(g, u.p); g.name = u.name; g.flavor = u.flavor; g.lvReq = u.lv; g.uniq = spec.u; }
  else if (spec.s) { const p = SET_ITEMS[spec.s]; apply(g, p.p); g.name = p.name; g.lootSet = p.set; g.lvReq = p.lv; g.setPiece = spec.s; }
  else if (spec.r === 2) { g.name = spec.n; g.lvReq = Math.max(1, Math.floor(spec.il * 0.7)); }
  else { g.name = (spec.q ? '精良的' : '') + pre + B.name + suf; g.lvReq = spec.r === 1 ? Math.max(1, Math.floor(spec.il * 0.6)) : Math.max(1, B.tier * 6); }
  g.lvReq = Math.max(g.lvReq || 1, B.tier * 6);
  g.color = undefined; g.rarColor = RARITY[spec.r].c;
  g.price = Math.round((B.price || 100) * [1, 1.8, 3.5, 8, 6][spec.r] + (spec.a || []).length * 80 * (1 + spec.il / 10));
  return g;
}

// ---------------------------------------------------------------- the tooltip text of an item
const RES_N = { fire: '火焰', ice: '冰霜', thunder: '雷電', water: '水', wind: '風', earth: '大地', light: '神聖', dark: '暗黑' };
export function lootLines(g) {
  const o = [], fx = g.fx || {};
  if (fx.skillAll) o.push(`+${fx.skillAll} 所有技能等級`);
  if (fx.skillCls) for (const [c, n] of Object.entries(fx.skillCls)) o.push(`+${n} ${CLASSES[c]?.name}技能等級`);
  if (fx.res) { const v = ELS.map(e => fx.res[e] || 0), all = Math.min(...v); if (all > 0) o.push(`所有抗性 +${all}%`); for (const e of ELS) if ((fx.res[e] || 0) > all) o.push(`${RES_N[e]}抗性 +${fx.res[e] - all}%`); }
  if (fx.mf) o.push(`尋寶率 +${Math.round(fx.mf)}%`);
  return o;
}
export const LOOT_FX_KEYS = ['skillAll', 'skillCls', 'res', 'mf'];

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
