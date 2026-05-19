// Trace circuits with BRIGHT lines on DARK backgrounds (inverted threshold)
// Fontenay: orange on black | Pont-l'Eveque: white on dark
const sharp = require('sharp'), path = require('path');

function zhangSuen(g, W, H) {
  const gr = g.map(r => [...r]);
  let changed = true, iter = 0;
  while (changed && iter < 300) {
    changed = false; iter++;
    const rem1 = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!gr[y][x]) continue;
      const nb = [gr[y-1][x],gr[y-1][x+1],gr[y][x+1],gr[y+1][x+1],gr[y+1][x],gr[y+1][x-1],gr[y][x-1],gr[y-1][x-1]];
      const s = nb.reduce((a,b)=>a+b,0);
      if (s < 2 || s > 6) continue;
      let t = 0; for (let i=0;i<8;i++) if (!nb[i]&&nb[(i+1)%8]) t++;
      if (t !== 1) continue;
      if (nb[0]*nb[2]*nb[4] || nb[2]*nb[4]*nb[6]) continue;
      rem1.push([x,y]);
    }
    for (const [x,y] of rem1) { gr[y][x] = 0; changed = true; }
    const rem2 = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!gr[y][x]) continue;
      const nb = [gr[y-1][x],gr[y-1][x+1],gr[y][x+1],gr[y+1][x+1],gr[y+1][x],gr[y+1][x-1],gr[y][x-1],gr[y-1][x-1]];
      const s = nb.reduce((a,b)=>a+b,0);
      if (s < 2 || s > 6) continue;
      let t = 0; for (let i=0;i<8;i++) if (!nb[i]&&nb[(i+1)%8]) t++;
      if (t !== 1) continue;
      if (nb[0]*nb[2]*nb[6] || nb[0]*nb[4]*nb[6]) continue;
      rem2.push([x,y]);
    }
    for (const [x,y] of rem2) { gr[y][x] = 0; changed = true; }
  }
  return gr;
}

function lcc(g, W, H) {
  const vis = new Uint8Array(W * H);
  let best = [], bestSize = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!g[y][x] || vis[y*W+x]) continue;
    const queue = [[x,y]], comp = [];
    vis[y*W+x] = 1;
    while (queue.length) {
      const [cx,cy] = queue.shift();
      comp.push([cx,cy]);
      for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++) {
        if (!dx && !dy) continue;
        const nx=cx+dx, ny=cy+dy;
        if (nx<0||nx>=W||ny<0||ny>=H||!g[ny][nx]||vis[ny*W+nx]) continue;
        vis[ny*W+nx] = 1; queue.push([nx,ny]);
      }
    }
    if (comp.length > bestSize) { bestSize = comp.length; best = comp; }
  }
  const out = Array.from({length:H}, () => new Uint8Array(W));
  for (const [x,y] of best) out[y][x] = 1;
  return out;
}

// Prune spurs: iteratively remove degree-1 pixels until only closed loops remain
function pruneSpurs(sk, W, H, iterations = 8) {
  const g = sk.map(r => Uint8Array.from(r));
  for (let iter = 0; iter < iterations; iter++) {
    const toRemove = [];
    for (let y=0; y<H; y++) for (let x=0; x<W; x++) {
      if (!g[y][x]) continue;
      let deg = 0;
      for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++) {
        if (!dx && !dy) continue;
        const nx=x+dx, ny=y+dy;
        if (nx>=0&&nx<W&&ny>=0&&ny<H&&g[ny][nx]) deg++;
      }
      if (deg <= 1) toRemove.push([x,y]);
    }
    if (!toRemove.length) break;
    for (const [x,y] of toRemove) g[y][x] = 0;
  }
  return g;
}

// Angular sort around centroid — robust for any circuit shape including figure-8
function tracePath(sk, W, H) {
  const px = [];
  for (let y=0; y<H; y++) for (let x=0; x<W; x++) if (sk[y][x]) px.push([x,y]);
  if (!px.length) return [];
  let cx=0, cy=0;
  for (const [x,y] of px) { cx+=x; cy+=y; }
  cx /= px.length; cy /= px.length;
  px.sort((a,b) => Math.atan2(a[1]-cy, a[0]-cx) - Math.atan2(b[1]-cy, b[0]-cx));
  return px.map(([x,y]) => ({x, y}));
}

function chaikin(p, n=2) {
  for (let i=0; i<n; i++) {
    const o=[], l=p.length;
    for (let j=0; j<l; j++) {
      const a=p[j], b=p[(j+1)%l];
      o.push([0.75*a[0]+0.25*b[0], 0.75*a[1]+0.25*b[1]]);
      o.push([0.25*a[0]+0.75*b[0], 0.25*a[1]+0.75*b[1]]);
    }
    p = o;
  }
  return p;
}

