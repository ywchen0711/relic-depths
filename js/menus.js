// The new windows: picking a class, skill trees, stat points, the bag, the stash, the shop, gambling, hiring and
// the waypoints. They are added to the UI class from ui.js so they share its chooser and tooltips.
import { UI, fullSprite, portrait } from './ui.js?v=1';
import { HEROES, SKILLS, GEAR, ITEMS, ELEM } from './data.js?v=1';
import { heroStats, addItem, itemName, canLearn, learnSkill, addStat, skillLv, skillBonus, canEquip, equip, slotFits, EQUIP_SLOTS, SLOT_N, addHero, gearFx } from './party.js?v=1';
import { CLASSES, CLASS_ORDER, TREES, SKILL_INFO, SKILL_MAX, TREE_REQ } from './classes.js?v=1';
import { RARITY, rollItem, gambleItem, shopStock, sellPrice, dropLoot } from './loot.js?v=1';
import { ACTS, DIFFS, WP_LEVELS, mapId } from './dungeon.js?v=1';
import { fxText, WTYPES } from './content.js?v=1';

const P = UI.prototype;
const col = (g) => `<span style="color:${g?.rarColor || '#fff'}">${g?.name || '?'}</span>`;
const TGT_N = { enemy: '單體', enemies: '全體', random: '隨機', ally: '隊友', allies: '全隊', self: '自己', dead: '倒下的隊友', allyOther: '其他隊友' };
const STAT_HELP = { str: ['力量', '攻擊 +1'], dex: ['敏捷', '防禦 +0.5、每5點速度 +1'], vit: ['體力', 'HP +4'], ene: ['精力', '魔力 +1、MP +1.5、精神 +0.5'] };

// ---------------------------------------------------------------- picking a class at the start
P.classSelect = async function (title = '選擇你的職業', exclude = []) {
  const list = CLASS_ORDER.filter(c => !exclude.includes(c));
  const i = await this.choose(list.map(c => ({ label: `<span style="color:${CLASSES[c].color}">${CLASSES[c].name}</span>`, sub: CLASSES[c].title, icon: portrait(CLASSES[c].look) })), {
    title, cls: 'statushub', info: (k) => this.classHTML(list[k]),
  });
  return i < 0 ? null : list[i];
};
P.classHTML = function (c) {
  const C = CLASSES[c], b = C.base;
  return `<div class="st"><img class="st-big" src="${fullSprite(C.look, true)}"><div><h3 style="color:${C.color}">${C.name} <small>${C.title}</small></h3>
    <div class="st-bio">${C.bio}</div>
    <table><tr><td>HP</td><td>${b.hp}</td><td>MP</td><td>${b.mp}</td></tr><tr><td>攻擊</td><td>${b.atk}</td><td>防禦</td><td>${b.def}</td></tr><tr><td>魔力</td><td>${b.mag}</td><td>速度</td><td>${b.spd}</td></tr></table>
    <div class="tags">武器：${C.weapons.map(w => `<span>${WTYPES[w]?.n || w}</span>`).join('')}${C.shield ? '<span>盾</span>' : ''}</div>
    <div class="tags">技能樹：${TREES[c].map(t => `<span>${t.icon} ${t.name}</span>`).join('')}</div></div></div>`;
};

