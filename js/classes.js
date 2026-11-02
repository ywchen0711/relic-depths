// Ten classes, eight skill trees each, five skills a tree: 400 skills. A tree is written as a theme (its style, its
// element or weapon) and five names; the skills themselves are built from the style, so every tree plays by the same
// rules: the 1st skill at level 1, then levels 6, 12, 18 and 24, each needing a point in the one before it.
// Skills go up to level 20; a skill at level n is SKILLS['id@n'] (made on demand, see data.js), stronger each point.
import { HEROES, SKILLS, ELEM, setSkillScaler } from './data.js?v=1';
import { APT } from './content.js?v=1';

export const TREE_REQ = [1, 6, 12, 18, 24];
export const SKILL_MAX = 20;
const ELS = ['fire', 'ice', 'thunder', 'water', 'wind', 'earth', 'light', 'dark'];
const EL_STATUS = { fire: 'poison', ice: 'slow', thunder: 'stun', water: 'slow', wind: 'confuse', earth: 'stun', light: 'blind', dark: 'curse' };
const EL_ANIM = { fire: 'fire', ice: 'ice', thunder: 'thunder', water: 'water', wind: 'wind', earth: 'quake', light: 'holy', dark: 'dark' };

// ---------------------------------------------------------------- the ten classes
// t: [style, theme, [five names], icon]; theme is an element, a weapon type or a keyword the style understands
export const CLASSES = {
  barb: {
    name: '狂戰士', title: '北方的戰狂', color: '#d84a3a', wpn: 'axe', weapons: ['axe', 'sword', 'greatsword', 'hammer'], shield: true, styles: ['heavy', 'light'],
    look: { skin: 'tan', hair: '#3a2a20', hairStyle: 'spiky', top: '#7a3a2a', top2: '#c8a060', legs: '#4a3a2a', boots: '#3a2a1a', weapon: 'axe', pauldron: '#8a8a92', beard: '#3a2a20', eyes: '#3a2a20' },
    base: { hp: 160, mp: 14, atk: 20, def: 13, mag: 5, spr: 8, spd: 10 }, grow: { hp: 18, mp: 1.5, atk: 2.7, def: 1.7, mag: 0.4, spr: 0.9, spd: 0.5 },
    bio: '來自冰封北地的戰士，相信斧頭比言語更有說服力。',
    trees: [
      ['blade', 'axe', ['劈裂', '碎甲擊', '旋風斧', '斧術精通', '天崩斬'], '🪓'],
      ['blade', 'sword', ['重斬', '斷筋斬', '迴旋斬', '劍術精通', '狂刃亂舞'], '🗡️'],
      ['warcry', 'atk', ['戰吼', '怒號', '鐵壁之吼', '戰意', '狂戰之吼'], '📣'],
      ['rage', 'fire', ['狂暴', '血怒斬', '嗜血', '背水一戰', '狂神降臨'], '🩸'],
      ['quake', 'earth', ['躍擊', '震地', '大地裂', '岩之軀', '隕星落'], '🪨'],
      ['throw', 'axe', ['飛斧', '雙手投', '迴旋投', '投擲精通', '千刃雨'], '🌀'],
      ['tough', 'hp', ['天生堅韌', '鐵皮', '自然抗性', '不動心', '不死之身'], '🛡️'],
      ['instinct', 'atk', ['致命一擊', '連續攻擊', '破甲本能', '疾風之足', '戰神之血'], '⚔️'],
    ],
  },
  paladin: {
    name: '聖騎士', title: '光之誓約者', color: '#f0c850', wpn: 'sword', weapons: ['sword', 'hammer', 'spear', 'greatsword'], shield: true, styles: ['heavy', 'light'],
    look: { skin: 'light', hair: '#e8c870', hairStyle: 'short', top: '#e8eef8', top2: '#e8c050', legs: '#a8b0c0', boots: '#8a8ea0', weapon: 'sword', shield: true, pauldron: '#e8c050', cape: '#3a5aa8', eyes: '#4a8ac8' },
    base: { hp: 150, mp: 22, atk: 17, def: 16, mag: 11, spr: 14, spd: 9 }, grow: { hp: 16, mp: 2.2, atk: 2.1, def: 2.1, mag: 1.2, spr: 1.7, spd: 0.4 },
    bio: '向光明立誓的騎士，劍與盾都是為了守護同伴。',
    trees: [
      ['spell', 'light', ['聖擊', '致盲之光', '神聖新星', '聖光精通', '天堂之拳'], '✨'],
      ['blade', 'sword', ['熱誠', '復仇之刃', '聖光衝鋒', '劍盾精通', '審判之劍'], '🗡️'],
      ['aura', 'atk', ['力量光環', '狂熱光環', '專注光環', '信念', '審判光環'], '🔆'],
      ['aura', 'def', ['祈禱光環', '抗性光環', '冥想光環', '救贖', '聖盾光環'], '🌕'],
      ['guard', 'shield', ['盾擊', '挑釁', '守護之構', '格擋精通', '聖盾衝鋒'], '🛡️'],
      ['heal', 'light', ['治療之手', '再生之光', '淨化', '慈悲', '神恩'], '💖'],
      ['curse', 'light', ['制裁', '定罪', '驅魔', '聖焰之印', '天譴'], '⚖️', '審判'],
      ['tough', 'def', ['聖騎士之體', '鋼鐵信仰', '聖光護體', '不屈之心', '殉道者'], '🏰'],
    ],
  },
  sorc: {
    name: '元素法師', title: '四元素的學者', color: '#8a6aff', wpn: 'rod', weapons: ['rod', 'staff', 'tome', 'dagger'], shield: false, styles: ['robe', 'light'],
    look: { skin: 'pale', hair: '#2a2a3a', hairStyle: 'long', top: '#3a2a6a', top2: '#e8c050', legs: '#2a2238', boots: '#3a2a3a', robe: true, hat: 'wizard', hatColor: '#3a2a6a', hatBand: '#e8c050', weapon: 'rod', eyes: '#8a6aff' },
    base: { hp: 95, mp: 40, atk: 8, def: 8, mag: 20, spr: 15, spd: 11 }, grow: { hp: 10, mp: 4.5, atk: 0.8, def: 1.0, mag: 2.8, spr: 2.0, spd: 0.5 },
    bio: '魔法學院最年輕的元素學者，相信世界由火、冰、雷構成。',
    trees: [
      ['spell', 'fire', ['火球', '烈焰之牆', '火焰新星', '火焰精通', '流星火雨'], '🔥'],
      ['spell', 'ice', ['冰彈', '冰霜新星', '暴風雪', '冰霜精通', '冰封千里'], '❄️'],
      ['spell', 'thunder', ['電擊', '連鎖閃電', '雷霆新星', '雷電精通', '天雷降世'], '⚡'],
      ['arcane', 'light', ['魔力飛彈', '魔力護盾', '奧術新星', '能量轉換', '奧術爆發'], '🔮'],
      ['wizard', 'mag', ['溫暖', '魔力湧泉', '元素親和', '雙重詠唱', '魔導之極'], '📘'],
      ['time', 'wind', ['加速術', '緩速術', '時間停止', '時之流', '時空崩壞'], '⏳'],
      ['spell', 'wind', ['風刃', '龍捲風', '暴風', '風之精通', '天嵐'], '🌪️'],
      ['spell', 'earth', ['石礫', '岩槍', '地震', '大地精通', '隕石'], '🪨'],
    ],
  },
  necro: {
    name: '死靈法師', title: '生死邊界的守門人', color: '#6ae8a0', wpn: 'dagger', weapons: ['dagger', 'rod', 'tome', 'staff'], shield: true, styles: ['robe', 'light'],
    look: { skin: '#c8c8d0', hair: '#e8e8f0', hairStyle: 'long', top: '#1a1a2a', top2: '#6ae8a0', legs: '#1a1a22', boots: '#1a1a1a', robe: true, hat: 'hood', hatColor: '#1a1a2a', weapon: 'dagger', eyes: '#6ae8a0' },
    base: { hp: 100, mp: 36, atk: 10, def: 9, mag: 18, spr: 15, spd: 10 }, grow: { hp: 11, mp: 4.0, atk: 1.0, def: 1.1, mag: 2.5, spr: 2.0, spd: 0.45 },
    bio: '研究死亡的學者。她說：「骨頭不會說謊。」',
    trees: [
      ['spell', 'earth', ['骨矛', '骨牢', '骨之風暴', '骨之精通', '骨靈'], '🦴', '骨系魔法'],
      ['venom', 'dark', ['毒刃', '毒霧', '劇毒新星', '毒之精通', '萬毒歸宗'], '🧪'],
      ['curse', 'dark', ['弱化', '衰老', '恐懼', '詛咒精通', '死亡宣告'], '💀'],
      ['blood', 'dark', ['吸血術', '鮮血之刃', '血之盛宴', '血之契約', '血祭'], '🩸'],
      ['summon', 'dark', ['召喚骷髏', '骷髏法師', '骷髏軍團', '亡者精通', '屍骨巨人'], '☠️', '亡者召喚'],
      ['burst', 'dark', ['屍體爆炸', '靈魂爆裂', '連鎖屍爆', '引爆精通', '冥界之門'], '💥'],
      ['soul', 'dark', ['吸魂', '靈魂鎖鏈', '靈魂收割', '魂之泉', '冥王之握'], '👻'],
      ['wizard', 'mag', ['死亡學識', '冥想', '亡者之軀', '靈魂共鳴', '死神'], '📕'],
    ],
  },
  ranger: {
    name: '遊俠', title: '森林的神射手', color: '#5ac84a', wpn: 'bow', weapons: ['bow', 'spear', 'boomerang', 'dagger'], shield: false, styles: ['light', 'robe'],
    look: { skin: 'light', hair: '#c8843a', hairStyle: 'ponytail', top: '#3a6a3a', top2: '#c8a060', legs: '#4a3a2a', boots: '#5a3a2a', cape: '#2a4a2a', weapon: 'bow', eyes: '#3a8a3a' },
    base: { hp: 120, mp: 24, atk: 17, def: 11, mag: 10, spr: 11, spd: 14 }, grow: { hp: 13, mp: 2.4, atk: 2.3, def: 1.3, mag: 1.0, spr: 1.2, spd: 0.75 },
    bio: '在森林長大的獵人，百步之外能射中蘋果的蒂。',
    trees: [
      ['ranged', 'bow', ['瞄準射擊', '多重射擊', '箭雨', '弓術精通', '神射'], '🏹'],
      ['ranged', 'fire', ['火焰箭', '爆裂箭', '烈焰箭雨', '火矢精通', '鳳凰箭'], '🔥'],
      ['ranged', 'ice', ['冰霜箭', '冰凍箭', '冰風暴箭', '冰矢精通', '凍原之箭'], '❄️'],
      ['ranged', 'thunder', ['雷電標槍', '閃電之槍', '雷光爆裂', '標槍精通', '雷神之怒'], '⚡'],
      ['evade', 'wind', ['閃避', '迴避', '殘影', '疾風步', '無影'], '💨'],
      ['eagle', 'light', ['鷹眼', '弱點洞察', '致命射擊', '穿透', '必殺之眼'], '🦅'],
      ['summon', 'light', ['精靈之友', '森林精靈', '女武神', '精靈契約', '光之戰姬'], '🧚', '精靈召喚'],
      ['heal', 'wind', ['草藥', '森林之息', '自然療癒', '森林恩惠', '生命之泉'], '🌿'],
    ],
  },
  assassin: {
    name: '刺客', title: '影之刃', color: '#a04ac8', wpn: 'dagger', weapons: ['dagger', 'katana', 'knuckle', 'boomerang'], shield: false, styles: ['light', 'robe'],
    look: { skin: 'light', hair: '#1a1a2a', hairStyle: 'ponytail', top: '#2a1a3a', top2: '#a04ac8', legs: '#1a1a2a', boots: '#1a1a22', weapon: 'dagger', eyes: '#c86aff' },
    base: { hp: 115, mp: 26, atk: 18, def: 10, mag: 11, spr: 10, spd: 16 }, grow: { hp: 12, mp: 2.6, atk: 2.4, def: 1.2, mag: 1.1, spr: 1.1, spd: 0.85 },
    bio: '暗殺者公會出身，接下的每一個委託都會完成。',
    trees: [
      ['shadow', 'dagger', ['影襲', '暗影步', '影之亂舞', '影之精通', '千影殺'], '🌑'],
      ['trap', 'thunder', ['雷電陷阱', '火焰陷阱', '連鎖陷阱', '陷阱精通', '死亡哨兵'], '⚙️'],
      ['blade', 'knuckle', ['猛虎拳', '飛龍腳', '鳳凰擊', '武學精通', '蓄氣終結'], '🥊', '武學'],
      ['venom', 'dagger', ['毒刃', '麻痺刃', '劇毒之舞', '毒刃精通', '猛毒之牙'], '🐍'],
      ['blade', 'katana', ['居合', '燕返', '月影斬', '刀術精通', '一閃'], '🗾'],
      ['curse', 'dark', ['煙霧彈', '蠱惑', '暗之帳', '煙霧精通', '心智崩潰'], '💨', '煙霧'],
      ['instinct', 'crit', ['弱點刺擊', '雙刃', '暗殺術', '致命精通', '一擊必殺'], '🎯'],
      ['spell', 'water', ['水遁', '霧隱', '水龍', '忍術精通', '大瀑布'], '🌊', '忍術'],
    ],
  },
  druid: {
    name: '德魯伊', title: '自然的化身', color: '#8ac84a', wpn: 'staff', weapons: ['staff', 'hammer', 'spear', 'knuckle'], shield: true, styles: ['light', 'robe'],
    look: { skin: 'tan', hair: '#6a4a2a', hairStyle: 'long', top: '#4a6a2a', top2: '#c8a060', legs: '#3a4a2a', boots: '#4a3a2a', cape: '#3a5a2a', weapon: 'staff', beard: '#6a4a2a', eyes: '#6aa84a' },
    base: { hp: 130, mp: 30, atk: 15, def: 12, mag: 16, spr: 14, spd: 10 }, grow: { hp: 14, mp: 3.2, atk: 1.8, def: 1.4, mag: 2.1, spr: 1.7, spd: 0.45 },
    bio: '守護古老森林的人，可以化身成熊或狼。',
    trees: [
      ['spell', 'wind', ['旋風', '颶風', '龍捲', '風暴精通', '天之怒'], '🌪️'],
      ['spell', 'fire', ['火山碎片', '熔岩', '火山爆發', '火山精通', '末日火山'], '🌋', '火山'],
      ['beast', 'knuckle', ['熊掌', '熊之怒吼', '震地猛擊', '熊之體魄', '巨熊化身'], '🐻', '熊化'],
      ['blade', 'spear', ['狼牙', '狂狼', '狼群', '狼之敏捷', '月狼'], '🐺', '狼化'],
      ['heal', 'earth', ['大地之愈', '橡樹之心', '森林復甦', '自然恩賜', '世界樹'], '🌳'],
      ['summon', 'earth', ['召喚烏鴉', '召喚狼群', '召喚巨熊', '馴獸精通', '森林之王'], '🦅', '動物召喚'],
      ['curse', 'earth', ['藤蔓纏繞', '毒孢子', '荊棘之地', '自然之怒', '枯萎'], '🌿', '藤蔓'],
      ['tough', 'hp', ['野性', '樹皮', '自然抗性', '再生', '不朽'], '🍃'],
    ],
  },
  monk: {
    name: '武僧', title: '拳中有禪', color: '#e8a040', wpn: 'knuckle', weapons: ['knuckle', 'staff', 'spear', 'hammer'], shield: false, styles: ['light', 'robe'],
    look: { skin: 'tan', hair: '#2a2a2a', hairStyle: 'bald', top: '#e8a040', top2: '#c84a3a', legs: '#c84a3a', boots: '#4a3a2a', robe: true, weapon: 'knuckle', eyes: '#3a2a2a' },
    base: { hp: 135, mp: 24, atk: 18, def: 12, mag: 12, spr: 14, spd: 13 }, grow: { hp: 15, mp: 2.4, atk: 2.3, def: 1.5, mag: 1.2, spr: 1.6, spd: 0.7 },
    bio: '山寺裡修行的武僧，雙拳可以擊碎岩石，也可以治癒傷口。',
    trees: [
      ['blade', 'knuckle', ['連環拳', '崩拳', '百裂拳', '拳法精通', '羅漢拳'], '👊'],
      ['spell', 'light', ['氣功波', '天眼', '氣功新星', '氣之精通', '龜派氣功'], '🌀', '氣功'],
      ['blade', 'wind', ['旋風腳', '掃堂腿', '風神腳', '腿法精通', '天翔龍閃'], '🦶', '腿法'],
      ['tough', 'def', ['金剛', '鐵布衫', '不壞之身', '心如止水', '金身'], '🗿'],
      ['meditate', 'mag', ['冥想', '調息', '內觀', '禪定', '涅槃'], '🧘'],
      ['blade', 'thunder', ['雷掌', '電光拳', '雷霆掌', '雷之精通', '雷神降臨'], '⚡', '雷掌'],
      ['aura', 'spd', ['戰鬥之舞', '疾風之構', '鋼鐵之構', '武之心', '天人合一'], '☯️'],
      ['instinct', 'dbl', ['連打', '見切', '反擊之心', '疾速', '無我'], '🥋'],
    ],
  },
  bard: {
    name: '吟遊詩人', title: '用歌聲戰鬥', color: '#f07ab0', wpn: 'harp', weapons: ['harp', 'whip', 'dagger', 'boomerang'], shield: false, styles: ['light', 'robe'],
    look: { skin: 'light', hair: '#e8a0c0', hairStyle: 'bob', top: '#c84a8a', top2: '#f4e8d8', legs: '#4a3a5a', boots: '#6a3a4a', cape: '#8a3a6a', hat: 'feather', hatColor: '#6a2a4a', hatBand: '#e8c050', weapon: 'harp', eyes: '#c84a8a' },
    base: { hp: 110, mp: 32, atk: 13, def: 10, mag: 15, spr: 15, spd: 13 }, grow: { hp: 12, mp: 3.4, atk: 1.6, def: 1.2, mag: 1.9, spr: 1.8, spd: 0.65 },
    bio: '走遍大陸的吟遊詩人，據說她的歌可以讓魔物睡著。',
    trees: [
      ['song', 'atk', ['戰歌', '進行曲', '英雄頌', '歌唱精通', '凱旋之歌'], '🎵'],
      ['song', 'def', ['守護之歌', '安魂曲', '堅守頌', '和聲', '神之讚歌'], '🎶'],
      ['curse', 'wind', ['搖籃曲', '不協和音', '混亂之舞', '低語', '終章'], '🎼', '催眠曲'],
      ['spell', 'thunder', ['音爆', '雷鳴琴', '轟鳴', '音波精通', '震天之音'], '📯', '音波'],
      ['blade', 'whip', ['鞭笞', '纏繞', '鞭擊連舞', '鞭術精通', '荊棘之舞'], '➰'],
      ['ranged', 'boomerang', ['迴旋鏢', '雙迴旋', '風車', '迴旋精通', '流星迴旋'], '🪃'],
      ['heal', 'water', ['治癒之歌', '泉之詩', '復甦之歌', '慈愛', '生命讚歌'], '💧'],
      ['charm', 'gil', ['魅力', '幸運', '說書人', '大明星', '傳說之人'], '⭐'],
    ],
  },
  gunner: {
    name: '機巧槍手', title: '火藥與齒輪', color: '#c8843a', wpn: 'gun', weapons: ['gun', 'hammer', 'axe', 'boomerang'], shield: true, styles: ['light', 'heavy'],
    look: { skin: 'tan', hair: '#5a3a2a', hairStyle: 'short', top: '#8a6a3a', top2: '#4a4a4a', legs: '#4a4a5a', boots: '#2a2a2a', hat: 'band', hatColor: '#3a3a3a', weapon: 'gun', eyes: '#c8843a' },
    base: { hp: 125, mp: 24, atk: 17, def: 12, mag: 12, spr: 11, spd: 12 }, grow: { hp: 13, mp: 2.4, atk: 2.2, def: 1.5, mag: 1.4, spr: 1.2, spd: 0.6 },
    bio: '鐵砧城的工程師，背包裡永遠有一把扳手和三顆炸彈。',
    trees: [
      ['ranged', 'gun', ['速射', '狙擊', '掃射', '槍術精通', '終焉彈幕'], '🔫'],
      ['bomb', 'fire', ['炸彈', '燃燒瓶', '集束炸彈', '爆破精通', '大爆炸'], '💣'],
      ['ranged', 'ice', ['冰凍彈', '急凍彈', '冰霜榴彈', '冷凍精通', '絕對零度砲'], '❄️'],
      ['summon', 'thunder', ['小砲台', '雷射砲台', '機械蜂群', '機械精通', '巨神兵'], '🤖', '機械砲台'],
      ['potion', 'water', ['回復藥劑', '強化藥劑', '萬能藥', '藥劑精通', '神之藥'], '⚗️'],
      ['curse', 'earth', ['腐蝕酸', '毒氣彈', '煙霧彈', '化學精通', '鍊金災變'], '🧪', '化學'],
      ['ranged', 'thunder', ['雷擊彈', '電磁砲', '連鎖電漿', '電能精通', '超電磁砲'], '⚡'],
      ['tough', 'def', ['工程裝甲', '防爆衣', '絕緣', '自動修復', '機甲'], '🔧'],
    ],
  },
};
export const CLASS_ORDER = Object.keys(CLASSES);

