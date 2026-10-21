// 零依赖 PNG 编解码（Node zlib）。仅覆盖关卡管线需要的 8-bit 非隔行格式。
import { deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(buffer, start = 0, end = buffer.length) {
  let c = 0xffffffff;
  for (let i = start; i < end; i += 1) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  const body = Buffer.concat([head.subarray(4), data]);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([head, data, crc]);
}

export function encodePng(width, height, rgba) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('[png] 尺寸非法');
  }
  if (!rgba || rgba.length !== width * height * 4) {
    throw new Error('[png] RGBA 数据长度与尺寸不匹配');
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function unfilter(raw, width, height, channels) {
  const stride = width * channels;
  const out = Buffer.alloc(stride * height);
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    if (offset >= raw.length) throw new Error('[png] 图像数据不完整');
    const filter = raw[offset];
    offset += 1;
    const rowStart = y * stride;
    const prevStart = rowStart - stride;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[offset + x];
      const left = x >= channels ? out[rowStart + x - channels] : 0;
      const up = y > 0 ? out[prevStart + x] : 0;
      const upLeft = y > 0 && x >= channels ? out[prevStart + x - channels] : 0;
      let restored;
      if (filter === 0) restored = value;
      else if (filter === 1) restored = value + left;
      else if (filter === 2) restored = value + up;
      else if (filter === 3) restored = value + ((left + up) >> 1);
      else if (filter === 4) restored = value + paeth(left, up, upLeft);
      else throw new Error('[png] 未知行过滤类型 ' + filter);
      out[rowStart + x] = restored & 0xff;
    }
    offset += stride;
  }
  return out;
}

function readChunks(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8 || !buffer.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error('[png] 不是 PNG 文件');
  }
  const chunks = [];
  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) throw new Error('[png] chunk 数据越界');
    chunks.push({ type, data: buffer.subarray(dataStart, dataEnd) });
    offset = dataEnd + 4;
    if (type === 'IEND') break;
  }
  return chunks;
}

export function decodePng(buffer) {
  const chunks = readChunks(buffer);
  let ihdr = null;
  const idat = [];
  let palette = null;
  let transparency = null;

  for (const chunkInfo of chunks) {
    if (chunkInfo.type === 'IHDR') {
      ihdr = {
        width: chunkInfo.data.readUInt32BE(0),
        height: chunkInfo.data.readUInt32BE(4),
        bitDepth: chunkInfo.data[8],
        colorType: chunkInfo.data[9],
        compression: chunkInfo.data[10],
        filter: chunkInfo.data[11],
        interlace: chunkInfo.data[12],
      };
    } else if (chunkInfo.type === 'PLTE') {
      palette = chunkInfo.data;
    } else if (chunkInfo.type === 'tRNS') {
      transparency = chunkInfo.data;
    } else if (chunkInfo.type === 'IDAT') {
      idat.push(chunkInfo.data);
    }
  }

  if (!ihdr) throw new Error('[png] 缺少 IHDR');
  if (ihdr.compression !== 0 || ihdr.filter !== 0) throw new Error('[png] 不支持的压缩/过滤方式');
  if (ihdr.interlace !== 0) throw new Error('[png] 不支持隔行扫描 PNG');
  if (ihdr.bitDepth !== 8) throw new Error('[png] 仅支持 8-bit PNG，当前 ' + ihdr.bitDepth);

  const channelsOf = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const channels = channelsOf[ihdr.colorType];
  if (!channels) throw new Error('[png] 不支持的颜色类型 ' + ihdr.colorType);
  if (ihdr.colorType === 3 && !palette) throw new Error('[png] 索引色 PNG 缺少 PLTE');

  const inflated = inflateSync(Buffer.concat(idat));
  const pixels = unfilter(inflated, ihdr.width, ihdr.height, channels);
  const rgba = Buffer.alloc(ihdr.width * ihdr.height * 4);

  for (let i = 0; i < ihdr.width * ihdr.height; i += 1) {
    const src = i * channels;
    const dst = i * 4;
    if (ihdr.colorType === 6) {
      rgba[dst] = pixels[src];
      rgba[dst + 1] = pixels[src + 1];
      rgba[dst + 2] = pixels[src + 2];
      rgba[dst + 3] = pixels[src + 3];
    } else if (ihdr.colorType === 2) {
      rgba[dst] = pixels[src];
      rgba[dst + 1] = pixels[src + 1];
      rgba[dst + 2] = pixels[src + 2];
      rgba[dst + 3] = 255;
      if (transparency && transparency.length >= 6
        && transparency.readUInt16BE(0) === pixels[src]
        && transparency.readUInt16BE(2) === pixels[src + 1]
        && transparency.readUInt16BE(4) === pixels[src + 2]) {
        rgba[dst + 3] = 0;
      }
    } else if (ihdr.colorType === 0) {
      rgba[dst] = pixels[src];
      rgba[dst + 1] = pixels[src];
      rgba[dst + 2] = pixels[src];
      rgba[dst + 3] = 255;
    } else if (ihdr.colorType === 4) {
      rgba[dst] = pixels[src];
      rgba[dst + 1] = pixels[src];
      rgba[dst + 2] = pixels[src];
      rgba[dst + 3] = pixels[src + 1];
    } else if (ihdr.colorType === 3) {
      const index = pixels[src];
      if (index * 3 + 2 >= palette.length) throw new Error('[png] 调色板索引越界');
      rgba[dst] = palette[index * 3];
      rgba[dst + 1] = palette[index * 3 + 1];
      rgba[dst + 2] = palette[index * 3 + 2];
      rgba[dst + 3] = transparency && index < transparency.length ? transparency[index] : 255;
    }
  }

  return { width: ihdr.width, height: ihdr.height, rgba };
}
