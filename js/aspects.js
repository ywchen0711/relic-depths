// Legendary powers: some uniques (and now and then a rare from a rift) carry one power that changes how a fight goes.
// At the smith a power can be drawn out of its piece (the piece is lost) and kept, then set into a magic or rare piece.
// Each power is [id, value]; the value is rolled in its range when the piece drops and stays with the power.
// where: w = weapons and jewellery, a = armour and shields, x = anything
export const ASPECTS = {
  exec: { n: '處刑', where: 'w', lo: 40, hi: 80, d: '對 HP 低於 30% 的敵人傷害 +%v%' },
  full: { n: '先發制人', where: 'w', lo: 50, hi: 100, d: '對 HP 全滿的敵人傷害 +%v%' },
  weak: { n: '弱點獵手', where: 'w', lo: 25, hi: 50, d: '打中弱點時傷害 +%v%' },
  brkd: { n: '碎盾者', where: 'w', lo: 30, hi: 60, d: '對破防中的敵人傷害 +%v%' },
  critd: { n: '致命', where: 'w', lo: 30, hi: 60, d: '會心一擊的傷害 +%v%' },
  bounce: { n: '彈射', where: 'w', lo: 15, hi: 30, d: '單體攻擊有 %v% 機率彈到另一個敵人（傷害 60%）' },
  overkill: { n: '貫穿', where: 'w', lo: 50, hi: 100, d: '擊殺敵人時，多出來的傷害有 %v% 轉到另一個敵人' },
  shatter: { n: '碎冰', where: 'x', lo: 15, hi: 25, d: '被冰屬性擊殺的敵人碎裂，對其他敵人造成它最大 HP %v% 的冰傷害' },
  blast: { n: '殉爆', where: 'x', lo: 6, hi: 12, d: '你擊殺的敵人會爆炸，對其他敵人造成它最大 HP %v% 的火傷害' },
  mnblast: { n: '屍爆', where: 'x', lo: 100, hi: 200, d: '你的召喚物倒下時爆炸，對所有敵人造成主人魔力 ×%v% 的暗傷害' },
  legion: { n: '統御', where: 'x', lo: 20, hi: 40, d: '召喚物的能力 +%v%' },
  higuard: { n: '堅守', where: 'a', lo: 10, hi: 20, d: 'HP 高於 70% 時受到的傷害 -%v%' },
  loguard: { n: '背水', where: 'a', lo: 20, hi: 35, d: 'HP 低於 35% 時受到的傷害 -%v%' },
  feast: { n: '血祭', where: 'x', lo: 3, hi: 6, d: '擊殺敵人時，全隊回復 %v% HP' },
  tide: { n: '法力潮汐', where: 'a', lo: 3, hi: 6, d: '每回合結束回復 %v% MP' },
  swift: { n: '疾行', where: 'a', lo: 2, hi: 4, d: '戰鬥開始時加速 %v 回合' },
  cleanse: { n: '淨化', where: 'a', lo: 30, hi: 60, d: '每回合結束有 %v% 機率解除自己的一個負面狀態' },
};
// what a power adds to its piece's effects
export function aspectFx([id, v]) { return { ['asp_' + id]: v }; }
export function aspectText([id, v]) { const A = ASPECTS[id]; return A ? A.d.replace('%v', v) : ''; }
export function aspectName([id]) { return ASPECTS[id]?.n || ''; }
// the kind of piece: weapons and jewellery, or armour
export function aspectWhere(G) { return G.slot === 'acc' || (G.slot === 'hand' && G.type !== 'shield') ? 'w' : 'a'; }
export function aspectFits(id, G) { const w = ASPECTS[id]?.where; return w === 'x' || w === aspectWhere(G); }
export function rollAspect(G, r = Math.random, top = false) {
  const pool = Object.keys(ASPECTS).filter(id => aspectFits(id, G)), id = pool[Math.floor(r() * pool.length)], A = ASPECTS[id];
  return [id, top ? A.hi : A.lo + Math.floor(r() * (A.hi - A.lo + 1))];
}