function dp(p, e) {
  if (p.length <= 2) return p;
  const [a,b] = [p[0], p[p.length-1]];
  const [dx,dy] = [b[0]-a[0], b[1]-a[1]];
  const l = Math.sqrt(dx*dx+dy*dy);
  let mx=0, mi=0;
  for (let i=1; i<p.length-1; i++) {
    const d = l>0 ? Math.abs(dy*p[i][0]-dx*p[i][1]+b[0]*a[1]-b[1]*a[0])/l
                  : Math.sqrt((p[i][0]-a[0])**2+(p[i][1]-a[1])**2);
    if (d>mx) { mx=d; mi=i; }
  }
  return mx>e ? [...dp(p.slice(0,mi+1),e).slice(0,-1), ...dp(p.slice(mi),e)] : [a,b];
}

function r(n) { return Math.round(n*10)/10; }

function catmullRom(pts) {
  const n = pts.length;
  let s = 'M '+r(pts[0][0])+','+r(pts[0][1]);
  for (let i=0; i<n; i++) {
    const p0=pts[(i-1+n)%n], p1=pts[i], p2=pts[(i+1)%n], p3=pts[(i+2)%n];
    const c1x=p1[0]+(p2[0]-p0[0])/6, c1y=p1[1]+(p2[1]-p0[1])/6;
    const c2x=p2[0]-(p3[0]-p1[0])/6, c2y=p2[1]-(p3[1]-p1[1])/6;
    s += ' C '+r(c1x)+','+r(c1y)+' '+r(c2x)+','+r(c2y)+' '+r(p2[0])+','+r(p2[1]);
  }
  return s + ' Z';
}

async function processCircuit(file, name, gw, gh, brightThreshold, cropTop=0, cropBottom=1) {
  const imgPath = path.join(__dirname, 'Photos site web', 'Circuits', file);
  const meta = await sharp(imgPath).metadata();
  const top = Math.round(cropTop * meta.height);
  const height = Math.round(cropBottom * meta.height) - top;

  const { data, info } = await sharp(imgPath)
    .extract({ left: 0, top, width: meta.width, height })
    .resize(gw, gh, { fit: 'fill' })
    .greyscale().raw().toBuffer({ resolveWithObject: true });

  const W = info.width, H = info.height;

  // INVERTED: bright pixels are the track (orange/white on dark background)
  const grid = Array.from({length:H}, (_,y) =>
    Array.from({length:W}, (_,x) => data[y*W+x] > brightThreshold ? 1 : 0)
  );

  // Print ASCII preview
  console.log(`\n=== ${name} (${W}x${H}) ===`);
  for (let y=0; y<H; y+=2) {
    let row = '';
    for (let x=0; x<W; x+=1) row += grid[y][x] ? 'X' : '.';
    console.log(row);
  }

  const sk = lcc(zhangSuen(grid, W, H), W, H);
  const pruned = pruneSpurs(sk, W, H, 12);
  const skPx = [];
  for (let y=0; y<H; y++) for (let x=0; x<W; x++) if (pruned[y][x]) skPx.push([x,y]);
  console.log(`Skeleton: ${skPx.length} px (after pruning)`);

  if (skPx.length < 10) { console.log('Too few pixels!'); return null; }

  // DFS chain trace on pruned skeleton (should be junction-free)
  const adj = new Map();
  for (const [x,y] of skPx) {
    const nb = [];
    for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++) {
      if (!dx && !dy) continue;
      const nx=x+dx, ny=y+dy;
      if (nx>=0&&nx<W&&ny>=0&&ny<H&&pruned[ny][nx]) nb.push(ny*W+nx);
    }
    adj.set(y*W+x, nb);
  }
  let start = null;
  for (const [k,nb] of adj) if (nb.length===1) { start=k; break; }
  if (!start) { let b=null; for (const [k] of adj) if (!b||k<b) b=k; start=b; }
  const visited = new Set(), traced = [];
  let cur = start, prev = null;
  while (cur !== null) {
    if (visited.has(cur)) break;
    visited.add(cur);
    traced.push({x: cur%W, y: Math.floor(cur/W)});
    const nb = (adj.get(cur)||[]).filter(k => k!==prev && !visited.has(k));
    prev = cur; cur = nb[0] ?? null;
  }
  const xs = skPx.map(p=>p[0]), ys = skPx.map(p=>p[1]);
  const mnX=Math.min(...xs), mxX=Math.max(...xs), mnY=Math.min(...ys), mxY=Math.max(...ys);
  const m=5, sw=190, sh=90, bw=mxX-mnX||1, bh=mxY-mnY||1;
  const toSVG = ([x,y]) => [m+(x-mnX)/bw*sw, m+(y-mnY)/bh*sh];

  const smooth = chaikin(traced.map(p => toSVG([p.x, p.y])), 2);
  const simplified = dp(smooth, 1.8);
  console.log(`Traced: ${traced.length} → simplified: ${simplified.length} pts`);
  const path_d = catmullRom(simplified);
  console.log('PATH:');
  console.log(path_d);
  return path_d;
}

(async () => {
  // Fontenay: orange on black → threshold 160 captures only bright core of orange stroke
  await processCircuit('Fontenay le comte.png', 'Fontenay', 200, 112, 160);
  // Pont-l'Eveque: white on dark → threshold 190 captures only bright white core
  await processCircuit("Pont l'\u00e9veque.png", "Pont-l'Eveque", 200, 112, 190);
})();
