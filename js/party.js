// The save state and everything derived from it: stats, skills, echoes, levels, items.
import { HEROES, ECHOES, PASSIVES, SKILLS, ITEMS, GEAR, EXP_NEXT, AP_CAP, BOND_EXP, STAR_COST, SUMMONS, ECHO_ORDER } from './data.js?v=1';
import { APT, WTYPES, ARTS_BY_TYPE, MASTERY_AT, MASTERY_OLD, mergeFx } from './content.js?v=1';
import { setBonusFx, register } from './loot.js?v=1';
import { CLASSES, TREES, SKILL_INFO, SKILL_MAX, SYNERGY } from './classes.js?v=1';

export const EQUIP_SLOTS = ['R', 'L', 'head', 'body', 'arms', 'waist', 'legs', 'feet', 'back', 'acc1', 'acc2'];
export const SLOT_N = { R: '右手', L: '左手', head: '頭', body: '身體', arms: '手', waist: '腰', legs: '腿', feet: '腳', back: '背', acc1: '飾品1', acc2: '飾品2' };
const START_KIT = { aren: { body: 'a_cloth', feet: 'g_feet_light1' }, sylvie: { L: 'g_buckler1', body: 'a_cloth', feet: 'g_feet_light1' }, mira: { body: 'g_body_robe1', head: 'g_head_robe1' }, talo: { body: 'g_body_robe1', head: 'g_head_robe1' }, rena: { body: 'g_body_light2', arms: 'g_arms_light2', feet: 'g_feet_light2' }, neo: { body: 'g_body_light2', back: 'g_back_light2', feet: 'g_feet_light2' } };

export function newState() {
  return {
    v: 1, party: [], reserve: [], heroes: {}, echoes: {}, items: { potion: 5, ether: 2 }, gil: 300, loot: {}, stash: [], uidN: 0,
    flags: {}, quests: {}, chests: [], tablets: [], mogu: [], summons: [], wp: { a1l1: 1 }, act: 1, diff: 0, kills: {}, cleared: {},
    map: 'town', x: 12, z: 12, dir: 'down', chapter: 1, time: 0, steps: 0, battles: 0, arena: 0, mount: null,
    settings: { quality: 1, music: 0.6, sfx: 0.8, speed: 1 },
  };
}
export function addHero(S, id, lv) {
  const C = CLASSES[id];
  if (!S.heroes[id]) {
    lv = lv || 1;
    // a class starts with its weapon and plain clothes; hired heroes come with their points still to spend
    const kit = { R: register(S, { b: `g_${C.wpn}1`, r: 0, il: 1, a: [] }), body: register(S, { b: `g_body_${C.styles[0]}1`, r: 0, il: 1, a: [] }) };
    S.heroes[id] = { lv, exp: 0, hp: 1, mp: 1, equip: kit, echo: null, learned: [], on: [], spells: [], ap: {}, mastery: {}, grow: {}, pts: {}, sp: lv, stp: (lv - 1) * 5, stats: { str: 0, dex: 0, vit: 0, ene: 0 } };
    const st = heroStats(S, id); S.heroes[id].hp = st.hp; S.heroes[id].mp = st.mp;
  }
  if (!S.party.includes(id) && !S.reserve.includes(id)) { if (S.party.length < 4) S.party.push(id); else S.reserve.push(id); }
}
export function addEcho(S, id) {
  if (!S.echoes[id]) S.echoes[id] = { bond: 1, bexp: 0, star: 0 };
}

