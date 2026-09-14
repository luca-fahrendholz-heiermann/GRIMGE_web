using System;
using System.Collections.Generic;
using UnityEngine;

namespace GRIMGE.Prototype.Magic
{
    public enum RuneType
    {
        None = 0,
        Fire = 1,
        Wind = 2,
        Earth = 3,
        Lightning = 4
    }

    [Serializable]
    public class RuneStroke
    {
        public List<Vector2> Points = new List<Vector2>();

        public void AddPoint(Vector2 pt)
        {
            if (Points.Count == 0 || (Points[Points.Count - 1] - pt).sqrMagnitude > 0.0001f)
            {
                Points.Add(pt);
            }
        }
    }

    public static class RuneRecognizer
    {
        private const int SampleCount = 32;

        /// <summary>
        /// Recognizes a rune from a set of strokes drawn by the player.
        /// Evaluates geometric shape, directional profile, and template distance.
        /// </summary>
        public static (RuneType rune, float confidence) Recognize(List<RuneStroke> strokes, float threshold = 0.58f)
        {
            if (strokes == null || strokes.Count == 0) return (RuneType.None, 0f);

            // Collect all points
            List<Vector2> allPoints = new List<Vector2>();
            foreach (var stroke in strokes)
            {
                if (stroke.Points != null && stroke.Points.Count > 0)
                {
                    allPoints.AddRange(stroke.Points);
                }
            }

            if (allPoints.Count < 5) return (RuneType.None, 0f);

            // 1. Calculate bounding box
            float minX = float.MaxValue, maxX = float.MinValue;
            float minY = float.MaxValue, maxY = float.MinValue;
            foreach (var p in allPoints)
            {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            }

            float width = maxX - minX;
            float height = maxY - minY;
            if (width < 0.05f && height < 0.05f) return (RuneType.None, 0f); // too small dot

            // 2. Resample to uniform normalized points in [0, 1]
            List<Vector2> normalized = ResampleAndNormalize(allPoints, SampleCount, minX, maxX, minY, maxY);

            // 3. Compare with defined Rune Templates
            float bestScore = 0f;
            RuneType bestRune = RuneType.None;

            // Template A: Fire (Triangle / Flame: up to top apex, then down, then base)
            float fireScore = EvaluateFireShape(normalized);
            if (fireScore > bestScore)
            {
                bestScore = fireScore;
                bestRune = RuneType.Fire;
            }

            // Template B: Lightning (Zigzag 'Z': Right, Down-Left, Right)
            float lightningScore = EvaluateLightningShape(normalized);
            if (lightningScore > bestScore)
            {
                bestScore = lightningScore;
                bestRune = RuneType.Lightning;
            }

            // Template C: Wind (Wave / S-Curve / Spiral: horizontal undulation)
            float windScore = EvaluateWindShape(normalized);
            if (windScore > bestScore)
            {
                bestScore = windScore;
                bestRune = RuneType.Wind;
            }

            // Template D: Earth (Square / Arch: boxy boundaries)
            float earthScore = EvaluateEarthShape(normalized);
            if (earthScore > bestScore)
            {
                bestScore = earthScore;
                bestRune = RuneType.Earth;
            }

            if (bestScore >= threshold)
            {
                return (bestRune, bestScore);
            }

            return (RuneType.None, bestScore);
        }

        private static List<Vector2> ResampleAndNormalize(List<Vector2> points, int count, float minX, float maxX, float minY, float maxY)
        {
            List<Vector2> resampled = new List<Vector2>();
            float totalLen = 0f;
            for (int i = 1; i < points.Count; i++)
            {
                totalLen += Vector2.Distance(points[i - 1], points[i]);
            }

            if (totalLen <= 0.0001f)
            {
                for (int i = 0; i < count; i++) resampled.Add(Vector2.zero);
                return resampled;
            }

            float interval = totalLen / (count - 1);
            float currentDist = 0f;
            resampled.Add(Normalize(points[0], minX, maxX, minY, maxY));

            int ptIdx = 1;
            Vector2 prev = points[0];

            while (ptIdx < points.Count && resampled.Count < count)
            {
                float d = Vector2.Distance(prev, points[ptIdx]);
                if (currentDist + d >= interval)
                {
                    float t = (interval - currentDist) / d;
                    Vector2 interp = Vector2.Lerp(prev, points[ptIdx], t);
                    resampled.Add(Normalize(interp, minX, maxX, minY, maxY));
                    prev = interp;
                    currentDist = 0f;
                }
                else
                {
                    currentDist += d;
                    prev = points[ptIdx];
                    ptIdx++;
                }
            }

            while (resampled.Count < count)
            {
                resampled.Add(Normalize(points[points.Count - 1], minX, maxX, minY, maxY));
            }

            return resampled;
        }

