// A hundred more uniques and thirty more sets. Each is written as a name, a base, a level and a few powers;
// the numbers grow with the level, so a level-85 unique is an end game piece and a level-12 one a find for act one.
// powers: ed edef str mag hp mp spd spr def crit dbl leech mleech resall skill cls:X tree:X_i mf gold exp block evade
// thorns counter regen haste reflect protect survive first lowhp brk dualcast killheal healup mpreg hpP slay:F oh:ST
// imm:ST burn chain shock, and an element (fire ice thunder water wind earth light dark): on a weapon it is the
// weapon's element, elsewhere a resistance.
const ELS = ['fire', 'ice', 'thunder', 'water', 'wind', 'earth', 'light', 'dark'];
const r0 = (x) => Math.round(x), r2 = (x) => +x.toFixed(2);
export function powers(tokens, L, weapon, k = 1, fxOnly = false) {
  const p = { fx: {} }, f = p.fx, add = (key, v) => { if (fxOnly) { const m = { hp: ['hpP', v / 600], atk: ['atkP', v / 250], mag: ['magP', v / 250], def: ['defP', v / 250], spr: ['sprP', v / 250], spd: ['spdF', v], mp: ['mpP', v / 300] }[key]; if (m) { f[m[0]] = r2((f[m[0]] || 0) + m[1]); return; } } p[key] = (p[key] || 0) + v; };
  for (const t of tokens.split(/\s+/).filter(Boolean)) {
    const [a, b] = t.split(':');
    if (ELS.includes(a)) { if (weapon) { f.el = a; f.elUp = { ...(f.elUp || {}), [a]: r2((0.2 + L / 250) * k) }; } else p.res = { ...(p.res || {}), [a]: r0((20 + L / 3) * k) }; continue; }
    switch (a) {
      case 'ed': if (!fxOnly) p.ed = r0((80 + L * 2.6) * k); else f.atkP = r2((f.atkP || 0) + 0.1 * k); break;
      case 'edef': if (!fxOnly) p.edef = r0((60 + L * 2.2) * k); else f.defP = r2((f.defP || 0) + 0.1 * k); break;
      case 'str': add('atk', r0((5 + L / 3.5) * k)); break;
      case 'mag': add('mag', r0((5 + L / 2.8) * k)); break;
      case 'hp': add('hp', r0((20 + L * 3.2) * k)); break;
      case 'mp': add('mp', r0((15 + L * 1.6) * k)); break;
      case 'spd': add('spd', Math.max(1, Math.floor((1 + L / 22) * k))); break;
      case 'spr': add('spr', r0((5 + L / 3) * k)); break;
      case 'def': add('def', r0((5 + L / 3) * k)); break;
      case 'resall': p.res = { ...(p.res || {}), ...Object.fromEntries(ELS.map(e => [e, (p.res?.[e] || 0) + r0((8 + L / 4) * k)])) }; break;
      case 'crit': f.crit = r2((0.05 + L / 700) * k); break;
      case 'dbl': f.dbl = r2((0.1 + L / 500) * k); break;
      case 'leech': f.drain = r2((0.03 + L / 1200) * k); break;
      case 'mleech': f.mpdrain = r2((0.02 + L / 2000) * k); break;
      case 'skill': f.skillAll = (f.skillAll || 0) + (L >= 70 ? 3 : L >= 40 ? 2 : 1); break;
      case 'cls': f.skillCls = { ...(f.skillCls || {}), [b]: L >= 70 ? 4 : L >= 45 ? 3 : 2 }; break;
      case 'tree': f.skillTree = { ...(f.skillTree || {}), [b]: L >= 60 ? 3 : 2 }; break;
      case 'mf': f.mf = r0((15 + L / 2) * k); break;
      case 'gold': f.gil = r2((0.4 + L / 150) * k); break;
      case 'exp': f.exp = r2((0.05 + L / 1000) * k); break;
      case 'block': f.blockUp = r2((0.08 + L / 600) * k); break;
      case 'evade': f.evade = r2((0.05 + L / 900) * k); break;
      case 'thorns': f.thorns = r2((0.15 + L / 400) * k); break;
      case 'counter': f.counter = r2((0.1 + L / 600) * k); break;
      case 'regen': case 'haste': case 'reflect': case 'protect': f.auto = [...(f.auto || []), a]; break;
      case 'survive': f.survive = 1; break;
      case 'first': f.first = r2(Math.min(1, (0.3 + L / 250) * k)); break;
      case 'lowhp': f.lowhp = r2((0.4 + L / 250) * k); break;
      case 'brk': f.brk = r2((0.15 + L / 400) * k); break;
      case 'dualcast': f.dualcast = r2((0.08 + L / 800) * k); break;
      case 'killheal': f.killHeal = r2((0.04 + L / 1500) * k); break;
      case 'healup': f.healup = r2((0.2 + L / 300) * k); break;
      case 'mpreg': f.mpregen = r2((0.02 + L / 2500) * k); break;
      case 'hpP': f.hpP = r2((0.08 + L / 700) * k); break;
      case 'slay': f.slay = { ...(f.slay || {}), [b]: r2(1.5 + L / 150) }; break;
      case 'oh': f.onHit = { ...(f.onHit || {}), [b]: r2(Math.min(0.6, (0.15 + L / 500) * k)) }; break;
      case 'imm': f.immune = [...(f.immune || []), b, ...(b === 'stun' ? ['stop'] : [])]; break;
      case 'burn': f.burnAmp = 1; break;
      case 'chain': f.chainT = 1; break;
      case 'shock': f.shockStun = 1; break;
    }
  }
  if (fxOnly && p.res) { f.res = p.res; delete p.res; }
  return p;
}

