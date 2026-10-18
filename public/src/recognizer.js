// GRIMGE Prototype — Rune Gesture Recognition System (High-Tolerance Radial & Angular Engine)
import { BUFF_FORM_DATA } from './buff_forms_data.js';
export class RuneRecognizer {
  constructor() {
    this.runes = [
      {
        id: 'ignis',
        name: 'IGNIS',
        element: 'Fire',
        glyph: '▲',
        color: '#ff4b1f',
        glowColor: '#ff9068',
        icon: '🔥',
        desc: 'Upward Triangle or Chevron'
      },
      {
        id: 'ventus',
        name: 'VENTUS',
        element: 'Wind',
        glyph: '—',
        color: '#00d2ff',
        glowColor: '#92fe9d',
        icon: '💨',
        desc: 'Horizontal Slash / Dash'
      },
      {
        id: 'fulgur',
        name: 'FULGUR',
        element: 'Lightning',
        glyph: '⚡',
        color: '#ffd000',
        glowColor: '#fff59d',
        icon: '⚡',
        desc: 'Zig-Zag Shape (Z)'
      },
      {
        id: 'terra',
        name: 'TERRA',
        element: 'Earth',
        glyph: '□',
        color: '#43a047',
        glowColor: '#a5d6a7',
        icon: '🪨',
        desc: 'Square / U-Box'
      },
      {
        id: 'aqua',
        name: 'AQUA',
        element: 'Frost',
        glyph: '○',
        color: '#00e5ff',
        glowColor: '#b2ebf2',
        icon: '❄️',
        desc: 'Circular Glyph'
      },
      {
        id: 'bestia',
        name: 'BESTIA',
        element: 'Beast',
        glyph: 'ᛗ',
        color: '#b388ff',
        glowColor: '#e1bee7',
        icon: '🐺',
        desc: 'Three-Peak Claw / M'
      },
      {
        id: 'construct',
        name: 'KONSTRUKT',
        element: 'Construct',
        glyph: '▥',
        color: '#b0bec5',
        glowColor: '#eceff1',
        icon: '⚙️',
        desc: 'Tall Pillar / Tower Stroke'
      },
      {
        id: 'void',
        name: 'VOID',
        element: 'Void',
        glyph: '◉',
        color: '#8e24aa',
        glowColor: '#ea80fc',
        icon: '🕳️',
        desc: 'Open Spiral / Void Eye'
      },
      {
        id: 'lux',
        name: 'LUX',
        element: 'Light',
        glyph: '✧',
        color: '#ffe082',
        glowColor: '#fff8e1',
        icon: '☀',
        desc: 'Star: four crossing lines (+ then ×)'
      },
      {
        id: 'umbra',
        name: 'UMBRA',
        element: 'Shadow',
        glyph: '☾',
        color: '#7e57c2',
        glowColor: '#b39ddb',
        icon: '☾',
        desc: 'Open crescent arc (C shape)'
      },
      {
        id: 'doppel',
        name: 'DOPPEL',
        element: 'Shadow',
        glyph: '∞',
        color: '#5e35b1',
        glowColor: '#9575cd',
        icon: '♊',
        desc: 'Special: one closed figure-eight (∞) — your shadow double'
      },
      {
        id: 'mortis',
        name: 'MORTIS',
        element: 'Death',
        glyph: '⛤',
        color: '#9ccc65',
        glowColor: '#dcedc8',
        icon: '☠',
        desc: 'Special: a five-pointed star in one stroke — raise the fallen'
      },
      {
        id: 'transform_beam',
        name: 'ANNIHILATION BEAM',
        element: 'Transformation',
        glyph: '★',
        color: '#ff4cff',
        glowColor: '#ff99ff',
        icon: '★',
        desc: 'Any gesture while Focus Ascendant'
      },
      {
        id: 'transform_implode',
        name: 'VOID IMPLOSION',
        element: 'Transformation',
        glyph: '◉',
        color: '#b668ff',
        glowColor: '#d596ff',
        icon: '◉',
        desc: 'Any gesture while Eidolon Mantle'
      },
      {
        id: 'transform_rampage',
        name: 'INFERNO RAMPAGE',
        element: 'Transformation',
        glyph: '⚡',
        color: '#ff6f3b',
        glowColor: '#ffab91',
        icon: '⚡',
        desc: 'Any gesture while Ninefold Beast'
      },
      // Arcane States: one special rune per form, one hourglass sigil.
      ...BUFF_FORM_DATA.map((form) => ({
        id: 'buff_' + form.id,
        name: form.name.toUpperCase(),
        element: 'Arcane State',
        glyph: '⧗',
        color: form.palette?.[1] ?? '#ffd27a',
        glowColor: form.palette?.[2] ?? '#fff3c4',
        icon: '⧗',
        isBuffForm: true,
        tags: ['arcane-state', 'max-1-per-deck'],
        desc: 'Special: the hourglass sigil ⧗ in one closed stroke — ARCANE STATE, max. 1 per deck'
      }))
    ];
  }