export function heroStats(S, id) {
  const H = HEROES[id], h = S.heroes[id], lv = h.lv;
  const st = {};
  for (const k of ['hp', 'mp', 'atk', 'def', 'mag', 'spr', 'spd']) st[k] = Math.round(H.base[k] + H.grow[k] * (lv - 1));
  for (const slot of EQUIP_SLOTS) { const g = GEAR[h.equip[slot]]; if (!g) continue; for (const k of ['hp', 'mp', 'atk', 'def', 'mag', 'spr', 'spd']) { if (k === 'atk' && slot === 'L' && g.type !== 'shield' && GEAR[h.equip.R]?.type && GEAR[h.equip.R].type !== 'shield') continue; st[k] += g[k] || 0; } }
  for (const k in h.grow || {}) st[k] += h.grow[k];
  // stat points: strength, dexterity, vitality, energy
  const a = h.stats || {}; st.atk += (a.str || 0); st.def += Math.floor((a.dex || 0) * 0.5); st.spd += Math.floor((a.dex || 0) / 5); st.hp += (a.vit || 0) * 4; st.mag += (a.ene || 0); st.mp += Math.floor((a.ene || 0) * 1.5); st.spr += Math.floor((a.ene || 0) * 0.5);
  const fx = gearFx(S, id, true);
  if (fx.hpP) st.hp = Math.round(st.hp * (1 + fx.hpP)); if (fx.mpP) st.mp = Math.round(st.mp * (1 + fx.mpP));
  for (const [k, p] of [['atk', 'atkP'], ['def', 'defP'], ['mag', 'magP'], ['spr', 'sprP']]) if (fx[p]) st[k] = Math.round(st[k] * (1 + fx[p]));
  if (fx.spdF) st.spd += fx.spdF;
  st.spd = Math.max(1, st.spd);
  // echo bonus scales with star
  if (h.echo && ECHOES[h.echo]) { const E = ECHOES[h.echo], star = S.echoes[h.echo]?.star || 0; for (const k in E.stat) st[k] = Math.round(st[k] * (1 + E.stat[k] * (1 + star * 0.35))); }
  const on = h.on || [];
  const mul = { p_hp10: ['hp', 0.1], p_hp20: ['hp', 0.2], p_mp10: ['mp', 0.1], p_mp20: ['mp', 0.2], p_atk10: ['atk', 0.1], p_atk20: ['atk', 0.2], p_mag10: ['mag', 0.1], p_def10: ['def', 0.1], p_spr10: ['spr', 0.1], p_spd10: ['spd', 0.1] };
  for (const p of on) if (mul[p]) st[mul[p][0]] = Math.round(st[mul[p][0]] * (1 + mul[p][1]));
  st.hp = Math.min(9999, st.hp); st.mp = Math.min(999, st.mp);
  return st;
}
// the weapons held in each hand (a shield or an empty hand is not a weapon)
export function hands(S, id) {
  const h = S.heroes[id], out = [];
  const base = heroStats(S, id).atk;
  const R = GEAR[h.equip.R], L = GEAR[h.equip.L];
  for (const [slot, g] of [['R', R], ['L', L]]) if (g && g.type !== 'shield') out.push({ slot, type: g.type, gid: h.equip[slot], fx: g.fx || {}, atk: slot === 'L' && out.length ? base - (R.atk || 0) + (g.atk || 0) : base, off: slot === 'L' && out.length > 0 });
  if (!out.length) out.push({ slot: 'R', type: 'knuckle', gid: null, fx: {}, atk: Math.round(base * 0.7), unarmed: true });
  return out;
}
export function weaponType(S, id) { return hands(S, id)[0].type; }
export function shieldOf(S, id) { const h = S.heroes[id]; return [GEAR[h.equip.L], GEAR[h.equip.R]].filter(g => g?.type === 'shield'); }
// every effect from equipment (plus the current meal) merged together
export function gearFx(S, id, statsOnly) {
  const h = S.heroes[id]; let fx = {};
  for (const slot of EQUIP_SLOTS) { const g = GEAR[h.equip[slot]]; if (!g?.fx) continue; const f = { ...g.fx }; if ((slot === 'R' || slot === 'L') && g.type !== 'shield') { delete f.el; delete f.onHit; } fx = mergeFx(fx, f); }
  for (const f of setBonusFx(EQUIP_SLOTS.map(sl => h.equip[sl]).filter(Boolean)).fx) fx = mergeFx(fx, f);
  // passive skills from the skill trees (their level counts the +skills on gear too)
  const bonus = (fx.skillAll || 0) + (fx.skillCls?.[id] || 0);
  for (const [sid, n] of Object.entries(h.pts || {})) { const I = SKILL_INFO[sid]; if (I?.passive && n > 0) fx = mergeFx(fx, I.fxAt(Math.min(SKILL_MAX + 10, n + bonus))); }
  if (!statsOnly && S.meal?.n > 0) fx = mergeFx(fx, Object.fromEntries(Object.entries(S.meal.fx).filter(([k]) => !['start', 'limit'].includes(k))));
  // resistances: percent points add up (capped at 75%), less the penalty of the harder difficulties
  const pen = [0, 30, 60][S.diff || 0], res = fx.res || {};
  fx.resist = { ...(fx.resist || {}) };
  for (const e of ['fire', 'ice', 'thunder', 'water', 'wind', 'earth', 'light', 'dark']) { const v = Math.min(75, (res[e] || 0) - pen); const m = +((1 - v / 100) * (fx.resistAll || 1)).toFixed(2); const cur = fx.resist[e]; if (m !== 1 || cur != null) fx.resist[e] = Math.min(cur ?? 9, m); }
  if (fx.onHitP) fx.onHit = { ...(fx.onHit || {}), poison: Math.min(0.9, (fx.onHit?.poison || 0) + fx.onHitP) };
  return fx;
}
export function masteryLv(S, id, type) { const p = S.heroes[id].mastery?.[type] || 0; return MASTERY_AT.filter(m => p >= m).length; }
// weapon arts available from what is in the hands right now
export function artsOf(S, id) {
  const h = S.heroes[id], types = new Set();
  for (const s of ['R', 'L']) { const g = GEAR[h.equip[s]]; if (g) types.add(g.type); }
  const out = [];
  for (const t of types) { const lv = masteryLv(S, id, t); (ARTS_BY_TYPE[t] || []).forEach((a, i) => { if (i < lv) out.push(a); }); }
  return out;
}
// spells: learned for good, plus the ones taught by equipment worn right now
export function spellsOf(S, id) {
  const h = S.heroes[id], set = new Set(h.spells || []);
  for (const slot of EQUIP_SLOTS) { const g = GEAR[h.equip[slot]]; if (g?.teach) set.add(g.teach); }
  return [...set];
}
export function gainAP(S, amount) {
  const out = [];
  for (const id of S.party) {
    const h = S.heroes[id]; if (h.hp <= 0) continue; h.ap = h.ap || {}; h.spells = h.spells || [];
    const mul = 1 + (gearFx(S, id).ap || 0);
    for (const slot of EQUIP_SLOTS) {
      const g = GEAR[h.equip[slot]]; if (!g?.teach || h.spells.includes(g.teach)) continue;
      h.ap[g.teach] = (h.ap[g.teach] || 0) + Math.round(amount * mul);
      if (h.ap[g.teach] >= g.ap) { h.spells.push(g.teach); delete h.ap[g.teach]; out.push([id, g.teach]); }
    }
  }
  return out;
}
// old saves had one weapon, one armor and one accessory
export function migrate(S) {
  for (const id in S.heroes) {
    const h = S.heroes[id], e = h.equip;
    if ('w' in e || 'a' in e || 'x' in e) h.equip = { R: e.w || null, body: e.a || null, acc1: e.x || null, ...(START_KIT[id]?.L ? { L: START_KIT[id].L } : {}) };
    h.spells = h.spells || []; h.ap = h.ap || {}; h.mastery = h.mastery || {}; h.grow = h.grow || {};
    // older saves counted mastery on a faster scale: keep every art already learned, the progress toward the next one in proportion
    if (!S.pace) for (const t in h.mastery) { const p = h.mastery[t], O = MASTERY_OLD, N = MASTERY_AT, L = O.filter(m => p >= m).length; h.mastery[t] = L >= 5 ? N[4] + (p - O[4]) : Math.round(N[L - 1] + (p - O[L - 1]) / (O[L] - O[L - 1]) * (N[L] - N[L - 1])); }
  }
  S.pace = 2;
}
export function apUsed(S, id) { return (S.heroes[id].on || []).reduce((a, p) => a + (PASSIVES[p]?.ap || 0), 0); }
export function apCap(S, id) { return AP_CAP(S.heroes[id].lv); }

