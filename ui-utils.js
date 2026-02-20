/* ══════════════════════════════════════════════════════════
   UI UTILITIES — Shared UI helpers for all calculator pages
   ══════════════════════════════════════════════════════════ */

const RechnerUI = (() => {
  'use strict';

  // ── Mobile Navigation ──
  function initNav() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.main-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', nav.classList.contains('open'));
      });
      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!toggle.contains(e.target) && !nav.contains(e.target)) {
          nav.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  // ── FAQ Accordion ──
  function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.parentElement;
        const answer = item.querySelector('.faq-answer');
        const isOpen = item.classList.contains('open');

        // Close all others
        document.querySelectorAll('.faq-item.open').forEach(openItem => {
          if (openItem !== item) {
            openItem.classList.remove('open');
            openItem.querySelector('.faq-answer').style.maxHeight = '0';
          }
        });

        if (isOpen) {
          item.classList.remove('open');
          answer.style.maxHeight = '0';
        } else {
          item.classList.add('open');
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      });
    });
  }

  // ── Number Input Formatting ──
  function initEuroInputs() {
    document.querySelectorAll('.form-input[data-type="euro"]').forEach(input => {
      input.addEventListener('blur', () => {
        let val = parseGermanNumber(input.value);
        if (!isNaN(val) && val > 0) {
          input.value = val.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
      });
      input.addEventListener('focus', () => {
        let val = parseGermanNumber(input.value);
        if (!isNaN(val)) {
          input.value = val.toString().replace('.', ',');
        }
      });
    });
  }

  /** Parse German number format (1.234,56 → 1234.56) */
  function parseGermanNumber(str) {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    return parseFloat(str.toString().replace(/\./g, '').replace(',', '.')) || 0;
  }

  // ── Donut Chart ──
  /**
   * Draw a donut chart using SVG.
   * @param {string} containerId - ID of the container element
   * @param {Array} segments - [{label, value, color}]
   * @param {string} centerText - Text to show in center
   */
  function drawDonut(containerId, segments, centerText, centerLabel) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const total = segments.reduce((sum, s) => sum + s.value, 0);
    if (total <= 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:2rem;">Bitte Bruttoeinkommen eingeben</p>';
      return;
    }

    const size = 200;
    const cx = size / 2, cy = size / 2;
    const outerR = 90, innerR = 60;
    const gap = 0.02; // gap between segments in radians

    let currentAngle = 0;
    let paths = '';

    segments.forEach(seg => {
      if (seg.value <= 0) return;
      const fraction = seg.value / total;
      const startAngle = currentAngle + gap / 2;
      const endAngle = currentAngle + fraction * Math.PI * 2 - gap / 2;

      if (endAngle - startAngle < 0.01) {
        currentAngle += fraction * Math.PI * 2;
        return;
      }

      const x1o = cx + outerR * Math.cos(startAngle);
      const y1o = cy + outerR * Math.sin(startAngle);
      const x2o = cx + outerR * Math.cos(endAngle);
      const y2o = cy + outerR * Math.sin(endAngle);
      const x1i = cx + innerR * Math.cos(endAngle);
      const y1i = cy + innerR * Math.sin(endAngle);
      const x2i = cx + innerR * Math.cos(startAngle);
      const y2i = cy + innerR * Math.sin(startAngle);

      const largeArc = fraction > 0.5 ? 1 : 0;

      paths += `<path d="M ${x1o} ${y1o} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2i} ${y2i} Z" fill="${seg.color}" opacity="0.9"><title>${seg.label}: ${Steuer2026.formatEuro(seg.value)}</title></path>`;

      currentAngle += fraction * Math.PI * 2;
    });

    container.innerHTML = `
      <div class="donut-chart">
        <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Gehaltsaufteilung">
          ${paths}
        </svg>
        <div class="donut-chart__center">
          <div class="donut-chart__center-value">${centerText}</div>
          <div class="donut-chart__center-label">${centerLabel || ''}</div>
        </div>
      </div>
    `;

    // Legend
    const legendHTML = segments.filter(s => s.value > 0).map(s =>
      `<span class="chart-legend__item"><span class="chart-legend__dot" style="background:${s.color}"></span>${s.label}</span>`
    ).join('');
    
    // Insert legend after chart
    const legendEl = container.parentElement.querySelector('.chart-legend');
    if (legendEl) legendEl.innerHTML = legendHTML;
  }

  // ── Form Binding Helper ──
  /**
   * Collect all form values from a calculator form.
   * Uses data-field attributes on inputs.
   */
  function collectFormValues(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};
    const values = {};
    form.querySelectorAll('[data-field]').forEach(el => {
      const field = el.dataset.field;
      const type = el.dataset.type || 'text';

      if (el.type === 'radio') {
        if (el.checked) values[field] = type === 'number' ? parseFloat(el.value) : el.value;
      } else if (el.type === 'checkbox') {
        values[field] = el.checked;
      } else if (type === 'euro' || type === 'number') {
        values[field] = parseGermanNumber(el.value);
      } else if (type === 'percent') {
        values[field] = parseGermanNumber(el.value) / 100;
      } else {
        values[field] = el.value;
      }
    });
    return values;
  }

  /**
   * Bind onChange/onInput to all form fields and trigger a callback.
   */
  function bindCalculation(formId, callback) {
    const form = document.getElementById(formId);
    if (!form) return;
    const handler = () => {
      const values = collectFormValues(formId);
      try {
        callback(values);
      } catch (e) {
        console.error('Calculation error:', e);
      }
    };
    form.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
    });
    // Initial calculation
    handler();
  }

  // ── Smooth Number Animation ──
  function animateValue(elementId, newValue, duration = 300) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = Steuer2026.formatEuro(newValue);
  }

  // ── Init All ──
  function init() {
    initNav();
    initFAQ();
    initEuroInputs();
  }

  // Auto-init on DOMContentLoaded
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
  }

  return {
    init,
    initNav,
    initFAQ,
    parseGermanNumber,
    drawDonut,
    collectFormValues,
    bindCalculation,
    animateValue,
    formatEuro: (n) => Steuer2026.formatEuro(n),
  };
})();

if (typeof window !== 'undefined') window.RechnerUI = RechnerUI;
