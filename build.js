#!/usr/bin/env node
/**
 * Build System - German Financial Calculators
 * Assembles standalone HTML pages from modular components.
 * 
 * Usage: node build.js [--watch]
 * 
 * Template syntax:
 *   {{COMPONENT:filename}}  → inserts components/filename.html
 *   {{CSS}}                 → inserts all CSS inline
 *   {{JS:filename}}         → inserts js/filename.js inline
 *   {{TITLE}}               → page title from frontmatter
 *   {{META_DESC}}            → meta description from frontmatter
 *   {{SLUG}}                → page slug from frontmatter
 *   {{CANONICAL}}           → canonical URL
 *   {{NAV_ACTIVE:slug}}     → adds 'active' class if current page matches
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
  domain: 'https://www.bruttonettoonline.com',
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
    return `<!-- missing component: ${name} -->`;
  }
  return readFile(file);
}

function getAllCSS() {
  const cssDir = DIRS.css;
  const order = ['variables.css', 'base.css', 'components.css', 'calculator.css', 'responsive.css'];
  let combined = '';
  for (const file of order) {
    const filepath = path.join(cssDir, file);
    if (fs.existsSync(filepath)) {
      combined += `/* ── ${file} ── */\n` + readFile(filepath) + '\n';
    }
  }
  // Also include any extra CSS files not in the order
  const allFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
  for (const file of allFiles) {
    if (!order.includes(file)) {
      combined += `/* ── ${file} ── */\n` + readFile(path.join(cssDir, file)) + '\n';
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
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
  const meta = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) meta[key.trim()] = rest.join(':').trim();
  });
  return { meta, body: match[2] };
}

// ── Template Engine ──────────────────────────────────────

function processTemplate(template, pageMeta) {
  let output = template;

  // Replace components
  output = output.replace(/\{\{COMPONENT:(\w+)\}\}/g, (_, name) => getComponent(name));

  // Replace CSS
  output = output.replace(/\{\{CSS\}\}/g, getAllCSS());

  // Replace JS files
  output = output.replace(/\{\{JS:([a-zA-Z0-9_-]+)\}\}/g, (_, name) => getJS(name));

  // Replace meta vars
  output = output.replace(/\{\{TITLE\}\}/g, pageMeta.title || SITE.siteName);
  output = output.replace(/\{\{META_DESC\}\}/g, pageMeta.description || '');
  output = output.replace(/\{\{SLUG\}\}/g, pageMeta.slug || '');
  output = output.replace(/\{\{CANONICAL\}\}/g, `${SITE.domain}/${pageMeta.slug || ''}`);
  output = output.replace(/\{\{SITE_NAME\}\}/g, SITE.siteName);
  output = output.replace(/\{\{SITE_DOMAIN\}\}/g, SITE.domain);
  output = output.replace(/\{\{YEAR\}\}/g, String(SITE.year));
  output = output.replace(/\{\{CURRENT_YEAR\}\}/g, String(new Date().getFullYear()));

  // Nav active state
  output = output.replace(/\{\{NAV_ACTIVE:(\S+)\}\}/g, (_, slug) => {
    return slug === pageMeta.slug ? 'active' : '';
  });

  // Clean up any unreplaced tokens
  output = output.replace(/\{\{[A-Z_]+(?::\w+)?\}\}/g, '');

  return output;
}

// ── Page Builder ─────────────────────────────────────────

function buildPage(pageFile) {
  const raw = readFile(path.join(DIRS.pages, pageFile));
  const { meta, body } = parseFrontmatter(raw);
  
  // Get the layout template
  const layoutName = meta.layout || 'calculator';
  const layout = getComponent(`layout-${layoutName}`);
  
  // Insert page body into layout
  let page = layout.replace('{{BODY}}', body);
  
  // Process all template tags
  page = processTemplate(page, meta);
  
  // Determine output filename
  const outName = meta.slug === 'index' ? 'index.html' : `${meta.slug || path.parse(pageFile).name}.html`;
  const outPath = path.join(DIRS.dist, outName);
  
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
