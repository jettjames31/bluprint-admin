// Generates a 1024x1024 placeholder app icon (dark bg + an accent→purple block,
// matching the dashboard's brand mark). Run: node scripts/gen-icon.cjs
// Then: npx @tauri-apps/cli icon src-tauri/icons/source.png
// Morning task: replace with a real branded icon if desired.
const zlib = require('node:zlib')
const fs = require('node:fs')
const path = require('node:path')

const W = 1024,
  H = 1024
const px = Buffer.alloc(W * H * 4)
const m = 150 // margin around the rounded accent block
const radius = 180

function inRounded(x, y) {
  const l = m,
    r = W - m,
    t = m,
    b = H - m
  if (x < l || x >= r || y < t || y >= b) return false
  const cx = Math.min(Math.max(x, l + radius), r - radius)
  const cy = Math.min(Math.max(y, t + radius), b - radius)
  const dx = x - cx,
    dy = y - cy
  return dx * dx + dy * dy <= radius * radius
}

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4
    let r = 10,
      g = 11,
      b = 13 // --bg
    if (inRounded(x, y)) {
      // diagonal gradient from --accent (#4f8cff) to --purple (#a78bfa)
      const t = (x - m + (y - m)) / (2 * (W - 2 * m))
      r = Math.round(79 + (167 - 79) * t)
      g = Math.round(140 + (139 - 140) * t)
      b = Math.round(255 + (250 - 255) * t)
    }
    px[i] = r
    px[i + 1] = g
    px[i + 2] = b
    px[i + 3] = 255
  }
}

// add a 0 filter byte at the start of each scanline
const raw = Buffer.alloc(H * (W * 4 + 1))
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0
  px.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4)
}

const CRC = (() => {
  const t = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return (buf) => {
    let c = ~0
    for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ t[(c ^ buf[i]) & 0xff]
    return (~c) >>> 0
  }
})()

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii')
  const body = Buffer.concat([t, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(CRC(body))
  return Buffer.concat([len, body, crc])
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0)
ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // color type RGBA
const png = Buffer.concat([
  sig,
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])

const out = path.join(__dirname, '..', 'src-tauri', 'icons', 'source.png')
fs.writeFileSync(out, png)
console.log('wrote', out, png.length, 'bytes')
