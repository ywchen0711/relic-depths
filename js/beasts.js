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
  // a spirit with a body of its own element: the upper half is a figure, the lower half is the element itself
  const p = P(56, 64), body = c.body || '#ff6a2a', R = ramp(body), L = ramp(shade(body, 0.45)), D = ramp(shade(body, -0.3));
  const hue = (() => { const n = parseInt(body.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 30) return mx > 200 ? 'light' : 'earth'; const h = mx === r ? ((g - b) / (mx - mn) + 6) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4; return h < 0.7 ? 'fire' : h < 1.3 ? 'thunder' : h < 2.6 ? 'wind' : h < 3.4 ? 'ice' : h < 4.3 ? 'water' : 'dark'; })();
  const el = c.rock ? 'earth' : c.elem || hue, core = shade(body, 0.75);
  const eyes = (col = '#ffffff') => { poly(p, [[20, 17], [25, 18], [24, 20], [20, 19]], col); poly(p, [[32, 17], [27, 18], [28, 20], [32, 19]], col); };
  // the figure: head, shoulders, arms reaching out
  const figure = (T = R, arms = true) => {
    poly(p, [[17, 25], [35, 25], [37, 30], [33, 42], [19, 42], [15, 30]], T);
    if (arms) { chain(p, [[17, 27], [9, 33], [5, 28]], 3.4, 2.2, T); chain(p, [[35, 27], [43, 33], [47, 28]], 3.4, 2.2, T); }
    p.sell(26, 16, 8, 9, T);
  };
  if (el === 'fire') {
    // the lower half is a single flame narrowing to a point; tongues of fire lick up from the hips and the head
    const Y = ramp('#ffe86a'), flame = (pts, r, T) => chain(p, pts, r, 0.5, T);
    for (const s of [-1, 1]) { flame([[26 + s * 6, 46], [26 + s * 14, 40], [26 + s * 18, 30], [26 + s * 16, 22]], 4.5, R); flame([[26 + s * 6, 52], [26 + s * 16, 50], [26 + s * 22, 42]], 3.4, R); }
    flame([[26, 38], [24, 48], [28, 56], [24, 63]], 10, R); flame([[26, 40], [25, 48], [27, 55]], 6, L); flame([[26, 42], [26, 49]], 3, Y);
    for (let i = 0; i < 7; i++) { const a = -2.5 + i * 0.32, r = i % 2 ? 13 : 17; chain(p, [[26 + Math.cos(a) * 5, 12 + Math.sin(a) * 5], [26 + Math.cos(a) * r * 0.6 + Math.sin(i) * 2, 12 + Math.sin(a) * r * 0.6], [26 + Math.cos(a - 0.15) * r, 12 + Math.sin(a - 0.15) * r]], 3.4, 0.4, i % 2 ? L : R); } // burning hair
    figure(R); p.sell(26, 33, 6, 6.5, L); p.sell(26, 33, 3, 3.4, Y); // glowing chest
    for (const [x, y] of [[5, 28], [47, 28]]) for (let i = 0; i < 3; i++) chain(p, [[x, y], [x + (i - 1) * 2, y - 6], [x + (i - 1) * 4, y - 11]], 2.2, 0.4, i === 1 ? L : R); // hands on fire
    for (const [x, y] of [[6, 52], [46, 56], [10, 8], [44, 10], [40, 46]]) { p.set(x, y, Y[0]); p.set(x, y + 1, R[1]); } // embers
    eyes('#fffbe0'); p.rect(21, 18, 3, 1, D[2]); p.rect(28, 18, 3, 1, D[2]);
    return p.outline(shade(body, -0.55));
  }
  if (el === 'water') {
    chain(p, [[26, 42], [24, 50], [14, 56], [6, 52], [8, 44], [14, 46]], 7, 2, R); chain(p, [[26, 42], [32, 52], [44, 58], [52, 52], [48, 44], [42, 46]], 7, 2, R); // a wave curling both ways
    p.sell(28, 58, 18, 5, R); for (let i = 0; i < 6; i++) poly(p, [[10 + i * 7, 56], [14 + i * 7, 52], [17 + i * 7, 56]], L);
    chain(p, [[32, 10], [40, 14], [44, 24], [48, 36]], 4, 1.4, D); chain(p, [[20, 10], [12, 16], [10, 26]], 3.4, 1.2, D); // flowing hair
    figure(R);
    for (const [x, y] of [[20, 30], [24, 34], [30, 28], [28, 38]]) p.set(x, y, L[0]);
    chain(p, [[19, 9], [22, 7], [27, 7]], 1, 0.6, '#ffffff'); chain(p, [[18, 30], [18, 38]], 0.8, 0.6, L[0]);
    for (const [x, y, r] of [[4, 18, 2.2], [50, 16, 1.8], [8, 8, 1.4], [46, 6, 1.2]]) { p.sell(x, y, r, r * 1.3, L); p.set(x - 0.5, y - 1, '#ffffff'); } // droplets
    eyes(); p.rect(22, 18, 2, 2, c.eye || '#1a4a8a'); p.rect(28, 18, 2, 2, c.eye || '#1a4a8a');
    return p.outline(shade(body, -0.55));
  }
  if (el === 'wind') {
    for (let i = 0; i < 6; i++) { const y = 42 + i * 3.6, w = 14 - i * 2.2; p.sell(26 + Math.sin(i * 1.3) * 3, y, w, 2.6, i % 2 ? R : L); } // the whirlwind below
    for (let i = 0; i < 5; i++) chain(p, [[10 + i * 2, 42 + i * 4], [26, 46 + i * 4], [40 - i * 2, 42 + i * 4]], 0.6, 0.6, D[1]);
    chain(p, [[30, 9], [42, 8], [52, 4]], 3, 0.8, L); chain(p, [[32, 14], [44, 16], [54, 12]], 2.6, 0.6, L); chain(p, [[30, 18], [40, 22], [50, 22]], 2, 0.5, L); // hair streaming in the wind
    figure(R);
    for (const [x, y] of [[4, 40], [48, 44], [8, 52], [44, 34]]) { poly(p, [[x, y], [x + 3, y - 2], [x + 5, y], [x + 2, y + 2]], ramp('#6ac84a')); } // leaves caught up in it
    chain(p, [[2, 22], [10, 18], [16, 22]], 0.7, 0.5, L[0]); chain(p, [[38, 50], [46, 48], [52, 52]], 0.7, 0.5, L[0]);
    eyes(); p.rect(21, 18, 2, 1, '#1a6a4a'); p.rect(29, 18, 2, 1, '#1a6a4a');
    return p.outline(shade(body, -0.6));
  }
  if (el === 'earth') {
    const Rk = ramp(c.rock || shade(body, -0.25)), glow = c.eye || '#ffb03a';
    const rock = (x, y, w, h, T = Rk) => poly(p, [[x - w, y - h * 0.3], [x - w * 0.5, y - h], [x + w * 0.6, y - h * 0.9], [x + w, y - h * 0.1], [x + w * 0.7, y + h], [x - w * 0.6, y + h * 0.9]], T);
    for (const [x, y, w, h] of [[12, 58, 9, 5], [26, 59, 11, 5], [41, 58, 9, 5]]) rock(x, y, w, h); // rubble it stands in
    rock(26, 46, 12, 9, R); rock(26, 32, 14, 9, R); // hips and chest
    chain(p, [[14, 28], [8, 36], [6, 44]], 4, 4, Rk); chain(p, [[38, 28], [44, 36], [46, 44]], 4, 4, Rk); rock(6, 47, 6, 5, R); rock(46, 47, 6, 5, R); // arms and boulder fists
    rock(12, 25, 6, 5, Rk); rock(40, 25, 6, 5, Rk); // shoulders
    rock(26, 15, 8, 8, R); // head
    for (const pts of [[[22, 28], [26, 33], [24, 38], [28, 42]], [[30, 30], [34, 36]], [[20, 44], [24, 48]], [[4, 46], [8, 49]]]) chain(p, pts, 0.7, 0.7, glow); // glowing cracks
    p.rect(21, 15, 3, 2, glow); p.rect(28, 15, 3, 2, glow); p.set(21, 15, '#fff8c0'); p.set(28, 15, '#fff8c0');
    spots(p, 16, 4, 6, 46, 54, Rk[2], true);
    return p.outline();
  }
  if (el === 'ice') {
    const shard = (x, y, w, h, lean = 0) => { poly(p, [[x - w, y], [x + lean - w * 0.2, y - h], [x + lean, y - h - 3], [x, y + 2]], L); poly(p, [[x, y + 2], [x + lean, y - h - 3], [x + lean + w * 0.3, y - h], [x + w, y]], D); };
    for (const [x, y, w, h, l] of [[10, 62, 5, 10, -3], [42, 62, 5, 12, 3], [18, 62, 6, 16, -1], [34, 62, 6, 15, 2], [26, 62, 7, 20, 0]]) shard(x, y, w, h, l); // crystals growing up from the ground
    figure(R);
    for (const [x, y, h] of [[18, 10, 6], [22, 7, 9], [26, 5, 12], [30, 7, 9], [34, 10, 6]]) shard(x, y, 2, h); // a crown of ice
    poly(p, [[26, 28], [30, 33], [26, 40], [22, 33]], L); p.set(25, 31, '#ffffff'); // a crystal heart
    for (const [x, y] of [[4, 20], [48, 22], [6, 10], [46, 8]]) { poly(p, [[x, y - 3], [x + 1.5, y], [x, y + 3], [x - 1.5, y]], L); }
    eyes('#e8fcff'); p.rect(21, 18, 2, 1, c.eye || '#2a6aa8'); p.rect(29, 18, 2, 1, c.eye || '#2a6aa8');
    return p.outline(shade(body, -0.6));
  }
  if (el === 'thunder') {
    const C = ramp('#6a6a8a');
    for (const [x, y, r] of [[12, 54, 8], [24, 56, 10], [38, 54, 9], [30, 50, 8], [18, 49, 7]]) p.sell(x, y, r, r * 0.7, C); // a storm cloud below
    for (let i = 0; i < 9; i++) { const a = -2.9 + i * 0.36, r = i % 2 ? 12 : 16; poly(p, [[26 + Math.cos(a - 0.2) * 6, 14 + Math.sin(a - 0.2) * 6], [26 + Math.cos(a) * r, 14 + Math.sin(a) * r], [26 + Math.cos(a + 0.2) * 6, 14 + Math.sin(a + 0.2) * 6]], R); } // hair standing up
    figure(R); poly(p, [[19, 40], [33, 40], [28, 48], [24, 48]], R);
    const bolt = (pts) => { chain(p, pts, 1.3, 1.3, '#ffffff'); chain(p, pts.map(([x, y]) => [x + 1, y]), 0.6, 0.6, core); };
    bolt([[5, 28], [2, 36], [6, 38], [1, 48]]); bolt([[47, 28], [51, 34], [47, 37], [53, 46]]); bolt([[22, 58], [19, 62]]); bolt([[34, 58], [36, 63]]);
    poly(p, [[27, 28], [23, 34], [27, 34], [24, 41], [31, 32], [27, 32], [29, 28]], '#ffffff'); // a bolt on the chest
    eyes(); p.rect(21, 18, 3, 1, c.eye || '#4a4ae0'); p.rect(28, 18, 3, 1, c.eye || '#4a4ae0');
    return p.outline(shade(body, -0.6));
  }
  if (el === 'light') {
    const H = ramp('#ffe88a');
    for (let i = 0; i < 7; i++) { const a = -0.5 - i * 0.36; limb(p, 30, 28, 30 + Math.cos(a) * 26 + 6, 28 + Math.sin(a) * 24, 2.6, 0.8, L); limb(p, 22, 28, 22 - Math.cos(a) * 26 - 6, 28 + Math.sin(a) * 24, 2.6, 0.8, L); } // wings of light
    for (let a = 0; a < Math.PI * 2; a += 0.05) p.set(26 + Math.cos(a) * 11, 13 + Math.sin(a) * 3.5 - 8, H[a > Math.PI ? 0 : 1]); // halo
    poly(p, [[19, 38], [33, 38], [42, 62], [10, 62]], R); for (let i = 0; i < 4; i++) limb(p, 18 + i * 5, 44, 14 + i * 8, 61, 0.6, 0.6, D[1]); // a flowing robe
    figure(R); p.sell(26, 32, 4, 4, ramp('#ffffff'));
    eyes(c.eye || '#ffcf4a');
    return p.outline(shade(body, -0.5));
  }
  // darkness: a hooded shape of smoke with burning eyes and grasping tendrils
  for (let i = 0; i < 6; i++) chain(p, [[16 + i * 4, 44], [12 + i * 5 + Math.sin(i) * 3, 54], [8 + i * 7, 62]], 3.6, 0.8, D);
  poly(p, [[14, 18], [20, 6], [26, 3], [33, 6], [38, 18], [40, 34], [36, 48], [16, 48], [12, 34]], R); // hooded cloak
  chain(p, [[16, 28], [6, 34], [2, 30], [4, 24]], 3, 1, D); chain(p, [[36, 28], [46, 36], [50, 30], [48, 26]], 3, 1, D); // tendril arms
  for (const [x, y] of [[2, 24], [4, 30], [48, 26], [50, 32]]) limb(p, x, y, x + (x < 26 ? -2 : 2), y - 3, 0.8, 0.4, D[2]);
  p.sell(26, 18, 8, 9, ramp(shade(body, -0.65))); // the empty hood
  const ey = c.eye || '#ff3a6a'; poly(p, [[20, 17], [25, 18], [24, 20], [20, 19]], ey); poly(p, [[32, 17], [27, 18], [28, 20], [32, 19]], ey); p.set(21, 18, '#ffffff'); p.set(31, 18, '#ffffff');
  chain(p, [[26, 30], [26, 44]], 0.6, 0.6, D[2]); chain(p, [[20, 34], [18, 46]], 0.6, 0.6, D[2]); chain(p, [[32, 34], [34, 46]], 0.6, 0.6, D[2]);
  return p.outline();
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
  // a bird of prey in flight: both wings swept up, long primary feathers, hooked beak, a fan of tail feathers and talons drawn up
  const p = P(76, 60), body = c.body, wingC = c.wing || shade(body, -0.15), R = ramp(body), W = ramp(wingC), Wf = ramp(shade(wingC, -0.3)), Bl = ramp(c.belly || shade(body, 0.4)), BK = ramp('#f0b83a');
  const feather = (x0, y0, x1, y1, r, T) => { limb(p, x0, y0, x1, y1, r, r * 0.45, T); limb(p, x0, y0, x0 + (x1 - x0) * 0.85, y0 + (y1 - y0) * 0.85, 0.45, 0.45, T[2]); };
  // far wing, darker, rising behind the body
  poly(p, [[30, 22], [34, 12], [40, 6], [46, 4], [44, 12], [40, 20]], Wf);
  for (let i = 0; i < 5; i++) feather(38 + i * 1.6, 12 + i * 2, 48 + i * 1.2, 1 + i * 3.4, 2.2, Wf);
  // tail: a fan of long feathers trailing behind
  for (let i = 0; i < 5; i++) { const a = 0.05 + i * 0.2; feather(50, 36, 50 + Math.cos(a) * 22, 36 + Math.sin(a) * 18, 2.8, i % 2 ? W : ramp(shade(wingC, 0.12))); }
  // talons drawn up under the belly
  for (const x of [32, 38]) { limb(p, x, 38, x - 3, 45, 1.6, 1.3, BK); for (const d of [-2.5, 0, 2.5]) limb(p, x - 3, 45, x - 5 + d, 48, 0.9, 0.6, '#2a2018'); }
  // the body: sleek, chest forward
  poly(p, [[10, 22], [16, 16], [26, 16], [40, 22], [52, 32], [50, 38], [38, 40], [24, 36], [14, 30]], R);
  poly(p, [[14, 29], [24, 34], [38, 39], [30, 40], [20, 37]], Bl); for (let i = 0; i < 6; i++) p.set(18 + i * 3.4, 31 + i * 1.3, Bl[2]); // pale breast, barred
  // near wing: coverts and then long primaries spread like fingers
  poly(p, [[24, 24], [28, 14], [36, 6], [46, 2], [52, 4], [50, 12], [42, 20], [34, 28]], W);
  for (let i = 0; i < 6; i++) feather(44 + i * 1.4, 6 + i * 2.4, 66 - i * 0.6, -1 + i * 5.2, 2.6, i % 2 ? W : ramp(shade(wingC, 0.1))); // primaries
  for (let i = 0; i < 4; i++) p.sell(30 + i * 4, 18 - i * 3.4, 3, 2.2, ramp(shade(wingC, 0.2))); // a row of scalloped coverts
  for (let i = 0; i < 4; i++) feather(34 + i * 3, 24 - i * 2, 40 + i * 4.5, 32 - i * 1.5, 1.8, W); // secondaries
  // head: brow ridge over the eye, hooked beak
  p.sell(15, 18, 7.5, 6.5, R);
  poly(p, [[10, 15], [4, 15], [1, 18], [2, 23], [4, 20], [10, 21]], BK); poly(p, [[9, 21], [4, 21], [6, 23], [10, 23]], ramp('#c88a2a')); p.set(7, 16, '#6a4a1a'); // hooked beak, nostril
  eye(p, 14, 17, 2.2, c.eye && c.eye !== '#ffe04a' ? c.eye : '#e8a020'); limb(p, 11, 14.5, 18, 14, 0.8, 0.8, shade(body, -0.45)); // fierce brow
  if (c.crest) for (let i = 0; i < 4; i++) feather(18, 14 + i, 30 + i * 2, 4 + i * 4, 1.8, ramp(c.crest)); // plumes swept back
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
  // seen from the front: a wide shell with a jagged rim, jointed legs, and two big pincers raised
  const p = P(80, 54), R = ramp(c.body), D = ramp(shade(c.body, -0.28)), L = ramp(shade(c.body, 0.35)), cx = 40;
  const leg = (s, i, T) => { const bx = cx + s * (10 + i * 3.5), by = 34 + i * 1.5, kx = cx + s * (19 + i * 5.5), ky = 27 + i * 2.5, tx = cx + s * (21 + i * 5.8), ty = 49 + (i % 2); limb(p, bx, by, kx, ky, 2.4, 2, T); limb(p, kx, ky, tx, ty, 2, 0.6, T); p.set(kx, ky - 1, T[0]); };
  for (let i = 3; i >= 0; i--) { leg(-1, i, D); leg(1, i, D); }
  // shell
  p.sell(cx, 32, 22, 11, R); p.sell(cx, 37, 18, 5, D);
  for (let i = 0; i < 9; i++) { const x = cx - 18 + i * 4.5; poly(p, [[x - 2, 24 - Math.abs(i - 4) * -0.4 + Math.abs(i - 4) * 1.2], [x, 19.5 + Math.abs(i - 4) * 1.2], [x + 2, 24 + Math.abs(i - 4) * 1.2]], R); } // the jagged front rim
  chain(p, [[cx - 8, 26], [cx - 5, 32], [cx, 34], [cx + 5, 32], [cx + 8, 26]], 0.6, 0.6, R[2]); chain(p, [[cx, 34], [cx, 40]], 0.6, 0.6, R[2]); // grooves on the shell
  p.sell(cx - 9, 27, 5, 2.4, L); for (const [x, y] of [[cx + 10, 30], [cx + 14, 33], [cx - 14, 33], [cx + 6, 37], [cx - 4, 37]]) p.ell(x, y, 1.2, 1, R[2]);
  // mouth parts
  for (const s of [-1, 1]) limb(p, cx + s * 2, 38, cx + s * 3, 42, 1, 0.6, D[2]);
  // eyes on stalks
  for (const s of [-1, 1]) { limb(p, cx + s * 4, 24, cx + s * 6, 15, 1.2, 1, R); p.ell(cx + s * 6, 13.5, 2.4, 2.4, '#1c1424'); p.set(cx + s * 6 - 1, 12.5, '#ffffff'); }
  // arms and pincers: short arms, big swollen palms, two curved fingers with a clear gap between them
  const claw = (s, big) => {
    const k = big ? 1.15 : 0.95, px = cx + s * 25, py = 23;
    chain(p, [[cx + s * 14, 32], [cx + s * 24, 31], [px, py + 4]], 3.6, 4, R); p.set(cx + s * 22, 29, L[0]);
    chain(p, [[px - s * 3 * k, py - 3 * k], [px - s * 6.5 * k, py - 10 * k], [px - s * 5.5 * k, py - 16 * k]], 2.8 * k, 0.6, D); // the fixed finger, inside
    chain(p, [[px + s * 2.5 * k, py - 3 * k], [px + s * 3 * k, py - 12 * k], [px - s * 0.5 * k, py - 18 * k], [px - s * 3.5 * k, py - 19 * k]], 3.4 * k, 0.6, R); // the moving finger, outside and bigger
    for (let i = 0; i < 3; i++) { p.set(px - s * (4 + i * 0.2) * k, py - (8 + i * 2.6) * k, '#f4ecd8'); p.set(px - s * (0.2 - i * 0.3) * k, py - (9 + i * 2.6) * k, '#f4ecd8'); } // teeth along the gap
    p.sell(px, py, 6.5 * k, 5.5 * k, R); p.sell(px - s * 2 * k, py - 1 * k, 3 * k, 2.2 * k, L); // swollen palm
    for (const [x, y] of [[px + s * 3, py + 2], [px - s * 1, py + 4], [px + s * 4, py - 2]]) p.set(x, y, R[2]);
  };
  claw(-1, true); claw(1, false);
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
  // a sea serpent: coils resting on the ground, the neck rising in an S, a webbed fin down its back and a frilled, fanged head
  const p = P(108, 100), R = ramp(c.body), Dk = ramp(shade(c.body, -0.3)), B = ramp(c.belly || '#f0e0b0'), F = ramp(c.fin || '#5ac8e0');
  const cx = 62, cy = 86, rx = 30, ry = 8;
  const arc = (a0, a1, n) => { const out = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return out; };
  // tail curling up at the back, with a fin
  chain(p, [[cx + rx, cy], [cx + rx + 8, cy - 8], [cx + rx + 10, cy - 18], [cx + rx + 5, cy - 24]], 7, 2, R); poly(p, [[cx + rx + 5, cy - 22], [cx + rx + 2, cy - 34], [cx + rx + 12, cy - 30]], F);
  chain(p, arc(Math.PI, Math.PI * 2, 14), 8, 8, Dk); // back of the coil
  for (let i = 1; i < 6; i++) { const [x, y] = arc(Math.PI, Math.PI * 2, 6)[i]; poly(p, [[x - 4, y - 6], [x, y - 13], [x + 4, y - 6]], ramp(shade(c.fin || '#5ac8e0', -0.2))); }
  // the neck: rising from the front of the coil
  const neck = [[cx - rx + 4, cy + 4], [28, 74], [27, 62], [36, 50], [40, 38], [34, 27], [26, 21]];
  const pts = []; for (let i = 0; i < neck.length - 1; i++) for (let t = 0; t < 1; t += 0.25) pts.push([neck[i][0] + (neck[i + 1][0] - neck[i][0]) * t, neck[i][1] + (neck[i + 1][1] - neck[i][1]) * t]); pts.push(neck[neck.length - 1]);
  // webbed fin along the back of the neck (the right side as it rises)
  for (let i = 2; i < pts.length - 2; i += 2) { const [x, y] = pts[i], [x2, y2] = pts[i + 2], nx = (y2 - y), ny = -(x2 - x), l = Math.hypot(nx, ny) || 1, ox = -nx / l, oy = -ny / l, e = 9 + (i % 4) * 1.5; poly(p, [[x + ox * 5, y + oy * 5], [x + ox * (6 + e) + 2, y + oy * (6 + e) - 2], [x2 + ox * 5, y2 + oy * 5]], F); limb(p, x + ox * 5, y + oy * 5, x + ox * (6 + e) + 2, y + oy * (6 + e) - 2, 0.6, 0.4, F[2]); }
  chain(p, arc(0, Math.PI, 16), 9, 9, R); // front of the coil
  chain(p, pts, 9.5, 7, R);
  // belly plates down the front of the neck and along the coil
  for (let i = 1; i < pts.length - 2; i++) { const [x, y] = pts[i], [x2, y2] = pts[i + 1], nx = (y2 - y), ny = -(x2 - x), l = Math.hypot(nx, ny) || 1, ox = nx / l, oy = ny / l; limb(p, x + ox * 3, y + oy * 3, x + ox * 8, y + oy * 8, 1.6, 1.6, B[i % 2 ? 1 : 0]); }
  for (let i = 1; i < 16; i++) { const [x, y] = arc(0, Math.PI, 16)[i]; limb(p, x, y + 4, x, y + 8, 1.4, 1.4, B[i % 2 ? 1 : 0]); }
  for (let i = 0; i < pts.length; i += 2) p.set(pts[i][0] + 2, pts[i][1] - 1, R[0]); spots(p, 14, 40, 78, 44, 10, R[0], true);
  // head: frilled cheek fins, long snout, jaws open with fangs
  for (let i = 0; i < 4; i++) { const a = -0.9 + i * 0.5; poly(p, [[28, 19], [28 + Math.cos(a) * 16, 19 + Math.sin(a) * 13 - 3], [28 + Math.cos(a + 0.35) * 16, 19 + Math.sin(a + 0.35) * 13 - 3]], F); limb(p, 28, 19, 28 + Math.cos(a) * 16, 19 + Math.sin(a) * 13 - 3, 0.6, 0.4, F[2]); }
  p.sell(22, 17, 9, 7, R);
  poly(p, [[16, 11], [4, 13], [0, 16], [1, 19], [16, 20]], R); // upper jaw
  poly(p, [[16, 23], [4, 26], [2, 29], [18, 27]], Dk); // lower jaw, dropped open
  poly(p, [[16, 20], [2, 20], [3, 25], [16, 23]], '#6a1a2a'); limb(p, 6, 23, 14, 22, 1, 1, '#c84a5a'); // mouth and tongue
  for (let x = 3; x < 15; x += 3) { p.set(x, 20, '#ffffff'); p.set(x, 21, '#ffffff'); p.set(x + 1, 25, '#ffffff'); p.set(x + 1, 24, '#ffffff'); }
  p.set(2, 14, OL); glowEye(p, 18, 13, c.eye || '#ffe03a', 4, 2); p.set(18, 14, OL); limb(p, 14, 11, 24, 10, 1, 0.8, Dk[2]); // nostril, eye, brow ridge
  chain(p, [[4, 18], [0, 26], [3, 34]], 1, 0.5, R[2]); // whisker
  for (let i = 0; i < 3; i++) chain(p, [[22 + i * 3, 11], [26 + i * 4, 5], [32 + i * 4, 3]], 1.6, 0.5, F); // little horns
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
  // a heavy four-legged body; long necks fan out from the shoulders, each with its own fanged head
  const n = c.heads || 3, p = P(96, 82), R = ramp(c.body), B = ramp(c.belly || shade(c.body, 0.45)), Dk = ramp(shade(c.body, -0.25));
  const spots0 = { 2: [[18, 26], [36, 10]], 3: [[12, 30], [28, 8], [46, 20]], 5: [[8, 36], [16, 16], [32, 4], [48, 14], [58, 30]] };
  const heads = spots0[n] || spots0[3];
  chain(p, [[70, 62], [82, 60], [90, 52], [92, 44]], 7, 1.5, R); for (let i = 0; i < 4; i++) poly(p, [[72 + i * 5, 56 - i * 2], [75 + i * 5, 50 - i * 3], [78 + i * 5, 56 - i * 2.5]], Dk); // tail with spines
  limb(p, 68, 62, 72, 76, 5, 4, Dk); limb(p, 42, 62, 40, 76, 5, 4, Dk); // far legs
  p.sell(56, 60, 20, 12, R); p.sell(54, 66, 15, 5, B);
  for (let i = 0; i < 5; i++) poly(p, [[44 + i * 7, 50 - (i === 2 ? 1 : 0)], [47 + i * 7, 43], [50 + i * 7, 50]], Dk); // back ridge
  limb(p, 62, 64, 64, 78, 5.5, 4.5, R); limb(p, 46, 64, 46, 78, 5.5, 4.5, R); // near legs
  for (const x of [38, 42, 46, 60, 64, 68]) limb(p, x, 78, x - 1.5, 80, 1, 0.6, '#f4ecd8'); // claws
  heads.map((h, i) => [h, i]).sort((a, b) => b[0][0] - a[0][0]).forEach(([[hx, hy], i]) => {
    const back = i % 2 === 1, T = back ? Dk : R, bx = 40 + i * (14 / Math.max(1, n - 1));
    const pts = [[bx, 58], [bx - 4, 46], [(bx + hx) / 2 + 6, (46 + hy) / 2 + 4], [hx + 9, hy + 4]];
    chain(p, pts, 6, 4.2, T);
    for (let k = 0; k < 3; k++) { const t = 0.15 + k * 0.28, a = pts[Math.floor(t * 3)], b = pts[Math.floor(t * 3) + 1], f = t * 3 % 1; p.ell(a[0] + (b[0] - a[0]) * f - 3, a[1] + (b[1] - a[1]) * f, 1.6, 2.2, B[k % 2]); } // belly scales down the neck
    // the head, facing left: skull, long snout, jaw a little open, horns sweeping back
    chain(p, [[hx + 5, hy - 3], [hx + 11, hy - 7], [hx + 16, hy - 8]], 1.8, 0.5, ramp('#e8e0c8')); chain(p, [[hx + 6, hy], [hx + 12, hy - 2], [hx + 16, hy - 1]], 1.4, 0.5, ramp('#e8e0c8'));
    p.sell(hx + 4, hy, 6.5, 5.5, T);
    poly(p, [[hx, hy - 4], [hx - 11, hy - 2], [hx - 12, hy + 1], [hx, hy + 2]], T); // upper jaw
    poly(p, [[hx + 1, hy + 4], [hx - 9, hy + 4], [hx - 8, hy + 6], [hx + 2, hy + 7]], Dk); // lower jaw
    poly(p, [[hx + 1, hy + 2], [hx - 11, hy + 1], [hx - 9, hy + 4], [hx + 1, hy + 4]], '#6a1a2a');
    for (let x = hx - 10; x < hx; x += 3) { p.set(x, hy + 2, '#ffffff'); p.set(x + 1, hy + 3, '#ffffff'); }
    p.set(hx - 11, hy - 2, OL); glowEye(p, hx + 1, hy - 3, c.eye || '#ffe03a', 3, 2); p.set(hx + 1, hy - 2, OL); limb(p, hx - 2, hy - 5, hx + 5, hy - 5, 0.8, 0.8, Dk[2]);
  });
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

