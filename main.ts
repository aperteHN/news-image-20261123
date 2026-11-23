// The World in One Day - make.fun news-image-20261123 entry.
//
// A Node 22 program (standard library only) that draws one PNG image
// summing up the world news of Monday 23 November 2026 and writes it to
// /output/entry.png (or $MAKEFUN_OUTPUT_DIR/entry.png outside the grader).
//
// Stories verified from that day's reporting (AFP / AP wire copy dated
// 23 November 2026, plus the day's headline roundups):
//   - COP31 in Antalya, Turkiye ends without a climate pact; UN chief
//     Guterres says there is "no ambiguity in the science"; EU refuses
//     to endorse the draft.
//   - Two oil tankers struck by projectiles in the Strait of Hormuz;
//     Bahrain says Iran hit a civilian industrial facility.
//   - Fire at a candy factory in Banten, Indonesia: 3 dead, 36 missing.
//   - Magnitude 6.7 earthquake in the central Peruvian Andes, felt in Lima.
//   - Europe-Japan probe BepiColombo enters Mercury's orbit after 8 years.
//   - South Korea's education chief quits amid an AI exam-cheating scandal.
//   - FBI most-wanted drug lord "Chapo Isidro" Meza arrested in Sinaloa.
//   - Also: 24 dead in a Nigeria boat accident; China slams a US ban on
//     telecom firms; thousands march in Lisbon over living costs.
//
// The picture is drawn pixel by pixel with a built-in 5x7 bitmap font and
// encoded as a PNG with node:zlib, so both grader runs produce the exact
// same bytes.

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------- canvas
const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

type RGB = [number, number, number];
const PAPER: RGB = [247, 243, 234];
const INK: RGB = [24, 26, 32];
const RED: RGB = [178, 34, 40];
const GREY: RGB = [92, 96, 104];
const CARD: RGB = [255, 255, 255];
const LINEC: RGB = [205, 198, 182];
const WHITE: RGB = [255, 255, 255];

function set(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}

function fillAll(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0]; px[i * 3 + 1] = c[1]; px[i * 3 + 2] = c[2];
  }
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) set(xx, yy, c);
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let yy = cy - r; yy <= cy + r; yy++)
    for (let xx = cx - r; xx <= cx + r; xx++) {
      const dx = xx - cx, dy = yy - cy;
      if (dx * dx + dy * dy <= r * r) set(xx, yy, c);
    }
}

function ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
  for (let yy = cy - r - t; yy <= cy + r + t; yy++)
    for (let xx = cx - r - t; xx <= cx + r + t; xx++) {
      const d = Math.sqrt((xx - cx) ** 2 + (yy - cy) ** 2);
      if (Math.abs(d - r) <= t / 2) set(xx, yy, c);
    }
}

function line(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(x0 + (x1 - x0) * s / steps);
    const y = Math.round(y0 + (y1 - y0) * s / steps);
    const r = Math.floor(t / 2);
    for (let yy = y - r; yy <= y + r; yy++)
      for (let xx = x - r; xx <= x + r; xx++) set(xx, yy, c);
  }
}

function roundedRect(x: number, y: number, w: number, h: number, r: number, c: RGB): void {
  rect(x + r, y, w - 2 * r, h, c);
  rect(x, y + r, w, h - 2 * r, c);
  disc(x + r, y + r, r, c);
  disc(x + w - r - 1, y + r, r, c);
  disc(x + r, y + h - r - 1, r, c);
  disc(x + w - r - 1, y + h - r - 1, r, c);
}

function borderRect(x: number, y: number, w: number, h: number, c: RGB): void {
  rect(x, y, w, 2, c); rect(x, y + h - 2, w, 2, c);
  rect(x, y, 2, h, c); rect(x + w - 2, y, 2, h, c);
}

