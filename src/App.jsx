/**
 * Estim Hero Hex Pattern Designer
 * 
 * Interactive tool for designing two-color hexagonal patterns on the
 * Estim Hero electrostimulation device enclosure panels.
 * 
 * Grid: 33 columns × 14 rows, flat-top hexagons, column-offset interleave
 * Colors: Shiny blue silk PLA + shiny silver silk PLA, black base
 * 
 * See PROJECT.md for full documentation.
 */
import { useState, useEffect, useRef, useCallback } from "react";

const COLS = 33, ROWS = 14;
const DEFAULT_COLOR1 = '#4A90D9', DEFAULT_COLOR2 = '#C0C8D0', DEFAULT_BASE = '#1a1a1a';

// --- Vent/cutout definitions (extracted from 3MF mesh geometry) ---
// Bottom panel: odd_col_down=True (code convention), positions used directly
// Top panel: odd_col_down=False in 3MF, converted to True (odd col rows shifted by -1)

function makeTopVents() {
  // E shape (cols 9-11), center vents (cols 15-17), H shape (cols 21-23)
  return new Set([
    '9,2', '9,3', '9,4', '9,5', '9,6', '9,7', '9,8',
    '10,2', '10,5', '10,6', '10,9',
    '11,2', '11,5', '11,8',
    '15,3', '15,7',
    '16,3', '16,4', '16,7', '16,8',
    '17,3', '17,7',
    '21,2', '21,3', '21,4', '21,5', '21,6', '21,7', '21,8',
    '22,5', '22,6',
    '23,2', '23,3', '23,4', '23,5', '23,6', '23,7', '23,8',
  ]);
}

function makeBottomVents() {
  // Concentric speaker vent pattern centered around col 15, row 5
  return new Set([
    '13,4', '13,5', '13,6', '14,4', '14,7', '15,3', '15,5', '15,7',
    '16,4', '16,7', '17,4', '17,5', '17,6',
  ]);
}

function makeTopCutouts() {
  // Corners, knob region (cols 13-29 at rows 12-13), edge positions
  return new Set([
    '0,12', '0,13', '1,13', '3,13', '5,13', '7,13', '9,13', '11,13',
    '13,12', '13,13', '14,12', '14,13', '15,12', '15,13', '16,12', '16,13',
    '17,12', '17,13', '18,12', '18,13', '19,12', '19,13', '20,12', '20,13',
    '21,12', '21,13', '22,12', '22,13', '23,12', '23,13', '24,12', '24,13',
    '25,12', '25,13', '26,12', '26,13', '27,12', '27,13', '28,12', '28,13',
    '29,12', '29,13', '30,13', '31,13', '32,12', '32,13',
  ]);
}

function makeBottomCutouts() {
  // Corners, screw mounts, knob region (mirrored to left for bottom-up view), edge positions
  return new Set([
    '0,0', '0,1', '1,12', '2,0', '2,1', '3,12', '3,13', '4,0',
    '4,13', '5,12', '5,13', '6,0', '6,13', '7,12', '7,13', '8,0',
    '8,13', '9,12', '9,13', '10,0', '10,13', '11,12', '11,13', '12,0',
    '12,13', '13,12', '13,13', '14,0', '14,13', '15,12', '15,13', '16,0',
    '16,13', '17,12', '17,13', '18,0', '18,13', '19,13', '20,0',
    '22,0', '24,0', '26,0', '28,0', '30,0', '30,1', '31,12', '32,0', '32,1',
  ]);
}

const topVents = makeTopVents();
const bottomVents = makeBottomVents();
const topCutouts = makeTopCutouts();
const bottomCutouts = makeBottomCutouts();

// --- Hex geometry ---
function hexCenter(col, row, size) {
  return [
    col * (size * 2 * 0.75) + size,
    row * Math.sqrt(3) * size + (col % 2 === 1 ? Math.sqrt(3) * size / 2 : 0) + Math.sqrt(3) * size / 2
  ];
}

function neighbors(c, r) {
  const odd = c % 2 === 1;
  return [[c-1,odd?r:r-1],[c-1,odd?r+1:r],[c+1,odd?r:r-1],[c+1,odd?r+1:r],[c,r-1],[c,r+1]]
    .filter(([nc,nr]) => nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS);
}

function hash(a, b, s) {
  return ((Math.sin(a * 127.1 * s + b * 311.7 * s + s * 53.3) * 43758.5453) % 1 + 1) % 1;
}