// ---------------------------------------------------------------- building a skill from its style
// k: 0..4 (position in the tree); returns a SKILLS entry or a passive {passive: true, fx(lv)}
const W_EL = (th) => ELS.includes(th) ? th : undefined;
const P = (fx, desc) => ({ passive: true, fxAt: fx, desc });
const lin = (a, b) => (lv) => +(a + b * (lv - 1)).toFixed(3);
function make(style, th, k, cls) {
  const el = W_EL(th), wpn = ['axe', 'sword', 'greatsword', 'hammer', 'spear', 'bow', 'gun', 'dagger', 'katana', 'knuckle', 'whip', 'boomerang', 'staff', 'rod', 'harp', 'tome'].includes(th) ? th : CLASSES[cls].wpn;
  const phys = (o) => ({ type: 'phys', tgt: 'enemy', wpn, art: wpn, ...o });
  const mag = (o) => ({ type: 'mag', tgt: 'enemy', school: 'class', anim: EL_ANIM[el] || 'holy', ...(el ? { el } : {}), ...o });
  const st = el ? EL_STATUS[el] : 'stun';
  switch (style) {
    case 'blade': case 'beast': return [
      phys({ mp: 3, pow: 1.4, ...(el ? { el } : {}), desc: '強力的單體攻擊' }),
      phys({ mp: 6, pow: 1.1, ...(el ? { el, status: st, chance: 0.4 } : { debuff: { def: 1 } }), desc: el ? `攻擊並可能使敵人${st}` : '攻擊並降低敵人防禦' }),
      phys({ mp: 10, pow: 0.95, tgt: 'enemies', ...(el ? { el } : {}), desc: '攻擊全體敵人' }),
      P((lv) => ({ atkP: lin(0.06, 0.02)(lv), crit: lin(0.03, 0.01)(lv), ...(el ? { elUp: { [el]: lin(0.1, 0.03)(lv) } } : {}) }), '被動：攻擊力與會心提升'),
      phys({ mp: 22, pow: 0.7, hits: 4, chip: 1, ...(el ? { el } : {}), desc: '四連擊並削減破防值' }),
    ];
    case 'throw': return [
      phys({ mp: 3, pow: 1.25, ranged: true, desc: '遠距離投擲' }),
      phys({ mp: 6, pow: 0.75, hits: 2, ranged: true, desc: '投擲兩次' }),
      phys({ mp: 11, pow: 0.9, tgt: 'enemies', ranged: true, desc: '投擲打全體' }),
      P((lv) => ({ atkP: lin(0.05, 0.02)(lv), dbl: lin(0.05, 0.015)(lv) }), '被動：攻擊力與連擊率提升'),
      phys({ mp: 24, pow: 0.55, hits: 6, tgt: 'random', ranged: true, desc: '隨機六連擊' }),
    ];
    case 'ranged': return [
      phys({ mp: 3, pow: 1.35, ranged: true, ...(el ? { el } : { reveal: true }), desc: el ? `${ELEM[el]}屬性射擊` : '射擊並看穿弱點' }),
      phys({ mp: 6, pow: 0.55, hits: 3, tgt: 'random', ranged: true, ...(el ? { el, status: st, chance: 0.25 } : {}), desc: '隨機三連射' }),
      phys({ mp: 11, pow: 0.95, tgt: 'enemies', ranged: true, ...(el ? { el } : {}), desc: '射擊全體敵人' }),
      P((lv) => ({ atkP: lin(0.05, 0.02)(lv), crit: lin(0.04, 0.012)(lv), ...(el ? { elUp: { [el]: lin(0.1, 0.03)(lv) } } : {}) }), '被動：射擊威力與會心提升'),
      phys({ mp: 24, pow: 0.8, hits: 2, tgt: 'enemies', ranged: true, chip: 1, ...(el ? { el } : {}), desc: '全體兩連射並削減破防值' }),
    ];
    case 'spell': case 'arcane': return [
      mag({ mp: 4, pow: 1.4, desc: `${el ? ELEM[el] + '屬性' : ''}單體魔法` }),
      mag({ mp: 8, pow: 0.9, status: st, chance: 0.45, desc: `魔法攻擊並可能使敵人${st}` }),
      mag({ mp: 13, pow: 1.05, tgt: 'enemies', desc: '全體魔法' }),
      P((lv) => ({ magP: lin(0.06, 0.02)(lv), ...(el ? { elUp: { [el]: lin(0.12, 0.035)(lv) } } : { mpcost: lin(0.05, 0.01)(lv) }) }), '被動：魔力與屬性傷害提升'),
      mag({ mp: 30, pow: 1.9, tgt: 'enemies', chip: 1, desc: '強大的全體魔法並削減破防值' }),
    ];
    case 'time': return [
      { type: 'buff', tgt: 'ally', school: 'time', status: 'haste', self: true, mp: 6, desc: '使隊友加速' },
      { type: 'debuff', tgt: 'enemies', school: 'time', status: 'slow', chance: 0.6, mp: 9, desc: '使敵全體緩速' },
      { type: 'debuff', tgt: 'enemy', school: 'time', status: 'stop', chance: 0.55, mp: 16, desc: '使敵人停止' },
      P((lv) => ({ spdF: Math.floor(1 + lv * 0.5), first: lin(0.1, 0.03)(lv) }), '被動：速度提升、容易先制'),
      mag({ mp: 34, pow: 1.7, tgt: 'enemies', el: undefined, school: 'time', pierce: true, desc: '無視防禦的全體時空魔法' }),
    ];
    case 'aura': case 'song': case 'warcry': {
      const k1 = th === 'def' ? { def: 1, spr: 1 } : th === 'spd' ? { spd: 1 } : { atk: 1 };
      return [
        { type: 'buff', tgt: 'allies', school: style === 'song' ? 'song' : 'white', buff: k1, mp: 6, desc: '提升全隊能力' },
        style === 'aura' && th === 'def' ? { type: 'heal', tgt: 'allies', school: 'white', pow: 0.9, base: 30, mp: 9, desc: '回復全隊HP' } : style === 'warcry' ? { type: 'debuff', tgt: 'enemies', school: 'curse', debuff: { atk: 1 }, mp: 8, desc: '降低敵全體攻擊' } : { type: 'buff', tgt: 'allies', school: 'white', buff: th === 'def' ? { spr: 2 } : { spd: 1, mag: 1 }, mp: 9, desc: '提升全隊能力' },
        { type: 'buff', tgt: 'allies', school: 'white', buff: th === 'def' ? { def: 2 } : { atk: 2 }, mp: 14, desc: '大幅提升全隊能力' },
        P((lv) => th === 'def' ? { hpP: lin(0.05, 0.015)(lv), blockUp: lin(0.03, 0.01)(lv) } : { atkP: lin(0.04, 0.015)(lv), limitup: lin(0.1, 0.03)(lv) }, '被動：自身能力提升'),
        style === 'warcry' ? phys({ mp: 26, pow: 1.3, tgt: 'enemies', debuff: { atk: 1, def: 1 }, desc: '全體攻擊並降低攻防' }) : { type: 'buff', tgt: 'allies', school: 'white', buff: { atk: 2, def: 2, mag: 2, spr: 2 }, heal: 0.2, mp: 30, desc: '全隊全能力大幅提升並回復' },
      ];
    }
    case 'heal': case 'potion': return [
      { type: 'heal', tgt: 'ally', school: 'white', pow: 1.7, base: 40, mp: 4, desc: '回復單體HP' },
      { type: 'buff', tgt: 'allies', school: 'white', regen: 3, mp: 9, desc: '全隊再生3回合' },
      { type: 'heal', tgt: 'dead', school: 'white', revive: 0.4, mp: 16, desc: '復活隊友' },
      P((lv) => ({ healup: lin(0.1, 0.03)(lv), mpregen: lin(0.01, 0.002)(lv) }), '被動：回復量提升、每回合回MP'),
      { type: 'heal', tgt: 'allies', school: 'white', pow: 2.4, base: 120, cure: true, mp: 32, desc: '大量回復全隊HP並解除異常' },
    ];
    case 'curse': case 'venom': return [
      style === 'venom' ? phys({ mp: 4, pow: 1.1, status: 'poison', chance: 0.7, desc: '攻擊並使敵人中毒' }) : { type: 'debuff', tgt: 'enemy', school: 'curse', debuff: { def: 2 }, mp: 4, desc: '大幅降低敵人防禦' },
      { type: 'debuff', tgt: 'enemies', school: 'curse', status: style === 'venom' ? 'poison' : th === 'wind' ? 'sleep' : th === 'light' ? 'blind' : 'slow', chance: 0.55, mp: 9, desc: '使敵全體陷入異常' },
      style === 'venom' ? mag({ mp: 13, pow: 1.0, tgt: 'enemies', el: 'dark', status: 'poison', chance: 0.5, desc: '劇毒的全體魔法' }) : { type: 'debuff', tgt: 'enemies', school: 'curse', debuff: { atk: 1, mag: 1, def: 1 }, mp: 13, desc: '降低敵全體攻擊、魔力、防禦' },
      P((lv) => ({ onHitP: lin(0.08, 0.02)(lv), magP: lin(0.04, 0.015)(lv) }), '被動：攻擊附加異常的機率與魔力提升'),
      style === 'venom' ? phys({ mp: 26, pow: 0.65, hits: 4, tgt: 'random', status: 'poison', chance: 0.6, desc: '隨機四連擊並使敵人中毒' }) : { type: 'debuff', tgt: 'enemies', school: 'curse', multiStatus: ['doom', 'curse', 'slow'], chance: 0.35, pow: 1.2, el: 'dark', mp: 30, desc: '全體闇屬性傷害並附加多種詛咒' },
    ];
    case 'blood': case 'soul': return [
      mag({ mp: 5, pow: 1.2, el: 'dark', drain: true, desc: '吸收敵人HP' }),
      style === 'soul' ? mag({ mp: 6, pow: 0.8, el: 'dark', osmose: true, desc: '吸收敵人MP' }) : phys({ mp: 7, pow: 1.5, recoil: 0.05, desc: '捨身的強力攻擊' }),
      mag({ mp: 14, pow: 0.95, tgt: 'enemies', el: 'dark', drain: true, desc: '吸收敵全體HP' }),
      P((lv) => ({ drain: lin(0.04, 0.012)(lv), killHeal: lin(0.04, 0.01)(lv) }), '被動：吸血、擊倒敵人時回復'),
      mag({ mp: 32, pow: 2.0, tgt: 'enemies', el: 'dark', desc: '強大的闇屬性全體魔法' }),
    ];
    case 'summon': return [
      mag({ mp: 6, pow: 0.55, hits: 3, tgt: 'random', desc: '召喚物隨機三連擊' }),
      mag({ mp: 9, pow: 0.8, hits: 2, tgt: 'random', status: st, chance: 0.3, desc: '召喚物攻擊並附加異常' }),
      mag({ mp: 15, pow: 0.5, hits: 6, tgt: 'random', desc: '召喚軍團隨機六連擊' }),
      P((lv) => ({ magP: lin(0.05, 0.02)(lv), hpP: lin(0.03, 0.01)(lv) }), '被動：召喚物更強、自身HP提升'),
      mag({ mp: 34, pow: 1.6, hits: 2, tgt: 'enemies', desc: '巨大召喚物攻擊全體兩次' }),
    ];
    case 'burst': return [
      mag({ mp: 6, pow: 1.3, burst: true, desc: '引爆敵人身上的異常，越多越痛' }),
      mag({ mp: 9, pow: 1.0, chain: 2, desc: '彈跳兩次的連鎖爆炸' }),
      mag({ mp: 15, pow: 1.1, tgt: 'enemies', burst: true, desc: '全體引爆' }),
      P((lv) => ({ magP: lin(0.05, 0.02)(lv), elUp: { dark: lin(0.1, 0.03)(lv) } }), '被動：闇屬性傷害提升'),
      mag({ mp: 34, pow: 2.2, tgt: 'enemies', chip: 2, desc: '冥界之門：全體大傷害並大幅削減破防' }),
    ];
    case 'bomb': case 'trap': return [
      mag({ mp: 4, pow: 1.0, tgt: 'enemies', desc: '全體爆炸' }),
      mag({ mp: 8, pow: 2.4, delay: true, desc: '設下延遲爆炸，回合結束時引爆' }),
      mag({ mp: 13, pow: 0.6, hits: 4, tgt: 'random', desc: '四顆隨機爆炸' }),
      P((lv) => ({ magP: lin(0.05, 0.02)(lv), ...(el ? { elUp: { [el]: lin(0.12, 0.03)(lv) } } : {}) }), '被動：爆炸威力提升'),
      mag({ mp: 32, pow: 2.1, tgt: 'enemies', chip: 1, desc: '巨大的全體爆炸並削減破防值' }),
    ];
    case 'quake': return [
      phys({ mp: 4, pow: 1.4, el: 'earth', desc: '躍起砸向單體' }),
      phys({ mp: 8, pow: 0.8, tgt: 'enemies', el: 'earth', status: 'stun', chance: 0.25, desc: '震擊全體，可能暈眩' }),
      phys({ mp: 13, pow: 1.1, tgt: 'enemies', el: 'earth', desc: '撕裂大地攻擊全體' }),
      P((lv) => ({ hpP: lin(0.05, 0.015)(lv), defP: lin(0.05, 0.015)(lv) }), '被動：HP與防禦提升'),
      phys({ mp: 28, pow: 2.0, tgt: 'enemies', el: 'earth', chip: 1, desc: '隕星墜落：強大的全體攻擊' }),
    ];
    case 'rage': return [
      { type: 'buff', tgt: 'self', buff: { atk: 2 }, mp: 4, desc: '大幅提升自身攻擊' },
      phys({ mp: 7, pow: 1.3, drain: true, el: 'fire', desc: '火屬性攻擊並吸收HP' }),
      P((lv) => ({ drain: lin(0.05, 0.012)(lv) }), '被動：吸血'),
      P((lv) => ({ lowhp: lin(0.3, 0.04)(lv) }), '被動：HP越低攻擊越強'),
      phys({ mp: 26, pow: 0.9, hits: 5, tgt: 'random', el: 'fire', desc: '狂神降臨：隨機五連擊' }),
    ];
    case 'guard': return [
      phys({ mp: 3, pow: 1.1, byDef: true, status: 'stun', chance: 0.3, wpn: undefined, art: 'shield', desc: '依防禦造成傷害，可能暈眩' }),
      { type: 'buff', tgt: 'self', taunt: 3, buff: { def: 1 }, mp: 5, desc: '吸引敵人攻擊3回合' },
      { type: 'buff', tgt: 'self', stance: 'cover', buff: { def: 2, spr: 2 }, mp: 10, desc: '本回合替隊友承受攻擊' },
      P((lv) => ({ blockUp: lin(0.05, 0.015)(lv), defP: lin(0.04, 0.015)(lv) }), '被動：格擋率與防禦提升'),
      phys({ mp: 24, pow: 1.8, byDef: true, delayT: true, tgt: 'enemies', art: 'shield', wpn: undefined, el: 'light', desc: '光屬性全體衝鋒，延遲敵人行動' }),
    ];
    case 'shadow': return [
      phys({ mp: 3, pow: 1.3, vsHelpless: 1.8, desc: '影襲：對破防或行動不能的敵人×1.8' }),
      { type: 'buff', tgt: 'self', evadeT: 2, buff: { spd: 1 }, mp: 6, desc: '下兩次攻擊必定閃開' },
      phys({ mp: 11, pow: 0.45, hits: 6, tgt: 'random', desc: '隨機六連擊' }),
      P((lv) => ({ evade: lin(0.04, 0.01)(lv), crit: lin(0.04, 0.012)(lv) }), '被動：閃避與會心提升'),
      phys({ mp: 26, pow: 0.6, hits: 8, tgt: 'random', el: 'dark', desc: '千影殺：隨機八連擊' }),
    ];
    case 'evade': return [
      P((lv) => ({ evade: lin(0.05, 0.012)(lv) }), '被動：閃避率提升'),
      P((lv) => ({ dodgeCounter: 1, evade: lin(0.02, 0.006)(lv) }), '被動：閃避後反擊'),
      { type: 'buff', tgt: 'self', evadeT: 3, mp: 8, desc: '下三次攻擊必定閃開' },
      P((lv) => ({ spdF: Math.floor(1 + lv * 0.6), first: lin(0.1, 0.03)(lv) }), '被動：速度提升'),
      { type: 'buff', tgt: 'allies', evadeT: 1, buff: { spd: 2 }, mp: 24, desc: '全隊閃開下一次攻擊並加速' },
    ];
    case 'eagle': return [
      { type: 'special', tgt: 'enemies', school: 'arcane', analyze: true, mp: 3, desc: '看穿敵全體的弱點' },
      P((lv) => ({ revealHit: 1, crit: lin(0.04, 0.01)(lv) }), '被動：命中時發現弱點、會心提升'),
      phys({ mp: 10, pow: 2.0, ranged: true, critUp: 0.4, desc: '高會心率的強力射擊' }),
      P((lv) => ({ brk: lin(0.08, 0.02)(lv) }), '被動：不打弱點也能削減破防值'),
      phys({ mp: 24, pow: 3.2, ranged: true, ignoreDef: 0.6, chip: 2, desc: '必殺之眼：無視大半防禦的一擊' }),
    ];
    case 'wizard': case 'meditate': return [
      P((lv) => ({ mpP: lin(0.08, 0.025)(lv) }), '被動：MP上限提升'),
      style === 'meditate' ? { type: 'heal', tgt: 'self', school: 'white', healP: 0.3, mpHealFlat: 20, mp: 0, desc: '回復自身HP與MP' } : P((lv) => ({ mpregen: lin(0.015, 0.004)(lv) }), '被動：每回合回復MP'),
      P((lv) => ({ magP: lin(0.06, 0.02)(lv) }), '被動：魔力提升'),
      P((lv) => ({ dualcast: lin(0.06, 0.012)(lv) }), '被動：機率連續詠唱'),
      style === 'meditate' ? { type: 'buff', tgt: 'allies', school: 'white', buff: { mag: 2, spr: 2 }, heal: 0.3, mp: 26, desc: '全隊魔力精神提升並回復' } : mag({ mp: 36, pow: 2.4, tgt: 'enemies', el: undefined, anim: 'holy', randEl: true, desc: '隨機屬性的強大全體魔法' }),
    ];
    case 'tough': return [
      P((lv) => ({ hpP: lin(0.06, 0.02)(lv) }), '被動：HP上限提升'),
      P((lv) => ({ defP: lin(0.06, 0.02)(lv), sprP: lin(0.04, 0.015)(lv) }), '被動：防禦與精神提升'),
      P((lv) => ({ resistAll: lin(0.92, -0.012)(lv) }), '被動：所有屬性傷害降低'),
      P((lv) => ({ immune: lv >= 10 ? ['poison', 'blind', 'slow', 'stun'] : lv >= 5 ? ['poison', 'blind'] : ['poison'], thorns: lin(0.05, 0.01)(lv) }), '被動：免疫異常、反彈傷害'),
      P((lv) => ({ survive: 1, hpP: lin(0.05, 0.01)(lv), auto: lv >= 10 ? ['regen'] : [] }), '被動：致命傷時以1HP存活一次'),
    ];
    case 'instinct': return [
      P((lv) => ({ crit: lin(0.05, 0.012)(lv) }), '被動：會心率提升'),
      P((lv) => ({ dbl: lin(0.06, 0.015)(lv) }), '被動：普通攻擊連擊'),
      th === 'crit' ? phys({ mp: 12, pow: 2.2, critUp: 0.5, vsHelpless: 1.5, desc: '高會心的暗殺一擊' }) : P((lv) => ({ brk: lin(0.06, 0.02)(lv), counter: lin(0.06, 0.015)(lv) }), '被動：破防與反擊'),
      P((lv) => ({ spdF: Math.floor(1 + lv * 0.5), atkP: lin(0.03, 0.012)(lv) }), '被動：速度與攻擊提升'),
      th === 'crit' ? phys({ mp: 30, pow: 4.0, critUp: 0.6, vsHelpless: 2.0, desc: '一擊必殺' }) : P((lv) => ({ first: 1, limitup: lin(0.2, 0.04)(lv), atkP: lin(0.05, 0.015)(lv) }), '被動：必定先制、極限累積加快'),
    ];
    case 'charm': return [
      P((lv) => ({ gil: lin(0.1, 0.04)(lv) }), '被動：金幣增加'),
      P((lv) => ({ drop: lin(0.08, 0.03)(lv), mf: lin(10, 4)(lv) }), '被動：掉寶率與尋寶率提升'),
      P((lv) => ({ exp: lin(0.05, 0.02)(lv) }), '被動：經驗值增加'),
      { type: 'buff', tgt: 'allies', school: 'song', buff: { atk: 1, def: 1, mag: 1, spr: 1, spd: 1 }, mp: 18, desc: '全隊全能力提升' },
      P((lv) => ({ mf: lin(30, 6)(lv), limitup: lin(0.2, 0.05)(lv) }), '被動：大幅提升尋寶率'),
    ];
    default: return [0, 1, 2, 3, 4].map(() => mag({ mp: 5, pow: 1 }));
  }
}