// ---------------------------------------------------------------- skill trees
P.skillText = function (id, sid, lv) {
  const I = SKILL_INFO[sid], B = SKILLS[sid];
  if (I.passive) { const f = (n) => fxText(I.fxAt(n)).join('、') || I.desc; return `<div>${I.desc}</div>${lv ? `<div>目前（Lv${lv}）：${f(lv)}</div>` : ''}<div class="dim">下一級（Lv${lv + 1}）：${f(lv + 1)}</div>`; }
  const show = (n) => { const S = SKILLS[`${sid}@${n}`]; const bits = []; if (S.pow) bits.push(`威力 ×${S.pow.toFixed(2)}${S.hits > 1 ? ` ×${S.hits}次` : ''}`); if (S.base) bits.push(`+${S.base}`); if (S.chance) bits.push(`機率 ${Math.round(S.chance * 100)}%`); if (S.revive) bits.push(`復活 ${Math.round(S.revive * 100)}%HP`); if (S.buff) bits.push(Object.entries(S.buff).map(([k, v]) => `${({ atk: '攻', def: '防', mag: '魔', spr: '精', spd: '速' })[k]}+${v}`).join(' ')); bits.push(`MP ${S.mp || 0}`); return bits.join('　'); };
  return `<div>${B.desc || ''}（${TGT_N[B.tgt] || ''}${B.el ? '・' + [].concat(B.el).map(e => ELEM[e]).join('') + '屬性' : ''}）</div>${lv ? `<div>目前（Lv${lv}）：${show(lv)}</div>` : ''}<div class="dim">下一級（Lv${lv + 1}）：${show(lv + 1)}</div>`;
};
P.skillTreeMenu = async function (pre) {
  const S = this.S; let id = pre || await this.heroPick('技能樹', true); if (!id) return;
  let ts = 0;
  for (;;) {
    const h = S.heroes[id], trees = TREES[id], all = [...S.party, ...S.reserve];
    const spent = (t) => t.skills.reduce((a, s) => a + (h.pts?.[s] || 0), 0);
    const i = await this.choose(trees.map(t => ({ label: `${t.icon} ${t.name}`, sub: `${spent(t)} 點` })), {
      title: `${HEROES[id].name} 的技能樹　剩餘點數 <b style="color:#ffe04a">${h.sp || 0}</b>　<small>◀ ▶ 換人</small>`, start: ts, cls: 'statushub',
      info: (k) => `<div class="st-sk">${trees[k].skills.map((sid, j) => { const n = h.pts?.[sid] || 0, lv = skillLv(S, id, sid); return `<div style="margin:4px 0;opacity:${n || !canLearn(S, id, sid) || canLearn(S, id, sid) === '沒有技能點數' ? 1 : 0.55}"><b>${j + 1}. ${SKILLS[sid].name}</b> ${SKILL_INFO[sid].passive ? '<small>（被動）</small>' : ''}　<span style="color:#ffe04a">${n}/${SKILL_MAX}</span>${lv > n ? ` <small style="color:#9ab8ff">（+${lv - n}）</small>` : ''}　<small class="dim">需要 Lv${TREE_REQ[j]}</small><br><small>${SKILL_INFO[sid].desc || SKILLS[sid].desc || ''}</small></div>`; }).join('')}</div>`,
      lr: (k, d) => { id = all[(all.indexOf(id) + d + all.length) % all.length]; ts = k; return 'close'; },
    });
    if (i === -2) continue;
    if (i < 0) return;
    ts = i;
    let ss = 0;
    for (;;) {
      const t = trees[i];
      const j = await this.choose(t.skills.map((sid) => { const n = h.pts?.[sid] || 0, why = canLearn(S, id, sid); return { label: `${SKILLS[sid].name}`, sub: `${n}/${SKILL_MAX}`, desc: why && why !== '沒有技能點數' ? `🔒 ${why}` : '' }; }), {
        title: `${t.icon} ${t.name}　剩餘點數 <b style="color:#ffe04a">${h.sp || 0}</b>`, start: ss,
        info: (k) => { const sid = t.skills[k]; return `<h4>${SKILLS[sid].name}</h4>${this.skillText(id, sid, skillLv(S, id, sid))}${skillBonus(S, id) ? `<div class="dim">裝備加成：所有技能 +${skillBonus(S, id)}（已投入點數的技能才有效）</div>` : ''}`; },
      });
      if (j < 0) break;
      ss = j;
      const sid = t.skills[j], why = canLearn(S, id, sid);
      if (why) { this.G.audio.sfx('error'); this.toast(why); continue; }
      learnSkill(S, id, sid); this.G.audio.sfx('levelup');
    }
  }
};

