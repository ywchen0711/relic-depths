// Runes, sockets and runewords, and the skills gear can cast on its own.
//   Plain (white) pieces can drop with sockets, or get them at the smith. Runes go into the sockets one by one, for
//   good: each rune adds a little on its own, and the right runes in the right order in the right kind of piece turn
//   it into a runeword, a piece made for one way of playing.
//   Procs ("12% to cast Chain Lightning Lv 8 on hit") let any hero cast a spell their class never learns.
import { SKILLS, ITEMS } from './data.js?v=1';

const ELS = ['fire', 'ice', 'thunder', 'water', 'wind', 'earth', 'light', 'dark'];
const all8 = (v) => Object.fromEntries(ELS.map(e => [e, v]));

// ---------------------------------------------------------------- the skills gear casts
// cast free, from the wielder's better of attack and magic (see battle.js calc: S.proc)
const PROC_SK = {
  pr_chain: { name: '連鎖閃電', type: 'mag', tgt: 'enemy', pow: 0.9, el: 'thunder', chain: 3, anim: 'thunder' },
  pr_nova: { name: '冰霜新星', type: 'mag', tgt: 'enemies', pow: 0.6, el: 'ice', anim: 'ice' },
  pr_firenova: { name: '火焰新星', type: 'mag', tgt: 'enemies', pow: 0.65, el: 'fire', anim: 'fire' },
  pr_meteor: { name: '隕石', type: 'mag', tgt: 'enemy', pow: 2.0, el: 'fire', chip: 1, anim: 'meteor' },
  pr_tornado: { name: '龍捲風', type: 'mag', tgt: 'enemies', pow: 0.7, el: 'wind', anim: 'wind' },
  pr_holy: { name: '神聖衝擊', type: 'mag', tgt: 'enemy', pow: 1.6, el: 'light', anim: 'holy' },
  pr_bone: { name: '骨矛', type: 'mag', tgt: 'enemy', pow: 1.4, el: 'dark', pierce2: true, anim: 'dark' },
  pr_venom: { name: '毒霧', type: 'debuff', tgt: 'enemies', status: 'poison', chance: 0.7, pow: 0.3, anim: 'dark' },
  pr_lower: { name: '降低抗性', type: 'debuff', tgt: 'enemies', unresist: true, anim: 'dark' },
  pr_decrep: { name: '衰老詛咒', type: 'debuff', tgt: 'enemies', debuff: { atk: 1, def: 1, spd: 1 }, anim: 'dark' },
  pr_corpse: { name: '屍爆', type: 'mag', tgt: 'enemies', corpse: true, pow: 1, anim: 'explode' },
  pr_shout: { name: '戰吼', type: 'buff', tgt: 'allies', buff: { atk: 1, def: 1 }, anim: 'buff' },
  pr_haste: { name: '疾風', type: 'buff', tgt: 'allies', buff: { spd: 2 }, anim: 'buff' },
  pr_heal: { name: '生命之泉', type: 'heal', tgt: 'allies', pow: 0.35, base: 30, anim: 'heal' },
};
for (const [id, s] of Object.entries(PROC_SK)) SKILLS[id] = { mp: 0, proc: true, desc: '裝備觸發的技能', ...s };
export const PROC_IDS = Object.keys(PROC_SK);
export const PROC_ON = { hit: '擊中時', struck: '被擊中時', kill: '擊倒敵人時', start: '戰鬥開始時' };
// the proc a random affix can roll: on hit for weapons, when struck for armour
export const PROC_HIT = ['pr_chain', 'pr_nova', 'pr_firenova', 'pr_meteor', 'pr_tornado', 'pr_holy', 'pr_bone', 'pr_venom', 'pr_lower', 'pr_decrep'];
export const PROC_STRUCK = ['pr_nova', 'pr_firenova', 'pr_lower', 'pr_decrep', 'pr_shout', 'pr_heal', 'pr_haste'];