// [name, base, level, powers, flavour]
export const U2 = [
  ['斷罪', 'sword', 12, 'ed light slay:undead crit', '審判官的佩劍，刃上刻著罪人的名字'],
  ['狼王之牙', 'dagger', 10, 'ed oh:poison dbl', '從狼王嘴裡拔下的牙磨成的短刀'],
  ['碎石者', 'hammer', 14, 'ed earth oh:stun brk', '敲碎過一座城門'],
  ['風之歌', 'harp', 15, 'mag wind haste cls:bard', '風吹過琴弦，就是一首歌'],
  ['初雪', 'rod', 13, 'mag ice tree:sorc_1 mp', '冬天第一場雪落在杖頭，從此沒有融化'],
  ['狩獵者之弓', 'bow', 16, 'ed slay:beast crit spd', '獵人一生只射過一次空箭'],
  ['鐵壁之心', 'shield:kite', 18, 'edef block hp thorns', '盾心是一顆生鏽的心臟'],
  ['夜梟之眼', 'head:light', 17, 'edef crit evade first', '黑夜裡也看得清清楚楚'],
  ['苦修者的袍', 'body:robe', 16, 'edef mag mpreg healup', '補丁上還有修道院的味道'],
  ['盜賊之手', 'arms:light', 14, 'str mf gold', '摸過的東西都會少一點'],
  ['旅人之靴', 'feet:light', 12, 'spd first exp', '走過七十七個國家'],
  ['騎士的誓約', 'waist:heavy', 20, 'hp def protect', '繫上它，就不能逃跑'],
  ['灰燼', 'back:robe', 22, 'fire mag burn', '燒剩的斗篷，還在冒煙'],
  ['毒蠍尾', 'whip', 21, 'ed oh:poison oh:slow cls:bard', '尾刺還在滴毒'],
  ['回音', 'boomerang', 23, 'ed dbl wind', '丟出去的聲音會回來兩次'],
  ['雷鳴拳', 'knuckle', 24, 'ed thunder oh:stun shock', '握拳的時候會打雷'],
  ['影縫', 'katana', 26, 'ed dark crit first', '能把影子縫在地上'],
  ['屠龍者之槍', 'spear', 28, 'ed slay:dragon fire first', '槍頭是龍的鱗片'],
  ['破城槌', 'greatsword', 27, 'ed brk lowhp str', '一劍就能劈開城牆'],
  ['砂之書', 'tome', 25, 'mag skill dualcast', '每次翻開，內容都不一樣'],
  ['女巫的魔杖', 'rod', 30, 'mag dark tree:necro_2 mleech', '杖頭是一隻乾掉的蝙蝠'],
  ['審判之鎚', 'hammer', 32, 'ed light slay:demon cls:paladin', '鎚下沒有冤魂'],
  ['冰原之心', 'amulet', 30, 'ice resall mp mpreg', '一顆永不融化的冰'],
  ['烈陽戒', 'ring', 28, 'fire str crit', '戴著它的手指永遠是燙的'],
  ['月光戒', 'ring', 29, 'mag mp mpreg dark', '月亮的碎片'],
  ['獅心', 'body:heavy', 34, 'edef hp hpP counter', '鎧甲的胸口刻著一頭獅子'],
  ['不眠者', 'head:heavy', 33, 'edef imm:sleep imm:stun hp', '戴上它的人再也睡不著'],
  ['疾風步', 'feet:heavy', 31, 'edef spd evade', '鐵靴，卻輕得像羽毛'],
  ['血盟手套', 'arms:heavy', 35, 'str leech lowhp', '簽約要用血'],
  ['星之腰帶', 'waist:light', 33, 'hp mp resall', '縫著七顆星星'],
  ['幽靈披風', 'back:light', 36, 'evade dark reflect', '穿上它，半個身子會變透明'],
  ['亡者之冠', 'head:robe', 38, 'mag cls:necro mp dark', '骷髏做的皇冠'],
  ['森羅萬象', 'staff', 40, 'mag skill resall', '世界上所有的元素都在杖裡'],
  ['風暴之眼', 'bow', 42, 'ed thunder chain dbl', '箭射出去，天就會黑'],
  ['千本櫻', 'katana', 44, 'ed crit dbl cls:assassin', '揮刀的時候會落下花瓣'],
  ['巨像之拳', 'knuckle', 43, 'ed earth brk cls:monk', '石像的手腕截下來的'],
  ['蒼穹之弦', 'harp', 45, 'mag healup cls:bard light', '彈奏的是天空的聲音'],
  ['獸王之鞭', 'whip', 41, 'ed slay:beast dbl oh:confuse', '野獸聽到鞭聲就會跪下'],
  ['冥河', 'rod', 46, 'mag dark tree:necro_5 burn', '杖裡流著冥河的水'],
  ['焚城', 'staff', 47, 'mag fire tree:sorc_0 burn', '它燒掉過一座城'],
  ['永凍之杖', 'staff', 48, 'mag ice tree:sorc_1 mpreg', '握著它的手會結霜'],
  ['雷帝之杖', 'rod', 49, 'mag thunder tree:sorc_2 shock', '雷帝的權杖'],
  ['德魯伊之杖', 'staff', 46, 'mag wind cls:druid regen', '橡樹枝，還在發芽'],
  ['神射手', 'gun', 47, 'ed crit cls:gunner first', '從來沒有打偏過'],
  ['炸藥桶', 'gun', 44, 'ed fire tree:gunner_1 burn', '小心，不要摔到'],
  ['聖騎士之盾', 'shield:tower', 48, 'edef block cls:paladin resall', '聖光在盾上流動'],
  ['巫毒娃娃', 'shield:buckler', 45, 'edef cls:necro mag mleech', '針插在它的心臟上'],
  ['龍鱗鎧', 'body:heavy', 50, 'edef fire hp resall', '一整條龍的鱗片'],
  ['影武者', 'body:light', 50, 'edef evade first counter', '你看到的不是本人'],
  ['大賢者之袍', 'body:robe', 52, 'edef mag skill mp', '袍上的字會自己移動'],
  ['戰神之盔', 'head:heavy', 54, 'edef str crit cls:barb', '戴上它的人不知道恐懼'],
  ['先知之環', 'head:robe', 53, 'mag skill mpreg exp', '戴上它，可以看見明天'],
  ['刺客面罩', 'head:light', 52, 'crit first cls:assassin evade', '沒有人看過面罩下的臉'],
  ['鋼鐵之握', 'arms:heavy', 51, 'str brk crit', '握碎過一顆石頭'],
  ['魔導手套', 'arms:robe', 53, 'mag dualcast mp', '十根手指都是魔法陣'],
  ['巨人腰帶', 'waist:heavy', 55, 'hp hpP str', '巨人用它當項圈'],
  ['風行者', 'feet:light', 54, 'spd first evade haste', '跑得比風還快'],
  ['不動明王', 'legs:heavy', 56, 'edef imm:stun imm:slow thorns', '站著，就不會倒下'],
  ['夜之翼', 'back:light', 55, 'evade dark spd', '展開就是一片夜空'],
  ['鳳凰之羽', 'back:robe', 58, 'fire survive regen', '燃燒殆盡之後會重生'],
  ['盜賊王之戒', 'ring', 55, 'mf gold spd', '每一任主人都死於非命'],
  ['巨人之戒', 'ring', 56, 'str hp lowhp', '戴在巨人的小指上'],
  ['賢者之石', 'amulet', 58, 'mag skill mpreg resall', '可以把鉛變成金子'],
  ['戰神之心', 'amulet', 60, 'str cls:barb crit lowhp', '戰神死後留下的心臟'],
  // the end game
  ['諸神黃昏', 'axe', 70, 'ed fire cls:barb crit lowhp', '世界末日那天揮下的斧頭'],
  ['天叢雲', 'katana', 72, 'ed wind crit dbl skill', '從八岐大蛇的尾巴裡拔出來的刀'],
  ['聖者之劍', 'sword', 74, 'ed light slay:demon slay:undead skill', '聖者用它斬斷了最後的黑暗'],
  ['碎星', 'hammer', 75, 'ed earth brk oh:stun cls:paladin', '從天上打落的星星做成的'],
  ['岡格尼爾', 'spear', 76, 'ed thunder first crit cls:ranger', '主神的槍，投出必中'],
  ['魔劍・噬魂', 'greatsword', 78, 'ed dark leech killheal lowhp', '它會吃掉持有者的靈魂'],
  ['阿爾忒彌斯', 'bow', 77, 'ed light crit dbl cls:ranger', '月之女神的弓'],
  ['冥王之眼', 'gun', 76, 'ed dark crit brk cls:gunner', '被它看到的人都會死'],
  ['無影', 'dagger', 79, 'ed crit dbl first cls:assassin', '沒有人見過它出鞘'],
  ['阿修羅', 'knuckle', 78, 'ed fire dbl lowhp cls:monk', '六隻手臂，六種憤怒'],
  ['女王之怒', 'whip', 75, 'ed thunder dbl oh:confuse cls:bard', '女王生氣的時候，天就會打雷'],
  ['天球', 'boomerang', 74, 'ed wind dbl skill mf', '一個會飛的小世界'],
  ['永恆之火', 'staff', 80, 'mag fire tree:sorc_0 burn skill dualcast', '世界上第一把火'],
  ['絕對零度', 'rod', 80, 'mag ice tree:sorc_1 skill mpreg', '時間在它周圍停止'],
  ['宙斯之怒', 'staff', 81, 'mag thunder tree:sorc_2 shock chain skill', '天神的雷'],
  ['死神之鐮', 'rod', 82, 'mag dark cls:necro killheal skill', '它會收走每一個靈魂'],
  ['世界樹之枝', 'staff', 80, 'mag earth cls:druid regen skill healup', '世界樹最年輕的枝條'],
  ['天籟', 'harp', 79, 'mag light cls:bard healup haste', '天使聽了都會落淚'],
  ['死海文書', 'tome', 83, 'mag skill dualcast mpreg resall', '記載著世界的終結'],
  ['伊吉斯', 'shield:aegis', 82, 'edef block reflect resall cls:paladin', '雅典娜的盾，映出美杜莎的臉'],
  ['不落城', 'shield:tower', 80, 'edef block hp thorns protect', '沒有被攻陷過的城牆'],
  ['神之鎧', 'body:heavy', 84, 'edef hp hpP resall skill', '神匠打造的鎧甲'],
  ['夜之女王', 'body:light', 82, 'edef evade crit dark first', '夜晚屬於她'],
  ['創世之袍', 'body:robe', 85, 'edef mag skill dualcast resall', '世界被創造時穿的衣服'],
  ['王者之冠', 'head:heavy', 83, 'edef skill hp resall', '只有真正的王戴得上'],
  ['全知之眼', 'head:robe', 84, 'mag skill crit mpreg', '它看見一切'],
  ['戰神之手', 'arms:heavy', 81, 'str crit dbl brk', '戰神的手套，還有血跡'],
  ['天使之翼', 'back:robe', 86, 'light survive regen healup skill', '一對純白的翅膀'],
  ['時之靴', 'feet:light', 83, 'spd first evade haste', '穿上它，時間會變慢'],
  ['大地之腰帶', 'waist:heavy', 82, 'hp hpP resall str', '大地本身的力量'],
  ['龍之戒', 'ring', 84, 'fire str crit leech', '龍的眼睛做成的戒指'],
  ['虛空之戒', 'ring', 86, 'mag mp skill mleech', '戒指的中心是一片虛無'],
  ['萬物之源', 'amulet', 88, 'skill resall hp mp mf', '一切開始的地方'],
  ['魔王之心', 'amulet', 90, 'skill lowhp leech crit str', '深淵之王死後留下的東西'],
  ['破曉', 'sword', 88, 'ed light crit dbl skill cls:paladin', '黑夜之後，一定會破曉'],
  ['終焉', 'greatsword', 92, 'ed dark brk lowhp crit skill', '一切都會結束'],
];