// ---------------------------------------------------------------- stat points
P.statsMenu = async function (pre) {
  const S = this.S; let id = pre || await this.heroPick('屬性點', true); if (!id) return;
  let st0 = 0;
  for (;;) {
    const h = S.heroes[id], all = [...S.party, ...S.reserve];
    const keys = ['str', 'dex', 'vit', 'ene'];
    const rows = keys.map(k => ({ label: STAT_HELP[k][0], sub: `${h.stats[k] || 0}`, desc: STAT_HELP[k][1] }));
    rows.push({ label: '一次加 5 點', sub: '', desc: '把下一次選的屬性一口氣加 5 點' });
    const i = await this.choose(rows, { title: `${HEROES[id].name}　剩餘屬性點 <b style="color:#ffe04a">${h.stp || 0}</b>　<small>◀ ▶ 換人</small>`, start: st0, info: () => this.statusHTML(id), lr: (k, d) => { id = all[(all.indexOf(id) + d + all.length) % all.length]; st0 = k; return 'close'; } });
    if (i === -2) continue;
    if (i < 0) return;
    st0 = i;
    if (i === 4) { const k = await this.choose(keys.map(k => STAT_HELP[k][0]), { title: '加 5 點到…', cls: 'small' }); if (k >= 0 && addStat(S, id, keys[k], 5)) this.G.audio.sfx('levelup'); else if (k >= 0) this.toast('屬性點不足'); continue; }
    if (addStat(S, id, keys[i], 1)) this.G.audio.sfx('item'); else { this.G.audio.sfx('error'); this.toast('沒有屬性點了'); }
  }
};

// ---------------------------------------------------------------- the bag: every piece of equipment you carry
P.gearOwned = function () { return Object.keys(this.S.items).filter(g => this.S.items[g] > 0 && GEAR[g]).sort((a, b) => (GEAR[b].rarity || 0) - (GEAR[a].rarity || 0) || (GEAR[b].il || 0) - (GEAR[a].il || 0)); };
P.bagMenu = async function (o = {}) {
  const S = this.S; let st = 0;
  for (;;) {
    const list = this.gearOwned();
    if (!list.length) { await this.info('<p>背包裡沒有裝備。</p>', '背包'); return; }
    const i = await this.choose(list.map(g => ({ icon: null, label: col(GEAR[g]), sub: this.gearKind(GEAR[g]) })), { title: `背包　${list.length} 件　<span class="gil">${S.gil} G</span>${o.sell ? '　<small>選一件賣掉</small>' : ''}`, start: st, info: (k) => this.gearHTML(list[k]) + (o.sell ? `<div style="color:#ffe04a">賣價 ${sellPrice(GEAR[list[k]])} G</div>` : '') + this.whoCanWear(list[k]) });
    if (i < 0) return;
    st = Math.min(i, list.length - 2);
    const g = list[i], G = GEAR[g];
    if (o.sell) { if (await this.yesno(`把 ${G.name} 以 ${sellPrice(G)} G 賣掉？`)) { S.gil += sellPrice(G); this.removeGear(g); this.G.audio.sfx('item'); } continue; }
    const acts = ['裝備給…', '丟掉'];
    const a = await this.choose(acts, { title: G.name, cls: 'small' });
    if (a === 0) {
      const who = [...S.party, ...S.reserve].filter(id => canEquip(id, g, S));
      if (!who.length) { this.toast('沒有人能裝備（職業或等級不符）'); continue; }
      const w = await this.choose(who.map(id => ({ label: HEROES[id].name, sub: 'Lv ' + S.heroes[id].lv, icon: portrait(id) })), { title: '裝備給誰？', info: (k) => this.compareWith(who[k], slotFor(G, S.heroes[who[k]]), g) });
      if (w < 0) continue;
      equip(S, who[w], slotFor(G, S.heroes[who[w]]), g); this.G.audio.sfx('item');
    }
    if (a === 1 && await this.yesno(`真的要丟掉 ${G.name}？`)) { this.removeGear(g); this.G.audio.sfx('cancel'); }
  }
};
function slotFor(G, h) {
  if (G.slot === 'hand') return G.type === 'shield' ? 'L' : 'R';
  if (G.slot === 'acc') return !h.equip.acc1 ? 'acc1' : !h.equip.acc2 ? 'acc2' : 'acc1';
  return G.slot;
}
P.removeGear = function (g) { const S = this.S; S.items[g]--; if (S.items[g] <= 0) { delete S.items[g]; if (GEAR[g]?.loot) dropLoot(S, g); } };
P.whoCanWear = function (g) { const S = this.S, who = Object.keys(S.heroes).filter(id => canEquip(id, g, S)); return `<div class="dim">可以裝備：${who.map(id => HEROES[id].name).join('、') || '—'}</div>`; };

