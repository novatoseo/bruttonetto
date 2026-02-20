# Rechner-Online.info — Proyecto de Calculadoras Financieras Alemanas

## Arquitectura

```
rechner-projekt/
├── build.js              ← Build script (Node.js) — ensambla las páginas
├── components/           ← Componentes HTML reutilizables
│   ├── header.html       ← Header global (editar aquí = cambia en todas las páginas)
│   ├── footer.html       ← Footer global
│   └── layout-calculator.html  ← Template shell (HTML head, fonts, scripts)
├── css/                  ← Estilos modulares
│   ├── variables.css     ← Design tokens (colores, tipografía, espaciado)
│   ├── base.css          ← Reset + tipografía
│   ├── components.css    ← Header, footer, nav, cards, botones
│   ├── calculator.css    ← Formularios, panel de resultados, gráficos
│   └── responsive.css    ← Breakpoints móvil/tablet
├── js/                   ← JavaScript compartido
│   ├── steuer-engine.js  ← Motor fiscal 2026 (Einkommensteuer, SV, Brutto-Netto)
│   └── ui-utils.js       ← Utilidades UI (nav móvil, FAQ, gráficos donut, forms)
├── pages/                ← Páginas individuales (contenido único por calculadora)
│   ├── index.html        ← Hub/índice de todas las calculadoras
│   └── brutto-netto-rechner.html  ← Calculadora Brutto-Netto (estrella)
└── dist/                 ← OUTPUT — HTMLs standalone listos para subir al servidor
    ├── index.html
    └── brutto-netto-rechner.html
```

## Cómo funciona

### Build
```bash
node build.js
```
Esto:
1. Lee cada archivo en `pages/`
2. Extrae el frontmatter (title, description, slug)
3. Inserta el contenido en `components/layout-calculator.html`
4. Reemplaza `{{COMPONENT:header}}`, `{{COMPONENT:footer}}` con los HTML compartidos
5. Incrusta todo el CSS y JS inline
6. Genera HTMLs standalone en `dist/`

### Editar componentes globales
- **Cambiar el header**: Edita `components/header.html` → `node build.js` → todas las páginas se actualizan
- **Cambiar el footer**: Edita `components/footer.html` → `node build.js`
- **Cambiar colores/fuentes**: Edita `css/variables.css` → `node build.js`
- **Cambiar diseño del formulario**: Edita `css/calculator.css` → `node build.js`

### Añadir una nueva calculadora
1. Crea `pages/nueva-calculadora.html` con frontmatter
2. Añade el HTML del formulario + resultados + contenido SEO
3. Añade un link en `components/header.html` y `components/footer.html`
4. `node build.js`

## Datos fiscales 2026 verificados

| Concepto | Valor | Fuente |
|----------|-------|--------|
| Grundfreibetrag | 12.348 € | Steuerfortentwicklungsgesetz |
| Kinderfreibetrag | 9.756 € | Steuerfortentwicklungsgesetz |
| BBG KV/PV | 5.812,50 €/mes (69.750 €/año) | SV-Rechengrößenverordnung 2026 |
| BBG RV/AV | 8.450 €/mes (101.400 €/año) | SV-Rechengrößenverordnung 2026 |
| KV Gesamtsatz | 14,6% | Gesetzlich festgelegt |
| KV Zusatzbeitrag (Durchschnitt) | 2,9% | BMF PAP 2026 |
| PV Gesamtsatz | 3,6% | Gesetzlich festgelegt |
| RV Gesamtsatz | 18,6% | Gesetzlich festgelegt |
| AV Gesamtsatz | 2,6% | Gesetzlich festgelegt |

## ⚠️ Pendiente de verificar

Los coeficientes exactos del §32a EStG 2026 (zonas del Einkommensteuertarif) necesitan verificarse contra el XML del PAP oficial del BMF. Los valores actuales son aproximaciones basadas en los datos publicados. **Antes de publicar**, verificar al menos 3 casos contra https://www.bmf-steuerrechner.de

## Próximas calculadoras a construir

### Prioridad Alta (por volumen de búsqueda estimado)
1. ✅ Brutto-Netto-Rechner (HECHO)
2. Gehaltsrechner für Arbeitgeber
3. Geldwerter Vorteil / Firmenwagenrechner
4. Arbeitslosengeld I Rechner
5. Rentenrechner
6. Elterngeldrechner

### Prioridad Media
7. Teilzeitrechner
8. Kurzarbeitergeld
9. Pendlerpauschale
10. BAföG-Rechner
11. Rentenpunkte
12. Bürgergeld-Rechner

### Prioridad Baja
13. Witwenrente
14. Riester-Rente
15. BAföG-Rückzahlung
16. Grundsicherung
17. Schonvermögen
18. Girokonto Vergleich (affiliate)
