/**
 * Gera todos os ícones do app a partir de um original só,
 * `assets-src/icone/bq.webp` (1024×1024, cabeça do mascote sobre azul-marinho).
 *
 * Saídas em `public/`:
 *   icons/icon-192.png, icons/icon-512.png  — purpose "any": cantos arredondados
 *   icons/icon-512-maskable.png             — sangrado, desenho dentro do círculo
 *                                             seguro de 80% (o Android recorta)
 *   apple-touch-icon.png (180)              — sangrado e opaco: o iOS arredonda
 *                                             sozinho e pinta transparência de preto
 *   favicon.ico (16/32/48)                  — recorte mais fechado (capacete e
 *                                             rosto), que é o que se lê na aba
 *
 * O sharp NÃO é dependência do projeto (só este script o usa, e raramente).
 * Para rodar, a partir de `web/`:
 *
 *   npm i --no-save sharp@0.33.5 && node tools/icons.mjs
 *
 * ou aponte um sharp instalado em outro lugar: SHARP_PATH=/caminho/node_modules/sharp
 */
import { createRequire } from "node:module"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const sharp = require(process.env.SHARP_PATH ?? "sharp")

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..")
const SRC = join(WEB, "assets-src/icone/bq.webp")
const OUT = join(WEB, "public")

// `--primary` da paleta. O original vem num tom vizinho (#063951) e com ruído de
// compressão; sem trocar pelo exato, a margem dos ícones (que é cor lisa)
// apareceria como uma moldura de outro azul.
const BG = { r: 0x00, g: 0x30, b: 0x49 }

/**
 * Pinta de `BG` o fundo ligado às bordas (flood fill), com tolerância pequena.
 * Flood fill e não troca global por cor: o contorno escuro do desenho é
 * #0E1D3A, a ~38 de distância do fundo; uma troca global com tolerância um
 * pouco maior comeria o contorno onde ele encosta em sombras parecidas.
 */
async function flattenBackground(input) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const ref = [data[0], data[1], data[2]]
  const TOL2 = 18 * 18
  const near = (i) => {
    const dr = data[i] - ref[0], dg = data[i + 1] - ref[1], db = data[i + 2] - ref[2]
    return dr * dr + dg * dg + db * db <= TOL2
  }
  const seen = new Uint8Array(w * h)
  const stack = []
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1)
  while (stack.length) {
    const p = stack.pop()
    if (seen[p]) continue
    seen[p] = 1
    const i = p * 3
    if (!near(i)) continue
    data[i] = BG.r; data[i + 1] = BG.g; data[i + 2] = BG.b
    const x = p % w, y = (p - x) / w
    if (x > 0) stack.push(p - 1)
    if (x < w - 1) stack.push(p + 1)
    if (y > 0) stack.push(p - w)
    if (y < h - 1) stack.push(p + w)
  }
  return sharp(data, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer()
}

/** Desenho reduzido a `scale` do lado e centralizado num quadrado liso de `size`. */
async function onSquare(master, size, scale) {
  const inner = Math.round(size * scale)
  const art = await sharp(master).resize(inner, inner).toBuffer()
  return sharp({ create: { width: size, height: size, channels: 3, background: BG } })
    .composite([{ input: art, gravity: "centre" }])
    .png()
    .toBuffer()
}

/** Cantos arredondados (raio ~17%, o mesmo do ícone anterior), fora transparente. */
async function rounded(png, size) {
  const r = Math.round(size * 0.17)
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="#fff"/></svg>`,
  )
  return sharp(png).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer()
}

/** ICO com PNGs embutidos (formato aceito por todos os navegadores atuais). */
function ico(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  const dir = Buffer.alloc(16 * pngs.length)
  let offset = 6 + dir.length
  pngs.forEach(({ size, buf }, k) => {
    const o = k * 16
    dir.writeUInt8(size >= 256 ? 0 : size, o)
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1)
    dir.writeUInt16LE(1, o + 4)
    dir.writeUInt16LE(32, o + 6)
    dir.writeUInt32LE(buf.length, o + 8)
    dir.writeUInt32LE(offset, o + 12)
    offset += buf.length
  })
  return Buffer.concat([header, dir, ...pngs.map((p) => p.buf)])
}

const master = await flattenBackground(SRC)

// Recorte da aba: só capacete e rosto. Em 16–32px o pescoço e a margem são
// pixels desperdiçados — o que identifica o app é o capacete vermelho.
const faviconArt = await sharp(master).extract({ left: 60, top: 24, width: 904, height: 904 }).toBuffer()

/**
 * PNG com paleta de 256 cores: o desenho é chapado (cartoon, cores lisas), então
 * a quantização não aparece, e o 512 cai de ~160KB para ~40KB. Importa porque os
 * ícones entram no precache do service worker — todo usuário os baixa.
 */
const small = (png) => sharp(png).png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 }).toBuffer()

const write = (rel, buf) => {
  const path = join(OUT, rel)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, buf)
  console.log(rel, `${(buf.length / 1024).toFixed(1)}KB`)
}

for (const size of [192, 512]) {
  write(`icons/icon-${size}.png`, await small(await rounded(await onSquare(master, size, 0.9), size)))
}
// 0.72: a aba do capacete é o ponto mais largo do desenho e precisa caber no
// círculo de 80% que o Android usa como zona segura.
write("icons/icon-512-maskable.png", await small(await onSquare(master, 512, 0.72)))
write("apple-touch-icon.png", await small(await onSquare(master, 180, 0.86)))

const favicons = []
for (const size of [16, 32, 48]) {
  const buf = await rounded(await onSquare(faviconArt, size, 1), size)
  favicons.push({ size, buf })
}
write("favicon.ico", ico(favicons))