// ---------------------------------------------------------------- register everything
export const TREES = {};      // cls -> [{ id, name, icon, style, skills: [sid x5] }]
export const SKILL_INFO = {}; // sid -> { cls, tree, k, req, passive, fxAt }
for (const [cls, C] of Object.entries(CLASSES)) {
  TREES[cls] = C.trees.map(([style, th, names, icon], ti) => {
    const built = make(style, th, 0, cls), ids = [];
    built.forEach((b, k) => {
      const id = `k_${cls}_${ti}_${k}`; ids.push(id);
      SKILL_INFO[id] = { cls, tree: ti, k, req: TREE_REQ[k], passive: !!b.passive, fxAt: b.fxAt, desc: b.desc };
      if (b.passive) { SKILLS[id] = { name: names[k], type: 'passive', passive: true, desc: b.desc, mp: 0 }; return; }
      const S = { ...b, name: names[k], tier: k + 1, lvl: k };
      if (S.art && !S.anim) S.anim = S.wpn === 'bow' || S.wpn === 'gun' ? 'arrow' : S.wpn === 'spear' ? 'thrust' : S.tgt === 'enemies' ? 'wave' : (S.hits || 1) > 1 ? 'slash2' : 'slash';
      if (!S.anim) S.anim = S.type === 'heal' ? 'heal' : S.type === 'buff' ? 'buff' : S.type === 'debuff' ? 'dark' : 'holy';
      if (S.el === undefined) delete S.el;
      SKILLS[id] = S;
    });
    return { id: `${cls}_${ti}`, name: '', icon, style, theme: th, skills: ids };
  });
  // a limit break for each class
  const L = { barb: ['諸神黃昏', { type: 'phys', tgt: 'enemies', pow: 3.0, hits: 1, chip: 2, wpn: 'axe', art: 'axe', lvl: 4 }], paladin: ['聖光審判', { type: 'mag', tgt: 'enemies', pow: 2.6, el: 'light', heal: 0.3, chip: 2, school: 'class', tier: 5 }],
    sorc: ['元素終焉', { type: 'mag', tgt: 'enemies', pow: 3.2, el: ['fire', 'ice', 'thunder'], chip: 2, school: 'class', tier: 5 }], necro: ['死者之門', { type: 'mag', tgt: 'enemies', pow: 2.8, el: 'dark', drain: true, chip: 2, school: 'class', tier: 5 }],
    ranger: ['萬箭齊發', { type: 'phys', tgt: 'enemies', pow: 1.1, hits: 3, ranged: true, chip: 2, wpn: 'bow', art: 'bow', lvl: 4 }], assassin: ['影殺陣', { type: 'phys', tgt: 'random', pow: 0.8, hits: 10, chip: 2, wpn: 'dagger', art: 'dagger', lvl: 4 }],
    druid: ['大自然之怒', { type: 'mag', tgt: 'enemies', pow: 2.8, el: ['wind', 'earth'], chip: 2, school: 'class', tier: 5 }], monk: ['百烈神拳', { type: 'phys', tgt: 'random', pow: 0.6, hits: 12, chip: 2, wpn: 'knuckle', art: 'knuckle', lvl: 4 }],
    bard: ['終幕讚歌', { type: 'buff', tgt: 'allies', buff: { atk: 3, def: 3, mag: 3, spr: 3, spd: 2 }, heal: 0.5, school: 'song', tier: 5 }], gunner: ['全彈發射', { type: 'phys', tgt: 'enemies', pow: 1.0, hits: 4, ranged: true, chip: 2, wpn: 'gun', art: 'gun', lvl: 4 }] }[cls];
  SKILLS['lim_' + cls] = { name: L[0], anim: 'limit', desc: '極限技', ...L[1] };
  APT[cls] = { w: C.weapons, shield: C.shield, styles: C.styles };
  HEROES[cls] = { name: C.name, title: C.title, wpn: C.wpn, color: C.color, look: C.look, base: C.base, grow: C.grow, skills: [], limit: 'lim_' + cls, start: null, bio: C.bio, cls };
}
const STYLE_N = { time: '時空魔法', arcane: '奧術', wizard: '魔導', meditate: '冥想', tough: '體魄', instinct: '戰鬥本能', charm: '魅力', warcry: '戰吼', evade: '身法', eagle: '鷹眼', guard: '守護', shadow: '暗影', trap: '陷阱', bomb: '爆破', potion: '藥劑', summon: '召喚', burst: '屍爆', blood: '血魔法', soul: '靈魂', rage: '狂怒', quake: '大地', venom: '毒術', curse: '詛咒', heal: '治癒', throw: '投擲' };
const W_N = { axe: '斧技', sword: '劍技', greatsword: '大劍技', hammer: '鎚技', spear: '槍技', bow: '弓術', gun: '槍械', dagger: '短劍術', katana: '刀術', knuckle: '拳法', whip: '鞭術', boomerang: '迴旋鏢', staff: '杖術', rod: '魔杖術', harp: '琴藝', tome: '書術' };
function treeTitle(style, th) {
  if (style === 'spell') return ELEM[th] + '系魔法';
  if (style === 'blade' || style === 'beast' || style === 'ranged') return W_N[th] || (style === 'ranged' ? ELEM[th] + '屬性射擊' : ELEM[th] + '之技');
  if (style === 'aura') return th === 'def' ? '防禦光環' : th === 'spd' ? '武之構' : '攻擊光環';
  if (style === 'song') return th === 'def' ? '守護之歌' : '戰歌';
  return STYLE_N[style] || '技能';
}
for (const [cls, C] of Object.entries(CLASSES)) C.trees.forEach(([style, th, , , title], ti) => { TREES[cls][ti].name = title || treeTitle(style, th); });

