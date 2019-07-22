/**
 * Vector math module
 * @module @ideditor/vector
 * @see module:@ideditor/vector
 */

type Vec2 = [number, number];

/** Test whether two given vectors are equal
 *  @param {Vec2} a - First vector
 *  @param {Vec2} b - Second vector
 *  @param {number} [epsilon] - Threshold for equality
 *  @returns {boolean} True if equal, false if unequal
 */
export function vecEqual(a: Vec2, b: Vec2, epsilon?: number): boolean {
  if (epsilon) {
    return Math.abs(a[0] - b[0]) <= epsilon && Math.abs(a[1] - b[1]) <= epsilon;
  } else {
    return a[0] === b[0] && a[1] === b[1];
  }
}

/** Add two vectors
 *  @param {Vec2} a - First vector
 *  @param {Vec2} b - Second vector
 *  @returns {Vec2} Sum of a + b
 */
export function vecAdd(a: Vec2, b: Vec2): Vec2 {
  return [a[0] + b[0], a[1] + b[1]];
}

/** Subtract two vectors
 *  @param {Vec2} a - First vector
 *  @param {Vec2} b - Second vector
 *  @returns {Vec2} Difference of a - b
 */
export function vecSubtract(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]];
}

/** Scale a vector uniformly by factor
 *  @param {Vec2} a - Input vector
 *  @param {number} n - Scale factor
 *  @returns {Vec2} Scaled vector
 */
export function vecScale(a: Vec2, n: number): Vec2 {
  return [a[0] * n, a[1] * n];
}

/** Floor the coordinates of a vector
 *  @param {Vec2} a - Input vector
 *  @returns {Vec2} Floored vector
 */
export function vecFloor(a: Vec2): Vec2 {
  return [Math.floor(a[0]), Math.floor(a[1])];
}

/** Linear interpolate a point along a vector
 *  @param {Vec2} a - Start coordinate
 *  @param {Vec2} b - End coordinate
 *  @param {number} t - Scaled distance between ab
 *  @returns {Vec2} Point along ab
 */
export function vecInterp(a: Vec2, b: Vec2, t: number): Vec2 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Length of a vector
 *  @param {Vec2} a - Start coordinate
 *  @param {Vec2} [b=[0,0]] - End coordinate
 *  @returns {Vec2} Length of ab
 */
// http://jsperf.com/id-dist-optimization
export function vecLength(a: Vec2, b?: Vec2): number {
  b = b || [0, 0];
  const x: number = a[0] - b[0];
  const y: number = a[1] - b[1];
  return Math.sqrt(x * x + y * y);
}

/** Normalize a vector (return a unit vector)
 *  @param {Vec2} a - Input vector
 *  @returns {Vec2} Unit vector
 */
export function vecNormalize(a: Vec2): Vec2 {
  const length: number = Math.sqrt(a[0] * a[0] + a[1] * a[1]);
  if (length !== 0) {
    return vecScale(a, 1 / length);
  }
  return [0, 0];
}

/** Return the counterclockwise angle in the range (-pi, pi)
 *  between the positive X axis and the line intersecting a and b.
 *  @param {Vec2} a - First vector
 *  @param {Vec2} b - Second vector
 *  @returns {number} Angle between a and b
 */
export function vecAngle(a: Vec2, b: Vec2): number {
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

/** Dot Product
 *  @param {Vec2} a - First vector
 *  @param {Vec2} b - Second vector
 *  @param {Vec2} [origin=[0,0]] - Origin
 *  @returns {number} a · b
 */
export function vecDot(a: Vec2, b: Vec2, origin?: Vec2): number {
  origin = origin || [0, 0];
  const p: Vec2 = vecSubtract(a, origin);
  const q: Vec2 = vecSubtract(b, origin);
  return p[0] * q[0] + p[1] * q[1];
}

/** Normalized Dot Product
 *  @param {Vec2} a - First vector
 *  @param {Vec2} b - Second vector
 *  @param {Vec2} [origin=[0,0]] - Origin
 *  @returns {number} a · b
 */
export function vecNormalizedDot(a: Vec2, b: Vec2, origin?: Vec2): number {
  origin = origin || [0, 0];
  const p: Vec2 = vecNormalize(vecSubtract(a, origin));
  const q: Vec2 = vecNormalize(vecSubtract(b, origin));
  return vecDot(p, q);
}

/** 2D cross product of OA and OB vectors, returns magnitude of Z vector
 *  Returns a positive value, if OAB makes a counter-clockwise turn,
 *  negative for clockwise turn, and zero if the points are collinear.
 *  @param {Vec2} a - First vector
 *  @param {Vec2} b - Second vector
 *  @param {Vec2} [origin=[0,0]] - Origin
 *  @returns {number} a ⅹ b
 */
export function vecCross(a: Vec2, b: Vec2, origin?: Vec2): number {
  origin = origin || [0, 0];
  const p: Vec2 = vecSubtract(a, origin);
  const q: Vec2 = vecSubtract(b, origin);
  return p[0] * q[1] - p[1] * q[0];
}

interface Edge {
  index: number;
  distance: number;
  target: Vec2;
}

/** Find closest orthogonal projection of point onto points array
 *  @param {Vec2} a - Point to project
 *  @param {Vec2[]} points - Path to project point onto
 *  @returns {Edge} Edge and target point along edge
 */
export function vecProject(a: Vec2, points: Vec2[]): Edge | null {
  let min: number = Infinity;
  let idx: number;
  let target: Vec2;

  for (let i: number = 0; i < points.length - 1; i++) {
    const o: Vec2 = points[i];
    const s: Vec2 = vecSubtract(points[i + 1], o);
    const v: Vec2 = vecSubtract(a, o);
    const proj: number = vecDot(v, s) / vecDot(s, s);
    let p: Vec2;

    if (proj < 0) {
      p = o;
    } else if (proj > 1) {
      p = points[i + 1];
    } else {
      p = [o[0] + proj * s[0], o[1] + proj * s[1]];
    }

    let dist: number = vecLength(p, a);
    if (dist < min) {
      min = dist;
      idx = i + 1;
      target = p;
    }
  }

  if (idx !== undefined) {
    return { index: idx, distance: min, target: target };
  } else {
    return null;
  }
}