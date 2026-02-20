# SOP — Control de Calidad: Calculadoras SEO Alemanas
## Versión 1.0 · Febrero 2026

---

## PROPÓSITO

Este documento define el proceso obligatorio de control de calidad para cada calculadora producida por el agente de Google Antigravity. Ninguna calculadora se considera completada hasta pasar todos los gates de este SOP. El objetivo es garantizar que cada página sea **funcionalmente correcta**, **visualmente consistente**, **técnicamente sólida** y **SEO-ready** antes de publicación.

---

## ESTRUCTURA DEL PROCESO

Cada calculadora pasa por 5 gates secuenciales. Si falla en cualquier gate, se devuelve al paso anterior. No se avanza hasta que el gate esté aprobado.

```
GATE 1 → Verificación de datos fiscales
GATE 2 → Testing funcional con valores de referencia
GATE 3 → QA visual y responsive
GATE 4 → Auditoría SEO on-page
GATE 5 → Validación técnica final
```

---

## GATE 1 — VERIFICACIÓN DE DATOS FISCALES

**Responsable:** Humano (no delegable al agente)
**Momento:** Antes de que el agente construya la calculadora, después del análisis del competidor

### Qué verificar

Cada calculadora usa constantes fiscales alemanas que cambian anualmente. El agente NO debe buscar estos valores por su cuenta. Deben estar documentados en el archivo `datos-fiscales-2026.md` y verificados contra fuentes oficiales.

### Fuentes oficiales autorizadas (únicas aceptadas)

| Dato | Fuente |
|------|--------|
| Steuertarif (§32a EStG) | Bundesfinanzministerium — BMF-Schreiben del año fiscal vigente |
| Beitragsbemessungsgrenzen | Deutsche Rentenversicherung — Rechengrößen der Sozialversicherung |
| Beitragssätze KV/PV/RV/AV | Bundesministerium für Arbeit und Soziales (BMAS) |
| Solidaritätszuschlag umbrales | EStG §3 Abs. 3 SolZG, publicado en BGBl |
| Kirchensteuer por Bundesland | Landeskirchensteuerbeschlüsse (8% en Bayern/BaWü, 9% resto) |
| Grundfreibetrag | BMF — Existenzminimumbericht |
| Kinderfreibetrag | BMF — §32 Abs. 6 EStG |
| Rentenversicherung Ost/West | Deutsche Rentenversicherung — Aktuelle Werte |

### Proceso

1. Descargar o consultar cada fuente oficial para el año fiscal vigente
2. Rellenar `datos-fiscales-2026.md` con cada valor, su fuente y la fecha de consulta
3. Si algún valor 2026 no está publicado aún: usar 2025 y marcarlo como `[PROVISIONAL-2025]`
4. Cualquier valor marcado como provisional genera una tarea de seguimiento para actualizar cuando se publique el oficial

### Criterio de aprobación

- [ ] Todos los campos de `datos-fiscales-2026.md` están rellenados
- [ ] Cada valor tiene su fuente oficial citada
- [ ] Los valores provisionales están marcados y tienen tarea de seguimiento
- [ ] El archivo está disponible en el directorio del proyecto antes de lanzar el agente

### Formato del archivo de datos fiscales

