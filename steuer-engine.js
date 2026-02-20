/* ══════════════════════════════════════════════════════════
   STEUERRECHNER 2026 — German Tax Calculation Engine
   
   Sources:
   - BMF Programmablaufplan 2026 (published 12.11.2025)
   - §32a EStG (Einkommensteuertarif 2026)
   - Steuerfortentwicklungsgesetz
   - Sozialversicherungs-Rechengrößenverordnung 2026
   
   IMPORTANT: Verify results against bmf-steuerrechner.de
   This implementation follows the official PAP logic.
   ══════════════════════════════════════════════════════════ */

const Steuer2026 = (() => {
  'use strict';

  // ══════════════════════════════════════════════════════
  // CONSTANTS — Steuerdaten 2026
  // ══════════════════════════════════════════════════════

  const CONST = Object.freeze({
    YEAR: 2026,

    // Grundfreibetrag §32a EStG
    GRUNDFREIBETRAG: 12348,

    // Kinderfreibetrag (both parents combined)
    KINDERFREIBETRAG: 9756,

    // Einkommensteuertarif §32a — zone boundaries
    TARIF_ZONE2_BIS: 17005,
    TARIF_ZONE3_BIS: 66760,
    TARIF_ZONE4_BIS: 277825,

    // Einkommensteuertarif §32a — coefficients
    // Zone 2: (a * y + 1400) * y, y = (zvE - GF) / 10000
    TARIF_ZONE2_A: 922.98,
    TARIF_ZONE2_B: 1400,
    // Zone 3: (a * z + b) * z + c, z = (zvE - 17005) / 10000
    TARIF_ZONE3_A: 181.19,
    TARIF_ZONE3_B: 2397,
    TARIF_ZONE3_C: 1025.38,
    // Zone 4: 0.42 * zvE - offset
    TARIF_ZONE4_SATZ: 0.42,
    TARIF_ZONE4_ABZUG: 10636.31,
    // Zone 5: 0.45 * zvE - offset
    TARIF_ZONE5_SATZ: 0.45,
    TARIF_ZONE5_ABZUG: 18971.06,

    // Solidaritätszuschlag
    SOLI_SATZ: 0.055,
    SOLI_FREIGRENZE: 18130,       // Jahres-LSt Freigrenze (StKl I equivalent)
    SOLI_FREIGRENZE_VERHEIRATET: 36260,

    // Kirchensteuer by Bundesland
    KIRCHENSTEUER: {
      'Baden-Württemberg': 0.08,
      'Bayern': 0.08,
      'Berlin': 0.09,
      'Brandenburg': 0.09,
      'Bremen': 0.09,
      'Hamburg': 0.09,
      'Hessen': 0.09,
      'Mecklenburg-Vorpommern': 0.09,
      'Niedersachsen': 0.09,
      'Nordrhein-Westfalen': 0.09,
      'Rheinland-Pfalz': 0.09,
      'Saarland': 0.09,
      'Sachsen': 0.09,
      'Sachsen-Anhalt': 0.09,
      'Schleswig-Holstein': 0.09,
      'Thüringen': 0.09,
    },

    // ── Sozialversicherung 2026 ──

    // Beitragsbemessungsgrenzen (monthly)
    BBG_KV_MONAT: 5812.50,    // KV + PV
    BBG_RV_MONAT: 8450.00,    // RV + AV (unified Ost/West since 2025)

    // Beitragssätze (Gesamtsatz)
    KV_SATZ: 0.146,            // 14.6% gesamt
    KV_ZUSATZ_DEFAULT: 0.029,  // 2.9% durchschnittlicher Zusatzbeitrag
    PV_SATZ: 0.036,            // 3.6% gesamt
    RV_SATZ: 0.186,            // 18.6% gesamt
    AV_SATZ: 0.026,            // 2.6% gesamt

    // Pflegeversicherung — AN rates by number of children
    // (outside Sachsen)
    PV_AN_RATE: {
      kinderlos: 0.023,    // base 1.8% + 0.6% Zuschlag (> 23 Jahre, kinderlos)
      kinder_1: 0.017,     // base 1.8% - applies even if child > 24
      kinder_2: 0.0145,    // -0.25% per child under 25
      kinder_3: 0.012,
      kinder_4: 0.0095,
      kinder_5plus: 0.007,
    },

    // Sachsen: AN pays 0.5% more, AG 0.5% less
    PV_SACHSEN_AN_EXTRA: 0.005,

    // Minijob-Grenze
    MINIJOB_GRENZE: 556,       // 2026 monthly

    // Versicherungspflichtgrenze PKV
    VERSICHERUNGSPFLICHTGRENZE: 77400,

    // Werbungskostenpauschale
    WERBUNGSKOSTEN_PAUSCHALE: 1230,

    // Sonderausgabenpauschale
    SONDERAUSGABEN_PAUSCHALE: 36,

    // Vorsorgepauschale max
    VORSORGE_MAX_KV: 1900,    // für AN (Steuerklasse I/II/IV/V/VI)
    VORSORGE_MAX_KV_3: 3000,  // für Steuerklasse III

    MONTHS: 12,
  });

  // Bundesländer list
  const BUNDESLAENDER = [
    'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg',
    'Bremen', 'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern',
    'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz',
    'Saarland', 'Sachsen', 'Sachsen-Anhalt',
    'Schleswig-Holstein', 'Thüringen'
  ];

  // ══════════════════════════════════════════════════════
  // EINKOMMENSTEUER — §32a EStG
  // ══════════════════════════════════════════════════════

  /**
   * Calculate Einkommensteuer for a given zvE (zu versteuerndes Einkommen).
   * Implements §32a EStG 2026 tariff.
   * @param {number} zvE - zu versteuerndes Einkommen (yearly, Euro)
   * @returns {number} Einkommensteuer in Euro (floored to full Euro)
   */
  function einkommensteuer(zvE) {
    zvE = Math.floor(zvE);
    if (zvE <= 0) return 0;

    let est;
    if (zvE <= CONST.GRUNDFREIBETRAG) {
      est = 0;
    } else if (zvE <= CONST.TARIF_ZONE2_BIS) {
      const y = (zvE - CONST.GRUNDFREIBETRAG) / 10000;
      est = (CONST.TARIF_ZONE2_A * y + CONST.TARIF_ZONE2_B) * y;
    } else if (zvE <= CONST.TARIF_ZONE3_BIS) {
      const z = (zvE - CONST.TARIF_ZONE2_BIS) / 10000;
      est = (CONST.TARIF_ZONE3_A * z + CONST.TARIF_ZONE3_B) * z + CONST.TARIF_ZONE3_C;
    } else if (zvE <= CONST.TARIF_ZONE4_BIS) {
      est = CONST.TARIF_ZONE4_SATZ * zvE - CONST.TARIF_ZONE4_ABZUG;
    } else {
      est = CONST.TARIF_ZONE5_SATZ * zvE - CONST.TARIF_ZONE5_ABZUG;
    }
    return Math.floor(est);
  }

  // ══════════════════════════════════════════════════════
  // LOHNSTEUER — Simplified
  // ══════════════════════════════════════════════════════

  /**
   * Approximate the annual Lohnsteuer based on input parameters.
   * This is a simplified version — the full PAP has ~200 steps.
   * For official calculations, use bmf-steuerrechner.de
   */
  function lohnsteuer(params) {
    const {
      bruttoJahr,
      steuerklasse = 1,
      kirchensteuer = false,
      bundesland = 'Nordrhein-Westfalen',
      kinderfreibetrag = 0,
      steuerfreibetrag = 0,
      geldwerterVorteil = 0,
    } = params;

    // Jahresbrutto inklusive geldwerter Vorteil
    const brutto = bruttoJahr + geldwerterVorteil * 12;

    // Determine if married splitting applies
    const isSplitting = steuerklasse === 3 || steuerklasse === 4;
    const isPartnerLow = steuerklasse === 5;
    const isStKl6 = steuerklasse === 6;

    // Werbungskosten
    const werbungskosten = isStKl6 ? 0 : CONST.WERBUNGSKOSTEN_PAUSCHALE;

    // Sonderausgaben
    const sonderausgaben = isStKl6 ? 0 : CONST.SONDERAUSGABEN_PAUSCHALE;

    // Vorsorgepauschale (simplified)
    const bbgRvJahr = CONST.BBG_RV_MONAT * 12;
    const rvBrutto = Math.min(brutto, bbgRvJahr);
    const vorsorgeRV = rvBrutto * (CONST.RV_SATZ / 2); // AN-Anteil RV

    const bbgKvJahr = CONST.BBG_KV_MONAT * 12;
    const kvBrutto = Math.min(brutto, bbgKvJahr);
    const vorsorgeKV = kvBrutto * ((CONST.KV_SATZ + CONST.KV_ZUSATZ_DEFAULT) / 2);

    // Simplified Vorsorgepauschale
    const vorsorgepauschale = vorsorgeRV + vorsorgeKV;

    // zu versteuerndes Einkommen
    let zvE = brutto - werbungskosten - sonderausgaben - vorsorgepauschale - steuerfreibetrag;

    // Kinderfreibetrag for Soli/KiSt calculation
    const kinderfreibetragJahr = kinderfreibetrag * CONST.KINDERFREIBETRAG;

    // Steuerklasse adjustments
    let lstJahr;
    if (steuerklasse === 3) {
      // Splitting: double the Grundfreibetrag effectively
      zvE = Math.max(0, zvE);
      lstJahr = einkommensteuer(zvE / 2) * 2;
    } else if (steuerklasse === 5) {
      // Higher rate, no Grundfreibetrag
      zvE = Math.max(0, zvE);
      lstJahr = einkommensteuer(zvE);
      // StKl V: use special calculation (simplified: use full tariff)
    } else if (steuerklasse === 2) {
      // Alleinerziehendenentlastung: 4260€
      zvE = Math.max(0, zvE - 4260);
      lstJahr = einkommensteuer(zvE);
    } else if (steuerklasse === 6) {
      // No Freibeträge
      zvE = Math.max(0, brutto - vorsorgepauschale);
      lstJahr = einkommensteuer(zvE);
    } else {
      // StKl 1 and 4
      zvE = Math.max(0, zvE);
      lstJahr = einkommensteuer(zvE);
    }

    // Solidaritätszuschlag
    const soliFreigrenze = (steuerklasse === 3)
      ? CONST.SOLI_FREIGRENZE_VERHEIRATET
      : CONST.SOLI_FREIGRENZE;

    // For Soli, use LSt minus Kinderfreibetrag effect
    const zvEFuerSoli = Math.max(0, zvE - kinderfreibetragJahr);
    let lstFuerSoli;
    if (steuerklasse === 3) {
      lstFuerSoli = einkommensteuer(zvEFuerSoli / 2) * 2;
    } else {
      lstFuerSoli = einkommensteuer(zvEFuerSoli);
    }

    let soli = 0;
    if (lstFuerSoli > soliFreigrenze) {
      soli = lstFuerSoli * CONST.SOLI_SATZ;
      // Milderungszone: max 11.9% of difference
      const milderung = (lstFuerSoli - soliFreigrenze) * 0.119;
      soli = Math.min(soli, milderung);
    }
    soli = Math.floor(soli * 100) / 100;

    // Kirchensteuer
    let kist = 0;
    if (kirchensteuer) {
      const kistSatz = CONST.KIRCHENSTEUER[bundesland] || 0.09;
      // For KiSt, also apply Kinderfreibetrag
      let lstFuerKist;
      if (steuerklasse === 3) {
        lstFuerKist = einkommensteuer(Math.max(0, zvE - kinderfreibetragJahr) / 2) * 2;
      } else {
        lstFuerKist = einkommensteuer(Math.max(0, zvE - kinderfreibetragJahr));
      }
      kist = lstFuerKist * kistSatz;
    }
    kist = Math.floor(kist * 100) / 100;

    return {
      lohnsteuer: Math.round(lstJahr * 100) / 100,
      soli: soli,
      kirchensteuer: kist,
      steuerGesamt: Math.round((lstJahr + soli + kist) * 100) / 100,
    };
  }

  // ══════════════════════════════════════════════════════
  // SOZIALVERSICHERUNG
  // ══════════════════════════════════════════════════════

  /**
   * Calculate monthly social insurance contributions (Arbeitnehmeranteil).
   */
  function sozialversicherung(params) {
    const {
      bruttoMonat,
      bundesland = 'Nordrhein-Westfalen',
      krankenversicherung = 'gesetzlich', // 'gesetzlich', 'privat', 'freiwillig'
      kvZusatzbeitrag = CONST.KV_ZUSATZ_DEFAULT,
      pkvBeitrag = 0,
      arbeitgeberzuschussPKV = true,
      rentenversichert = true,
      arbeitslosenversichert = true,
      kinderAnzahl = 0, // children under 25 for PV
      hatKinder = false,
      alter = 30,
    } = params;

    const isSachsen = bundesland === 'Sachsen';
    const result = {
      kv: { an: 0, ag: 0 },
      pv: { an: 0, ag: 0 },
      rv: { an: 0, ag: 0 },
      av: { an: 0, ag: 0 },
      summeAN: 0,
      summeAG: 0,
    };

    // ── Krankenversicherung ──
    if (krankenversicherung === 'gesetzlich' || krankenversicherung === 'freiwillig') {
      const basisKV = Math.min(bruttoMonat, CONST.BBG_KV_MONAT);
      const kvAnSatz = (CONST.KV_SATZ / 2) + (kvZusatzbeitrag / 2);
      const kvAgSatz = (CONST.KV_SATZ / 2) + (kvZusatzbeitrag / 2);
      result.kv.an = round2(basisKV * kvAnSatz);
      result.kv.ag = round2(basisKV * kvAgSatz);
    } else if (krankenversicherung === 'privat') {
      result.kv.an = round2(pkvBeitrag);
      if (arbeitgeberzuschussPKV) {
        // AG pays max half of what GKV would cost
        const maxAGZuschuss = Math.min(bruttoMonat, CONST.BBG_KV_MONAT) *
          ((CONST.KV_SATZ / 2) + (CONST.KV_ZUSATZ_DEFAULT / 2));
        result.kv.ag = round2(Math.min(pkvBeitrag / 2, maxAGZuschuss));
      }
    }

    // ── Pflegeversicherung ──
    if (krankenversicherung !== 'privat') {
      const basisPV = Math.min(bruttoMonat, CONST.BBG_KV_MONAT);

      // Determine AN rate based on children and age
      let pvAnRate;
      if (!hatKinder && alter >= 23) {
        pvAnRate = CONST.PV_AN_RATE.kinderlos; // 2.3%
      } else if (kinderAnzahl <= 1) {
        pvAnRate = CONST.PV_AN_RATE.kinder_1; // 1.7%
      } else if (kinderAnzahl === 2) {
        pvAnRate = CONST.PV_AN_RATE.kinder_2; // 1.45%
      } else if (kinderAnzahl === 3) {
        pvAnRate = CONST.PV_AN_RATE.kinder_3; // 1.2%
      } else if (kinderAnzahl === 4) {
        pvAnRate = CONST.PV_AN_RATE.kinder_4; // 0.95%
      } else {
        pvAnRate = CONST.PV_AN_RATE.kinder_5plus; // 0.7%
      }

      // Sachsen: AN pays 0.5% more
      if (isSachsen) {
        pvAnRate += CONST.PV_SACHSEN_AN_EXTRA;
      }

      // AG rate = total - AN rate
      const pvAgRate = CONST.PV_SATZ - pvAnRate + (isSachsen ? CONST.PV_SACHSEN_AN_EXTRA : 0);
      // Actually: AG rate in Sachsen is 0.5% less
      const pvAgRateActual = isSachsen
        ? (CONST.PV_SATZ - pvAnRate)
        : (CONST.PV_SATZ - pvAnRate);

      result.pv.an = round2(basisPV * pvAnRate);
      result.pv.ag = round2(basisPV * (CONST.PV_SATZ - pvAnRate));
    }

    // ── Rentenversicherung ──
    if (rentenversichert) {
      const basisRV = Math.min(bruttoMonat, CONST.BBG_RV_MONAT);
      result.rv.an = round2(basisRV * (CONST.RV_SATZ / 2));
      result.rv.ag = round2(basisRV * (CONST.RV_SATZ / 2));
    }

    // ── Arbeitslosenversicherung ──
    if (arbeitslosenversichert) {
      const basisAV = Math.min(bruttoMonat, CONST.BBG_RV_MONAT);
      result.av.an = round2(basisAV * (CONST.AV_SATZ / 2));
      result.av.ag = round2(basisAV * (CONST.AV_SATZ / 2));
    }

    // Summen
    result.summeAN = round2(result.kv.an + result.pv.an + result.rv.an + result.av.an);
    result.summeAG = round2(result.kv.ag + result.pv.ag + result.rv.ag + result.av.ag);

    return result;
  }

  // ══════════════════════════════════════════════════════
  // BRUTTO-NETTO HAUPTBERECHNUNG
  // ══════════════════════════════════════════════════════

  /**
   * Full Brutto-Netto calculation.
   * @param {Object} input
   * @returns {Object} Complete breakdown
   */
  function bruttoNetto(input) {
    const {
      brutto,
      zeitraum = 'monat',              // 'monat' or 'jahr'
      steuerklasse = 1,
      bundesland = 'Nordrhein-Westfalen',
      kirchensteuer = false,
      krankenversicherung = 'gesetzlich',
      kvZusatzbeitrag = CONST.KV_ZUSATZ_DEFAULT,
      pkvBeitrag = 0,
      arbeitgeberzuschussPKV = true,
      rentenversichert = true,
      arbeitslosenversichert = true,
      hatKinder = false,
      kinderfreibetrag = 0,
      kinderUnter25 = 0,
      alter = 30,
      steuerfreibetrag = 0,
      geldwerterVorteil = 0,
    } = input;

    // Normalize to monthly and yearly
    const bruttoMonat = zeitraum === 'jahr' ? brutto / 12 : brutto;
    const bruttoJahr = zeitraum === 'jahr' ? brutto : brutto * 12;

    // ── Steuern (yearly, then /12) ──
    const steuern = lohnsteuer({
      bruttoJahr,
      steuerklasse,
      kirchensteuer,
      bundesland,
      kinderfreibetrag,
      steuerfreibetrag,
      geldwerterVorteil,
    });

    const steuerMonat = {
      lohnsteuer: round2(steuern.lohnsteuer / 12),
      soli: round2(steuern.soli / 12),
      kirchensteuer: round2(steuern.kirchensteuer / 12),
      gesamt: round2(steuern.steuerGesamt / 12),
    };

    // ── Sozialversicherung (monthly) ──
    const sv = sozialversicherung({
      bruttoMonat: bruttoMonat + geldwerterVorteil,
      bundesland,
      krankenversicherung,
      kvZusatzbeitrag,
      pkvBeitrag,
      arbeitgeberzuschussPKV,
      rentenversichert,
      arbeitslosenversichert,
      kinderAnzahl: kinderUnter25,
      hatKinder,
      alter,
    });

    // ── Netto ──
    const abzuegeMonat = round2(steuerMonat.gesamt + sv.summeAN);
    const nettoMonat = round2(bruttoMonat - abzuegeMonat);
    const nettoJahr = round2(nettoMonat * 12);

    return {
      input: {
        bruttoMonat,
        bruttoJahr,
        geldwerterVorteil,
        steuerklasse,
        bundesland,
      },
      steuern: {
        lohnsteuer: steuerMonat.lohnsteuer,
        soli: steuerMonat.soli,
        kirchensteuer: steuerMonat.kirchensteuer,
        gesamt: steuerMonat.gesamt,
        // Yearly values
        lohnsteuerJahr: steuern.lohnsteuer,
        soliJahr: steuern.soli,
        kirchensteuerJahr: steuern.kirchensteuer,
        gesamtJahr: steuern.steuerGesamt,
      },
      sozialversicherung: {
        kv: sv.kv.an,
        pv: sv.pv.an,
        rv: sv.rv.an,
        av: sv.av.an,
        gesamt: sv.summeAN,
        // AG
        agKV: sv.kv.ag,
        agPV: sv.pv.ag,
        agRV: sv.rv.ag,
        agAV: sv.av.ag,
        agGesamt: sv.summeAG,
      },
      ergebnis: {
        bruttoMonat,
        bruttoJahr,
        nettoMonat,
        nettoJahr,
        abzuegeMonat,
        abzuegeJahr: round2(abzuegeMonat * 12),
        steuerquote: bruttoMonat > 0 ? round2(steuerMonat.gesamt / bruttoMonat * 100) : 0,
        svQuote: bruttoMonat > 0 ? round2(sv.summeAN / bruttoMonat * 100) : 0,
        nettoQuote: bruttoMonat > 0 ? round2(nettoMonat / bruttoMonat * 100) : 0,
      },
    };
  }

  // ══════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  /** Format number as German currency string */
  function formatEuro(n, decimals = 2) {
    return n.toLocaleString('de-DE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + ' €';
  }

  /** Format percentage */
  function formatProzent(n, decimals = 1) {
    return n.toLocaleString('de-DE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + ' %';
  }

  // ══════════════════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════════════════

  return {
    CONST,
    BUNDESLAENDER,
    einkommensteuer,
    lohnsteuer,
    sozialversicherung,
    bruttoNetto,
    formatEuro,
    formatProzent,
  };
})();

// Make available globally
if (typeof window !== 'undefined') window.Steuer2026 = Steuer2026;
if (typeof module !== 'undefined') module.exports = Steuer2026;