  recognize(strokes, allowedRuneIds = null) {
    if (!strokes || strokes.length === 0) return null;

    const starScore = this.crossingStarScore(strokes);
    const rawPoints = [];
    for (const stroke of strokes) {
      for (const pt of stroke) rawPoints.push({ x: pt.x, y: pt.y });
    }

    if (rawPoints.length < 5) return null;

    // 1. Total Length
    let totalLen = 0;
    for (let i = 1; i < rawPoints.length; i++) {
      totalLen += Math.hypot(rawPoints[i].x - rawPoints[i - 1].x, rawPoints[i].y - rawPoints[i - 1].y);
    }
    if (totalLen < 25) return null;

    // 2. Resample to 32 equidistant points
    const points = this.resample(rawPoints, 32);

    // 3. Bounding Box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let sumX = 0, sumY = 0;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      sumX += p.x;
      sumY += p.y;
    }
    const bbWidth = Math.max(1, maxX - minX);
    const bbHeight = Math.max(1, maxY - minY);
    const aspectRatio = bbWidth / bbHeight;

    // 4. Centroid & Radial Variance (Invariance Engine)
    const cx = sumX / points.length;
    const cy = sumY / points.length;

    let rSum = 0;
    for (const p of points) rSum += Math.hypot(p.x - cx, p.y - cy);
    const rMean = Math.max(1, rSum / points.length);

    let vSum = 0;
    for (const p of points) {
      const d = Math.hypot(p.x - cx, p.y - cy) - rMean;
      vSum += d * d;
    }
    const rStd = Math.sqrt(vSum / points.length) / rMean;