// ---------------------------------------------------------------- the stash in the camp
P.stashMenu = async function () {
  const S = this.S; S.stash = S.stash || [];
  for (;;) {
    const i = await this.choose([{ label: '存進倉庫', sub: `背包 ${this.gearOwned().length} 件` }, { label: '從倉庫拿出', sub: `倉庫 ${S.stash.length}/120` }], { title: '倉庫', cls: 'small' });
    if (i < 0) return;
    if (i === 0) {
      let st = 0;
      for (;;) { const list = this.gearOwned(); if (!list.length) break; if (S.stash.length >= 120) { this.toast('倉庫滿了'); break; }
        const k = await this.choose(list.map(g => ({ label: col(GEAR[g]), sub: this.gearKind(GEAR[g]) })), { title: '存進倉庫', start: st, info: (j) => this.gearHTML(list[j]) }); if (k < 0) break; st = k;
        S.items[list[k]]--; if (S.items[list[k]] <= 0) delete S.items[list[k]]; S.stash.push(list[k]); this.G.audio.sfx('item'); }
    } else {
      let st = 0;
      for (;;) { const list = S.stash.filter(g => GEAR[g]); if (!list.length) break;
        const k = await this.choose(list.map(g => ({ label: col(GEAR[g]), sub: this.gearKind(GEAR[g]) })), { title: '從倉庫拿出', start: st, info: (j) => this.gearHTML(list[j]) + this.whoCanWear(list[j]) }); if (k < 0) break; st = k;
        S.stash.splice(S.stash.indexOf(list[k]), 1); addItem(S, list[k], 1); this.G.audio.sfx('item'); }
    }
  }
};

// ---------------------------------------------------------------- the merchant
const CONSUMABLES = ['potion', 'hipotion', 'i_hp3', 'i_hp4', 'ether', 'hiether', 'antidote', 'i_c_all', 'phoenix', 'i_rv2', 'i_tp'];
P.merchantMenu = async function () {
  const S = this.S, lv = Math.max(...Object.values(S.heroes).map(h => h.lv));
  if (!S.shop || S.shopLv !== lv || !S.shop.every(g => GEAR[g])) { for (const g of S.shop || []) if (!S.items[g] && !S.stash?.includes(g)) dropLoot(S, g); S.shop = shopStock(S, lv + 2); S.shopLv = lv; }
  for (;;) {
    const i = await this.choose(['買裝備', '買道具', '賣裝備', '賣掉所有普通與魔法裝備'], { title: `商人　<span class="gil">${S.gil} G</span>`, cls: 'small' });
    if (i < 0) return;
    if (i === 0) {
      let st = 0;
      for (;;) { const list = S.shop.filter(g => GEAR[g]); if (!list.length) { this.toast('賣完了'); break; }
        const k = await this.choose(list.map(g => ({ label: col(GEAR[g]), sub: `${GEAR[g].price} G` })), { title: `買裝備　<span class="gil">${S.gil} G</span>`, start: st, info: (j) => this.gearHTML(list[j]) + this.whoCanWear(list[j]) }); if (k < 0) break; st = k;
        const g = list[k]; if (S.gil < GEAR[g].price) { this.G.audio.sfx('error'); this.toast('金幣不足'); continue; }
        S.gil -= GEAR[g].price; addItem(S, g, 1); S.shop = S.shop.filter(x => x !== g); this.G.audio.sfx('item'); }
    }
    if (i === 1) await this.shop(CONSUMABLES.filter(x => ITEMS[x]), '道具');
    if (i === 2) await this.bagMenu({ sell: true });
    if (i === 3) {
      const junk = this.gearOwned().filter(g => (GEAR[g].rarity ?? 0) <= 1 && !Object.values(S.heroes).some(h => Object.values(h.equip).includes(g)));
      if (!junk.length) { this.toast('沒有可以賣的普通或魔法裝備'); continue; }
      const total = junk.reduce((s, g) => s + sellPrice(GEAR[g]) * S.items[g], 0);
      if (await this.yesno(`賣掉 ${junk.length} 件普通與魔法裝備，共 ${total} G？`)) { for (const g of junk) { const n = S.items[g]; for (let j = 0; j < n; j++) this.removeGear(g); } S.gil += total; this.G.audio.sfx('item'); }
    }
  }
};