// ------------------------------------------------------------------ font
// Classic 5x7 bitmap glyphs, one row value per row, bit 16 = leftmost.
const FONT: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],      J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],   T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 21, 10], X: [17, 10, 4, 4, 4, 10, 17],
  Y: [17, 10, 4, 4, 4, 4, 4],      Z: [31, 1, 2, 4, 8, 16, 31],
  '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14],
  '2': [14, 17, 1, 2, 4, 8, 31],   '3': [31, 2, 4, 2, 1, 17, 14],
  '4': [2, 6, 10, 18, 31, 2, 2],   '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14], '9': [14, 17, 17, 15, 1, 2, 12],
  ' ': [0, 0, 0, 0, 0, 0, 0],      '.': [0, 0, 0, 0, 0, 12, 12],
  ',': [0, 0, 0, 0, 12, 4, 8],     ':': [0, 12, 12, 0, 12, 12, 0],
  ';': [0, 12, 12, 0, 12, 4, 8],   "'": [4, 4, 8, 0, 0, 0, 0],
  '"': [10, 10, 10, 0, 0, 0, 0],   '!': [4, 4, 4, 4, 4, 0, 4],
  '?': [14, 17, 1, 2, 4, 0, 4],    '-': [0, 0, 0, 31, 0, 0, 0],
  '/': [1, 1, 2, 4, 8, 16, 16],    '(': [2, 4, 8, 8, 8, 4, 2],
  ')': [8, 4, 2, 2, 2, 4, 8],      '&': [12, 18, 20, 8, 21, 18, 13],
  '%': [24, 25, 2, 4, 8, 19, 3],   '+': [0, 4, 4, 31, 4, 4, 0],
  '|': [4, 4, 4, 4, 4, 4, 4],
};

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function drawText(x: number, y: number, s: string, scale: number, c: RGB, bold = false): void {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = FONT[ch] ?? FONT['?'];
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 5; col++)
        if (g[row] & (16 >> col)) {
          rect(cx + col * scale, y + row * scale, scale, scale, c);
          if (bold) rect(cx + col * scale + 1, y + row * scale, scale, scale, c);
        }
    cx += 6 * scale + (bold ? 1 : 0);
  }
}

function drawCentered(y: number, s: string, scale: number, c: RGB, bold = false): void {
  const w = textWidth(s, scale) + (bold ? s.length : 0);
  drawText(Math.round((W - w) / 2), y, s, scale, c, bold);
}

