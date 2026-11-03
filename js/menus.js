// The new windows: picking a class, skill trees, stat points, the bag, the stash, the shop, gambling, hiring and
// the waypoints. They are added to the UI class from ui.js so they share its chooser and tooltips.
import { UI, fullSprite, portrait } from './ui.js?v=1';
import { HEROES, SKILLS, GEAR, ITEMS, ELEM, clsOf } from './data.js?v=1';
import { heroStats, addItem, itemName, canLearn, learnSkill, addStat, skillLv, skillBonus, synergyOf, canEquip, equip, slotFits, EQUIP_SLOTS, SLOT_N, addHero, gearFx, hireHero, dismissHero, isLead, MAX_HEROES } from './party.js?v=1';
import { CLASSES, CLASS_ORDER, TREES, SKILL_INFO, SKILL_MAX, TREE_REQ } from './classes.js?v=1';
import { RARITY, rollItem, gambleItem, shopStock, sellPrice, dropLoot } from './loot.js?v=1';
import { ACTS, DIFFS, WP_LEVELS, mapId } from './dungeon.js?v=1';
import { MAPS } from './maps.js?v=1';
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
  const syn = synergyOf(this.S, id, sid), show = (n) => { const S = SKILLS[`${sid}@${n}${syn ? '~' + syn : ''}`]; const bits = []; if (S.pow) bits.push(`威力 ×${S.pow.toFixed(2)}${S.hits > 1 ? ` ×${S.hits}次` : ''}`); if (S.base) bits.push(`+${S.base}`); if (S.chance) bits.push(`機率 ${Math.round(S.chance * 100)}%`); if (S.revive) bits.push(`復活 ${Math.round(S.revive * 100)}%HP`); if (S.buff) bits.push(Object.entries(S.buff).map(([k, v]) => `${({ atk: '攻', def: '防', mag: '魔', spr: '精', spd: '速' })[k]}+${v}`).join(' ')); bits.push(`MP ${S.mp || 0}`); return bits.join('　'); };
  const pre = SKILL_INFO[sid].pre.map(p => SKILLS[p].name);
  return `<div>${B.desc || ''}（${TGT_N[B.tgt] || ''}${B.el ? '・' + [].concat(B.el).map(e => ELEM[e]).join('') + '屬性' : ''}）</div>${lv ? `<div>目前（Lv${lv}）：${show(lv)}</div>` : ''}<div class="dim">下一級（Lv${lv + 1}）：${show(lv + 1)}</div>${B.pow || B.base ? `<div style="color:#9ab8ff">協同加成 +${syn}%（這棵樹其他技能每1點 +3%，最多 +60%）</div>` : ''}<div class="dim">需要 Lv${SKILL_INFO[sid].req}${pre.length ? '・先學會「' + pre.join('、') + '」' : ''}</div>`;
};
P.skillTreeMenu = async function (pre) {
  const S = this.S; let id = pre || await this.heroPick('技能樹', true); if (!id) return;
  let ts = 0;
  for (;;) {
    const h = S.heroes[id], trees = TREES[id], all = [...S.party, ...S.reserve];
    const spent = (t) => t.skills.reduce((a, s) => a + (h.pts?.[s] || 0), 0);
    const i = await this.choose(trees.map(t => ({ label: `${t.icon} ${t.name}`, sub: `${spent(t)} 點` })), {
      title: `${HEROES[id].name} 的技能樹　剩餘點數 <b style="color:#ffe04a">${h.sp || 0}</b>　<small>◀ ▶ 換人</small>`, start: ts, cls: 'statushub',
      info: (k) => `<div class="st-sk">${trees[k].skills.map((sid, j) => { const n = h.pts?.[sid] || 0, lv = skillLv(S, id, sid); return `<div style="margin:4px 0;opacity:${n || !canLearn(S, id, sid) || canLearn(S, id, sid) === '沒有技能點數' ? 1 : 0.55}"><b>${j + 1}. ${SKILLS[sid].name}</b> ${SKILL_INFO[sid].passive ? '<small>（被動）</small>' : ''}　<span style="color:#ffe04a">${n}/${SKILL_MAX}</span>${lv > n ? ` <small style="color:#9ab8ff">（+${lv - n}）</small>` : ''}　<small class="dim">需要 Lv${SKILL_INFO[sid].req}</small><br><small>${SKILL_INFO[sid].desc || SKILLS[sid].desc || ''}</small></div>`; }).join('')}</div>`,
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

// ---------------------------------------------------------------- filtering and sorting any list of equipment (bag, stash, shop, selling, equipping)
const has = (o) => !!o && Object.values(o).some(v => v);
const GF_RAR = [['全部', null], ['普通', g => !g.rarity && !g.rw], ['魔法', g => g.rarity === 1], ['稀有', g => g.rarity === 2], ['套裝', g => g.rarity === 4], ['暗金', g => g.rarity === 3], ['符文之語', g => !!g.rw]];
const GF_KIND = [['全部', null], ['武器', g => g.slot === 'hand' && g.type !== 'shield'], ['盾', g => g.type === 'shield'], ...['head', 'body', 'arms', 'waist', 'legs', 'feet', 'back'].map(s => [SLOT_N[s], g => g.slot === s]), ['戒指', g => g.slot === 'acc' && g.kind === 'ring'], ['項鍊', g => g.slot === 'acc' && g.kind !== 'ring']];
const GF_TRAIT = [['＋技能', g => g.fx?.skillAll > 0 || has(g.fx?.skillCls) || has(g.fx?.skillTree)], ['速度', g => g.spd > 0 || g.fx?.spdF > 0], ['抗性', g => has(g.fx?.res)], ['寶物尋找', g => g.fx?.mf > 0], ['吸血', g => g.fx?.drain > 0], ['會心', g => g.fx?.crit > 0], ['連擊', g => g.fx?.dbl > 0], ['觸發技能', g => g.fx?.proc?.length > 0], ['穿透', g => has(g.fx?.pierce)], ['有空孔', g => g.sock > (g.runes?.length || 0)], ['數值全滿', g => !!g.maxed]];
const GF_SORT = [['稀有度', (a, b) => (b.rarity || 0) - (a.rarity || 0) || (b.il || 0) - (a.il || 0)], ['需要等級', (a, b) => (b.lvReq || 0) - (a.lvReq || 0)], ['賣價', (a, b) => (b.price || 0) - (a.price || 0)], ['品質', (a, b) => (b.qual ?? -1) - (a.qual ?? -1)], ['名稱', (a, b) => (a.name || '').localeCompare(b.name || '', 'zh-Hant')]];
const newFilter = () => ({ rar: 0, kind: 0, who: 'all', tr: [], sort: 0 });
// ctx: { kind: false hides the kind row (one slot is already chosen), who: false hides the who-can-use row }
P.gearFilter = function (list, f, ctx = {}) {
  const S = this.S, R = GF_RAR[f.rar][1], K = ctx.kind === false ? null : GF_KIND[f.kind][1], T = f.tr.map(i => GF_TRAIT[i][1]);
  const who = ctx.who === false ? 'all' : f.who;
  return list.filter(g => { const G = GEAR[g]; if (!G) return false;
    if (R && !R(G)) return false; if (K && !K(G)) return false; if (T.some(t => !t(G))) return false;
    if (who === 'none') return !Object.keys(S.heroes).some(id => canEquip(id, g)); // by class only: a piece for later is not junk
    if (who !== 'all') return !!S.heroes[who] && canEquip(who, g);
    return true; }).sort((a, b) => GF_SORT[f.sort][1](GEAR[a], GEAR[b]));
};
P.filterSummary = function (f, ctx = {}) {
  const bits = [];
  if (f.rar) bits.push(GF_RAR[f.rar][0]); if (f.kind && ctx.kind !== false) bits.push(GF_KIND[f.kind][0]);
  if (ctx.who !== false && f.who !== 'all') bits.push(f.who === 'none' ? '沒人能用' : `${HEROES[f.who]?.name || '?'}能用`);
  for (const i of f.tr) bits.push(GF_TRAIT[i][0]);
  return (bits.length ? bits.join('・') : '全部') + (f.sort ? `　依${GF_SORT[f.sort][0]}` : '');
};
// the rows of chips: rarity, kind, who can use it, traits (several at once), sort order
P.filterRows = function (f, ctx = {}) {
  const S = this.S, rows = [['稀有度', GF_RAR.map(x => x[0]), 'rar']];
  if (ctx.kind !== false) rows.push(['種類', GF_KIND.map(x => x[0]), 'kind']);
  if (ctx.who !== false) { const ids = [...S.party, ...S.reserve].filter(id => S.heroes[id]); rows.push(['誰能用', ['全部', ...ids.map(id => HEROES[id].name), '沒人能用'], 'who', ['all', ...ids, 'none']]); }
  rows.push(['特性', GF_TRAIT.map(x => x[0]), 'tr'], ['排序', GF_SORT.map(x => x[0]), 'sort']);
  return rows;
};
const rowOn = (f, r, i) => r[2] === 'tr' ? f.tr.includes(i) : r[2] === 'who' ? f.who === r[3][i] : f[r[2]] === i;
const rowSet = (f, r, i) => { if (r[2] === 'tr') { const k = f.tr.indexOf(i); if (k >= 0) f.tr.splice(k, 1); else f.tr.push(i); } else if (r[2] === 'who') f.who = r[3][i]; else f[r[2]] = i; };
P.filterBarsHTML = function (f, ctx = {}, focus = -1, cur = -1) {
  return this.filterRows(f, ctx).map((r, ri) => `<div class="sl-bar${ri === focus ? ' foc' : ''}"><span class="sl-lab">${r[0]}</span>${r[1].map((n, i) => `<span class="sl-chip${rowOn(f, r, i) ? ' on' : ''}${ri === focus && i === cur ? ' cur' : ''}" data-fr="${ri}" data-fi="${i}">${n}</span>`).join('')}</div>`).join('');
};
P.wireFilterBars = function (wrap, f, ctx, after) {
  const rows = this.filterRows(f, ctx);
  wrap.querySelectorAll('[data-fr]').forEach(e => e.onclick = () => { rowSet(f, rows[+e.dataset.fr], +e.dataset.fi); this.G.audio.sfx('move'); after(); });
};
// a window of its own, for the lists built on the plain chooser; resolves when closed
P.filterPanel = function (f, ctx = {}, count) {
  const G = this.G;
  return new Promise((res) => {
    const wrap = document.createElement('div'); wrap.className = 'chooser wide sellwin'; this.layer.appendChild(wrap);
    let focus = 0; const curs = {};
    const curOf = (rows) => curs[focus] ?? Math.max(0, rows[focus][1].findIndex((n, i) => rowOn(f, rows[focus], i)));
    const build = () => {
      const rows = this.filterRows(f, ctx); focus = Math.min(focus, rows.length - 1);
      const n = count ? count() : null;
      wrap.innerHTML = `<div class="ch-box noanim"><div class="ch-title">篩選・排序${n != null ? `　<small>符合 ${n} 件</small>` : ''}</div>${this.filterBarsHTML(f, ctx, focus, curOf(rows))}
        <div class="sl-foot"><span class="sl-btn" data-a="reset">全部重設</span><span class="sl-sum"></span><span class="sl-btn go" data-a="done">確定</span></div>
        <div class="sl-help">↑↓ 選列　←→ 選項目　Z 選取・勾選特性　X 確定</div></div>`;
      this.wireFilterBars(wrap, f, ctx, build);
      wrap.querySelector('[data-a="reset"]').onclick = () => { Object.assign(f, newFilter()); G.audio.sfx('move'); build(); };
      wrap.querySelector('[data-a="done"]').onclick = close;
    };
    const close = () => { off(); wrap.remove(); G.audio.sfx('ok'); res(); };
    const off = G.input.on((k) => {
      const rows = this.filterRows(f, ctx), r = rows[focus], n = r[1].length, cur = curOf(rows);
      if (k === 'up' || k === 'down') { focus = (focus + (k === 'up' ? rows.length - 1 : 1)) % rows.length; G.audio.sfx('move'); build(); }
      if (k === 'left' || k === 'right') { const c = (cur + (k === 'left' ? n - 1 : 1)) % n; curs[focus] = c; if (r[2] !== 'tr') rowSet(f, r, c); G.audio.sfx('move'); build(); }
      if (k === 'ok') { rowSet(f, r, cur); G.audio.sfx('move'); build(); }
      if (k === 'cancel' || k === 'menu' || k === 'map') close();
    });
    build();
  });
};
// the row on top of a list built on the plain chooser
const FILTER_ROW = (ui, f, ctx, n, all) => ({ label: '🔍 篩選・排序', sub: `${ui.filterSummary(f, ctx)}　${n}/${all}` });
const FILTER_TIP = '<div class="dim">選這一列（或按 M）改變篩選和排序</div>';

// ---------------------------------------------------------------- the bag: every piece of equipment you carry
P.gearOwned = function () { return Object.keys(this.S.items).filter(g => this.S.items[g] > 0 && GEAR[g]).sort((a, b) => (GEAR[b].rarity || 0) - (GEAR[a].rarity || 0) || (GEAR[b].il || 0) - (GEAR[a].il || 0)); };
P.bagMenu = async function (o = {}) {
  const S = this.S, f = this.gf ||= newFilter(); let st = 1;
  for (;;) {
    const own = this.gearOwned();
    if (!own.length) { await this.info('<p>背包裡沒有裝備。</p>', '背包'); return; }
    const list = this.gearFilter(own, f);
    const i = await this.choose([FILTER_ROW(this, f, {}, list.length, own.length), ...list.map(g => ({ icon: null, label: col(GEAR[g]), sub: this.gearKind(GEAR[g]) }))], { title: `背包　${own.length} 件　<span class="gil">${S.gil} G</span>${o.sell ? '　<small>選一件賣掉</small>' : ''}`, start: st, onMap: true, info: (k) => k === 0 ? (list.length ? '' : '<p>沒有符合條件的裝備。</p>') + FILTER_TIP : this.gearHTML(list[k - 1]) + (o.sell ? `<div style="color:#ffe04a">賣價 ${sellPrice(GEAR[list[k - 1]])} G</div>` : '') + this.whoCanWear(list[k - 1]) });
    if (i < 0 && i !== -3) return;
    if (i <= 0) { await this.filterPanel(f, {}, () => this.gearFilter(this.gearOwned(), f).length); st = 1; continue; }
    st = Math.min(i, list.length - 1);
    const g = list[i - 1], G = GEAR[g];
    if (o.sell) { if (await this.yesno(`把 ${G.name} 以 ${sellPrice(G)} G 賣掉？`)) { S.gil += sellPrice(G); this.removeGear(g); this.G.audio.sfx('item'); } continue; }
    const acts = ['裝備給…', '丟掉'];
    const a = await this.choose(acts, { title: G.name, cls: 'small' });
    if (a === 0) {
      const who = [...S.party, ...S.reserve].filter(id => canEquip(id, g, S));
      if (!who.length) { const later = [...S.party, ...S.reserve].filter(id => canEquip(id, g)); this.toast(later.length ? `需要 Lv ${G.lvReq} 才能裝備（${later.map(id => HEROES[id].name).join('、')}）` : '隊伍裡沒有職業能裝備'); continue; }
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
P.whoCanWear = function (g) { const S = this.S, who = Object.keys(S.heroes).filter(id => canEquip(id, g)); return `<div class="dim">可以裝備：${who.map(id => HEROES[id].name + (canEquip(id, g, S) ? '' : `（Lv ${GEAR[g].lvReq} 才能裝）`)).join('、') || '—'}</div>`; };

// ---------------------------------------------------------------- the stash in the camp
P.stashMenu = async function () {
  const S = this.S; S.stash = S.stash || [];
  for (;;) {
    const i = await this.choose([{ label: '存進倉庫', sub: `背包 ${this.gearOwned().length} 件` }, { label: '從倉庫拿出', sub: `倉庫 ${S.stash.length}/120` }], { title: '倉庫', cls: 'small' });
    if (i < 0) return;
    if (i === 0) {
      let st = 0;
      const f = this.gf ||= newFilter(); st = 1;
      for (;;) { const own = this.gearOwned(); if (!own.length) break; if (S.stash.length >= 120) { this.toast('倉庫滿了'); break; }
        const list = this.gearFilter(own, f);
        const k = await this.choose([FILTER_ROW(this, f, {}, list.length, own.length), ...list.map(g => ({ label: col(GEAR[g]), sub: this.gearKind(GEAR[g]) }))], { title: `存進倉庫　${S.stash.length}/120`, start: st, onMap: true, info: (j) => j === 0 ? FILTER_TIP : this.gearHTML(list[j - 1]) + this.whoCanWear(list[j - 1]) });
        if (k < 0 && k !== -3) break; if (k <= 0) { await this.filterPanel(f, {}, () => this.gearFilter(this.gearOwned(), f).length); st = 1; continue; }
        st = Math.min(k, list.length - 1); const g = list[k - 1];
        S.items[g]--; if (S.items[g] <= 0) delete S.items[g]; S.stash.push(g); this.G.audio.sfx('item'); }
    } else {
      let st = 0;
      const f = this.gfStash ||= newFilter(); st = 1;
      for (;;) { const all = S.stash.filter(g => GEAR[g]); if (!all.length) break;
        const list = this.gearFilter(all, f);
        const k = await this.choose([FILTER_ROW(this, f, {}, list.length, all.length), ...list.map(g => ({ label: col(GEAR[g]), sub: this.gearKind(GEAR[g]) }))], { title: `從倉庫拿出　${all.length}/120`, start: st, onMap: true, info: (j) => j === 0 ? FILTER_TIP : this.gearHTML(list[j - 1]) + this.whoCanWear(list[j - 1]) });
        if (k < 0 && k !== -3) break; if (k <= 0) { await this.filterPanel(f, {}, () => this.gearFilter(S.stash.filter(g => GEAR[g]), f).length); st = 1; continue; }
        st = Math.min(k, list.length - 1); const g = list[k - 1];
        S.stash.splice(S.stash.indexOf(g), 1); addItem(S, g, 1); this.G.audio.sfx('item'); }
    }
  }
};

// ---------------------------------------------------------------- the merchant
const CONSUMABLES = ['potion', 'hipotion', 'i_hp3', 'i_hp4', 'ether', 'hiether', 'antidote', 'i_c_all', 'phoenix', 'i_rv2', 'i_tp'];
P.merchantMenu = async function () {
  const S = this.S, lv = Math.max(...Object.values(S.heroes).map(h => h.lv));
  if (!S.shop || S.shopLv !== lv || !S.shop.every(g => GEAR[g])) { for (const g of S.shop || []) if (!S.items[g] && !S.stash?.includes(g)) dropLoot(S, g); S.shop = shopStock(S, lv + 2); S.shopLv = lv; }
  for (;;) {
    const i = await this.choose(['買裝備', '買道具', { label: '賣裝備', sub: '過濾、勾選後一起賣' }, '賣掉所有普通與魔法裝備'], { title: `商人　<span class="gil">${S.gil} G</span>`, cls: 'small' });
    if (i < 0) return;
    if (i === 0) {
      let st = 0;
      for (;;) { let list = S.shop.filter(g => GEAR[g]); if (!list.length) { this.toast('賣完了'); break; }
        const fs = this.gfShop ||= newFilter(), all = list; list = this.gearFilter(all, fs);
        const k0 = await this.choose([FILTER_ROW(this, fs, {}, list.length, all.length), ...list.map(g => ({ label: col(GEAR[g]), sub: `${GEAR[g].price} G` }))], { title: `買裝備　<span class="gil">${S.gil} G</span>`, start: st, onMap: true, info: (j) => j === 0 ? FILTER_TIP : this.gearHTML(list[j - 1]) + this.whoCanWear(list[j - 1]) });
        if (k0 < 0 && k0 !== -3) break; if (k0 <= 0) { await this.filterPanel(fs, {}, () => this.gearFilter(all, fs).length); st = 1; continue; }
        const k = k0 - 1; st = k0;
        const g = list[k]; if (S.gil < GEAR[g].price) { this.G.audio.sfx('error'); this.toast('金幣不足'); continue; }
        S.gil -= GEAR[g].price; addItem(S, g, 1); S.shop = S.shop.filter(x => x !== g); this.G.audio.sfx('item'); }
    }
    if (i === 1) await this.shop(CONSUMABLES.filter(x => ITEMS[x]), '道具');
    if (i === 2) await this.sellMenu();
    if (i === 3) {
      const junk = this.gearOwned().filter(g => (GEAR[g].rarity ?? 0) <= 1 && !Object.values(S.heroes).some(h => Object.values(h.equip).includes(g)));
      if (!junk.length) { this.toast('沒有可以賣的普通或魔法裝備'); continue; }
      const total = junk.reduce((s, g) => s + sellPrice(GEAR[g]) * S.items[g], 0);
      if (await this.yesno(`賣掉 ${junk.length} 件普通與魔法裝備，共 ${total} G？`)) { for (const g of junk) { const n = S.items[g]; for (let j = 0; j < n; j++) this.removeGear(g); } S.gil += total; this.G.audio.sfx('item'); }
    }
  }
};

// ---------------------------------------------------------------- selling: filter the bag, tick what should go, sell it all at once
P.sellMenu = function () {
  const S = this.S, G = this.G, ui = this;
  const f = this.sellFilter ||= { ...newFilter(), rar: 1 };
  const picked = new Set(); let sel = 0, list = [];
  return new Promise((res) => {
    const wrap = document.createElement('div'); wrap.className = 'chooser wide sellwin'; this.layer.appendChild(wrap);
    const refresh = () => {
      list = this.gearFilter(this.gearOwned(), f);
      for (const g of [...picked]) if (!S.items[g]) picked.delete(g);
      sel = Math.max(0, Math.min(sel, list.length - 1));
    };
    const total = () => [...picked].reduce((s, g) => s + sellPrice(GEAR[g]) * (S.items[g] || 0), 0);
    const build = () => {
      refresh();
      const all = list.length && list.every(g => picked.has(g));
      wrap.innerHTML = `<div class="ch-box noanim"><div class="ch-title">賣裝備　<span class="gil">${S.gil} G</span></div>
        <details class="sl-more"${f.open ? ' open' : ''}><summary>🔍 篩選・排序：${this.filterSummary(f)}　<small>${list.length} 件</small></summary>${this.filterBarsHTML(f)}</details>
        <div class="ch-cols"><div class="ch-list">${list.length ? list.map((g, i) => `<div class="ch-it${i === sel ? ' sel' : ''}" data-i="${i}"><span class="sl-box${picked.has(g) ? ' on' : ''}">${picked.has(g) ? '✔' : ''}</span><span class="ch-l">${col(GEAR[g])}${S.items[g] > 1 ? ` ×${S.items[g]}` : ''}</span><span class="ch-s">${sellPrice(GEAR[g])} G</span></div>`).join('') : '<div class="dim" style="padding:12px">沒有符合的裝備</div>'}</div>
        <div class="ch-info">${list[sel] ? this.gearHTML(list[sel]) + `<div style="color:#ffe04a">賣價 ${sellPrice(GEAR[list[sel]])} G</div>` + this.whoCanWear(list[sel]) : ''}</div></div>
        <div class="sl-foot"><span class="sl-btn" data-a="all">${all ? '取消全選' : '全選目前列出的'}</span><span class="sl-btn" data-a="none">清除勾選</span><span class="sl-sum">已選 ${picked.size} 件　共 <b>${total()} G</b></span><span class="sl-btn go${picked.size ? '' : ' dis'}" data-a="sell">賣出</span><span class="sl-btn" data-a="back">離開</span></div>
        <div class="sl-help">↑↓ 移動　Z 勾選　←→ 換稀有度　R 篩選・排序　M 全選　C 賣出　X 離開</div></div>`;
      this.wireFilterBars(wrap, f, {}, () => { sel = 0; build(); });
      { const d = wrap.querySelector('.sl-more'); d.ontoggle = () => { f.open = d.open; }; }
      wrap.querySelectorAll('.ch-it').forEach(e => e.onclick = () => { const i = +e.dataset.i; sel = i; toggle(); });
      wrap.querySelectorAll('[data-a]').forEach(e => e.onclick = () => act(e.dataset.a));
      wrap.querySelector('.ch-it.sel')?.scrollIntoView({ block: 'nearest' });
    };
    const toggle = () => { const g = list[sel]; if (!g) return; if (picked.has(g)) picked.delete(g); else picked.add(g); G.audio.sfx('move'); build(); };
    let busy = false;
    const act = async (a) => {
      if (busy) return;
      if (a === 'all') { const all = list.length && list.every(g => picked.has(g)); for (const g of list) all ? picked.delete(g) : picked.add(g); G.audio.sfx('move'); build(); }
      if (a === 'none') { picked.clear(); G.audio.sfx('move'); build(); }
      if (a === 'back') { off(); wrap.remove(); G.audio.sfx('cancel'); res(); }
      if (a === 'sell') {
        if (!picked.size) { G.audio.sfx('error'); return; }
        const gs = [...picked], sum = total(), good = gs.filter(g => (GEAR[g].rarity ?? 0) >= 2).length;
        busy = true; wrap.style.visibility = 'hidden';
        const ok = await ui.yesno(`賣掉 ${gs.length} 件裝備，共 ${sum} G？${good ? `\n（其中 ${good} 件是稀有、套裝或暗金）` : ''}`);
        wrap.style.visibility = ''; busy = false;
        if (!ok) return;
        for (const g of gs) { const n = S.items[g] || 0; for (let j = 0; j < n; j++) ui.removeGear(g); }
        S.gil += sum; picked.clear(); G.audio.sfx('item'); ui.toast(`賣出 ${gs.length} 件，得到 ${sum} G`); build();
      }
    };
    const off = G.input.on((k) => {
      if (busy) return;
      if (k === 'up' && list.length) { sel = (sel + list.length - 1) % list.length; G.audio.sfx('move'); build(); }
      if (k === 'down' && list.length) { sel = (sel + 1) % list.length; G.audio.sfx('move'); build(); }
      if (k === 'left' || k === 'right') { f.rar = (f.rar + (k === 'left' ? GF_RAR.length - 1 : 1)) % GF_RAR.length; sel = 0; G.audio.sfx('move'); build(); }
      if (k === 'mount') { busy = true; wrap.style.visibility = 'hidden'; ui.filterPanel(f, {}, () => ui.gearFilter(ui.gearOwned(), f).length).then(() => { busy = false; wrap.style.visibility = ''; sel = 0; build(); }); }
      if (k === 'ok') toggle();
      if (k === 'map') act('all');
      if (k === 'menu') act('sell');
      if (k === 'cancel') act('back');
    });
    build();
  });
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
  const S = this.S;
  for (;;) {
    const n = Object.keys(S.heroes).length, cost = 200 + (S.heroes[S.lead]?.lv || 1) * 20, mercs = Object.keys(S.heroes).filter(id => !isLead(S, id));
    const i = await this.choose([{ label: '招募傭兵', sub: `${cost} G・從等級 1 開始` }, { label: '調整隊伍', sub: '最多 4 人出戰' }, { label: '解雇傭兵', sub: `${mercs.length} 人` }], { title: `傭兵隊長　<span class="gil">${S.gil} G</span>`, cls: 'small' });
    if (i < 0) return;
    if (i === 1) { await this.formationMenu(); continue; }
    if (i === 2) {
      if (!mercs.length) { this.toast('沒有可以解雇的傭兵'); continue; }
      const k = await this.choose(mercs.map(id => ({ label: HEROES[id].name, sub: `${CLASSES[id].name}・Lv ${S.heroes[id].lv}`, icon: portrait(id) })), { title: '解雇哪一位？（裝備會放回背包）' });
      if (k < 0) continue;
      const id = mercs[k], nm = HEROES[id].name;
      if (await this.yesno(`真的要讓 ${nm}（${CLASSES[id].name}）離開嗎？`)) { dismissHero(S, id); this.G.audio.sfx('cancel'); this.toast(`${nm} 離開了隊伍`); this.G.field?.setLeader?.(S.party[0]); }
      continue;
    }
    if (n >= MAX_HEROES) { this.toast(`最多 ${MAX_HEROES} 位夥伴，先解雇一位`); continue; }
    const c = await this.classSelect(`招募傭兵（${cost} G，從等級 1 開始，同一個職業可以招募好幾位）`);
    if (!c) continue;
    if (S.gil < cost) { this.G.audio.sfx('error'); this.toast('金幣不足'); continue; }
    S.gil -= cost; const id = hireHero(S, c); autoBuild(S, id);
    this.G.audio.sfx('levelup'); this.toast(`${HEROES[id].name}（${CLASSES[c].name}）加入了！${S.party.includes(id) ? '' : '（在待命名單）'}`);
  }
};
// spend a hired hero's points: two trees of real skills, stats by what the class lives on
export function autoBuild(S, id) {
  const AUTO = { barb: [0, 4], paladin: [1, 0], sorc: [0, 1], necro: [4, 0], ranger: [0, 1], assassin: [0, 2], druid: [0, 1], monk: [0, 5], bard: [3, 4], gunner: [0, 1] };
  const h = S.heroes[id], trees = (AUTO[clsOf(id)] || [0, 1]).map(i => TREES[id][i]);
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
// where to start in the Dead King's palace: the first floor, or just past any guardian already beaten
P.palaceMenu = async function () {
  const S = this.S, ck = S.palace?.ckpt || 1, starts = [1]; for (let f = 11; f <= ck; f += 10) starts.push(f);
  const i = await this.choose(starts.map(f => ({ label: `第 ${f} 層`, sub: f === 1 ? '從頭開始' : `第 ${f - 1} 層的守護者之後` })), { title: '死王宮殿　從哪一層開始？', cls: 'small' });
  return i < 0 ? null : starts[i];
};
P.waypointMenu = async function () {
  const S = this.S, d = S.diff || 0, rows = [{ label: '暮光營地', sub: '', to: 'town' }];
  if (S.portal && this.G.field.def.town && MAPS[S.portal.map]) rows.unshift({ label: '<span style="color:#8ab8ff">回到傳送門</span>', sub: MAPS[S.portal.map].name.split('　')[0], to: 'portal' });
  if (S.palace?.open && this.G.field.def.town) rows.push({ label: '<span style="color:#ff6a6a">死王宮殿</span>', sub: `最深 第${S.palace.best || 0}層`, to: 'palace' });
  ACTS.forEach((A, a) => WP_LEVELS.forEach(l => { if (S.wp[`d${d}a${a}l${l}`]) rows.push({ label: `${A.n.split('　')[1]}・${A.levels[l][0]}`, sub: `第${a + 1}幕`, to: mapId(a, l) }); }));
  const i = await this.choose(rows, { title: `傳送點　<span style="color:${DIFFS[d].c}">${DIFFS[d].n}</span>`, cls: 'small' });
  return i < 0 ? null : rows[i].to;
};