// ---------------------------------------------------------------- runes
// [name, level, in a weapon, in armour or a shield]
const R = [
  ['晨', 1, { atk: 3, fx: { elUp: { light: 0.1 } } }, { hp: 15 }],
  ['燼', 3, { fx: { elUp: { fire: 0.15 } } }, { res: { fire: 15 } }],
  ['霜', 5, { fx: { elUp: { ice: 0.15 } } }, { res: { ice: 15 } }],
  ['雷', 7, { fx: { elUp: { thunder: 0.15 } } }, { res: { thunder: 15 } }],
  ['潮', 9, { fx: { elUp: { water: 0.15 } } }, { res: { water: 15 } }],
  ['風', 11, { spd: 1 }, { evade: 3 }],
  ['岩', 13, { fx: { brk: 0.08 } }, { def: 10 }],
  ['血', 16, { fx: { drain: 0.04 } }, { fx: { hpP: 0.05 } }],
  ['魂', 19, { fx: { mpdrain: 0.03 } }, { mp: 25 }],
  ['刃', 22, { fx: { crit: 0.06 } }, { fx: { thorns: 0.12 } }],
  ['疾', 26, { fx: { dbl: 0.1 } }, { fx: { first: 0.2 } }],
  ['金', 30, { fx: { gil: 0.3 } }, { fx: { mf: 15 } }],
  ['智', 34, { mag: 15 }, { fx: { mpregen: 0.02 } }],
  ['力', 38, { atk: 15 }, { hp: 60 }],
  ['星', 43, { fx: { pierce: all8(0.05) } }, { res: all8(8) }],
  ['影', 48, { fx: { crit: 0.1 } }, { evade: 6 }],
  ['命', 54, { fx: { killHeal: 0.04 } }, { fx: { hpP: 0.1 } }],
  ['王', 60, { ed: 40 }, { edef: 40 }],
  ['神', 66, { fx: { skillAll: 1 } }, { res: all8(12) }],
  ['虛', 72, { fx: { pierce: { phys: 0.15 } } }, { fx: { mf: 30 } }],
  ['終', 80, { ed: 60, fx: { crit: 0.05 } }, { fx: { hpP: 0.15 } }],
];
export const RUNES = R.map(([n, lv, w, a], i) => ({ i, id: 'rn_' + i, name: n + '符文', ch: n, lv, w, a }));
const RUNE_C = ['#e8d8b0', '#ffb07a', '#ff9a4a', '#ffcc4a', '#ffe04a'];
export const runeColor = (i) => RUNE_C[Math.min(4, Math.floor(i / 5))];
for (const r of RUNES) ITEMS[r.id] = { name: r.name, cat: 'rune', price: Math.round(40 * Math.pow(1.45, r.i)), sell: Math.round(10 * Math.pow(1.45, r.i)), rune: r.i, desc: `第 ${r.i + 1} 級符文（物品等級 ${r.lv} 以上掉落）。在鐵匠鑲進有孔的普通裝備。` };

// a rune from a monster of item level il: the higher ones much rarer; elites, bosses and the palace roll better
export function rollRune(il, boost = 0, r = Math.random) {
  const ok = RUNES.filter(x => x.lv <= il + 2); if (!ok.length) return RUNES[0].id;
  const q = Math.min(0.86, 0.7 + boost * 0.04), w = ok.map(x => Math.pow(q, x.i)), s = w.reduce((a, b) => a + b, 0);
  let x = r() * s; for (let k = 0; k < ok.length; k++) { x -= w[k]; if (x <= 0) return ok[k].id; }
  return ok[ok.length - 1].id;
}

// ---------------------------------------------------------------- sockets
// how many sockets a base can hold at an item level
export function maxSockets(B, il) {
  if (!B || B.slot === 'acc') return 0;
  const top = B.slot === 'hand' ? (B.type === 'shield' ? 4 : B.hands === 2 ? 6 : 4) : B.slot === 'body' ? 4 : B.slot === 'head' ? 3 : 2;
  return Math.max(1, Math.min(top, 1 + Math.floor((il || 1) / 14)));
}
// the kind of slot a runeword asks for
export const sockKind = (B) => !B ? null : B.slot === 'hand' ? (B.type === 'shield' ? 'shield' : 'W') : B.slot === 'acc' ? null : B.slot;
const fits = (want, B) => { const k = sockKind(B); return want === k || (want === 'A' && k && k !== 'W'); };
export const RW_SLOT_N = { W: '武器', A: '防具', body: '身體防具', head: '頭盔', shield: '盾' };

