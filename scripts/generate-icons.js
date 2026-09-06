import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Simple pure-JS PNG generator
function createPNG(width, height, drawPixelFn) {
  // RGBA buffer
  const rowSize = width * 4 + 1; // +1 for filter byte
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixelFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);

  const crcPayload = Buffer.concat([typeBuf, data]);
  const crc = crc32(crcPayload);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf]);
}

// CRC32 table & calculation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Draw DAD Hub icon: Dark rounded square with glowing vibrant Ice Cyan 'D' symbol
function dadIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;

  // Check rounded rect boundary
  const pad = w * 0.06;
  const rx = w * 0.22;
  const inBox =
    x >= pad &&
    x < w - pad &&
    y >= pad &&
    y < h - pad;

  // Check corners for roundness
  let insideRounded = true;
  const leftX = pad + rx;
  const rightX = w - pad - rx;
  const topY = pad + rx;
  const botY = h - pad - rx;

  if (x < leftX && y < topY) {
    if (Math.hypot(x - leftX, y - topY) > rx) insideRounded = false;
  } else if (x > rightX && y < topY) {
    if (Math.hypot(x - rightX, y - topY) > rx) insideRounded = false;
  } else if (x < leftX && y > botY) {
    if (Math.hypot(x - leftX, y - botY) > rx) insideRounded = false;
  } else if (x > rightX && y > botY) {
    if (Math.hypot(x - rightX, y - botY) > rx) insideRounded = false;
  }

  if (!inBox || !insideRounded) {
    return [0, 0, 0, 0]; // transparent
  }

  const normX = (x - cx) / (w / 2);
  const normY = (y - cy) / (h / 2);

  // Outer boundary of 'D': Flat left spine with sharp 90-degree corners, chamfered right bowl
  const inOuterD =
    normX >= -0.55 &&
    normX <= 0.50 &&
    normY >= -0.65 &&
    normY <= 0.65 &&
    normX - normY <= 0.75 && // top-right 45-degree chamfer
    normX + normY <= 0.75;   // bottom-right 45-degree chamfer

  // Inner hole (counter) of 'D'
  const inInnerHole =
    normX >= -0.22 &&
    normX <= 0.18 &&
    normY >= -0.32 &&
    normY <= 0.32 &&
    normX - normY <= 0.42 &&
    normX + normY <= 0.42;

  const isD = inOuterD && !inInnerHole;

  if (isD) {
    // Vibrant Ice Cyan Phosphor #00E5FF
    return [0, 229, 255, 255];
  }

  // Dark background with subtle slate gradient (#0E121B to #151B26)
  const bgY = y / h;
  const rBg = Math.round(10 + bgY * 8);
  const gBg = Math.round(14 + bgY * 10);
  const bBg = Math.round(24 + bgY * 12);

  return [rBg, gBg, bBg, 255];
}

const iconsDir = path.resolve('./extension/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach((size) => {
  const pngBuf = createPNG(size, size, dadIcon);
  const filePath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, pngBuf);
  console.log(`Generated icon: ${filePath} (${size}x${size}, ${pngBuf.length} bytes)`);
});
