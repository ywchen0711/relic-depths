// Rifts: keys found in the Dead King's palace (and in rifts) open a single floor somewhere else, with a guardian at
// the end. Every key has a tier (how strong the monsters are and how good the treasure) and two to four modifiers that
// make the monsters harder and the rewards richer. Clearing a rift drops keys of the next tier.
import { genLevel, LOOK_KEYS, ACTS, MODS } from './dungeon.js?v=1';

// [what it does to the monsters, what it pays]: iiq = more items, mf = magic find, exp = experience
export const RIFT_AFX = {
  hp: { n: '強韌', d: '怪物 HP +40%', pw: { hp: 1.4 }, iiq: 15, mf: 10 },
  atk: { n: '狂暴', d: '怪物攻擊和魔力 +30%', pw: { atk: 1.3 }, iiq: 15, mf: 20 },
  def: { n: '鐵壁', d: '怪物防禦和精神 +40%', pw: { def: 1.4 }, exp: 15, mf: 10 },
  spd: { n: '疾風', d: '怪物速度 +20%', pw: { spd: 1.2 }, mf: 25 },
  res: { n: '元素詛咒', d: '全隊所有抗性 -20', resDown: 20, iiq: 20 },
  elite: { n: '精英群聚', d: '冠軍和獨特怪物出現率 ×3', elite: 3, iiq: 25 },
  mod: { n: '強化', d: '每隻怪物都帶著「%m」', mod: 1, mf: 30 },
  imm: { n: '免疫', d: '怪物常常免疫某種元素', imm: 1, mf: 20 },
  regen: { n: '再生', d: '怪物每回合回復 5% HP（守護者除外）', regen: 1, exp: 20 },
  power: { n: '絕技', d: '每隻怪物都會一種特殊招式', power: 1, iiq: 15, mf: 15 },
  dense: { n: '擁擠', d: '遇敵更頻繁，怪物群更大', dense: 1, exp: 25, iiq: 10 },
};
const MOD_POOL = ['strong', 'fast', 'stone', 'fire', 'cold', 'light', 'resist', 'mana', 'vamp', 'phase'];
export const RIFT_MAX = 30;
export const riftId = 'r1';
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

// a new key of tier t: more modifiers at the higher tiers
export function rollKey(t) {
  t = Math.max(1, Math.min(RIFT_MAX, t));
  const n = t <= 3 ? 1 + (Math.random() < 0.5 ? 1 : 0) : t <= 7 ? 2 + (Math.random() < 0.4 ? 1 : 0) : 2 + Math.floor(Math.random() * 3);
  const keys = Object.keys(RIFT_AFX), a = [];
  while (a.length < n) { const k = rnd(keys); if (!a.includes(k)) a.push(k); }
  return { t, a, mk: rnd(MOD_POOL), id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) };
}
// what a key pays, all its modifiers together, and the base of its tier
export function keyReward(k) {
  const r = { iiq: 0, mf: 0, exp: 0 };
  for (const a of k.a) for (const x of ['iiq', 'mf', 'exp']) r[x] += RIFT_AFX[a][x] || 0;
  return r;
}
// tier 1 is about the palace's tenth floor, tier 10 its hundredth, and on from there
export function keyPower(k) {
  const t = k.t, pw = { hp: 1 + 0.4 * t, atk: 1 + 0.15 * t, def: 1 + 0.06 * t, spd: 1 };
  for (const a of k.a) for (const [s, m] of Object.entries(RIFT_AFX[a].pw || {})) pw[s] *= m;
  return pw;
}
export const keyLootQ = (k) => 1.5 + 0.35 * k.t;
export function afxText(k, a) { return RIFT_AFX[a].d.replace('%m', MODS[k.mk]?.n || ''); }
export function keyLine(k) { return k.a.map(a => RIFT_AFX[a].n).join('・'); }
export function rewardText(k) { const r = keyReward(k); return [r.iiq && `物品數量 +${r.iiq}%`, r.mf && `尋寶 +${r.mf}%`, r.exp && `經驗 +${r.exp}%`].filter(Boolean).join('　'); }
// the guardian at the end: the act bosses in turn, the Dead King every tenth tier
export const riftBoss = (t) => t % 10 === 0 ? 'deadking' : ACTS[(t - 1) % ACTS.length].boss;

// the rift's one floor: laid out like a dungeon level, with a guardian before the crystal at the end
const NAMES = ['破碎的回廊', '倒懸之森', '燃燒的平原', '凍結的海', '無聲的神殿', '血色荒原', '星辰廢墟', '夢魘之井'];
export function genRift(S, k, seed = Math.floor(Math.random() * 1e9)) {
  const lk = LOOK_KEYS[seed % LOOK_KEYS.length];
  const def = genLevel(S, 4, 0, seed, {
    id: riftId, name: `秘境・${NAMES[seed % NAMES.length]}　第${k.t}階`, theme: lk.theme, hab: lk.hab, look: lk.look, lv: 99,
    pw: keyPower(k), lootQ: keyLootQ(k), boss: riftBoss(k.t), bossEv: 'rboss', back: { to: 'town', tx: 15, tz: 22, dir: 'up', label: '離開秘境（營地）' }, next: null,
  });
  def.rift = k; if (k.a.includes('dense')) def.encRate = 14;
  return def;
}

// a key dropped by a monster: rare from the palace's monsters, likelier the stronger the monster and the deeper the floor
export function keyDrop(S, { floor, rift, rank, boss }) {
  if (!S.palace?.open || rift && boss) return null; // a rift's guardian leaves its keys itself (see town.js rboss)
  const base = rift ? rift.t : Math.max(1, Math.floor(floor / 10));
  const ch = boss ? 1 : rank === 2 ? 0.15 : rank === 1 ? 0.04 : 0.006;
  if (Math.random() >= ch * (rift ? 1.3 : 0.6 + floor / 100)) return null;
  const up = rift && Math.random() < (boss ? 1 : 0.15) ? 1 : !rift && Math.random() < 0.1 ? 1 : 0;
  return rollKey(base + up);
}