        private static Vector2 Normalize(Vector2 p, float minX, float maxX, float minY, float maxY)
        {
            float w = Mathf.Max(0.0001f, maxX - minX);
            float h = Mathf.Max(0.0001f, maxY - minY);
            return new Vector2((p.x - minX) / w, (p.y - minY) / h);
        }

        private static float EvaluateFireShape(List<Vector2> pts)
        {
            // Fire triangle: starts lower half, reaches highest apex around middle X in top 25%, returns to bottom
            int apexIndex = 0;
            float maxY = 0f;
            for (int i = 0; i < pts.Count; i++)
            {
                if (pts[i].y > maxY)
                {
                    maxY = pts[i].y;
                    apexIndex = i;
                }
            }

            // Apex should be near middle in time and horizontally
            float apexX = pts[apexIndex].x;
            float apexTimeRatio = (float)apexIndex / pts.Count;

            bool goodApexY = maxY > 0.85f;
            bool goodApexX = apexX > 0.25f && apexX < 0.75f;
            bool goodApexTime = apexTimeRatio > 0.2f && apexTimeRatio < 0.8f;

            float score = 0f;
            if (goodApexY) score += 0.4f;
            if (goodApexX) score += 0.35f;
            if (goodApexTime) score += 0.25f;

            return score;
        }

        private static float EvaluateLightningShape(List<Vector2> pts)
        {
            // Zigzag 'Z': starts top-left (or high), moves right, then slashes down-left, then moves right
            // Track X velocity direction changes
            int dirChanges = 0;
            float prevDx = 0f;

            for (int i = 1; i < pts.Count; i++)
            {
                float dx = pts[i].x - pts[i - 1].x;
                if (Mathf.Abs(dx) > 0.02f)
                {
                    if (prevDx != 0f && Mathf.Sign(dx) != Mathf.Sign(prevDx))
                    {
                        dirChanges++;
                    }
                    prevDx = dx;
                }
            }

            // Overall movement should be top to bottom
            bool topToBottom = pts[0].y > pts[pts.Count - 1].y + 0.3f;
            float score = 0f;
            if (dirChanges >= 2) score += 0.55f;
            else if (dirChanges == 1) score += 0.3f;
            if (topToBottom) score += 0.4f;

            return score;
        }

        private static float EvaluateWindShape(List<Vector2> pts)
        {
            // Wave / S-curve: Left to right with undulating Y or curvature
            bool leftToRight = pts[pts.Count - 1].x > pts[0].x + 0.4f;
            int yInflections = 0;
            float prevDy = 0f;

            for (int i = 1; i < pts.Count; i++)
            {
                float dy = pts[i].y - pts[i - 1].y;
                if (Mathf.Abs(dy) > 0.02f)
                {
                    if (prevDy != 0f && Mathf.Sign(dy) != Mathf.Sign(prevDy))
                    {
                        yInflections++;
                    }
                    prevDy = dy;
                }
            }

            float score = 0f;
            if (leftToRight) score += 0.45f;
            if (yInflections >= 2) score += 0.5f;
            else if (yInflections == 1) score += 0.3f;

            return score;
        }

        private static float EvaluateEarthShape(List<Vector2> pts)
        {
            // Square / Box: points visit all 4 quadrants (corners) or form a closed loop with horizontal base
            bool hasBL = false, hasBR = false, hasTL = false, hasTR = false;
            foreach (var p in pts)
            {
                if (p.x < 0.35f && p.y < 0.35f) hasBL = true;
                if (p.x > 0.65f && p.y < 0.35f) hasBR = true;
                if (p.x < 0.35f && p.y > 0.65f) hasTL = true;
                if (p.x > 0.65f && p.y > 0.65f) hasTR = true;
            }

            int corners = (hasBL ? 1 : 0) + (hasBR ? 1 : 0) + (hasTL ? 1 : 0) + (hasTR ? 1 : 0);
            float score = (corners / 4f) * 0.95f;
            return score;
        }
    }
}