    // 5. Start / End Closure
    const startPt = points[0];
    const endPt = points[points.length - 1];
    const closureDist = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);
    const isClosed = (closureDist / Math.max(bbWidth, bbHeight)) < 0.48;

    // 6. X-Direction Reversals (Zig-zag)
    let xReversals = 0;
    let lastDirX = 0;
    for (let i = 4; i < points.length; i += 4) {
      const dx = points[i].x - points[i - 4].x;
      if (Math.abs(dx) > bbWidth * 0.15) {
        const dir = Math.sign(dx);
        if (lastDirX !== 0 && dir !== lastDirX) {
          xReversals++;
        }
        lastDirX = dir;
      }
    }

    // An M/claw travels left-to-right, but reverses vertically several
    // times. FULGUR is the opposite: it reverses in X.
    let yReversals = 0;
    let lastDirY = 0;
    for (let i = 4; i < points.length; i += 4) {
      const dy = points[i].y - points[i - 4].y;
      if (Math.abs(dy) > bbHeight * 0.12) {
        const dir = Math.sign(dy);
        if (lastDirY !== 0 && dir !== lastDirY) yReversals++;
        lastDirY = dir;
      }
    }

    // 7. Apex point (highest point / minimum Y)
    let minYIdx = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].y < points[minYIdx].y) minYIdx = i;
    }
    const apexIsMid = (minYIdx >= 5 && minYIdx <= 27);
    // Lowest point (maximum Y) for the downward LUX chevron.
    let maxYIdx = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].y > points[maxYIdx].y) maxYIdx = i;
    }
    const valleyIsMid = (maxYIdx >= 5 && maxYIdx <= 27);

    // 8. Turning: summed signed heading change along the stroke. A circle
    // turns once (±2π), a figure-eight's two lobes cancel out (~0) and a
    // one-stroke pentagram turns twice (±4π) with sharp corners.
    let netTurn = 0; let absTurn = 0;
    for (let i = 2; i < points.length; i++) {
      const a1 = Math.atan2(points[i - 1].y - points[i - 2].y, points[i - 1].x - points[i - 2].x);
      const a2 = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x);
      let d = a2 - a1;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      netTurn += d; absTurn += Math.abs(d);
    }
    const loopClosed = (closureDist / Math.max(bbWidth, bbHeight)) < 0.42;
    if (loopClosed) {
      // Include the corner where the stroke closes (end heading → start heading).
      const n = points.length;
      const aEnd = Math.atan2(points[n - 1].y - points[n - 2].y, points[n - 1].x - points[n - 2].x);
      const aStart = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
      let d = aStart - aEnd;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      netTurn += d; absTurn += Math.abs(d);
    }

    // Scoring
    const scores = {};

    // The recognizer deliberately has a generous "can identify" band.  A
    // player should not lose a rune because a finger path is wobbly; the
    // quality grade carries the precision signal into spell strength instead.
    // Very short paths and generic scribbles are still rejected above.
    // VENTUS (Horizontal Dash: wide aspect ratio, low height)
    if (aspectRatio >= 2.0 && bbHeight < 75) {
      scores.ventus = 0.95;
    } else if (aspectRatio >= 1.6 && Math.abs(startPt.y - endPt.y) < bbHeight * 0.45) {
      scores.ventus = 0.85;
    } else if (aspectRatio >= 1.32 && Math.abs(startPt.y - endPt.y) < Math.max(14, bbHeight * 0.78)) {
      scores.ventus = 0.53;
    } else {
      scores.ventus = 0.1;
    }

    // FULGUR (Zig-Zag Z: 2+ direction changes, open ends)
    if (xReversals >= 2 && !isClosed && aspectRatio > 0.5 && aspectRatio < 2.4) {
      scores.fulgur = 0.95;
    } else if (xReversals === 1 && !isClosed && aspectRatio > 0.6) {
      scores.fulgur = 0.72;
    } else if (xReversals >= 1 && !isClosed && aspectRatio > 0.48) {
      scores.fulgur = 0.55;
    } else {
      scores.fulgur = 0.1;
    }

    // AQUA: a touch circle is rarely a perfect mathematical loop. Treat a
    // near-closed, wobbly oval as a valid C-quality rune; accuracy affects
    // spell strength rather than making the input unusable.
    const nearClosed = (closureDist / Math.max(bbWidth, bbHeight)) < 0.92;
    if (isClosed && rStd < 0.09 && aspectRatio >= 0.7 && aspectRatio <= 1.45) {
      scores.aqua = 0.96;
    } else if (isClosed && rStd < 0.11 && aspectRatio >= 0.65 && aspectRatio <= 1.55) {
      scores.aqua = 0.82;
    } else if (isClosed && rStd < 0.16 && aspectRatio >= 0.52 && aspectRatio <= 1.85) {
      scores.aqua = 0.55;
    } else if (nearClosed && rStd < 0.25 && aspectRatio >= 0.45 && aspectRatio <= 2.15) {
      scores.aqua = 0.62;
    } else if (nearClosed && rStd < 0.34 && aspectRatio >= 0.36 && aspectRatio <= 2.45) {
      scores.aqua = 0.51;
    } else {
      scores.aqua = 0.1;
    }

    // TERRA (Square: closed or boxy, moderate radial variance 0.09 < rStd < 0.19, aspect ratio ~ 1)
    if (isClosed && rStd >= 0.09 && rStd <= 0.19 && aspectRatio >= 0.7 && aspectRatio <= 1.45) {
      scores.terra = 0.92;
    } else if ((isClosed || closureDist < bbWidth * 0.6) && rStd >= 0.08 && rStd <= 0.22 && aspectRatio >= 0.65 && aspectRatio <= 1.55) {
      scores.terra = 0.78;
    } else if ((isClosed || closureDist < Math.max(bbWidth, bbHeight) * 0.72)
        && rStd >= 0.07 && rStd <= 0.29 && aspectRatio >= 0.52 && aspectRatio <= 1.85) {
      scores.terra = 0.54;
    } else {
      scores.terra = 0.1;
    }

    if (!isClosed && xReversals === 0 && yReversals >= 2 && aspectRatio >= 0.58 && aspectRatio <= 2.3) {
      scores.bestia = 0.94;
    } else if (!isClosed && xReversals <= 1 && yReversals >= 2 && aspectRatio >= 0.42 && aspectRatio <= 2.7) {
      scores.bestia = 0.72;
    } else if (!isClosed && yReversals >= 1 && aspectRatio >= 0.48 && aspectRatio <= 2.8) {
      scores.bestia = 0.53;
    } else {
      scores.bestia = 0.1;
    }

    // The deck-hand restriction makes a deliberately forgiving pillar a
    // readable, low-friction KONSTRUKT gesture instead of a precision test.
    if (!isClosed && aspectRatio <= 0.42 && bbHeight >= 58) {
      scores.construct = 0.94;
    } else if (!isClosed && aspectRatio <= 0.62 && bbHeight >= 42) {
      scores.construct = 0.72;
    } else if (!isClosed && aspectRatio <= 0.82 && bbHeight >= 34) {
      scores.construct = 0.53;
    } else {
      scores.construct = 0.1;
    }

    // VOID is an open spiral/eye: unlike FULGUR it changes direction in both
    // axes repeatedly. Hand-card filtering keeps this lenient under touch.
    if (!isClosed && xReversals >= 2 && yReversals >= 2 && rStd > 0.16) {
      scores.void = 0.96;
    } else if (!isClosed && xReversals >= 1 && yReversals >= 2 && rStd > 0.12) {
      scores.void = 0.74;
    } else if (!isClosed && xReversals >= 1 && yReversals >= 1 && rStd > 0.10) {
      scores.void = 0.53;
    } else {
      scores.void = 0.1;
    }

    // IGNIS (Triangle / Chevron: apex in middle, higher rStd, apex higher than ends)
    if (apexIsMid && (rStd > 0.17 || !isClosed) && points[minYIdx].y < startPt.y - bbHeight * 0.35 && points[minYIdx].y < endPt.y - bbHeight * 0.35) {
      scores.ignis = isClosed ? 0.95 : 0.90;
    } else if (apexIsMid && !isClosed && (aspectRatio >= 0.6 && aspectRatio <= 2.0)) {
      scores.ignis = 0.80;
    } else if (apexIsMid && !isClosed && aspectRatio >= 0.42 && aspectRatio <= 2.45
        && points[minYIdx].y < Math.min(startPt.y, endPt.y) - Math.max(8, bbHeight * 0.18)) {
      scores.ignis = 0.55;
    } else {
      scores.ignis = 0.1;
    }

    // LUX: a downward V (sun ray) — the mirror image of the IGNIS triangle.
    const valleyDepth = points[maxYIdx].y - Math.max(startPt.y, endPt.y);
    if (valleyIsMid && !isClosed && xReversals === 0 && valleyDepth > bbHeight * 0.55 && aspectRatio >= 0.45 && aspectRatio <= 2.4) {
      scores.lux = 0.94;
    } else if (valleyIsMid && !isClosed && xReversals <= 1 && valleyDepth > bbHeight * 0.35 && aspectRatio >= 0.35 && aspectRatio <= 2.8) {
      scores.lux = 0.76;
    } else if (valleyIsMid && !isClosed && valleyDepth > bbHeight * 0.2) {
      scores.lux = 0.52;
    } else {
      scores.lux = 0.1;
    }
    // The LUX star: separate straight strokes crossing at one centre.
    scores.lux = Math.max(scores.lux, starScore);

    // UMBRA: an open crescent / C arc — round like AQUA but clearly open,
    // with both ends on the same side of the centre.
    const closureRatio = closureDist / Math.max(bbWidth, bbHeight);
    const endsSameSide = Math.sign(startPt.x - cx) === Math.sign(endPt.x - cx) && Math.abs(startPt.x - cx) > bbWidth * .12 && Math.abs(endPt.x - cx) > bbWidth * .12;
    if (closureRatio >= 0.5 && closureRatio <= 1.25 && endsSameSide && rStd < 0.24 && aspectRatio >= 0.35 && aspectRatio <= 1.3) {
      scores.umbra = 0.93;
    } else if (closureRatio >= 0.4 && closureRatio <= 1.4 && endsSameSide && rStd < 0.32) {
      scores.umbra = 0.74;
    } else if (closureRatio >= 0.35 && endsSameSide && yReversals <= 1) {
      scores.umbra = 0.52;
    } else {
      scores.umbra = 0.1;
    }

    // DOPPEL (special, hard): a closed horizontal figure-eight.
    if (loopClosed && Math.abs(netTurn) < Math.PI * .75 && absTurn > Math.PI * 2.5 && aspectRatio >= 1.3 && aspectRatio <= 4.2 && rStd > .22) {
      scores.doppel = 0.97;
    } else if (closureDist / Math.max(bbWidth, bbHeight) < 0.6 && Math.abs(netTurn) < Math.PI && absTurn > Math.PI * 2.2 && aspectRatio >= 1.1 && aspectRatio <= 4.8 && rStd > .18) {
      scores.doppel = 0.7;
    } else {
      scores.doppel = 0.1;
    }

    // MORTIS (special, hard): a closed one-stroke five-pointed star.
    if (loopClosed && Math.abs(netTurn) > Math.PI * 3.2 && rStd > .15 && aspectRatio >= .6 && aspectRatio <= 1.6) {
      scores.mortis = 0.97;
    } else if (closureDist / Math.max(bbWidth, bbHeight) < 0.85 && Math.abs(netTurn) > Math.PI * 2.5 && rStd > .18 && aspectRatio >= .45 && aspectRatio <= 2.1) {
      // A wobbly or not quite closed star still counts (lower grade).
      scores.mortis = 0.74;
    } else {
      scores.mortis = 0.1;
    }

    // BUFF SIGIL (special): a closed hourglass ⧗ in one stroke — two
    // triangles tip to tip. Tall, sharp-cornered, net turn ≈ 0 (unlike the
    // round, wide ∞ of DOPPEL and the open Z of FULGUR).
    let sigil = 0.1;
    if (loopClosed && Math.abs(netTurn) < Math.PI * .8 && absTurn > Math.PI * 2.2 && aspectRatio >= .35 && aspectRatio <= 1.15) sigil = 0.96;
    else if (closureDist / Math.max(bbWidth, bbHeight) < 0.6 && Math.abs(netTurn) < Math.PI && absTurn > Math.PI * 1.9 && aspectRatio >= .3 && aspectRatio <= 1.3) sigil = 0.72;
    for (const id of allowedRuneIds ?? []) if (String(id).startsWith('buff_')) scores[id] = sigil;

    if (allowedRuneIds?.includes('transform_beam')) scores.transform_beam = 0.92;
    if (allowedRuneIds?.includes('transform_implode')) scores.transform_implode = 0.92;
    if (allowedRuneIds?.includes('transform_rampage')) scores.transform_rampage = 0.92;

    let bestRune = null;
    let bestScore = 0.48;

    const allowed = allowedRuneIds ? new Set(allowedRuneIds) : null;
    for (const [id, score] of Object.entries(scores)) {
      if (allowed && !allowed.has(id)) continue;
      if (score > bestScore) {
        bestScore = score;
        bestRune = this.runes.find(r => r.id === id);
      }
    }

    if (bestRune) {
      return {
        rune: bestRune,
        confidence: bestScore,
        grade: this.gradeForConfidence(bestScore),
        bounds: { minX, maxX, minY, maxY, width: bbWidth, height: bbHeight }
      };
    }

    return null;
  }

  // LUX star: 2+ separate, fairly straight strokes that all cross near one
  // centre at clearly different angles. Four lines (+ and ×) are ideal.
  crossingStarScore(strokes) {
    const lines = strokes.filter((stroke) => stroke.length >= 2).map((stroke) => {
      let length = 0;
      for (let i = 1; i < stroke.length; i++) length += Math.hypot(stroke[i].x - stroke[i - 1].x, stroke[i].y - stroke[i - 1].y);
      const a = stroke[0]; const b = stroke[stroke.length - 1];
      const chord = Math.hypot(b.x - a.x, b.y - a.y);
      return { a, b, length, chord, angle: ((Math.atan2(b.y - a.y, b.x - a.x) % Math.PI) + Math.PI) % Math.PI };
    });
    if (lines.length < 2 || lines.some((line) => line.chord < 18 || line.chord / Math.max(1, line.length) < .8)) return 0;
    const size = lines.reduce((sum, line) => sum + line.chord, 0) / lines.length;
    const cx = lines.reduce((sum, line) => sum + (line.a.x + line.b.x) / 2, 0) / lines.length;
    const cy = lines.reduce((sum, line) => sum + (line.a.y + line.b.y) / 2, 0) / lines.length;
    // Every line must pass close to the common centre.
    const distanceToSegment = (line) => {
      const dx = line.b.x - line.a.x; const dy = line.b.y - line.a.y;
      const t = Math.max(0, Math.min(1, ((cx - line.a.x) * dx + (cy - line.a.y) * dy) / Math.max(1, dx * dx + dy * dy)));
      return Math.hypot(line.a.x + dx * t - cx, line.a.y + dy * t - cy);
    };
    if (lines.some((line) => distanceToSegment(line) > size * .28)) return 0;
    // Angles must differ clearly (no two parallel strokes).
    const angles = lines.map((line) => line.angle).sort((p, q) => p - q);
    let minGap = Math.PI - angles[angles.length - 1] + angles[0];
    for (let i = 1; i < angles.length; i++) minGap = Math.min(minGap, angles[i] - angles[i - 1]);
    if (lines.length >= 4) return minGap > .3 ? 0.99 : 0;
    if (lines.length === 3) return minGap > .4 ? 0.97 : 0;
    return minGap > .9 ? 0.78 : 0;
  }

  gradeForConfidence(confidence) {
    if (confidence >= 0.92) return 'S';
    if (confidence >= 0.80) return 'A';
    if (confidence >= 0.64) return 'B';
    return 'C';
  }

  resample(points, n) {
    const totalDist = [0];
    for (let i = 1; i < points.length; i++) {
      totalDist.push(totalDist[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
    }
    const pathLen = totalDist[totalDist.length - 1];
    if (pathLen === 0) return points.slice(0, n);

    const interval = pathLen / (n - 1);
    const resampled = [points[0]];

    for (let i = 1; i < n - 1; i++) {
      const targetDist = i * interval;
      let seg = 1;
      while (seg < totalDist.length && totalDist[seg] < targetDist) seg++;
      if (seg >= totalDist.length) seg = totalDist.length - 1;

      const segLen = totalDist[seg] - totalDist[seg - 1];
      const t = (segLen > 0) ? (targetDist - totalDist[seg - 1]) / segLen : 0;
      const p0 = points[seg - 1];
      const p1 = points[seg];

      resampled.push({
        x: p0.x + (p1.x - p0.x) * t,
        y: p0.y + (p1.y - p0.y) * t
      });
    }

    resampled.push(points[points.length - 1]);
    return resampled;
  }
}

export const recognizer = new RuneRecognizer();
