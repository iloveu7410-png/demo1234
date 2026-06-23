const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len   = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcB  = Buffer.alloc(4); crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])), 0);
  return Buffer.concat([len, typeB, data, crcB]);
}

function makePNG(size) {
  const BG   = [26, 35, 126];   // #1a237e
  const WHITE= [255, 255, 255];
  const OUT  = [240, 242, 245];
  const r0   = Math.round(size * 0.18);

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const cx = x + 0.5, cy = y + 0.5;
      const inBg =
        (cx >= r0 && cx < size - r0) ||
        (cy >= r0 && cy < size - r0) ||
        Math.hypot(cx - r0,            cy - r0)            < r0 ||
        Math.hypot(cx - (size - r0),   cy - r0)            < r0 ||
        Math.hypot(cx - r0,            cy - (size - r0))   < r0 ||
        Math.hypot(cx - (size - r0),   cy - (size - r0))   < r0;

      const gx = cx / size, gy = cy / size;
      // 달력 헤더 바
      const header = gy > 0.18 && gy < 0.38 && gx > 0.12 && gx < 0.88;
      // 그리드 선 (가로2 세로2)
      const hLine1 = Math.abs(gy - 0.55) < 0.025 && gx > 0.12 && gx < 0.88;
      const hLine2 = Math.abs(gy - 0.72) < 0.025 && gx > 0.12 && gx < 0.88;
      const vLine1 = Math.abs(gx - 0.40) < 0.025 && gy > 0.38 && gy < 0.85;
      const vLine2 = Math.abs(gx - 0.65) < 0.025 && gy > 0.38 && gy < 0.85;
      // 날짜 점 (간단 표현)
      const dot = (
        (Math.hypot(gx-0.25, gy-0.47) < 0.055) ||
        (Math.hypot(gx-0.52, gy-0.47) < 0.055) ||
        (Math.hypot(gx-0.78, gy-0.47) < 0.055) ||
        (Math.hypot(gx-0.25, gy-0.64) < 0.055) ||
        (Math.hypot(gx-0.52, gy-0.64) < 0.055) ||
        (Math.hypot(gx-0.78, gy-0.64) < 0.055) ||
        (Math.hypot(gx-0.25, gy-0.80) < 0.055) ||
        (Math.hypot(gx-0.52, gy-0.80) < 0.055)
      );

      let pix;
      if (!inBg)                                  pix = OUT;
      else if (header || hLine1 || hLine2 || vLine1 || vLine2) pix = WHITE;
      else if (dot)                               pix = [255, 200, 80];
      else                                        pix = BG;

      row[1 + x * 3] = pix[0];
      row[2 + x * 3] = pix[1];
      row[3 + x * 3] = pix[2];
    }
    rows.push(row);
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; ihdrData[9] = 2;

  const compressed = zlib.deflateSync(Buffer.concat(rows), { level: 9 });

  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.writeFileSync(path.join(__dirname, 'icon-calculator-192.png'), makePNG(192));
fs.writeFileSync(path.join(__dirname, 'icon-calculator-512.png'), makePNG(512));
console.log('Icons generated.');
