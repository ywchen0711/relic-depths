// The people of the camp and the act bosses. Same shape as Crystal Echoes' story module (TALK, EV, board...),
// but there is no script to follow: the goal is always the next act's boss, and better loot.
import { HEROES, ENEMIES } from './data.js?v=1';
import { healAll, addItem } from './party.js?v=1';
import { ACTS, DIFFS, areaLevel, mapId, palaceBoss, PALACE_N } from './dungeon.js?v=1';
import { rollItem } from './loot.js?v=1';

export const QUESTS = {};
export function makeStory(G) {
  const S = () => G.S, ui = () => G.ui;
  const say = (who, text, look) => G.ui.say(who, text, look);
  const nextBoss = () => { const s = S(); for (let a = 0; a < ACTS.length; a++) if (!s.cleared[`${s.diff}_${a}`]) return a; return -1; };
  const TALK = {
    async merchant() { await say('商人 歐德', '要買點什麼？裝備每次你變強就會換一批新貨。', 'merchant'); await G.ui.merchantMenu(); },
    async healer() { healAll(S()); for (const r of S().minions || []) r.hp = r.st.hp; G.audio.sfx('heal'); G.ui.hud(); await say('治療師 艾菈', '傷都治好了。\n去吧，願光照亮你的路。', 'priest'); },
    async recruiter() { await say('傭兵隊長 葛倫', '十種職業的冒險者都在這個營地裡。\n付錢，他們就跟你走。', 'guard'); await G.ui.hireMenu(); },
    async smith() { await say('鐵匠 布洛克', '強化、鑲寶石、打孔、鑲符文，還有神裝覺醒。\n把東西拿來吧。', 'smith'); await G.ui.smith(9); },
    async gambler() { await say('賭徒 薇拉', '想試試手氣嗎？\n袋子裡是什麼，連我都不知道。', 'lady'); await G.ui.gambleMenu(); },
    async elder() {
      const s = S(), a = nextBoss();
      const goal = a < 0 ? `你已經打倒了${DIFFS[s.diff].n}難度的所有首領。` : `下一個目標：${ACTS[a].n}的「${ACTS[a].bossN}」。\n它在第四層的最深處。`;
      await say('長老 馬庫斯', `${goal}${s.palace?.open ? `\n\n死王宮殿：最深到過第 ${s.palace.best || 0} 層${s.palace.won ? `，打倒死王 ${s.palace.won} 次` : ''}。` : ''}\n\n深淵的魔物會帶著寶物。越強的魔物，帶的寶物越好。\n藍色名字的是冠軍，金色名字的是首領級的獨特怪物。`, 'oldman');
      if ((s.maxDiff || 0) > 0) {
        const opts = DIFFS.slice(0, (s.maxDiff || 0) + 1).map((d, i) => ({ label: `<span style="color:${d.c}">${d.n}</span>`, sub: i === s.diff ? '目前' : `怪物 +${d.add} 級` }));
        const i = await G.ui.choose(opts, { title: '切換難度？', cls: 'small' });
        if (i >= 0 && i !== s.diff) { s.diff = i; s.wp[`d${i}a0l0`] = 1; G.clearDungeons(); G.ui.toast(`難度切換為「${DIFFS[i].n}」：抗性 -${[0, 30, 60][i]}%，寶物更好`); G.ui.hud(); }
      }
    },
  };
  const EV = {
    // a guardian of the Dead King's palace, on every tenth floor
    async pboss(o) {
      const s = S(), def = G.field.def, f = def.floor; if (def.bossDone || !f) return;
      const id = palaceBoss(f), E = ENEMIES[id], last = f >= PALACE_N;
      await say('', last ? '王座上的骸骨緩緩站起……\n「死王」甦醒了！' : `第 ${f} 層的守護者\n「${E.name}」擋住了去路！`, null);
      const res = await G.fight({ troop: [id], mods: [{ rank: 0, lv: 99, mods: [] }], bg: G.bgFor(), noFlee: true, boss: true, music: 'boss', pw: def.pw, lootQ: def.lootQ });
      if (res !== 'win') return;
      def.bossDone = true; G.updateObjective();
      if (!last) { G.ui.toast(`通往第 ${f + 1} 層的門打開了${f + 1 > (s.palace?.ckpt || 1) ? '；下次可以從這裡開始' : ''}`, 3500); s.palace.ckpt = Math.max(s.palace.ckpt || 1, f + 1); return; }
      s.palace.won = (s.palace.won || 0) + 1;
      await say('', `死王倒下了。\n宮殿的鐘聲停了下來……${s.palace.won === 1 ? '\n\n你是第一個從死王宮殿最深處活著回來的人。' : ''}`, null);
      if (await G.ui.yesno('要回營地嗎？')) await G.warp('town', 15, 18, 'down');
    },
    async boss(o) {
      const s = S(), act = o?.act ?? G.field.def.act, key = `${s.diff}_${act}`;
      if (G.field.def.bossDone) return;
      const A = ACTS[act], lv = areaLevel(s, act, 3) + 2;
      await say('', `一股巨大的氣息逼近……\n「${A.bossN}」出現了！`, null);
      const res = await G.fight({ troop: [A.boss], mods: [{ rank: 0, lv, mods: [] }], bg: G.bgFor(), noFlee: true, boss: true, music: 'boss' });
      if (res !== 'win') return;
      G.field.def.bossDone = true;
      const first = !s.cleared[key]; s.cleared[key] = 1;
      if (act + 1 < ACTS.length) s.wp[`d${s.diff}a${act + 1}l0`] = 1;
      else if ((s.maxDiff || 0) <= s.diff && s.diff < 2) { s.maxDiff = s.diff + 1; }
      const palaceNew = s.diff === 2 && act === ACTS.length - 1 && !s.palace?.open;
      if (palaceNew) s.palace = { best: 0, ...(s.palace || {}), open: 1 };
      await say('', `打倒了「${A.bossN}」！${first ? (act + 1 < ACTS.length ? `\n${ACTS[act + 1].n}的傳送點開啟了。` : s.diff < 2 ? `\n${DIFFS[s.diff + 1].n}難度解鎖了！（到營地找長老切換）` : '\n你征服了地獄。傳說會流傳下去。') : ''}`, null);
      if (palaceNew) await say('', '大地深處傳來沉重的鐘聲……\n「死王宮殿」的門打開了。\n\n到營地的傳送水晶選「死王宮殿」就能下去。\n一百層，越深越強，寶物也越好。\n每一層的入口都能返回地面；\n但如果在宮殿裡倒下，會失去經驗值、金幣，以及這次在宮殿拿到的一半東西。', null);
      if (await G.ui.yesno('要回營地嗎？')) await G.warp('town', 15, 18, 'down');
    },
  };
  return {
    TALK, EV, SIGNS: {}, SPOT_EVENTS: {},
    bubble(def) { return def.id === 'elder' && nextBoss() >= 0 ? '!' : null; },
    objectiveText() { const d = G.field?.def; if (d?.floor) return `死王宮殿 第${d.floor}層：${d.floor % 10 === 0 && !d.bossDone ? (d.floor >= PALACE_N ? '打倒死王' : '打倒守護者，打開往下的門') : '找到往下的門（入口可以返回地面）'}`;
      const a = nextBoss(); return a < 0 ? '' : `目標：打倒 ${ACTS[a].n.split('　')[0]}首領「${ACTS[a].bossN}」`; },
    async board(id) { if (id === 'stash') await G.ui.stashMenu(); },
  };
}
