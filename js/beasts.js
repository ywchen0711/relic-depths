// Monster art at twice the old resolution, so every creature reads at a glance: the turtle has a domed shell of
// plates and a beaked head, the bird has feathers and talons, the fish has fins and scales. Same colour options
// as before (body, belly, wing, eye...), all facing left; px.res = 2 keeps them the same size on screen.
import { Px, ramp, shade, mix, rnd, registerMonster } from './pixel.js?v=1';
import './monsters.js?v=1'; // the old art registers first, so these replace it

const OL = '#1c1424';
const P = (w, h) => { const p = new Px(w, h); p.res = 2; return p; };
const lit = (R, l) => l > 0.42 ? R[0] : l < -0.3 ? R[2] : R[1];
// a filled polygon lit from the top left (light worked out against the shape's own centre)
function poly(p, pts, R) {
  const ys = pts.map(q => q[1]), xs0 = pts.map(q => q[0]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  const cx = (Math.min(...xs0) + Math.max(...xs0)) / 2, cy = (y0 + y1) / 2, hw = Math.max(1, (Math.max(...xs0) - Math.min(...xs0)) / 2), hh = Math.max(1, (y1 - y0) / 2);
  for (let y = y0; y <= y1; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) xs.push(ax + (y + 0.5 - ay) / (by - ay) * (bx - ax)); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) p.set(x, y, Array.isArray(R) ? lit(R, -(x - cx) / hw * 0.6 - (y - cy) / hh * 0.8) : R);
  }
}
// a tapered, rounded limb from (x0,y0) to (x1,y1), shaded across its width
function limb(p, x0, y0, x1, y1, r0, r1, R) {
  const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, m = Math.max(r0, r1) + 1;
  for (let y = Math.floor(Math.min(y0, y1) - m); y <= Math.max(y0, y1) + m; y++) for (let x = Math.floor(Math.min(x0, x1) - m); x <= Math.max(x0, x1) + m; x++) {
    const t = Math.max(0, Math.min(1, ((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / L2)), cx = x0 + dx * t, cy = y0 + dy * t, r = r0 + (r1 - r0) * t;
    const vx = x + 0.5 - cx, vy = y + 0.5 - cy, d = Math.hypot(vx, vy);
    if (d <= r) p.set(x, y, Array.isArray(R) ? lit(R, (-vx * 0.6 - vy * 0.8) / Math.max(1, r)) : R);
  }
}
// a curve of limbs through several points (tails, necks, tentacles)
function chain(p, pts, r0, r1, R) { const n = pts.length - 1; for (let i = 0; i < n; i++) limb(p, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n, R); }
function eye(p, x, y, r = 2.4, iris = '#e8302a', white = '#fff8ec') {
  p.ell(x, y, r, r * 1.05, white); p.ell(x - r * 0.25, y + r * 0.1, r * 0.62, r * 0.7, iris); p.ell(x - r * 0.3, y + r * 0.15, r * 0.28, r * 0.34, OL);
  p.set(x - r * 0.55, y - r * 0.4, '#ffffff');
}
const glowEye = (p, x, y, c, w = 2, h = 2) => { p.rect(x, y, w, h, c); p.set(x, y, shade(c, 0.6)); };
const teeth = (p, x0, y, x1, c = '#f4f0e0', down = 1, gap = 3) => { for (let x = x0; x <= x1; x += gap) { p.set(x, y, c); p.set(x, y + down, c); } };
const spots = (p, n, x0, y0, w, h, c, test) => { for (let i = 0; i < n; i++) { const x = x0 + rnd() * w, y = y0 + rnd() * h; if (!test || p.get(x | 0, y | 0)) p.set(x, y, c); } };

const M = {};
// ---------------------------------------------------------------- jelly things
M.slime = (c) => {
  const p = P(40, 36), R = ramp(c.body);
  poly(p, [[3, 33], [5, 22], [10, 12], [16, 6], [20, 4], [24, 6], [30, 12], [35, 22], [37, 33]], R);
  p.sell(20, 22, 17, 12, R); p.rect(3, 31, 34, 3, R[2]);
  for (const [x, w] of [[6, 3], [27, 4]]) p.sell(x + w / 2, 34, w / 2 + 0.5, 1.6, R); // little drips at the foot
  p.sell(12, 12, 3, 4, ramp(shade(c.body, 0.55))); p.set(11, 10, '#ffffff'); p.set(12, 10, '#ffffff'); p.set(11, 11, '#ffffff'); p.set(17, 9, '#ffffff');
  eye(p, 13, 20, 3.2, c.eye || '#2a2a5a'); eye(p, 25, 20, 3.2, c.eye || '#2a2a5a');
  limb(p, 16, 27, 22, 27, 1, 1, '#3a1a2a'); p.set(16, 26, '#3a1a2a'); p.set(23, 26, '#3a1a2a');
  if (c.crown) { poly(p, [[13, 7], [13, 1], [16, 4], [20, 0], [24, 4], [27, 1], [27, 7]], ramp('#e8c050')); p.ell(20, 5, 1.4, 1.4, '#d84a4a'); }
  return p.outline();
};
M.pudding = (c) => {
  const p = P(44, 38), R = ramp(c.body || '#f4d070'), T = ramp(c.top || '#8a4a1a');
  p.rect(1, 33, 42, 3, '#e8e8f0'); p.rect(3, 36, 38, 1, '#b8b8c8'); // the plate
  poly(p, [[5, 33], [8, 14], [12, 9], [32, 9], [36, 14], [39, 33]], R);
  p.sell(22, 11, 13, 4, T); for (let i = 0; i < 6; i++) chain(p, [[9 + i * 5, 12], [9 + i * 5 + (i % 2), 16 + (i % 3) * 3]], 1.4, 1.1, T);
  eye(p, 15, 22, 2.8, '#3a2010'); eye(p, 28, 22, 2.8, '#3a2010'); p.ell(22, 28, 2.4, 1.6, '#6a2a2a');
  p.set(9, 18, R[0]); p.set(9, 19, R[0]); p.set(10, 25, R[0]);
  return p.outline();
};
M.wisp = (c) => {
  const p = P(36, 46), R = ramp(c.body), core = shade(c.body, 0.65);
  chain(p, [[18, 26], [16, 33], [20, 38], [17, 44]], 6, 0.8, R);
  for (let i = 0; i < 7; i++) { const a = -2.6 + i * 0.36; limb(p, 18, 16, 18 + Math.cos(a) * 15, 16 + Math.sin(a) * 15, 4, 0.6, R); } // flame tongues
  p.sell(18, 18, 11, 11, R); p.ell(18, 18, 6.5, 6.5, core); p.ell(17, 17, 3, 3, '#ffffff');
  p.rect(13, 16, 2, 3, OL); p.rect(21, 16, 2, 3, OL); p.rect(16, 22, 4, 1, OL);
  return p; // a glow has no outline
};
M.elemental = (c) => {
  const p = P(48, 58), R = ramp(c.body), L = ramp(shade(c.body, 0.4));
  for (let i = 0; i < 54; i++) { const t = i / 53, w = 5 + Math.sin(t * Math.PI) * 15; for (let x = -w; x < w; x++) p.set(24 + x + Math.sin(t * 9 + x * 0.2) * 2.5, 56 - i, lit(R, -x / w * 0.6 - (0.5 - t) * 1.2 + (i % 6 < 2 ? -0.5 : 0))); }
  limb(p, 12, 26, 3, 36, 5, 2, R); limb(p, 36, 26, 45, 36, 5, 2, R); // arms of swirling stuff
  p.sell(24, 21, 10, 11, L);
  p.ell(19, 20, 2.6, 3.4, OL); p.ell(29, 20, 2.6, 3.4, OL); p.set(18, 18, '#fff'); p.set(28, 18, '#fff'); p.ell(24, 27, 3, 1.6, OL);
  if (c.rock) for (let i = 0; i < 9; i++) poly(p, (() => { const x = 8 + rnd() * 30, y = 10 + rnd() * 38; return [[x, y], [x + 5, y - 1], [x + 6, y + 4], [x + 1, y + 5]]; })(), ramp(c.rock));
  return p;
};
M.ghost = (c) => {
  const p = P(46, 54), R = ramp(c.body || '#e8eef8');
  poly(p, [[6, 22], [10, 10], [18, 4], [28, 4], [36, 10], [40, 22], [41, 42], [36, 49], [32, 43], [27, 51], [22, 44], [16, 52], [11, 44], [5, 48]], R);
  p.sell(23, 18, 16, 15, R);
  limb(p, 6, 28, 0, 36, 4, 2, R); limb(p, 40, 26, 45, 18, 4, 2, R); // waving arms
  p.ell(16, 18, 3.4, 5, OL); p.ell(29, 18, 3.4, 5, OL); p.ell(22, 31, 4, 5.5, OL);
  p.set(15, 16, c.eye || '#8ae0ff'); p.set(28, 16, c.eye || '#8ae0ff');
  if (c.crown) poly(p, [[14, 6], [14, 0], [18, 3], [23, 0], [28, 3], [32, 0], [32, 6]], ramp('#e8c050'));
  return p;
};
// ---------------------------------------------------------------- beasts
M.wolf = (c) => {
  const p = P(66, 46), R = ramp(c.body), B = ramp(c.belly || shade(c.body, 0.3)), D = ramp(shade(c.body, -0.25));
  chain(p, [[50, 22], [57, 16], [63, 10], [65, 5]], 4.5, 2, R); // bushy tail
  limb(p, 46, 24, 47, 42, 3.5, 2.6, D); limb(p, 22, 26, 20, 42, 3.5, 2.6, D); // far legs
  p.sell(35, 23, 16, 9, R); p.sell(34, 28, 11, 4, B);
  limb(p, 50, 24, 53, 43, 4, 2.8, R); limb(p, 25, 26, 25, 43, 4, 2.8, R); // near legs
  for (const x of [17, 23, 45, 51]) p.rect(x, 42, 6, 3, R[2]);
  poly(p, [[22, 14], [30, 18], [30, 30], [20, 30], [16, 22]], c.mane ? ramp(c.mane) : B); // neck ruff
  p.sell(15, 14, 8, 7, R);
  poly(p, [[1, 15], [10, 12], [14, 15], [12, 21], [3, 21], [1, 18]], R); // long snout
  p.rect(1, 19, 10, 1, '#3a0a1a'); p.set(3, 20, '#fff'); p.set(7, 20, '#fff'); p.ell(2, 15, 1.4, 1.2, OL); // mouth, fangs, nose
  poly(p, [[11, 9], [13, 1], [17, 8]], R); poly(p, [[17, 8], [20, 0], [22, 9]], D); p.set(14, 5, '#e8a0a0'); // pointed ears
  glowEye(p, 12, 11, c.eye || '#ffd23a', 3, 2); p.set(12, 11, OL);
  return p.outline();
};
M.beast = (c) => {
  const p = P(82, 60), R = ramp(c.body), Mn = ramp(c.mane || shade(c.body, -0.25)), H = ramp(c.horn || '#e8e0c8'), D = ramp(shade(c.body, -0.22));
  if (c.wing) { const W = ramp(c.wing); poly(p, [[44, 20], [60, 2], [78, 0], [70, 10], [74, 16], [62, 20], [64, 28], [50, 28]], W); for (let i = 0; i < 4; i++) limb(p, 46, 22, 62 + i * 4, 2 + i * 6, 1, 0.6, W[2]); }
  if (c.tail) { chain(p, [[66, 28], [74, 20], [78, 10], [74, 4]], 3, 2, R); poly(p, [[70, 6], [76, 0], [80, 6], [75, 9]], ramp(c.tail)); }
  else chain(p, [[66, 28], [74, 24], [80, 18]], 2.5, 1.2, R);
  limb(p, 60, 34, 62, 56, 5, 4, D); limb(p, 28, 34, 27, 56, 5, 4, D);
  p.sell(46, 30, 23, 14, R);
  limb(p, 66, 34, 68, 57, 5.5, 4.5, R); limb(p, 34, 36, 34, 57, 5.5, 4.5, R);
  for (const x of [22, 30, 56, 64]) p.rect(x, 55, 9, 4, '#3a2a20'); // hooves
  p.sell(22, 24, 13, 13, Mn); // shaggy hump and mane
  p.sell(14, 27, 9, 8, R); poly(p, [[2, 26], [10, 22], [14, 30], [10, 36], [3, 35]], R);
  p.rect(2, 33, 8, 1, '#3a0a1a'); p.set(4, 34, '#fff'); p.set(8, 34, '#fff'); p.ell(3, 27, 1.4, 1.2, OL);
  glowEye(p, 11, 24, c.eye || '#ffd23a', 3, 2);
  chain(p, [[14, 20], [8, 12], [6, 4], [10, 0]], 2.6, 1, H); chain(p, [[20, 20], [24, 12], [30, 8], [33, 3]], 2.6, 1, H); // curled horns
  return p.outline();
};
M.rabbit = (c) => {
  const p = P(46, 42), R = ramp(c.body || '#f4ecdc'), I = '#f4a0b0';
  p.sell(28, 27, 14, 11, R); p.sell(42, 24, 4, 4, ramp('#ffffff')); // body and puffy tail
  limb(p, 30, 32, 38, 39, 6, 3, R); p.rect(32, 38, 10, 3, R[2]); limb(p, 18, 32, 16, 40, 2.6, 2, R); // big hind leg, front paw
  p.sell(15, 20, 9, 8, R);
  chain(p, [[13, 13], [11, 6], [10, 0]], 3, 2.4, R); chain(p, [[18, 13], [20, 6], [23, 1]], 3, 2.4, R); // long ears
  limb(p, 11, 10, 10, 3, 1, 1, I); limb(p, 19, 10, 22, 4, 1, 1, I);
  eye(p, 11, 18, 2.4, c.eye || '#e8302a'); p.set(6, 22, I); p.set(7, 22, I); p.set(7, 24, '#fff');
  if (c.horn) chain(p, [[13, 13], [9, 7], [6, 1]], 1.8, 0.8, ramp(c.horn));
  return p.outline();
};
M.bat = (c) => {
  const p = P(56, 36), R = ramp(c.body), W = ramp(c.wing || shade(c.body, -0.2));
  const wing = (s) => { const X = (x) => 28 + s * x; poly(p, [[X(4), 12], [X(14), 4], [X(26), 2], [X(27), 14], [X(23), 11], [X(20), 19], [X(15), 15], [X(10), 22], [X(6), 18]], W); for (const [x, y] of [[26, 2], [20, 19], [10, 22]]) limb(p, X(5), 13, X(x), y, 1, 0.6, W[2]); };
  wing(-1); wing(1);
  p.sell(28, 18, 7, 9, R);
  poly(p, [[22, 10], [21, 2], [26, 8]], R); poly(p, [[30, 8], [35, 2], [34, 10]], R); // ears
  glowEye(p, 24, 14, c.eye || '#ff4a4a'); glowEye(p, 30, 14, c.eye || '#ff4a4a');
  p.set(25, 20, '#fff'); p.set(25, 21, '#fff'); p.set(30, 20, '#fff'); p.set(30, 21, '#fff'); p.rect(25, 19, 6, 1, '#3a0a1a');
  limb(p, 25, 26, 24, 31, 1, 1, R[2]); limb(p, 31, 26, 32, 31, 1, 1, R[2]);
  return p.outline();
};
M.bird = (c) => {
  const p = P(62, 54), R = ramp(c.body), W = ramp(c.wing || shade(c.body, -0.15)), BK = ramp('#e8b040'), Bl = ramp(c.belly || shade(c.body, 0.35));
  // raised wing with layered feathers behind the body
  poly(p, [[30, 22], [36, 6], [46, 0], [58, 2], [54, 8], [60, 10], [54, 16], [58, 20], [48, 24], [40, 30]], W);
  for (let i = 0; i < 5; i++) limb(p, 34 + i * 2, 18 + i, 52 + i * 1.5, 2 + i * 4.6, 0.8, 0.5, W[2]);
  for (let i = 0; i < 5; i++) { const a = 0.15 + i * 0.22; poly(p, [[42, 33], [42 + Math.cos(a) * 18 - 2, 33 + Math.sin(a) * 16 - 2], [42 + Math.cos(a) * 19 + 1, 33 + Math.sin(a) * 17 + 1]], i % 2 ? W : ramp(shade(c.wing || shade(c.body, -0.15), 0.15))); } // fanned tail feathers
  p.sell(32, 30, 14, 11, R); p.sell(28, 33, 9, 7, Bl);
  p.sell(17, 19, 8, 8, R);
  poly(p, [[10, 17], [2, 19], [4, 23], [10, 24]], BK); p.rect(3, 21, 7, 1, '#a86a10'); p.set(2, 20, '#a86a10'); // hooked beak
  eye(p, 14, 17, 2.4, c.eye || '#3a2a10');
  for (const x of [26, 34]) { limb(p, x, 40, x - 1, 49, 1.4, 1.2, BK); for (const d of [-3, 0, 3]) limb(p, x - 1, 49, x - 1 + d, 52, 1, 0.8, BK[2]); } // legs and talons
  if (c.crest) for (let i = 0; i < 3; i++) chain(p, [[18 + i * 2, 12], [16 + i * 3, 6], [18 + i * 4, 1]], 1.4, 0.8, ramp(c.crest));
  return p.outline();
};
M.frog = (c) => {
  const p = P(50, 38), R = ramp(c.body || '#5ab84a'), B = ramp(c.belly || '#e8e0a0');
  limb(p, 36, 28, 46, 32, 5, 3, R); limb(p, 46, 32, 38, 36, 3, 2.5, R); for (const d of [0, 3, 6]) limb(p, 38, 36, 32 + d, 37, 1.2, 1, R[2]); // folded hind leg
  p.sell(26, 24, 18, 11, R); p.sell(22, 28, 11, 6, B);
  limb(p, 14, 28, 10, 36, 2.6, 2, R); for (const d of [-3, 0, 3]) limb(p, 10, 36, 10 + d, 37, 1, 0.8, R[2]);
  p.sell(12, 12, 6, 6, R); p.sell(26, 11, 6, 6, R); // eyes on top
  eye(p, 12, 12, 3.6, c.eye || '#1c1424', '#f4e8a0'); eye(p, 26, 11, 3.6, c.eye || '#1c1424', '#f4e8a0');
  chain(p, [[9, 23], [16, 25], [24, 23]], 0.8, 0.8, '#3a1a1a'); spots(p, 10, 28, 15, 16, 8, R[2], true);
  if (c.crown) poly(p, [[14, 6], [14, 1], [18, 3], [21, 0], [24, 3], [27, 1], [27, 6]], ramp('#e8c050'));
  return p.outline();
};
M.turtle = (c) => {
  const p = P(70, 46), R = ramp(c.body || '#6a8a4a'), S = ramp(c.shell || '#8a6a3a'), Sd = shade(c.shell || '#8a6a3a', -0.45);
  limb(p, 58, 32, 66, 36, 3, 1, R); // tail
  limb(p, 52, 32, 56, 43, 5, 4, R); limb(p, 24, 32, 20, 43, 5, 4, R); // stumpy legs
  for (const x of [16, 52]) for (const d of [0, 3, 6]) p.set(x + d, 44, '#e8e0c8');
  p.rect(14, 30, 48, 4, ramp(shade(c.shell || '#8a6a3a', 0.25))[1]); // shell rim
  p.sell(38, 22, 25, 14, S); p.rect(13, 28, 50, 4, S[1]);
  // plates: a hexagon in the middle, half plates around it
  const plate = (x, y, w, h) => { poly(p, [[x - w, y], [x - w / 2, y - h], [x + w / 2, y - h], [x + w, y], [x + w / 2, y + h], [x - w / 2, y + h]], ramp(shade(c.shell || '#8a6a3a', 0.12))); };
  for (const [x, y, w, h] of [[38, 18, 7, 6], [24, 22, 6, 5], [52, 22, 6, 5], [31, 28, 5, 3], [45, 28, 5, 3], [38, 8, 5, 3]]) plate(x, y, w, h);
  for (const [a, b] of [[[31, 18], [24, 18]], [[45, 18], [52, 18]], [[38, 24], [38, 30]], [[34, 12], [30, 10]], [[42, 12], [46, 10]]]) limb(p, a[0], a[1], b[0], b[1], 0.7, 0.7, Sd);
  if (c.spike) for (let i = 0; i < 6; i++) poly(p, [[18 + i * 8, 14 - (i > 0 && i < 5 ? 6 : 0)], [21 + i * 8, 2 + (i === 0 || i === 5 ? 8 : 0)], [24 + i * 8, 14 - (i > 0 && i < 5 ? 6 : 0)]], ramp(c.spike));
  // head on a short neck, with a beak
  limb(p, 18, 30, 10, 27, 5, 4.5, R); p.sell(8, 25, 7, 6, R);
  poly(p, [[1, 25], [5, 23], [5, 29], [2, 29]], ramp(shade(c.body || '#6a8a4a', -0.2))); p.rect(1, 27, 6, 1, '#2a1a10');
  eye(p, 8, 23, 2, '#1c1424'); p.set(9, 20, R[0]); p.set(10, 21, R[0]);
  return p.outline();
};
M.crab = (c) => {
  const p = P(62, 42), R = ramp(c.body), D = ramp(shade(c.body, -0.2));
  for (let i = 0; i < 3; i++) { chain(p, [[22 - i * 2, 28], [12 - i * 4, 31], [8 - i * 4, 40]], 2, 1.2, D); chain(p, [[40 + i * 2, 28], [50 + i * 4, 31], [54 + i * 4, 40]], 2, 1.2, D); } // walking legs
  p.sell(31, 25, 18, 10, R); p.rect(14, 28, 34, 3, R[2]);
  for (let i = 0; i < 5; i++) p.set(20 + i * 5, 19 + (i % 2), R[0]);
  // big claws raised on arms
  for (const s of [-1, 1]) { const x = 31 + s * 18; chain(p, [[31 + s * 12, 24], [x, 18], [x + s * 4, 12]], 2.6, 2.6, R); p.sell(x + s * 5, 8, 7, 5.5, R); poly(p, [[x + s * 1, 4], [x + s * 7, 0], [x + s * 12, 2], [x + s * 6, 6]], R); p.rect(Math.min(x + s * 2, x + s * 10), 5, 8, 1, '#3a0a0a'); }
  for (const x of [26, 36]) { limb(p, x, 17, x, 10, 1, 1, R[2]); p.ell(x, 9, 2, 2, '#1c1424'); p.set(x - 1, 8, '#fff'); } // stalk eyes
  p.rect(28, 24, 6, 1, '#3a0a0a');
  return p.outline();
};
M.fish = (c) => {
  const p = P(62, 42), R = ramp(c.body), F = ramp(c.fin || shade(c.body, 0.2)), Bl = ramp(c.belly || shade(c.body, 0.45));
  poly(p, [[46, 21], [60, 5], [56, 21], [60, 37]], F); for (let i = 0; i < 4; i++) limb(p, 48, 21, 58, 8 + i * 9, 0.6, 0.6, F[2]); // forked tail
  poly(p, [[18, 9], [26, 1], [38, 3], [40, 10]], F); for (let i = 0; i < 4; i++) limb(p, 22 + i * 4, 9, 26 + i * 3.5, 2, 0.5, 0.5, F[2]); // dorsal fin
  poly(p, [[2, 21], [10, 10], [26, 7], [42, 12], [48, 21], [42, 30], [26, 34], [10, 32]], R);
  poly(p, [[6, 25], [26, 30], [44, 25], [40, 30], [26, 34], [10, 32]], Bl);
  for (let y = 0; y < 3; y++) for (let x = 0; x < 6; x++) p.set(18 + x * 4 + (y % 2) * 2, 15 + y * 4, R[2]); // scales
  chain(p, [[14, 12], [16, 21], [14, 28]], 0.7, 0.7, R[2]); // gill line
  poly(p, [[20, 24], [28, 27], [24, 32]], F); // side fin
  eye(p, 9, 17, 3, c.eye || '#1c1424'); p.rect(2, 23, 6, 1, '#3a0a1a'); teeth(p, 3, 22, 7, '#fff', 0, 2);
  return p.outline();
};
M.octopus = (c) => {
  const p = P(64, 60), R = ramp(c.body || '#c84a6a'), Sk = shade(c.body || '#c84a6a', 0.45);
  for (let t = 0; t < 8; t++) { const bx = 12 + t * 5.5, s = t < 4 ? -1 : 1, pts = []; for (let i = 0; i <= 6; i++) pts.push([bx + s * i * (1.5 + t % 3) + Math.sin(i * 0.9 + t) * 3, 30 + i * 4.2]); pts.push([pts[6][0] + s * 4, pts[6][1] - 3]); chain(p, pts, 3.6, 1, R); for (let i = 1; i < 6; i++) p.set(pts[i][0], pts[i][1] + 1, Sk); }
  p.sell(32, 20, 19, 17, R); p.sell(32, 31, 14, 5, R);
  spots(p, 14, 18, 6, 28, 18, R[0], true);
  eye(p, 23, 26, 4.2, c.eye || '#1c1424', '#fff8e0'); eye(p, 39, 26, 4.2, c.eye || '#1c1424', '#fff8e0');
  p.ell(32, 33, 2.4, 1.8, '#3a0a1a');
  return p.outline();
};
M.serpent = (c) => {
  const p = P(112, 100), R = ramp(c.body), B = ramp(c.belly || '#f0e0b0'), F = ramp(c.fin || '#5ac8e0');
  const body = []; for (let i = 0; i <= 22; i++) { const t = i / 22; body.push([84 - t * 46 + Math.sin(t * 7) * 14, 94 - t * 70]); }
  for (let i = 4; i < 20; i += 4) poly(p, [[body[i][0] + 6, body[i][1] - 4], [body[i][0] + 16, body[i][1] - 10], [body[i][0] + 10, body[i][1] + 4]], F); // fins along the back
  chain(p, body, 13, 7, R);
  for (let i = 0; i < 20; i++) p.ell(body[i][0] - 7 + i * 0.25, body[i][1], 2.2, 3, B[i % 2]);
  for (let i = 0; i < 20; i += 2) p.set(body[i][0] + 4, body[i][1] - 2, R[0]);
  for (let i = 0; i < 6; i++) poly(p, [[40 + i * 4, 18], [46 + i * 5, 2 + (i % 2) * 3], [48 + i * 4, 18]], F); // crest frill
  p.sell(32, 22, 17, 12, R);
  poly(p, [[2, 22], [18, 14], [24, 22], [18, 32], [4, 30]], R); p.rect(3, 27, 18, 2, '#3a0a1a'); teeth(p, 5, 26, 19, '#fff', 3, 3);
  glowEye(p, 26, 16, c.eye || '#ffe03a', 4, 3); p.set(27, 16, OL);
  chain(p, [[8, 28], [2, 36], [6, 42]], 1.2, 0.6, R[2]); // whisker
  return p.outline();
};
M.worm = (c) => {
  const p = P(62, 66), R = ramp(c.body || '#c8a060');
  const pts = []; for (let i = 0; i <= 12; i++) pts.push([36 + Math.sin(i * 0.55) * 9, 64 - i * 4.4]);
  chain(p, pts, 9, 10, R); for (let i = 1; i < 12; i++) limb(p, pts[i][0] - 9, pts[i][1], pts[i][0] + 9, pts[i][1] + 1, 0.7, 0.7, R[2]); // ring segments
  p.sell(24, 12, 15, 12, R);
  p.ell(18, 12, 9, 9, '#3a0a1a'); p.ell(18, 12, 5.5, 5.5, '#1a0408');
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; limb(p, 18 + Math.cos(a) * 8.5, 12 + Math.sin(a) * 8.5, 18 + Math.cos(a) * 5.5, 12 + Math.sin(a) * 5.5, 1.2, 0.4, '#f4f0d8'); } // ring of teeth
  return p.outline();
};
M.insect = (c) => {
  const p = P(66, 46), R = ramp(c.body || '#3a5a8a'), D = ramp(shade(c.body || '#3a5a8a', -0.3));
  for (let i = 0; i < 3; i++) { chain(p, [[24 + i * 9, 30], [20 + i * 10, 38], [16 + i * 11, 45]], 1.6, 1, D); chain(p, [[28 + i * 9, 30], [32 + i * 10, 38], [34 + i * 11, 45]], 1.6, 1, R); }
  if (c.stinger) { chain(p, [[50, 24], [58, 20], [62, 12], [58, 4], [50, 2]], 4, 2.5, R); poly(p, [[50, 2], [44, 0], [46, 6]], ramp(c.stinger)); }
  p.sell(36, 24, 19, 11, R); limb(p, 36, 13, 36, 34, 0.6, 0.6, D[2]); // wing case with its seam
  p.sell(30, 18, 6, 3, ramp(shade(c.body || '#3a5a8a', 0.5)));
  p.sell(16, 25, 7, 6, D); p.sell(9, 26, 6, 5, R);
  glowEye(p, 6, 23, c.eye || '#ffe03a', 3, 3);
  chain(p, [[8, 21], [6, 12], [2, 6]], 0.8, 0.6, D[2]); chain(p, [[10, 21], [12, 12], [10, 4]], 0.8, 0.6, D[2]); // antennae
  if (c.horn) chain(p, [[6, 24], [2, 16], [4, 8], [8, 6]], 2.4, 1, ramp(shade(c.body || '#3a5a8a', 0.2)));
  if (c.pincer) { chain(p, [[5, 30], [0, 33], [2, 38]], 1.6, 1, R); chain(p, [[7, 31], [3, 36], [6, 40]], 1.6, 1, R); }
  return p.outline();
};
M.spider = (c) => {
  const p = P(66, 46), R = ramp(c.body || '#3a2a3a'), D = ramp(shade(c.body || '#3a2a3a', -0.2));
  for (let i = 0; i < 4; i++) { chain(p, [[26, 24], [16 - i * 3, 8 + i * 4], [6 - i * 2, 28 + i * 4]], 2, 1, D); chain(p, [[34, 24], [46 + i * 3, 8 + i * 4], [58 + i * 2, 28 + i * 4]], 2, 1, R); } // eight jointed legs
  p.sell(44, 22, 15, 13, R); for (let i = 0; i < 6; i++) p.set(36 + i * 3, 14 + (i % 2) * 2, R[0]);
  if (c.mark) poly(p, [[44, 14], [48, 20], [44, 30], [40, 20]], ramp(c.mark));
  p.sell(22, 25, 10, 8, R);
  for (let i = 0; i < 4; i++) glowEye(p, 14 + i * 3, 21 - (i % 2) * 2, c.eye || '#ff3a3a', 2, 2);
  chain(p, [[16, 30], [12, 34], [14, 37]], 1.6, 1, '#f4e8d8'); chain(p, [[21, 31], [18, 35], [20, 38]], 1.6, 1, '#f4e8d8'); // fangs
  return p.outline();
};
M.hydra = (c) => {
  const n = c.heads || 3, p = P(82, 74), R = ramp(c.body), B = ramp(c.belly || '#e8d8a0');
  chain(p, [[66, 58], [76, 52], [80, 42]], 6, 2, R);
  p.sell(46, 58, 26, 14, R); p.sell(44, 62, 18, 8, B);
  limb(p, 32, 64, 30, 72, 5, 4, R); limb(p, 60, 64, 62, 72, 5, 4, R);
  for (let h = 0; h < n; h++) {
    const bx = 34 + h * (28 / Math.max(1, n - 1)), top = 12 + (h % 2) * 12, hx = bx - 18;
    chain(p, [[bx, 54], [bx - 4, 40], [bx - 12, top + 14], [hx + 4, top + 2]], 5.5, 4, R);
    for (let i = 0; i < 4; i++) p.set(bx - 5 - i * 3, 46 - i * 8, B[1]);
    p.sell(hx, top, 8, 6, R); poly(p, [[hx - 18, top + 1], [hx - 4, top - 3], [hx - 2, top + 6], [hx - 16, top + 6]], R);
    p.rect(hx - 16, top + 4, 13, 1, '#3a0a1a'); teeth(p, hx - 15, top + 3, hx - 5, '#fff', 0, 3);
    glowEye(p, hx - 3, top - 2, c.eye || '#ffe03a', 3, 2);
    chain(p, [[hx + 2, top - 5], [hx + 6, top - 10], [hx + 10, top - 12]], 1.6, 0.6, R[0]);
  }
  return p.outline();
};
M.dragon = (c) => {
  const p = P(128, 104), R = ramp(c.body), B = ramp(c.belly || '#e8d8a0'), W = ramp(c.wing || shade(c.body, -0.25)), H = ramp('#e8e0c8');
  // far wing: bony fingers with webbing
  poly(p, [[70, 40], [90, 6], [126, 0], [120, 16], [126, 26], [110, 30], [116, 44], [98, 44], [96, 56]], W);
  for (const [x, y] of [[126, 0], [126, 26], [116, 44]]) limb(p, 74, 38, x, y, 2, 1, W[2]); limb(p, 74, 38, 90, 6, 2.4, 1.4, W[2]);
  chain(p, [[96, 72], [110, 76], [120, 70], [126, 60]], 8, 2.5, R); poly(p, [[122, 58], [127, 50], [127, 62]], W); // tail with a spade
  limb(p, 90, 74, 94, 98, 7, 5, ramp(shade(c.body, -0.2))); limb(p, 56, 76, 54, 98, 7, 5, ramp(shade(c.body, -0.2)));
  p.sell(74, 66, 30, 20, R); p.sell(70, 74, 20, 10, B);
  for (let i = 0; i < 5; i++) limb(p, 56 + i * 7, 72, 56 + i * 7, 82, 0.6, 0.6, B[2]); // belly plates
  limb(p, 96, 76, 100, 100, 8, 6, R); limb(p, 62, 78, 60, 100, 8, 6, R);
  for (const x of [52, 92]) for (const d of [0, 4, 8]) poly(p, [[x + d, 100], [x + d + 2, 104], [x + d + 4, 100]], H); // claws
  for (let i = 0; i < 7; i++) poly(p, [[56 + i * 8, 46 + Math.abs(i - 3)], [60 + i * 8, 38 + Math.abs(i - 3)], [64 + i * 8, 47 + Math.abs(i - 3)]], W); // back spines
  chain(p, [[54, 60], [40, 50], [30, 36], [24, 24]], 11, 8, R); // neck
  for (let i = 0; i < 4; i++) p.ell(46 - i * 6, 58 - i * 9, 3, 2.4, B[1]);
  p.sell(20, 20, 13, 10, R); poly(p, [[0, 20], [14, 14], [18, 30], [2, 28]], R); // head and long jaw
  p.rect(1, 25, 16, 2, '#3a0a1a'); teeth(p, 2, 24, 15, '#fff', 3, 3); p.ell(3, 19, 1.6, 1.2, OL);
  glowEye(p, 16, 15, c.eye || '#ffe03a', 4, 3); p.set(17, 15, OL);
  chain(p, [[22, 12], [30, 4], [40, 2]], 2.6, 1, H); chain(p, [[26, 14], [36, 10], [44, 10]], 2.2, 0.8, H); // swept horns
  // near wing folded up over the back
  poly(p, [[62, 48], [70, 18], [88, 8], [84, 22], [92, 30], [78, 36], [80, 50]], W); limb(p, 64, 46, 88, 8, 2.4, 1.4, W[2]); limb(p, 66, 46, 92, 30, 1.6, 1, W[2]);
  return p.outline();
};
// ---------------------------------------------------------------- people and things that walk upright
M.goblin = (c) => {
  const p = P(46, 54), S = ramp(c.body), C = ramp(c.cloth || '#7a5a3a');
  limb(p, 19, 38, 18, 50, 3.4, 3, S); limb(p, 27, 38, 29, 50, 3.4, 3, S); p.rect(14, 49, 8, 3, '#4a3020'); p.rect(26, 49, 8, 3, '#4a3020');
  p.sell(23, 32, 9, 9, S); poly(p, [[14, 32], [32, 32], [34, 42], [12, 42]], C); limb(p, 13, 33, 33, 33, 1, 1, '#4a3020'); // pot belly and loincloth
  limb(p, 32, 26, 37, 36, 3, 2.6, S); limb(p, 14, 26, 9, 34, 3, 2.6, S);
  chain(p, [[8, 36], [6, 22], [4, 12]], 1.6, 1.6, ramp('#8a5a2a')); p.sell(4, 10, 4, 6, ramp('#8a5a2a')); for (const y of [6, 10, 14]) p.set(1, y, '#c8c8c8'); // spiked club
  p.sell(23, 15, 11, 10, S);
  poly(p, [[13, 14], [1, 8], [12, 19]], S); poly(p, [[33, 14], [45, 8], [34, 19]], S); // long pointed ears
  glowEye(p, 17, 13, c.eye || '#ffe03a', 3, 3); glowEye(p, 26, 13, c.eye || '#ffe03a', 3, 3); p.set(18, 14, OL); p.set(27, 14, OL);
  p.sell(22, 18, 2.6, 2.4, ramp(shade(c.body, -0.15))); // big nose
  p.rect(17, 22, 11, 1, '#3a1a1a'); p.set(18, 23, '#fff'); p.set(26, 23, '#fff');
  if (c.hat) { poly(p, [[12, 8], [23, 0], [34, 8]], ramp(c.hat)); p.rect(10, 7, 26, 2, shade(c.hat, -0.3)); }
  return p.outline();
};
M.ogre = (c) => {
  const p = P(62, 78), S = ramp(c.body), C = ramp(c.cloth || '#6a4a2a');
  limb(p, 22, 56, 20, 74, 6, 5, S); limb(p, 40, 56, 42, 74, 6, 5, S); p.rect(13, 73, 14, 4, '#3a2a1a'); p.rect(36, 73, 14, 4, '#3a2a1a');
  p.sell(31, 44, 21, 18, S); poly(p, [[12, 50], [50, 50], [52, 62], [10, 62]], C);
  limb(p, 50, 30, 56, 54, 7, 6, S); p.sell(56, 56, 6, 5, S);
  limb(p, 12, 30, 7, 50, 7, 6, S); p.sell(7, 52, 6, 5, S);
  chain(p, [[7, 50], [4, 28], [2, 10]], 2.6, 2.6, ramp('#6a4a2a')); p.sell(4, 8, 6, 9, ramp('#7a5a3a')); for (let i = 0; i < 4; i++) p.set(0 + (i % 2) * 8, 3 + i * 4, '#d8d8d8');
  p.sell(31, 18, 12, 12, S); p.sell(31, 26, 9, 5, S);
  if (c.oneEye) { eye(p, 31, 16, 5, '#e8302a'); } else { glowEye(p, 24, 15, c.eye || '#ffe03a', 4, 3); glowEye(p, 34, 15, c.eye || '#ffe03a', 4, 3); }
  limb(p, 23, 11, 29, 13, 1, 1, S[2]); limb(p, 33, 13, 39, 11, 1, 1, S[2]); // heavy brow
  p.rect(23, 26, 16, 2, '#3a1a1a'); poly(p, [[24, 26], [26, 21], [28, 26]], '#f4f0d8'); poly(p, [[34, 26], [36, 21], [38, 26]], '#f4f0d8'); // tusks
  if (c.horn) { chain(p, [[22, 8], [16, 2], [12, 0]], 2.4, 1, ramp(c.horn)); chain(p, [[40, 8], [46, 2], [50, 0]], 2.4, 1, ramp(c.horn)); }
  return p.outline();
};
M.imp = (c) => {
  const p = P(50, 50), R = ramp(c.body), W = ramp(c.wing || shade(c.body, -0.3));
  for (const s of [-1, 1]) { const X = (x) => 25 + s * x; poly(p, [[X(3), 18], [X(12), 4], [X(22), 2], [X(20), 12], [X(16), 10], [X(14), 20], [X(8), 16]], W); limb(p, X(3), 18, X(22), 2, 1, 0.6, W[2]); }
  chain(p, [[30, 36], [40, 40], [44, 46]], 1.6, 1, R); poly(p, [[42, 44], [48, 44], [45, 49]], R); // pointed tail
  limb(p, 22, 36, 20, 47, 2.6, 2, R); limb(p, 28, 36, 30, 47, 2.6, 2, R);
  p.sell(25, 30, 8, 9, R);
  p.sell(25, 15, 8, 8, R);
  chain(p, [[20, 9], [16, 3], [17, 0]], 2, 0.8, R[2]); chain(p, [[30, 9], [34, 3], [33, 0]], 2, 0.8, R[2]); // horns
  glowEye(p, 20, 13, c.eye || '#ffe03a', 3, 2); glowEye(p, 27, 13, c.eye || '#ffe03a', 3, 2);
  limb(p, 20, 20, 30, 19, 0.8, 0.8, '#1c1424'); p.set(22, 21, '#fff'); p.set(28, 20, '#fff'); // grin
  limb(p, 18, 28, 10, 34, 2.4, 2, R);
  chain(p, [[10, 46], [10, 12]], 1, 1, '#8a8a9a'); for (const x of [6, 10, 14]) limb(p, x, 12, x, 6, 1, 0.5, '#d8d8e8'); limb(p, 6, 12, 14, 12, 1, 1, '#d8d8e8'); // trident
  return p.outline();
};
M.gargoyle = (c) => {
  const p = P(62, 62), R = ramp(c.body || '#7a7a8a'), W = ramp(shade(c.body || '#7a7a8a', -0.25));
  for (const s of [-1, 1]) { const X = (x) => 31 + s * x; poly(p, [[X(4), 24], [X(14), 6], [X(28), 2], [X(26), 14], [X(22), 12], [X(20), 24], [X(14), 20], [X(10), 30]], W); for (const [x, y] of [[28, 2], [22, 12], [14, 20]]) limb(p, X(5), 22, X(x), y, 1.2, 0.6, W[2]); }
  limb(p, 24, 46, 20, 58, 4, 3, R); limb(p, 38, 46, 42, 58, 4, 3, R); for (const x of [14, 38]) p.rect(x, 57, 10, 3, R[2]);
  p.sell(31, 38, 11, 12, R); for (let i = 0; i < 3; i++) limb(p, 25, 34 + i * 4, 37, 34 + i * 4, 0.6, 0.6, R[2]); // stone ribs
  limb(p, 21, 32, 14, 46, 3.4, 2.6, R); limb(p, 41, 32, 48, 46, 3.4, 2.6, R);
  for (const x of [12, 46]) for (const d of [-2, 0, 2]) p.set(x + d, 48, '#d8d8d8');
  p.sell(29, 18, 9, 8, R); poly(p, [[18, 18], [24, 16], [24, 24], [19, 23]], R); // snout
  chain(p, [[24, 12], [20, 4], [22, 0]], 2.2, 0.8, R[0]); chain(p, [[34, 12], [38, 4], [36, 0]], 2.2, 0.8, R[2]);
  glowEye(p, 24, 16, c.eye || '#ff4a3a', 3, 2); glowEye(p, 31, 16, c.eye || '#ff4a3a', 3, 2);
  p.rect(19, 22, 9, 1, '#1c1424'); p.set(21, 23, '#fff'); p.set(25, 23, '#fff');
  return p.outline();
};
M.skeleton = (c) => {
  const p = P(46, 62), B = ramp(c.body || '#e8e4d8');
  if (c.robe) { poly(p, [[12, 22], [34, 22], [38, 58], [8, 58]], ramp(c.robe)); poly(p, [[10, 2], [36, 2], [38, 18], [8, 18]], ramp(c.robe)); }
  limb(p, 20, 42, 18, 60, 1.6, 1.4, B); limb(p, 26, 42, 28, 60, 1.6, 1.4, B); p.ell(18, 51, 2.2, 1.8, B[0]); p.ell(28, 51, 2.2, 1.8, B[0]); // legs with knees
  p.rect(14, 59, 7, 2, B[2]); p.rect(26, 59, 7, 2, B[2]);
  poly(p, [[15, 38], [31, 38], [29, 44], [17, 44]], B); // pelvis
  limb(p, 23, 22, 23, 39, 1.4, 1.4, B[1]); // spine
  for (let i = 0; i < 4; i++) limb(p, 15 + i * 0.5, 24 + i * 3.4, 31 - i * 0.5, 24 + i * 3.4, 1, 1, B[i % 2]); // ribs
  limb(p, 14, 22, 9, 34, 1.6, 1.4, B); limb(p, 32, 22, 37, 34, 1.6, 1.4, B); limb(p, 9, 34, 6, 40, 1.4, 1.2, B); limb(p, 37, 34, 38, 42, 1.4, 1.2, B);
  chain(p, [[6, 42], [4, 30], [2, 14]], 1.4, 1, ramp('#d8e0ec')); limb(p, 1, 42, 10, 40, 1, 1, '#8a6a3a'); // sword
  p.sell(23, 11, 9, 9, B); poly(p, [[16, 15], [30, 15], [28, 22], [18, 22]], B);
  p.ell(19, 11, 2.8, 3, OL); p.ell(27, 11, 2.8, 3, OL); p.set(19, 11, c.eye || '#ff4a4a'); p.set(27, 11, c.eye || '#ff4a4a');
  poly(p, [[22, 15], [24, 15], [23, 17]], OL); for (let x = 18; x <= 28; x += 2) p.set(x, 20, OL); // nose hole and teeth
  if (c.armor) { const A = ramp(c.armor); poly(p, [[13, 22], [33, 22], [31, 34], [15, 34]], A); poly(p, [[13, 1], [33, 1], [34, 8], [12, 8]], A); }
  if (c.robe) poly(p, [[10, 2], [36, 2], [36, 7], [10, 7]], ramp(c.robe));
  return p.outline();
};
M.mummy = (c) => {
  const p = P(42, 62), R = ramp(c.body || '#d8ccb0');
  limb(p, 17, 40, 16, 59, 4, 3.4, R); limb(p, 25, 40, 27, 59, 4, 3.4, R);
  poly(p, [[11, 20], [31, 20], [30, 42], [12, 42]], R);
  limb(p, 12, 22, 2, 25, 3.4, 3, R); limb(p, 30, 22, 20, 26, 3.4, 3, R); // arms held out in front
  p.sell(21, 11, 9, 10, R);
  for (let i = 0; i < 13; i++) { const y = 4 + i * 4.3; for (let x = 0; x < 42; x++) { const yy = y + (x - 21) * (i % 2 ? 0.12 : -0.1); if (p.get(x, Math.round(yy)) && rnd() < 0.85) p.set(x, yy, R[2]); } } // the wrappings, crossing this way and that
  chain(p, [[30, 34], [36, 40], [34, 48]], 1.4, 1, R[1]); // a loose strip
  p.rect(14, 10, 14, 3, '#1c1424'); glowEye(p, 16, 10, c.eye || '#ffe03a', 3, 2); glowEye(p, 24, 10, c.eye || '#ffe03a', 3, 2);
  if (c.crown) { poly(p, [[11, 6], [31, 6], [30, 0], [12, 0]], ramp('#e8c050')); for (let x = 12; x < 31; x += 4) p.rect(x, 2, 2, 2, '#3a5aa8'); }
  return p.outline();
};
M.mage = (c) => {
  const p = P(46, 62), R = ramp(c.body), T = c.trim;
  chain(p, [[38, 60], [39, 30], [40, 12]], 1.4, 1.4, ramp('#8a5a2a')); p.sell(40, 8, 4.5, 4.5, ramp(c.orb || '#c04aff')); p.set(39, 6, '#fff'); // staff and orb
  poly(p, [[12, 20], [34, 20], [38, 58], [6, 58]], R); p.rect(5, 57, 34, 3, R[2]);
  for (let i = 0; i < 4; i++) limb(p, 12 + i * 6, 30, 10 + i * 7, 56, 0.6, 0.6, R[2]); // folds
  limb(p, 30, 24, 38, 32, 4, 3.4, R); p.sell(38, 32, 2.6, 2.6, ramp('#c8a090'));
  poly(p, [[10, 22], [14, 4], [23, 0], [32, 4], [36, 22]], R); // pointed hood
  p.ell(22, 14, 7, 7, '#120a1a'); glowEye(p, 18, 13, c.eye || '#ffe03a', 2, 2); glowEye(p, 24, 13, c.eye || '#ffe03a', 2, 2);
  if (T) { p.rect(12, 20, 22, 2, T); p.rect(21, 22, 3, 36, T); limb(p, 11, 22, 15, 4, 0.8, 0.8, T); }
  return p.outline();
};
M.lord = (c) => {
  const p = P(96, 112), R = ramp(c.body), T = ramp(c.trim || '#c8a0ff'), H = ramp(c.halo || '#8ae0ff');
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, x = 48 + Math.cos(a) * 38, y = 30 + Math.sin(a) * 24; poly(p, [[x, y - 6], [x + 3, y], [x, y + 6], [x - 3, y]], H); } // halo of broken crystal
  poly(p, [[26, 40], [70, 40], [80, 108], [16, 108]], R); p.rect(14, 106, 68, 4, R[2]);
  for (let i = 0; i < 5; i++) limb(p, 30 + i * 9, 50, 24 + i * 12, 104, 0.8, 0.8, R[2]);
  poly(p, [[22, 40], [30, 34], [40, 42], [36, 50], [18, 50]], T); poly(p, [[74, 40], [66, 34], [56, 42], [60, 50], [78, 50]], T); // pauldrons
  limb(p, 22, 46, 12, 76, 7, 6, R); limb(p, 74, 46, 84, 76, 7, 6, R);
  p.sell(12, 80, 5, 5, ramp('#c8b8d8')); p.sell(84, 80, 5, 5, ramp('#c8b8d8'));
  poly(p, [[34, 34], [36, 12], [48, 6], [60, 12], [62, 34]], R); p.ell(48, 24, 10, 10, '#0a0612');
  glowEye(p, 42, 22, c.eye || '#ff3a6a', 4, 3); glowEye(p, 51, 22, c.eye || '#ff3a6a', 4, 3);
  poly(p, [[36, 12], [38, 0], [42, 8], [48, 0], [54, 8], [58, 0], [60, 12]], T); // crown
  p.rect(46, 44, 4, 60, T[1]); p.sell(48, 72, 7, 7, ramp('#ff3a6a')); p.set(46, 69, '#fff');
  return p.outline();
};
// ---------------------------------------------------------------- plants and fungi
M.plant = (c) => {
  const p = P(54, 58), L = ramp(c.leaf || '#4a9a3a'), F = ramp(c.body);
  for (const [a, b] of [[[27, 54], [8, 44]], [[27, 54], [46, 46]], [[27, 50], [4, 34]], [[27, 50], [50, 36]]]) { poly(p, [[a[0], a[1]], [(a[0] + b[0]) / 2, b[1] - 6], [b[0], b[1]], [(a[0] + b[0]) / 2, b[1] + 3]], L); }
  chain(p, [[27, 56], [26, 44], [30, 34], [27, 26]], 3, 2.4, L);
  // a snapping mouth: two jaws with teeth, open toward the left
  poly(p, [[30, 22], [10, 6], [2, 12], [8, 20]], F); poly(p, [[30, 24], [8, 26], [4, 34], [14, 36]], F);
  p.sell(32, 22, 10, 9, F);
  poly(p, [[8, 18], [26, 22], [10, 28]], '#4a0a1a');
  for (let i = 0; i < 5; i++) { p.set(6 + i * 4, 15 + i * 1.2, '#fff'); p.set(7 + i * 4, 16 + i * 1.2, '#fff'); p.set(8 + i * 4, 31 - i * 1.4, '#fff'); p.set(8 + i * 4, 30 - i * 1.4, '#fff'); }
  for (let i = 0; i < 7; i++) p.ell(26 + Math.cos(i) * 8, 20 + Math.sin(i) * 7, 1.2, 1.2, c.spot || '#ffe0a0');
  return p.outline();
};
M.tree = (c) => {
  const p = P(88, 100), L = ramp(c.leaf || '#3a7a3a'), B = ramp(c.body || '#6a4a2a');
  for (let i = 0; i < 22; i++) p.sell(10 + rnd() * 68, 8 + rnd() * 30, 9, 8, L);
  p.sell(44, 26, 36, 22, L); for (let i = 0; i < 40; i++) { const x = 10 + rnd() * 68, y = 6 + rnd() * 40; if (p.get(x | 0, y | 0)) p.set(x, y, L[rnd() < 0.5 ? 0 : 2]); }
  if (c.fruit) for (let i = 0; i < 8; i++) p.sell(14 + rnd() * 60, 12 + rnd() * 28, 2.6, 2.6, ramp(c.fruit));
  poly(p, [[30, 46], [58, 46], [62, 92], [26, 92]], B);
  for (let i = 0; i < 5; i++) limb(p, 32 + i * 6, 48, 30 + i * 7, 90, 0.6, 0.6, B[2]); // bark grooves
  chain(p, [[30, 58], [16, 50], [6, 40], [2, 30]], 5, 2, B); chain(p, [[58, 56], [72, 48], [82, 40]], 5, 2, B); // branch arms
  for (const [x, y] of [[2, 30], [82, 40]]) for (let i = 0; i < 3; i++) limb(p, x, y, x - 4 + i * 4, y - 8, 1.2, 0.6, B[1]);
  chain(p, [[30, 90], [18, 96], [10, 98]], 4, 2, B); chain(p, [[58, 90], [70, 96], [80, 98]], 4, 2, B); chain(p, [[44, 92], [44, 99]], 4, 3, B); // roots
  p.ell(37, 60, 4, 3.4, '#120a0a'); p.ell(51, 60, 4, 3.4, '#120a0a'); glowEye(p, 36, 59, c.eye || '#ffcf3a', 2, 2); glowEye(p, 50, 59, c.eye || '#ffcf3a', 2, 2);
  poly(p, [[34, 72], [54, 72], [50, 78], [38, 78]], '#120a0a');
  return p.outline();
};
M.mushroom = (c) => {
  const p = P(48, 54), C = ramp(c.body || '#d84a4a'), S = ramp('#f4e8d0');
  limb(p, 18, 44, 14, 52, 3, 2.6, S); limb(p, 30, 44, 34, 52, 3, 2.6, S);
  poly(p, [[16, 24], [32, 24], [34, 46], [14, 46]], S);
  for (let i = 0; i < 5; i++) limb(p, 14 + i * 5, 26, 15 + i * 4.5, 27, 0.6, 0.6, S[2]); // gills under the cap
  p.sell(24, 18, 23, 13, C); p.rect(2, 24, 44, 3, C[2]);
  for (const [x, y, r] of [[13, 13, 3.4], [25, 8, 3], [36, 15, 3.4], [19, 20, 2.4], [7, 20, 2], [31, 21, 2]]) p.sell(x, y, r, r * 0.8, ramp(c.spot || '#fff4e8'));
  p.rect(18, 33, 3, 4, OL); p.rect(27, 33, 3, 4, OL); p.set(18, 33, '#fff'); p.set(27, 33, '#fff'); p.ell(24, 41, 2.6, 1.6, '#6a2a2a');
  limb(p, 14, 30, 8, 38, 2, 1.6, S); limb(p, 34, 30, 40, 38, 2, 1.6, S);
  return p.outline();
};
M.cactus = (c) => {
  const p = P(42, 58), R = ramp(c.body || '#5ab84a');
  limb(p, 17, 48, 13, 56, 3, 2.6, R); limb(p, 25, 48, 29, 56, 3, 2.6, R);
  chain(p, [[21, 50], [21, 26], [21, 12]], 7.5, 7, R);
  chain(p, [[15, 32], [7, 30], [5, 22], [5, 14]], 3.6, 3.4, R); chain(p, [[27, 36], [35, 34], [37, 26], [37, 20]], 3.6, 3.4, R); // arms
  for (let i = 0; i < 4; i++) limb(p, 16 + i * 3.3, 10, 16 + i * 3.3, 50, 0.5, 0.5, R[2]); // ribs
  for (let i = 0; i < 16; i++) { const x = (i % 2 ? 13 : 29) + (rnd() - 0.5) * 2, y = 10 + i * 2.6; p.set(x, y, '#f4f0c8'); p.set(x + (i % 2 ? -1 : 1), y - 1, '#f4f0c8'); } // spines
  p.rect(16, 18, 3, 4, OL); p.rect(24, 18, 3, 4, OL); p.ell(21, 27, 2.4, 3, OL);
  if (c.flower) { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; p.sell(21 + Math.cos(a) * 3, 4 + Math.sin(a) * 2.4, 2.4, 2, ramp(c.flower)); } p.ell(21, 4, 1.4, 1.4, '#ffe04a'); }
  return p.outline();
};
// ---------------------------------------------------------------- odd things
M.bomb = (c) => {
  const p = P(50, 50), R = ramp(c.body || '#ff8a3a'), F = ramp(c.flame || '#ffe04a');
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; limb(p, 25 + Math.cos(a) * 12, 26 + Math.sin(a) * 12, 25 + Math.cos(a) * 24, 26 + Math.sin(a) * 23, 3.4, 0.6, F); } // flame halo
  p.sell(25, 26, 17, 17, R); p.sell(19, 19, 4, 4, ramp(shade(c.body || '#ff8a3a', 0.5)));
  p.rect(16, 22, 4, 6, OL); p.rect(29, 22, 4, 6, OL); p.set(16, 22, '#fff'); p.set(29, 22, '#fff');
  poly(p, [[17, 32], [33, 32], [30, 38], [20, 38]], '#3a0a1a'); teeth(p, 19, 32, 31, '#fff', 0, 3);
  return p.outline();
};
M.eye = (c) => {
  const p = P(58, 54), R = ramp(c.body || '#c86a8a'), W = ramp(c.wing || '#6a3a5a');
  for (const s of [-1, 1]) { const X = (x) => 29 + s * x; poly(p, [[X(8), 18], [X(18), 4], [X(28), 2], [X(26), 14], [X(20), 12], [X(18), 24]], W); limb(p, X(8), 18, X(28), 2, 1, 0.6, W[2]); }
  for (let t = 0; t < 5; t++) { const pts = []; for (let i = 0; i <= 5; i++) pts.push([17 + t * 6 + Math.sin(i + t) * 2.4, 34 + i * 3.6]); chain(p, pts, 2.2, 0.8, R); } // dangling feelers
  p.sell(29, 24, 15, 15, R);
  p.sell(28, 24, 11, 10, ramp('#fff8f0'));
  for (const [x0, y0, x1, y1] of [[18, 20], [20, 30], [38, 18], [36, 30]].map(([x, y]) => [x, y, x + (x < 28 ? 4 : -4), y + (y < 24 ? 2 : -2)])) limb(p, x0, y0, x1, y1, 0.5, 0.5, '#e86a6a'); // veins
  p.sell(26, 24, 6, 6, ramp(c.iris || '#e8302a')); p.ell(26, 24, 2.4, 4, OL); p.set(24, 21, '#fff'); p.set(25, 21, '#fff');
  return p.outline();
};
M.mimic = (c) => {
  const p = P(54, 50), R = ramp(c.body || '#8a5a2a'), Mt = ramp(c.metal || '#e8c050');
  poly(p, [[4, 26], [50, 26], [50, 48], [4, 48]], R); p.rect(4, 34, 46, 3, Mt[1]); poly(p, [[23, 31], [31, 31], [31, 40], [23, 40]], Mt);
  for (const x of [4, 47]) p.rect(x, 26, 3, 22, Mt[2]);
  poly(p, [[6, 16], [10, 4], [44, 4], [48, 16]], R); p.rect(6, 4, 38, 2, Mt[0]); for (const x of [6, 45]) p.rect(x, 4, 3, 12, Mt[2]); // the lid, thrown open
  poly(p, [[6, 16], [48, 16], [50, 26], [4, 26]], '#3a0a1a');
  for (let i = 0; i < 8; i++) { poly(p, [[8 + i * 5, 16], [10 + i * 5, 21], [12 + i * 5, 16]], '#fff'); poly(p, [[8 + i * 5, 26], [10 + i * 5, 21], [12 + i * 5, 26]], '#f4f0e0'); }
  chain(p, [[14, 24], [8, 30], [4, 40], [8, 46]], 3.4, 2, ramp('#e85a8a')); // long tongue
  glowEye(p, 16, 9, c.eye || '#ffe03a', 4, 3); glowEye(p, 34, 9, c.eye || '#ffe03a', 4, 3);
  return p.outline();
};
M.golem = (c) => {
  const p = P(68, 76), R = ramp(c.body), D = ramp(shade(c.body, -0.15));
  poly(p, [[18, 54], [30, 54], [30, 74], [16, 74]], R); poly(p, [[38, 54], [50, 54], [52, 74], [38, 74]], R);
  poly(p, [[12, 24], [56, 24], [54, 58], [14, 58]], R);
  poly(p, [[0, 26], [14, 24], [14, 54], [2, 54]], R); poly(p, [[54, 24], [68, 26], [66, 54], [54, 54]], R); // great arms
  poly(p, [[0, 52], [15, 52], [15, 62], [0, 62]], D); poly(p, [[53, 52], [68, 52], [68, 62], [53, 62]], D); // fists
  poly(p, [[22, 6], [46, 6], [46, 26], [22, 26]], R);
  glowEye(p, 26, 14, c.eye || '#5affe0', 6, 3); glowEye(p, 37, 14, c.eye || '#5affe0', 6, 3);
  for (const pts of [[[20, 30], [26, 38], [24, 46]], [[46, 28], [40, 36], [44, 44]], [[4, 32], [8, 40]], [[60, 34], [64, 44]], [[30, 8], [32, 14]]]) chain(p, pts, 0.8, 0.6, R[2]); // cracks
  for (const [y] of [[24], [54]]) limb(p, 12, y, 56, y, 0.7, 0.7, R[2]);
  if (c.moss) { for (const [x0, x1, y] of [[22, 46, 6], [12, 30, 24], [54, 62, 26]]) for (let x = x0; x < x1; x++) { p.set(x, y, c.moss); if (rnd() < 0.5) p.set(x, y + 1, c.moss); } }
  if (c.core) { p.sell(34, 40, 6, 6, ramp(c.core)); p.set(32, 38, '#fff'); }
  return p.outline();
};
M.mech = (c) => {
  const p = P(72, 68), R = ramp(c.body), Mt = ramp('#b8c4d4');
  poly(p, [[20, 48], [30, 48], [30, 62], [20, 62]], R); poly(p, [[42, 48], [52, 48], [52, 62], [42, 62]], R); p.rect(17, 62, 16, 4, '#3a3a4a'); p.rect(39, 62, 16, 4, '#3a3a4a');
  poly(p, [[16, 16], [56, 16], [56, 48], [16, 48]], R);
  p.rect(22, 22, 28, 12, '#1c2a3a'); glowEye(p, 26, 25, c.eye || '#ff4a3a', 7, 6); glowEye(p, 39, 25, c.eye || '#ff4a3a', 7, 6); // visor
  for (let i = 0; i < 5; i++) p.rect(22 + i * 6, 39, 3, 5, '#e8c050'); // grille lights
  limb(p, 14, 22, 6, 40, 4, 4, R); limb(p, 58, 22, 66, 40, 4, 4, R);
  poly(p, [[0, 40], [12, 40], [12, 46], [0, 46]], Mt); poly(p, [[60, 40], [72, 40], [72, 46], [60, 46]], Mt); // pincer hands
  for (const [x, y] of [[18, 18], [53, 18], [18, 45], [53, 45]]) p.ell(x, y, 1.4, 1.4, Mt[0]); // rivets
  limb(p, 36, 16, 36, 4, 1, 1, '#888'); p.ell(36, 3, 2.4, 2.4, '#ff4a3a');
  return p.outline();
};

for (const [k, f] of Object.entries(M)) registerMonster(k, f);
