function analyze(pts) {
  let cx = 0, cy = 0;
  for (const p of pts) { cx += p.x; cy += p.y; }
  cx /= pts.length;
  cy /= pts.length;

  let rSum = 0;
  for (const p of pts) rSum += Math.hypot(p.x - cx, p.y - cy);
  const rMean = rSum / pts.length;

  let vSum = 0;
  for (const p of pts) {
    const d = Math.hypot(p.x - cx, p.y - cy) - rMean;
    vSum += d * d;
  }
  const rStd = Math.sqrt(vSum / pts.length) / rMean;
  return { cx, cy, rMean, rStd };
}

// Circle
const circle = [];
for (let a = 0; a <= Math.PI * 2; a += 0.15) circle.push({ x: 200 + Math.cos(a)*80, y: 200 + Math.sin(a)*80 });

// Square
const sq = [];
for (let x = 100; x <= 200; x += 10) sq.push({ x, y: 100 });
for (let y = 100; y <= 200; y += 10) sq.push({ x: 200, y });
for (let x = 200; x >= 100; x -= 10) sq.push({ x, y: 200 });
for (let y = 200; y >= 100; y -= 10) sq.push({ x: 100, y });

// Triangle
const tri = [];
for (let t = 0; t <= 1; t += 0.05) tri.push({ x: 100 + t * 100, y: 300 - t * 150 });
for (let t = 0; t <= 1; t += 0.05) tri.push({ x: 200 + t * 100, y: 150 + t * 150 });
for (let t = 0; t <= 1; t += 0.05) tri.push({ x: 300 - t * 200, y: 300 });

console.log("Circle rStd:", analyze(circle).rStd);
console.log("Square rStd:", analyze(sq).rStd);
console.log("Triangle rStd:", analyze(tri).rStd);