// ---------------------------------------------------------------- the jelly family. Soft gumdrop bodies that glow from inside like
// real jelly, outlined in their own darker colour instead of black; big shiny eyes, blushing cheeks and a different
// expression for each. Everything is centred on a pixel edge and mirrored, so the two halves always match.
const mirror = (pts, W) => pts.map(([x, y]) => [W - x, y]);
const tone = (col) => ({ hi: mix(shade(col, 0.5), '#ffffff', 0.25), lt: shade(col, 0.22), md: col, dk: shade(col, -0.22), dd: shade(col, -0.42), core: mix(shade(col, 0.35), '#ffffff', 0.1), ol: mix(shade(col, -0.62), '#1c1424', 0.35) });
// is (x, y) inside a gumdrop: round on top, full and flat at the foot
const inGum = (x, y, cx, cy, rx, ry) => { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dy > 0.92) return false; return dy < 0 ? dx * dx + dy * dy <= 1 : Math.pow(Math.abs(dx), 2.6) + Math.pow(dy, 2.6) <= 1; };
function gum(p, cx, cy, rx, ry, col, o = {}) {
  const T = tone(col), cells = [];
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (inGum(x, y, cx, cy, rx, ry)) cells.push([x, y]);
  for (const [x, y] of cells) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, l = -dx * 0.55 - dy * 0.75;
    const edge = !inGum(x - 2, y, cx, cy, rx, ry) || !inGum(x + 2, y, cx, cy, rx, ry) || !inGum(x, y + 2, cx, cy, rx, ry);
    const coreD = Math.hypot(dx * 1.1, (dy - 0.25) * 1.3);
    let c = l > 0.55 ? T.lt : l < -0.45 ? T.dk : T.md;
    if (coreD < 0.45 && !edge && o.core !== false) c = mix(c, T.core, 0.55);           // the glow inside
    if (dy > 0.7) c = T.dk; if (dy > 0.82) c = T.dd;               // the foot in shadow
    if (edge && dx > 0.2 && dy > -0.2) c = T.dd;                   // shadowed rim on the lower right
    if (edge && dx < -0.3 && dy < 0.4) c = T.lt;                   // light rim on the upper left
    p.set(x, y, c);
  }
  // the gloss: a soft bean of light and a sparkle
  const gx = Math.round(cx - rx * 0.5), gy = Math.round(cy - ry * 0.55), gw = Math.max(2, Math.round(rx * 0.22)), gh = Math.max(2, Math.round(ry * 0.2));
  p.ell(gx, gy, gw, gh, T.hi); p.ell(gx - 0.5, gy - 0.5, Math.max(1, gw - 1.2), Math.max(0.8, gh - 1.2), '#ffffff');
  p.set(gx + gw + 2, gy - 1, '#ffffff');
  return T;
}
// faces: big dark eyes with two glints, pink cheeks, a cat mouth. kind: normal | happy (^ ^) | brave (brows) | sleepy | wide
function face(p, cx, cy, size, kind = 'normal', c = {}) {
  const big = size >= 2, ew = big ? 5 : 4, eh = big ? 7 : 5, gap = big ? 4 : 3, pc = c.eye || '#2a1838';
  for (const [x0, s] of [[cx - gap - ew, -1], [cx + gap, 1]]) {
    const y0 = cy - Math.floor(eh / 2);
    if (kind === 'happy') { // closed, smiling eyes: an arch
      for (let i = 0; i < ew; i++) p.set(x0 + i, y0 + 2 + (i === 0 || i === ew - 1 ? 1 : 0), pc); p.set(x0 + 1, y0 + 1, pc); p.set(x0 + ew - 2, y0 + 1, pc);
      continue;
    }
    if (kind === 'sleepy') { p.rect(x0, y0 + Math.floor(eh / 2), ew, 1, pc); p.rect(x0 + 1, y0 + Math.floor(eh / 2) + 1, ew - 2, 1, pc); continue; }
    p.rect(x0 + 1, y0, ew - 2, eh, pc); p.rect(x0, y0 + 1, ew, eh - 2, pc);
    if (big) { p.rect(x0 + 1, y0 + 1, 2, 2, '#ffffff'); p.set(x0 + ew - 2, y0 + eh - 3, '#ffffff'); p.rect(x0 + 1, y0 + eh - 2, ew - 2, 1, mix(pc, '#6a8aff', 0.45)); }
    else { p.set(x0 + 1, y0 + 1, '#ffffff'); p.set(x0 + 2, y0 + 1, '#ffffff'); p.set(x0 + ew - 2, y0 + eh - 2, mix(pc, '#6a8aff', 0.5)); }
    if (kind === 'wide') { p.set(x0 + ew - 2, y0 + 1, '#ffffff'); }
    if (kind === 'brave') { const by = y0 - 2; for (let i = 0; i < ew; i++) p.set(x0 + i, by + (s < 0 ? (i >= ew - 2 ? 1 : 0) : (i <= 1 ? 1 : 0)), pc); }
  }
  const my = cy + Math.ceil(eh / 2) + (big ? 1 : 0), mc = c.mouth || '#4a1a2a';
  // cheeks
  for (const x of [cx - gap - ew - (big ? 1 : 0), cx + gap + ew - (big ? 2 : 1)]) { p.rect(x, my - 1, big ? 3 : 2, 1, '#ff8fae'); if (big) p.set(x + 1, my - 2, '#ffb8c8'); }
  if (kind === 'brave') { p.rect(cx - 2, my, 4, 1, mc); p.set(cx - 2, my + 1, '#ffffff'); p.set(cx + 1, my + 1, '#ffffff'); return; }
  // ω mouth, open a little with a tongue
  p.set(cx - 3, my, mc); p.set(cx - 2, my + 1, mc); p.set(cx - 1, my, mc); p.set(cx, my, mc); p.set(cx + 1, my + 1, mc); p.set(cx + 2, my, mc);
  if (big) { p.set(cx - 1, my + 1, '#e8607a'); p.set(cx, my + 1, '#e8607a'); }
}
// draw a jelly and its face in one go
function jellyB(p, cx, cy, rx, ry, col, kind, c) { const T = gum(p, cx, cy, rx, ry, col); face(p, cx, Math.round(cy + ry * 0.18), rx >= 14 ? 2 : 1, kind, c); return T; }
const done = (p, col) => p.outline(tone(col).ol);