// skills: own (by level) + echo (by bond and star)
export function skillsOf(S, id) {
  const out = [];
  for (const t of TREES[id] || []) for (const sid of t.skills) { const lv = skillLv(S, id, sid); if (lv > 0 && !SKILL_INFO[sid].passive) { const syn = synergyOf(S, id, sid); out.push(`${sid}@${lv}${syn ? '~' + syn : ''}`); } }
  return { own: out, echo: [] };
}
// a skill's level: the points put in it, plus +skills from gear (only once it has a point)
function gearOnlyFx(S, id) { const h = S.heroes[id]; let fx = {}; for (const slot of EQUIP_SLOTS) { const g = GEAR[h.equip[slot]]; if (g?.fx) fx = mergeFx(fx, g.fx); } for (const f of setBonusFx(EQUIP_SLOTS.map(sl => h.equip[sl]).filter(Boolean)).fx) fx = mergeFx(fx, f); return fx; }
// synergy: every point in the tree's other skills makes this one stronger (percent, up to +100%)
export function synergyOf(S, id, sid) { const I = SKILL_INFO[sid], h = S.heroes[id]; let n = 0; for (const o of TREES[id][I.tree].skills) if (o !== sid) n += h.pts?.[o] || 0; return Math.min(60, Math.round(n * SYNERGY * 100)); }
export function skillBonus(S, id) { const fx = gearOnlyFx(S, id); return (fx.skillAll || 0) + (fx.skillCls?.[id] || 0); }
export function skillLv(S, id, sid) { const n = S.heroes[id].pts?.[sid] || 0; return n > 0 ? Math.min(SKILL_MAX + 10, n + skillBonus(S, id)) : 0; }
// can a point go into this skill now? ('' means yes)
export function canLearn(S, id, sid) {
  const h = S.heroes[id], I = SKILL_INFO[sid]; if (!I || I.cls !== id) return '不是這個職業的技能';
  if ((h.pts?.[sid] || 0) >= SKILL_MAX) return '已經是最高等級';
  if (h.lv < I.req) return `需要等級 ${I.req}`;
  const miss = (I.pre || []).filter(p => !(h.pts?.[p] > 0)); if (miss.length) return `需要先學會「${miss.map(p => SKILLS[p].name).join('、')}」`;
  if ((h.sp || 0) <= 0) return '沒有技能點數';
  return '';
}
export function learnSkill(S, id, sid) { if (canLearn(S, id, sid)) return false; const h = S.heroes[id]; h.pts = h.pts || {}; h.pts[sid] = (h.pts[sid] || 0) + 1; h.sp--; clampHP(S); return true; }
export function addStat(S, id, k, n = 1) { const h = S.heroes[id]; n = Math.min(n, h.stp || 0); if (n <= 0) return false; h.stats[k] = (h.stats[k] || 0) + n; h.stp -= n; if (k === 'vit') h.hp += n * 4; if (k === 'ene') h.mp += Math.floor(n * 1.5); clampHP(S); return true; }
export function echoSkills(S, eid) {
  if (!eid) return [];
  const E = ECHOES[eid], e = S.echoes[eid]; if (!e) return [];
  const out = [];
  for (const [b, sk] of E.skills) if (e.bond >= b) out.push(sk);
  if (E.starSkills) for (let s = 1; s <= e.star; s++) for (const sk of E.starSkills[s] || []) out.push(sk);
  return out;
}
export function bondFor(S, eid) { return S.echoes[eid]?.bond || 0; }
// give bond exp to equipped echoes, returns list of [echo, newBond, unlocked]
export function gainBond(S, amount) {
  const out = [];
  for (const id of S.party) {
    const eid = S.heroes[id].echo; if (!eid) continue;
    const e = S.echoes[eid]; if (e.bond >= 5) continue;
    e.bexp += amount;
    while (e.bond < 5 && e.bexp >= BOND_EXP[e.bond + 1]) {
      e.bond++;
      const E = ECHOES[eid], got = [];
      for (const [b, sk] of E.skills) if (b === e.bond) got.push(SKILLS[sk].name);
      for (const [b, p] of E.passives) if (b === e.bond) { got.push(PASSIVES[p].name + '（被動）'); }
      out.push([eid, e.bond, got]);
    }
    // passives are learned by the hero wearing the echo
    for (const [b, p] of ECHOES[eid].passives) if (e.bond >= b && !S.heroes[id].learned.includes(p)) S.heroes[id].learned.push(p);
  }
  return out;
}
export function learnEchoPassives(S, id) {
  const eid = S.heroes[id].echo; if (!eid) return;
  const e = S.echoes[eid];
  for (const [b, p] of ECHOES[eid].passives) if (e.bond >= b && !S.heroes[id].learned.includes(p)) S.heroes[id].learned.push(p);
}
export function starUp(S, eid) {
  const e = S.echoes[eid]; if (!e || e.star >= 3) return false;
  const cost = STAR_COST[e.star + 1];
  if ((S.items.shard || 0) < cost) return false;
  S.items.shard -= cost; e.star++; return true;
}

