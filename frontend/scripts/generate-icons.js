// frontend/scripts/generate-icons.js
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputFile = path.join(__dirname, '../public/logo.jpeg');
const outputDir = path.join(__dirname, '../public');

// Asegurarse de que el directorio existe
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generar iconos regulares
sizes.forEach(size => {
  sharp(inputFile)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 46, g: 125, b: 50, alpha: 1 } // #2E7D32
    })
    .png()
    .toFile(path.join(outputDir, `icon-${size}x${size}.png`))
    .then(() => console.log(`✅ Generado icon-${size}x${size}.png`))
    .catch(err => console.error(`Error generando icon-${size}x${size}.png:`, err));
});

// Generar icono maskable (con padding para área segura)
sharp(inputFile)
  .resize(512, 512, {
    fit: 'contain',
    background: { r: 46, g: 125, b: 50, alpha: 1 } // #2E7D32
  })
  .png()
  .toFile(path.join(outputDir, 'maskable-icon-512x512.png'))
  .then(() => console.log('✅ Generado maskable-icon-512x512.png'))
  .catch(err => console.error('Error generando maskable icon:', err));

// Generar favicon.ico (32x32)
sharp(inputFile)
  .resize(32, 32, {
    fit: 'contain',
    background: { r: 46, g: 125, b: 50, alpha: 1 }
  })
  .toFile(path.join(outputDir, 'favicon.ico'))
  .then(() => console.log('✅ Generado favicon.ico'))
  .catch(err => console.error('Error generando favicon:', err));

console.log('🎨 Todos los iconos generados correctamente');