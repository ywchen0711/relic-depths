// Crystal Echoes: wires the renderer, field, battles, menus, story and saving together.
import * as THREE from '../lib/three.module.min.js';
import { createRenderer, createPost } from './render.js?v=1';
import { Field, setHeroLook } from './field.js?v=1';
import { setDepth, setPaper, setPaperCam } from './voxel.js?v=1';
import { Battle } from './battle.js?v=1';
import { UI, fmtTime } from './ui.js?v=1';
import { Audio } from './audio.js?v=1';
import { Input } from './input.js?v=1';
import { makeStory, QUESTS } from './town.js?v=1';
import './menus.js?v=1';
import { autoBuild } from './menus.js?v=1';
import { restoreLoot, rollItem, dropLoot } from './loot.js?v=1';
import { genLevel, parseId, rollTroop, ACTS, WP_LEVELS, mapId, DIFFS, genPalace, parsePalace, palaceId } from './dungeon.js?v=1';
import { CLASSES } from './classes.js?v=1';
import { MAPS } from './maps.js?v=1';
import { AutoMap } from './automap.js?v=1';
import { Grind } from './grind.js?v=1';
import { HEROES, ITEMS, ENEMIES, GEAR, EXP_NEXT } from './data.js?v=1';
import { BESTIARY_NEW } from './content.js?v=1';
import { newState, addHero, addItem, itemName, healAll, heroStats, migrate, gearFx, paperLook } from './party.js?v=1';
import './beasts.js?v=1';

const SAVE_KEY = 'relic-depths-save-v1';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