export function gainExp(S, amount) {
  const ups = [];
  for (const id of [...S.party, ...S.reserve]) {
    const h = S.heroes[id]; const share = S.party.includes(id) ? amount : Math.floor(amount * 0.5);
    if (S.party.includes(id) && h.hp <= 0) continue;
    h.exp += share;
    while (h.lv < 99 && h.exp >= EXP_NEXT(h.lv)) {
      h.exp -= EXP_NEXT(h.lv);
      const before = heroStats(S, id); h.lv++; const after = heroStats(S, id);
      h.hp += after.hp - before.hp; h.mp += after.mp - before.mp;
      h.sp = (h.sp || 0) + 1; h.stp = (h.stp || 0) + 5;
      ups.push([id, h.lv, ['技能點數 +1', '屬性點數 +5']]);
    }
  }
  return ups;
}

export function addItem(S, id, n = 1) {
  if (GEAR[id]) { S.items[id] = (S.items[id] || 0) + n; return; }
  S.items[id] = (S.items[id] || 0) + n; if (S.items[id] <= 0) delete S.items[id];
}
export function itemName(id) { return ITEMS[id]?.name || GEAR[id]?.name || id; }
export { WTYPES };
export function healAll(S) { for (const id in S.heroes) { const st = heroStats(S, id); S.heroes[id].hp = st.hp; S.heroes[id].mp = st.mp; } }
export function clampHP(S) { for (const id in S.heroes) { const st = heroStats(S, id); const h = S.heroes[id]; h.hp = Math.min(h.hp, st.hp); h.mp = Math.min(h.mp, st.mp); } }
export function equip(S, id, slot, gid) {
  const h = S.heroes[id];
  const take = (s) => { const old = h.equip[s]; if (old) addItem(S, old, 1); h.equip[s] = null; };
  take(slot);
  const g = GEAR[gid];
  const other = slot === 'R' ? 'L' : 'R';
  // two-handed weapons use both hands
  if (g && (slot === 'R' || slot === 'L') && (g.hands === 2 || GEAR[h.equip[other]]?.hands === 2)) take(other);
  if (gid) { S.items[gid]--; if (!S.items[gid]) delete S.items[gid]; }
  h.equip[slot] = gid || null; clampHP(S);
}
export function slotFits(slot, gid) {
  const g = GEAR[gid]; if (!g) return false;
  if (slot === 'R' || slot === 'L') return g.slot === 'hand';
  if (slot === 'acc1' || slot === 'acc2') return g.slot === 'acc';
  return g.slot === slot;
}
export function canEquip(id, gid, S) {
  const g = GEAR[gid]; if (!g) return false;
  if (S && g.lvReq && S.heroes[id] && S.heroes[id].lv < g.lvReq) return false;
  const A = APT[id]; if (!A) return true;
  if (g.slot === 'hand') return g.type === 'shield' ? A.shield : A.w.includes(g.type);
  if (g.style) return A.styles.includes(g.style);
  return true;
}
export function setEcho(S, id, eid) {
  // an echo can only be worn by one hero at a time
  for (const o in S.heroes) if (S.heroes[o].echo === eid) S.heroes[o].echo = null;
  S.heroes[id].echo = eid; learnEchoPassives(S, id); clampHP(S);
}
export function togglePassive(S, id, p) {
  const h = S.heroes[id];
  if (h.on.includes(p)) { h.on = h.on.filter(x => x !== p); clampHP(S); return true; }
  if (apUsed(S, id) + PASSIVES[p].ap > apCap(S, id)) return false;
  h.on.push(p); return true;
}
export function ownedEchoes(S) { return ECHO_ORDER.filter(e => S.echoes[e]); }
export { SUMMONS };

