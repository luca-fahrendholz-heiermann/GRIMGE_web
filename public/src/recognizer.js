// GRIMGE Prototype — Rune Gesture Recognition System (High-Tolerance Radial & Angular Engine)
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
      }
    ];
  }

  recognize(strokes, allowedRuneIds = null) {
    if (!strokes || strokes.length === 0) return null;

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