// --- Pattern definitions ---
const PATTERNS = {
  spiral: {
    name: "Spiral",
    params: [
      { n: 'ratio', l: 'Band ratio', min: 10, max: 90, v: 50 },
      { n: 'spacing', l: 'Spacing', min: 10, max: 100, v: 84 },
      { n: 'dir', l: 'Direction', min: 0, max: 1, v: 0, step: 1, labels: ['CW', 'CCW'] },
    ],
    fn(c, r, p, cx, cy) {
      const bandFrac = p.ratio / 100;
      const period = 0.5 + (p.spacing / 100) * 4.5;
      const yPos = r + (c % 2 === 1 ? 0.5 : 0);
      const aspect = (COLS * 1.5) / (ROWS * Math.sqrt(3));
      const dx = (c - cx) / aspect, dy = yPos - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.01) return true;
      let angle = Math.atan2(dy, dx);
      if (p.dir > 0.5) angle = -angle;
      const angleNorm = ((angle + Math.PI) / (2 * Math.PI));
      const spiralVal = dist - period * angleNorm;
      const wrapped = ((spiralVal % period) + period) % period;
      return wrapped < period * bandFrac;
    }
  },

  rings: {
    name: "Concentric rings",
    params: [
      { n: 'thick', l: 'Ring thickness', min: 5, max: 60, v: 30 },
      { n: 'shape', l: 'Shape', min: 0, max: 3, v: 3, step: 1, labels: ['Circle', 'Ellipse', 'Diamond', 'Hexagon'] },
      { n: 'zoom', l: 'Zoom', min: 0, max: 100, v: 100 },
    ],
    fn(c, r, p, cx, cy) {
      const shape = Math.round(p.shape);
      const zoomAmt = p.zoom / 100;

      if (shape === 3) {
        // Hexagon shape uses hex-grid distance
        const cxR = Math.round(cx), cyR = Math.round(cy);
        function toCube(col, row) {
          const x = col;
          const z = row - (col - (col & 1)) / 2;
          const y = -x - z;
          return [x, y, z];
        }
        const [x1, y1, z1] = toCube(cxR, cyR);
        const [x2, y2, z2] = toCube(c, r);
        const dist = Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2), Math.abs(z1 - z2));

        const baseThick = Math.max(1, Math.round((p.thick / 100) * (ROWS / 2)));

        // Walk outward through rings with optional zoom
        let boundary = 0;
        let bandIdx = 0;
        while (boundary <= dist) {
          const growWidth = Math.floor((bandIdx + 2) / 2);
          const bandWidth = baseThick + zoomAmt * (growWidth - baseThick);
          const roundedWidth = Math.max(1, Math.round(bandWidth));
          if (dist < boundary + roundedWidth) {
            return bandIdx % 2 === 0;
          }
          boundary += roundedWidth;
          bandIdx++;
        }
        return false;
      }

      // Circle, Ellipse, Diamond use continuous distance
      const thickness = (p.thick / 100) * (ROWS / 2);
      const yPos = r + (c % 2 === 1 ? 0.5 : 0);
      const aspect = (COLS * 1.5) / (ROWS * Math.sqrt(3));
      const dx = (c - cx) / aspect, dy = yPos - cy;
      let dist;
      if (shape === 0) dist = Math.sqrt(dx * dx + dy * dy);
      else if (shape === 1) dist = Math.sqrt(dx * dx / 0.5 + dy * dy);
      else dist = Math.abs(dx) + Math.abs(dy);

      // Apply zoom: grow band widths outward
      if (zoomAmt < 0.01) {
        const period = thickness * 2;
        if (period < 0.01) return false;
        return (((dist % period) + period) % period) < thickness;
      }
      let boundary = 0;
      let bandIdx = 0;
      while (boundary <= dist) {
        const growWidth = (bandIdx + 1) * thickness;
        const constWidth = thickness;
        const bandWidth = constWidth + zoomAmt * (growWidth - constWidth);
        if (dist < boundary + bandWidth) {
          return bandIdx % 2 === 0;
        }
        boundary += bandWidth;
        bandIdx++;
      }
      return false;
    }
  },

  stripes: {
    name: "Stripes",
    params: [
      { n: 'width', l: 'Width', min: 10, max: 80, v: 30 },
      { n: 'angle', l: 'Angle', min: 0, max: 180, v: 0, snap: [0, 30, 45, 60, 90, 120, 135, 150, 180], snapRange: 3 },
    ],
    fn(c, r, p) {
      const w = 1 + (p.width / 100) * 6;
      const ang = (p.angle / 180) * Math.PI;
      const y = r + (c % 2 === 1 ? 0.5 : 0);
      // Project hex center onto direction perpendicular to stripes
      const nx = Math.sin(ang), ny = Math.cos(ang);
      const v = c * 1.5 * nx + y * Math.sqrt(3) * ny;
      const period = w * Math.sqrt(3);
      return (((v % period) + period) % period) < period / 2;
    }
  },

  waves: {
    name: "Sine waves",
    params: [
      { n: 'nwaves', l: 'Waves', min: 1, max: 6, v: 1, step: 1 },
      { n: 'freq', l: 'Frequency', min: 1, max: 50, v: 29 },
      { n: 'amp', l: 'Amplitude', min: 0, max: 80, v: 40 },
      { n: 'thick', l: 'Thickness', min: 3, max: 60, v: 44 },
      { n: 'spacing', l: 'Spacing', min: 5, max: 100, v: 50 },
      { n: 'phase', l: 'Phase offset', min: 0, max: 100, v: 0 },
      { n: 'shift', l: 'Horizontal shift', min: 0, max: 100, v: 0 },
    ],
    fn(c, r, p, cx, cy) {
      // freq maps to 0.5 - 5 full cycles across the 33 columns
      const cyclesAcross = 0.5 + (p.freq / 50) * 4.5;
      const freq = cyclesAcross * Math.PI * 2 / COLS;
      const amp = (p.amp / 100) * (ROWS / 2);
      const halfT = ((p.thick / 100) * (ROWS / 2)) / 2;
      const hShift = (p.shift / 100) * Math.PI * 2;
      const phaseBetween = (p.phase / 100) * Math.PI * 2;
      const yPos = r + (c % 2 === 1 ? 0.5 : 0);
      const n = p.nwaves;
      const centerY = cy;
      const sep = (p.spacing / 100) * (ROWS - 1);
      for (let i = 0; i < n; i++) {
        const waveCenter = n === 1 ? centerY : centerY + (i - (n - 1) / 2) * sep / (n - 1);
        const ph = hShift + i * phaseBetween;
        const wave = Math.sin(c * freq + ph) * amp;
        if (Math.abs(yPos - waveCenter - wave) <= halfT) return true;
      }
      return false;
    }
  },

  gradient: {
    name: "Gradient fade",
    params: [
      { n: 'sharp', l: 'Sharpness', min: 0, max: 100, v: 60 },
      { n: 'mid', l: 'Midpoint', min: 10, max: 90, v: 50 },
      { n: 'seed', l: 'Seed', min: 1, max: 50, v: 1, step: 1 },
      { n: 'mode', l: 'Direction', min: 0, max: 4, v: 0, step: 1, labels: ['L→R', 'R→L', 'T→B', 'Diagonal', 'Radial'] },
    ],
    fn(c, r, p, cx, cy) {
      const yPos = r + (c % 2 === 1 ? 0.5 : 0);
      const midpoint = p.mid / 100;
      const k = p.sharp / 100;
      const steepness = 0.1 + k * k * k * 40;
      let t;
      const mode = Math.round(p.mode);
      if (mode === 0) t = 1 - c / (COLS - 1);
      else if (mode === 1) t = c / (COLS - 1);
      else if (mode === 2) t = yPos / (ROWS - 1);
      else if (mode === 3) t = (c / (COLS - 1) + yPos / (ROWS - 1)) / 2;
      else {
        const aspect = (COLS * 1.5) / (ROWS * Math.sqrt(3));
        const dx = (c - cx) / aspect, dy = yPos - cy;
        const maxDist = Math.sqrt((cx / aspect) ** 2 + cy ** 2);
        t = Math.sqrt(dx * dx + dy * dy) / Math.max(maxDist, 1);
      }
      const prob = 1 / (1 + Math.exp(-(t - midpoint) * steepness));
      return hash(c, r, Math.round(p.seed)) < prob;
    }
  },

  chevron: {
    name: "Chevron",
    params: [
      { n: 'width', l: 'Stripe width', min: 10, max: 80, v: 40 },
      { n: 'angle', l: 'Angle', min: 10, max: 90, v: 45 },
      { n: 'apex', l: 'Apex position', min: 0, max: 100, v: 50 },
      { n: 'mode', l: 'Direction', min: 0, max: 3, v: 1, step: 1, labels: ['Left', 'Right', 'Down', 'Up'] },
    ],
    fn(c, r, p, cx, cy) {
      const stripe = (p.width / 100) * 10;
      const ang = Math.tan((p.angle / 180) * Math.PI);
      const yPos = r + (c % 2 === 1 ? 0.5 : 0);
      const dir = Math.round(p.mode);
      let val;
      if (dir <= 1) {
        const apexY = (p.apex / 100) * (ROWS - 1);
        const dy = Math.abs(yPos - apexY);
        val = (dir === 0 ? 1 : -1) * c - dy * ang;
      } else {
        const apexX = (p.apex / 100) * (COLS - 1);
        const dx = Math.abs(c - apexX);
        val = (dir === 3 ? 1 : -1) * yPos - dx * ang * (ROWS / COLS);
      }
      const period = stripe * 2;
      if (period < 0.01) return false;
      return (((val % period) + period) % period) < stripe;
    }
  },

  flower: {
    name: "Hex flower",
    params: [
      { n: 'spacing', l: 'Spacing', min: 3, max: 8, v: 4, step: 1 },
      { n: 'mode', l: 'Mode', min: 0, max: 3, v: 0, step: 1, labels: ['Flowers', 'Centers', 'Petals', 'Checkerboard'] },
    ],
    fn: null, // special handling
    generate(p, cx, cy) {
      const sp = Math.round(p.spacing);
      // Use hex-grid cube coordinates for proper distance and lattice
      function toCube(col, row) {
        const x = col;
        const z = row - (col - (col & 1)) / 2;
        return [x, -x - z, z];
      }
      function hexDist(c1, r1, c2, r2) {
        const [x1, y1, z1] = toCube(c1, r1);
        const [x2, y2, z2] = toCube(c2, r2);
        return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2), Math.abs(z1 - z2));
      }
      // Place flower centers on a hex-grid superlattice with given spacing
      // Offset so a center lands near (cx, cy)
      const cxR = Math.round(cx), cyR = Math.round(cy);
      const centers = [];
      for (let gc = -sp * 2; gc < COLS + sp * 2; gc++) {
        for (let gr = -sp * 2; gr < ROWS + sp * 2; gr++) {
          // Check if (gc, gr) falls on the superlattice
          const [x, y, z] = toCube(gc, gr);
          const [ox, oy, oz] = toCube(cxR, cyR);
          const dx = x - ox, dy = y - oy, dz = z - oz;
          // Superlattice: positions where cube coords relative to center are multiples of sp
          if (dx % sp === 0 && dy % sp === 0 && dz % sp === 0) {
            centers.push([gc, gr, Math.round(dx / sp), Math.round(dy / sp)]);
          }
        }
      }
      // For each hex, find nearest center and distance
      const role = Array.from({ length: COLS }, () => new Int8Array(ROWS));
      const nearest = Array.from({ length: COLS }, () => new Array(ROWS));
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          let minD = 999, nearIdx = -1;
          for (let i = 0; i < centers.length; i++) {
            const d = hexDist(c, r, centers[i][0], centers[i][1]);
            if (d < minD) { minD = d; nearIdx = i; }
          }
          if (minD === 0) role[c][r] = 1;       // center
          else if (minD === 1) role[c][r] = 2;   // petal
          else role[c][r] = 0;                    // background
          nearest[c][r] = nearIdx;
        }
      }
      return (c, r) => {
        const m = Math.round(p.mode);
        const rl = role[c][r];
        if (m === 0) return rl === 1 || rl === 2;  // full flowers
        if (m === 1) return rl === 1;                // centers only
        if (m === 2) return rl === 2;                // petals only
        // Checkerboard: alternate flower color based on lattice parity
        if (rl === 0) return false;
        const ci = nearest[c][r];
        if (ci < 0) return false;
        const [,, gi, gj] = centers[ci];
        return (gi + gj) % 2 === 0;
      };
    }
  },

  cubes: {
    name: "Tumbling blocks",
    params: [
      { n: 'scale', l: 'Scale', min: 10, max: 80, v: 40 },
    ],
    fn(c, r, p, cx, cy) {
      const s = Math.max(2, Math.round((p.scale / 100) * 5 + 1));
      const y = r + (c % 2 === 1 ? 0.5 : 0);
      return (Math.floor(c / s) + Math.floor(y / s)) % 3 === 0;
    }
  },

  moire: {
    name: "Moiré",
    params: [
      { n: 'freq1', l: 'Freq 1', min: 10, max: 80, v: 30 },
      { n: 'freq2', l: 'Freq 2', min: 10, max: 80, v: 35 },
      { n: 'angle', l: 'Angle offset', min: 0, max: 100, v: 25 },
    ],
    fn(c, r, p) {
      const f1 = 2 + (p.freq1 / 100) * 8, f2 = 2 + (p.freq2 / 100) * 8;
      const a = (p.angle / 100) * Math.PI;
      const y = r + (c % 2 === 1 ? 0.5 : 0);
      const p1 = Math.sin(c / f1 * Math.PI * 2) > 0;
      const p2 = Math.sin((c * Math.cos(a) + y * Math.sin(a)) / f2 * Math.PI * 2) > 0;
      return p1 === p2;
    }
  },

  weave: {
    name: "Tri-directional weave",
    params: [
      { n: 'width', l: 'Band width', min: 10, max: 80, v: 40 },
      { n: 'phase', l: 'Phase', min: 0, max: 100, v: 0 },
    ],
    fn(c, r, p) {
      const w = 1 + (p.width / 100) * 4, ph = (p.phase / 100) * 6;
      const y = r + (c % 2 === 1 ? 0.5 : 0);
      const v1 = ((c + ph) % (w * 2)) < w;
      const d2 = c * 0.5 + y * Math.sqrt(3) / 2;
      const v2 = ((d2 + ph) % (w * 2)) < w;
      const d3 = -c * 0.5 + y * Math.sqrt(3) / 2;
      const v3 = ((d3 + ph) % (w * 2)) < w;
      return (v1 ? 1 : 0) + (v2 ? 1 : 0) + (v3 ? 1 : 0) >= 2;
    }
  },

  indset: {
    name: "Independent set",
    params: [
      { n: 'variant', l: 'Variant', min: 0, max: 1, v: 0, step: 1, labels: ['Sparse', 'Dense'] },
    ],
    fn(c, r, p) {
      const v = Math.round(p.variant);
      const z = r - (c - (c & 1)) / 2;
      if (v === 0) {
        // Sparse: every 3rd hex along both cube axes — widely spaced dots
        return ((c % 3) + 3) % 3 === 0 && ((z % 3) + 3) % 3 === 0;
      }
      // Dense: maximum independent set — 1/3 of all hexes, no two adjacent
      return ((c - z) % 3 + 3) % 3 === 0;
    }
  },

  scatter: {
    name: "Random scatter",
    params: [
      { n: 'density', l: 'Density', min: 5, max: 95, v: 30 },
      { n: 'seed', l: 'Seed', min: 1, max: 50, v: 1, step: 1 },
    ],
    fn(c, r, p) {
      return hash(c, r, Math.round(p.seed)) < (p.density / 100);
    }
  },

  text: {
    name: "Text",
    params: [
      { n: 'textInput', l: 'Text', type: 'text', v: 'PSYNAPSE' },
    ],
    fn: null,
    generate(p, cx, cy) {
      // Jumbo font: 5 wide x 12 tall — for 1-5 characters
      const fontJ = {
        A: [[0,0,1,0,0],[0,1,0,1,0],[0,1,0,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
        B: [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
        C: [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,1],[0,1,1,1,0]],
        D: [[1,1,1,0,0],[1,0,0,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,1,0],[1,1,1,0,0]],
        E: [[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
        F: [[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
        G: [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
        H: [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
        I: [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
        J: [[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
        K: [[1,0,0,0,1],[1,0,0,1,0],[1,0,1,0,0],[1,0,1,0,0],[1,1,0,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,1,0],[1,0,0,0,1],[1,0,0,0,1]],
        L: [[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
        M: [[1,0,0,0,1],[1,1,0,1,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
        N: [[1,0,0,0,1],[1,0,0,0,1],[1,1,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
        O: [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
        P: [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
        Q: [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,0,1,0],[1,0,0,1,0],[0,1,1,1,0],[0,0,0,0,1]],
        R: [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
        S: [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[1,0,0,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
        T: [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
        U: [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
        V: [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0]],
        W: [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,1,0,1,1],[1,1,0,1,1],[1,0,0,0,1],[1,0,0,0,1]],
        X: [[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,0,1,0],[0,1,0,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
        Y: [[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
        Z: [[1,1,1,1,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
        ' ': [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
        '-': [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
        '.': [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,1,1,0,0],[0,1,1,0,0]],
        '!': [[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,1,0,0],[0,0,1,0,0]],
        '0': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
        '1': [[0,0,1,0,0],[0,1,1,0,0],[1,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
        '2': [[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
        '3': [[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
        '4': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1]],
        '5': [[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
        '6': [[0,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
        '7': [[1,1,1,1,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
        '8': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
        '9': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,1,1,1,0]],
      };

      // Large font: 3 wide x 8 tall
      const fontL = {
        A: [[0,1,0],[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1]],
        B: [[1,1,0],[1,0,1],[1,0,1],[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
        C: [[0,1,1],[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,0,0],[0,1,1]],
        D: [[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
        E: [[1,1,1],[1,0,0],[1,0,0],[1,1,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
        F: [[1,1,1],[1,0,0],[1,0,0],[1,1,0],[1,0,0],[1,0,0],[1,0,0],[1,0,0]],
        G: [[0,1,1],[1,0,0],[1,0,0],[1,0,0],[1,0,1],[1,0,1],[1,0,1],[0,1,1]],
        H: [[1,0,1],[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1]],
        I: [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
        J: [[0,0,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1],[1,0,1],[1,0,1],[0,1,0]],
        K: [[1,0,1],[1,0,1],[1,0,1],[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,0,1]],
        L: [[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
        M: [[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1]],
        N: [[1,0,1],[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1]],
        O: [[0,1,0],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
        P: [[1,1,1],[1,0,1],[1,0,1],[1,1,1],[1,0,0],[1,0,0],[1,0,0],[1,0,0]],
        Q: [[0,1,0],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0],[0,0,1]],
        R: [[1,1,1],[1,0,1],[1,0,1],[1,1,1],[1,1,0],[1,0,1],[1,0,1],[1,0,1]],
        S: [[0,1,1],[1,0,0],[1,0,0],[0,1,0],[0,0,1],[0,0,1],[1,0,1],[1,1,0]],
        T: [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
        U: [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
        V: [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0],[0,1,0]],
        W: [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1],[1,1,1],[1,0,1]],
        X: [[1,0,1],[1,0,1],[1,0,1],[0,1,0],[0,1,0],[1,0,1],[1,0,1],[1,0,1]],
        Y: [[1,0,1],[1,0,1],[1,0,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
        Z: [[1,1,1],[0,0,1],[0,0,1],[0,1,0],[0,1,0],[1,0,0],[1,0,0],[1,1,1]],
        '0': [[0,1,0],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
        '1': [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
        '2': [[0,1,0],[1,0,1],[0,0,1],[0,0,1],[0,1,0],[1,0,0],[1,0,0],[1,1,1]],
        '3': [[1,1,0],[0,0,1],[0,0,1],[0,1,0],[0,0,1],[0,0,1],[0,0,1],[1,1,0]],
        '4': [[1,0,1],[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1]],
        '5': [[1,1,1],[1,0,0],[1,0,0],[1,1,0],[0,0,1],[0,0,1],[1,0,1],[0,1,0]],
        '6': [[0,1,1],[1,0,0],[1,0,0],[1,1,0],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
        '7': [[1,1,1],[0,0,1],[0,0,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
        '8': [[0,1,0],[1,0,1],[1,0,1],[0,1,0],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
        '9': [[0,1,0],[1,0,1],[1,0,1],[0,1,1],[0,0,1],[0,0,1],[0,0,1],[1,1,0]],
        '-': [[0,0,0],[0,0,0],[0,0,0],[1,1,1],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
        '.': [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,1,0]],
        '!': [[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,0,0],[0,0,0],[0,1,0]],
        ' ': [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
      };

      // Small font: 2 wide x 5 tall
      const fontS = {
        A:[[1,1],[1,1],[1,1],[1,1],[1,1]], B:[[1,1],[1,1],[1,0],[1,1],[1,1]],
        C:[[1,1],[1,0],[1,0],[1,0],[1,1]], D:[[1,0],[1,1],[1,1],[1,1],[1,0]],
        E:[[1,1],[1,0],[1,1],[1,0],[1,1]], F:[[1,1],[1,0],[1,1],[1,0],[1,0]],
        G:[[1,1],[1,0],[1,0],[1,1],[1,1]], H:[[1,1],[1,1],[1,1],[1,1],[1,1]],
        I:[[1,0],[1,0],[1,0],[1,0],[1,0]], J:[[0,1],[0,1],[0,1],[1,1],[1,1]],
        K:[[1,1],[1,1],[1,0],[1,1],[1,1]], L:[[1,0],[1,0],[1,0],[1,0],[1,1]],
        M:[[1,1],[1,1],[1,1],[1,1],[1,1]], N:[[1,1],[1,1],[1,1],[1,1],[1,1]],
        O:[[1,1],[1,1],[1,1],[1,1],[1,1]], P:[[1,1],[1,1],[1,1],[1,0],[1,0]],
        Q:[[1,1],[1,1],[1,1],[1,1],[0,1]], R:[[1,1],[1,1],[1,0],[1,1],[1,1]],
        S:[[1,1],[1,0],[1,1],[0,1],[1,1]], T:[[1,1],[0,1],[0,1],[0,1],[0,1]],
        U:[[1,1],[1,1],[1,1],[1,1],[1,1]], V:[[1,1],[1,1],[1,1],[1,1],[0,1]],
        W:[[1,1],[1,1],[1,1],[1,1],[1,1]], X:[[1,1],[1,1],[0,1],[1,1],[1,1]],
        Y:[[1,1],[1,1],[0,1],[0,1],[0,1]], Z:[[1,1],[0,1],[0,1],[1,0],[1,1]],
        '0':[[1,1],[1,1],[1,1],[1,1],[1,1]], '1':[[1,0],[1,0],[1,0],[1,0],[1,0]],
        '2':[[1,1],[0,1],[1,1],[1,0],[1,1]], '3':[[1,1],[0,1],[1,1],[0,1],[1,1]],
        '4':[[1,1],[1,1],[1,1],[0,1],[0,1]], '5':[[1,1],[1,0],[1,1],[0,1],[1,1]],
        '6':[[1,1],[1,0],[1,1],[1,1],[1,1]], '7':[[1,1],[0,1],[0,1],[0,1],[0,1]],
        '8':[[1,1],[1,1],[1,1],[1,1],[1,1]], '9':[[1,1],[1,1],[1,1],[0,1],[1,1]],
        '-':[[0,0],[0,0],[1,1],[0,0],[0,0]], '.':[[0,0],[0,0],[0,0],[0,0],[0,1]],
        '!':[[1,0],[1,0],[1,0],[0,0],[1,0]], ' ':[[0,0],[0,0],[0,0],[0,0],[0,0]],
      };

      const word = (p.textInput || 'PSYNAPSE').toUpperCase();

      // Font tiers: pick the largest that fits within COLS
      // Jumbo: 5w+1gap=6/char => max 5 chars, height 12 (needs ROWS>=12)
      // Large: 3w+1gap=4/char => max 8 chars, height 8
      // Small+gap: 2w+1gap=3/char => max 11 chars, height 5
      // Small tight: 2w+0gap=2/char => max 16 chars, height 5
      const maxJ = Math.floor((COLS + 1) / 6);
      const maxL = Math.floor((COLS + 1) / 4);
      const maxSG = Math.floor((COLS + 1) / 3);
      const maxST = Math.floor(COLS / 2);

      let font, letterW, letterH, gap;
      if (word.length <= maxJ && ROWS >= 12) {
        font = fontJ; letterW = 5; letterH = 12; gap = 1;
      } else if (word.length <= maxL) {
        font = fontL; letterW = 3; letterH = 8; gap = 1;
      } else if (word.length <= maxSG) {
        font = fontS; letterW = 2; letterH = 5; gap = 1;
      } else {
        font = fontS; letterW = 2; letterH = 5; gap = 0;
      }

      const totalW = word.length * letterW + Math.max(0, word.length - 1) * gap;
      const startCol = Math.round(cx - totalW / 2);
      const startRow = Math.round(cy - letterH / 2);
      return (c, r) => {
        const lc = c - startCol, lr = r - startRow;
        if (lr < 0 || lr >= letterH || lc < 0 || lc >= totalW) return false;
        const stride = letterW + gap;
        const li = stride > 0 ? Math.floor(lc / stride) : 0;
        const within = lc - li * stride;
        if (li < 0 || li >= word.length || within >= letterW) return false;
        const glyph = font[word[li]];
        if (!glyph) return false;
        return glyph[lr]?.[within] === 1;
      };
    }
  },
};

const PATTERN_KEYS = Object.keys(PATTERNS);

// --- Slider component ---
function Slider({ label, value, min, max, step, labels, snap, snapRange, onChange }) {
  const display = labels ? labels[Math.round(value)] || value : value;
  const handleChange = (e) => {
    let v = Number(e.target.value);
    // Snap to nearby lock-in points
    if (snap && snapRange) {
      for (const s of snap) {
        if (Math.abs(v - s) <= snapRange) { v = s; break; }
      }
    }
    onChange(v);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{label}</label>
      <input type="range" min={min} max={max} step={step || 1} value={value}
        onChange={handleChange}
        style={{ width: 90 }} />
      <span style={{ fontSize: 12, fontWeight: 500, minWidth: 36, textAlign: 'right' }}>{display}</span>
    </div>
  );
}

// --- Preset serialization ---
function serializePreset({ panel, pattern, inv, showVents, centerX, centerY, color1, color2, baseColor, params }) {
  return JSON.stringify({
    panel,
    pattern,
    invert: inv,
    showVents,
    centerX,
    centerY,
    colors: { base: baseColor, color1, color2 },
    params: { ...params },
  }, null, 2);
}

function deserializePreset(json) {
  const d = JSON.parse(json);
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('Invalid preset: expected a JSON object');

  // Check for unsupported top-level fields
  const validKeys = new Set(['panel', 'pattern', 'invert', 'showVents', 'centerX', 'centerY', 'colors', 'params']);
  for (const key of Object.keys(d)) {
    if (!validKeys.has(key)) throw new Error(`Unknown field: "${key}"`);
  }

  // Required: pattern
  if (!('pattern' in d)) throw new Error('Missing required field: "pattern"');
  if (typeof d.pattern !== 'string' || !PATTERNS[d.pattern]) {
    throw new Error(`Unknown pattern: "${d.pattern}". Valid patterns: ${Object.keys(PATTERNS).join(', ')}`);
  }

  // Optional field type checks
  if ('panel' in d && !['top', 'bottom'].includes(d.panel)) {
    throw new Error(`Invalid panel: "${d.panel}". Must be "top" or "bottom"`);
  }
  if ('invert' in d && typeof d.invert !== 'boolean') {
    throw new Error('"invert" must be true or false');
  }
  if ('showVents' in d && typeof d.showVents !== 'boolean') {
    throw new Error('"showVents" must be true or false');
  }
  for (const key of ['centerX', 'centerY']) {
    if (key in d) {
      if (typeof d[key] !== 'number' || d[key] < 0 || d[key] > 100) {
        throw new Error(`"${key}" must be a number between 0 and 100`);
      }
    }
  }

  // Validate colors
  if ('colors' in d) {
    if (!d.colors || typeof d.colors !== 'object') throw new Error('"colors" must be an object');
    const hexRe = /^#[0-9a-fA-F]{6}$/;
    for (const key of Object.keys(d.colors)) {
      if (!['base', 'color1', 'color2'].includes(key)) {
        throw new Error(`Unknown color: "${key}". Valid colors: base, color1, color2`);
      }
      if (typeof d.colors[key] !== 'string' || !hexRe.test(d.colors[key])) {
        throw new Error(`Invalid color value for "${key}": must be a hex color like "#4A90D9"`);
      }
    }
  }

  // Validate pattern params
  const pat = PATTERNS[d.pattern];
  if ('params' in d) {
    if (!d.params || typeof d.params !== 'object') throw new Error('"params" must be an object');
    if (pat.params) {
      for (const key of Object.keys(d.params)) {
        const def = pat.params.find(p => p.n === key);
        if (!def) throw new Error(`Unknown parameter "${key}" for pattern "${d.pattern}"`);
        const v = d.params[key];
        if (def.type === 'text') {
          if (typeof v !== 'string') throw new Error(`Parameter "${key}" must be a string`);
        } else {
          if (typeof v !== 'number') throw new Error(`Parameter "${key}" must be a number`);
          if (v < def.min || v > def.max) {
            throw new Error(`Parameter "${key}" value ${v} out of range [${def.min}, ${def.max}]`);
          }
        }
      }
    }
  }

  return d;
}

// --- Load/Save modal ---
function PresetModal({ onClose, currentJson, onLoad }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentJson).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLoad = () => {
    setError('');
    try {
      const preset = deserializePreset(text);
      onLoad(preset);
      onClose();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--color-background-secondary, #16213e)', borderRadius: 'var(--border-radius-lg)',
        border: '1px solid var(--color-border-secondary)', padding: 24, width: 480, maxWidth: '90vw',
        maxHeight: '80vh', overflow: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Load / Save Preset</h3>

        <button onClick={handleCopy} style={{
          width: '100%', padding: '8px 14px', fontSize: 13, cursor: 'pointer',
          background: copied ? '#2a6e3f' : 'var(--color-background-info)',
          color: 'var(--color-text-info)', border: 'none', borderRadius: 'var(--border-radius-md)',
          fontFamily: 'var(--font-sans, system-ui)', fontWeight: 500,
        }}>{copied ? 'Copied!' : 'Copy current settings to clipboard (JSON)'}</button>

        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-secondary)', margin: '18px 0' }} />

        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
          Load settings from JSON data:
        </div>
        <textarea
          value={text} onChange={e => { setText(e.target.value); setError(''); }}
          placeholder="Paste JSON preset here..."
          style={{
            width: '100%', height: 140, fontSize: 12, padding: 10,
            borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-border-secondary)',
            background: 'var(--color-background-primary)', color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-mono, monospace)', resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        {error && (
          <div style={{ fontSize: 12, color: '#ff6b6b', marginTop: 6 }}>{error}</div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '7px 18px', fontSize: 13, cursor: 'pointer',
            background: 'var(--color-background-primary)', color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)',
            fontFamily: 'var(--font-sans, system-ui)',
          }}>Cancel</button>
          <button onClick={handleLoad} style={{
            padding: '7px 18px', fontSize: 13, cursor: 'pointer',
            background: 'var(--color-background-info)', color: 'var(--color-text-info)',
            border: 'none', borderRadius: 'var(--border-radius-md)',
            fontFamily: 'var(--font-sans, system-ui)', fontWeight: 500,
          }}>Load</button>
        </div>
      </div>
    </div>
  );
}

// --- Main app ---
export default function App() {
  const canvasRef = useRef(null);
  const [panel, setPanel] = useState('top');
  const [pattern, setPattern] = useState('spiral');
  const [inv, setInv] = useState(false);
  const [showVents, setShowVents] = useState(true);
  const [centerX, setCenterX] = useState(50);
  const [centerY, setCenterY] = useState(50);
  const [params, setParams] = useState({});
  const [color1, setColor1] = useState(DEFAULT_COLOR1);
  const [color2, setColor2] = useState(DEFAULT_COLOR2);
  const [baseColor, setBaseColor] = useState(DEFAULT_BASE);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const skipParamInit = useRef(false);

  const loadPreset = useCallback((d) => {
    if (d.pattern && PATTERNS[d.pattern]) {
      // Build params: start from pattern defaults, overlay with preset values
      const pat = PATTERNS[d.pattern];
      const init = {};
      if (pat.params) for (const pr of pat.params) init[pr.n] = pr.v;
      if (d.params) Object.assign(init, d.params);
      setParams(init);
      skipParamInit.current = true;
      setPattern(d.pattern);
    }
    if (d.panel) setPanel(d.panel);
    if (typeof d.invert === 'boolean') setInv(d.invert);
    if (typeof d.showVents === 'boolean') setShowVents(d.showVents);
    if (typeof d.centerX === 'number') setCenterX(d.centerX);
    if (typeof d.centerY === 'number') setCenterY(d.centerY);
    if (d.colors) {
      if (d.colors.base) setBaseColor(d.colors.base);
      if (d.colors.color1) setColor1(d.colors.color1);
      if (d.colors.color2) setColor2(d.colors.color2);
    }
  }, []);

  // Initialize params when pattern changes (skip once after preset load)
  useEffect(() => {
    if (skipParamInit.current) {
      skipParamInit.current = false;
      return;
    }
    const p = PATTERNS[pattern];
    if (p?.params) {
      const init = {};
      for (const pr of p.params) init[pr.n] = pr.v;
      setParams(init);
    } else {
      setParams({});
    }
  }, [pattern]);

  const setParam = useCallback((name, val) => {
    setParams(prev => ({ ...prev, [name]: val }));
  }, []);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const dW = canvas.clientWidth;
    const sz = Math.floor(dW / (COLS * 1.5 + 0.5));
    const tW = COLS * (sz * 2 * 0.75) + sz * 0.5;
    const tH = ROWS * Math.sqrt(3) * sz + Math.sqrt(3) * sz / 2;
    const px = (dW - tW) / 2, py = 10, dH = tH + py * 2;
    canvas.width = dW * dpr;
    canvas.height = dH * dpr;
    canvas.style.height = dH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, dW, dH);

    const vents = panel === 'top' ? topVents : bottomVents;
    const cutouts = panel === 'top' ? topCutouts : bottomCutouts;
    const cx = (centerX / 100) * (COLS - 1);
    const cy = (centerY / 100) * (ROWS - 1);
    const colorA = inv ? color2 : color1;
    const colorB = inv ? color1 : color2;

    const pat = PATTERNS[pattern];

    // Handle generator patterns
    let patFn = pat.fn ? (c, r) => pat.fn(c, r, params, cx, cy) : null;

    if (pattern === 'flower' && pat.generate) {
      patFn = pat.generate(params, cx, cy);
    } else if (pattern === 'text' && pat.generate) {
      patFn = pat.generate(params, cx, cy);
    } else if (pattern === 'hexzoom') {
      patFn = (c, r) => pat.fn(c, r, params, cx, cy);
    }

    function drawHex(hcx, hcy, s, fc, isOpenHex, isCutout) {
      if (isCutout) return;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 3 * i;
        i === 0 ? ctx.moveTo(hcx + s * Math.cos(a), hcy + s * Math.sin(a))
                 : ctx.lineTo(hcx + s * Math.cos(a), hcy + s * Math.sin(a));
      }
      ctx.closePath();
      if (isOpenHex) {
        ctx.fillStyle = '#2a2a2a'; ctx.fill();
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.stroke();
        return;
      }
      ctx.fillStyle = fc; ctx.fill();
      ctx.strokeStyle = baseColor; ctx.lineWidth = 2; ctx.stroke();
      const g = ctx.createRadialGradient(hcx - s * 0.15, hcy - s * 0.15, 0, hcx, hcy, s * 0.85);
      g.addColorStop(0, 'rgba(255,255,255,.3)');
      g.addColorStop(0.5, 'rgba(255,255,255,.05)');
      g.addColorStop(1, 'rgba(0,0,0,.1)');
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 3 * i;
        ctx.lineTo(hcx + s * Math.cos(a), hcy + s * Math.sin(a));
      }
      ctx.closePath();
      ctx.fill();
    }

    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        const key = col + ',' + row;
        const isCutout = cutouts.has(key);
        const isVent = showVents && vents.has(key);
        const [hx, hy] = hexCenter(col, row, sz);
        const hit = patFn ? patFn(col, row) : false;
        drawHex(px + hx, py + hy, sz - 1, hit ? colorA : colorB, isVent, isCutout);
      }
    }
  }, [panel, pattern, inv, showVents, centerX, centerY, params, color1, color2, baseColor]);

  // Handle resize
  useEffect(() => {
    const handler = () => {
      setParams(p => ({ ...p })); // trigger re-render
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const pat = PATTERNS[pattern];

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Panel selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {['top', 'bottom'].map((p, i) => (
            <button key={p} onClick={() => setPanel(p)}
              style={{
                background: panel === p ? 'var(--color-background-info)' : 'var(--color-background-primary)',
                color: panel === p ? 'var(--color-text-info)' : 'var(--color-text-primary)',
                fontWeight: panel === p ? 500 : 400,
                border: '0.5px solid var(--color-border-secondary)',
                padding: '5px 14px', fontSize: 12, cursor: 'pointer',
                borderRadius: i === 0 ? 'var(--border-radius-md) 0 0 var(--border-radius-md)' : '0 var(--border-radius-md) var(--border-radius-md) 0',
                marginLeft: i > 0 ? -0.5 : 0,
                fontFamily: 'var(--font-sans, system-ui)',
              }}>{p === 'top' ? 'Top panel' : 'Bottom panel'}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Invert</label>
          <input type="checkbox" checked={inv} onChange={e => setInv(e.target.checked)} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Show vents</label>
          <input type="checkbox" checked={showVents} onChange={e => setShowVents(e.target.checked)} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 8, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Base</label>
            <input type="color" value={baseColor} onChange={e => setBaseColor(e.target.value)}
              style={{ width: 26, height: 22, padding: 0, border: '1px solid var(--color-border-secondary)', borderRadius: 3, cursor: 'pointer', background: 'none' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Color 1</label>
            <input type="color" value={color1} onChange={e => setColor1(e.target.value)}
              style={{ width: 26, height: 22, padding: 0, border: '1px solid var(--color-border-secondary)', borderRadius: 3, cursor: 'pointer', background: 'none' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Color 2</label>
            <input type="color" value={color2} onChange={e => setColor2(e.target.value)}
              style={{ width: 26, height: 22, padding: 0, border: '1px solid var(--color-border-secondary)', borderRadius: 3, cursor: 'pointer', background: 'none' }} />
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowPresetModal(true)} style={{
            padding: '5px 14px', fontSize: 12, cursor: 'pointer',
            background: 'var(--color-background-primary)', color: 'var(--color-text-primary)',
            border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)',
            fontFamily: 'var(--font-sans, system-ui)', fontWeight: 500, whiteSpace: 'nowrap',
          }}>Load / Save</button>
        </div>
      </div>

      {showPresetModal && (
        <PresetModal
          onClose={() => setShowPresetModal(false)}
          currentJson={serializePreset({ panel, pattern, inv, showVents, centerX, centerY, color1, color2, baseColor, params })}
          onLoad={loadPreset}
        />
      )}

      {/* Pattern selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
        {PATTERN_KEYS.map(k => (
          <button key={k} onClick={() => setPattern(k)}
            style={{
              background: pattern === k ? 'var(--color-background-info)' : 'var(--color-background-primary)',
              color: pattern === k ? 'var(--color-text-info)' : 'var(--color-text-primary)',
              fontWeight: pattern === k ? 500 : 400,
              border: '0.5px solid var(--color-border-secondary)',
              padding: '4px 10px', fontSize: 11, cursor: 'pointer',
              borderRadius: 'var(--border-radius-md)',
              fontFamily: 'var(--font-sans, system-ui)',
            }}>{PATTERNS[k].name}</button>
        ))}
      </div>

      {/* Global center controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10, alignItems: 'center' }}>
        <Slider label="Center X" value={centerX} min={0} max={100} onChange={setCenterX} />
        <Slider label="Center Y" value={centerY} min={0} max={100} onChange={setCenterY} />
      </div>

      {/* Pattern-specific params */}
      {pat?.params && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10, alignItems: 'center' }}>
          {pat.params.map(pr => pr.type === 'text' ? (
            <div key={pr.n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{pr.l}</label>
              <input type="text" value={params[pr.n] ?? pr.v}
                onChange={e => setParam(pr.n, e.target.value)}
                style={{
                  width: 180, fontSize: 12, padding: '4px 8px',
                  borderRadius: 'var(--border-radius-md)',
                  border: '0.5px solid var(--color-border-secondary)',
                  background: 'var(--color-background-primary)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-mono, monospace)',
                }} />
            </div>
          ) : (
            <Slider key={pr.n} label={pr.l} value={params[pr.n] ?? pr.v}
              min={pr.min} max={pr.max} step={pr.step}
              labels={pr.labels} snap={pr.snap} snapRange={pr.snapRange}
              onChange={v => setParam(pr.n, v)} />
          ))}
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', borderRadius: 'var(--border-radius-lg)', border: '0.5px solid var(--color-border-tertiary)' }} />

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-secondary)' }}>
          <div style={{ width: 13, height: 13, borderRadius: 2, background: inv ? color2 : color1, border: '1px solid rgba(0,0,0,.2)' }} />
          Color 1{inv ? ' (inverted)' : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-secondary)' }}>
          <div style={{ width: 13, height: 13, borderRadius: 2, background: inv ? color1 : color2, border: '1px solid rgba(0,0,0,.2)' }} />
          Color 2{inv ? ' (inverted)' : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-secondary)' }}>
          <div style={{ width: 13, height: 13, borderRadius: 2, background: baseColor, border: '1px solid rgba(255,255,255,.15)' }} />
          Base
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-secondary)' }}>
          <div style={{ width: 13, height: 13, borderRadius: 2, background: '#2a2a2a', border: '1px dashed rgba(255,255,255,.3)' }} />
          Open/vent
        </div>
      </div>
    </div>
  );
}