function wrapText(s: string, scale: number, maxW: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (textWidth(trial, scale) <= maxW) cur = trial;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawWrapped(x: number, y: number, s: string, scale: number, maxW: number, c: RGB, lh: number): number {
  let yy = y;
  for (const ln of wrapText(s, scale, maxW)) {
    drawText(x, yy, ln, scale, c);
    yy += lh;
  }
  return yy;
}

// ----------------------------------------------------------------- icons
function iconGlobe(cx: number, cy: number): void {
  ring(cx, cy, 46, 4, WHITE);
  for (let a = 0; a < 360; a += 2) {
    const t = a * Math.PI / 180;
    const ex = cx + Math.round(20 * Math.sin(t));
    const ey = cy + Math.round(46 * Math.cos(t));
    disc(ex, ey, 2, WHITE);
  }
  line(cx - 46, cy, cx + 46, cy, 3, WHITE);
  line(cx - 38, cy - 24, cx + 38, cy - 24, 2, WHITE);
  line(cx - 38, cy + 24, cx + 38, cy + 24, 2, WHITE);
}

function iconDisc(cx: number, cy: number, bg: RGB, draw: (x: number, y: number) => void): void {
  disc(cx, cy, 30, bg);
  draw(cx, cy);
}

const iconShip = (cx: number, cy: number) => {
  rect(cx - 16, cy + 4, 32, 5, WHITE);
  rect(cx - 11, cy + 9, 22, 5, WHITE);
  rect(cx - 2, cy - 14, 5, 18, WHITE);
  rect(cx + 3, cy - 8, 11, 9, WHITE);
};
const iconFlame = (cx: number, cy: number) => {
  for (let yy = -16; yy <= 14; yy++) {
    const half = Math.round(11 * (1 - Math.abs(yy + 1) / 22) + 2);
    rect(cx - half, cy + yy, half * 2, 2, WHITE);
  }
  disc(cx, cy + 8, 5, [214, 110, 20]);
};
const iconPlanet = (cx: number, cy: number) => {
  disc(cx, cy, 13, WHITE);
  line(cx - 22, cy + 10, cx + 22, cy - 6, 3, WHITE);
  disc(cx + 18, cy - 14, 3, WHITE);
};
const iconQuake = (cx: number, cy: number) => {
  const pts: [number, number][] = [[-20, 0], [-11, 0], [-6, -13], [1, 13], [6, -6], [11, 0], [20, 0]];
  for (let i = 0; i + 1 < pts.length; i++)
    line(cx + pts[i][0], cy + pts[i][1], cx + pts[i + 1][0], cy + pts[i + 1][1], 4, WHITE);
};
const iconCap = (cx: number, cy: number) => {
  rect(cx - 20, cy - 10, 40, 4, WHITE);
  rect(cx - 16, cy - 6, 32, 3, WHITE);
  rect(cx - 11, cy - 3, 22, 3, WHITE);
  rect(cx - 10, cy + 2, 20, 4, WHITE);
  line(cx + 19, cy - 8, cx + 19, cy + 9, 3, WHITE);
};
const iconBadge = (cx: number, cy: number) => {
  ring(cx, cy, 13, 5, WHITE);
  drawText(cx - 2, cy - 7, '!', 2, WHITE, true);
};

// ---------------------------------------------------------------- layout
fillAll(PAPER);
rect(0, 0, W, 8, RED);
drawCentered(24, 'THE WORLD IN ONE DAY', 8, INK, true);
drawCentered(96, 'MONDAY | 23 NOVEMBER 2026', 5, RED, true);
rect(36, 148, W - 72, 3, INK);
rect(36, 156, W - 72, 1, INK);

// lead story
const leadY = 172;
roundedRect(36, leadY, W - 72, 158, 12, [30, 58, 74]);
iconGlobe(126, leadY + 79);
drawText(206, leadY + 16, 'LEAD STORY | CLIMATE', 3, [255, 196, 66], true);
drawText(206, leadY + 44, 'COP31 ENDS WITH NO CLIMATE PACT', 4, WHITE, true);
drawWrapped(206, leadY + 84,
  'ANTALYA TALKS CLOSE WITHOUT A DEAL. GUTERRES: "NO ' +
  'AMBIGUITY IN THE SCIENCE." EU REFUSES TO SIGN.', 3, W - 206 - 56, [226, 232, 236], 26);

// story panels
interface Panel { kicker: string; accent: RGB; icon: (x: number, y: number) => void; head: string; body: string }
const panels: Panel[] = [
  { kicker: 'HORMUZ', accent: RED, icon: iconShip,
    head: 'TANKERS HIT IN THE STRAIT OF HORMUZ',
    body: 'Two oil tankers struck by projectiles. Bahrain says Iran hit a civilian industrial site; Gulf tensions rise.' },
  { kicker: 'INDONESIA', accent: [214, 110, 20], icon: iconFlame,
    head: 'FACTORY FIRE: 3 DEAD, 36 MISSING',
    body: 'A blaze tears through a candy factory in Banten province as rescuers search for the missing.' },
  { kicker: 'SPACE', accent: [64, 92, 168], icon: iconPlanet,
    head: 'PROBE REACHES MERCURY AT LAST',
    body: "Europe-Japan craft BepiColombo enters Mercury's orbit, ending an eight-year journey." },
  { kicker: 'PERU', accent: [36, 128, 92], icon: iconQuake,
    head: 'MAGNITUDE 6.7 EARTHQUAKE',
    body: 'A strong quake shakes the central Andes and is felt in Lima; no casualties reported at first.' },
  { kicker: 'SOUTH KOREA', accent: [122, 74, 168], icon: iconCap,
    head: 'EDUCATION CHIEF QUITS OVER AI',
    body: "South Korea's education chief resigns amid an AI exam-cheating scandal rocking admissions." },
  { kicker: 'MEXICO', accent: [168, 128, 24], icon: iconBadge,
    head: 'MOST-WANTED CARTEL BOSS HELD',
    body: '"Chapo Isidro" Meza, on the FBI most-wanted list, is arrested in Guasave, Sinaloa.' },
];

const gx = 36, gy = 348, pw = (W - 72 - 16) / 2, ph = 176;
panels.forEach((p, i) => {
  const x = gx + (i % 2) * (pw + 16);
  const y = gy + Math.floor(i / 2) * (ph + 14);
  roundedRect(x, y, pw, ph, 10, CARD);
  borderRect(x, y, pw, ph, LINEC);
  rect(x, y, 10, ph, p.accent);
  iconDisc(x + 58, y + 60, p.accent, p.icon);
  drawText(x + 104, y + 24, p.kicker, 3, p.accent, true);
  let hy = y + 50;
  for (const ln of wrapText(p.head, 3, pw - 122)) {
    drawText(x + 104, hy, ln, 3, INK, true);
    hy += 27;
  }
  drawWrapped(x + 20, y + 106, p.body.toUpperCase(), 2, pw - 40, GREY, 19);
});

// footer
const fy = gy + 3 * (ph + 14) + 4;
rect(36, fy, W - 72, 2, INK);
drawCentered(fy + 12, 'ALSO TODAY: 24 DEAD IN NIGERIA BOAT ACCIDENT', 3, INK, true);
drawCentered(fy + 40, 'CHINA SLAMS US BAN ON TELECOM FIRMS | LISBON MARCHES', 3, INK, true);
drawCentered(fy + 68, 'OVER LIVING COSTS | ISRAEL COALITION TALKS RESUME', 3, INK, true);

// ------------------------------------------------------------ PNG encode
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(): Buffer {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // colour type: truecolour RGB
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const png = encodePNG();
writeFileSync(join(outDir, 'entry.png'), png);
console.log(`wrote entry.png (${png.length} bytes)`);
