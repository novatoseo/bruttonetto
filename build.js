#!/usr/bin/env node
/**
 * Build System - German Financial Calculators
 * Assembles standalone HTML pages from modular components.
 */

const fs = require('fs');
const path = require('path');

const DIRS = {
  components: path.join(__dirname, 'components'),
  css: path.join(__dirname, 'css'),
  js: path.join(__dirname, 'js'),
  pages: path.join(__dirname, 'pages'),
  dist: path.join(__dirname, 'dist'),
};

const SITE = {
  domain: 'https://www.bruttonettoonline.com', // Ajusta a tu dominio final
  siteName: 'bruttonettoonline.com',
  year: 2026,
};

// ── Helpers ──────────────────────────────────────────────

function readFile(filepath) {
  return fs.readFileSync(filepath, 'utf8');
}

function getComponent(name) {
  const file = path.join(DIRS.components, `${name}.html`);
  if (!fs.existsSync(file)) {
    console.warn(`⚠ Component not found: ${name}`);
    return ``;
  }
  return readFile(file);
}

// SOLUCIÓN PROBLEMA 4: Carga de CSS Inteligente
function getCSS(layoutName, meta) {
  const cssDir = DIRS.css;
  
  // 1. Archivos base que SIEMPRE se cargan
  const coreCSS = ['variables.css', 'base.css', 'components.css'];
  
  // 2. Archivo específico según el layout
  if (layoutName === 'calculator') coreCSS.push('calculator.css');
  if (layoutName === 'article') coreCSS.push('article.css'); // Si en el futuro tienes artículos de blog/wiki
  
  // 3. CSS extra si se define en el frontmatter (ej. css: custom.css)
  if (meta.css) {
    coreCSS.push(...meta.css.split(',').map(s => s.trim()));
  }

  // 4. Responsive siempre al final
  const orderToLoad = [...new Set([...coreCSS, 'responsive.css'])];

  let combined = '';
  for (const file of orderToLoad) {
    const filepath = path.join(cssDir, file);
    if (fs.existsSync(filepath)) {
      combined += `/* ── ${file} ── */\n` + readFile(filepath) + '\n';
    } else {
      console.warn(`⚠ CSS not found: ${file}`);
    }
  }
  return combined;
}

function getJS(name) {
  const file = path.join(DIRS.js, `${name}.js`);
  if (!fs.existsSync(file)) {
    console.warn(`⚠ JS not found: ${name}`);
    return `/* missing: ${name}.js */`;
  }
  return readFile(file);
}

function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: normalized };
  const meta = {};
  let lastKey = null;
  match[1].split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0 && /^[a-zA-Z_-]+$/.test(line.slice(0, colonIndex).trim())) {
      lastKey = line.slice(0, colonIndex).trim();
      meta[lastKey] = line.slice(colonIndex + 1).trim();
    } else if (lastKey && line.trim()) {
      meta[lastKey] += ' ' + line.trim();
    }
  });
  return { meta, body: match[2] };
}

// ── Template Engine ──────────────────────────────────────

function processTemplate(template, pageMeta, layoutName) {
  let output = template;

  // Replace components
  output = output.replace(/\{\{COMPONENT:(\w+)\}\}/g, (_, name) => getComponent(name));

  // Replace CSS (Ahora le pasamos el layoutName para que cargue solo lo necesario)
  output = output.replace(/\{\{CSS\}\}/g, getCSS(layoutName, pageMeta));

  // Replace JS files
  output = output.replace(/\{\{JS:([a-zA-Z0-9_-]+)\}\}/g, (_, name) => getJS(name));

  // Limpiar variables de entorno / SEO
  const safeSlug = (pageMeta.slug || '').replace(/\.html$/, ''); // Asegurar que el slug no tenga .html
  output = output.replace(/\{\{TITLE\}\}/g, pageMeta.title || SITE.siteName);
  output = output.replace(/\{\{META_DESC\}\}/g, pageMeta.description || '');
  output = output.replace(/\{\{SLUG\}\}/g, safeSlug);
  
  // SOLUCIÓN PROBLEMA 5 (Parte A): Canonical limpio
  const canonicalUrl = safeSlug === 'index' || safeSlug === '' ? SITE.domain : `${SITE.domain}/${safeSlug}`;
  output = output.replace(/\{\{CANONICAL\}\}/g, canonicalUrl);
  
  output = output.replace(/\{\{SITE_NAME\}\}/g, SITE.siteName);
  output = output.replace(/\{\{SITE_DOMAIN\}\}/g, SITE.domain);
  output = output.replace(/\{\{YEAR\}\}/g, String(SITE.year));
  output = output.replace(/\{\{CURRENT_YEAR\}\}/g, String(new Date().getFullYear()));

  // Nav active state
  output = output.replace(/\{\{NAV_ACTIVE:(\S+)\}\}/g, (_, slug) => {
    return slug === safeSlug ? 'active' : '';
  });

  // SOLUCIÓN PROBLEMA 5 (Parte B): Reescribir internal links para Vercel "cleanUrls"
  // Transforma href="mi-pagina.html" a href="/mi-pagina"
  output = output.replace(/href="([^"]+)\.html(#.*)?"/g, (match, p1, hash) => {
    if (p1.startsWith('http')) return match; // Ignora enlaces externos
    if (p1 === 'index') return `href="/${hash || ''}"`; // index.html -> /
    return `href="/${p1}${hash || ''}"`;
  });

  // Clean up any unreplaced tokens
  output = output.replace(/\{\{[A-Z_]+(?::\w+)?\}\}/g, '');

  return output;
}

// ── Page Builder ─────────────────────────────────────────

function buildPage(pageFile) {
  const raw = readFile(path.join(DIRS.pages, pageFile));
  const { meta, body } = parseFrontmatter(raw);
  
  const layoutName = meta.layout || 'calculator';
  const layout = getComponent(`layout-${layoutName}`);
  
  let page = layout.replace('{{BODY}}', body);
  
  // Process all template tags
  page = processTemplate(page, meta, layoutName);
  
  const outName = meta.slug === 'index' ? 'index.html' : `${meta.slug || path.parse(pageFile).name}.html`;
  const outPath = path.join(DIRS.dist, outName);
  
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, page);
  console.log(`  ✓ ${outName} (${(page.length / 1024).toFixed(1)} KB)`);
}

// ── Main ─────────────────────────────────────────────────

function build() {
  console.log('\n🔧 Building Rechner-Online.info...\n');
  
  if (!fs.existsSync(DIRS.dist)) fs.mkdirSync(DIRS.dist, { recursive: true });
  
  const pages = fs.readdirSync(DIRS.pages).filter(f => f.endsWith('.html'));
  console.log(`  Found ${pages.length} pages\n`);
  
  for (const page of pages) {
    try {
      buildPage(page);
    } catch (err) {
      console.error(`  ✗ Error building ${page}: ${err.message}`);
    }
  }
  
  console.log(`\n✅ Done! ${pages.length} pages built in dist/\n`);
}

build();