// ---------------------------------------------------------------- the gambler
P.gambleMenu = async function () {
  const S = this.S, lv = Math.max(...Object.values(S.heroes).map(h => h.lv));
  const cats = [['W', '武器'], ['A', '防具'], ['S', '盾'], ['J', '戒指・項鍊']];
  const price = (c) => Math.round((150 + lv * lv * 6) * (c === 'J' ? 2 : 1));
  for (;;) {
    const i = await this.choose(cats.map(([c, n]) => ({ label: n, sub: `${price(c)} G` })), { title: `賭博　<span class="gil">${S.gil} G</span>`, cls: 'small', info: '<p>付錢買一件看不見內容的裝備。</p><p>大多是魔法裝備，有機會是稀有、套裝，甚至暗金！</p>' });
    if (i < 0) return;
    const [c] = cats[i]; if (S.gil < price(c)) { this.G.audio.sfx('error'); this.toast('金幣不足'); continue; }
    S.gil -= price(c);
    const g = gambleItem(S, lv + 4 + Math.floor(Math.random() * 6), c); addItem(S, g, 1);
    this.G.audio.sfx(GEAR[g].rarity >= 3 ? 'resonance' : 'chest');
    await this.info(this.gearHTML(g), '你得到了…');
  }
};

// ---------------------------------------------------------------- hiring and the party
P.hireMenu = async function () {
  const S = this.S, lead = Math.max(...Object.values(S.heroes).map(h => h.lv));
  for (;;) {
    const owned = Object.keys(S.heroes);
    const i = await this.choose(['招募新夥伴', '調整隊伍（最多4人出戰）'], { title: `傭兵隊長　<span class="gil">${S.gil} G</span>`, cls: 'small' });
    if (i < 0) return;
    if (i === 1) { await this.formationMenu(); continue; }
    if (owned.length >= CLASS_ORDER.length) { this.toast('所有職業都已經是你的夥伴了'); continue; }
    const cost = 150 + lead * 90;
    const c = await this.classSelect(`招募夥伴（${cost} G，等級 ${Math.max(1, lead - 1)}）`, owned);
    if (!c) continue;
    if (S.gil < cost) { this.G.audio.sfx('error'); this.toast('金幣不足'); continue; }
    S.gil -= cost; addHero(S, c, Math.max(1, lead - 1)); autoBuild(S, c);
    this.G.audio.sfx('levelup'); this.toast(`${CLASSES[c].name}加入了！${S.party.includes(c) ? '' : '（在待命名單）'}`);
  }
};
// spend a hired hero's points: two trees of real skills, stats by what the class lives on
export function autoBuild(S, id) {
  const AUTO = { barb: [0, 4], paladin: [1, 0], sorc: [0, 1], necro: [0, 5], ranger: [0, 1], assassin: [0, 2], druid: [0, 1], monk: [0, 5], bard: [3, 4], gunner: [0, 1] };
  const h = S.heroes[id], trees = (AUTO[id] || [0, 1]).map(i => TREES[id][i]);
  let guard = 200;
  while ((h.sp || 0) > 0 && guard-- > 0) {
    const cand = trees.flatMap(t => t.skills).filter(s => !canLearn(S, id, s));
    if (!cand.length) break;
    cand.sort((a, b) => (h.pts?.[a] || 0) - (h.pts?.[b] || 0) || SKILL_INFO[b].k - SKILL_INFO[a].k);
    learnSkill(S, id, cand[0]);
  }
  const caster = HEROES[id].base.mag > HEROES[id].base.atk;
  const plan = caster ? ['ene', 'ene', 'vit', 'vit', 'dex'] : ['str', 'str', 'vit', 'vit', 'dex'];
  let k = 0; while ((h.stp || 0) > 0) addStat(S, id, plan[k++ % plan.length], 1);
  const st = heroStats(S, id); h.hp = st.hp; h.mp = st.mp;
}

// ---------------------------------------------------------------- waypoints
P.waypointMenu = async function () {
  const S = this.S, d = S.diff || 0, rows = [{ label: '暮光營地', sub: '', to: 'town' }];
  ACTS.forEach((A, a) => WP_LEVELS.forEach(l => { if (S.wp[`d${d}a${a}l${l}`]) rows.push({ label: `${A.n.split('　')[1]}・${A.levels[l][0]}`, sub: `第${a + 1}幕`, to: mapId(a, l) }); }));
  const i = await this.choose(rows, { title: `傳送點　<span style="color:${DIFFS[d].c}">${DIFFS[d].n}</span>`, cls: 'small' });
  return i < 0 ? null : rows[i].to;
};