// how strong a skill gets per point: SKILLS['id@lv'] is built from SKILLS[id]
export function scaledSkill(B, lv) {
  const S = { ...B, name: `${B.name} Lv${lv}`, lvSkill: lv };
  const k = lv - 1;
  if (S.pow) S.pow = +(S.pow * (1 + 0.11 * k)).toFixed(3);
  if (S.base) S.base = Math.round(S.base * (1 + 0.15 * k));
  if (S.mp) S.mp = Math.round(S.mp * (1 + 0.035 * k));
  if (S.chance) S.chance = Math.min(0.95, +(S.chance + 0.02 * k).toFixed(2));
  if (S.revive) S.revive = Math.min(1, +(S.revive + 0.03 * k).toFixed(2));
  if (S.heal) S.heal = Math.min(0.8, +(S.heal + 0.015 * k).toFixed(3));
  if (S.healP) S.healP = Math.min(0.8, +(S.healP + 0.02 * k).toFixed(3));
  if (S.buff && lv >= 8) S.buff = Object.fromEntries(Object.entries(S.buff).map(([a, v]) => [a, Math.min(3, v + (lv >= 15 ? 2 : 1))]));
  if (S.debuff && lv >= 10) S.debuff = Object.fromEntries(Object.entries(S.debuff).map(([a, v]) => [a, Math.min(3, v + 1)]));
  if (S.regen) S.regen = S.regen + Math.floor(k / 6);
  if (S.taunt) S.taunt = S.taunt + Math.floor(k / 8);
  return S;
}
// the passive effects a hero gets from the points they put into passive skills
export function passiveFx(pts) {
  const out = [];
  for (const [sid, lv] of Object.entries(pts || {})) { const I = SKILL_INFO[sid]; if (I?.passive && lv > 0) out.push(I.fxAt(lv)); }
  return out;
}

setSkillScaler(scaledSkill);