// [name, level, class or null, themes (the first three power the 2/3/4-piece bonuses), pieces: [base, name]]
export const SETS2 = [
  ['新手冒險者', 3, null, 'hp spd mf', [['sword', '新手之劍'], ['body:light', '新手皮甲'], ['feet:light', '新手長靴']]],
  ['森林守衛', 8, 'ranger', 'crit evade wind', [['bow', '守衛長弓'], ['head:light', '守衛兜帽'], ['body:light', '守衛皮甲']]],
  ['鐵匠', 10, null, 'str def edef', [['hammer', '鐵匠之鎚'], ['arms:heavy', '鐵匠手套'], ['waist:heavy', '鐵匠圍裙']]],
  ['學徒', 9, 'sorc', 'mag mp mpreg', [['rod', '學徒魔杖'], ['head:robe', '學徒法帽'], ['body:robe', '學徒長袍'], ['feet:robe', '學徒布鞋']]],
  ['盜賊公會', 13, 'assassin', 'crit first mf', [['dagger', '公會短刀'], ['arms:light', '公會手套'], ['back:light', '公會斗篷']]],
  ['巡禮者', 15, 'paladin', 'healup spr light', [['hammer', '巡禮之鎚'], ['shield:kite', '巡禮之盾'], ['body:heavy', '巡禮鎧甲'], ['head:heavy', '巡禮頭盔']]],
  ['墓地看守', 17, 'necro', 'dark mleech mag', [['dagger', '看守之刃'], ['head:robe', '看守兜帽'], ['body:robe', '看守長袍']]],
  ['山寺', 19, 'monk', 'dbl spr hp', [['knuckle', '山寺拳套'], ['body:robe', '山寺僧衣'], ['feet:light', '山寺草鞋'], ['waist:light', '山寺腰帶']]],
  ['流浪樂團', 21, 'bard', 'haste healup mp', [['harp', '流浪豎琴'], ['head:light', '樂團羽帽'], ['body:light', '樂團外衣']]],
  ['齒輪工坊', 23, 'gunner', 'crit brk thunder', [['gun', '工坊火槍'], ['arms:light', '工坊護手'], ['head:light', '工坊護目鏡'], ['back:light', '工坊工具包']]],
  ['熊族', 25, 'druid', 'hp regen earth', [['staff', '熊族圖騰'], ['body:light', '熊皮大衣'], ['head:light', '熊頭帽']]],
  ['北方戰狂', 27, 'barb', 'str lowhp crit', [['axe', '戰狂之斧'], ['head:heavy', '戰狂角盔'], ['body:heavy', '戰狂鎧甲'], ['arms:heavy', '戰狂護手']]],
  ['冰霜女王', 30, 'sorc', 'ice mag dualcast', [['staff', '冰霜之杖'], ['head:robe', '冰霜王冠'], ['body:robe', '冰霜禮服'], ['ring', '冰霜之戒']]],
  ['烈焰之心', 32, 'sorc', 'fire burn mag', [['rod', '烈焰魔杖'], ['arms:robe', '烈焰手套'], ['back:robe', '烈焰披肩'], ['amulet', '烈焰之心']]],
  ['雷霆之子', 34, null, 'thunder shock spd', [['spear', '雷霆之槍'], ['head:heavy', '雷霆頭盔'], ['feet:heavy', '雷霆戰靴']]],
  ['暗影議會', 36, 'assassin', 'dark crit evade', [['katana', '議會之刀'], ['body:light', '議會夜行衣'], ['head:light', '議會面罩'], ['feet:light', '議會足袋'], ['ring', '議會指環']]],
  ['聖殿騎士團', 38, 'paladin', 'block resall light', [['sword', '聖殿之劍'], ['shield:tower', '聖殿塔盾'], ['body:heavy', '聖殿鎧甲'], ['legs:heavy', '聖殿護腿'], ['head:heavy', '聖殿頭盔']]],
  ['白骨王朝', 40, 'necro', 'earth killheal mag', [['rod', '白骨權杖'], ['shield:buckler', '白骨小盾'], ['body:robe', '白骨長袍'], ['amulet', '白骨項鍊']]],
  ['天空之民', 42, 'ranger', 'wind dbl spd', [['bow', '天空之弓'], ['back:light', '天空羽衣'], ['feet:light', '天空之靴'], ['ring', '天空之戒']]],
  ['海妖', 44, 'bard', 'water oh:sleep mp', [['harp', '海妖豎琴'], ['body:robe', '海妖禮服'], ['amulet', '海妖之歌']]],
  ['鋼鐵軍團', 46, null, 'edef hp thorns', [['greatsword', '軍團巨劍'], ['body:heavy', '軍團鎧甲'], ['arms:heavy', '軍團護手'], ['legs:heavy', '軍團護腿'], ['feet:heavy', '軍團戰靴']]],
  ['大地母神', 48, 'druid', 'earth healup regen', [['staff', '母神之杖'], ['body:light', '母神之衣'], ['waist:light', '母神腰帶'], ['amulet', '母神之淚']]],
  ['武神', 52, 'monk', 'dbl crit lowhp', [['knuckle', '武神拳套'], ['body:robe', '武神道袍'], ['head:light', '武神頭帶'], ['arms:light', '武神護腕'], ['feet:light', '武神戰靴']]],
  ['機械之神', 56, 'gunner', 'crit brk chain', [['gun', '神之砲'], ['shield:kite', '機械盾'], ['body:heavy', '機械裝甲'], ['head:heavy', '機械頭盔']]],
  ['吸血鬼伯爵', 60, null, 'leech dark evade', [['sword', '伯爵細劍'], ['back:light', '伯爵斗篷'], ['body:light', '伯爵禮服'], ['ring', '伯爵之戒']]],
  ['天使長', 66, 'paladin', 'light survive healup', [['sword', '天使長之劍'], ['shield:aegis', '天使長之盾'], ['back:light', '天使長之翼'], ['head:heavy', '天使長光環'], ['body:heavy', '天使長聖鎧']]],
  ['魔王軍', 72, 'barb', 'fire lowhp str', [['axe', '魔王之斧'], ['head:heavy', '魔王之角'], ['body:heavy', '魔王之鎧'], ['arms:heavy', '魔王之爪'], ['amulet', '魔王之印']]],
  ['星詠', 78, 'sorc', 'dualcast mpreg mag', [['staff', '星詠之杖'], ['head:robe', '星詠之冠'], ['body:robe', '星詠之袍'], ['arms:robe', '星詠手套'], ['ring', '星詠之戒']]],
  ['冥界', 84, 'necro', 'dark killheal mleech', [['rod', '冥界之杖'], ['shield:buckler', '冥界之盾'], ['body:robe', '冥界之袍'], ['head:robe', '冥界之冠'], ['amulet', '冥界之門']]],
  ['神話', 90, null, 'resall crit hp', [['sword', '神話之劍'], ['head:heavy', '神話之冠'], ['body:heavy', '神話之鎧'], ['arms:heavy', '神話之手'], ['ring', '神話之戒']]],
];