// ---------------------------------------------------------------- runewords
// [id, name, runes (by index), slot, powers, flavor]; the level is that of the highest rune
const P = (on, sk, lv, ch) => [on, sk, lv, ch];
const RW = [
  ['rw_dawn', '破曉', [0, 1], 'W', { ed: 50, fx: { elUp: { light: 0.2, fire: 0.2 }, slay: { undead: 1.5 } } }, '第一道光，總是最燙'],
  ['rw_breeze', '微風', [5, 0], 'A', { spd: 2, fx: { first: 0.3 }, evade: 5 }, '腳步輕得像沒有重量'],
  ['rw_winter', '寒冬', [2, 4, 2], 'W', { ed: 80, fx: { elUp: { ice: 0.3 }, proc: [P('hit', 'pr_nova', 6, 0.15)] } }, '揮一下，就下一場雪'],
  ['rw_storm', '雷暴', [3, 5, 3], 'W', { ed: 90, fx: { elUp: { thunder: 0.3 }, chainT: 1, proc: [P('hit', 'pr_chain', 8, 0.2)] } }, '雷聲在刃上打轉'],
  ['rw_oath', '血誓', [7, 9], 'W', { ed: 120, fx: { drain: 0.08, lowhp: 0.5, crit: 0.1 } }, '流的血越多，揮得越重'],
  ['rw_gale', '風暴之眼', [5, 3, 10, 5], 'W', { ed: 110, spd: 2, fx: { elUp: { wind: 0.3 }, proc: [P('hit', 'pr_tornado', 10, 0.15)] } }, '風停下來的地方'],
  ['rw_greed', '貪婪', [11, 4, 11], 'body', { edef: 60, fx: { mf: 80, gil: 0.8, drop: 0.2 } }, '每一個口袋都縫成了兩層'],
  ['rw_lore', '學識', [12, 8, 0], 'W', { mag: 35, mp: 60, fx: { skillAll: 1, mpregen: 0.03, dualcast: 0.1 } }, '一本讀不完的書'],
  ['rw_bulwark', '堡壘', [6, 13, 6], 'shield', { edef: 120, fx: { blockUp: 0.2, thorns: 0.3, proc: [P('struck', 'pr_shout', 10, 0.2)] } }, '它後面的人從不後退'],
  ['rw_hunt', '狩獵', [11, 10, 11, 14], 'W', { ed: 120, fx: { mf: 60, runeF: 0.5, first: 0.5 } }, '獵人知道寶物藏在哪裡'],
  ['rw_meteor', '流星', [1, 14, 13, 1], 'W', { ed: 160, fx: { elUp: { fire: 0.4 }, proc: [P('hit', 'pr_meteor', 15, 0.12)] } }, '天上的火，聽它的話'],
  ['rw_prism', '稜鏡', [14, 1, 2, 3], 'W', { mag: 40, fx: { elUp: { fire: 0.25, ice: 0.25, thunder: 0.25 }, pierce: { fire: 0.15, ice: 0.15, thunder: 0.15 } } }, '一道光，拆成三種顏色'],
  ['rw_venom', '毒牙', [7, 4, 15], 'W', { ed: 150, fx: { onHit: { poison: 0.5 }, proc: [P('hit', 'pr_venom', 12, 0.25)] } }, '傷口會說話：好癢'],
  ['rw_grave', '墓語', [8, 16, 7], 'W', { mag: 30, fx: { skillAll: 1, proc: [P('kill', 'pr_corpse', 14, 1)] } }, '倒下的敵人，還能再用一次'],
  ['rw_call', '號召', [17, 13, 16, 3], 'W', { ed: 200, hp: 100, fx: { skillAll: 1, proc: [P('start', 'pr_shout', 16, 1), P('start', 'pr_haste', 12, 1)] } }, '舉起它，所有人都聽得見'],
  ['rw_judge', '審判', [0, 18, 17], 'W', { ed: 200, fx: { slay: { undead: 2, demon: 2 }, pierce: { light: 0.25 }, proc: [P('hit', 'pr_holy', 18, 0.15)] } }, '光不會原諒任何東西'],
  ['rw_sanct', '聖域', [0, 16, 18], 'shield', { edef: 150, fx: { mblock: 0.2, res: all8(25), proc: [P('struck', 'pr_heal', 15, 0.2)] } }, '站在它後面就很安全'],
  ['rw_enigma', '謎', [18, 10, 15], 'body', { edef: 150, spd: 5, fx: { skillAll: 2, partyFirst: 1, enc: -0.3, mf: 30 } }, '沒有人看見你們是怎麼走過來的'],
  ['rw_shroud', '夜幕', [15, 8, 19], 'head', { edef: 100, fx: { mf: 40, res: { dark: 40 }, proc: [P('struck', 'pr_lower', 12, 0.2)] } }, '在它底下，什麼都看不清楚'],
  ['rw_reaper', '死神', [15, 9, 10, 20], 'W', { ed: 280, fx: { crit: 0.3, dbl: 0.3, proc: [P('hit', 'pr_decrep', 15, 0.1)] } }, '它只收割，不播種'],
  ['rw_infinity', '無限', [19, 20, 17, 18], 'W', { ed: 250, mag: 50, fx: { convict: 1, proc: [P('hit', 'pr_lower', 12, 0.2)] } }, '在它面前，沒有東西是免疫的'],
  ['rw_undying', '不朽', [16, 17, 18, 20], 'body', { edef: 200, fx: { hpP: 0.3, survive: 1, auto: ['regen'], killHeal: 0.08, res: all8(30) } }, '穿上它的人，忘了怎麼倒下'],
];
export const RUNEWORDS = {};
for (const [id, name, runes, slot, p, flavor] of RW) RUNEWORDS[id] = { id, name, runes, slot, p, flavor, lv: Math.max(...runes.map(i => RUNES[i].lv)) };
// the runeword these runes make in this base, if any (the runes must fill every socket)
export function matchRuneword(B, rn, so) {
  if (!rn?.length || rn.length !== so) return null;
  for (const w of Object.values(RUNEWORDS)) if (w.runes.length === rn.length && w.runes.every((x, k) => x === rn[k]) && fits(w.slot, B)) return w;
  return null;
}
// runewords this base could still become, given the runes already in it
export function runewordsFor(B, rn = [], so = 0) {
  return Object.values(RUNEWORDS).filter(w => fits(w.slot, B) && w.runes.length === so && rn.every((x, k) => w.runes[k] === x));
}
export const runeStr = (list) => list.map(i => RUNES[i].ch).join('＋');
export const runeFx = (i, B) => sockKind(B) === 'W' ? RUNES[i].w : RUNES[i].a;
