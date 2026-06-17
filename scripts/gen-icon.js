// 生成应用图标 PNG (256x256)
// 运行: node scripts/gen-icon.js

const fs = require('fs');
const { createCanvas } = (() => {
  try { return require('canvas'); } catch { return { createCanvas: null }; }
})();

if (!createCanvas) {
  // 没有 canvas 库，用纯 Node 生成一个简单的 ICO
  // 使用 16x16 和 32x32 两种尺寸
  const sizes = [16, 32, 48, 256];

  // 生成 BMP 格式的图标数据
  function generateBMP(size) {
    const rowSize = Math.ceil((size * 32) / 32) * 4;
    const pixelDataSize = rowSize * size;
    const fileSize = 14 + 40 + pixelDataSize;

    const buf = Buffer.alloc(fileSize);
    let offset = 0;

    // BMP Header
    buf.write('BM', offset); offset += 2;
    buf.writeUInt32LE(fileSize, offset); offset += 4;
    buf.writeUInt32LE(0, offset); offset += 4;
    buf.writeUInt32LE(54, offset); offset += 4;

    // DIB Header
    buf.writeUInt32LE(40, offset); offset += 4;
    buf.writeInt32LE(size, offset); offset += 4;
    buf.writeInt32LE(size * 2, offset); offset += 4;
    buf.writeUInt16LE(1, offset); offset += 2;
    buf.writeUInt16LE(32, offset); offset += 2;
    buf.writeUInt32LE(0, offset); offset += 4;
    buf.writeUInt32LE(pixelDataSize, offset); offset += 4;
    buf.writeInt32LE(2835, offset); offset += 4;
    buf.writeInt32LE(2835, offset); offset += 4;
    buf.writeUInt32LE(0, offset); offset += 4;
    buf.writeUInt32LE(0, offset); offset += 4;

    // 像素数据 (BGRA, bottom-up)
    const cx = size / 2, cy = size / 2;
    const r = size * 0.42; // 圆角矩形半径

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // 圆角矩形背景
        const px = x - cx, py = y - cy;
        const cornerR = size * 0.18;
        const hw = size * 0.46, hh = size * 0.46;

        let inside = false;
        if (Math.abs(px) <= hw - cornerR && Math.abs(py) <= hh) inside = true;
        else if (Math.abs(px) <= hw && Math.abs(py) <= hh - cornerR) inside = true;
        else {
          const dx = Math.abs(px) - (hw - cornerR);
          const dy = Math.abs(py) - (hh - cornerR);
          if (dx >= 0 && dy >= 0 && dx * dx + dy * dy <= cornerR * cornerR) inside = true;
        }

        if (inside) {
          // 背景色渐变
          const t = (x + y) / (size * 2);
          const bgR = Math.round(10 + t * 16);
          const bgG = Math.round(10 + t * 16);
          const bgB = Math.round(26 + t * 32);

          // 检查是否在脉冲线上
          const pulseY = cy;
          const nx = x / size; // 0-1
          let onPulse = false;
          const pulsePoints = [
            [0.12, 0.55], [0.23, 0.55], [0.31, 0.55], [0.37, 0.55],
            [0.41, 0.35], [0.45, 0.70], [0.49, 0.27], [0.53, 0.74],
            [0.57, 0.39], [0.61, 0.55], [0.66, 0.55], [0.78, 0.55], [0.88, 0.55]
          ];

          for (let i = 0; i < pulsePoints.length - 1; i++) {
            const [x1, y1] = pulsePoints[i];
            const [x2, y2] = pulsePoints[i + 1];
            if (nx >= x1 && nx <= x2) {
              const t2 = (nx - x1) / (x2 - x1);
              const expectedY = y1 + t2 * (y2 - y1);
              const dist = Math.abs((y / size) - expectedY);
              if (dist < 0.025) {
                onPulse = true;
                break;
              }
            }
          }

          // 电量条
          const barY = size * 0.76;
          const barH = size * 0.04;
          const inBar = y >= barY && y <= barY + barH && x >= size * 0.16 && x <= size * 0.68;

          if (onPulse) {
            buf[offset++] = 204; // B
            buf[offset++] = 255; // G
            buf[offset++] = 0;  // R
            buf[offset++] = 255; // A
          } else if (inBar) {
            buf[offset++] = 170; // B
            buf[offset++] = 212; // G
            buf[offset++] = 0;  // R
            buf[offset++] = 230; // A
          } else {
            buf[offset++] = bgB;
            buf[offset++] = bgG;
            buf[offset++] = bgR;
            buf[offset++] = 255;
          }
        } else {
          buf[offset++] = 0;
          buf[offset++] = 0;
          buf[offset++] = 0;
          buf[offset++] = 0; // 透明
        }
      }
    }
    return buf;
  }

  // 生成 ICO 文件
  function generateICO() {
    const icoSizes = [16, 32, 48];
    const images = icoSizes.map(s => generateBMP(s));

    // ICO Header
    const headerSize = 6 + 16 * icoSizes.length;
    const totalSize = headerSize + images.reduce((s, img) => s + img.length, 0);
    const ico = Buffer.alloc(totalSize);
    let offset = 0;

    ico.writeUInt16LE(0, offset); offset += 2; // reserved
    ico.writeUInt16LE(1, offset); offset += 2; // type = ICO
    ico.writeUInt16LE(icoSizes.length, offset); offset += 2; // count

    let dataOffset = headerSize;
    for (let i = 0; i < icoSizes.length; i++) {
      const s = icoSizes[i];
      ico[offset++] = s === 256 ? 0 : s; // width
      ico[offset++] = s === 256 ? 0 : s; // height
      ico[offset++] = 0; // color count
      ico[offset++] = 0; // reserved
      ico.writeUInt16LE(1, offset); offset += 2; // planes
      ico.writeUInt16LE(32, offset); offset += 2; // bits per pixel
      ico.writeUInt32LE(images[i].length, offset); offset += 4; // data size
      ico.writeUInt32LE(dataOffset, offset); offset += 4; // data offset
      dataOffset += images[i].length;
    }

    for (let i = 0; i < icoSizes.length; i++) {
      images[i].copy(ico, headerSize + images.slice(0, i).reduce((s, img) => s + img.length, 0));
    }

    return ico;
  }

  const ico = generateICO();
  fs.writeFileSync('assets/icon.ico', ico);
  console.log('Generated assets/icon.ico');

  // 也生成 256x256 PNG (用于其他用途)
  const bmp256 = generateBMP(256);
  // 简单的 PNG 生成 - 直接用 BMP 数据不够，跳过
  console.log('Done! Icon saved to assets/icon.ico');
}
