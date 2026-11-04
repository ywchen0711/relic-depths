// The bounty board in the camp: three tasks at a time (kill monsters in an act, champions, a boss, quick wins,
// the treasure goblin, rifts, palace floors), each paying gold and one more thing. A new set comes when all three are
// claimed, or on a new day. Progress is counted from battles and events (see tick()).
import { ACTS } from './dungeon.js?v=1';
import { rollKey } from './rift.js?v=1';
import { rollItem } from './loot.js?v=1';
import { rollRune } from './runes.js?v=1';
import { GEAR, ITEMS } from './data.js?v=1';

const today = () => new Date().toISOString().slice(0, 10);
const topLv = (S) => Math.max(1, ...Object.values(S.heroes).map(h => h.lv || 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
// the act a task points at: one already opened on this difficulty
const openActs = (S) => ACTS.map((_, a) => a).filter(a => a === 0 || S.wp?.[`d${S.diff || 0}a${a}l0`] || S.cleared?.[`${S.diff || 0}_${a - 1}`]);

const KINDS = {
  kill: { make: (S) => { const a = pick(openActs(S)); return { a, n: 30 + Math.floor(Math.random() * 3) * 10 }; }, text: (b) => `在${ACTS[b.a].n.split('　')[1]}擊殺 ${b.n} 隻怪物` },
  champ: { make: () => ({ n: 4 + Math.floor(Math.random() * 4) }), text: (b) => `擊殺 ${b.n} 隻冠軍或獨特怪物` },
  boss: { make: (S) => ({ a: pick(openActs(S)), n: 1 }), text: (b) => `打倒${ACTS[b.a].n.split('　')[1]}的首領「${ACTS[b.a].bossN}」` },
  fast: { make: () => ({ n: 8 + Math.floor(Math.random() * 3) * 2 }), text: (b) => `在第 1 回合結束 ${b.n} 場戰鬥（速殺）` },
  goblin: { make: () => ({ n: 1 }), text: () => '打倒 1 隻寶藏哥布林（地城裡偶爾出現，三回合內會逃走）' },
  heat: { make: () => ({ n: 1 }), text: () => '連殺熱度達到 20' },
  rift: { need: (S) => S.palace?.open, make: () => ({ n: 2 }), text: (b) => `完成 ${b.n} 個秘境` },
  palace: { need: (S) => S.palace?.open, make: () => ({ n: 5 }), text: (b) => `在死王宮殿往下走 ${b.n} 層` },
};
// what a task pays besides gold
const PRIZES = [['rare', '一件稀有裝備'], ['unique', '一件暗金'], ['rune', '兩顆符文'], ['key', '一把秘境鑰匙'], ['respec', '遺忘之水']];

export function rollBounties(S) {
  const kinds = Object.keys(KINDS).filter(k => !KINDS[k].need || KINDS[k].need(S)), list = [];
  while (list.length < 3) { const k = pick(kinds); if (list.some(b => b.k === k)) continue; list.push({ k, ...KINDS[k].make(S), have: 0 }); }
  const lv = topLv(S);
  for (const b of list) {
    const pool = PRIZES.filter(([p]) => p !== 'key' || S.palace?.open).filter(([p]) => p !== 'unique' || ['boss', 'goblin', 'rift', 'palace'].includes(b.k));
    b.prize = pick(pool)[0]; b.gil = Math.round((200 + lv * lv * 4) * (b.k === 'kill' ? 1 : 1.3));
  }
  S.bounty = { day: today(), list };
}
export const bountyText = (b) => KINDS[b.k].text(b);
export const prizeText = (b) => `${b.gil} G ＋ ${PRIZES.find(p => p[0] === b.prize)[1]}`;
export function bountyFresh(S) { if (!S.bounty || S.bounty.day !== today() && S.bounty.list.every(b => b.claimed || b.have < b.n) || S.bounty.list.every(b => b.claimed)) rollBounties(S); return S.bounty; }

// count progress. ev: { kills: [units], round, heat, act (a normal dungeon level), boss: act, rift: 1, floor: 1, goblin: 1 }
export function tick(S, ev) {
  if (!S.bounty) return [];
  const done = [];
  for (const b of S.bounty.list) {
    if (b.claimed || b.have >= b.n) continue;
    let d = 0;
    if (b.k === 'kill' && ev.kills && ev.act === b.a) d = ev.kills.length;
    if (b.k === 'champ' && ev.kills) d = ev.kills.filter(u => u.rank >= 1).length;
    if (b.k === 'boss' && ev.boss === b.a) d = 1;
    if (b.k === 'fast' && ev.kills && ev.round <= 1) d = 1;
    if (b.k === 'goblin' && ev.goblin) d = 1;
    if (b.k === 'heat' && ev.heat >= 20) d = 1;
    if (b.k === 'rift' && ev.rift) d = 1;
    if (b.k === 'palace' && ev.floor) d = 1;
    if (d) { b.have = Math.min(b.n, b.have + d); if (b.have >= b.n) done.push(b); }
  }
  return done;
}
// hand the prize over; returns what was given, as text
export function claim(S, b, addItem) {
  const lv = topLv(S); b.claimed = true; S.gil += b.gil; let got = '';
  if (b.prize === 'rare' || b.prize === 'unique') { const g = rollItem(S, lv, { rarity: b.prize === 'rare' ? 2 : 3 }); addItem(S, g, 1); got = `<span style="color:${GEAR[g].rarColor}">${GEAR[g].name}</span>`; }
  if (b.prize === 'rune') { const r = [rollRune(lv, 3), rollRune(lv, 3)]; for (const x of r) addItem(S, x, 1); got = r.map(x => ITEMS[x]?.name || x).join('、'); }
  if (b.prize === 'key') { const k = rollKey(Math.max(1, S.riftBest || 1)); (S.keys ||= []).push(k); got = `🗝 第 ${k.t} 階秘境鑰匙`; }
  if (b.prize === 'respec') { addItem(S, 'i_respec', 1); got = '遺忘之水'; }
  return `${b.gil} G、${got}`;
}