M.puddle = (c) => { // a jelly spread flat in a puddle, blowing bubbles
  const col = c.body || '#6ad84a', p = P(60, 42), T = tone(col);
  gum(p, 30, 36, 28, 6, col);
  jellyB(p, 30, 27, 16, 12, col, 'normal', c);
  for (const [x, y, r] of [[9, 13, 3.4], [50, 9, 4.4], [36, 3.5, 2.2], [53, 22, 2]]) { p.ell(x, y, r, r, T.lt); p.ell(x + 0.4, y + 0.4, Math.max(0.6, r - 1.3), Math.max(0.6, r - 1.3), mix(T.core, '#ffffff', 0.4)); p.set(Math.round(x - r * 0.45), Math.round(y - r * 0.45), '#ffffff'); }
  return done(p, col);
};
M.gelstack = (c) => { // three jellies piled into a tower, each with its own mood
  const p = P(50, 72);
  jellyB(p, 25, 58, 20, 12.5, c.c || '#4a9ae8', 'normal', c);
  jellyB(p, 25, 38, 17, 11, c.b || '#ff7a3a', 'wide', c);
  jellyB(p, 25, 19, 14, 10, c.body || '#5ad84a', 'happy', c);
  if (c.crown) { poly(p, [[17, 11], [17, 3], [21, 7], [25, 1], [29, 7], [33, 3], [33, 11]], ramp('#f0c850')); for (const x of [17, 25, 33]) p.ell(x, x === 25 ? 1.5 : 3.5, 1.3, 1.3, '#fff0a0'); p.ell(25, 8, 1.6, 1.6, '#e84a6a'); }
  return done(p, c.c || '#4a9ae8');
};
M.shellgel = (c) => { // a jelly carrying a big curled snail shell on its back
  const col = c.body || '#6ad85a', p = P(56, 50), S = tone(c.shell || '#c8884a');
  // the shell: a fat spiral, banded, sitting up and back
  const sx = 34, sy = 18, sr = 14;
  for (let y = sy - sr; y <= sy + sr; y++) for (let x = sx - sr; x <= sx + sr; x++) {
    const dx = x + 0.5 - sx, dy = y + 0.5 - sy, d = Math.hypot(dx, dy); if (d > sr) continue;
    const a = Math.atan2(dy, dx), turn = (d / sr * 2.6 + a / (Math.PI * 2) + 10) % 1, l = (-dx * 0.55 - dy * 0.75) / sr;
    p.set(x, y, turn < 0.14 ? S.dd : l > 0.35 ? S.lt : l < -0.4 ? S.dk : S.md);
  }
  p.ell(sx - 5, sy - 6, 3, 2, S.hi); p.set(sx - 6, sy - 7, '#ffffff');
  jellyB(p, 24, 36, 20, 12, col, 'normal', c);
  // two little eye-stalk feelers
  for (const s of [-1, 1]) { const x = 24 + s * 7; limb(p, x, 26, x + s * 2, 19, 1, 0.8, tone(col).md); p.ell(x + s * 2, 18, 1.6, 1.6, tone(col).lt); }
  return done(p, col);
};
M.rootling = (c) => { // a turnip spirit: a plump root with a two-leaf sprout, stubby arms and feet
  const col = c.body || '#8a4a7a', p = P(46, 56), L = tone(c.leaf || '#5ac84a'), W = ramp(c.root || '#d8b080');
  for (const s of [1, -1]) {
    const X = (x) => (s > 0 ? x : 46 - x);
    limb(p, X(9), 32, X(4), 36, 2.2, 1.8, W);                                     // arms
    limb(p, X(17), 44, X(16), 50, 2.6, 2.4, W); p.ell(X(15.5), 51, 3.2, 1.8, W[1]);  // feet
  }
  // body: a turnip, round with a pointed root tip below
  gum(p, 23, 30, 15, 16, col, { core: false });
  for (const y of [40, 43]) p.rect(17, y, 12, 1, tone(col).dk);
  // the sprout: a stem and two big leaves with veins
  limb(p, 23, 16, 23, 9, 1.4, 1.2, L.dk);
  const leaf = [[23, 10], [17, 3], [9, 2], [5, 6], [11, 10], [18, 11]];
  poly(p, leaf, [L.lt, L.md, L.dk]); poly(p, mirror(leaf, 46), [L.lt, L.md, L.dk]);
  limb(p, 22, 9, 9, 5, 0.5, 0.5, L.dk); limb(p, 24, 9, 37, 5, 0.5, 0.5, L.dk);
  face(p, 23, 28, 2, c.eye === '#ff3a3a' ? 'brave' : 'happy', c);
  return done(p, col);
};
M.gelknight = (c) => { // a little knight with a cape, sword raised, riding a brave jelly
  const col = c.body || '#5ad84a', p = P(64, 74), A = tone(c.armor || '#b8c0d8'), G = tone(c.gold || '#f0c850'), K = tone(c.cape || '#d84a5a');
  // the cape flying out behind
  poly(p, [[26, 22], [38, 22], [44, 40], [36, 37], [30, 42], [22, 38]], [K.lt, K.md, K.dk]);
  jellyB(p, 32, 57, 25, 14, col, 'brave', c);
  // legs astride, body, belt
  limb(p, 28, 38, 26, 46, 2.6, 2.2, [A.lt, A.md, A.dk]); limb(p, 36, 38, 38, 46, 2.6, 2.2, [A.lt, A.md, A.dk]); p.ell(25.5, 46.5, 2.6, 1.6, A.dk); p.ell(38.5, 46.5, 2.6, 1.6, A.dk);
  poly(p, [[25, 25], [39, 25], [38, 39], [26, 39]], [A.lt, A.md, A.dk]); p.rect(26, 33, 12, 2, G.md); p.rect(31, 33, 2, 2, G.hi);
  // a round helmet with a T visor and a plume
  gum(p, 32, 17, 8, 8.5, c.armor || '#b8c0d8'); p.rect(26, 16, 12, 2, '#1c1424'); p.rect(31, 18, 2, 4, '#1c1424'); p.set(28, 16, '#6a8aff'); p.set(35, 16, '#6a8aff');
  chain(p, [[32, 9], [36, 4], [42, 3], [45, 6]], 2, 1.2, [K.lt, K.md, K.dk]);
  // the sword arm raised high, the blade gleaming
  limb(p, 39, 28, 46, 22, 2.2, 1.8, [A.lt, A.md, A.dk]);
  limb(p, 48, 20, 58, 2, 1.6, 1.2, ['#ffffff', '#e8eef8', '#a8b0c8']); p.set(57, 3, '#ffffff');
  limb(p, 44, 18, 51, 23, 1, 1, [G.lt, G.md, G.dk]); limb(p, 46, 21, 48, 24, 1, 1, '#6a4a2a');
  // the shield on the near arm
  poly(p, [[10, 23], [23, 23], [23, 35], [16.5, 42], [10, 35]], [G.lt, G.md, G.dk]);
  poly(p, [[12, 25], [21, 25], [21, 34], [16.5, 39], [12, 34]], [mix(c.crest || '#d84a4a', '#ffffff', 0.25), c.crest || '#d84a4a', shade(c.crest || '#d84a4a', -0.3)]);
  p.rect(16, 27, 1, 9, G.hi); p.rect(13, 30, 7, 1, G.hi);
  return done(p, col);
};
M.wyrmgel = (c) => { // a jelly grown into a little dragon: swept horns, ribbed wings, a spiked back and a curling tail
  const body = c.body || '#f0b02a', p = P(64, 56), Wg = tone(c.wing || mix(shade(body, -0.1), '#ff7a4a', 0.25)), H = tone(c.horn || '#fff0c8');
  const wing = [[21, 32], [9, 8], [6, 15], [1, 16], [5, 22], [1, 26], [8, 28], [6, 34], [15, 35]];
  poly(p, wing, [Wg.lt, Wg.md, Wg.dk]); poly(p, mirror(wing, 64), [Wg.lt, Wg.md, Wg.dk]);
  for (const [a, b] of [[[20, 31], [9, 9]], [[19, 32], [2, 17]], [[19, 33], [2, 26]], [[18, 34], [7, 34]]]) { limb(p, a[0], a[1], b[0], b[1], 0.7, 0.5, Wg.dd); limb(p, 64 - a[0], a[1], 64 - b[0], b[1], 0.7, 0.5, Wg.dd); }
  chain(p, [[46, 48], [55, 48], [60, 43], [58, 38], [54, 39]], 3, 1.3, [tone(body).lt, tone(body).md, tone(body).dk]);
  poly(p, [[58, 36], [62, 33], [61, 39]], [H.lt, H.md, H.dk]);                       // the tail's spade tip
  jellyB(p, 32, 38, 19, 15, body, 'brave', c);
  // horns sweeping back and up
  chain(p, [[24, 27], [20, 19], [19, 12], [22, 7]], 2.6, 0.8, [H.lt, H.md, H.dk]); chain(p, [[40, 27], [44, 19], [45, 12], [42, 7]], 2.6, 0.8, [H.lt, H.md, H.dk]);
  return done(p, body);
};
for (const [k, f] of Object.entries(M)) registerMonster(k, f);
