#!/usr/bin/env node
/**
 * fix-articles.js
 * Mueve todos los artículos de la raíz a pages/ y crea vercel.json
 * Uso: node fix-articles.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PAGES_DIR = path.join(ROOT, 'pages');

// Estos archivos NO se mueven (calculadoras y archivos del sistema)
const NO_MOVER = new Set([
  'build.js',
  'fix-articles.js',
]);

// Asegurarse de que existe la carpeta pages/
if (!fs.existsSync(PAGES_DIR)) {
  fs.mkdirSync(PAGES_DIR, { recursive: true });
  console.log('✓ Carpeta pages/ creada');
}

// Buscar todos los .html en la raíz que tengan frontmatter (---)
const archivos = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
let movidos = 0;
let omitidos = 0;

console.log('\n📦 Moviendo artículos a pages/...\n');

for (const archivo of archivos) {
  if (NO_MOVER.has(archivo)) continue;

  const rutaOrigen = path.join(ROOT, archivo);
  const contenido = fs.readFileSync(rutaOrigen, 'utf8');

  // Solo mover si tiene frontmatter
  if (!contenido.startsWith('---')) {
    console.log(`  ⏭  Sin frontmatter, omitido: ${archivo}`);
    omitidos++;
    continue;
  }

  const rutaDestino = path.join(PAGES_DIR, archivo);

  // Si ya existe en pages/, no sobreescribir
  if (fs.existsSync(rutaDestino)) {
    console.log(`  ⚠  Ya existe en pages/, omitido: ${archivo}`);
    omitidos++;
    continue;
  }

  fs.renameSync(rutaOrigen, rutaDestino);
  console.log(`  ✓  Movido: ${archivo} → pages/${archivo}`);
  movidos++;
}

// Crear vercel.json si no existe
const vercelPath = path.join(ROOT, 'vercel.json');
if (!fs.existsSync(vercelPath)) {
  fs.writeFileSync(vercelPath, JSON.stringify({ outputDirectory: 'dist' }, null, 2));
  console.log('\n✓ vercel.json creado (Vercel servirá desde dist/)');
} else {
  console.log('\n⏭  vercel.json ya existe, no se modificó');
}

console.log(`\n✅ Listo! Movidos: ${movidos}, Omitidos: ${omitidos}`);
console.log('\nAhora ejecuta:');
console.log('  node build.js\n');