```markdown
# Datos Fiscales Alemania 2026
## Última actualización: [FECHA]

### Einkommensteuer — Tarifa §32a EStG
- Grundfreibetrag: [VALOR] €
- Fórmula zona 1 (hasta [VALOR] €): [FÓRMULA]
- Fórmula zona 2 (hasta [VALOR] €): [FÓRMULA]
- Fórmula zona 3 (hasta [VALOR] €): [FÓRMULA]
- Fórmula zona 4 (desde [VALOR] €): [FÓRMULA]
- Fuente: [URL] · Consultado: [FECHA]
- Estado: OFICIAL / [PROVISIONAL-2025]

### Sozialversicherung — Beitragssätze
| Concepto | Arbeitnehmer | Arbeitgeber | BBG West | BBG Ost | Fuente |
|----------|-------------|-------------|----------|---------|--------|
| KV (allgemein) | [%] | [%] | [€/mes] | [€/mes] | [URL] |
| KV Zusatzbeitrag | [%] | [%] | — | — | [URL] |
| PV (ohne Kinder) | [%] | [%] | [€/mes] | [€/mes] | [URL] |
| PV (mit Kindern) | [%] | [%] | — | — | [URL] |
| RV | [%] | [%] | [€/mes] | [€/mes] | [URL] |
| AV | [%] | [%] | [€/mes] | [€/mes] | [URL] |

### Solidaritätszuschlag
- Freigrenze: [VALOR] €
- Satz: 5,5%
- Milderungszone: [RANGO] €
- Fuente: [URL]

### Kirchensteuer
- Bayern, Baden-Württemberg: 8%
- Alle anderen Bundesländer: 9%
- Fuente: [URL]

### Lohnsteuerklassen — Freibeträge
| Klasse | Grundfreibetrag | Werbungskosten | Sonderausgaben | Vorsorgepauschale |
|--------|----------------|----------------|----------------|-------------------|
| I | [€] | [€] | [€] | [berechnet] |
| II | [€] | [€] | [€] | [berechnet] |
| III | [€] | [€] | [€] | [berechnet] |
| IV | [€] | [€] | [€] | [berechnet] |
| V | [€] | [€] | [€] | [berechnet] |
| VI | [€] | [€] | [€] | [berechnet] |
```

---

## GATE 2 — TESTING FUNCIONAL CON VALORES DE REFERENCIA

**Responsable:** Agente (verificación automatizada) + Humano (spot check)
**Momento:** Inmediatamente después de construir cada calculadora

### Sistema de tests

Para cada calculadora se definen mínimo 5 casos de test con inputs y outputs conocidos. Los valores de referencia se obtienen de:

