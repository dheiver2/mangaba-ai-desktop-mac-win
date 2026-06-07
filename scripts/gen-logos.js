// Gera todos os PNGs do logo Mangaba AI a partir do SVG, sobrescrevendo
// os arquivos estáticos usados em todas as telas do app.
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SVG = join(ROOT, 'static', 'mangaba-logo.svg');
const STATIC = join(ROOT, 'static');
const NESTED = join(ROOT, 'static', 'static');
// Diretório estático servido pelo backend (STATIC_DIR) — usado em todas as telas em dev
const BACKEND = join(ROOT, 'backend', 'open_webui', 'static');

const svgBuffer = readFileSync(SVG);

// Cor de fundo creme da identidade Mangaba para PNGs sem transparência
const CREME = { r: 255, g: 252, b: 240, alpha: 1 };

// Renderiza o SVG (quadrado) num PNG de tamanho fixo, com fundo transparente
async function render(size, out, { background } = {}) {
  let img = sharp(svgBuffer, { density: 300 }).resize(size, size, {
    fit: 'contain',
    background: background || { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (background) img = img.flatten({ background });
  await img.png().toFile(out);
  console.log(`✓ ${out} (${size}x${size})`);
}

// Lista de arquivos-alvo: [tamanho, caminho, opções]
const targets = [
  // Favicons raiz
  [512, join(STATIC, 'favicon.png')],
  // Favicons aninhados (usados em quase todas as telas)
  [512, join(NESTED, 'favicon.png')],
  [512, join(NESTED, 'favicon-dark.png')],
  [96, join(NESTED, 'favicon-96x96.png')],
  [180, join(NESTED, 'apple-touch-icon.png')],
  [256, join(NESTED, 'logo.png')],
  // Splash screen (tela de carregamento)
  [512, join(NESTED, 'splash.png')],
  [512, join(NESTED, 'splash-dark.png')],
  // PWA / manifest
  [192, join(NESTED, 'web-app-manifest-192x192.png')],
  [512, join(NESTED, 'web-app-manifest-512x512.png')],

  // Backend STATIC_DIR — servido em /static/* (todas as telas em dev)
  [512, join(BACKEND, 'favicon.png')],
  [512, join(BACKEND, 'favicon-dark.png')],
  [96, join(BACKEND, 'favicon-96x96.png')],
  [180, join(BACKEND, 'apple-touch-icon.png')],
  [256, join(BACKEND, 'logo.png')],
  [512, join(BACKEND, 'splash.png')],
  [512, join(BACKEND, 'splash-dark.png')],
  [192, join(BACKEND, 'web-app-manifest-192x192.png')],
  [512, join(BACKEND, 'web-app-manifest-512x512.png')],
];

for (const [size, out, opts] of targets) {
  await render(size, out, opts || {});
}

console.log('\n🥭 Todos os logos Mangaba AI gerados com sucesso!');