// ---------------------------------------------------------------- paper doll: what a hero looks like in their gear
const METAL_C = ['#b08850', '#8a8e98', '#aab2be', '#c4ccd8', '#9ad0ec', '#e8c050', '#e2d6b8', '#8a78f0'];
const LEATHER_C = ['#c8b890', '#8a5a3a', '#6a4028', '#b0b4c0', '#a0c0e0', '#5a9a5c', '#3a7a62', '#b8a0e8'];
const CLOTH_C = ['#e8e0d0', '#b84a64', '#c4d4ee', '#eef2fa', '#7ac0e4', '#4e9a62', '#9a3434', '#463a96'];
export function gearColor(G) {
  if (!G) return null;
  const t = Math.max(0, Math.min(7, G.tier || 0));
  if (G.color) return G.color;
  if (G.style === 'light') return LEATHER_C[t];
  if (G.style === 'robe') return CLOTH_C[t];
  return METAL_C[t];
}
const darker = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0'); return '#' + f(n >> 16 & 255) + f(n >> 8 & 255) + f(n & 255); };
const EL_C = { fire: '#e8502a', ice: '#7ad8f8', thunder: '#f0d040', water: '#3a8ae8', wind: '#5ad88a', earth: '#b8843a', light: '#fff0b0', dark: '#9a4ae0' };
const AFFIX_C = ['#d83a5a', '#3ac8a8', '#e8a030', '#8a5ae8', '#4aa8e8', '#c8e04a', '#e86ab8', '#e8e0c8'];
const hashS = (str) => { let h = 7; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
// the accent colour of a piece: its element if it has one, otherwise a colour tied to its special effect
export function gearAccent(G) {
  if (!G) return null;
  const el = G.enchant || [].concat(G.fx?.el || [])[0] || (G.fx?.resist ? Object.keys(G.fx.resist)[0] : null);
  if (el && EL_C[el]) return EL_C[el];
  if (G.affix) return AFFIX_C[hashS(G.affix) % AFFIX_C.length];
  return null;
}
// what one piece puts on the doll; the same fragment draws the item's own picture
export function gearLook(G, hero) {
  if (!G) return {};
  const c = gearColor(G), a = gearAccent(G), t = G.tier || 0, H = hero ? HEROES[hero] : null, o = {};
  if (G.slot === 'hand') {
    if (G.type === 'shield') { o.shield = true; o.shieldKind = G.kind || 'kite'; o.shieldTier = t; o.shieldColor = c; o.shieldEmblem = a || (t >= 4 ? '#e8c050' : undefined); o.shieldRim = t >= 6 ? '#fff0b0' : t >= 2 ? '#e8c050' : darker(c, 0.7); }
    else { o.weapon = G.type === 'knuckle' ? 'knuckle' : WTYPES[G.type]?.model ?? null; o.weaponTier = t; o.weaponRefine = G.refine || 0; o.weaponMetal = METAL_C[Math.min(7, t)]; o.weaponAccent = a; }
  } else if (G.slot === 'head') {
    if (G.style === 'heavy') { o.hat = t >= 6 ? 'crown' : t >= 4 ? 'horned' : 'helm'; o.hatColor = c; o.hatBand = a || (t >= 2 ? (t >= 6 ? '#e8c050' : '#c83a3a') : undefined); }
    else if (G.style === 'light') { o.hat = ['cap', 'band', 'feather'][t % 3]; o.hatColor = c; o.hatBand = a || '#c83a3a'; }
    else { o.hat = t >= 6 ? 'circlet' : (H?.look.hat === 'wizard' ? 'wizard' : 'hood'); o.hatColor = t >= 6 ? '#e8c050' : c; o.hatBand = a || (t >= 3 ? '#e8c050' : undefined); }
  } else if (G.slot === 'body') {
    o.top = c; o.robe = G.style === 'robe';
    if (G.style === 'heavy') { o.pauldron = darker(c, 1.08); o.trim = t >= 4 ? '#e8c050' : undefined; o.plate = t; o.pauldronSpike = t >= 5; }
    if (G.style === 'light' && t >= 2) o.straps = darker(c, 0.6);
    if (G.style === 'robe') { o.trim = t >= 3 ? '#e8c050' : undefined; o.collar = t >= 3 ? '#e8c050' : undefined; }
    o.emblem = a || undefined;
  } else if (G.slot === 'arms') { o.gloves = c; o.cuff = a || undefined; if (G.style === 'heavy') o.pauldronFromArms = darker(c, 1.08); }
  else if (G.slot === 'waist') { o.belt = darker(c, 0.8); o.buckle = a || (t >= 3 ? '#e8c050' : undefined); if (G.style === 'robe') o.sash = c; }
  else if (G.slot === 'legs') { o.legs = darker(c, 0.9); if (G.style === 'heavy') o.knee = c; }
  else if (G.slot === 'feet') { o.boots = darker(c, 0.85); if (G.style === 'heavy' && t >= 2) o.sabaton = c; }
  else if (G.slot === 'back') { o.cape = a ? darker(a, 0.75) : G.style === 'heavy' ? (H?.look.cape || darker(c, 0.7)) : darker(c, 0.95); o.capeTrim = t >= 4 ? '#e8c050' : undefined; }
  return o;
}
// a plain mannequin for item pictures
export const MANNEQUIN = { skin: '#d8c0a8', hair: '#6a6a72', hairStyle: 'short', top: '#9a948a', legs: '#6a6660', boots: '#5a5048', eyes: '#3a3a44' };
export function itemLook(gid) {
  const G = GEAR[gid]; if (!G) return null;
  const f = gearLook(G); const L = { ...MANNEQUIN, ...f };
  if (f.pauldronFromArms) L.pauldron = f.pauldronFromArms;
  return L;
}
export function paperLook(S, id, equipOverride) {
  const H = HEROES[id], h = S.heroes[id]; if (!H) return null;
  const L = { ...H.look }; if (!h) return L;
  const eq = equipOverride || h.equip, g = (sl) => GEAR[eq[sl]];
  // start from the hero's own clothes; armour goes over them and the signature colour stays as trim
  delete L.hat; delete L.hatColor; delete L.hatBand; L.weapon = null; L.weaponL = null; L.shield = false;
  if (!H.look.cape) delete L.cape;
  const R = g('R'), Lh = g('L');
  const wpn = [R, Lh].filter(x => x && x.type !== 'shield'), shield = [Lh, R].find(x => x?.type === 'shield');
  if (wpn[0]) Object.assign(L, gearLook(wpn[0], id));
  if (wpn[1]) { const f = gearLook(wpn[1], id); L.weaponL = f.weapon; L.weaponLTier = f.weaponTier; L.weaponLRefine = f.weaponRefine; L.weaponLMetal = f.weaponMetal; L.weaponLAccent = f.weaponAccent; }
  else if (wpn[0]?.type === 'knuckle' && !shield) { L.weaponL = 'knuckle'; L.weaponLTier = L.weaponTier; L.weaponLMetal = L.weaponMetal; L.weaponLAccent = L.weaponAccent; } // fist weapons come in pairs
  if (shield) Object.assign(L, gearLook(shield, id));
  for (const sl of ['head', 'arms', 'waist', 'legs', 'feet', 'back']) { const G = g(sl); if (!G) continue; const f = gearLook(G, id); if (f.pauldronFromArms && !L.pauldronSet) L.pauldron = f.pauldronFromArms; delete f.pauldronFromArms; Object.assign(L, f); }
  const bd = g('body');
  if (bd && eq.body !== 'a_cloth') { const f = gearLook(bd, id); Object.assign(L, f); L.top2 = bd.style === 'robe' ? (H.look.top2 || H.color) : H.look.top; if (bd.style !== 'heavy' && !g('arms')?.style?.includes('heavy')) L.pauldron = undefined; }
  return L;
}