1. **Fuente primaria:** El BMF Lohnsteuerrechner oficial (https://www.bmf-steuerrechner.de) — esta es la calculadora oficial del gobierno alemán
2. **Fuente secundaria:** El resultado del competidor (brutto-netto-rechner.info) con los mismos inputs
3. **Fuente terciaria:** Cálculo manual usando las fórmulas de `datos-fiscales-2026.md`

### Estructura de tests por calculadora

Archivo: `tests/[slug]-tests.json`

```json
{
  "calculadora": "brutto-netto-rechner",
  "fecha_creacion": "2026-02-XX",
  "fuente_valores": "BMF Lohnsteuerrechner 2026",
  "tolerancia_euros": 1.00,
  "casos": [
    {
      "id": "BNR-001",
      "descripcion": "Salario medio, Steuerklasse I, sin hijos, sin iglesia, West",
      "inputs": {
        "bruttolohn": 3500,
        "abrechnungszeitraum": "monatlich",
        "steuerklasse": 1,
        "kirchensteuer": false,
        "bundesland": "Nordrhein-Westfalen",
        "kinderfreibetraege": 0,
        "krankenversicherung": "gesetzlich",
        "kv_zusatzbeitrag": 1.7,
        "rentenversicherung": "West",
        "geburtsjahr": 1990
      },
      "expected_outputs": {
        "lohnsteuer": "[VALOR]",
        "solidaritaetszuschlag": "[VALOR]",
        "kirchensteuer": 0,
        "kv_beitrag": "[VALOR]",
        "pv_beitrag": "[VALOR]",
        "rv_beitrag": "[VALOR]",
        "av_beitrag": "[VALOR]",
        "nettolohn": "[VALOR]"
      }
    },
    {
      "id": "BNR-002",
      "descripcion": "Salario alto, Steuerklasse III, 2 hijos, con iglesia (9%), West",
      "inputs": { "..." : "..." },
      "expected_outputs": { "..." : "..." }
    },
    {
      "id": "BNR-003",
      "descripcion": "Salario bajo (Minijob grenze), Steuerklasse I",
      "inputs": { "..." : "..." },
      "expected_outputs": { "..." : "..." }
    },
    {
      "id": "BNR-004",
      "descripcion": "Steuerklasse V, iglesia Bayern (8%), Ost",
      "inputs": { "..." : "..." },
      "expected_outputs": { "..." : "..." }
    },
    {
      "id": "BNR-005",
      "descripcion": "Grenzfall Solidaritätszuschlag (Milderungszone)",
      "inputs": { "..." : "..." },
      "expected_outputs": { "..." : "..." }
    }
  ]
}
```

### Casos de test obligatorios por tipo de calculadora

| Calculadora | Casos mínimos | Casos críticos que no pueden faltar |
|---|---|---|
| Brutto-Netto-Rechner | 8 | Cada Steuerklasse (I-VI), Ost vs West, con/sin Kirchensteuer |
| Lohnsteuerrechner | 6 | Steuerklasse I y III, Soli-Milderungszone, Minijob |
| Gehaltsrechner | 5 | Jahresgehalt ↔ Monatsgehalt, 13. Gehalt, Teilzeit |
| Rentenrechner | 5 | Regelaltersgrenze por Jahrgang, Rentenabschlag, Ost/West |
| Arbeitslosengeld | 5 | ALG I 60% vs 67% (con hijos), Bemessungszeitraum, Höchstsatz |
| Kurzarbeitergeld | 4 | Stufe 1/2/3, con/sin Kinder, Aufstockung |
| Elterngeld | 4 | Mínimo, máximo, Teilzeit, Geschwisterbonus |
| Pendlerpauschale | 3 | < 21km, > 21km (tarifa aumentada), Homeoffice-Pauschale |
| Midijob-Rechner | 3 | Límite inferior, medio, límite superior del Übergangsbereich |

### Tolerancia

- Lohnsteuer, Soli, Kirchensteuer: **±1,00 €** respecto al BMF Rechner (redondeos)
- Sozialversicherungsbeiträge: **±0,50 €** (se calculan sobre el céntimo)
- Nettolohn: **±2,00 €** (acumulación de redondeos)
- Si algún test excede la tolerancia: **FALLO — no se aprueba el gate**

### Proceso

1. El agente carga el archivo de tests correspondiente
2. Introduce cada conjunto de inputs en la calculadora
3. Compara outputs con los valores esperados
4. Documenta resultados en `tests/[slug]-resultados.md`
5. Si hay fallos: identifica la fórmula errónea, corrige, y vuelve a ejecutar todos los tests

### Criterio de aprobación

- [ ] Todos los casos de test pasan dentro de la tolerancia definida
- [ ] El archivo de resultados está generado y documenta cada caso
- [ ] Ningún campo muestra NaN, undefined, Infinity o valores negativos absurdos
- [ ] Los imports parciales (usuario escribiendo) no generan errores visibles

---

## GATE 3 — QA VISUAL Y RESPONSIVE

**Responsable:** Agente (verificación visual) + Humano (aprobación final)
**Momento:** Después de aprobar Gate 2

### Checklist visual — Desktop (1280px+)

- [ ] Layout dos columnas visible: formulario izquierda, resultados derecha
- [ ] Columna de resultados sticky (no desaparece al scrollear el formulario)
- [ ] Paleta de colores correcta: `#0f2d5e` principal, `#f5a623` acento
- [ ] Tipografía: `IBM Plex Sans` para texto, `IBM Plex Mono` para números/resultados
- [ ] Todos los campos de input tienen label visible y placeholder en alemán
- [ ] Los selects/dropdowns muestran opciones en alemán correcto
- [ ] Los resultados se actualizan en tiempo real al cambiar inputs
- [ ] No hay flash de NaN o valores erróneos durante la transición entre inputs
- [ ] Los números usan formato alemán: punto como separador de miles, coma para decimales (1.234,56 €)
- [ ] El símbolo € aparece después del número (formato alemán)
- [ ] Los porcentajes usan coma decimal (19,5%)

### Checklist visual — Móvil (375px)

- [ ] Layout una columna (formulario arriba, resultados debajo)
- [ ] Todos los inputs son tap-friendly (mínimo 44px de altura)
- [ ] No hay overflow horizontal (nada se sale de pantalla)
- [ ] El texto es legible sin zoom (mínimo 16px para body)
- [ ] Los resultados son accesibles sin scroll excesivo
- [ ] Los tooltips/info-icons funcionan con tap (no solo hover)

### Checklist visual — Tablet (768px)

- [ ] Transición limpia entre layouts de una y dos columnas
- [ ] Sin elementos rotos o superpuestos

### Consistencia entre calculadoras

- [ ] El header es idéntico en estructura y estilo a las calculadoras anteriores
- [ ] El footer es idéntico
- [ ] Los colores de botones, links y acentos coinciden exactamente
- [ ] La tipografía y tamaños son los mismos
- [ ] El espaciado general (padding, margin) es visualmente consistente
- [ ] La sección FAQ tiene el mismo estilo de acordeón/expandible

### Criterio de aprobación

- [ ] Todas las marcas de los 3 breakpoints están aprobadas
- [ ] Screenshot de cada breakpoint guardado en `qa/screenshots/[slug]/`
- [ ] No hay diferencias visuales significativas respecto a la calculadora anterior del lote

---

## GATE 4 — AUDITORÍA SEO ON-PAGE

**Responsable:** Agente (checklist) + Humano (revisión de contenido)
**Momento:** Después de aprobar Gate 3

### Meta tags

- [ ] `<title>` contiene keyword principal + año + marca — máximo 60 caracteres
- [ ] `<meta name="description">` contiene keyword + propuesta de valor — 140-160 caracteres
- [ ] `<html lang="de">` presente
- [ ] `<meta charset="UTF-8">` presente
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1.0">` presente
- [ ] canonical URL definida y correcta

### Estructura de encabezados

- [ ] Exactamente un `<h1>` por página con la keyword principal
- [ ] Jerarquía lógica: H1 → H2 → H3 (sin saltos)
- [ ] Al menos 3 H2 con variaciones de la keyword
- [ ] No hay encabezados vacíos o puramente decorativos

### Schema markup

- [ ] `WebApplication` schema presente y válido (verificar en Schema.org validator)
- [ ] `FAQPage` schema presente con al menos 5 preguntas
- [ ] `BreadcrumbList` schema presente
- [ ] Todos los schemas pasan validación en https://validator.schema.org/

### Contenido

- [ ] Mínimo 800 palabras de contenido único en alemán (medido con word count real, no estimado)
- [ ] El contenido responde a la intención de búsqueda del keyword principal
- [ ] Incluye sección "Wie funktioniert der [nombre] Rechner?" (cómo funciona)
- [ ] Incluye sección "Häufig gestellte Fragen" (FAQ) con mínimo 5 preguntas
- [ ] Incluye sección explicativa sobre el contexto legal/fiscal
- [ ] El contenido NO es traducción literal del español — debe sonar nativo alemán
- [ ] No hay errores gramaticales evidentes en alemán
- [ ] Las fuentes oficiales (BMF, BMAS) están citadas en el contenido

### Internal linking

- [ ] Bloque "Verwandte Rechner" presente con links a calculadoras relacionadas
- [ ] Los anchor texts son descriptivos (no "click aquí")
- [ ] Link a la página índice presente
- [ ] Los links siguen el mapa definido en `internal-links.json`

### Haftungsausschluss (disclaimer legal)

- [ ] Presente al final de cada calculadora
- [ ] Texto: "Die Berechnungen dienen ausschließlich der Information und ersetzen keine professionelle steuerliche Beratung. Alle Angaben ohne Gewähr. Stand: [año]."
- [ ] Visualmente diferenciado (texto más pequeño, color gris)

### Criterio de aprobación

- [ ] Todos los checks SEO están marcados
- [ ] Los schemas pasan validación externa
- [ ] El contenido ha sido revisado por un humano (idealmente nativo alemán o C2)

---

## GATE 5 — VALIDACIÓN TÉCNICA FINAL

**Responsable:** Agente + Humano
**Momento:** Último paso antes de marcar la calculadora como completada

### Performance

- [ ] El archivo HTML pesa menos de 500KB total (incluyendo CSS/JS inline)
- [ ] No hay dependencias externas excepto Google Fonts (IBM Plex)
- [ ] La calculadora funciona offline (test: desconectar red y abrir el archivo)
- [ ] Los cálculos se ejecutan en menos de 100ms (sin lag perceptible)

### Accesibilidad básica

- [ ] Todos los inputs tienen `<label>` asociado con `for`/`id`
- [ ] Los contrastes de color pasan WCAG AA (ratio mínimo 4.5:1 para texto)
- [ ] La calculadora es navegable con teclado (Tab entre campos)
- [ ] Los resultados tienen `aria-live="polite"` para screen readers

### Robustez de inputs

- [ ] Input de texto en campo numérico: no crash, muestra mensaje de error o ignora
- [ ] Valores negativos: manejados correctamente o bloqueados
- [ ] Valores extremos (bruto de 0€, bruto de 1.000.000€): no crash, resultado razonable
- [ ] Campos vacíos: la calculadora no muestra NaN, muestra 0 o estado vacío
- [ ] Cambio rápido de múltiples campos: no race conditions ni resultados inconsistentes

### Código

- [ ] HTML válido según W3C Validator (0 errores, warnings aceptables)
- [ ] No hay `console.log()` ni código de debug
- [ ] No hay comentarios que expongan lógica de negocio sensible
- [ ] Las funciones de cálculo tienen nombres descriptivos en inglés o alemán
- [ ] El código está razonablemente comentado para mantenimiento futuro

### Seguridad básica

- [ ] No hay `eval()` ni `innerHTML` con input del usuario
- [ ] No hay llamadas a APIs externas
- [ ] No se almacena ni transmite ningún dato del usuario

### Criterio de aprobación

- [ ] Todos los checks técnicos están marcados
- [ ] El archivo pasa W3C Validator
- [ ] Test manual de edge cases completado sin errores

---

## PROCESO COMPLETO POR CALCULADORA

```
                    ┌─────────────────────┐
                    │   Agente analiza     │
                    │   URL competidor     │
                    └─────────┬───────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  Genera archivo de   │
                    │  análisis (.md)      │
                    └─────────┬───────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  GATE 1: Verificación fiscal  │◄── Humano verifica
              │  ¿datos-fiscales-2026.md      │    contra fuentes
              │   tiene los valores?          │    oficiales
              └───────────────┬───────────────┘
                              │ ✅
                              ▼
                    ┌─────────────────────┐
                    │   Agente construye   │
                    │   calculadora HTML   │
                    └─────────┬───────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  GATE 2: Testing funcional    │
              │  ¿Todos los tests pasan?      │──── ❌ → Corregir fórmula
              └───────────────┬───────────────┘         y re-testear
                              │ ✅
                              ▼
              ┌───────────────────────────────┐
              │  GATE 3: QA visual/responsive │
              │  ¿375px, 768px, 1280px OK?    │──── ❌ → Corregir CSS
              └───────────────┬───────────────┘         y re-verificar
                              │ ✅
                              ▼
              ┌───────────────────────────────┐
              │  GATE 4: Auditoría SEO        │
              │  ¿Meta, schema, contenido OK? │──── ❌ → Corregir y
              └───────────────┬───────────────┘         re-auditar
                              │ ✅
                              ▼
              ┌───────────────────────────────┐
              │  GATE 5: Validación técnica   │
              │  ¿Performance, a11y, code OK? │──── ❌ → Corregir y
              └───────────────┬───────────────┘         re-validar
                              │ ✅
                              ▼
                    ┌─────────────────────┐
                    │   ✅ COMPLETADA     │
                    │   Mover a /output/  │
                    └─────────────────────┘
```

---

## REGISTRO DE QA

Cada calculadora completada genera una entrada en `qa/registro-qa.md`:

```markdown
## [slug] — [keyword]
- Fecha completado: YYYY-MM-DD
- Gate 1 (fiscal): ✅ Aprobado [fecha]
- Gate 2 (tests): ✅ 5/5 tests pasados · Tolerancia máxima: ±0,42€
- Gate 3 (visual): ✅ Screenshots en qa/screenshots/[slug]/
- Gate 4 (SEO): ✅ Schema validado · 943 palabras · 7 FAQs
- Gate 5 (técnico): ✅ W3C 0 errores · 287KB · a11y AA
- Incidencias: [ninguna / descripción de problemas encontrados y cómo se resolvieron]
- Revisado por humano: [nombre] [fecha]
```

---

## GESTIÓN DE ERRORES DURANTE LA EJECUCIÓN

### Si el agente no puede extraer el JS del competidor

1. Documentar en el análisis: "JS no extraíble — [razón]"
2. Usar el BMF Lohnsteuerrechner como fuente de lógica alternativa
3. Construir la calculadora con las fórmulas de `datos-fiscales-2026.md` directamente
4. Marcar en el registro de QA: "Construida sin referencia JS del competidor"

### Si un test falla y no se identifica el error

1. No publicar la calculadora
2. Documentar el fallo con inputs, output esperado y output obtenido
3. Escalar a revisión humana manual de la fórmula
4. Si no se resuelve en 2 iteraciones: mover la calculadora al final de la cola de prioridad

### Si el agente pierde consistencia visual entre calculadoras

1. Parar la ejecución del lote
2. Comparar visualmente la última calculadora aprobada con la que falló
3. Identificar las diferencias de CSS
4. Corregir y re-ejecutar Gate 3 para la calculadora actual
5. Si el drift es grave: considerar refactorizar a CSS compartido antes de continuar

### Si una URL del competidor es inaccesible

1. Usar Google Cache o Wayback Machine como fuente alternativa
2. Si no hay cache: saltar la URL y documentar
3. No inventar la calculadora sin referencia

---

## INSTRUCCIONES PARA EL SKILL DE ANTIGRAVITY

Añadir al final de `calculadoras-seo-skill.md`:

```markdown
## QA OBLIGATORIO — REFERENCIA CRUZADA

Antes de marcar cualquier calculadora como completada, ejecuta los 5 gates
definidos en `sop-qa-calculadoras-alemanas.md`:

1. Verifica que los datos fiscales usados coinciden con `datos-fiscales-2026.md`
2. Ejecuta TODOS los tests de `tests/[slug]-tests.json` y verifica tolerancias
3. Toma screenshots en 375px, 768px y 1280px — guarda en `qa/screenshots/[slug]/`
4. Verifica meta tags, schema, contenido mínimo y internal linking
5. Valida HTML, testea edge cases de input, confirma que funciona offline

Si cualquier gate falla: corrige y repite. NO avances a la siguiente URL.
Documenta los resultados en `qa/registro-qa.md`.
```

---

## ESTRUCTURA DE CARPETAS QA

```
proyecto/
├── datos-fiscales-2026.md          ← Gate 1
├── internal-links.json             ← Gate 4
├── tests/
│   ├── brutto-netto-tests.json     ← Gate 2
│   ├── brutto-netto-resultados.md
│   ├── lohnsteuer-tests.json
│   ├── lohnsteuer-resultados.md
│   └── ...
├── qa/
│   ├── registro-qa.md              ← Registro global
│   └── screenshots/
│       ├── brutto-netto/
│       │   ├── desktop-1280.png
│       │   ├── tablet-768.png
│       │   └── mobile-375.png
│       └── ...
├── calculadoras/
│   ├── brutto-netto-rechner.html   ← Output del agente
│   └── ...
└── analisis/
    ├── brutto-netto-rechner.md     ← Análisis del competidor
    └── ...
```

---

## FRECUENCIA DE REVISIÓN DE ESTE SOP

- **Después de las primeras 3 calculadoras:** Revisar si los gates son realistas o necesitan ajuste
- **Al completar Fase 1 (18 calculadoras):** Retrospectiva completa — ¿qué falló, qué sobra, qué falta?
- **Antes de Fase 2:** Adaptar el SOP para artículos wiki (los gates 1 y 2 no aplican; gates 3-5 se modifican)
- **Anualmente:** Actualizar `datos-fiscales-2026.md` con los valores del nuevo año fiscal

---

*SOP generado para el proyecto Calculadoras SEO Alemanas*
*Para uso con Google Antigravity + skill `calculadoras-seo.md`*
*v1.0 — Febrero 2026*