class Game {
  constructor() {
    this.canvas = document.getElementById('view');
    this.renderer = createRenderer(this.canvas);
    this.S = newState();
    this.input = new Input();
    this.audio = new Audio();
    this.ui = new UI(this);
    this.field = new Field(this);
    this.battle = new Battle(this);
    this.post = createPost(this.renderer, this.field.scene, this.field.camera);
    this.story = makeStory(this);
    this.mode = 'title';
    this.frameWaiters = [];
    this.encMul = 1;
    this.last = performance.now();
    this.resize(); addEventListener('resize', () => this.resize());
    addEventListener('orientationchange', () => setTimeout(() => this.resize(), 300));
    window.visualViewport?.addEventListener('resize', () => this.resize());
    this.input.bindTouch(document.getElementById('touch'));
    document.body.classList.toggle('touchy', this.input.touchy);
    this.canvas.addEventListener('click', (e) => { if (this.tapHook) { const r = this.canvas.getBoundingClientRect(); this.tapHook(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); } });
    setHeroLook((id) => this.heroLook(id));
    this.automap = new AutoMap(this); this.MAPS = MAPS; this.grind = null;
    this.input.on((k) => this.fieldKey(k));
    // drag on the scene (mouse, or the right side of a touch screen) to turn the camera
    { let drag = null;
      this.canvas.addEventListener('pointerdown', (e) => { if (this.mode === 'field') drag = { id: e.pointerId, x: e.clientX }; });
      addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const dx = e.clientX - drag.x; drag.x = e.clientX; if (this.mode === 'field' && !this.menuOpen) this.field.yaw -= dx * 0.009; });
      const end = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
      addEventListener('pointerup', end); addEventListener('pointercancel', end); }
    addEventListener('pointerdown', () => this.audio.init(), { once: false });
    addEventListener('keydown', () => this.audio.init());
    requestAnimationFrame((t) => this.loop(t));
    window.CE = this; // handy for testing
  }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    const a = w / h;
    for (const c of [this.field.camera, this.battle.camera]) { c.aspect = a; c.fov = a < 1.2 ? 44 : 32; c.updateProjectionMatrix(); }
    // portrait screens: the field camera pulls back, the battle is seen from behind the party
    this.field.fit = a < 1 ? 1 + (1 - a) * 0.75 : 1;
    this.battle.portrait = a < 0.9; this.battle.fit = a < 0.9 ? Math.max(1, 0.62 / a) ** 0.55 : 1;
    document.body.classList.toggle('portrait', a < 0.9);
    this.post?.setSize(w, h);
  }
  frame() { return new Promise(r => this.frameWaiters.push(r)); }
  loop(now) {
    let dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    if (this.mode === 'battle') dt *= this.S.settings.speed || 1;
    this.input.poll();
    if (this.mode !== 'title') this.S.time += dt / (this.mode === 'battle' ? (this.S.settings.speed || 1) : 1);
    const ws = this.frameWaiters; this.frameWaiters = [];
    for (const w of ws) w(dt);
    if (this.mode === 'battle') {
      this.battle.update(dt);
      this.draw(this.battle.scene, this.battle.camera, this.battle.portrait ? 0.45 : 0.5, this.battle.portrait ? 0.3 : 0.2, this.battle.portrait ? 1.2 : 2.0);
    } else {
      const busy = this.busy || this.mode !== 'field' || this.menuOpen;
      if (this.grind && !busy && Math.hypot(this.input.axis.x, this.input.axis.y) > 0.3) this.grind.stop('你停止了自動練功');
      this.field.update(dt, busy ? { axis: { x: 0, y: 0 }, run: false } : this.grind ? this.grind.input(dt) : this.input);
      if (this.mode === 'title') this.titleCam(dt);
      this.draw(this.field.scene, this.field.camera, this.field.world ? 0.5 : 0.52, this.field.world ? 0.2 : 0.28, this.field.world ? 2.6 : 1.6);
    }
    requestAnimationFrame((t) => this.loop(t));
  }
  draw(scene, cam, focus, band, amount) {
    setPaperCam(cam);
    const q = this.S.settings.quality;
    if (q === 0) { cam.layers.enableAll(); this.renderer.render(scene, cam); return; }
    if (this.post.px.enabled) cam.layers.set(0); else cam.layers.enableAll();
    this.post.setScene(scene); this.post.setCamera(cam); this.post.tilt(focus, band, q === 2 ? amount : amount * 0.8);
    this.post.composer.render();
  }
  titleCam(dt) {
    this.tt = (this.tt || 0) + dt;
    const f = this.field, c = f.camera;
    const x = 17 + Math.sin(this.tt * 0.08) * 6, z = 16 + Math.cos(this.tt * 0.06) * 3;
    f.cam.x = x; f.cam.z = z;
    c.position.set(x + 4, 9, z + 11); c.lookAt(x, 0.5, z);
    f.player.root.visible = false;
  }

  // ---------------------------------------------------------------- state helpers
  cond(str) {
    if (!str) return true;
    return str.split('&').every(tok => {
      let neg = false; if (tok[0] === '!') { neg = true; tok = tok.slice(1); }
      let v;
      const ch = /^ch(\d)$/.exec(tok), q = /^(q_\w+?)_(taken|done|ready)$/.exec(tok);
      if (ch) v = this.S.chapter >= +ch[1];
      else if (q) { const s = this.S.quests[q[1]]; v = q[2] === 'taken' ? !!s : s === q[2]; }
      else if (tok === 'pboss') v = !!this.field.def?.bossDone; // a palace guardian beaten
      else v = !!this.S.flags[tok];
      return neg ? !v : v;
    });
  }
  quests() { return QUESTS; }
  leaderLook() { return this.S.party[0] || 'aren'; }
  nightFor(id) { return id === 'port' && this.S.flags.port_night; }
  mapName() { return this.field.def?.name || ''; }
  npcBubble(def) { return this.story.bubble(def); }
  moguActive(id) { return this.S.quests.q_mogu === 'taken' && !this.S.mogu.includes(id); }
  updateObjective() { this.ui.objective(this.story.objectiveText()); }
  canSave() { return true; }
  nearSave() { const p = this.field.player; return this.field.built.interact.some(it => it.kind === 'save' && Math.hypot(it.c.i + 0.5 - p.x, it.c.j + 0.5 - p.z) < 2.2); }
  applySettings() {
    const st = this.S.settings;
    this.audio.setVol(st.music, st.sfx);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, st.quality === 2 ? 2 : st.quality === 1 ? 1.5 : 1));
    this.renderer.shadowMap.enabled = st.quality > 0;
    this.encMul = st.enc || 1;
    this.resize();
    this.post.setPixelStyle(st.pixel ?? 0);
    document.body.classList.toggle('nominimap', st.minimap === false);
    const dv = st.depth ?? 0; setDepth(dv || 0.6); setPaper(dv === 0); this.post.setPaper(dv === 0);
    // switching between paper dolls and voxel people rebuilds the people already standing about
    if (this._paper !== undefined && this._paper !== (dv === 0)) this.field?.remodel?.();
    this._paper = dv === 0;
  }

  // ---------------------------------------------------------------- field input
  async fieldKey(k) {
    if (this.mode !== 'field' || this.busy || this.field.locked || this.menuOpen) return;
    if (this.grind) { if (['ok', 'cancel', 'menu', 'map'].includes(k)) this.grind.stop('你停止了自動練功'); return; }
    if (k === 'ok') return this.interact();
    if (k === 'map') return this.openMap();
    if (k === 'menu') { this.menuOpen = true; const act = await this.ui.mainMenu(); this.menuOpen = false; if (act === 'map') return this.openMap(); if (act === 'grind') return this.startGrind(); return; }
    if (k === 'mount') return this.toggleMount();
  }
  // the full map; from the world map or a town you can jump to any town you have been to
  async openMap() {
    if (this.mode !== 'field' || this.busy) return;
    this.menuOpen = true; let t = null;
    try { t = await this.automap.openFull(); } finally { this.menuOpen = false; }
    if (t) { this.audio.sfx('flee'); await this.warp(t.to[0], t.to[1], t.to[2], t.to[3] || 'up'); this.S.lastWorld = { x: t.spot.x, z: t.spot.z + 1 }; }
  }
  async startGrind() {
    const f = this.field;
    if (!f.encTable() || f.def.town || f.def.interior) { this.ui.toast('這裡不會遇到怪物。到城外的原野或迷宮裡再開始吧'); return; }
    this.menuOpen = true; let cfg = null;
    try { cfg = await this.ui.grindMenu(); } finally { this.menuOpen = false; }
    if (!cfg) return;
    this.grind = new Grind(this, cfg); this.ui.toast('開始自動練功！點上方的橫幅或按方向鍵就會停止');
  }
  async toggleMount() {
    const f = this.field;
    if (!f.world) { this.ui.toast('只能在大地圖上騎乘'); return; }
    const opts = [null]; if (this.S.flags.bird) opts.push('bird'); if (this.S.flags.airship_built) opts.push('airship');
    if (opts.length === 1) { this.ui.toast('還沒有坐騎'); return; }
    const next = opts[(opts.indexOf(f.mount) + 1) % opts.length];
    if (f.mount && !f.canLand()) { this.ui.toast('這裡無法降落'); return; }
    f.setMount(next); this.S.mount = next;
    this.audio.sfx(next ? 'jump' : 'step');
    this.ui.toast(next === 'bird' ? '騎上了機械鳥「啾比」' : next === 'airship' ? '搭上了飛空艇「晨星號」' : '下來了');
    if (!next) f.onEnterCell();
  }
  async interact() {
    const f = this.field;
    if (f.mount === 'airship') { if (f.canLand()) { f.setMount(null); this.S.mount = null; this.ui.toast('降落了'); const c = f.map.at(Math.floor(f.player.x), Math.floor(f.player.z)); if (c.spot) await this.onSpot(c.spot); } else this.ui.toast('這裡無法降落'); return; }
    const it = f.facing(); if (!it) return;
    this.busy = true;
    try {
      if (it.kind === 'npc') {
        const n = it.npc; const prevDir = n.dir; n.talking = true; f.face(n, f.player);
        const d = n.def;
        if (d.inn) await this.story.TALK[d.id]?.();
        else if (this.story.TALK[d.id]) await this.story.TALK[d.id]();
        else await this.ui.say('', '……', d.look);
        n.talking = false; if (!d.wander) { n.dir = prevDir; n.ang = null; f.syncWalker(n); }
        f.refreshBubbles();
      } else if (it.kind === 'chest') {
        const nm = it.name || '寶箱';
        if (it.open) { await this.ui.say('', `${nm}裡什麼也沒有了。`, null); }
        else if (it.cond && !this.cond(it.cond)) { await this.ui.say('', '寶箱打不開……', null); }
        else {
          it.open = true; this.S.chests.push(it.id); this.audio.sfx('chest');
          let t = 0; while (t < 0.3) { t += await this.frame(); const p = Math.min(1, t / 0.3); if (it.anim) it.anim(p); else it.lidP.rotation.x = -1.9 * p; }
          const o = MAPS[f.mapId].objs.find(o => o.id === it.id);
          const item = o?.item;
          if (o?.minor) { // the small things lying about: some gold, a potion, now and then a piece of gear
            const lv = o.loot, mf = Math.max(0, ...this.S.party.map(id => gearFx(this.S, id).mf || 0)), got = [];
            const gold = Math.random() < 0.75 ? Math.round(lv * (2 + Math.random() * 5)) : 0; this.S.gil += gold;
            if (Math.random() < 0.3) { const p = lv < 25 ? 'potion' : Math.random() < 0.15 ? 'xpotion' : 'hipotion'; addItem(this.S, p, 1); got.push(itemName(p)); }
            if (Math.random() < 0.06) { addItem(this.S, 'i_tp', 1); got.push(itemName('i_tp')); }
            if (Math.random() < 0.2) { const g = rollItem(this.S, lv, { mf, quality: f.def.lootQ || 1 }); addItem(this.S, g, 1); got.push(`<span style="color:${GEAR[g].rarColor}">${GEAR[g].name}</span>`); }
            if (!gold && !got.length) this.ui.toast(`${nm}裡什麼也沒有`);
            else this.ui.toast(`${nm}：${[gold ? `${gold} G` : '', ...got].filter(Boolean).join('、')}`);
          }
          else if (o?.loot) { const n = 1 + (Math.random() < 0.4 ? 1 : 0), got = []; const mf = Math.max(0, ...this.S.party.map(id => gearFx(this.S, id).mf || 0)); for (let i = 0; i < n; i++) { const g = rollItem(this.S, o.loot, { mf, quality: 1.6 * (f.def.lootQ || 1) }); addItem(this.S, g, 1); got.push(g); } const gold = Math.round(o.loot * (8 + Math.random() * 12)); this.S.gil += gold; await this.ui.say('', `找到了 ${gold} G 和：\n${got.map(g => `<span style="color:${GEAR[g].rarColor}">${GEAR[g].name}</span>`).join('\n')}`, null); }
          if (o?.gil) { this.S.gil += o.gil; await this.ui.say('', `找到了 ${o.gil} G！`, null); }
          if (item) { addItem(this.S, item, 1); await this.ui.say('', `找到了 ${itemName(item)}！`, null); }
          if (item === 'k_necklace' && this.S.quests.q_necklace === 'taken') this.ui.toast('找到了莉莉的項鍊！回港口交給她吧');
        }
      } else if (it.kind === 'board') await this.story.board(it.id);
      else if (it.kind === 'sign') { if (it.id && this.story.SIGNS?.[it.id]) await this.story.SIGNS[it.id](); else await this.ui.say('', it.text || '……', null); }
      else if (it.kind === 'save') {
        this.audio.sfx('save'); this.unlockHere(); this.save();
        const to = await this.ui.waypointMenu();
        if (to === 'portal') { const P = this.S.portal; this.busy = false; await this.warp(P.map, P.x, P.z, 'down', { portal: true }); }
        else if (to === 'palace') { const fl = await this.ui.palaceMenu(); if (fl) { this.busy = false; await this.travel(palaceId(fl)); } }
        else if (to && to !== this.field.mapId) { this.busy = false; await this.travel(to); }
      } else if (it.kind === 'tablet') {
        this.S.tablets.push(it.id); it.sprite.visible = false; f.built.interact = f.built.interact.filter(x => x !== it);
        addItem(this.S, 'tablet', 1); this.audio.sfx('item'); await this.ui.say('', `撿到了石板碎片！（${this.S.tablets.length}/12）`, null);
      } else if (it.kind === 'mogu') {
        this.S.mogu.push(it.id); it.spr.mesh.visible = false; f.built.interact = f.built.interact.filter(x => x !== it);
        this.audio.sfx('mogu'); await this.ui.say('咪咕', `咪咕～！（抓到了！ ${this.S.mogu.length}/5）`, null);
        f.refreshBubbles();
      }
    } finally { this.busy = false; this.ui.hud(); }
  }

  // ---------------------------------------------------------------- moving between places
  // dungeon levels are laid out when you enter them; going out from the camp starts a fresh expedition
  clearDungeons() { const dun = (k) => parseId(k) || parsePalace(k); for (const k of Object.keys(MAPS)) if (dun(k)) delete MAPS[k]; this.S.seeds = {}; this.S.chests = (this.S.chests || []).filter(id => !/^(d\d_\d|p\d+)_/.test(id)); for (const k of Object.keys(this.S.explored || {})) if (dun(k)) delete this.S.explored[k]; }
  ensureMap(to) {
    const pf = parsePalace(to); if (pf) { if (!MAPS[to]) { const def = genPalace(this.S, pf, this.S.seeds?.[to]); this.S.seeds = this.S.seeds || {}; this.S.seeds[to] = def.seed; } return; }
    const p = parseId(to); if (!p) return;
    if (!MAPS[to]) { const seed = this.S.seeds?.[to]; const def = genLevel(this.S, p.act, p.lvl, seed); this.S.seeds = this.S.seeds || {}; this.S.seeds[to] = def.seed; }
  }
  unlockHere() { const p = parseId(this.field.mapId); if (p && WP_LEVELS.includes(p.lvl)) { const k = `d${this.S.diff || 0}a${p.act}l${p.lvl}`; if (!this.S.wp[k]) { this.S.wp[k] = 1; this.ui.toast('傳送點已啟動'); } } }
  async travel(to) { if (to === 'town') return this.warp('town', 15, 18, 'down'); if (this.field.def.town) this.clearDungeons(); return this.warp(to, -1, -1, 'up'); }
  async warp(to, x, z, dir = 'down', o = {}) {
    if (o.cond && !this.cond(o.cond)) return;
    this.busy = true;
    if (!o.quiet) { if (o.door) this.audio.sfx('door'); await this.ui.fade(1, 300); }
    if (this.field.def?.town && (parseId(to) || parsePalace(to)) && !o.portal) this.clearDungeons();
    if (o.portal) this.S.portal = null;
    // the palace: remember how deep you have been, and what you carried when you went down (see palaceDeath)
    const pf = parsePalace(to);
    if (pf) { this.S.palace = { open: 1, best: 0, ...(this.S.palace || {}) }; this.S.palace.best = Math.max(this.S.palace.best, pf); if (!this.S.prun) this.S.prun = { before: this.owned() }; }
    if (to === 'town') this.S.prun = null; // back on the surface: everything found is safe
    this.ensureMap(to);
    if (x === -1) [x, z, dir] = MAPS[to].spawn; else if (x === -2) [x, z, dir] = MAPS[to].exitSpawn;
    if (to === 'town') this.placePortal();
    const mount = null;
    this.field.load(to, x, z, dir, { mount });
    this.field.player.root.visible = true;
    this.audio.music(this.field.def.bgm || this.field.theme.bgm);
    this.S.map = to; this.S.x = x; this.S.z = z; this.S.dir = dir; this.S.mount = mount;
    this.ui.hud(); this.updateObjective();
    if (!o.quiet) await this.ui.fade(0, 300);
    this.busy = false;
    this.autosave();
    this.ui.areaName(this.field.def.name);
    const p = parseId(to); if (p && p.lvl === 0) this.unlockHere();
  }
  async onLockedWarp(o) {
    this.busy = true;
    if (o.to === 'lighthouse') await this.ui.say('希爾薇', '燈塔要等神官大人的許可才能進去。', 'sylvie');
    else if (!o.lockMsg) await this.ui.say('', '門鎖著。', null);
    if (o.lockMsg) await this.ui.say('', o.lockMsg, null);
    const p = this.field.player; p.z += o.push ?? -0.6; this.field.syncWalker(p);
    this.busy = false;
  }
  async onSpot(s) {
    if (this.busy) return;
    this.busy = true;
    try {
      if (s.event) { await this.story.SPOT_EVENTS[s.event](); return; }
      if (s.cond && !this.cond(s.cond)) {
        const why = { ch2: '鐵砧城的城門緊閉著。（先追擊薩倫，前往低語森林吧）', mine_open: '礦坑被一陣怪風封住了。先去鐵砧城問問吧。', ch3: '大橋的另一頭是水都蒼瀾。（現在還不是時候）', temple_open: '堤道的水門關著。去水都蒼瀾問問吧。', ch4: '那座浮空遺跡，只有飛空艇才到得了。' }[s.cond] || '現在還進不去。';
        await this.ui.say('', why, null); return;
      }
      if (s.to) { this.busy = false; await this.warp(s.to[0], s.to[1], s.to[2], s.to[3] || 'up'); }
    } finally { this.busy = false; }
  }
  async runEvent(id, o) {
    const fn = this.story.EV[id]; if (!fn) return;
    this.busy = true;
    try { await fn(o); } finally { this.busy = false; this.ui.hud(); this.field.refreshBubbles(); }
  }

  // ---------------------------------------------------------------- battles
  bgFor() {
    const th = this.field.def.theme, f = this.field;
    if (f.def.bg || f.def.hab) return f.def.bg || f.def.hab;
    if (th === 'field') { const c = f.map.at(Math.floor(f.player.x), Math.floor(f.player.z)); if (c && c.kind === 'snow') return 'snow'; if (c && (c.ch === ':' || f.player.x > 47)) return 'coast'; if (f.player.x > 29 && f.player.z < 30) return 'mountain'; return 'field'; }
    return { port: 'town', anvil: 'town', azurelle: 'town', forest: 'forest', mountain: 'mountain', mine: 'cave', temple: 'temple', sky: 'sky', skyDark: 'void', coast: 'coast', interior: 'town', sanctum: 'temple' }[th] || 'field';
  }
  async randomBattle(enc) {
    if (this.busy || this.mode !== 'field') return;
    const T = rollTroop(this.S, this.field.def);
    if (T.kind === 'unique') this.ui.toast(`<span style="color:#e8b040">獨特怪物出現了！</span>`);
    const res = await this.fight({ troop: T.troop, mods: T.mods, bg: this.bgFor(), preemptive: Math.random() < 0.1, random: true, pw: this.field.def.pw, lootQ: this.field.def.lootQ });
    if (this.grind) await this.grind.afterBattle(res, this.battle.lastSpoils);
    return res;
  }
  // pick monsters from the big bestiary that live on this kind of ground and fit the area's level
  wildTroop(enc) {
    const bg = this.bgFor(), post = this.S.flags.cleared;
    const lv = post ? Math.max(enc.lv, 28 + Math.floor(Math.random() * 24)) : enc.lv;
    const near = (E, span) => Math.abs(E.lv - lv) <= span;
    const metal = BESTIARY_NEW.filter(id => ENEMIES[id].metal && ENEMIES[id].lv <= lv + 12 && ENEMIES[id].hab.includes(bg));
    if (metal.length && Math.random() < 0.035) { const m = metal[Math.random() * metal.length | 0]; return Math.random() < 0.3 ? [m, m] : [m]; }
    if (Math.random() > (post ? 0.85 : 0.55)) return null;
    let pool = BESTIARY_NEW.filter(id => { const E = ENEMIES[id]; return !E.metal && E.hab.includes(bg) && near(E, Math.max(3, lv * 0.22)); });
    if (pool.length < 2) pool = BESTIARY_NEW.filter(id => !ENEMIES[id].metal && near(ENEMIES[id], Math.max(4, lv * 0.3)) && ENEMIES[id].hab.includes(bg));
    if (!pool.length) return null;
    const out = []; let room = 4;
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) { const id = pool[Math.random() * pool.length | 0], size = ENEMIES[id].scale >= 1.3 || ENEMIES[id].kind === 'dragon' ? 3 : ['beast', 'ogre', 'hydra', 'octopus', 'golem', 'worm', 'mech'].includes(ENEMIES[id].kind) ? 2 : 1; if (size > room) break; out.push(id); room -= size; }
    return out.length ? out : null;
  }
  async fight(opts) {
    const wasBusy = this.busy; this.busy = true;
    const snapshot = JSON.stringify(this.S);
    this.audio.sfx('encounter');
    await this.transition();
    this.mode = 'battle';
    await this.ui.fade(0, 200);
    document.body.classList.add('inbattle');
    let res;
    for (;;) {
      try { res = await this.battle.run(opts); } catch (e) { // never leave the player stuck on a black screen
        console.error(e); this.battle.active = false; this.ui.toast('戰鬥發生錯誤，已提前結束', 3000);
        try { this.battle.ui?.hide(); this.battle.clearUnits(); } catch (e2) { console.error(e2); }
        res = opts.random ? 'flee' : 'win';
      }
      if (res !== 'lose') break;
      const palace = !!parsePalace(this.field.mapId);
      const choice = await this.gameOver(!!opts.random, palace);
      if (choice === 'retry') { const s = JSON.parse(snapshot); Object.assign(this.S, s); continue; }
      await this.ui.fade(1, 400); document.body.classList.remove('inbattle');
      this.mode = 'field';
      // fallen: wake up in the camp, a tenth of the gold gone (in the palace much more: see palaceDeath)
      const P = palace ? this.palaceDeath() : null;
      const lost = P ? P.gold : Math.floor(this.S.gil * 0.1); if (!P) this.S.gil -= lost;
      healAll(this.S); await this.warp('town', 15, 18, 'down', { quiet: true }); await this.ui.fade(0, 400); this.busy = wasBusy;
      if (P) await this.ui.say('', `你倒在了死王宮殿……\n在營地醒來，失去了 ${lost} G 和經驗值。${P.items.length ? `\n\n宮殿裡拿到的東西掉了一半（${P.items.length} 件）：\n${P.items.slice(0, 12).join('、')}${P.items.length > 12 ? ' 等' : ''}` : ''}`, null);
      else this.ui.toast(`全隊倒下了……在營地醒來，掉了 ${lost} G`, 4000);
      return 'lose';
    }
    await this.ui.fade(1, 250);
    document.body.classList.remove('inbattle');
    this.mode = 'field';
    this.audio.music(this.field.def.bgm || this.field.theme.bgm);
    this.renderer.toneMappingExposure = this.field.exposure || 1;
    this.ui.hud();
    await this.ui.fade(0, 250);
    this.busy = wasBusy;
    return res;
  }
  async transition() {
    const e = document.getElementById('swirl'); e.classList.remove('go'); void e.offsetWidth; e.classList.add('go');
    this.post.grade.uniforms.flash.value = 0.8;
    await wait(450); await this.ui.fade(1, 150); e.classList.remove('go');
  }
  // everything the party owns, bag and worn, as counts
  owned() { const o = { ...this.S.items }; for (const h of Object.values(this.S.heroes)) for (const g of Object.values(h.equip || {})) if (g) o[g] = (o[g] || 0) + 1; return o; }
  // dying in the palace: 30% of the gold, 15% of a level's experience for everyone, and a random half of what was found down there
  palaceDeath() {
    const S = this.S, gold = Math.floor(S.gil * 0.3); S.gil -= gold;
    for (const h of Object.values(S.heroes)) h.exp = Math.max(0, h.exp - Math.round(EXP_NEXT(h.lv) * 0.15));
    const before = S.prun?.before || {}, gained = [];
    for (const [k, n] of Object.entries(this.owned())) for (let i = 0; i < n - (before[k] || 0); i++) gained.push(k);
    for (let i = gained.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [gained[i], gained[j]] = [gained[j], gained[i]]; }
    const lose = gained.slice(0, Math.ceil(gained.length / 2)), names = [];
    for (const k of lose) {
      names.push(GEAR[k] ? `<span style="color:${GEAR[k].rarColor || '#fff'}">${GEAR[k].name}</span>` : itemName(k));
      if (S.items[k] > 0) { S.items[k]--; if (!S.items[k]) delete S.items[k]; }
      else for (const h of Object.values(S.heroes)) { const sl = Object.keys(h.equip || {}).find(x => h.equip[x] === k); if (sl) { h.equip[sl] = null; break; } }
      if (S.loot?.[k] && !this.owned()[k]) dropLoot(S, k);
    }
    S.prun = null;
    return { gold, items: names };
  }
  gameOver(random, palace) {
    return new Promise((res) => {
      this.audio.music(null);
      const box = document.getElementById('gameover'); box.classList.add('on');
      box.innerHTML = palace ? `<h2>全滅了……</h2><p>死王宮殿不給第二次機會。</p><div class="go-btns"><button data-v="load">回到營地（失去 30% 金幣、經驗值，以及這次在宮殿拿到的一半東西）</button></div>`
        : `<h2>全滅了……</h2><p>深淵吞沒了你們。</p><div class="go-btns"><button data-v="retry">重新挑戰這場戰鬥</button><button data-v="load">回到營地（失去10%金幣）</button></div>`;
      const pick = (v) => { box.classList.remove('on'); off(); res(v); };
      box.querySelectorAll('button').forEach(b => b.onclick = () => pick(b.dataset.v));
      let sel = 0; const btns = [...box.querySelectorAll('button')]; btns[0].classList.add('sel');
      const off = this.input.on((k) => { if (k === 'up' || k === 'down') { btns[sel].classList.remove('sel'); sel = (sel + 1) % btns.length; btns[sel].classList.add('sel'); } if (k === 'ok') pick(btns[sel].dataset.v); });
    });
  }

  // ---------------------------------------------------------------- saving
  save() { try { this.S.map = this.field.mapId; this.S.x = Math.floor(this.field.player.x); this.S.z = Math.floor(this.field.player.z); this.S.dir = this.field.player.dir; this.S.mount = this.field.mount; localStorage.setItem(SAVE_KEY, JSON.stringify(this.S)); return true; } catch (e) { return false; } }
  autosave() { try { this.save(); } catch (e) { } }
  // a town portal: back to the camp, and a glowing way back to where you were
  placePortal() {
    const T = MAPS.town; T.objs = T.objs.filter(o => !o.portal);
    const P = this.S.portal; if (!P) return;
    this.ensureMap(P.map); if (!MAPS[P.map]) return; // after loading a save the level is laid out again from its seed
    const name = MAPS[P.map].name.split('　')[0];
    // a glowing ring on the ground: step on it to go back (the waypoint crystal offers the same)
    T.objs.push({ k: 'gate', x: 20, z: 20, w: 3, color: '#4a8aff', label: `▲ 傳送門：${name}`, back: true, portal: true }, { k: 'warp', x: 20, z: 20, w: 3, d: 1, to: P.map, tx: P.x, tz: P.z, dir: 'down', portal: true, label: name });
  }
  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  partyFx(id) { return gearFx(this.S, id); }
  heroLook(id) { return this.S?.heroes?.[id] ? paperLook(this.S, id) : null; }
  loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
      const s = JSON.parse(raw); this.S = Object.assign(newState(), s); this.S.settings = Object.assign(newState().settings, s.settings || {}); migrate(this.S);
      restoreLoot(this.S);
      this.applySettings();
      this.clearDungeons(); this.S.seeds = s.seeds || {};
      if (this.S.cleared?.['2_4'] && !this.S.palace?.open) this.S.palace = { best: 0, ...(this.S.palace || {}), open: 1 }; // hell beaten before the palace existed
      if (!MAPS[this.S.map] && !parseId(this.S.map) && !parsePalace(this.S.map)) this.S.map = 'town';
      this.ensureMap(this.S.map); if (this.S.map === 'town') this.placePortal();
      this.field.load(this.S.map, this.S.x, this.S.z, this.S.dir, { mount: null });
      this.field.player.root.visible = true;
      this.audio.music(this.field.def.bgm || this.field.theme.bgm);
      this.mode = 'field'; this.ui.hud(); this.updateObjective();
      return true;
    } catch (e) { console.error(e); return false; }
  }

  // ---------------------------------------------------------------- title and ending
  async title() {
    this.mode = 'title';
    this.field.load('town', 15, 14, 'up');
    document.body.classList.add('attitle');
    const box = document.getElementById('title');
    box.classList.add('on');
    this.audio.music('title');
    this.ui.fade(0, 1200);
    const has = this.hasSave();
    box.querySelector('.tt-menu').innerHTML = `${has ? '<button data-v="cont">繼續遊戲</button>' : ''}<button data-v="new">新的旅程</button>`;
    const btns = [...box.querySelectorAll('button')]; let sel = 0; btns[0].classList.add('sel');
    const v = await new Promise((res) => {
      btns.forEach((b, i) => b.onclick = () => { this.audio.init(); res(b.dataset.v); });
      const off = this.input.on((k) => { this.audio.init(); if (k === 'up' || k === 'down') { btns[sel].classList.remove('sel'); sel = (sel + 1) % btns.length; btns[sel].classList.add('sel'); this.audio.sfx('move'); } if (k === 'ok') { off(); res(btns[sel].dataset.v); } });
      this.titleOff = off;
    });
    this.titleOff?.(); this.audio.init(); this.audio.sfx('ok');
    box.classList.remove('on'); document.body.classList.remove('attitle');
    await this.ui.fade(1, 500);
    if (v === 'cont' && this.loadSave()) { await this.ui.fade(0, 500); return; }
    // new game: pick a class
    this.S = newState(); this.S.pace = 2;
    await this.ui.fade(0, 300);
    let cls = null; while (!cls) cls = await this.ui.classSelect('選擇你的職業（主角比傭兵更強；之後可以在營地招募傭兵）');
    await this.ui.fade(1, 300);
    addHero(this.S, cls, 1); this.S.lead = cls; autoBuild(this.S, cls);
    this.applySettings();
    this.field.load('town', 15, 18, 'down');
    this.field.player.root.visible = true;
    this.mode = 'field'; this.ui.hud();
    await this.ui.fade(0, 500);
    await this.ui.say('長老 馬庫斯', `歡迎來到暮光營地，年輕的${CLASSES[cls].name}。\n深淵在南方張開了大口，魔物帶著古代的寶物四處遊蕩。\n往南走就是第一幕「腐朽荒野」。\n\n營地裡可以買賣裝備、賭博、招募其他職業的夥伴。\n按選單可以分配技能點數和屬性點數。`, 'oldman');
    this.save();
  }
  async ending() {
    this.audio.music('ending');
    await this.ui.fade(1, 1200);
    const box = document.getElementById('ending'); box.classList.add('on');
    const lines = [
      ['', '「緘默」消失了。'], ['', '浮空遺跡慢慢沉進了雲海，大陸上的水晶重新亮了起來。'],
      ['艾倫', '歐勒斯……我們會記得你。'], ['', '那天之後，海潮神殿的牆上多了一幅新的壁畫。'],
      ['', '畫裡是七位英雄。其中一位拿著盾牌，站在最後面，溫柔地笑著。'],
      ['米菈', '被記得的人，就不算真的離開——\n聖女瑟菈說的，一點也沒錯呢。'],
      ['塔洛', '我決定了。去魔法學院之前，先把這趟旅行寫成一本書。'],
      ['蕾娜', '晨星號還能飛得更遠！下次去海的另一邊看看吧！'],
      ['希爾薇', '……艾倫。你成了一個很好的騎士。'],
      ['', '水晶迴響 Crystal Echoes\n\n—— 完 ——'],
      ['', '感謝遊玩！\n通關後可以挑戰：蒼瀾競技場「傳說級」、四處「封印之地」、還沒去過的光之祠堂。'],
    ];
    for (const [who, t] of lines) {
      box.innerHTML = `<div class="end-line">${who ? `<small>${who}</small>` : ''}${t.replace(/\n/g, '<br>')}</div>`;
      await wait(400);
      await new Promise((res) => { const off = this.input.on((k) => { if (k === 'ok') { off(); res(); } }); box.onclick = () => { off(); res(); }; setTimeout(() => { off(); res(); }, 6000); });
    }
    box.classList.remove('on');
    healAll(this.S); this.S.chapter = 5;
    await this.warp('world', 9, 34, 'right', { quiet: true });
    await this.ui.fade(0, 1000);
    this.save(); this.ui.toast('已自動存檔。之後可以繼續探索！', 4000);
  }
}

const game = new Game();
game.title();
