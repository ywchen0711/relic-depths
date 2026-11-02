// The people of the camp and the act bosses. Same shape as Crystal Echoes' story module (TALK, EV, board...),
// but there is no script to follow: the goal is always the next act's boss, and better loot.
import { HEROES, ENEMIES } from './data.js?v=1';
import { healAll, addItem } from './party.js?v=1';
import { ACTS, DIFFS, areaLevel, mapId } from './dungeon.js?v=1';
import { rollItem } from './loot.js?v=1';

export const QUESTS = {};
export function makeStory(G) {
  const S = () => G.S, ui = () => G.ui;
  const say = (who, text, look) => G.ui.say(who, text, look);
  const nextBoss = () => { const s = S(); for (let a = 0; a < ACTS.length; a++) if (!s.cleared[`${s.diff}_${a}`]) return a; return -1; };
  const TALK = {
    async merchant() { await say('商人 歐德', '要買點什麼？裝備每次你變強就會換一批新貨。', 'merchant'); await G.ui.merchantMenu(); },
    async healer() { healAll(S()); G.audio.sfx('heal'); G.ui.hud(); await say('治療師 艾菈', '傷都治好了。\n去吧，願光照亮你的路。', 'priest'); },
    async recruiter() { await say('傭兵隊長 葛倫', '十種職業的冒險者都在這個營地裡。\n付錢，他們就跟你走。', 'guard'); await G.ui.hireMenu(); },
    async gambler() { await say('賭徒 薇拉', '想試試手氣嗎？\n袋子裡是什麼，連我都不知道。', 'lady'); await G.ui.gambleMenu(); },
    async elder() {
      const s = S(), a = nextBoss();
      const goal = a < 0 ? `你已經打倒了${DIFFS[s.diff].n}難度的所有首領。` : `下一個目標：${ACTS[a].n}的「${ACTS[a].bossN}」。\n它在第四層的最深處。`;
      await say('長老 馬庫斯', `${goal}\n\n深淵的魔物會帶著寶物。越強的魔物，帶的寶物越好。\n藍色名字的是冠軍，金色名字的是首領級的獨特怪物。`, 'oldman');
      if ((s.maxDiff || 0) > 0) {
        const opts = DIFFS.slice(0, (s.maxDiff || 0) + 1).map((d, i) => ({ label: `<span style="color:${d.c}">${d.n}</span>`, sub: i === s.diff ? '目前' : `怪物 +${d.add} 級` }));
        const i = await G.ui.choose(opts, { title: '切換難度？', cls: 'small' });
        if (i >= 0 && i !== s.diff) { s.diff = i; s.wp[`d${i}a0l0`] = 1; G.clearDungeons(); G.ui.toast(`難度切換為「${DIFFS[i].n}」：抗性 -${[0, 30, 60][i]}%，寶物更好`); G.ui.hud(); }
      }
    },
  };
  const EV = {
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
      await say('', `打倒了「${A.bossN}」！${first ? (act + 1 < ACTS.length ? `\n${ACTS[act + 1].n}的傳送點開啟了。` : s.diff < 2 ? `\n${DIFFS[s.diff + 1].n}難度解鎖了！（到營地找長老切換）` : '\n你征服了地獄。傳說會流傳下去。') : ''}`, null);
      if (await G.ui.yesno('要回營地嗎？')) await G.warp('town', 15, 18, 'down');
    },
  };
  return {
    TALK, EV, SIGNS: {}, SPOT_EVENTS: {},
    bubble(def) { return def.id === 'elder' && nextBoss() >= 0 ? '!' : null; },
    objectiveText() { const a = nextBoss(); return a < 0 ? '' : `目標：打倒 ${ACTS[a].n.split('　')[0]}首領「${ACTS[a].bossN}」`; },
    async board(id) { if (id === 'stash') await G.ui.stashMenu(); },
  };
}
