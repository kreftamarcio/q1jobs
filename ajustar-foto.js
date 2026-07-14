/**
 * ajustar-foto.js
 * Ajusta uma foto para os requisitos de upload do GeekHunter:
 *   - Formato: JPG
 *   - Tamanho do arquivo: <= 3 MB (com margem de seguranca)
 *   - Dimensoes: minimo 150x150 px (garantido); reduz se for muito grande
 *
 * Uso:
 *   node ajustar-foto.js <caminho-da-foto>
 *   node ajustar-foto.js                 (procura foto.jpg / foto.jpeg / foto.png na pasta atual)
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const MAX_BYTES = 3 * 1024 * 1024;                  // limite rigido do GeekHunter
const TARGET_BYTES = Math.floor(2.6 * 1024 * 1024); // alvo com margem
const MIN_SIDE = 150;                               // minimo exigido
const MAX_SIDE = 1200;                              // teto razoavel p/ foto de perfil

function resolveInput() {
  const arg = process.argv[2];
  if (arg) return path.resolve(process.cwd(), arg);
  for (const name of ['foto.jpg', 'foto.jpeg', 'foto.png']) {
    const p = path.resolve(process.cwd(), name);
    if (fs.existsSync(p)) return p;
  }
  return path.resolve(process.cwd(), 'foto.jpg');
}

async function encode(inputPath, maxSide, quality) {
  return sharp(inputPath, { failOn: 'none' })
    .rotate() // respeita a orientacao EXIF (fotos de celular)
    .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
}

async function main() {
  const inputPath = resolveInput();

  if (!fs.existsSync(inputPath)) {
    console.error('Nao encontrei a foto: ' + inputPath);
    console.error('Salve sua foto na pasta do projeto e rode: node ajustar-foto.js NOME_DA_SUA_FOTO.jpg');
    process.exit(1);
  }

  const ext = path.extname(inputPath).toLowerCase();
  const baseName = path.basename(inputPath, ext);
  const outputPath = path.resolve(path.dirname(inputPath), baseName + '-geekhunter.jpg');

  let meta;
  try {
    meta = await sharp(inputPath, { failOn: 'none' }).metadata();
  } catch (err) {
    console.error('Nao consegui ler a imagem.');
    if (ext === '.heic' || ext === '.heif') {
      console.error('Formato HEIC (iPhone) nao e suportado por aqui. Converta para JPG antes:');
      console.error('Abra no app Fotos do Windows -> ... -> Salvar como -> JPEG, e rode de novo.');
    } else {
      console.error(err.message);
    }
    process.exit(1);
  }

  if (!meta.width || !meta.height) {
    console.error('Nao consegui obter as dimensoes da imagem.');
    process.exit(1);
  }
  if (meta.width < MIN_SIDE || meta.height < MIN_SIDE) {
    console.error('A foto e muito pequena (' + meta.width + 'x' + meta.height + '). O minimo e ' + MIN_SIDE + 'x' + MIN_SIDE + '.');
    process.exit(1);
  }

  let maxSide = Math.min(MAX_SIDE, Math.max(meta.width, meta.height));
  let buffer = null;
  let usedQuality = 90;

  for (let q = 90; q >= 50; q -= 10) {
    buffer = await encode(inputPath, maxSide, q);
    usedQuality = q;
    if (buffer.length <= TARGET_BYTES) break;
  }

  while (buffer.length > MAX_BYTES && maxSide > 300) {
    maxSide = Math.round(maxSide * 0.85);
    buffer = await encode(inputPath, maxSide, 80);
    usedQuality = 80;
  }

  fs.writeFileSync(outputPath, buffer);

  const out = await sharp(buffer).metadata();
  const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

  console.log('');
  console.log('Foto ajustada para o GeekHunter!');
  console.log('  Arquivo:   ' + outputPath);
  console.log('  Formato:   JPG');
  console.log('  Dimensoes: ' + out.width + 'x' + out.height + ' px  (minimo exigido: 150x150)');
  console.log('  Tamanho:   ' + sizeMB + ' MB  (limite: 3 MB)');
  console.log('  Qualidade: ' + usedQuality);
  console.log('');
  if (buffer.length > MAX_BYTES) {
    console.log('Ainda acima de 3 MB. Avise para ajustar o script e reduzir mais.');
  } else {
    console.log('Pronto: faca upload do arquivo "' + path.basename(outputPath) + '" no GeekHunter.');
  }
}

main().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
